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
- JWT real (8h) no login; escritas exigem `Authorization: Bearer`.
- Trava de esforços em 100% no mês (HTTP 400) e bloqueio de `apoio_exclusivo` (HTTP 403).
- Q₃ com NumPy e fallback de mediana se redução > 30%.
- Módulos de entregas/capacidade, ponderação, pareceres SEI e dashboard CNJ 219/2016.
- Meta `noindex, nofollow` e tema claro/escuro.
