# Spec: Métrica — Dimensionamento da Força de Trabalho (TJRR)

**Arquivo:** `specs/metrica_etapa2.md`
**Versão:** 1.3.20-prod
**Data:** 2026-08-14
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.

---

## Objetivo da Versão

Entregar o MVP de média fidelidade (Etapa 2) focado na integração do modelo qualitativo/quantitativo do MGI com os gatilhos estatísticos da Resolução CNJ nº 219/2016. A aplicação operará em contêineres, com back-end automatizado e painéis de usabilidade limpa para as unidades de apoio do Tribunal.

A versão **1.3.19-hardening** reforça UI, UX e segurança sobre a fusão 1.3.18: sessão httpOnly, RBAC, GET autenticado, a11y e cabeçalhos.

---

## 🔄 Documento Vivo (Fluxo de Atualização Automática)

Este arquivo é a **fonte da verdade** do sistema. Toda implementação de uma nova funcionalidade, alteração de regra de negócio ou mudança estrutural no banco de dados deve obrigatoriamente atualizar este arquivo de forma automática ao final do ciclo de desenvolvimento.

O fluxo exigido é: **`/build` ➔ `/review` ➔ atualização da spec**. O código só é considerado pronto se a spec refletir exatamente o que está implementado.

---

## 0. Diagnóstico e Estratégia de Fusão (1.3.18)

### Problema encontrado

O repositório tinha **duas aplicações paralelas**:

1. FastAPI + PostgreSQL (regras 400/403, Q₃, JWT, Alembic) — pouco usado pela UI.
2. Next.js com `src/lib/db.ts` em memória — era o que o dashboard e os módulos realmente usavam.

Efeitos: Compose apontava para `./frontend` inexistente; login gerava JWT fake; senhas em texto plano no front; `get_current_user` existia e não protegia POSTs; meta `noindex` marcada no DoD sem estar no `layout.tsx`; CORS documentado e não injetado; DoD falava em 5 tabelas (são 6+).

### Estratégia escolhida

**Fusão com FastAPI como backend canônico**, não descarte do front rico.

- O domínio extra (capacidade produtiva, ponderação, parecer SEI, gráficos do dashboard) foi promovido ao FastAPI/PostgreSQL.
- As rotas `src/app/api/*` viraram BFF: apenas encaminham para a API.
- O login passou a emitir JWT real; POSTs exigem Bearer.
- Docker, seed, spec e DoD foram alinhados a essa arquitetura.

Descartar o FastAPI quebraria a spec (API-first + PostgreSQL). Descartar os módulos Next quebraria o produto visível. A fusão conserva os dois papéis.

---

## 1. Diretrizes de Atuação (Desenvolvedor e Analista Sênior)

- **Automação e Scaffolding:** Criar arquivos em `./` sem subpasta raiz extra. Front em `src/` (não em `frontend/`).
- **Compatibilidade Windows:** Scripts de scaffolding em PowerShell (.ps1) obrigatoriamente.
- **Adesão Estrita:** Proibido codificar funcionalidade não definida nesta spec.
- **Fonte da verdade:** persistência e regras de negócio somente no FastAPI/PostgreSQL.
- **Sugestão de Melhorias:** Apenas sugerir; implementar só com aceite explícito.

---

## 2. Stack Tecnológica Definitiva

| Camada | Tecnologia |
|--------|-----------|
| Front-end | Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Recharts |
| BFF | Rotas `src/app/api/*` fazendo proxy para o FastAPI (`API_URL`) |
| Back-end | Python com FastAPI (API-first, validação via Pydantic) |
| Banco de Dados | PostgreSQL (esquema estritamente relacional) |
| Infraestrutura | Docker e Docker Compose |

---

## 3. Estrutura de Diretórios

