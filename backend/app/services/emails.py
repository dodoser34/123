"""Письма с кодами. EMAIL_BACKEND=console — код печатается в лог (для разработки), smtp — настоящая отправка."""
import logging
from email.message import EmailMessage

import aiosmtplib

from ..core.config import get_settings

log = logging.getLogger('kbch.email')

SUBJECTS = {
    'verify': 'Подтвердите почту',
    'login': 'Код для входа',
    'reset': 'Сброс пароля',
}
INTROS = {
    'verify': 'Чтобы завершить регистрацию, введите на сайте код:',
    'login': 'Ваш код для входа на сайт:',
    'reset': 'Код для смены пароля:',
}


async def send_code(email: str, code: str, purpose: str) -> None:
    s = get_settings()
    subject = f'{SUBJECTS[purpose]} — {s.app_name}'
    text = (
        f'Здравствуйте!\n\n{INTROS[purpose]}\n\n    {code}\n\n'
        f'Код действует {s.code_ttl_minutes} минут. Если вы ничего не запрашивали, просто удалите это письмо.\n\n{s.app_name}\n{s.frontend_url}'
    )
    html = (
        f'<div style="font-family:Arial,sans-serif;font-size:15px;color:#22251f">'
        f'<p>Здравствуйте!</p><p>{INTROS[purpose]}</p>'
        f'<p style="font-size:30px;font-weight:700;letter-spacing:6px;color:#1f3a2d">{code}</p>'
        f'<p style="color:#5f5f55">Код действует {s.code_ttl_minutes} минут. Если вы ничего не запрашивали, просто удалите это письмо.</p>'
        f'<p>{s.app_name}<br><a href="{s.frontend_url}">{s.frontend_url}</a></p></div>'
    )
    if s.email_backend != 'smtp':
        log.warning('Письмо для %s (%s): код %s', email, purpose, code)
        if s.email_log_file:
            with open(s.email_log_file, 'a', encoding='utf-8') as f:
                f.write(f'{email}\t{purpose}\t{code}\n')
        return
    msg = EmailMessage()
    msg['From'] = s.smtp_from or s.smtp_user
    msg['To'] = email
    msg['Subject'] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype='html')
    await aiosmtplib.send(
        msg,
        hostname=s.smtp_host,
        port=s.smtp_port,
        username=s.smtp_user or None,
        password=s.smtp_password.get_secret_value() or None,
        start_tls=s.smtp_tls and s.smtp_port != 465,
        use_tls=s.smtp_port == 465,
        timeout=20,
    )
