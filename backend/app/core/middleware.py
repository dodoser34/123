import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings
from .rate_limit import client_ip, enforce

log = logging.getLogger('kbch.security')

API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        s = get_settings()
        path = request.url.path

        length = request.headers.get('content-length')
        limit = s.max_upload_mb * 1024 * 1024 * 4 // 3 + 4096 if path.endswith('/uploads') else s.max_body_kb * 1024
        if length and length.isdigit() and int(length) > limit:
            return JSONResponse({'detail': 'Слишком большой запрос'}, status_code=413)

        if path.startswith('/api/') and path != '/api/health':
            try:
                enforce(f'global:{client_ip(request)}', s.rate_global)
            except HTTPException as e:
                log.warning('Лимит запросов превышен: %s %s', client_ip(request), path)
                return JSONResponse({'detail': e.detail}, status_code=429, headers=e.headers)

        response = await call_next(request)

        h = response.headers
        h.setdefault('X-Content-Type-Options', 'nosniff')
        h.setdefault('X-Frame-Options', 'DENY')
        h.setdefault('Referrer-Policy', 'no-referrer')
        h.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
        h.setdefault('Cross-Origin-Resource-Policy', 'cross-origin' if path.startswith(s.media_url) else 'same-site')
        if s.is_production:
            h.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        if path.startswith('/api/') and not path.startswith(('/api/docs', '/api/openapi')):
            h.setdefault('Content-Security-Policy', API_CSP)
            h.setdefault('Cache-Control', 'no-store')
        return response


def install(app: FastAPI) -> None:
    app.add_middleware(SecurityMiddleware)

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        log.exception('Ошибка при обработке %s %s', request.method, request.url.path)
        return JSONResponse({'detail': 'Внутренняя ошибка сервера. Попробуйте позже.'}, status_code=500)
