# Spec: Métrica — Dimensionamento da Força de Trabalho (TJRR)

**Arquivo:** `specs/metrica.md`  
**Versão:** 1.9.1  
**Data:** 2026-08-24  
**Comandos:** `/build` implementa; `/review` valida contra este arquivo.

Este é o **único documento de especificação** do sistema. Etapas anteriores (`metrica_etapa2.md` … `metrica_etapa8.md`) foram consolidadas aqui; o histórico de versões permanece na seção [Changelog](#changelog).

---

## Objetivo

Sistema Métrica para dimensionamento da força de trabalho do TJRR, alinhado ao edital do **5º Prêmio de Inovação**, integrando modelo MGI/UnB, gatilhos CNJ 219/2016, simulação preditiva, integração Folha/RH, perfis de vaga com matchmaking de habilidades e gestão de competências (RH).

**Arquitetura:** FastAPI + PostgreSQL (fonte da verdade) + Next.js App Router (BFF proxy + UI). JWT em cookie httpOnly; RBAC por perfil DFT.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Front-end | Next.js, React, TypeScript, Tailwind, Recharts |
| BFF | `src/app/api/*` → FastAPI (`API_URL`) |
| Back-end | Python, FastAPI, Pydantic, Alembic |
| Banco | PostgreSQL |
| Infra | Docker Compose; produção VPS com Caddy externo |

---

## Perfis de acesso (RBAC)

| Perfil | Escrita principal |
|--------|-------------------|
| `gestor` | Cadastros, ponderação, simulação, SEI, integração, usuários, perfis de vaga |
| `executor` | Lançamento de esforços |
| `apoio_exclusivo` | Somente leitura |
| `rh` | PATCH servidores (competências); leitura em `/competencias` |

---

## Módulos e rotas principais

| Módulo | Rota | Notas |
|--------|------|-------|
| Dashboard | `/` | Stats CNJ 30%, rateio interno indireto |
| Unidades | `/unidades` | Dimensionamento, composição vínculo, **Perfis de Lotação** |
| Entregas | `/entregas` | Capacidade produtiva |
| Esforços | `/esforcos` | Trava 100%; 403 apoio_exclusivo |
| Ponderação | `/ponderacao` | Pesos + histórico `parametros_log` |
| Simulação | `/simulacao` | Q₃/Mediana, realocação, histórico legível |
| Competências | `/competencias` | RH — disponíveis + unidades candidatas |
| Instrução SEI | `/relatorios-sei` | Minutas + PATCH gestor |
| Integração | `/integracao` | Sandbox + sync Folha/RH |
| Usuários | `/usuarios` | CRUD gestor |
| Documentação | `/documentacao` | Fonte única `get_documento_sections()` + PDF |
| Capacitação | `/capacitacao` | Guia por perfil (front estático) |

---

## Regras de negócio (resumo)

### Dimensionamento
- Lotação ideal calculada: `(IPS/80) × 3 × (1 + n_entregas × 0.25)`.
- `servidores_atuais`: sincronizados Folha/RH quando existirem; senão fallback usuários / 4 / 6.
- Status: `deficit` | `ideal` | `excesso` via balanço e tolerância.

### Simulação e auditoria
- `POST /api/simulacao/lotacao` — Q₃ + fallback mediana; log `q3_mediana`.
- `POST /api/simulacao/realocacao` — em memória; log `realocacao`.
- `GET /api/simulacao/historico` — gestor; UI traduz payloads.

### Integração Folha/RH
- `POST /api/integracao/sincronizar-folha` — upsert por matrícula; órfãos com `unidade_id` NULL.
- `status_lotacao`: `lotado` | `sem_lotacao` | `disponivel_realocacao`.

### Perfis de vaga e compatibilidade (Etapa 7+)
- Perfis por unidade: escolaridade + habilidades exigidas.
- Score: afinidade de habilidades + bônus 15 em déficit (teto 100).
- Candidatas: top 5 unidades em déficit com perfil cadastrado.

### Servidores (Etapa 8+)
- `GET /api/servidores?status=disponiveis&incluir_candidatas=true` — RH/gestor.
- Ordenação: `sem_lotacao` → `disponivel_realocacao` → nome.

### Usuários (Etapa 8)
- CRUD `/api/usuarios` — gestor; perfis: gestor, executor, apoio_exclusivo, rh.

---

## UI — incrementos recentes (1.9.x)

### `/unidades` — modal Perfis de Lotação
- Gestor cadastra/lista/exclui perfis; aviso soma vs. lotação ideal.
- **Botão Cancelar** no rodapé do modal (fecha sem salvar).

### `/competencias` (RH)
- Filtro default **Disponíveis**; cards com **Unidades candidatas (até 5)** e score.
- Botão Buscar legível nos dois temas (`btn-secondary`).

### Modo claro
- Cobertura em `globals.css` para botões secundários, histórico de simulação e fundos slate.

### PDF
- Fórmulas em layout horizontal (explicação | expressão).

---

## Seed de demonstração

Script: `backend/scripts/seed_demo_1000_servidores.py`  
Prefixos: matrícula `DEMO-`, unidades `(Demo)`.

| Comando | Efeito |
|---------|--------|
| `python -m scripts.seed_demo_1000_servidores` | ~1000 servidores, ~150 unidades |
| `python -m scripts.seed_demo_1000_servidores --preset apresentacao` | **10 unidades**, **100 lotados**, **10 novos** (`sem_lotacao`), **5 liberados** (`disponivel_realocacao`, sem unidade atual) — novos/liberados com escolaridade e habilidades alinhadas a perfis de unidades em déficit para gerar candidatas em `/competencias` |
| `python -m scripts.seed_demo_1000_servidores --limpar` | Remove dados demo (inclui N:N habilidades antes dos servidores) |

Parâmetros explícitos alternativos: `--total-unidades`, `--lotados`, `--novos`, `--liberados`.

---

## Migrações Alembic

`0001` … `0008` (inclui `0007_perfis_vaga_habilidades`, `0008_perfil_rh`).

---

## Definition of Done (estado atual)

- [x] MVP Etapa 2 — dimensionamento, esforços, simulação Q₃, SEI, integração checklist
- [x] Etapa 3 — realocação, rateio 30%, PDF, `simulacoes_log`, histórico legível
- [x] Etapa 4 — `servidores`, sync Folha/RH, `parametros_log`
- [x] Etapa 5 — fonte única documentação (`get_documento_sections`)
- [x] Etapa 6 — fórmulas/exemplos estruturados, `/capacitacao`
- [x] Etapa 7 — perfis de vaga, habilidades, matchmaking
- [x] Etapa 8 — GET servidores + candidatas, UX modo claro, PDF horizontal, CRUD usuários
- [x] 1.9.1 — spec unificada; botão Cancelar em Perfis de Lotação; preset apresentação 100+10+5
- [x] `pytest` 42+ passando; `tsc --noEmit` e build OK

---

## Changelog

Registro consolidado de todas as etapas. Versões mais recentes no topo.

| Versão | Data | Alteração |
|--------|------|-----------|
| **1.9.1** | 2026-08-24 | Spec única `metrica.md`; botão **Cancelar** no modal Perfis de Lotação (`/unidades`); seed `--preset apresentacao` (100 lotados + 10 novos + 5 sem lotação atual, competências alinhadas a déficit). |
| 1.9.0-etapa8 | 2026-08-24 | GET `/api/servidores` com `status=disponiveis` e `incluir_candidatas`; `/competencias`; UX modo claro; PDF fórmulas horizontais; CRUD `/api/usuarios` + `/usuarios`. |
| 1.8.0-etapa7 | 2026-08-23 | Perfil de vaga, catálogo habilidades, compatibilidade, `status_lotacao`, perfil RH (PATCH servidores). |
| 1.7.0-etapa6 | 2026-08-19 | Fórmulas estruturadas (`formulas`), exemplos passo a passo (`exemplos`), página `/capacitacao`. |
| 1.6.0-etapa5 | 2026-08-19 | Fonte única `get_documento_sections()`; página dinâmica; PDF sincronizado; Fórmula 09 rateio. |
| 1.5.0-etapa4 | 2026-08-18 | Tabela `servidores`, sync Folha/RH, composição vínculo, `parametros_log`, histórico ponderação. |
| 1.4.0-etapa3 | 2026-08-18 | Realocação simulada, rateio interno 30%, PDF metodológico, `simulacoes_log`, histórico legível. |
| 1.3.36-chart | 2026-08-14 | MVP Etapa 2 consolidado: fusão FastAPI+Next, RBAC, temas, integração, SEI, categorias MGI, deploy VPS. |
| 1.3.2 | 2026-08-06 | Versão base da spec (MVP Etapa 2). |

<details>
<summary>Histórico detalhado Etapa 2 (1.3.2 — 1.3.36)</summary>

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.3.36-chart | 2026-08-14 | Gráfico lotação: mais espaço acima das legendas. |
| 1.3.35-review | 2026-08-14 | Review spec vs código; Alembic 0003; PATCH autenticado. |
| 1.3.34-categoria | 2026-08-14 | POST `/api/categorias`; UI cadastrar categoria MGI. |
| 1.3.33-doc-hero | 2026-08-14 | Contraste `.doc-hero` em `/documentacao`. |
| 1.3.32-sei-minuta | 2026-08-14 | SEI: Todas unidades; minuta circunstanciada; PATCH edição. |
| 1.3.31-integracao | 2026-08-14 | Integração URL+chave; verificação ao salvar. |
| 1.3.18-fusion | 2026-08-14 | Fusão arquitetural FastAPI canônico; Alembic 0002. |
| 1.3.19-hardening | 2026-08-14 | Cookie httpOnly, middleware, rate-limit, a11y. |
| 1.3.2-build | 2026-08-07 | Scaffolding inicial: security, init_db, docker-compose. |

</details>
