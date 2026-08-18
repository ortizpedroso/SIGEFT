"""Conteúdo textual da metodologia (espelhado da página /documentacao)."""

from datetime import datetime


def get_documento_sections() -> list[dict[str, str | list[str]]]:
    return [
        {
            "title": "1. Visão Geral e Objetivo do Sistema",
            "paragraphs": [
                "O Métrica — Dimensionamento da Força de Trabalho (SIGEP-Força) é a solução tecnológica corporativa "
                "desenvolvida para a Subgestão da Força de Trabalho (SUBGFT) do Tribunal de Justiça do Estado de "
                "Roraima (TJRR).",
                "O objetivo central do sistema é calcular de forma automatizada, científica e auditável o quadro de "
                "pessoal paradigmático (Lotação Ideal) de todas as unidades judiciais e administrativas do Tribunal, "
                "integrando o modelo qualitativo/quantitativo do Ministério da Gestão e da Inovação em Serviços "
                "Públicos (MGI / UnB) com as diretrizes regulatórias e gatilhos da Resolução CNJ nº 219/2016.",
                "Dimensionamento Realista: elimina o empirismo na distribuição de vagas e cria diagnósticos claros "
                "de déficit ou excesso.",
                "Equilíbrio da Força de Trabalho: monitora o cumprimento contínuo do teto de 30% em atividades de "
                "apoio indireto (atividades-meio).",
                "Instrução SEI Automatizada: gera pareceres técnicos formais prontos para instruir processos "
                "administrativos no SEI.",
            ],
        },
        {
            "title": "2. Marco Normativo e Diretrizes Metodológicas",
            "paragraphs": [
                "Resolução CNJ nº 219/2016 e Resolução CNJ nº 553/2024: dispõe sobre a distribuição de cargos de "
                "provimento efetivo, de funções de confiança e de cargos em comissão nos órgãos do Poder Judiciário "
                "de primeiro e segundo graus. A norma estabelece a obrigatoriedade de alocar a força de trabalho "
                "proporcionalmente à demanda processual, impondo o limite máximo de 30% de alocação de pessoal nas "
                "unidades de apoio indireto (atividades-meio), assegurando no mínimo 70% na atividade-fim (apoio direto).",
                "Modelo de Dimensionamento de Pessoal MGI (Ministério da Gestão / UnB): metodologia de gestão pública "
                "baseada na análise de entregas, produtos e capacidades operacionais. Avalia o tempo necessário para "
                "executar cada entrega, considerando o volume mensal, os níveis de complexidade e criticidade, além dos "
                "fatores contingenciais de absenteísmo e rotatividade (turnover).",
            ],
        },
        {
            "title": "3. Módulos e Funcionalidades do Sistema",
            "paragraphs": [
                "Dashboard Executivo (/): visão macro dos indicadores operacionais do Tribunal. Exibe cartões de "
                "consolidação de unidades, total de esforço mensal, barra de conformidade do teto do CNJ (30%), alerta "
                "visual de cor dinâmica (Verde ≤ 30%, Vermelho > 30%) e gráficos Recharts interativos.",
                "Gestão de Unidades (/unidades): mapeamento de secretarias, varas e coordenadorias. Classifica Apoio "
                "Direto vs. Apoio Indireto, calcula Lotação Ideal Paradigmática e selos de diagnóstico.",
                "Entregas & Capacidades (/entregas): cadastramento de produtos, serviços e processos por unidade.",
                "Motor de Ponderação (/ponderacao): calibração dos pesos de volume, complexidade, criticidade e "
                "tolerância de desvio normativo (20% do CNJ 553/2024).",
                "Alocação de Esforço (/esforcos): registro individual da jornada mensal com trava em 100%.",
                "Simulação Q3 / Mediana (/simulacao): análise estatística preditiva por Categoria Transversal MGI.",
                "Minutas SEI & Pareceres Técnicos (/relatorios-sei): geração automatizada de minutas embasadas.",
                "Integração (/integracao): verificação de canais locais e sandboxes (SEI, Folha/RH, organograma, SSO).",
            ],
        },
        {
            "title": "4. Fórmulas Matemáticas e Justificativas Técnicas",
            "equations": [
                "Fórmula 01 — Lotação Ideal Paradigmática (L_ideal):",
                "  Base = (IPS_unidade / 80) × 3",
                "  Multiplicador_Entregas = 1 + (N_entregas × 0.25)",
                "  L_ideal = max(1, round(Base × Multiplicador_Entregas))",
                "",
                "Fórmula 02 — Balanço de Lotação e Desvio Percentual:",
                "  Balanço = Servidores_Atuais - L_ideal",
                "  Desvio_% = ((Servidores_Atuais - L_ideal) / L_ideal) × 100",
                "  Classificação: Balanço < 0 → Déficit; Balanço = 0 → Ideal; Balanço > 0 → Excesso",
                "",
                "Fórmula 03 — Percentual de Esforço em Apoio Indireto (CNJ 219):",
                "  P_indireto = (Esforço_Apoio_Indireto / Esforço_Total_Tribunal) × 100",
                "  Gatilho de Alerta Normativo: P_indireto > 30.0%",
                "",
                "Fórmula 04 — Capacidade Produtiva Necessária:",
                "  C_bruta = Carga_Horária_Média (h) × Volume_Mensal (qtd)",
                "  C_produtiva = C_bruta × (1 + (Absenteísmo_% + Rotatividade_%) / 100)",
                "",
                "Fórmula 05 — Índice de Ponderação Multidimensional:",
                "  I_ponderado = ((Volume/100) × W_V) + ((Complexidade/5) × W_C) + ((Criticidade/5) × W_R)",
                "  Onde: W_V + W_C + W_R = 1.0 (W_V = 0.40, W_C = 0.35, W_R = 0.25)",
                "",
                "Fórmula 06 — Terceiro Quartil Benchmark MGI (Q3 - 75%):",
                "  Posição k = ((n - 1) × 75) / 100",
                "  Q3 = x_piso + (k - floor(k)) × (x_teto - x_piso)",
                "",
                "Fórmula 07 — Gatilho de Fallback com a Mediana (50%):",
                "  Estratégia = Se (Redução_% > 30.0%) então Mediana (50%) senão Q3 (75%)",
                "",
                "Fórmula 08 — Validação do Teto Mensal de Esforço:",
                "  Soma_Esforço_Mensal = Σ Esforço_Entrega_i ≤ 100.0%",
                "  Se Soma > 100.0% ⇒ HTTP 400 Bad Request",
            ],
        },
        {
            "title": "5. Exemplos Práticos de Cálculo Passo a Passo",
            "paragraphs": [
                "Exemplo 01 — 1ª Vara Cível da Comarca de Boa Vista (Apoio Direto): IPS = 88.0, 2 entregas, "
                "4 servidores atuais. Base = (88/80) × 3 = 3.30. Multiplicador = 1 + (2 × 0.25) = 1.50. "
                "L_ideal = round(3.30 × 1.50) = 5. Balanço = 4 - 5 = -1 (Déficit de 1 servidor, -20%).",
                "Exemplo 02 — Simulação com Fallback Mediana (Corte de 35%): Categoria TI, redução 35% > 30%. "
                "Amostra IPS [75, 82, 88, 91, 95]. Q3 = 91.0, Mediana = 88.0. Estratégia chaveada para Mediana.",
            ],
        },
        {
            "title": "6. Regras de Negócio, Travas e Códigos de Erro HTTP",
            "paragraphs": [
                "Trava de Teto de Esforço (HTTP 400): POST /api/esforcos rejeita soma > 100% no mês.",
                "Restrição por Perfil DFT (HTTP 403): perfil apoio_exclusivo não pode cadastrar esforços.",
            ],
        },
        {
            "title": "7. Dicionário de Dados e Conceitos Chave",
            "paragraphs": [
                "SUBGFT: Subgestão da Força de Trabalho do TJRR — unidade gestora do sistema.",
                "IPS: Índice de Produtividade do Setor — métrica para calcular Lotação Ideal.",
                "Apoio Direto: unidades de atividade-fim (Varas/Gabinetes) — mínimo 70% da força de trabalho.",
                "Apoio Indireto: unidades administrativas (atividade-meio) — teto máximo 30% (Res. CNJ 219).",
                "Terceiro Quartil (Q3): percentil 75 — meta de alta produtividade.",
                "Mediana (M): percentil 50 — gatilho de fallback em reduções severas (>30%).",
            ],
        },
    ]


def get_cover_info() -> dict[str, str]:
    now = datetime.now()
    return {
        "titulo": "Metodologia de Dimensionamento da Força de Trabalho — TJRR",
        "subtitulo": "Documento Técnico para Homologação — SUBGFT",
        "data_geracao": now.strftime("%d/%m/%Y %H:%M"),
        "rodape": f"Documento gerado automaticamente pelo sistema Métrica em {now.strftime('%d/%m/%Y %H:%M')}",
    }
