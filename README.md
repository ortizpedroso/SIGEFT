# Métrica — Dimensionamento da Força de Trabalho (TJRR)

Este repositório contém a implementação MVP da etapa 2 do projeto, com FastAPI no backend, Next.js no frontend, e PostgreSQL em container.

## Como rodar

1. Copie o arquivo de exemplo para `.env`:

```powershell
Copy-Item .env.example .env
```

2. Suba a stack com Docker Compose:

```powershell
docker-compose up --build
```

3. Acesse:

- Front-end: http://localhost:3001
- Back-end: http://localhost:8001

## O que está implementado

- API FastAPI com validação Pydantic e banco PostgreSQL.
- Modelos relacionais com UUID e integridade referencial.
- Validação de esforços para não ultrapassar 100% por mês.
- Bloqueio de perfil `apoio_exclusivo` em `/api/esforcos`.
- Cálculo do Quartil 3 (`Q_3`) em `/api/simulacao/lotacao`.
- Tailwind CSS no frontend e meta `noindex, nofollow`.
