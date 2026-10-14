"""Что принимает API: проверка и очистка входных данных (по разделам)."""
from .auth import CodeIn, DeleteMeIn, EmailIn, LoginIn, PasswordIn, ProfileIn, RegisterIn, ResetIn
from .catalog import CategoryIn, ProductIn, SubIn, UploadIn
from .orders import OrderIn, OrderItemIn, OrderPatchIn
from .reviews import ReplyIn, ReviewIn, StatusIn, VoteIn
from .site import SitePhotoIn, TextEditsIn, UserPatchIn

__all__ = [
    'CodeIn', 'DeleteMeIn', 'EmailIn', 'LoginIn', 'PasswordIn', 'ProfileIn', 'RegisterIn', 'ResetIn',
    'CategoryIn', 'ProductIn', 'SubIn', 'UploadIn', 'OrderIn', 'OrderItemIn', 'OrderPatchIn',
    'ReplyIn', 'ReviewIn', 'StatusIn', 'VoteIn', 'SitePhotoIn', 'TextEditsIn', 'UserPatchIn',
]
