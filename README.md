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

## Produção na VPS Hostinger

Na VPS (Ubuntu), com Docker:

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH depois disto

sudo mkdir -p /opt/sigep-forca
sudo chown "$USER":"$USER" /opt/sigep-forca
cd /opt/sigep-forca
git clone https://github.com/ortizpedroso/SIGEFT.git .
cp .env.production.example .env
nano .env   # preencha domínio, senhas e SECRET_KEY
```

Gere a `SECRET_KEY`:

```bash
openssl rand -hex 32
```

No `.env`, exemplos:

- Com domínio (HTTPS automático via Caddy): `SITE_ADDRESS=sigep.seudominio.jus.br` e `COOKIE_SECURE=true`
- Só com IP (HTTP na porta 80): `SITE_ADDRESS=:80` e `COOKIE_SECURE=false`

Painel Hostinger: libere as portas **80** e **443** no firewall. Aponte o DNS A do domínio para o IP da VPS.

Suba:

```bash
chmod +x deploy/hostinger.sh
./deploy/hostinger.sh
```

A API e o PostgreSQL **não** ficam expostos na internet; só o Caddy (80/443) fala com o Next.
