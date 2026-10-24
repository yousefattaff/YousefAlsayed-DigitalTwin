FROM python:3.12-slim

WORKDIR /app
ARG UV_VERSION=0.10.12
COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install --no-cache-dir "uv==${UV_VERSION}" && uv sync --frozen --no-dev --no-install-project --no-cache
COPY backend/server.py backend/lambda_handler.py ./
COPY content /content

ENV PATH="/app/.venv/bin:$PATH"
ENV CONTENT_DIR=/content
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
