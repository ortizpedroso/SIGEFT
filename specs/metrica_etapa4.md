# Spec: Métrica — Etapa 4 (Integração Folha/RH + Histórico de Parâmetros)

**Arquivo:** `specs/metrica_etapa4.md`
**Versão:** 1.5.0-etapa4
**Data:** 2026-08-18
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.
**Base:** `specs/metrica_etapa2.md` + `specs/metrica_etapa3.md` permanecem válidas para tudo não listado aqui.

---

## Objetivo da Versão

Preparar o sistema Métrica para a **integração real com a API sandbox Folha/RH do TJRR** (conector já previsto em `/integracao`), trazendo o quantitativo real de servidores com distinção de **vínculo funcional** (efetivo, cargo em comissão, função de confiança) — requisito do 5º Prêmio de Inovação ainda não coberto na Etapa 3.

Adicionalmente, mitigar o risco de obsolescência de parâmetros citado no edital, registrando o **histórico de alterações** dos pesos do motor de ponderação (`parametros_log`).

---

## 🔄 Documento Vivo (Fluxo de Atualização Automática)

Este arquivo é a **fonte da verdade da Etapa 4**. Toda alteração de regra de negócio, schema ou UI introduzida nesta etapa deve ser refletida aqui ao final do ciclo de desenvolvimento.

O fluxo exigido é: **`/build` ➔ `/review` ➔ atualização da spec**. O código só é considerado pronto se esta spec refletir exatamente o que está implementado.

---

## 1. Diretrizes de Atuação

- **Sem dados fictícios do TJRR:** proibido inventar matrículas/nomes/cargos reais em seed ou produção; testes usam identificadores claramente fictícios (`TESTE-001`, `Servidor Teste 1`).
- **Mapeamento Folha/RH isolado:** contrato JSON pendente de confirmação com a STI — função `_map_folha_record` é o único ponto a ajustar.
- **Fallback preservado:** unidades **sem** `Servidor` sincronizado mantêm `servidores_atuais` via `len(usuarios)` / 4 / 6, idêntico à Etapa 3.

---

## 2. Stack Tecnológica (incremento)

| Camada | Incremento Etapa 4 |
|--------|-------------------|
| Banco | Tabelas `servidores` (0005) e `parametros_log` (0006) |
| Back-end | `POST /api/integracao/sincronizar-folha`, `GET /api/parametros/historico`; alteração em `dimensionar_unidade` |
| Front-end | Botão sincronizar em `/integracao`; composição de vínculo em `/unidades`; histórico em `/ponderacao` |

---

## 3. Estrutura de Diretórios (incremento)

```
specs/metrica_etapa4.md
backend/
├── alembic/versions/0005_servidores.py
├── alembic/versions/0006_parametros_log.py
├── app/models.py                    (+ Servidor, ParametroLog, VinculoServidorEnum)
├── app/services/dimensionamento.py  (+ fallback servidores sincronizados)
├── app/routers/integracao.py        (+ sincronizar-folha, _map_folha_record)
├── app/routers/ponderacao.py        (+ log, historico)
├── app/routers/unidades.py          (+ composicao_vinculo)
└── tests/test_etapa4.py
src/
├── app/api/integracao/sincronizar-folha/route.ts
├── app/api/parametros/historico/route.ts
├── app/integracao/page.tsx
├── app/unidades/page.tsx
└── app/ponderacao/page.tsx
```

---

## 4. Automações e Rotinas de Inicialização (incremento)

- Migrações `0005` e `0006` executadas no `entrypoint.sh` (`alembic upgrade head`).
- **Sem seed** de `servidores` — dados vêm exclusivamente da sincronização Folha/RH.

---

## 5. Modelo de Dados Relacional (incremento)

### Tabela `servidores` (migração `0005`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Identificador interno |
| `matricula` | string, **unique** | Chave de upsert vinda da Folha/RH |
| `nome` | string | Nome do servidor |
| `unidade_id` | FK → `unidades`, **nullable** | Unidade local; `NULL` se órfão |
| `vinculo` | enum | `efetivo`, `cargo_comissionado`, `funcao_confianca` |
| `cargo_nome` | string, opcional | Cargo textual da Folha |
| `sincronizado_em` | timestamp | Momento do último upsert |

Relacionamento: `Unidade.servidores` ↔ `Servidor.unidade`.

### Tabela `parametros_log` (migração `0006`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Identificador |
| `usuario_id` | FK → `usuarios` | Gestor que alterou |
| `chave` | string | Ex.: `PESO_VOLUME` |
| `valor_anterior` | float | Valor antes da alteração (ou default se nunca salvo) |
| `valor_novo` | float | Valor gravado |
| `alterado_em` | timestamp | Momento da alteração |

---

## 6. Regras de Negócio (API Backend — incremento)

### POST /api/integracao/sincronizar-folha

