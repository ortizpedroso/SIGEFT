#!/bin/sh
set -e

export PYTHONPATH="/app${PYTHONPATH:+:$PYTHONPATH}"
cd /app

echo "Running Alembic migrations..."
alembic upgrade head

echo "Initializing Database Seeds..."
python -m app.core.init_db

echo "Starting FastAPI Server..."
if [ "$#" -gt 0 ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
else
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000
fi
