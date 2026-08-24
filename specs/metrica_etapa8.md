# Spec: Métrica — Etapa 8 (Competências visíveis, UX modo claro, PDF horizontal, CRUD usuários)

**Arquivo:** `specs/metrica_etapa8.md`  
**Versão:** 1.9.0-etapa8  
**Data:** 2026-08-24  
**Comandos:** `/build` implementa; `/review` valida contra este arquivo.  
**Base:** `specs/metrica_etapa7.md` permanece válida para o que não for alterado aqui.

---

## Objetivo da Versão

Corrigir regressões de visibilidade e UX identificadas após Etapa 7 + perfil RH:

1. Servidores **novos** e **sem lotação / liberados** devem aparecer de forma confiável no cadastro de competências (RH), com **unidades candidatas** ao lado.
2. Modo claro legível em botões secundários (`Buscar`) e no **Histórico de Simulações**.
3. PDF de metodologia: fórmulas em **layout horizontal** (explicação | fórmula).
4. **CRUD de usuários** com níveis de acesso (gestor administra).

---

## Backend

### GET `/api/servidores`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `busca` | string | Nome ou matrícula (ilike) |
| `status` | string opcional | `lotado`, `sem_lotacao`, `disponivel_realocacao` ou `disponiveis` (sem_lotacao + disponivel_realocacao) |
| `incluir_candidatas` | bool (default false) | Anexa top-5 unidades compatíveis (motor Etapa 7) para servidores elegíveis |
| `page`, `page_size` | int | Paginação (page_size máx. 200) |

**RBAC:** `rh`, `gestor` (leitura). PATCH continua exclusivo `rh`.

**Ordenação:** quando `status=disponiveis`, priorizar `sem_lotacao` → `disponivel_realocacao` → nome.

**Resposta:** `ServidorBasicoOut` com campo opcional `unidades_candidatas[]`.

### CRUD `/api/usuarios`

| Método | RBAC | Descrição |
|--------|------|-----------|
| GET | gestor | Lista usuários |
| POST | gestor | Cria usuário (`email`, `senha`, `perfil_dft`, `unidade_id`) |
| PATCH | gestor | Atualiza perfil/unidade/email/senha |
| DELETE | gestor | Remove usuário (não pode excluir a si mesmo) |

Perfis válidos: `gestor`, `executor`, `apoio_exclusivo`, `rh`.

---

## Front-end

### `/competencias` (RH)

- Filtro de status: **Disponíveis** (default), Novos/Sem lotação, Liberados, Lotados, Todos.
- Carrega `status=disponiveis&incluir_candidatas=true` por padrão.
- Cada card exibe **Unidades candidatas (até 5)** com score e badge Déficit (somente leitura).
- Botão Buscar com classe `btn-secondary` legível nos dois temas.

### `/simulacao`

- Botão Buscar (lotados) com `btn-secondary`.
- Histórico de simulações: cards com codificação visual piorou/melhorou (realocação), legível no modo claro.

### `/usuarios` (gestor)

- Listagem, criação, edição (perfil, unidade, senha opcional) e exclusão de usuários.
- Item **Usuários** no menu (somente gestor).

### Modo claro (`globals.css`)

Cobertura para: `bg-slate-800`, `hover:bg-slate-700`, `bg-slate-950/40`, fundos `rose/emerald` do histórico.

---

## PDF

Fórmulas: título + explicação à esquerda (~48% largura), expressão monoespaçada à direita (~48%). Sem `_pdf_wrap_text` por barra.

---

## Definition of Done (DoD)

- [ ] GET `/api/servidores?status=disponiveis` retorna novos/liberados sem sumir entre lotados
- [ ] `incluir_candidatas=true` popula `unidades_candidatas` na resposta
- [ ] `/competencias` default mostra disponíveis + candidatas
- [ ] Modo claro: Buscar e histórico legíveis
- [ ] PDF fórmulas horizontais
- [ ] CRUD usuários backend + tela `/usuarios`
- [ ] `pytest` 38+ passando; `tsc --noEmit` e `npm run build` OK

---

## Changelog

| Versão | Data | Notas |
|--------|------|-------|
| 1.9.0-etapa8 | 2026-08-24 | Etapa 8 — visibilidade competências, UX claro, PDF horizontal, CRUD usuários |
