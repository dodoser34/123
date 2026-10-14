"""Заказы и оплата. Цены и наличие сервер берёт из базы — подменить сумму из браузера нельзя."""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import get_settings
from ...core.rate_limit import limit
from ...db.models import Order, Product, User
from ...db.session import get_db
from ...schemas import OrderIn, OrderPatchIn
from ...services.payments import METHODS, KaspiPay, enabled_methods, get_method, mark_paid
from ..deps import admin_user, current_user, first
from ..serializers import order_out

router = APIRouter(tags=['Заказы и оплата'])
log = logging.getLogger('kbch.payments')


def _instructions(o: Order) -> dict | None:
    method = METHODS.get(o.payment)
    return method.instructions(o, get_settings()) if method else None


def orders_out(rows) -> list[dict]:
    return [order_out(o, _instructions(o)) for o in rows]


@router.get('/payments/methods', summary='Включённые способы оплаты')
async def payment_methods():
    s = get_settings()
    return [m.info(s) for m in enabled_methods(s)]


@router.post('/orders', status_code=201, summary='Оформить заказ', dependencies=[Depends(limit('rate_write', 'orders'))])
async def create_order(data: OrderIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    s = get_settings()
    method = get_method(data.payment)
    if data.delivery != 'pickup' and (not data.city or not data.address):
        raise HTTPException(422, 'Укажите город и адрес доставки')
    items, subtotal = [], 0
    # Единый порядок блокировок исключает взаимную блокировку двух корзин с разным порядком товаров.
    for line in sorted(data.items, key=lambda item: item.id):
        p = await db.get(Product, line.id, with_for_update=True)
        if not p or p.status == 'hidden' or p.stock <= 0:
            continue  # закончился или скрыт — в заказ не попадает, как и в корзине на сайте
        qty = min(line.qty, p.stock)
        p.stock -= qty
        images = (p.data or {}).get('images') or ['']
        items.append({'id': p.id, 'name': p.name, 'price': p.price, 'qty': qty, 'image': images[0]})
        subtotal += p.price * qty
    if not items:
        await db.rollback()
        raise HTTPException(409, 'В корзине нет доступных товаров')
    delivery_price = (0 if subtotal >= s.free_shipping_from else s.courier_price) if data.delivery == 'courier' else 0
    order = Order(
        user_id=user.id,
        name=data.name,
        phone=data.phone,
        email=data.email or user.email,
        delivery=data.delivery,
        delivery_title=data.deliveryTitle,
        city=data.city,
        address=data.address,
        comment=data.comment,
        payment=method.code,
        items=items,
        subtotal=subtotal,
        delivery_price=delivery_price,
        total=subtotal + delivery_price,
    )
    db.add(order)
    await db.flush()  # номер заказа нужен для инструкции по оплате
    instructions = await method.start(order, s)
    await db.commit()
    return order_out(order, instructions)


@router.get('/orders/my', summary='Мои заказы')
async def my_orders(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    rows = (await db.execute(select(Order).where(Order.user_id == user.id).order_by(Order.seq.desc()))).scalars().all()
    return orders_out(rows)


@router.get('/admin/orders', summary='Все заказы (администратор)')
async def all_orders(db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    return orders_out((await db.execute(select(Order).order_by(Order.seq.desc()))).scalars().all())


@router.patch('/admin/orders/{order_id}', summary='Сменить статус заказа или оплаты')
async def patch_order(order_id: str, data: OrderPatchIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    o = await first(db, select(Order).where(Order.id == order_id).with_for_update())
    if not o:
        raise HTTPException(404, 'Заказ не найден')
    if data.status and data.status != o.status:
        # отмена возвращает товары на склад, возврат из отмены — снова списывает
        sign = 1 if data.status == 'cancelled' else -1 if o.status == 'cancelled' else 0
        quantities = {}
        for item in o.items if sign else []:
            quantities[item['id']] = quantities.get(item['id'], 0) + item['qty']
        products = []
        for product_id, qty in sorted(quantities.items()):
            p = await db.get(Product, product_id, with_for_update=True)
            if sign < 0 and (not p or p.stock < qty):
                await db.rollback()
                raise HTTPException(409, 'Недостаточно товара для восстановления отменённого заказа')
            if p:
                products.append((p, qty))
        for p, qty in products:
            p.stock += sign * qty
        o.status = data.status
    if data.paymentStatus:
        if data.paymentStatus == 'paid':
            mark_paid(o)
        else:
            o.payment_status = data.paymentStatus
    await db.commit()
    return order_out(o, _instructions(o))


@router.delete('/admin/orders/{order_id}', summary='Удалить заказ')
async def delete_order(order_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    o = await first(db, select(Order).where(Order.id == order_id))
    if not o:
        raise HTTPException(404, 'Заказ не найден')
    await db.delete(o)
    await db.commit()
    return {'status': 'deleted'}


@router.post('/payments/kaspi/webhook', include_in_schema=False, dependencies=[Depends(limit('rate_write', 'webhook'))])
async def kaspi_webhook(request: Request, x_signature: str = Header(''), db: AsyncSession = Depends(get_db)):
    """Уведомление Kaspi Pay об оплате. Принимается только с верной подписью; сумма сверяется с заказом;
    повторное уведомление по уже оплаченному заказу ничего не меняет."""
    s = get_settings()
    if 'kaspi_pay' not in s.payment_list:
        raise HTTPException(404, 'Не найдено')
    body = await request.body()
    if not KaspiPay.check_signature(body, x_signature, s):
        log.warning('Kaspi webhook: неверная подпись')
        raise HTTPException(403, 'Неверная подпись')
    try:
        order_id, status, amount = KaspiPay.parse_webhook(body)
    except ValueError as e:
        raise HTTPException(400, 'Неверный формат уведомления') from e
    o = await first(db, select(Order).where(Order.id == order_id[:40]))
    if not o:
        raise HTTPException(404, 'Заказ не найден')
    if o.payment_status in ('paid', 'refunded'):
        return {'status': 'ok'}  # повтор уведомления
    if status == 'paid':
        if amount is None or amount != o.total:
            log.error('Kaspi webhook: сумма %s не совпадает с заказом №%s (%s)', amount, o.number, o.total)
            raise HTTPException(409, 'Сумма не совпадает с заказом')
        mark_paid(o)
        log.info('Заказ №%s оплачен через Kaspi Pay', o.number)
    else:
        o.payment_status = 'failed'
    await db.commit()
    return {'status': 'ok'}
