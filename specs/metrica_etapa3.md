# Spec: Métrica — Etapa 3 (Aderência TJRR / 5º Prêmio de Inovação)

**Arquivo:** `specs/metrica_etapa3.md`
**Versão:** 1.4.0-etapa3
**Data:** 2026-08-18
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.
**Base:** `specs/metrica_etapa2.md` (versão 1.3.36-chart) permanece válida para tudo não listado aqui.

---

## Objetivo da Versão

Entregar a aderência do sistema Métrica ao edital do **5º Prêmio de Inovação do TJRR**, complementando o MVP da Etapa 2 com:

1. **Simulação preditiva de cenários organizacionais** — realocação de servidores entre unidades antes de executar a mudança.
2. **Metodologia de rateio interno** do teto de 30% de apoio indireto entre secretarias/subsecretarias.
3. **Formalização exportável** da metodologia de dimensionamento (PDF para homologação institucional).
4. **Auditabilidade** das simulações executadas, com histórico persistido e exibição legível para gestores.

A versão **1.4.0-etapa3** consolida as quatro tarefas implementadas na branch `cursor/tjrr-etapa3-fbf9`, incluindo fontes DejaVu no Dockerfile da API e legibilidade amigável do Histórico de Simulações na UI.

---

## 🔄 Documento Vivo (Fluxo de Atualização Automática)

Este arquivo é a **fonte da verdade da Etapa 3**. Toda alteração de regra de negócio, schema ou UI introduzida nesta etapa deve ser refletida aqui ao final do ciclo de desenvolvimento.

O fluxo exigido é: **`/build` ➔ `/review` ➔ atualização da spec**. O código só é considerado pronto se esta spec refletir exatamente o que está implementado.

A Etapa 2 continua regida por `specs/metrica_etapa2.md`; este documento documenta **apenas o incremento** sobre ela.

---

## 1. Diretrizes de Atuação

- **Escopo estrito:** implementar somente o definido nesta spec e na Etapa 2; não refatorar código não relacionado.
- **Persistência:** regras de negócio e gravação de histórico no FastAPI/PostgreSQL; BFF Next.js apenas faz proxy.
- **Auditoria imutável:** `payload_entrada` e `payload_resultado` em `simulacoes_log` permanecem JSON fiel ao request/response; traduções amigáveis são **somente na UI**.

---

## 2. Stack Tecnológica (incremento)

| Camada | Incremento Etapa 3 |
|--------|-------------------|
| Back-end | `fpdf2` para PDF; serviços `simulacao_log`, `documentacao_content`, `documentacao_pdf` |
| Banco | Tabela `simulacoes_log` (Alembic `0004`) |
| Infra | `fonts-dejavu` no `backend/Dockerfile` (suporte a acentuação no PDF) |
| Front-end | Seções em `/simulacao`, card em `/`, botão em `/documentacao`; BFF em `src/app/api/simulacao/*`, `dashboard/rateio-indireto`, `documentacao/pdf` |

---

## 3. Estrutura de Diretórios (incremento)

```
specs/metrica_etapa3.md
backend/
├── alembic/versions/0004_simulacoes_log.py
├── app/routers/documentacao.py
├── app/services/simulacao_log.py
├── app/services/documentacao_content.py
├── app/services/documentacao_pdf.py
└── tests/test_etapa3.py
src/
├── app/api/simulacao/realocacao/route.ts
├── app/api/simulacao/historico/route.ts
├── app/api/dashboard/rateio-indireto/route.ts
├── app/api/documentacao/pdf/route.ts
├── components/RateioIndiretoSection.tsx
└── app/simulacao/page.tsx  (realocação + histórico legível)
```

---

## 4. Automações e Rotinas de Inicialização (incremento)

- **Migração Alembic `0004_simulacoes_log`:** executada no `entrypoint.sh` junto com `0001`–`0003`.
- **Log automático:** toda chamada **bem-sucedida** a `POST /api/simulacao/lotacao` e `POST /api/simulacao/realocacao` grava uma linha em `simulacoes_log` (sem ação extra do usuário).
- **Chamadas com erro** (HTTP 400/422/404) **não** geram log.

---

## 5. Modelo de Dados Relacional (incremento)

### Tabela `simulacoes_log`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (string, PK) | Identificador do registro |
| `usuario_id` | FK → `usuarios.id` | Usuário que executou a simulação (obrigatório) |
| `tipo` | texto | `"q3_mediana"` ou `"realocacao"` |
| `payload_entrada` | texto (JSON) | Corpo da requisição serializado |
| `payload_resultado` | texto (JSON) | Resposta serializada |
| `criado_em` | timestamp | Momento da gravação (default: now) |

Migração: `backend/alembic/versions/0004_simulacoes_log.py`.

---

## 6. Regras de Negócio (API Backend — incremento)

### POST /api/simulacao/realocacao

- **RBAC:** perfil `gestor` (`require_roles("gestor")`).
- **Entrada:** `{ "movimentacoes": [ { "unidade_origem_id", "unidade_destino_id", "quantidade" ≥ 1 } ] }` — de 1 a N movimentações; origem ≠ destino (Pydantic).
- **Cálculo:** reutiliza `dimensionar_unidade` para `servidores_atuais` e `lotacao_ideal`; aplica movimentações **em memória**; recalcula `balanco` e `status_dimensionamento` via `balanco_e_status`; **não persiste** alterações em `unidades`.
- **Validação:** se alguma unidade ficar com efetivo simulado &lt; 0 → HTTP 400 com mensagem indicando a unidade inválida.
- **Resposta:** `unidades_afetadas[]` (antes/depois) + `resumo` (`total_movimentado`, `unidades_que_pioraram`, `unidades_que_melhoraram`). “Piorou” = `|balanco_depois| > |balanco_antes|`; “Melhorou” = inverso; empate não conta.
- **Log:** em sucesso, grava `tipo=realocacao` em `simulacoes_log`.

