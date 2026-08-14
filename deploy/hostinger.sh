#!/usr/bin/env bash
# Deploy na VPS Hostinger SEM ocupar 80/443 (www.eventosbr.app.br continua no ar).
# Uso: bash deploy/hostinger.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "Crie .env.production a partir de .env.production.example"
  echo "  CORS_ORIGINS=https://sigep.eventosbr.app.br"
  echo "  COOKIE_SECURE=true"
  echo "  SECRET_KEY com 32+ caracteres aleatórios"
  exit 1
fi

if grep -qE 'TROQUE|altere-em-producao|SEU-DOMINIO' .env.production; then
  echo "Substitua os placeholders em .env.production antes de subir."
  exit 1
fi

if ss -tlnp 2>/dev/null | grep -qE ':80 |:443 '; then
  echo "OK: 80/443 já estão em uso (site eventosbr). A Métrica NÃO vai bindar essas portas."
else
  echo "Aviso: 80/443 livres. Mesmo assim este compose só publica 127.0.0.1:3001."
fi

if ss -tlnp 2>/dev/null | grep -qE ':3001 '; then
  echo "Aviso: porta 3001 já está em uso. Pare o processo ou altere o mapeamento no compose."
fi

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api alembic upgrade head
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api python -m app.seed

echo
echo "Containers no ar. Próximo passo no servidor web existente:"
if command -v nginx >/dev/null 2>&1 || [[ -d /etc/nginx ]]; then
  echo "  Nginx detectado → copie deploy/nginx-sigep.conf e recarregue."
  echo "  sudo cp deploy/nginx-sigep.conf /etc/nginx/sites-available/sigep"
  echo "  sudo ln -sf /etc/nginx/sites-available/sigep /etc/nginx/sites-enabled/sigep"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  echo "  sudo certbot --nginx -d sigep.eventosbr.app.br"
elif command -v apache2 >/dev/null 2>&1 || [[ -d /etc/apache2 ]]; then
  echo "  Apache detectado → copie deploy/apache-sigep.conf"
  echo "  sudo a2enmod proxy proxy_http headers ssl rewrite"
  echo "  sudo cp deploy/apache-sigep.conf /etc/apache2/sites-available/sigep.conf"
  echo "  sudo a2ensite sigep"
  echo "  sudo apache2ctl configtest && sudo systemctl reload apache2"
  echo "  sudo certbot --apache -d sigep.eventosbr.app.br"
else
  echo "  Não detectei Nginx/Apache. Se for OpenLiteSpeed (padrão Hostinger):"
  echo "  siga deploy/openlitespeed-sigep.txt — vhost novo, proxy 127.0.0.1:3001"
fi
echo
echo "DNS: A  sigep.eventosbr.app.br  →  mesmo IP de www.eventosbr.app.br"
echo "Não altere o vhost de www.eventosbr.app.br."
