"""Аккаунт: регистрация, вход, коды из писем, профиль, пароль."""
from pydantic import EmailStr, Field

from .base import In


class RegisterIn(In):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class LoginIn(In):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class EmailIn(In):
    email: EmailStr


class CodeIn(In):
    email: EmailStr
    code: str = Field(pattern=r'^\d{6}$')


class ResetIn(CodeIn):
    password: str = Field(min_length=1, max_length=200)


class ProfileIn(In):
    name: str | None = Field(None, min_length=2, max_length=80)
    phone: str | None = Field(None, max_length=32, pattern=r'^[\d\s()+\-]*$')


class PasswordIn(In):
    old: str = Field('', max_length=200)
    new: str = Field(min_length=1, max_length=200)


class DeleteMeIn(In):
    password: str = Field('', max_length=200)
