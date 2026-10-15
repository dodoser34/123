from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.rate_limit import limit
from ...db.session import get_db
from ..deps import admin_user, current_user, first, optional_user
from ...db.models import Order, Product, Review, ReviewVote, User
from ...schemas import ReplyIn, ReviewIn, StatusIn, VoteIn
from ..serializers import review_out

router = APIRouter(tags=['Отзывы'])


def _voter(user: User | None, voter: str) -> str:
    return f'u:{user.id}' if user else f'v:{voter}' if voter else ''


async def reviews_list(db: AsyncSession, user: User | None, voter: str = '', product_id: str | None = None, everything: bool = False) -> list[dict]:
    q = select(Review).order_by(Review.created_at.desc())
    if product_id:
        q = q.where(Review.product_id == product_id)
    if not everything:
        q = q.where(Review.status == 'published')
    rows = (await db.execute(q)).scalars().all()
    who = _voter(user, voter)
    voted = set()
    if who and rows:
        voted = set((await db.execute(select(ReviewVote.review_id).where(ReviewVote.voter == who))).scalars().all())
    out = [review_out(r, r.id in voted) for r in rows]
    if user and not everything:
        own = (await db.execute(select(Review).where(Review.user_id == user.id, Review.status == 'hidden'))).scalars().all()
        out += [review_out(r) for r in own if not product_id or r.product_id == product_id]
    return out


async def _purchased(db: AsyncSession, user: User | None, product_id: str) -> bool:
    if not user:
        return False
    orders = (await db.execute(select(Order).where(Order.user_id == user.id, Order.status != 'cancelled'))).scalars().all()
    return any(i.get('id') == product_id for o in orders for i in o.items or [])


@router.get('/reviews', summary='Отзывы (productId — о товаре; администратору all=1 — включая скрытые)')
async def list_reviews(
    productId: str | None = Query(None, max_length=40), all: bool = False, voter: str = Query('', max_length=64, pattern=r'^[\w-]*$'), db: AsyncSession = Depends(get_db), user: User | None = Depends(optional_user)
):
    return await reviews_list(db, user, voter, productId, everything=all and user is not None and user.role == 'admin')


@router.post('/products/{product_id}/reviews', summary='Оставить или изменить свой отзыв', dependencies=[Depends(limit('rate_write', 'reviews'))])
async def save_review(product_id: str, data: ReviewIn, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    if not await db.get(Product, product_id):
        raise HTTPException(404, 'Товар не найден')
    review = await first(db, select(Review).where(Review.product_id == product_id, Review.user_id == user.id))
    updated = review is not None
    if not review:
        review = Review(product_id=product_id, user_id=user.id)
        db.add(review)
    else:
        review.edited_at = datetime.now(timezone.utc)
    review.name = user.name[:40]
    for f in ('rating', 'title', 'text', 'pros', 'cons', 'recommend', 'period'):
        setattr(review, f, getattr(data, f))
    review.verified = await _purchased(db, user, product_id)
    await db.commit()
    return {'updated': updated, 'review': review_out(review)}


@router.post('/reviews/{review_id}/vote', summary='Отметить отзыв полезным (один раз)', dependencies=[Depends(limit('rate_write', 'votes'))])
async def vote(review_id: str, data: VoteIn, db: AsyncSession = Depends(get_db), user: User | None = Depends(optional_user)):
    review = await db.get(Review, review_id)
    who = _voter(user, data.voter)
    if not review or not who:
        raise HTTPException(404, 'Отзыв не найден')
    if await first(db, select(ReviewVote).where(ReviewVote.review_id == review_id, ReviewVote.voter == who)):
        return {'voted': False, 'helpful': review.helpful}
    db.add(ReviewVote(review_id=review_id, voter=who))
    review.helpful += 1
    await db.commit()
    return {'voted': True, 'helpful': review.helpful}


@router.patch('/reviews/{review_id}/status', summary='Скрыть или показать отзыв')
async def set_status(review_id: str, data: StatusIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Отзыв не найден')
    review.status = data.status
    await db.commit()
    return review_out(review)


@router.post('/reviews/{review_id}/reply', summary='Ответ магазина (пустой текст — убрать ответ)')
async def reply(review_id: str, data: ReplyIn, db: AsyncSession = Depends(get_db), _: User = Depends(admin_user)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Отзыв не найден')
    review.reply = {'text': data.text, 'date': datetime.now(timezone.utc).date().isoformat()} if data.text else None
    await db.commit()
    return review_out(review)


@router.delete('/reviews/{review_id}', summary='Удалить отзыв (администратор или автор)')
async def delete_review(review_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(404, 'Отзыв не найден')
    if user.role != 'admin' and review.user_id != user.id:
        raise HTTPException(403, 'Можно удалить только свой отзыв')
    await db.delete(review)
    await db.commit()
    return {'status': 'deleted'}