### GET /api/dashboard/rateio-indireto

- **RBAC:** qualquer perfil autenticado (`get_current_user`).
- **Escopo:** unidades com `tipo = apoio_indireto`.
- **Cota-alvo por unidade:** `cota_alvo_pct = TETO_APOIO_INDIRETO × (lotacao_ideal_unidade / soma_lotacao_ideal_indireto)` (default teto 30%).
- **Percentual real:** `servidores_atuais_unidade / total_servidores_tribunal × 100` (via `dimensionar_unidade`).
- **Desvio:** `percentual_real - cota_alvo_pct`.
- **Classificação:** usa parâmetro existente `TOLERANCIA_DESVIO` (default 20%): `desvio > tolerância` → `acima_da_cota`; `desvio < -tolerância` → `abaixo_da_cota`; caso contrário → `dentro_da_cota`.
- **Campo `pct_esforco_indireto_atual`:** percentual agregado de esforço indireto do mês (mesma lógica do dashboard existente); **não substitui** o monitoramento agregado em `GET /api/dashboard/stats`.

### GET /api/documentacao/pdf

- **RBAC:** perfil `gestor`.
- **Conteúdo:** espelhado de `documentacao_content.py` (texto e equações da página `/documentacao`); capa com título, subtítulo SUBGFT e data; rodapé paginado.
- **Biblioteca:** `fpdf2`; fontes DejaVu (`DejaVuSans`, `DejaVuSans-Bold`, `DejaVuSansMono`) em `/usr/share/fonts/truetype/dejavu/`, instaladas via pacote `fonts-dejavu` no `backend/Dockerfile`.
- **Resposta:** `application/pdf`, attachment `metodologia-dimensionamento-tjrr.pdf`.

### GET /api/simulacao/historico

- **RBAC:** perfil `gestor`.
- **Paginação:** query `page` (default 1), `page_size` (default 20, máx. 100).
- **Ordem:** `criado_em` descendente (mais recentes primeiro).
- **Resposta:** `items[]` com `tipo`, `usuario_email`, `criado_em`, `payload_entrada`, `payload_resultado`; metadados `total`, `page`, `page_size`.

### POST /api/simulacao/lotacao (comportamento existente + incremento)

- Comportamento Q₃/Mediana **inalterado** em relação à Etapa 2.
- **Incremento:** em sucesso, grava `tipo=q3_mediana` em `simulacoes_log`.

### Legibilidade do histórico (UI — regra de exibição)

- O dado persistido **não é alterado**.
- Em `/simulacao`, “Ver detalhes” traduz payloads para português:
  - **`realocacao`:** nomes de unidade resolvidos da lista já carregada na página; resultado usa `nome` do payload; status traduzidos (`deficit`→Déficit, etc.); resumo em texto corrido.
  - **`q3_mediana`:** nome de categoria resolvido da lista da página; estratégia e valores em português.
  - **Fallback:** tipos desconhecidos exibem chave/valor genérico (exceção de segurança).
- **Proibido na UI:** UUID visível; rótulos `snake_case` crus.

---

## 7. UI, UX (incremento)

- **`/simulacao`:** seção **Simulação de Realocação** abaixo de Q₃/Mediana (formulário multi-linha, aviso “Nenhuma alteração é salva”, tabela antes/depois com cores verde/vermelho por melhora/piora).
- **`/` (dashboard):** card **Rateio Interno do Teto de 30%** (`RateioIndiretoSection`) próximo ao alerta CNJ; tabela com classificação verde/âmbar/vermelho.
- **`/documentacao`:** botão **Exportar Metodologia (PDF)** no topo, visível **somente** para gestor.
- **`/simulacao`:** seção **Histórico de Simulações** (gestor): data/hora, tipo, usuário, “Ver detalhes” com Entrada/Resultado em texto legível (duas colunas).

Paleta, RBAC de botões e padrões visuais da Etapa 2 **mantidos**.

---

## 8. Definition of Done (DoD) — Etapa 3

- [x] `POST /api/simulacao/realocacao` com validação de efetivo negativo.
- [x] `GET /api/dashboard/rateio-indireto` com cota proporcional ao `lotacao_ideal`.
- [x] `GET /api/documentacao/pdf` com conteúdo espelhado da página `/documentacao`.
- [x] Migração `0004_simulacoes_log` e log automático em simulações bem-sucedidas.
- [x] `GET /api/simulacao/historico` com paginação e RBAC gestor.
- [x] Fontes DejaVu instaladas no `backend/Dockerfile` para o PDF.
- [x] Exibição do Histórico de Simulações traduzida para texto legível (sem UUID, sem `snake_case` cru).

---

## 9. Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.4.0-etapa3 | 2026-08-18 | Implementação das 4 tarefas TJRR: realocação (`POST /simulacao/realocacao`), rateio interno (`GET /dashboard/rateio-indireto`), PDF metodológico (`GET /documentacao/pdf` + fpdf2), auditoria (`simulacoes_log` + `GET /simulacao/historico`); BFF e UI correspondentes; testes `test_etapa3.py`; fontes DejaVu no Dockerfile. |
| 1.4.1-historico-legivel | 2026-08-18 | Consolidação: spec `metrica_etapa3.md` criada; exibição amigável do Histórico de Simulações em `/simulacao` (resolução de nomes de unidade/categoria, tradução de status e resumo em português; payload persistido inalterado). |
