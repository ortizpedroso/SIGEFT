#!/usr/bin/env bash
# Sobe o SIGEP-Força na VPS (Hostinger). Execute na pasta do repositório.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado. Copie .env.production.example para .env e preencha os valores."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin não encontrado."
  exit 1
fi

echo "Construindo e iniciando a stack de produção..."
docker compose -f docker-compose.prod.yml up -d --build

echo
docker compose -f docker-compose.prod.yml ps
echo
echo "Pronto. Se SITE_ADDRESS for um domínio, o Caddy emite HTTPS automaticamente."
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
