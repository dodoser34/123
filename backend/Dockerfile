# Образ бэкенда: Python 3.11 + FastAPI под gunicorn/uvicorn
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh && useradd --create-home app && mkdir -p media && chown -R app /app
USER app

EXPOSE 8000
# при запуске: миграции базы → сервер
ENTRYPOINT ["./entrypoint.sh"]
