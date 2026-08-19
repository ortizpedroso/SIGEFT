"""Conteúdo textual da metodologia — fonte única para página /documentacao e PDF."""

from datetime import datetime


def get_documento_sections() -> list[dict]:
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
                "Metodologia de Rateio Interno do Teto de 30%: para cada unidade de apoio indireto, a cota-alvo "
                "percentual é proporcional à sua Lotação Ideal em relação à soma das Lotações Ideais de todas as "
                "unidades de apoio indireto, multiplicada pelo teto global (30%). O percentual real de servidores "
                "da unidade sobre o total do Tribunal é comparado à cota; o desvio é classificado como acima_da_cota, "
                "abaixo_da_cota ou dentro_da_cota conforme a Tolerância de Desvio (TOLERANCIA_DESVIO) configurada "
                "no motor de ponderação. Endpoint: GET /api/dashboard/rateio-indireto.",
            ],
        },
        {
            "title": "3. Módulos e Funcionalidades do Sistema",
            "modulos": [
                {
                    "icone": "PieChart",
                    "titulo": "Dashboard Executivo",
                    "rota": "/",
                    "descricao": (
                        "Visão macro dos indicadores operacionais do Tribunal. Exibe cartões de consolidação de "
                        "unidades, total de esforço mensal, barra de conformidade do teto do CNJ (30%), alerta "
                        "visual de cor dinâmica (Verde ≤ 30%, Vermelho > 30%) e gráficos Recharts interativos. "
                        "Inclui o card de Rateio Interno do teto de 30%: composição proporcional por unidade de "
                        "apoio indireto, com cota-alvo, percentual real e classificação de desvio (acima/abaixo/"
                        "dentro da cota)."
                    ),
                },
                {
                    "icone": "Users",
                    "titulo": "Gestão de Unidades",
                    "rota": "/unidades",
                    "descricao": (
                        "Mapeamento de secretarias, varas e coordenadorias. Classifica Apoio Direto vs. Apoio "
                        "Indireto, calcula Lotação Ideal Paradigmática e selos de diagnóstico (Déficit, Lotação "
                        "Ideal ou Excesso). Exibe composição de vínculo funcional (efetivo, cargo em comissão, "
                        "função de confiança) quando houver servidores sincronizados via Folha/RH; caso contrário, "
                        "mostra o estado Aguardando sincronização com Folha/RH."
                    ),
                },
                {
                    "icone": "FileText",
                    "titulo": "Entregas & Capacidades",
                    "rota": "/entregas",
                    "descricao": (
                        "Cadastramento de produtos, serviços e processos por unidade. Registra fonte normativa, "
                        "carga horária média, volume mensal, complexidade, criticidade, absenteísmo e rotatividade, "
                        "calculando a Capacidade Produtiva Necessária."
                    ),
                },
                {
                    "icone": "Settings",
                    "titulo": "Motor de Ponderação",
                    "rota": "/ponderacao",
                    "descricao": (
                        "Calibração dos pesos de volume, complexidade, criticidade e tolerância de desvio normativo "
                        "(TOLERANCIA_DESVIO, padrão 20% do CNJ 553/2024). Inclui Histórico de Alterações: registro "
                        "auditável de quem alterou cada peso, quando, e de qual valor para qual valor "
                        "(GET /api/parametros/historico)."
                    ),
                },
                {
                    "icone": "BarChart3",
                    "titulo": "Alocação de Esforço",
                    "rota": "/esforcos",
                    "descricao": (
                        "Registro individual da jornada mensal dos servidores. Distribui percentual por entrega com "
                        "trava em 100% no mês e restrição por perfil apoio_exclusivo."
                    ),
                },
                {
                    "icone": "Calculator",
                    "titulo": "Simulação e Auditoria",
                    "rota": "/simulacao",
                    "descricao": (
                        "Três recursos: (1) Simulação Q3/Mediana por Categoria Transversal MGI; (2) Simulação de "
                        "Realocação (POST /api/simulacao/realocacao) — testa hipóteses de mover servidores entre "
                        "unidades e ver o impacto no dimensionamento antes de executar, sem persistir alterações; "
                        "(3) Histórico de Simulações (GET /api/simulacao/historico) — registro auditável com "
                        "Ver detalhes em texto legível."
                    ),
                },
                {
                    "icone": "FileText",
                    "titulo": "Minutas SEI & Pareceres Técnicos",
                    "rota": "/relatorios-sei",
                    "descricao": (
                        "Geração automatizada de minutas embasadas (CNJ 219/2016, CNJ 553/2024 e DFT/MGI). "
                        "Modal Instruir Novo Processo SEI com opção Todas as unidades (parecer consolidado)."
                    ),
                },
                {
                    "icone": "Link2",
                    "titulo": "Integração",
                    "rota": "/integracao",
                    "descricao": (
                        "Configuração de URL sandbox e chave de API. Verifica canais locais e sandboxes (SEI, "
                        "Folha/RH, organograma, SSO). O conector Folha/RH possui botão Sincronizar agora "
                        "(POST /api/integracao/sincronizar-folha), que traz o quantitativo real de servidores "
                        "com vínculo funcional (efetivo, cargo em comissão, função de confiança) via upsert "
                        "por matrícula."
                    ),
                },
                {
                    "icone": "Download",
                    "titulo": "Exportação de Metodologia (PDF)",
                    "rota": "/documentacao",
                    "descricao": (
                        "Gestores podem exportar este documento em PDF (GET /api/documentacao/pdf) para "
                        "homologação institucional pela SGP/Presidência. O PDF é gerado a partir da mesma fonte "
                        "de conteúdo desta página."
                    ),
                },
            ],
        },
        {
            "title": "4. Fórmulas Matemáticas e Justificativas Técnicas",
            "formulas": [
                {
                    "titulo": "Fórmula 01 — Lotação Ideal Paradigmática (L_ideal)",
                    "explicacao": (
                        "Estima quantos servidores a unidade deveria ter com base na produtividade (IPS) "
                        "e na quantidade de entregas cadastradas. Unidades com mais entregas recebem um "
                        "multiplicador proporcional; o resultado mínimo é 1 servidor."
                    ),
                    "formula": [
                        "Base = (IPS_unidade / 80) × 3",
                        "Multiplicador_Entregas = 1 + (N_entregas × 0.25)",
                        "L_ideal = max(1, round(Base × Multiplicador_Entregas))",
                    ],
                },
                {
                    "titulo": "Fórmula 02 — Balanço de Lotação e Desvio Percentual",
                    "explicacao": (
                        "Compara a lotação real com a ideal. O balanço indica quantos servidores faltam "
                        "ou sobram; o desvio percentual expressa essa diferença em relação à lotação ideal. "
                        "O sistema classifica o resultado em Déficit, Ideal ou Excesso."
                    ),
                    "formula": [
                        "Balanço = Servidores_Atuais - L_ideal",
                        "Desvio_% = ((Servidores_Atuais - L_ideal) / L_ideal) × 100",
                        "Classificação: Balanço < 0 → Déficit; Balanço = 0 → Ideal; Balanço > 0 → Excesso",
                    ],
                },
                {
                    "titulo": "Fórmula 03 — Percentual de Esforço em Apoio Indireto (CNJ 219)",
                    "explicacao": (
                        "Mede quanto do esforço total do Tribunal está alocado em unidades de apoio indireto "
                        "(atividade-meio). A Resolução CNJ nº 219/2016 estabelece teto máximo de 30%; "
                        "valores acima disparam alerta normativo no dashboard."
                    ),
                    "formula": [
                        "P_indireto = (Esforço_Apoio_Indireto / Esforço_Total_Tribunal) × 100",
                        "Gatilho de Alerta Normativo: P_indireto > 30.0%",
                    ],
                },
                {
                    "titulo": "Fórmula 04 — Capacidade Produtiva Necessária",
                    "explicacao": (
                        "Calcula o esforço bruto de uma entrega (carga horária × volume mensal) e ajusta "
                        "por perdas operacionais: absenteísmo e rotatividade aumentam a capacidade necessária "
                        "para manter o mesmo nível de serviço."
                    ),
                    "formula": [
                        "C_bruta = Carga_Horária_Média (h) × Volume_Mensal (qtd)",
                        "C_produtiva = C_bruta × (1 + (Absenteísmo_% + Rotatividade_%) / 100)",
                    ],
                },
                {
                    "titulo": "Fórmula 05 — Índice de Ponderação Multidimensional",
                    "explicacao": (
                        "Combina volume, complexidade e criticidade de cada entrega em um índice único, "
                        "usando pesos configuráveis no Motor de Ponderação. A soma dos pesos deve ser 1,0; "
                        "os valores padrão são 40% volume, 35% complexidade e 25% criticidade."
                    ),
                    "formula": [
                        "I_ponderado = ((Volume/100) × W_V) + ((Complexidade/5) × W_C) + ((Criticidade/5) × W_R)",
                        "Onde: W_V + W_C + W_R = 1.0 (W_V = 0.40, W_C = 0.35, W_R = 0.25)",
                    ],
                },
                {
                    "titulo": "Fórmula 06 — Terceiro Quartil Benchmark MGI (Q3 - 75%)",
                    "explicacao": (
                        "O terceiro quartil (percentil 75) de uma amostra de IPS por categoria MGI serve "
                        "como referência de alta produtividade. Usa interpolação linear entre os valores "
                        "adjacentes quando a posição calculada não é inteira."
                    ),
                    "formula": [
                        "Posição k = ((n - 1) × 75) / 100",
                        "Q3 = x_piso + (k - floor(k)) × (x_teto - x_piso)",
                    ],
                },
                {
                    "titulo": "Fórmula 07 — Gatilho de Fallback com a Mediana (50%)",
                    "explicacao": (
                        "Na simulação Q3/Mediana, quando a redução projetada ultrapassa 30%, o sistema "
                        "troca automaticamente o benchmark de Q3 (75%) para a Mediana (50%), evitando "
                        "metas excessivamente agressivas em cenários de corte severo."
                    ),
                    "formula": [
                        "Estratégia = Se (Redução_% > 30.0%) então Mediana (50%) senão Q3 (75%)",
                    ],
                },
                {
                    "titulo": "Fórmula 08 — Validação do Teto Mensal de Esforço",
                    "explicacao": (
                        "Garante que a soma dos percentuais de esforço de um servidor em um mês não "
                        "ultrapasse 100%. Se a validação falhar, a API rejeita o lançamento com "
                        "HTTP 400 Bad Request."
                    ),
                    "formula": [
                        "Soma_Esforço_Mensal = Σ Esforço_Entrega_i ≤ 100.0%",
                        "Se Soma > 100.0% ⇒ HTTP 400 Bad Request",
                    ],
                },
                {
                    "titulo": "Fórmula 09 — Cota-Alvo do Rateio Interno (Apoio Indireto)",
                    "explicacao": (
                        "Distribui proporcionalmente o teto global de 30% entre unidades de apoio indireto, "
                        "com base na Lotação Ideal de cada uma. Compara a cota-alvo com o percentual real "
                        "de servidores e classifica o desvio conforme a Tolerância de Desvio configurada."
                    ),
                    "formula": [
                        "Cota_Alvo_% = Teto_Global × (L_ideal_unidade / Σ L_ideal_indiretas)",
                        "Percentual_Real_% = (Servidores_unidade / Servidores_total_Tribunal) × 100",
                        "Desvio_% = Percentual_Real_% - Cota_Alvo_%",
                        "Classificação: Desvio > Tolerância → acima_da_cota",
                        "             Desvio < -Tolerância → abaixo_da_cota",
                        "             Caso contrário → dentro_da_cota",
                    ],
                },
            ],
        },
        {
            "title": "5. Exemplos Práticos de Cálculo Passo a Passo",
            "exemplos": [
                {
                    "titulo": "Exemplo 01 — 1ª Vara Cível da Comarca de Boa Vista (Apoio Direto)",
                    "contexto": (
                        "Unidade de apoio direto com IPS = 88,0, 2 entregas cadastradas e 4 servidores "
                        "atualmente alocados. Objetivo: calcular a Lotação Ideal e diagnosticar déficit ou excesso."
                    ),
                    "passos": [
                        "Calcular a Base: (88 / 80) × 3 = 3,30.",
                        "Calcular o Multiplicador de Entregas: 1 + (2 × 0,25) = 1,50.",
                        "Aplicar a Fórmula 01: L_ideal = round(3,30 × 1,50) = 5 servidores.",
                        "Calcular o Balanço: 4 servidores atuais − 5 ideais = −1.",
                        "Interpretar: Déficit de 1 servidor (−20% em relação à lotação ideal).",
                    ],
                    "resultado": (
                        "A 1ª Vara Cível deveria ter 5 servidores, mas possui 4 — diagnóstico de "
                        "Déficit (−1 servidor, −20%)."
                    ),
                },
                {
                    "titulo": "Exemplo 02 — Simulação com Fallback Mediana (Corte de 35%)",
                    "contexto": (
                        "Simulação Q3/Mediana para a categoria TI, com redução projetada de 35% "
                        "(acima do limiar de 30%). Amostra de IPS: [75, 82, 88, 91, 95]."
                    ),
                    "passos": [
                        "Verificar o gatilho de fallback: redução de 35% > 30% → acionar Mediana.",
                        "Calcular Q3 (referência): posição k = ((5−1) × 75) / 100 = 3,0 → Q3 = 91,0.",
                        "Calcular Mediana (referência): valor central da amostra ordenada → 88,0.",
                        "Aplicar a Fórmula 07: estratégia chaveada para Mediana (50%) em vez de Q3 (75%).",
                    ],
                    "resultado": (
                        "Como a redução supera 30%, o benchmark adotado é a Mediana (88,0), "
                        "não o Q3 (91,0), evitando meta excessivamente agressiva."
                    ),
                },
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
        "rodape": "SIGEP-Força | TJRR · SUBGFT",
    }
