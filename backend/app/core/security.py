"""Пароли (bcrypt), токены сессий, одноразовые коды, подписанный state для Google, проверка надёжности пароля."""
import hashlib
import hmac
import secrets
import time

import bcrypt

from .config import get_settings

# ---------- Пароли ----------
BCRYPT_ROUNDS = 12
# хеш несуществующего пароля: если аккаунта нет, всё равно тратим время на проверку — по времени ответа
# нельзя узнать, зарегистрирована ли почта
_DUMMY_HASH = bcrypt.hashpw(b'dummy-password-for-timing', bcrypt.gensalt(BCRYPT_ROUNDS)).decode()

# самые частые пароли — их нельзя использовать
COMMON_PASSWORDS = {
    '12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty123', 'qwertyuiop', '11111111', '00000000',
    'iloveyou', 'admin123', 'admin1234', 'administrator', 'welcome1', 'letmein1', 'abc12345', 'parol123', 'йцукенгш',
    'пароль123', '87654321', 'qwerty12', '1q2w3e4r', '1qaz2wsx', 'zaq12wsx', 'passw0rd', 'kazakhstan', 'almaty123',
}


def hash_password(password: str) -> str:
    """bcrypt с солью; в базе хранится только результат. bcrypt учитывает первые 72 байта пароля."""
    return bcrypt.hashpw(password.encode('utf-8')[:72], bcrypt.gensalt(BCRYPT_ROUNDS)).decode('ascii')


def verify_password(password: str, hashed: str | None) -> bool:
    try:
        ok = bcrypt.checkpw(password.encode('utf-8')[:72], (hashed or _DUMMY_HASH).encode('ascii'))
    except ValueError:
        return False
    return ok and bool(hashed)


def password_problem(password: str, email: str = '') -> str | None:
    """Почему пароль не подходит (или None, если подходит)."""
    s = get_settings()
    if len(password) < s.password_min_length:
        return f'Пароль должен содержать не менее {s.password_min_length} символов'
    if len(password.encode('utf-8')) > 72:
        return 'Пароль слишком длинный (не больше 72 байт)'
    low = password.lower()
    if low in COMMON_PASSWORDS or len(set(password)) < 4:
        return 'Пароль слишком простой — его легко подобрать'
    if email and email.split('@')[0].lower() in low and len(email.split('@')[0]) >= 4:
        return 'Пароль не должен содержать часть почты'
    return None


# ---------- Токены сессий ----------
def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    """В базе — только SHA-256 токена: утечка базы не даёт войти в чужой аккаунт."""
    return hashlib.sha256(token.encode()).hexdigest()


# ---------- Коды из писем ----------
def new_code() -> str:
    return f'{secrets.randbelow(1_000_000):06d}'


def code_hash(email: str, code: str) -> str:
    return hmac.new(get_settings().secret, f'{email.lower()}:{code}'.encode(), hashlib.sha256).hexdigest()


def same(a: str, b: str) -> bool:
    """Сравнение строк за постоянное время (защита от атак по времени)."""
    return hmac.compare_digest(a.encode(), b.encode())


# ---------- Подписанный state для входа через Google ----------
def sign_state(payload: str, ttl: int = 600) -> str:
    expires = str(int(time.time()) + ttl)
    body = f'{payload}|{expires}|{secrets.token_hex(8)}'
    sig = hmac.new(get_settings().secret, body.encode(), hashlib.sha256).hexdigest()[:32]
    return f'{body}|{sig}'


def read_state(state: str) -> str | None:
    try:
        payload, expires, nonce, sig = state.rsplit('|', 3)
        good = hmac.new(get_settings().secret, f'{payload}|{expires}|{nonce}'.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(good, sig) or int(expires) < time.time():
            return None
    except ValueError:
        return None
    return payload
