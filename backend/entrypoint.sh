#!/bin/sh
set -e
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
