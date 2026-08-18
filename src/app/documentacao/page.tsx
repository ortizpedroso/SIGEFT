'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import {
  BookOpen,
  Calculator,
  ShieldCheck,
  Scale,
  Layers,
  PieChart,
  Users,
  CheckCircle2,
  AlertTriangle,
  Settings,
  FileText,
  ListFilter,
  Database,
  Lock,
  BarChart3,
  Briefcase,
  Download,
} from 'lucide-react';

export default function DocumentacaoPage() {
  const [activeSection, setActiveSection] = useState('visao-geral');
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPerfil(getStoredPerfil());
  }, []);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/documentacao/pdf', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metodologia-dimensionamento-tjrr.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Não foi possível exportar o PDF. Verifique se você está autenticado como gestor.');
    } finally {
      setExporting(false);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        {/* Banner de Topo — contraste travado em .doc-hero (claro e escuro) */}
        <div className="doc-hero relative overflow-hidden rounded-2xl border p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="doc-hero-chip doc-hero-chip-blue inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Documentação Oficial TJRR / SUBGFT
              </span>
              <span className="doc-hero-chip doc-hero-chip-amber inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                <Scale className="w-3.5 h-3.5" />
                CNJ 219/2016 &amp; MGI / UnB
              </span>
              <span className="doc-hero-chip doc-hero-chip-green inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                Página Oculta de Referência (`/documentacao`)
              </span>
            </div>

            <h1 className="doc-hero-title text-2xl sm:text-3xl font-black tracking-tight flex items-start gap-3">
              <BookOpen className="doc-hero-icon w-8 h-8 shrink-0 mt-0.5" />
              Documentação Técnica e Metodológica do Sistema Métrica
            </h1>
            <p className="doc-hero-lead w-full text-sm sm:text-base mt-3 leading-relaxed text-justify">
              Manual completo de arquitetura, módulos operacionais, diretrizes normativas da Resolução CNJ nº 219/2016 e formulário analítico de equações matemáticas para o Dimensionamento da Força de Trabalho (SIGEP-Força / TJRR).
            </p>
            {canWriteCadastro(perfil) && (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Gerando PDF...' : 'Exportar Metodologia (PDF)'}
              </button>
            )}
          </div>
        </div>

        {/* Layout Principal: Navegação Lateral + Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Menu Fixo de Índice da Documentação */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md shadow-xl space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 px-3 py-2 border-b border-white/10 mb-2 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-400" />
                Índice de Seções
              </p>

              {[
                { id: 'visao-geral', label: '1. Visão Geral e Objetivo', icon: BookOpen },
                { id: 'marco-normativo', label: '2. Marco Normativo (CNJ/MGI)', icon: Scale },
                { id: 'funcionalidades', label: '3. Módulos e Funcionalidades', icon: Layers },
                { id: 'formulas-matematicas', label: '4. Fórmulas Matemáticas', icon: Calculator },
                { id: 'exemplos-calculo', label: '5. Exemplos de Cálculo Passo a Passo', icon: FileText },
                { id: 'travas-validacoes', label: '6. Regras de Negócio e Travas', icon: Lock },
                { id: 'dicionario-dados', label: '7. Dicionário de Termos', icon: Database },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-9 space-y-10">
            {/* 1. Visão Geral e Objetivo */}
            <section id="visao-geral" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">1. Visão Geral e Objetivo do Sistema</h2>
                  <p className="text-xs text-slate-400">Finalidade institucional do Métrica (SIGEP-Força) no TJRR</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                <p className="text-justify">
                  O <strong className="text-white font-semibold">Métrica — Dimensionamento da Força de Trabalho (SIGEP-Força)</strong> é a solução tecnológica corporativa desenvolvida para a Subgestão da Força de Trabalho (<strong className="text-blue-400">SUBGFT</strong>) do Tribunal de Justiça do Estado de Roraima (<strong className="text-blue-400">TJRR</strong>).
                </p>
                <p className="text-justify">
                  O objetivo central do sistema é calcular de forma automatizada, científica e auditável o <strong className="text-white">quadro de pessoal paradigmático (Lotação Ideal)</strong> de todas as unidades judiciais e administrativas do Tribunal, integrando o modelo qualitativo/quantitativo do Ministério da Gestão e da Inovação em Serviços Públicos (<strong className="text-amber-400">MGI / UnB</strong>) com as diretrizes regulatórias e gatilhos da <strong className="text-amber-400">Resolução CNJ nº 219/2016</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Dimensionamento Realista</p>
                    <p className="text-xs text-slate-300 mt-1 text-justify">
                      Elimina o empirismo na distribuição de vagas e cria diagnósticos claros de déficit ou excesso.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Equilíbrio da Força de Trabalho</p>
                    <p className="text-xs text-slate-300 mt-1 text-justify">
                      Monitora o cumprimento contínuo do teto de 30% em atividades de apoio indireto (atividades-meio).
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Instrução SEI Automatizada</p>
                    <p className="text-xs text-slate-300 mt-1 text-justify">
                      Gera pareceres técnicos formais prontos para instruir processos administrativos no SEI.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Marco Normativo (CNJ / MGI) */}
            <section id="marco-normativo" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">2. Marco Normativo e Diretrizes Metodológicas</h2>
                  <p className="text-xs text-slate-400">Fundamentação jurídica e conceitual do sistema</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3">
                  <h3 className="font-bold text-amber-300 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    Resolução CNJ nº 219/2016 e Resolução CNJ nº 553/2024
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Dispõe sobre a distribuição de cargos de provimento efetivo, de funções de confiança e de cargos em comissão nos órgãos do Poder Judiciário de primeiro e segundo graus. A norma estabelece a obrigatoriedade de alocar a força de trabalho proporcionalmente à demanda processual, impondo o limite máximo de <strong className="text-amber-300 font-bold">30% de alocação de pessoal nas unidades de apoio indireto (atividades-meio)</strong>, assegurando no mínimo <strong className="text-emerald-300 font-bold">70% na atividade-fim (apoio direto)</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-3">
                  <h3 className="font-bold text-blue-300 text-base flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400 shrink-0" />
                    Modelo de Dimensionamento de Pessoal MGI (Ministério da Gestão / UnB)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Metodologia de gestão pública baseada na análise de entregas, produtos e capacidades operacionais. Avalia o tempo necessário para executar cada entrega, considerando o volume mensal, os níveis de complexidade e criticidade, além dos fatores contingenciais de <strong className="text-blue-200">absenteísmo</strong> e <strong className="text-blue-200">rotatividade (turnover)</strong>.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Módulos e Funcionalidades do Sistema */}
            <section id="funcionalidades" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">3. Módulos e Funcionalidades do Sistema</h2>
                  <p className="text-xs text-slate-400">Detalhamento operacional de todas as páginas da aplicação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Módulo 1 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <PieChart className="w-4 h-4" />
                    <span>Dashboard Executivo (`/`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Visão macro dos indicadores operacionais do Tribunal. Exibe cartões de consolidação de unidades, total de esforço mensal, barra de conformidade do teto do CNJ (30%), alerta visual de cor dinâmica (Verde &le; 30%, Vermelho &gt; 30%) e gráficos Recharts interativos de Lotação Real vs. Ideal, IPS Médio vs. Benchmark Q3 e Distribuição por Perfil DFT.
                  </p>
                </div>

                {/* Módulo 2 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <Users className="w-4 h-4" />
                    <span>Gestão de Unidades (`/unidades`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Mapeamento de todas as secretarias, varas e coordenadorias. Classifica as unidades em Apoio Direto vs. Apoio Indireto, calcula automaticamente a Lotação Ideal Paradigmática, gera os selos de diagnóstico (Déficit, Lotação Ideal ou Excesso) e permite a edição dinâmica dos índices de produtividade (IPS) e vínculos com categorias MGI. No campo Categoria MGI o gestor cadastra uma nova categoria (nome + IPS) sem sair do formulário.
                  </p>
                </div>

                {/* Módulo 3 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Entregas &amp; Capacidades (`/entregas`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Cadastramento dos produtos, serviços e processos executados por cada unidade. Registra a fonte normativa regulamentadora, carga horária média por entrega, volume mensal esperado, escala de complexidade (1-5), criticidade (1-5) e percentuais de absenteísmo e rotatividade, calculando a Capacidade Produtiva Necessária em horas/mês.
                  </p>
                </div>

                {/* Módulo 4 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <Settings className="w-4 h-4" />
                    <span>Motor de Ponderação (`/ponderacao`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Painel de calibração científica dos pesos de ponderação do portfólio de entregas. Permite ajustar interativamente o Peso do Volume, Peso da Complexidade, Peso da Criticidade e a Tolerância de Desvio Normativo (20% do CNJ 553/2024), aplicando reponderação instantânea a todo o acervo.
                  </p>
                </div>

                {/* Módulo 5 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <BarChart3 className="w-4 h-4" />
                    <span>Alocação de Esforço (`/esforcos`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Módulo de registro individual da jornada de trabalho mensal dos servidores. Permite distribuir o esforço em percentual por entrega com validação rígida de trava em 100% no mês e restrição por perfil de atuação (`apoio_exclusivo`).
                  </p>
                </div>

                {/* Módulo 6 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <Calculator className="w-4 h-4" />
                    <span>Simulação Q3 / Mediana (`/simulacao`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Ferramenta de análise estatística preditiva de pessoal por Categoria Transversal MGI. Calcula o Terceiro Quartil (Q3) como meta de alta produtividade e aciona automaticamente o gatilho de segurança com a Mediana (50%) caso a redução solicitada ultrapasse 30%. O campo Categoria MGI também permite cadastrar uma nova categoria.
                  </p>
                </div>

                {/* Módulo 7 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Minutas SEI &amp; Pareceres Técnicos (`/relatorios-sei`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Geração automatizada de minutas embasadas e circunstanciadas (CNJ 219/2016, CNJ 553/2024 e DFT/MGI). O modal Instruir Novo Processo SEI inclui a opção Todas as unidades (parecer consolidado). O gestor pode editar a minuta e salvar a edição.
                  </p>
                </div>

                {/* Módulo 8 */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Integração (`/integracao`)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Campo único de URL da API + chave. Ao salvar, o sistema verifica os canais locais e os sandboxes (SEI, Folha/RH, organograma, SSO). Sucesso mostra OK em verde; falha mostra Problema em vermelho com o texto do erro. A Instrução SEI (`/relatorios-sei`) permanece o módulo de minutas.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Fórmulas Matemáticas e Justificativas Técnicas */}
            <section id="formulas-matematicas" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-8">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">4. Fórmulas Matemáticas e Justificativas Técnicas</h2>
                  <p className="text-xs text-slate-400">Modelagem matemática e equações de dimensionamento do sistema</p>
                </div>
              </div>

              {/* Lista de Fórmulas com Cartões de Detalhamento */}
              <div className="space-y-8">
                {/* FÓRMULA 1 */}
                <div className="rounded-xl border border-blue-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      Fórmula 01
                    </span>
                    <h3 className="text-base font-bold text-white">Lotação Ideal Paradigmática da Unidade (L_ideal)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/20 text-center font-mono text-xs sm:text-sm text-blue-300 space-y-2">
                    <div>Base = ( IPS_unidade / 80 ) &times; 3</div>
                    <div>Multiplicador_Entregas = 1 + ( N_entregas &times; 0.25 )</div>
                    <div className="font-bold text-blue-200">L_ideal = max( 1, round( Base &times; Multiplicador_Entregas ) )</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Definição das Variáveis:</p>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        <li><strong className="text-white">IPS:</strong> Índice de Produtividade do Setor (base de referência 80 pontos).</li>
                        <li><strong className="text-white">3:</strong> Tamanho padrão paradigmático de equipe mínima de referência.</li>
                        <li><strong className="text-white">N_entregas:</strong> Quantidade de entregas/produtos mapeados para a unidade.</li>
                        <li><strong className="text-white">0.25:</strong> Fator de expansão de carga de trabalho por entrega adicional (+25%).</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Esta fórmula calcula a necessidade real de servidores de uma unidade combinando o seu nível de produtividade histórica (IPS) com o tamanho do seu portfólio de serviços executados. Impede que unidades com alta demanda recebam menos servidores do que o necessário e estabelece o número 1 como piso mínimo operacional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 2 */}
                <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Fórmula 02
                    </span>
                    <h3 className="text-base font-bold text-white">Balanço de Lotação e Desvio Percentual (&Delta;L)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/20 text-center font-mono text-xs sm:text-sm text-emerald-300 space-y-2">
                    <div>Balanço = Servidores_Atuais - L_ideal</div>
                    <div className="font-bold text-emerald-200">Desvio_% = ( ( Servidores_Atuais - L_ideal ) / L_ideal ) &times; 100</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Classificação do Diagnóstico:</p>
                      <ul className="space-y-1 text-slate-300">
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <strong className="text-rose-400">Balanço &lt; 0:</strong> Déficit de Pessoal (Unidade subdimensionada).
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <strong className="text-emerald-400">Balanço = 0:</strong> Lotação Ideal / Equilibrada.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <strong className="text-amber-400">Balanço &gt; 0:</strong> Excesso de Pessoal (Unidade superdimensionada).
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Mede quantitativamente a divergência entre a situação real observada na folha de pagamento e o padrão paradigmático calculado. É o indicador primário utilizado nos pareceres técnicos do SEI para fundamentar a necessidade de movimentação de pessoal no Tribunal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 3 */}
                <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      Fórmula 03
                    </span>
                    <h3 className="text-base font-bold text-white">Percentual de Esforço em Apoio Indireto (P_indireto) - CNJ 219</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 text-center font-mono text-xs sm:text-sm text-amber-300 space-y-2">
                    <div>P_indireto = ( Esforço_Apoio_Indireto / Esforço_Total_Tribunal ) &times; 100</div>
                    <div className="font-bold text-rose-300">Gatilho de Alerta Normativo: P_indireto &gt; 30.0%</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Teto Regulatório CNJ 219/2016:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        A Resolução CNJ nº 219/2016 estipula que a força de trabalho alocada na atividade-meio (apoio indireto) não pode ultrapassar <strong className="text-amber-300">30% do total do Tribunal</strong>. Caso o cálculo ultrapasse este valor, o sistema aciona dinamicamente um alerta vermelho de não-conformidade no Dashboard Executivo.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Garante o alinhamento com os órgãos de controle e assegura que pelo menos 70% da força de trabalho do Tribunal de Justiça permaneça focada no atendimento direto ao cidadão e na atividade-fim judiciária (Varas, Juizados e Gabinetes).
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 4 */}
                <div className="rounded-xl border border-blue-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      Fórmula 04
                    </span>
                    <h3 className="text-base font-bold text-white">Capacidade Produtiva Necessária da Entrega (C_produtiva)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/20 text-center font-mono text-xs sm:text-sm text-blue-300 space-y-2">
                    <div>C_bruta = Carga_Horária_Média (h) &times; Volume_Mensal (qtd)</div>
                    <div className="font-bold text-blue-200">C_produtiva = C_bruta &times; ( 1 + ( Absenteísmo_% + Rotatividade_% ) / 100 )</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Fatores Contingenciais MGI:</p>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        <li><strong className="text-white">Absenteísmo (%):</strong> Média de afastamentos, licenças médicas e férias do setor.</li>
                        <li><strong className="text-white">Rotatividade (%):</strong> Média de substituições e desligamentos (turnover).</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Determina a quantidade total de horas de trabalho necessárias por mês para concluir a demanda de cada entrega. O reajuste contingencial por absenteísmo e rotatividade evita planejar a equipe assumindo 100% de presença física ininterrupta, tornando a previsão realista.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 5 */}
                <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Fórmula 05
                    </span>
                    <h3 className="text-base font-bold text-white">Índice de Ponderação Multidimensional (I_ponderado)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/20 text-center font-mono text-xs sm:text-sm text-emerald-300 space-y-2">
                    <div>I_ponderado = ( (Volume / 100) &times; W_V ) + ( (Complexidade / 5) &times; W_C ) + ( (Criticidade / 5) &times; W_R )</div>
                    <div className="font-bold text-emerald-200">Onde: W_V + W_C + W_R = 1.0  ( W_V = 0.40, W_C = 0.35, W_R = 0.25 )</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Pesos do Motor de Ponderação:</p>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        <li><strong className="text-emerald-300">W_V (40%):</strong> Peso relativo atribuído ao volume do processo/serviço.</li>
                        <li><strong className="text-emerald-300">W_C (35%):</strong> Peso atribuído à complexidade técnica da tarefa.</li>
                        <li><strong className="text-emerald-300">W_R (25%):</strong> Peso atribuído à criticidade e risco institucional.</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Atribui um valor científico e comparável para ponderar serviços de naturezas distintas. Impede que tarefas de alto volume, porém simples, sejam equivocadamente tratadas com o mesmo grau de relevância que processos raros, porém de altíssima complexidade e risco.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 6 */}
                <div className="rounded-xl border border-blue-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      Fórmula 06
                    </span>
                    <h3 className="text-base font-bold text-white">Terceiro Quartil Benchmark MGI (Q3 - 75%)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/20 text-center font-mono text-xs sm:text-sm text-blue-300 space-y-2">
                    <div>Posição k = ( ( n - 1 ) &times; 75 ) / 100</div>
                    <div className="font-bold text-blue-200">Q3 = x_piso + ( k - floor(k) ) &times; ( x_teto - x_piso )</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Método de Interpolação:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Utiliza a fórmula de percentil exata adotada pela biblioteca científica <code className="text-blue-300">numpy.percentile(arr, 75)</code>, garantindo precisão matemática mesmo para amostras pequenas ou com números ímpares de unidades.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        O modelo MGI adota o 3º Quartil (75%) como a meta de alta produtividade. Representa o patamar alcançado pelos 25% melhores setores paradigmáticos, incentivando a eficiência sem estipular metas inalcançáveis baseadas no valor máximo absoluto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 7 */}
                <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      Fórmula 07
                    </span>
                    <h3 className="text-base font-bold text-white">Gatilho de Fallback com a Mediana (50%)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/20 text-center font-mono text-xs sm:text-sm text-amber-300 space-y-2">
                    <div>Estratégia = Se ( Redução_% &gt; 30.0% ) então Mediana (50%) senão Q3 (75%)</div>
                    <div className="font-bold text-amber-200">Mediana (M) = Percentil 50 da Amostra MGI</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Trava de Segurança Operacional:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Se em um cenário de simulação for solicitada uma redução no quadro de pessoal superior a 30%, o sistema chaveia automaticamente da meta Q3 para a Mediana (50%).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Protege o funcionamento das unidades em momentos de contingenciamento severo de pessoal. Exigir metas do 3º Quartil durante um corte massivo inviabilizaria o funcionamento da unidade; o fallback para a Mediana preserva a viabilidade operacional e a entrega de serviços essenciais.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FÓRMULA 8 */}
                <div className="rounded-xl border border-rose-500/30 bg-slate-950/80 p-6 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      Fórmula 08
                    </span>
                    <h3 className="text-base font-bold text-white">Validação do Teto Mensal de Esforço do Servidor (&sum; Esforço &le; 100%)</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/20 text-center font-mono text-xs sm:text-sm text-rose-300 space-y-2">
                    <div>Soma_Esforço_Mensal = &sum; Esforço_Entrega_i &le; 100.0%</div>
                    <div className="font-bold text-rose-200">Se Soma &gt; 100.0% &rArr; HTTP 400 Bad Request</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Regra de Validação:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Valida o percentual de esforço alocado pelo servidor no mês informado. O sistema intercepta o envio no backend e rejeita qualquer tentativa de cadastrar alocações acumuladas que ultrapassem a carga horária física real.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-200">Justificativa da Fórmula:</p>
                      <p className="text-slate-300 leading-relaxed text-justify">
                        Garante a veracidade e a integridade matemática dos dados do sistema. Nenhum servidor pode trabalhar mais de 100% do seu expediente mensal, prevenindo dados duplicados ou inflacionados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Exemplos Práticos de Cálculo Passo a Passo */}
            <section id="exemplos-calculo" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">5. Exemplos Práticos de Cálculo Passo a Passo</h2>
                  <p className="text-xs text-slate-400">Simulação numérica completa aplicável às unidades do TJRR</p>
                </div>
              </div>

              {/* Exemplo 1 */}
              <div className="rounded-xl border border-blue-500/30 bg-slate-950/90 p-6 space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    Exemplo 01: Dimensionamento da 1ª Vara Cível da Comarca de Boa Vista
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    Apoio Direto
                  </span>
                </div>

                <div className="text-xs text-slate-200 space-y-4 leading-relaxed">
                  {/* Cartão de Parâmetros de Entrada com Alto Contraste */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-inner">
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">IPS da Unidade:</span>
                      <strong className="text-white text-base font-bold">88.0 pontos</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">Entregas Mapeadas:</span>
                      <strong className="text-white text-base font-bold">2 entregas</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">Servidores Atuais na Folha:</span>
                      <strong className="text-white text-base font-bold">4 servidores</strong>
                    </div>
                  </div>

                  <p className="font-bold text-slate-100 text-sm">Passo a Passo dos Cálculos:</p>
                  <ol className="list-decimal list-inside space-y-3 text-slate-200 pl-1">
                    <li className="space-y-1">
                      <strong className="text-slate-100">Cálculo da Carga Base:</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30 font-mono text-blue-200 text-xs sm:text-sm my-1">
                        Base = (88.0 / 80) &times; 3 = 1.10 &times; 3 = <span className="font-bold text-blue-300">3.30</span>
                      </div>
                    </li>
                    <li className="space-y-1">
                      <strong className="text-slate-100">Cálculo do Multiplicador de Entregas:</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30 font-mono text-blue-200 text-xs sm:text-sm my-1">
                        Multiplicador = 1 + (2 &times; 0.25) = 1 + 0.50 = <span className="font-bold text-blue-300">1.50</span>
                      </div>
                    </li>
                    <li className="space-y-1">
                      <strong className="text-slate-100">Cálculo da Lotação Ideal Paradigmática (L_ideal):</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30 font-mono text-blue-200 text-xs sm:text-sm my-1 space-y-1">
                        <div>L_bruta = 3.30 &times; 1.50 = 4.95</div>
                        <div>L_ideal = round(4.95) = <span className="font-bold text-emerald-300">5 servidores</span></div>
                      </div>
                    </li>
                    <li className="space-y-1">
                      <strong className="text-slate-100">Apuração do Balanço e Desvio Operacional:</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 font-mono text-amber-200 text-xs sm:text-sm my-1 space-y-1">
                        <div>Balanço = 4 (atuais) - 5 (ideal) = <span className="font-bold text-rose-300">-1 servidor</span></div>
                        <div>Desvio_% = ((4 - 5) / 5) &times; 100 = <span className="font-bold text-rose-300">-20.0%</span></div>
                      </div>
                    </li>
                  </ol>

                  <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-100 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <span className="font-bold text-slate-100">Diagnóstico Final do Sistema:</span>
                    <span className="font-extrabold uppercase px-3 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/40 text-xs sm:text-sm">
                      Déficit de 1 Servidor (-20%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Exemplo 2 */}
              <div className="rounded-xl border border-amber-500/30 bg-slate-950/90 p-6 space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    Exemplo 02: Simulação de Lotação com Gatilho de Fallback para Mediana (Corte de 35%)
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                    Trava de Segurança
                  </span>
                </div>

                <div className="text-xs text-slate-200 space-y-4 leading-relaxed">
                  {/* Cartão de Parâmetros com Alto Contraste */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-inner">
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">Categoria Transversal:</span>
                      <strong className="text-white text-base font-bold">Tecnologia da Informação</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">Redução Solicitada:</span>
                      <strong className="text-amber-300 font-black text-base">35.0% (&gt; 30%)</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-300 font-semibold text-xs block">Amostra IPS da Categoria:</span>
                      <strong className="text-white text-base font-bold">[75, 82, 88, 91, 95]</strong>
                    </div>
                  </div>

                  <p className="font-bold text-slate-100 text-sm">Execução do Algoritmo:</p>
                  <ol className="list-decimal list-inside space-y-3 text-slate-200 pl-1">
                    <li className="space-y-1">
                      <strong className="text-slate-100">Cálculo do 3º Quartil Benchmark (Q3):</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30 font-mono text-blue-200 text-xs sm:text-sm my-1">
                        Q3 = numpy.percentile([75, 82, 88, 91, 95], 75) = <span className="font-bold text-blue-300">91.0</span>
                      </div>
                    </li>
                    <li className="space-y-1">
                      <strong className="text-slate-100">Cálculo da Mediana (50%):</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30 font-mono text-blue-200 text-xs sm:text-sm my-1">
                        Mediana = numpy.percentile([75, 82, 88, 91, 95], 50) = <span className="font-bold text-blue-300">88.0</span>
                      </div>
                    </li>
                    <li className="space-y-1">
                      <strong className="text-slate-100">Verificação da Regra do Gatilho:</strong>
                      <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 font-mono text-amber-200 text-xs sm:text-sm my-1">
                        Como 35.0% &gt; 30.0% &rArr; <span className="font-bold text-amber-300">Estratégia Chaveada para Mediana (Fallback)!</span>
                      </div>
                    </li>
                  </ol>

                  <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-100 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <span className="font-bold text-slate-100">Lotação Benchmark Recomendada:</span>
                    <span className="font-extrabold text-xs sm:text-sm px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/40">
                      88.0 pontos (Mediana Aplicada)
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. Regras de Negócio e Travas */}
            <section id="travas-validacoes" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">6. Regras de Negócio, Travas e Códigos de Erro HTTP</h2>
                  <p className="text-xs text-slate-400">Proteção do sistema e integridade das rotas de API</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-rose-500/30 bg-slate-950/80 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Trava de Teto de Esforço
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      HTTP 400 Bad Request
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    O endpoint <code className="text-blue-300">POST /api/esforcos</code> valida a soma de todos os percentuais do servidor no mês informado. Se o somatório de solicitações exceder 100%, o backend rejeita a transação e retorna a mensagem detalhada: <span className="text-rose-300 font-mono text-[11px]">&quot;A soma dos esforços para o usuário no mês de referência não pode exceder 100%.&quot;</span>
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      Restrição por Perfil DFT
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      HTTP 403 Forbidden
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Servidores cadastrados com o perfil <code className="text-amber-300">apoio_exclusivo</code> estão impedidos de cadastrar esforços. A requisição é interrompida com: <span className="text-amber-300 font-mono text-[11px]">&quot;Usuários com perfil de apoio exclusivo não podem cadastrar esforços.&quot;</span>
                  </p>
                </div>
              </div>
            </section>

            {/* 7. Dicionário de Dados e Conceitos */}
            <section id="dicionario-dados" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">7. Dicionário de Dados e Conceitos Chave</h2>
                  <p className="text-xs text-slate-400">Glossário técnico dos termos utilizados na plataforma</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-[11px] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">Termo / Sigla</th>
                      <th className="px-4 py-3">Significado Conceitual</th>
                      <th className="px-4 py-3">Aplicação no Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/40">
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">SUBGFT</td>
                      <td className="px-4 py-3">Subgestão da Força de Trabalho do TJRR</td>
                      <td className="px-4 py-3">Unidade gestora responsável pela gestão do sistema.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">IPS</td>
                      <td className="px-4 py-3">Índice de Produtividade do Setor</td>
                      <td className="px-4 py-3">Métrica de pontuação utilizada para calcular a Lotação Ideal.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">Apoio Direto</td>
                      <td className="px-4 py-3">Unidades judiciárias de atividade-fim (Varas/Gabinetes)</td>
                      <td className="px-4 py-3">Devem concentrar no mínimo 70% da força de trabalho do TJRR.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">Apoio Indireto</td>
                      <td className="px-4 py-3">Unidades administrativas e operacionais (Atividade-meio)</td>
                      <td className="px-4 py-3">Limitadas ao teto máximo de 30% conforme Res. CNJ 219.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">Terceiro Quartil (Q3)</td>
                      <td className="px-4 py-3">Percentil 75 de uma amostra estatística ordenada</td>
                      <td className="px-4 py-3">Meta de alta produtividade para dimensionamento de pessoal.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-blue-400">Mediana (M)</td>
                      <td className="px-4 py-3">Percentil 50 de uma amostra estatística ordenada</td>
                      <td className="px-4 py-3">Gatilho de fallback em cenários de redução severa de vagas (&gt;30%).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
