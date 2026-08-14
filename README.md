# Métrica — Dimensionamento da Força de Trabalho (TJRR)

Este repositório contém o MVP da etapa 2: FastAPI + PostgreSQL como fonte da verdade, Next.js como interface (BFF proxy para a API).

## Como rodar

1. Copie o arquivo de exemplo para `.env`:

```powershell
Copy-Item .env.example .env
```

2. Suba a stack com Docker Compose:

```powershell
docker compose up --build
```

3. Acesse:

- Front-end: http://localhost:3001
- Back-end: http://localhost:8001
- API Docs: http://localhost:8001/docs

Contas de seed (alterar senhas em produção):

- `admin@tjrr.jus.br` / `Admin@2026!` (gestor)
- `ti.executor@tjrr.jus.br` / `Executor@2026!` (executor)
- `apoio@tjrr.jus.br` / `Apoio@2026!` (apoio exclusivo)

## O que está implementado

- API FastAPI com validação Pydantic e PostgreSQL relacional (UUID + FKs).
- Next.js consome a API via rotas BFF em `src/app/api/*` (sem store em memória).
- JWT httpOnly (cookie `metrica_token`, 8h) via BFF; páginas exigem sessão.
- GET autenticado; POSTs com RBAC (gestor / executor / apoio exclusivo).
- Trava de esforços em 100% no mês (HTTP 400) e bloqueio de `apoio_exclusivo` (HTTP 403).
- Q₃ com NumPy e fallback de mediana se redução > 30%.
- Módulos de entregas/capacidade, ponderação, pareceres SEI e dashboard CNJ 219/2016.
- Meta `noindex, nofollow` e tema claro/escuro.

## Produção na VPS Hostinger (junto com www.eventosbr.app.br)

O site **www.eventosbr.app.br** já ocupa as portas **80** e **443**. A Métrica **não** sobe Caddy e **não** faz bind nessas portas. O Docker publica só `127.0.0.1:3001`; o Nginx/Apache/OpenLiteSpeed existente faz o proxy no hostname que você escolher.

### DNS: subdomínio de outro plano Hostinger (inovesw)

Sim: o site **www.inovesw.com.br** pode continuar no plano compartilhado Hostinger. Um subdomínio desse domínio aponta para a VPS só com um registro A — o plano compartilhado não hospeda a Métrica.

| Hostname | Onde fica |
| --- | --- |
| `www.inovesw.com.br` | Plano Hostinger (não alterar) |
| `sigep.inovesw.com.br` | Registro **A** → IP público da VPS |
| `www.eventosbr.app.br` | VPS, 80/443 (não alterar o vhost) |

No hPanel do inovesw: aba **Registros DNS** (não Subdomínios). Tipo `A`, nome `sigep`, valor = IP da **VPS** — não use `191.96.63.250`. Passo a passo completo em `deploy/dns-subdominio.txt`.

Alternativa na zona do eventosbr: `A sigep.eventosbr.app.br` → o mesmo IP da VPS.

1. Crie o registro A e confira com `ping` que o hostname resolve para a VPS.
2. Na VPS, clone e configure (sem instalar um segundo proxy em 80/443):

```bash
sudo apt update && sudo apt install -y git curl
# Docker só se ainda não estiver instalado:
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH depois disto

sudo mkdir -p /opt/sigep-forca
sudo chown "$USER":"$USER" /opt/sigep-forca
cd /opt/sigep-forca
git clone https://github.com/ortizpedroso/SIGEFT.git .
cp .env.production.example .env.production
nano .env.production   # senhas, SECRET_KEY, CORS_ORIGINS e ALLOWED_HOSTS = o hostname do DNS
```

Gere a `SECRET_KEY`:

```bash
openssl rand -hex 32
```

Suba só os containers (Postgres + API internos, Next em 127.0.0.1:3001):

```bash
chmod +x deploy/hostinger.sh
./deploy/hostinger.sh
```

3. No servidor web **já existente** na VPS, adicione um vhost **novo** (não edite o do eventosbr). Troque `server_name` pelo hostname do DNS (`sigep.inovesw.com.br` ou o que você criou):

- Nginx: `deploy/nginx-sigep.conf` + `certbot --nginx -d SEU_HOST`
- Apache: `deploy/apache-sigep.conf` + `certbot --apache -d SEU_HOST`
- OpenLiteSpeed: `deploy/openlitespeed-sigep.txt`

A API e o PostgreSQL **não** ficam expostos na internet. `www.eventosbr.app.br` e `www.inovesw.com.br` continuam onde já estão.
