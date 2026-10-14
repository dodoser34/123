"""Как записи базы отдаются фронтенду — в тех же полях, что использует сайт (camelCase)."""
from datetime import datetime

from ..db.models import Order, Product, Review, User


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def user_out(u: User) -> dict:
    return {
        'id': u.id,
        'role': u.role,
        'name': u.name,
        'email': u.email,
        'phone': u.phone or '',
        'createdAt': _iso(u.created_at),
        'blocked': u.blocked,
        'emailVerified': u.email_verified,
        'hasPassword': bool(u.password_hash),
        'google': bool(u.google_sub),
    }


PRODUCT_COLUMNS = {'id', 'slug', 'status', 'category', 'sub', 'name', 'brand', 'price', 'oldPrice', 'stock', 'createdAt'}


def product_out(p: Product) -> dict:
    out = dict(p.data or {})
    out.update(
        id=p.id,
        slug=p.slug,
        status=p.status,
        category=p.category,
        sub=p.sub,
        name=p.name,
        brand=p.brand,
        price=p.price,
        oldPrice=p.old_price,
        stock=p.stock,
        createdAt=(p.created_at.date().isoformat() if p.created_at else ''),
    )
    return out


def review_out(r: Review, voted: bool = False) -> dict:
    return {
        'id': r.id,
        'productId': r.product_id,
        'userId': r.user_id,
        'name': r.name,
        'rating': r.rating,
        'title': r.title,
        'text': r.text,
        'pros': r.pros,
        'cons': r.cons,
        'recommend': r.recommend,
        'period': r.period,
        'helpful': r.helpful,
        'status': r.status,
        'verified': r.verified,
        'reply': r.reply,
        'date': r.created_at.date().isoformat() if r.created_at else '',
        'edited': r.edited_at.date().isoformat() if r.edited_at else None,
        'voted': voted,
    }


def order_out(o: Order, instructions: dict | None = None) -> dict:
    out = {
        'id': o.id,
        'number': o.number,
        'userId': o.user_id,
        'status': o.status,
        'name': o.name,
        'phone': o.phone,
        'email': o.email,
        'delivery': o.delivery,
        'deliveryTitle': o.delivery_title,
        'city': o.city,
        'address': o.address,
        'comment': o.comment,
        'payment': o.payment,
        'paymentTitle': o.payment_title,
        'paymentStatus': o.payment_status,
        'paid': o.payment_status == 'paid',
        'items': o.items,
        'subtotal': o.subtotal,
        'deliveryPrice': o.delivery_price,
        'total': o.total,
        'createdAt': _iso(o.created_at),
    }
    if instructions:
        out['paymentInstructions'] = instructions
    return out
