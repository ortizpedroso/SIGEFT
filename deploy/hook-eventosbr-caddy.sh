#!/usr/bin/env bash
# Liga o web da Métrica à rede do Caddy do eventosbr e acrescenta o site
# sigep.inovesw.com.br. Não altera o bloco de www.eventosbr.app.br.
set -euo pipefail

CADDY_CTR="${CADDY_CTR:-eventosbr-caddy-1}"
WEB_CTR="${WEB_CTR:-metrica_web}"
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
python3 - "$CADDYFILE_HOST" "$HOST" "$WEB_CTR" <<'PY'
from pathlib import Path
import sys

path, host, web = sys.argv[1], sys.argv[2], sys.argv[3]
text = Path(path).read_text()
block = (
    f"\n# Métrica / SIGEP — não remover o bloco do eventosbr\n"
    f"{host} {{\n"
    f"\tencode gzip zstd\n"
    f"\treverse_proxy {web}:3000\n"
    f"}}\n"
)
marker = "# Métrica / SIGEP"
if marker in text:
    start = text.index(marker)
    # replace from marker through the closing brace of that site block
    rest = text[start:]
    brace = rest.find("}")
    if brace == -1:
        raise SystemExit("bloco Métrica no Caddyfile sem '}'")
    text = text[:start] + block.lstrip("\n") + rest[brace + 1 :]
elif host in text:
    # hostname já existe sem o marcador: troca o reverse_proxy imediatamente após o host
    lines = text.splitlines(keepends=True)
    out = []
    in_host = False
    replaced = False
    for line in lines:
        if host in line and "{" in line:
            in_host = True
        if in_host and "reverse_proxy" in line:
            indent = line[: len(line) - len(line.lstrip())]
            line = f"{indent}reverse_proxy {web}:3000\n"
            replaced = True
            in_host = False
        out.append(line)
    text = "".join(out)
    if not replaced:
        text += block
else:
    text += block
Path(path).write_text(text)
print(f"Caddyfile atualizado: {host} -> {web}:3000")
PY

docker exec "$CADDY_CTR" caddy reload --config /etc/caddy/Caddyfile
echo
echo "Teste: curl -sI https://$HOST | head"
echo "www.eventosbr.app.br não deve ter mudado."
