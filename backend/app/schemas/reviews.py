from typing import Literal

from pydantic import Field

from .base import In


class ReviewIn(In):
    rating: int = Field(ge=1, le=5)
    name: str = Field('', max_length=40)
    title: str = Field('', max_length=80)
    text: str = Field(min_length=20, max_length=1500)
    pros: str = Field('', max_length=200)
    cons: str = Field('', max_length=200)
    recommend: bool = True
    period: Literal['', 'lt1', '1to3', 'gt3'] = ''
    voter: str = Field('', max_length=64, pattern=r'^[\w-]*$')


class VoteIn(In):
    voter: str = Field('', max_length=64, pattern=r'^[\w-]*$')


class ReplyIn(In):
    text: str = Field('', max_length=1500)


class StatusIn(In):
    status: Literal['published', 'hidden']
