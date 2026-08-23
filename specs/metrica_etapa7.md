# Spec: Métrica — Etapa 7 (Perfil de Vaga e Compatibilidade de Habilidades — MVP)

**Arquivo:** `specs/metrica_etapa7.md`
**Versão:** 1.8.0-etapa7
**Data:** 2026-08-23
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.
**Base:** `specs/metrica_etapa6.md` permanece válida para tudo não listado aqui.

---

## Objetivo da Versão

Permitir que gestores cadastrem **perfis de vaga por unidade** (escolaridade + habilidades exigidas) e visualizem **sugestões de realocação** para servidores sem lotação ou liberados manualmente, com score de compatibilidade — reforçando o Pilar 3 (Capacitação Continuada) e preparando decisões de remanejamento mais realistas antes da submissão do 5º Prêmio de Inovação.

MVP deliberadamente enxuto: habilidades e escolaridade são **cadastro manual**; vaga aberta é **aproximada** por déficit geral da unidade.

---

## Modelo de dados

| Entidade | Campos principais |
|----------|-------------------|
| `habilidades` | `id`, `nome` (único) |
| `unidade_perfil_vaga` | `id`, `unidade_id`, `nome_perfil`, `quantidade` (≥1), `nivel_escolaridade` (`medio` \| `superior`) |
| `perfil_vaga_habilidade` | N:N perfil ↔ habilidade |
| `servidor_habilidade` | N:N servidor ↔ habilidade |
| `servidores` (+colunas) | `nivel_escolaridade` (nullable), `status_lotacao` (`lotado` \| `sem_lotacao` \| `disponivel_realocacao`) |

**Migração:** `0007_perfis_vaga_habilidades.py` — backfill `status_lotacao`: `lotado` se `unidade_id` preenchido, senão `sem_lotacao`.

**Sync Folha/RH:** upsert define `lotado` se unidade resolve, `sem_lotacao` se não — com comentário no código sobre limitação (novo vs. órfão por organograma). Sync **sobrescreve** `disponivel_realocacao` para `lotado` quando unidade resolve.

---

## Critério de compatibilidade (matchmaking)

1. **Escolaridade (filtro rígido):** superior atende médio e superior; médio só atende médio; sem escolaridade → excluído das sugestões.
2. **Afinidade:** `(habilidades em comum / habilidades exigidas) × 100`; perfil sem habilidades exigidas → 100%.
3. **Bônus déficit:** +15 se unidade em déficit (Fórmula 02 / `dimensionar_unidade`); teto 100.
4. **Por unidade:** melhor score entre perfis cadastrados.
5. **Candidatas:** unidade com ≥1 perfil **e** déficit; top 5 por score.

---

## Endpoints

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/habilidades` | autenticado |
| POST | `/api/habilidades` | gestor |
| GET | `/api/unidades/{id}/perfis-vaga` | autenticado |
| POST | `/api/unidades/{id}/perfis-vaga` | gestor |
| DELETE | `/api/unidades/{id}/perfis-vaga/{perfil_id}` | gestor |
| PATCH | `/api/servidores/{id}` | gestor |
| POST | `/api/servidores/{id}/liberar-realocacao` | gestor |
| POST | `/api/servidores/{id}/cancelar-liberacao` | gestor |
| GET | `/api/servidores/lotados?busca=` | gestor |
| GET | `/api/simulacao/servidores-disponiveis` | autenticado |

---

## Front-end

- **`/unidades`:** modal “Perfis de Lotação” por unidade (gestor) — lista, cadastro, aviso soma vs. lotação ideal.
- **`/simulacao`:** seção “Servidores Disponíveis” — edição escolaridade/habilidades, candidatas com score, busca de lotados + liberar.

---

## Limitações Conhecidas desta Etapa

- Habilidades e escolaridade são **cadastro manual** — não vêm da Folha/RH.
- Catálogo de habilidades **sem deduplicação semântica** (ex.: “Excel” vs. “Planilhas”).
- **Vaga aberta** aproximada: unidade com perfil cadastrado **e** déficit geral — não ocupação exata por perfil.
- Servidores `sem_lotacao` por erro de organograma e servidores genuinamente novos tratados igualmente (limitação de dado Folha/RH).
- Simulação de Realocação existente **não valida** compatibilidade automaticamente (possível Etapa 8 pós-submissão).

---

## Definition of Done (DoD) — Etapa 7

- [x] Migração `0007` criada com backfill de `status_lotacao`.
- [x] Models, serviço `compatibilidade.py` e endpoints implementados.
- [x] Sync Folha/RH atualiza `status_lotacao` com comentário de limitação.
- [x] UI em `/unidades` (perfis de lotação) e `/simulacao` (servidores disponíveis).
- [x] Testes automatizados de escolaridade, score, teto 100 e integração básica (`test_etapa7.py`).
- [x] `pytest` — 34 testes passando; `npx tsc --noEmit` OK.

---

## Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.8.0-etapa7 | 2026-08-23 | Perfil de vaga por unidade; catálogo de habilidades; compatibilidade para servidores disponíveis; status_lotacao; MVP matchmaking na Simulação. |
