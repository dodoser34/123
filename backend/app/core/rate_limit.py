import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import get_settings

PERIODS = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400}


def parse(rule: str) -> tuple[int, int]:
    count, _, period = rule.partition('/')
    return int(count), PERIODS[period.strip()]


class RateLimiter:
    def __init__(self) -> None:
        self.hits: dict[str, deque] = defaultdict(deque)
        self.calls = 0

    def check(self, key: str, rule: str) -> int | None:
        limit, window = parse(rule)
        now = time.monotonic()
        q = self.hits[key]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return int(q[0] + window - now) + 1
        q.append(now)
        self.calls += 1
        if self.calls % 1000 == 0:
            for k in [k for k, v in self.hits.items() if not v]:
                del self.hits[k]
        return None

    def reset(self) -> None:
        self.hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    s = get_settings()
    if s.trust_proxy:
        chain = [x.strip() for x in request.headers.get('x-forwarded-for', '').split(',') if x.strip()]
        if chain:
            return chain[-min(max(s.proxy_hops, 1), len(chain))][:64]
    return request.client.host if request.client else 'unknown'


def enforce(key: str, rule: str) -> None:
    if not get_settings().rate_limit_enabled:
        return
    retry = limiter.check(key, rule)
    if retry is not None:
        raise HTTPException(429, 'Слишком много попыток. Подождите немного и повторите.', headers={'Retry-After': str(retry)})


def limit(rule_name: str, scope: str):

    def dependency(request: Request) -> None:
        enforce(f'{scope}:{client_ip(request)}', getattr(get_settings(), rule_name))

    return dependency