```
./
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile                 # imagem Next.js (contexto da raiz)
├── next.config.js
├── README.md
├── setup_project.ps1
├── .env / .env.example
├── specs/metrica_etapa2.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh          # alembic upgrade + seed + uvicorn
│   ├── alembic.ini
│   ├── alembic/env.py
│   ├── alembic/versions/0001_create_schema.py
│   ├── alembic/versions/0002_fusion_domain.py
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── core/ (__init__, security, init_db, rate_limit, security_headers)
│       ├── services/dimensionamento.py
│       └── routers/ (auth, unidades, esforcos, simulacao, dashboard,
│                     categorias, usuarios, entregas, ponderacao, relatorios_sei)
├── src/middleware.ts          # exige cookie nas páginas
└── src/
    ├── app/ (layout, page, login, unidades, entregas, esforcos,
    │         ponderacao, simulacao, relatorios-sei, documentacao, api/*)
    ├── components/ (Navbar, DashboardCharts)
    ├── context/ThemeContext.tsx
    ├── lib/ (backend.ts, auth.ts, useEscape.ts)
    └── types/index.ts
```

---

## 4. Automações e Rotinas de Inicialização

- **Migrações Alembic** no `entrypoint.sh` do contêiner da API (`upgrade head`), inclusive `0002_fusion_domain`.
- **Seed Parâmetros Globais:** ITP = 70% | Teto Apoio Indireto = 30% | pesos de ponderação (0.40 / 0.35 / 0.25) | tolerância de desvio 20%.
- **Seed Categorias:** 7 categorias transversais MGI.
- **Seed Unidades, Entregas, Esforços e Parecer SEI** de demonstração.
- **Seed usuários:**
  - `admin@tjrr.jus.br` (gestor) — senha via `ADMIN_PASSWORD` (default `Admin@2026!`)
  - `ti.executor@tjrr.jus.br` (executor)
  - `apoio@tjrr.jus.br` (apoio_exclusivo)
- **Compose prod (Hostinger):** `docker-compose.prod.yml` com Caddy (80/443), Next `standalone`, API e Postgres só na rede interna. Script `deploy/hostinger.sh`.

---

## 5. Modelo de Dados Relacional

Tabelas: `categorias`, `parametros`, `unidades`, `usuarios`, `entregas`, `esforcos`, `pareceres_sei`.
UUID como PK (string). snake_case. Integridade referencial com FK.

`entregas` inclui campos de capacidade: `carga_horaria_media`, `volume_mensal`, `complexidade`, `criticidade`, `absenteismo_pct`, `rotatividade_pct`, `capacidade_produtiva`.

`parametros` também guarda o motor de ponderação (`PESO_VOLUME`, `PESO_COMPLEXIDADE`, `PESO_CRITICIDADE`, `TOLERANCIA_DESVIO`).

Lotação ideal da unidade é **calculada** (não persistida):  
`servidores_atuais` = n. de usuários da unidade, ou 4 (indireto) / 6 (direto) se não houver usuários;  
`lotacao_ideal = round((IPS/80) * 3 * (1 + n_entregas * 0.25))`.

Capacidade produtiva: `(CH / max(0.5, 1 - (abs+rot)/100)) * volume`.

---

## 6. Regras de Negócio (API Backend)

- **POST /api/esforcos:** Rejeita com HTTP 400 se soma > 100% no mês.
- **POST /api/esforcos:** Rejeita com HTTP 403 se perfil_dft = apoio_exclusivo.
- **POST /api/simulacao/lotacao:** Q3 via numpy.percentile(75); fallback Mediana se reducao_percentual > 30%.
- **GET /api/dashboard/stats:** `pct_esforco_indireto` no mês corrente; `alerta_cnj` se > 30%. Inclui séries para gráficos.
- **GET /api/unidades:** enriquece com `servidores_atuais`, `lotacao_ideal`, `balanco`, `status_dimensionamento`.
- **POST /api/entregas:** calcula `capacidade_produtiva`.
- **GET/POST /api/ponderacao:** lê/grava pesos em `parametros`.
- **GET/POST /api/relatorios-sei:** gera minuta SEI a partir do dimensionamento da unidade.
- **POST /api/token** + **GET /api/me:** JWT 8h. Login com rate-limit (8/min por IP) e verificação dummy para não revelar existência de usuário.
- **Autenticação:** todos os GET e POST em `/api/*` (exceto `POST /api/token` e `GET /`) exigem `get_current_user`.
- **RBAC:** `gestor` — cadastros, ponderação, simulação Q₃ e parecer SEI; `gestor` e `executor` — POST `/api/esforcos`; `apoio_exclusivo` — somente leitura. POST esforços continua rejeitando alvo `apoio_exclusivo` (HTTP 403).
- **SECRET_KEY** forte obrigatória quando `ENV=production` (mín. 32 caracteres). Senha do admin via `ADMIN_PASSWORD`.
- **Cabeçalhos:** `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`. `/docs` desligado em produção.
- Validação Pydantic: percentual 0–100, IPS 0–100, complexidade/criticidade 1–5.

