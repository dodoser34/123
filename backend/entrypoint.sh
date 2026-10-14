#!/bin/sh
# Запуск бэкенда в Docker / на Render: обновить схему базы, затем запустить сервер.
# IP посетителя за прокси определяет само приложение (TRUST_PROXY, PROXY_HOPS) — заголовкам от кого попало не доверяем.
set -e
alembic upgrade head
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 60 \
  --access-logfile -
