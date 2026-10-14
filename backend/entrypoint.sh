#!/bin/sh
# Запуск бэкенда в Docker / на Render: обновить схему базы, затем запустить сервер.
# IP посетителя за прокси определяет само приложение (TRUST_PROXY, PROXY_HOPS) — заголовкам от кого попало не доверяем.
set -e
# docker compose run backend python -m app.cli ... должен выполнить именно эту команду.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
python -m app.cli check
mkdir -p "${MEDIA_DIR:-/app/media}"
if [ ! -w "${MEDIA_DIR:-/app/media}" ]; then
  echo 'MEDIA_DIR недоступна для записи: проверьте права постоянного диска.' >&2
  exit 1
fi
alembic upgrade head
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 60 \
  --access-logfile -