---

## 7. UI, UX, SEO, Temas e Segurança

- Tailwind CSS com paleta corporativa executiva e judiciária. Grid: 1 col mobile / 4 col desktop.
- **Modo Claro / Modo Escuro:** `ThemeContext` e toggle no `Navbar.tsx` com persistência em `localStorage` (`sigep_theme`).
- **Resiliência e Hidratação:** proteção `mounted` nos Recharts e `suppressHydrationWarning` no HTML/body.
- meta `robots: noindex, nofollow` em todas as páginas (`layout.tsx`) e header `X-Robots-Tag`.
- bcrypt + JWT (8h) em cookie **httpOnly** `metrica_token` (SameSite=Lax) definido pelo BFF `/api/token`. O front **não** armazena o JWT em `localStorage`.
- Login real via `/api/token`. `localStorage` guarda só perfil de UI (`metrica_user`). Logout em `/api/logout` apaga o cookie.
- Middleware Next: rotas de página exigem cookie; sem sessão redireciona para `/login`.
- Alerta de cor dinâmica: Apoio Indireto > 30% → vermelho; ≤ 30% → verde.
- Página oculta `/documentacao` (autenticada).
- Acessibilidade: skip-link, `lang=pt-BR`, `focus-visible`, `aria-label`/`aria-expanded` no menu, `aria-modal` nos diálogos, Escape fecha modal, `autocomplete` no login.
- UX de perfil: botões de escrita ocultos para quem não tem permissão; módulo Esforços no Navbar.
- Tema sem FOUC: script de boot lê `sigep_theme` antes da pintura.

---

## 8. Definition of Done (DoD)

- [x] Estrutura de diretórios em ./ sem subpasta extra (`src/` na raiz, não `frontend/`).
- [x] docker-compose.yml com POSTGRES_USER/PASSWORD/DB, healthcheck, CORS_ORIGINS, SECRET_KEY e build do Next a partir da raiz.
- [x] models.py com as 7 tabelas mapeadas (UUID PK, snake_case), inclusive `pareceres_sei` e campos de capacidade em `entregas`.
- [x] HTTP 400 na trava de 100% de esforço.
- [x] HTTP 403 para apoio_exclusivo.
- [x] Q3 com numpy + fallback Mediana automático.
- [x] core/security.py: bcrypt, JWT via SECRET_KEY de ambiente, get_current_user em GET/POST, RBAC por perfil.
- [x] Cookie httpOnly no BFF; JWT não fica em localStorage.
- [x] Rate-limit de login e hash dummy para credencial inválida.
- [x] Cabeçalhos de segurança no Next e na API; `/docs` off em produção.
- [x] Skip-link, aria no menu/modais, Escape, autocomplete, senhas fora da tela de login.
- [x] Navbar com Esforços; ações de escrita conforme perfil DFT.
- [x] core/init_db.py: seed ITP=70%, teto=30%, ponderação, 7 categorias, unidades/entregas demo, Super Admin e perfis.
- [x] Alembic 0001 + 0002 cobrindo o esquema unificado.
- [x] pydantic[email] e python-multipart no requirements.txt.
- [x] meta noindex/nofollow no layout.tsx.
- [x] Alerta de cor dinâmica na UI React via GET /api/dashboard/stats.
- [x] Alternância Claro/Escuro com ThemeContext.
- [x] UI não usa store em memória; BFF proxy para FastAPI.
- [x] Nenhuma segunda fonte de verdade de dados.

