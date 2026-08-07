# Spec: Métrica — Dimensionamento da Força de Trabalho (TJRR)

**Arquivo:** `specs/metrica_etapa2.md`
**Versão:** 1.3.11-review
**Data:** 2026-08-07
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.

---

## Objetivo da Versão

Entregar o MVP de média fidelidade (Etapa 2) focado na integração do modelo qualitativo/quantitativo do MGI com os gatilhos estatísticos da Resolução CNJ nº 219/2016. A aplicação operará em contêineres, com back-end automatizado e painéis de usabilidade limpa para as unidades de apoio do Tribunal.

---

## 🔄 Documento Vivo (Fluxo de Atualização Automática)

Este arquivo é a **fonte da verdade** do sistema. Toda implementação de uma nova funcionalidade, alteração de regra de negócio ou mudança estrutural no banco de dados deve obrigatoriamente atualizar este arquivo de forma automática ao final do ciclo de desenvolvimento.

O fluxo exigido é: **`/build` ➔ `/review` ➔ atualização da spec**. O código só é considerado pronto se a spec refletir exatamente o que está implementado.

---

## 1. Diretrizes de Atuação (Desenvolvedor e Analista Sênior)

- **Automação e Scaffolding:** Criar arquivos em `./` sem subpasta raiz extra.
- **Compatibilidade Windows:** Scripts de scaffolding em PowerShell (.ps1) obrigatoriamente.
- **Adesão Estrita:** Proibido codificar funcionalidade não definida nesta spec.
- **Sugestão de Melhorias:** Apenas sugerir; implementar só com aceite explícito.

---

## 2. Stack Tecnológica Definitiva

| Camada | Tecnologia |
|--------|-----------|
| Front-end | Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons |
| Back-end | Python com FastAPI (API-first, validação via Pydantic) |
| Banco de Dados | PostgreSQL (esquema estritamente relacional) |
| Infraestrutura | Docker e Docker Compose |

---

## 3. Estrutura de Diretórios

```
./
├── docker-compose.yml
├── README.md
├── setup_project.ps1
├── .env / .env.example
├── specs/metrica_etapa2.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh
│   ├── alembic.ini
│   ├── alembic/env.py
│   ├── alembic/versions/0001_create_schema.py
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── core/__init__.py
│       ├── core/security.py
│       ├── core/init_db.py
│       └── routers/ (__init__, auth, unidades, esforcos, simulacao)
└── src/
    └── app/ (layout.tsx, page.tsx, globals.css)
```

---

## 4. Automações e Rotinas de Inicialização

- **Migrações Alembic** ao subir o contêiner.
- **Seed Parâmetros Globais:** ITP = 70% | Teto Apoio Indireto = 30%.
- **Seed Categorias:** 7 categorias transversais MGI.
- **Seed Super Admin:** admin@tjrr.jus.br, perfil gestor.

---

## 5. Modelo de Dados Relacional

Tabelas: `categorias`, `parametros`, `unidades`, `usuarios`, `entregas`, `esforcos`.
UUID como PK. snake_case. Integridade referencial com FK.

---

## 6. Regras de Negócio (API Backend)

- **POST /api/esforcos:** Rejeita com HTTP 400 se soma > 100% no mês.
- **POST /api/esforcos:** Rejeita com HTTP 403 se perfil_dft = apoio_exclusivo.
- **POST /api/simulacao/lotacao:** Q3 via numpy.percentile(75); fallback Mediana se reducao_percentual > 30%.

---

## 7. UI, UX, SEO, Temas e Segurança

- Tailwind CSS com suporte a paleta de cores corporativa executiva e judiciária. Grid: 1 col mobile / 4 col desktop.
- **Modo Claro / Modo Escuro (Light & Dark Mode):** Suporte nativo via `ThemeContext` e botão toggle no `Navbar.tsx` com persistência em `localStorage` (`sigep_theme`).
- **Resiliência e Hidratação:** Proteção de montagem no cliente para Recharts (`mounted` state) e flag `suppressHydrationWarning` no HTML/body.
- meta noindex, nofollow em todas as páginas.
- bcrypt + JWT (8h). XSS protegido pelo React/Next.js.
- Alerta de cor dinâmica: Apoio Indireto > 30% → vermelho; ≤ 30% → verde.

---

## 8. Definition of Done (DoD)

- [x] Estrutura de diretórios em ./ sem subpasta extra.
- [x] docker-compose.yml com POSTGRES_USER/PASSWORD/DB corretos + healthcheck.
- [x] models.py com todas as 5 tabelas mapeadas (UUID PK, snake_case).
- [x] HTTP 400 na trava de 100% de esforço.
- [x] HTTP 403 para apoio_exclusivo.
- [x] Q3 com numpy + fallback Mediana automático.
- [x] core/security.py: bcrypt, JWT, get_current_user.
- [x] core/init_db.py: seed ITP=70%, teto=30%, 7 categorias, Super Admin.
- [x] Alembic migração 0001 cobrindo todas as tabelas.
- [x] pydantic[email] e python-multipart no requirements.txt.
- [x] meta noindex/nofollow no layout.tsx.
- [x] Alerta de cor dinâmica na UI React.
- [x] Alternância de Modo Claro / Escuro com ThemeContext, persistência local e paleta de cores coerente.
- [x] Prevenção de divergência de hidratação SSR/CSR nos gráficos de indicadores.
- [x] Nenhuma feature extra implementada.

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

