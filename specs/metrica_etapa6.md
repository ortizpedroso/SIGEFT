# Spec: Métrica — Etapa 6 (Fórmulas Intuitivas + Capacitação por Perfil)

**Arquivo:** `specs/metrica_etapa6.md`
**Versão:** 1.7.0-etapa6
**Data:** 2026-08-19
**Comandos:** `/build` lê e implementa; `/review` compara e valida lacunas contra este arquivo.
**Base:** `specs/metrica_etapa5.md` permanece válida para tudo não listado aqui.

---

## Objetivo da Versão

Tornar a documentação técnica mais intuitiva (fórmulas com explicação lado a lado, exemplos passo a passo) e adicionar uma página de capacitação operacional por perfil de usuário, reforçando o **Pilar 3 (Capacitação Continuada)** do edital do 5º Prêmio de Inovação do TJRR.

Esta etapa altera **somente conteúdo textual da documentação**, renderização da página `/documentacao`, geração do PDF, nova página `/capacitacao` e item de menu. Nenhuma regra de negócio, endpoint funcional ou cálculo do sistema foi modificado.

---

## O que mudou (conteúdo)

### Seção 4 — Fórmulas Matemáticas

Chave `"equations"` (lista plana de strings monoespaçadas) substituída por **`formulas`**: lista de objetos estruturados:

```python
{
    "titulo": "Fórmula NN — ...",
    "explicacao": "Texto em linguagem simples...",
    "formula": ["linha 1", "linha 2", ...],
}
```

9 fórmulas (01–09) mantêm a mesma notação matemática, agora acompanhadas de explicação contextual.

### Seção 5 — Exemplos Práticos

Chave `"paragraphs"` substituída por **`exemplos`**: lista de objetos estruturados:

```python
{
    "titulo": "Exemplo NN — ...",
    "contexto": "Cenário de partida...",
    "passos": ["passo 1", "passo 2", ...],
    "resultado": "Conclusão destacada...",
}
```

2 exemplos práticos (Vara Cível e Fallback Mediana) reescritos passo a passo.

### Página `/capacitacao`

Conteúdo operacional definido no front-end (`src/app/capacitacao/page.tsx`), **sem endpoint backend**. Estrutura:

- Seletor de perfil (Gestor, Executor, Apoio Exclusivo)
- Guia por módulo acessível a cada perfil (conforme mapa de permissões conferido no código)
- Seção FAQ (campos bloqueados, selos Déficit/Ideal/Excesso, falha sync Folha/RH, Simulação vs. ação real)

Item **Capacitação** adicionado ao menu principal (`Navbar.tsx`, ícone `GraduationCap`).

---

## O que mudou (arquitetura)

### Fonte única estendida: `get_documento_sections()`

| Chave | Uso |
|-------|-----|
| `paragraphs` | Seções 1, 2, 6, 7 (inalteradas) |
| `modulos` | Seção 3 (inalterada) |
| **`formulas`** | Seção 4 — objetos `{ titulo, explicacao, formula[] }` |
| **`exemplos`** | Seção 5 — objetos `{ titulo, contexto, passos[], resultado }` |

Chave `equations` **removida**.

### Consumidores atualizados

- **`documentacao_pdf.py`:** renderiza `formulas` (título negrito → explicação → notação monoespaçada empilhada) e `exemplos` (título → contexto → passos numerados → resultado). Helper `_pdf_mono_line` quebra tokens longos; `_pdf_write_block` garante margem esquerda (corrige fpdf2 após quebras internas).
- **`page.tsx`:** cartões duas colunas para fórmulas (explicação | monoespaçado); cartões passo a passo para exemplos (contexto, lista numerada, resultado destacado). Chaves `paragraphs` e `modulos` inalteradas.

### Página `/capacitacao`

Independente da fonte única — conteúdo operacional estático no front-end.

---

## Mapa de permissões (capacitação)

| Módulo | Gestor | Executor | Apoio Exclusivo |
|--------|--------|----------|-----------------|
| Dashboard | Leitura | Leitura | Leitura |
| Unidades | Leitura + Cadastro/Edição | Leitura | Leitura |
| Entregas | Leitura + Cadastro | Leitura | Leitura |
| Ponderação | Leitura + Edição + Histórico | Leitura | Leitura |
| Esforços | Leitura + Lançamento | Leitura + Lançamento | Sem escrita (403) |
| Simulação | Leitura + Simular + Histórico | Leitura | Leitura |
| Instrução SEI | Leitura + Gerar/Editar | Leitura | Leitura |
| Integração | Leitura + Configurar + Sync | Leitura | Leitura |
| Documentação | Leitura + Export PDF | Leitura | Leitura |

---

## Definition of Done (DoD) — Etapa 6

- [x] Seção 4 (Fórmulas) usa a chave `formulas` estruturada, renderizada lado a lado na página.
- [x] Seção 5 (Exemplos) usa a chave `exemplos` estruturada, renderizada passo a passo.
- [x] PDF atualizado para as duas novas chaves, testado manualmente.
- [x] Página `/capacitacao` criada, cobrindo os 3 perfis conforme a tabela de permissões.
- [x] Item no menu principal adicionado.
- [x] FAQ presente na página de capacitação.

---

## Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.7.0-etapa6 | 2026-08-19 | Fórmulas estruturadas (`formulas`) com explicação lado a lado; exemplos passo a passo (`exemplos`); página `/capacitacao` por perfil + FAQ; PDF e página atualizados; item Capacitação no menu. |
