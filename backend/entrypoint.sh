#!/bin/sh
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Initializing Database Seeds..."
python -m app.core.init_db

echo "Starting FastAPI Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
