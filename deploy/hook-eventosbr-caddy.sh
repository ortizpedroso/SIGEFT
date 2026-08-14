#!/usr/bin/env bash
# Liga o web da Métrica à rede do Caddy do eventosbr e acrescenta o site
# sigep.inovesw.com.br. Não altera o bloco de www.eventosbr.app.br.
set -euo pipefail

CADDY_CTR="${CADDY_CTR:-eventosbr-caddy-1}"
WEB_CTR="${WEB_CTR:-sigep-forca-web-1}"
HOST="${SIGEP_HOST:-sigep.inovesw.com.br}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! docker inspect "$CADDY_CTR" >/dev/null 2>&1; then
  echo "Container $CADDY_CTR não encontrado. Ajuste CADDY_CTR=..."
  docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'
  exit 1
fi
if ! docker inspect "$WEB_CTR" >/dev/null 2>&1; then
  echo "Container $WEB_CTR não encontrado. Suba a stack da Métrica primeiro."
  exit 1
fi

NET="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$CADDY_CTR" | awk 'NF{print; exit}')"
if [[ -z "$NET" ]]; then
  echo "Não achei a Docker network do Caddy."
  exit 1
fi

echo "Rede do Caddy: $NET"
docker network connect "$NET" "$WEB_CTR" 2>/dev/null || echo "web já está na rede $NET"

CADDYFILE_HOST="$(
  docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$CADDY_CTR"
)"
if [[ -z "$CADDYFILE_HOST" || ! -f "$CADDYFILE_HOST" ]]; then
  echo "Não achei o Caddyfile montado em /etc/caddy/Caddyfile."
  echo "Cole o conteúdo de $ROOT/deploy/caddy-sigep-eventosbr.caddyfile no Caddyfile do eventosbr."
  docker inspect "$CADDY_CTR" --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
  exit 1
fi

echo "Caddyfile: $CADDYFILE_HOST"
if grep -qF "$HOST" "$CADDYFILE_HOST"; then
  echo "O hostname $HOST já está no Caddyfile."
else
  {
    echo
    echo "# Métrica / SIGEP — não remover o bloco do eventosbr"
    echo "$HOST {"
    echo "	encode gzip zstd"
    echo "	reverse_proxy ${WEB_CTR}:3000"
    echo "}"
  } >> "$CADDYFILE_HOST"
  echo "Bloco de $HOST acrescentado."
fi

docker exec "$CADDY_CTR" caddy reload --config /etc/caddy/Caddyfile
echo
echo "Teste: curl -sI -H 'Host: $HOST' https://127.0.0.1/ --insecure | head"
echo "Site: https://$HOST"
echo "www.eventosbr.app.br não deve ter mudado."
