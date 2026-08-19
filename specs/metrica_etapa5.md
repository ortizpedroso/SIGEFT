# Spec: Métrica — Etapa 5 (Documentação Formal Unificada)

**Arquivo:** `specs/metrica_etapa5.md`
**Versão:** 1.6.0-etapa5
**Data:** 2026-08-19
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.
**Base:** `specs/metrica_etapa2.md`, `specs/metrica_etapa3.md` e `specs/metrica_etapa4.md` permanecem válidas para tudo não listado aqui.

---

## Objetivo da Versão

Manter a documentação formal (página `/documentacao` e PDF de homologação) **atualizada** em relação às funcionalidades das Etapas 3 e 4, e **eliminar estruturalmente** o risco de divergência entre página e PDF — unificando ambos numa única fonte de dados no backend (`get_documento_sections()`).

Esta etapa altera **somente conteúdo textual e arquitetura de renderização da documentação**. Nenhuma regra de negócio, endpoint funcional ou cálculo do sistema foi modificado.

---

## 🔄 Documento Vivo (Fluxo de Atualização Automática)

Esta etapa inverte parcialmente o fluxo das etapas anteriores: a spec formal (`metrica_etapa5.md`) foi escrita **após** o build, documentando o que foi de fato implementado.

---

## O que mudou (conteúdo)

### Seção 2 — Marco Normativo e Diretrizes Metodológicas

- Novo parágrafo sobre **metodologia de rateio interno do teto de 30%**: cota-alvo proporcional à Lotação Ideal de cada unidade de apoio indireto; classificação de desvio (acima/abaixo/dentro da cota) conforme `TOLERANCIA_DESVIO`; referência a `GET /api/dashboard/rateio-indireto`.

### Seção 3 — Módulos e Funcionalidades do Sistema

Estrutura migrada de `paragraphs` para **`modulos`** (9 cards):

| Módulo | Incremento documentado |
|--------|------------------------|
| Dashboard Executivo | Card de Rateio Interno do teto de 30% |
| Gestão de Unidades | Composição de vínculo (efetivo/CC/FC) e estado "Aguardando sincronização com Folha/RH" |
| Motor de Ponderação | Histórico de Alterações de pesos (`GET /api/parametros/historico`) |
| Simulação e Auditoria | Renomeado; cobre Q₃/Mediana, Realocação (`POST /api/simulacao/realocacao`) e Histórico (`GET /api/simulacao/historico`) |
| Integração | Botão "Sincronizar agora" Folha/RH (`POST /api/integracao/sincronizar-folha`) |
| Exportação de Metodologia (PDF) | **Novo módulo** — `GET /api/documentacao/pdf` para homologação institucional |

Demais módulos (Entregas, Esforços, Minutas SEI) mantêm descrição factual existente.

### Seção 4 — Fórmulas Matemáticas

- Nova **Fórmula 09 — Cota-Alvo do Rateio Interno (Apoio Indireto)** com `Cota_Alvo_%`, `Percentual_Real_%`, `Desvio_%` e classificação por tolerância.

---

## O que mudou (arquitetura)

### Fonte única: `get_documento_sections()`

Retorna lista de seções com despacho por chave:

| Chave | Uso |
|-------|-----|
| `paragraphs` | Seções 1, 2, 5, 6, 7 |
| `modulos` | Seção 3 — objetos `{ icone, titulo, rota, descricao }` |
| `equations` | Seção 4 — linhas monoespaçadas |

### Consumidores

- **`documentacao_pdf.py`:** renderiza `paragraphs`, `modulos` (título+rota em negrito, descrição) e `equations`; quebra de linha em paths longos via `_pdf_wrap_text`.
- **`GET /api/documentacao/content`:** retorna JSON idêntico ao de `get_documento_sections()`; RBAC: qualquer usuário autenticado (`get_current_user`).
- **BFF:** `src/app/api/documentacao/content/route.ts` — proxy GET.
- **`page.tsx`:** remove todo conteúdo de metodologia fixo do JSX; busca API e renderiza genericamente. Chrome estático: hero, índice lateral, ícones/cores por seção, botão Exportar PDF. Seção 4 simplificada para bloco `<pre>` monoespaçado (decisão validada — sincronismo > estética colorida).

**Garantia:** página e PDF leem a **mesma função** — divergência de conteúdo é impossível por construção.

---

## Definition of Done (DoD) — Etapa 5

- [x] Seção 2 (Marco Normativo) inclui a metodologia de rateio interno.
- [x] Seção 3 (Módulos) documenta: Rateio Interno, Composição de Vínculo, Histórico de Alterações de Parâmetros, Simulação de Realocação, Histórico de Simulações, Sincronização Folha/RH, Exportação de PDF.
- [x] Seção 4 (Fórmulas) inclui a fórmula da cota-alvo do rateio interno.
- [x] `get_documento_sections()` é a única fonte de conteúdo, consumida tanto por `documentacao_pdf.py` quanto pelo endpoint `GET /api/documentacao/content`.
- [x] `page.tsx` não tem mais texto de conteúdo de metodologia fixo no JSX (só chrome de layout) — tudo vem da API.
- [x] PDF gerado a partir do conteúdo atualizado, testado manualmente.
- [x] Suíte de 23 testes existentes continua passando.

---

## Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.6.0-etapa5 | 2026-08-19 | Fonte única de conteúdo (`get_documento_sections` + `GET /documentacao/content`); página dinâmica; PDF com chave `modulos`; documentação das Etapas 3 e 4 (rateio, realocação, histórico simulações, composição vínculo, sync Folha/RH, histórico parâmetros, Fórmula 09). |