- **RBAC:** `gestor`.
- **Config:** reutiliza `_load_global` (`INTEGRACAO_API`: URL + chave). Sem URL/chave → HTTP 400.
- **Chamada:** GET `{sandbox_url}/folha/servidores` (constante `FOLHA_SERVIDORES_PATH`, ajustável).
- **Resposta esperada:** lista JSON de registros; aceita array raiz ou objeto com chave `servidores`/`items`/`data`.
- **Mapeamento:** `_map_folha_record(raw)` — único ponto de tradução de campos (contrato STI pendente).
- **Upsert:** por `matricula`; atualiza `sincronizado_em`.
- **Órfãos:** `unidade_id`/`unidade_codigo` sem match local → grava com `unidade_id = NULL`, incrementa contador `orfaos`.
- **Falha sandbox:** HTTP 502 (rede, timeout, HTTP erro, JSON inválido) — **nunca** grava dado inventado.
- **Sucesso:** `{"sincronizados": N, "orfaos": M}`; atualiza `_upsert_check` do conector `"folha"`.

### Alteração em `dimensionar_unidade`

- Se `len(unidade.servidores) >= 1` (servidores sincronizados com `unidade_id` da unidade): `servidores_atuais = count`.
- Caso contrário: comportamento idêntico ao anterior (`len(usuarios)` ou fallback 4/6).

### GET /api/unidades (incremento)

Campo `composicao_vinculo`:

- Com servidores sincronizados: `{"sincronizado": true, "efetivo": N, "cargo_comissionado": N, "funcao_confianca": N}`.
- Sem servidores: `{"sincronizado": false, "efetivo": 0, "cargo_comissionado": 0, "funcao_confianca": 0}`.

### POST /api/ponderacao (incremento)

- Antes de gravar cada chave, compara valor novo com atual (`parametros.valor` ou `DEFAULTS`).
- Se diferente, insere linha em `parametros_log` com `usuario_id` do gestor autenticado.

### GET /api/parametros/historico

- **RBAC:** `gestor`.
- **Paginação:** `page` (default 1), `page_size` (default 20, máx. 100).
- **Ordem:** `alterado_em` descendente.
- **Resposta:** items com `usuario_email`, `chave`, `valor_anterior`, `valor_novo`, `alterado_em`.

---

## 7. UI (incremento)

- **`/integracao`:** botão **Sincronizar agora** no card Folha/RH (gestor); feedback `sincronizados` / `orfaos`.
- **`/unidades`:** ao lado de lotação atual — se sincronizado: `"3 efetivos · 1 CC · 1 FC"` (omite zeros); se não: **"Aguardando sincronização com Folha/RH"**.
- **`/ponderacao`:** seção **Histórico de Alterações** abaixo dos sliders; rótulos amigáveis (ex.: "Peso Volume: 0.40 → 0.45"); sem UUID nem chave técnica crua.

---

## 8. Definition of Done (DoD) — Etapa 4

- [x] Tabela `servidores` criada (migração `0005_servidores.py`), com campo `vinculo` (enum: `efetivo`, `cargo_comissionado`, `funcao_confianca`).
- [x] `dimensionar_unidade` usa `servidores` quando houver dado sincronizado para a unidade, e cai no comportamento atual (`len(unidade.usuarios)`) quando não houver — sem quebrar nenhum teste existente.
- [x] Endpoint de sincronização com a Folha/RH, reaproveitando a configuração já salva em `/integracao`, com upsert idempotente por matrícula.
- [x] Composição de vínculo (efetivo/CC/FC) exposta na resposta de `/api/unidades`, com estado explícito de "não sincronizado" quando aplicável.
- [x] UI: botão de sincronização na tela de Integração, com feedback de quantos registros foram sincronizados.
- [x] UI: composição de vínculo visível na tela de Unidades, distinguindo claramente "0 porque já sincronizou e não há" de "ainda não sincronizado".
- [x] Tabela `parametros_log` criada (migração `0006_parametros_log.py`).
- [x] `POST /api/ponderacao` grava uma linha em `parametros_log` para cada peso que efetivamente mudou de valor.
- [x] Endpoint `GET /api/parametros/historico`, paginado, RBAC gestor.
- [x] UI: seção de histórico de alterações na tela de Ponderação.
- [x] Suíte de testes existente (16 testes) continua passando, mais os testes novos desta etapa.

---

## 9. Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.5.0-etapa4 | 2026-08-18 | Início da Etapa 4: tabela `servidores`, sincronização Folha/RH (`POST /integracao/sincronizar-folha`), composição de vínculo em unidades, `dimensionar_unidade` com fallback, `parametros_log`, histórico de ponderação, UI correspondente. |
| 1.5.1-etapa4-build | 2026-08-18 | Implementação completa: migrações 0005/0006, mapeamento `_map_folha_record` isolado, testes mockados, BFF e telas Integração/Unidades/Ponderação. |
