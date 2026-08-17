#!/usr/bin/env bash
# Idempotent dependency setup for the SIGEP-Força (Métrica TJRR) repo.
# Runs after the repository is checked out. Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 1. Bun (pinned frontend package manager via bun.lock). Install if missing.
if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
  export BUN_INSTALL="$HOME/.bun"
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"
sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun 2>/dev/null || true
sudo ln -sf "$HOME/.bun/bin/bunx" /usr/local/bin/bunx 2>/dev/null || true

# 2. System package needed to create Python virtualenvs for the backend.
if ! dpkg -s python3.12-venv >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3.12-venv
fi

# 3. Frontend (Next.js) dependencies from the committed bun.lock.
bun install --frozen-lockfile

# 4. Backend (FastAPI) virtualenv + dependencies.
cd "$REPO_ROOT/backend"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# 5. Seed the backend's local SQLite database (idempotent).
#    Defaults to sqlite:///./test.db when DATABASE_URL is unset.
.venv/bin/python -m app.core.init_db

echo "install.sh: environment ready."