---

## 9. Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.3.2 | 2026-08-06 | Versão base da spec (MVP Etapa 2) |
| 1.3.2-build | 2026-08-07 | /build: core/security.py, core/init_db.py criados; docker-compose.yml corrigido (POSTGRES_*); pydantic[email] + python-multipart adicionados; specs/metrica_etapa2.md criado; setup_project.ps1 criado |
| 1.3.3-review | 2026-08-07 | /build pós-review: (1) get_db() centralizado em database.py — removido das 5 cópias duplicadas; (2) @app.on_event → lifespan (FastAPI moderno); (3) CORS_ORIGINS via env var — docker-compose, .env e .env.example atualizados; (4) alerta de cor da UI corrigido: usa pct_esforco_indireto real via GET /api/dashboard/stats (alinhado CNJ 219/2016) — novo router dashboard.py, schema DashboardStats, tipo TS dashboard.ts |
| 1.3.4-review | 2026-08-07 | /build & /review: (1) Adicionado suporte ao Modo Claro e Modo Escuro via `ThemeContext` e botão toggle no `Navbar` com persistência no `localStorage`; (2) Refatoração da paleta de cores em `globals.css` garantindo alta legibilidade e contraste executivo/judiciário em ambos os modos; (3) Prevenção de erros de hidratação SSR/CSR em gráficos e nós DOM do React (`suppressHydrationWarning` e estado `mounted`). |
| 1.3.5-review | 2026-08-07 | Implementação da paleta de cores institucional do TJRR (Tribunal de Justiça do Estado de Roraima): Azul Institucional (`#2563eb`/`#1d4ed8`), Verde Roraima (`#059669`) e Dourado/Amarelo Justiça (`#d97706`/`#f59e0b`) aplicados ao `globals.css`, gráficos Recharts (`DashboardCharts`) e componentes navegacionais (`Navbar`, `page.tsx`). |
| 1.3.6-review | 2026-08-07 | Correção das linhas de trilho (tracks) e manípulos (thumbs) nos controles de parametrização dos sliders (`input[type="range"]`) na página de Ponderação e Simulação. Garantida a visibilidade contínua e estilização em ambos os modos (Claro e Escuro) em navegadores Webkit e Mozilla. |
| 1.3.7-review | 2026-08-07 | Ajuste do gráfico de rosca (PieChart) "Perfil da Força de Trabalho (DFT)" no `DashboardCharts.tsx`: rótulos percentuais internos customizados (`renderPieLabel`) com `labelLine={false}`, evitando que os textos extrapolem o container ou sumam sob o título/borda do cartão. |
| 1.3.8-review | 2026-08-07 | Aprimoramento visual completo dos controles de parametrização (`range-slider`): trilhos (tracks) com alto contraste no Modo Claro (`#cbd5e1`/`#94a3b8`) e Modo Escuro (`#334155`), e manípulos (thumbs) circulares em destaque (22px) com borda branca sólida e cores temáticas por indicador (Azul, Verde, Dourado e Rosa). |
| 1.3.9-review | 2026-08-07 | Aplicação da paleta institucional do TJRR (`#2563eb`, `#059669`, `#d97706`) e regras de alto contraste em Modo Claro/Escuro na página de "Unidades e Quantitativo Ideal por Setor" (`unidades/page.tsx`): botões de ação, filtros de diagnóstico, cartões de lotação ideal/déficit e formulários modais. |
| 1.3.10-review | 2026-08-07 | Reformulação visual dos cartões de Unidade e Quantitativo Ideal em `unidades/page.tsx`: selos com brilho/sombra para Apoio Direto/Indireto, badges de status de diagnóstico (Déficit, Excesso, Lotação Ideal) com ícones direcionais, container interno de dimensionamento e pill da pontuação IPS. |
| 1.3.11-review | 2026-08-07 | Padronização visual completa dos cartões de Unidade (`unidades/page.tsx`) com o padrão de Entregas & Capacidades (`entregas/page.tsx`): grid de métricas operacionais em container interno escuro (`bg-slate-950/60`), rodapé técnico com linha divisória e valor de destaque IPS. |
| 1.3.12-review | 2026-08-08 | Alinhamento rigoroso da identidade visual com as diretrizes normativas do NUCRI/TJRR: Cor Principal (Azul Escuro Institucional `#2563eb`/`#1d4ed8`/`#0b1329`), Contraste (Branco puro `#ffffff`) e Cores de Apoio (Amarelo/Dourado `#d97706` e Verde Roraima `#059669`). Padronização de botões, ficos, modais, emblemas e gráficos em todos os módulos (`entregas`, `ponderacao`, `relatorios-sei`, `simulacao`, `login`, `Navbar` e `DashboardCharts`). |
| 1.3.13-review | 2026-08-08 | Padronização dos selos, badges e tags de status (ex: "Apoio Indireto", "Apoio Direto", "Déficit", "Excesso", "Margem OK") substituindo bordas ovais/pílulas (`rounded-full`) por retângulos de cantos suavizados (`rounded-lg`/`rounded-md`) em todas as páginas do sistema (`unidades`, `entregas`, `ponderacao`, `relatorios-sei`, `page` e `DashboardCharts`). |
| 1.3.14-review | 2026-08-08 | Ajustes de responsividade mobile e alinhamento visual geral: implementação do menu navegacional dropdown drawer com botão hambúrguer (`Menu`/`X`) no `Navbar`, ajuste de margens e espaçamentos dos containers principais (`px-4 sm:px-6 lg:px-10`), e alinhamento do módulo de Alocação de Esforço com a paleta institucional do TJRR. |
| 1.3.15-review | 2026-08-08 | Adequação da identidade visual do topo (`Navbar.tsx`) para o Azul Escuro Institucional do TJRR (`#0b1736`), distanciamento e divisor visual entre os links de navegação e o botão de alternância Claro/Escuro, e aprimoramento completo do contraste de texto e cartões de resultado da análise no Modo Claro na página de Simulação Q₃/Mediana (`simulacao/page.tsx` e `globals.css`). |
| 1.3.16-review | 2026-08-11 | Criação da página oculta de documentação completa do sistema (`/documentacao`): detalhamento de todos os módulos operacionais, fundamentação jurídica (CNJ 219/2016 e MGI/UnB), tabela analítica de equações matemáticas (Lotação Ideal, Balanço, Teto CNJ 30%, Capacidade Produtiva, Ponderação Multidimensional, Q₃ Benchmark, Mediana Fallback e Trava 100%), exemplos numéricos passo a passo e dicionário de dados. |
| 1.3.17-review | 2026-08-11 | Ajuste de justificativa do texto (`text-justify`) em todas as seções descritivas da página `/documentacao` e aprimoramento do contraste da seção "5. Exemplos Práticos de Cálculo Passo a Passo", utilizando cartões internos escuros (`bg-slate-900/90`), texto de alto contraste (`text-slate-100`/`text-slate-200`) e bordas temáticas de destaque em Azul, Âmbar e Rosa alinhadas ao sistema. |
| 1.3.18-fusion | 2026-08-14 | Fusão arquitetural: FastAPI+PostgreSQL única fonte da verdade; Next.js BFF sem `db.ts`; domínio de capacidade/ponderação/SEI promovido ao backend; JWT real nos POSTs; Compose aponta para `src/` na raiz; Alembic 0002; spec/DoD alinhados ao código. |
| 1.3.19-hardening | 2026-08-14 | UI/UX/Segurança: cookie httpOnly, middleware de sessão, RBAC por perfil DFT, GET autenticado, rate-limit de login, headers de segurança, skip-link/aria/Escape, senhas removidas da tela de login, Esforços no Navbar, `/docs` off em produção. |
| 1.3.20-prod | 2026-08-14 | Stack de produção para VPS Hostinger: Next standalone, Caddy 80/443, Postgres/API internos, `deploy/hostinger.sh` e `.env.production.example`. |
