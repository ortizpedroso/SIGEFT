'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Package,
  Sliders,
  Users,
  BarChart3,
  FileText,
  Link2,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

type Perfil = 'gestor' | 'executor' | 'apoio_exclusivo';

type ModuloGuia = {
  id: string;
  titulo: string;
  rota: string;
  icon: typeof LayoutDashboard;
  oQueE: string;
  paraQueServe: string;
  passos: string[];
};

const PERFIL_LABELS: Record<Perfil, string> = {
  gestor: 'Gestor',
  executor: 'Executor',
  apoio_exclusivo: 'Apoio Exclusivo',
};

const PERFIL_DESCRICAO: Record<Perfil, string> = {
  gestor:
    'Perfil com acesso amplo: cadastros, calibração de pesos, simulações, minutas SEI, integração e exportação de documentação.',
  executor:
    'Perfil operacional: consulta todos os módulos e pode lançar esforços mensais dos servidores. Demais ações de escrita ficam restritas ao gestor.',
  apoio_exclusivo:
    'Perfil somente leitura. Permite acompanhar indicadores, unidades, entregas e relatórios para transparência e fiscalização, sem alterar dados.',
};

const MODULOS_GESTOR: ModuloGuia[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    rota: '/',
    icon: LayoutDashboard,
    oQueE: 'Painel executivo com indicadores consolidados do Tribunal.',
    paraQueServe:
      'Acompanhar o panorama geral: total de unidades, esforço mensal, conformidade com o teto de 30% do CNJ e rateio interno entre unidades de apoio indireto.',
    passos: [
      'Clique em Painel no menu principal.',
      'Revise os cartões de consolidação no topo da página.',
      'Observe a barra de conformidade do teto CNJ (verde ≤ 30%, vermelho > 30%).',
      'Consulte o card de Rateio Interno para ver cota-alvo, percentual real e classificação de desvio por unidade de apoio indireto.',
    ],
  },
  {
    id: 'unidades',
    titulo: 'Unidades',
    rota: '/unidades',
    icon: Building2,
    oQueE: 'Cadastro e gestão de secretarias, varas e coordenadorias.',
    paraQueServe:
      'Mapear unidades judiciais e administrativas, classificar apoio direto/indireto, definir IPS e acompanhar selos de Déficit, Ideal ou Excesso.',
    passos: [
      'Clique em Unidades no menu.',
      'Use os filtros de tipo e status para localizar unidades específicas.',
      'Para cadastrar: clique em + Nova Unidade, preencha nome, tipo (apoio direto ou indireto), categoria MGI e IPS.',
      'Salve e verifique o selo de diagnóstico (Déficit, Ideal ou Excesso) na listagem.',
      'Após sincronização com Folha/RH, confira a composição de vínculo (efetivo, CC, FC) no card da unidade.',
    ],
  },
  {
    id: 'entregas',
    titulo: 'Entregas',
    rota: '/entregas',
    icon: Package,
    oQueE: 'Cadastro de produtos, serviços e processos por unidade.',
    paraQueServe:
      'Registrar entregas com carga horária, volume mensal, complexidade e criticidade para calcular a capacidade produtiva necessária.',
    passos: [
      'Clique em Entregas no menu.',
      'Selecione a unidade desejada no filtro.',
      'Clique em + Nova Entrega.',
      'Preencha nome, fonte normativa, carga horária média, volume mensal, complexidade (1–5), criticidade (1–5), absenteísmo e rotatividade.',
      'Salve e confira a capacidade produtiva calculada automaticamente.',
    ],
  },
  {
    id: 'ponderacao',
    titulo: 'Motor de Ponderação',
    rota: '/ponderacao',
    icon: Sliders,
    oQueE: 'Calibração dos pesos do índice multidimensional e tolerância de desvio.',
    paraQueServe:
      'Ajustar W_V (volume), W_C (complexidade), W_R (criticidade) e TOLERANCIA_DESVIO conforme diretrizes do CNJ 553/2024.',
    passos: [
      'Clique em Ponderação no menu.',
      'Revise os pesos atuais (soma deve ser 1,0).',
      'Altere os valores desejados e clique em Salvar.',
      'Consulte o Histórico de Alterações para ver quem alterou, quando e de qual valor para qual valor.',
    ],
  },
  {
    id: 'esforcos',
    titulo: 'Esforços',
    rota: '/esforcos',
    icon: Users,
    oQueE: 'Registro da jornada mensal dos servidores por entrega.',
    paraQueServe:
      'Distribuir o percentual de esforço de cada servidor entre as entregas da unidade, respeitando o teto de 100% mensal.',
    passos: [
      'Clique em Esforços no menu.',
      'Selecione unidade, servidor e mês de referência.',
      'Informe o percentual de esforço para cada entrega.',
      'Confirme que a soma não ultrapassa 100%.',
      'Salve o lançamento.',
    ],
  },
  {
    id: 'simulacao',
    titulo: 'Simulação',
    rota: '/simulacao',
    icon: BarChart3,
    oQueE: 'Ferramenta de simulação e auditoria de cenários.',
    paraQueServe:
      'Testar hipóteses de dimensionamento (Q3/Mediana) e realocação de servidores sem persistir alterações no sistema.',
    passos: [
      'Clique em Simulação no menu.',
      'Na aba Q3/Mediana: selecione categoria MGI, informe redução projetada e execute a simulação.',
      'Na aba Realocação: informe unidade de origem, destino e quantidade de servidores a mover; clique em Simular.',
      'Analise o impacto exibido antes de tomar qualquer decisão real.',
      'Consulte o Histórico de Simulações para revisar cenários anteriores.',
    ],
  },
  {
    id: 'relatorios-sei',
    titulo: 'Instrução SEI',
    rota: '/relatorios-sei',
    icon: FileText,
    oQueE: 'Geração de minutas e pareceres técnicos para processos SEI.',
    paraQueServe:
      'Produzir documentos formais embasados na metodologia CNJ/MGI para instruir processos administrativos.',
    passos: [
      'Clique em Instrução SEI no menu.',
      'Clique em Instruir Novo Processo SEI.',
      'Selecione a unidade ou Todas as unidades (parecer consolidado).',
      'Revise a minuta gerada, edite se necessário e exporte ou copie para o SEI.',
    ],
  },
  {
    id: 'integracao',
    titulo: 'Integração',
    rota: '/integracao',
    icon: Link2,
    oQueE: 'Configuração de conectores com sistemas externos.',
    paraQueServe:
      'Conectar sandboxes de SEI, Folha/RH, organograma e SSO; sincronizar dados reais de servidores.',
    passos: [
      'Clique em Integração no menu.',
      'Configure URL e chave de API para cada conector disponível.',
      'Verifique o status de cada canal (local ou sandbox).',
      'No conector Folha/RH, clique em Sincronizar agora para trazer servidores com vínculo funcional.',
      'Aguarde a confirmação e verifique a composição de vínculo nas unidades.',
    ],
  },
  {
    id: 'documentacao',
    titulo: 'Documentação',
    rota: '/documentacao',
    icon: BookOpen,
    oQueE: 'Documento técnico de metodologia para homologação.',
    paraQueServe:
      'Consultar a metodologia completa e exportar PDF para processos de homologação institucional.',
    passos: [
      'Acesse /documentacao (página oculta do menu principal).',
      'Navegue pelas seções usando o índice lateral.',
      'Clique em Exportar Metodologia (PDF) para gerar o documento oficial.',
    ],
  },
];

const MODULOS_EXECUTOR: ModuloGuia[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    rota: '/',
    icon: LayoutDashboard,
    oQueE: 'Painel executivo com indicadores consolidados.',
    paraQueServe: 'Acompanhar indicadores gerais, teto CNJ e rateio interno em modo consulta.',
    passos: [
      'Clique em Painel no menu.',
      'Revise os cartões e gráficos exibidos.',
      'Use os dados para orientar lançamentos de esforço na sua unidade.',
    ],
  },
  {
    id: 'unidades',
    titulo: 'Unidades',
    rota: '/unidades',
    icon: Building2,
    oQueE: 'Listagem de unidades judiciais e administrativas.',
    paraQueServe: 'Consultar IPS, lotação ideal, selos de diagnóstico e composição de vínculo.',
    passos: [
      'Clique em Unidades no menu.',
      'Use filtros de tipo e status para localizar sua unidade.',
      'Consulte selo (Déficit, Ideal, Excesso) e dados de dimensionamento.',
    ],
  },
  {
    id: 'entregas',
    titulo: 'Entregas',
    rota: '/entregas',
    icon: Package,
    oQueE: 'Entregas cadastradas por unidade.',
    paraQueServe: 'Consultar produtos, serviços e capacidade produtiva — cadastro é feito pelo gestor.',
    passos: [
      'Clique em Entregas no menu.',
      'Selecione a unidade no filtro.',
      'Revise a lista de entregas e seus parâmetros (volume, complexidade, criticidade).',
    ],
  },
  {
    id: 'ponderacao',
    titulo: 'Motor de Ponderação',
    rota: '/ponderacao',
    icon: Sliders,
    oQueE: 'Parâmetros de ponderação do sistema.',
    paraQueServe: 'Consultar pesos atuais de volume, complexidade e criticidade — edição restrita ao gestor.',
    passos: [
      'Clique em Ponderação no menu.',
      'Revise os pesos e a tolerância de desvio exibidos.',
    ],
  },
  {
    id: 'esforcos',
    titulo: 'Esforços',
    rota: '/esforcos',
    icon: Users,
    oQueE: 'Lançamento da jornada mensal dos servidores.',
    paraQueServe:
      'Registrar percentuais de esforço por entrega — principal ação operacional do perfil executor.',
    passos: [
      'Clique em Esforços no menu.',
      'Selecione unidade, servidor e mês.',
      'Distribua os percentuais entre as entregas (soma ≤ 100%).',
      'Salve o lançamento.',
    ],
  },
  {
    id: 'simulacao',
    titulo: 'Simulação',
    rota: '/simulacao',
    icon: BarChart3,
    oQueE: 'Cenários de dimensionamento e realocação.',
    paraQueServe: 'Consultar simulações existentes — executar novas simulações é restrito ao gestor.',
    passos: [
      'Clique em Simulação no menu.',
      'Navegue pelas abas Q3/Mediana, Realocação e Histórico em modo consulta.',
    ],
  },
  {
    id: 'relatorios-sei',
    titulo: 'Instrução SEI',
    rota: '/relatorios-sei',
    icon: FileText,
    oQueE: 'Minutas e pareceres técnicos.',
    paraQueServe: 'Consultar minutas geradas — criação e edição restritas ao gestor.',
    passos: [
      'Clique em Instrução SEI no menu.',
      'Revise minutas existentes na listagem.',
    ],
  },
  {
    id: 'integracao',
    titulo: 'Integração',
    rota: '/integracao',
    icon: Link2,
    oQueE: 'Status dos conectores externos.',
    paraQueServe: 'Verificar se Folha/RH e demais integrações estão ativas — configuração restrita ao gestor.',
    passos: [
      'Clique em Integração no menu.',
      'Consulte o status de cada conector.',
    ],
  },
  {
    id: 'documentacao',
    titulo: 'Documentação',
    rota: '/documentacao',
    icon: BookOpen,
    oQueE: 'Metodologia técnica do sistema.',
    paraQueServe: 'Consultar fórmulas, exemplos e regras de negócio — exportação PDF restrita ao gestor.',
    passos: [
      'Acesse /documentacao.',
      'Navegue pelas seções do índice lateral.',
    ],
  },
];

const MODULOS_APOIO: ModuloGuia[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    rota: '/',
    icon: LayoutDashboard,
    oQueE: 'Painel executivo com indicadores consolidados.',
    paraQueServe:
      'Acompanhar transparência dos indicadores do Tribunal: teto CNJ, esforço total e rateio interno, sem alterar dados.',
    passos: [
      'Clique em Painel no menu.',
      'Revise cartões, gráficos e alertas de conformidade.',
      'Use os dados para fiscalização e acompanhamento institucional.',
    ],
  },
  {
    id: 'unidades',
    titulo: 'Unidades',
    rota: '/unidades',
    icon: Building2,
    oQueE: 'Listagem de unidades e diagnósticos de lotação.',
    paraQueServe: 'Consultar selos Déficit/Ideal/Excesso e composição de vínculo por unidade.',
    passos: [
      'Clique em Unidades no menu.',
      'Filtre por tipo ou status conforme necessário.',
      'Analise os selos e indicadores de cada unidade.',
    ],
  },
  {
    id: 'entregas',
    titulo: 'Entregas',
    rota: '/entregas',
    icon: Package,
    oQueE: 'Entregas cadastradas por unidade.',
    paraQueServe: 'Verificar produtos, volumes e parâmetros de capacidade produtiva.',
    passos: [
      'Clique em Entregas no menu.',
      'Selecione a unidade e revise a listagem.',
    ],
  },
  {
    id: 'ponderacao',
    titulo: 'Motor de Ponderação',
    rota: '/ponderacao',
    icon: Sliders,
    oQueE: 'Parâmetros de calibração do sistema.',
    paraQueServe: 'Consultar pesos e tolerância de desvio vigentes.',
    passos: [
      'Clique em Ponderação no menu.',
      'Revise os valores exibidos (somente leitura).',
    ],
  },
  {
    id: 'simulacao',
    titulo: 'Simulação',
    rota: '/simulacao',
    icon: BarChart3,
    oQueE: 'Histórico e cenários de simulação.',
    paraQueServe: 'Consultar simulações registradas para auditoria e transparência.',
    passos: [
      'Clique em Simulação no menu.',
      'Navegue pelo histórico e detalhes de cenários anteriores.',
    ],
  },
  {
    id: 'relatorios-sei',
    titulo: 'Instrução SEI',
    rota: '/relatorios-sei',
    icon: FileText,
    oQueE: 'Minutas e pareceres técnicos.',
    paraQueServe: 'Consultar documentos gerados para processos administrativos.',
    passos: [
      'Clique em Instrução SEI no menu.',
      'Revise minutas na listagem.',
    ],
  },
  {
    id: 'integracao',
    titulo: 'Integração',
    rota: '/integracao',
    icon: Link2,
    oQueE: 'Status dos conectores externos.',
    paraQueServe: 'Verificar se integrações (Folha/RH, SEI) estão operacionais.',
    passos: [
      'Clique em Integração no menu.',
      'Consulte o status de cada conector.',
    ],
  },
  {
    id: 'documentacao',
    titulo: 'Documentação',
    rota: '/documentacao',
    icon: BookOpen,
    oQueE: 'Metodologia técnica completa.',
    paraQueServe: 'Consultar fórmulas, exemplos e regras de negócio para entendimento da metodologia.',
    passos: [
      'Acesse /documentacao.',
      'Navegue pelas seções do índice lateral.',
    ],
  },
];

const MODULOS_POR_PERFIL: Record<Perfil, ModuloGuia[]> = {
  gestor: MODULOS_GESTOR,
  executor: MODULOS_EXECUTOR,
  apoio_exclusivo: MODULOS_APOIO,
};

const FAQ = [
  {
    pergunta: 'Por que alguns campos ou botões aparecem bloqueados?',
    resposta:
      'O sistema aplica controle de acesso por perfil (Gestor, Executor, Apoio Exclusivo). Campos de cadastro, edição de pesos, simulação, minutas SEI, integração e exportação PDF ficam restritos ao gestor. O executor pode lançar esforços; o apoio exclusivo tem acesso somente leitura e não pode registrar esforços (HTTP 403).',
  },
  {
    pergunta: 'O que significam os selos Déficit, Ideal e Excesso?',
    resposta:
      'Comparam a lotação real da unidade com a Lotação Ideal calculada pela metodologia. Déficit (balanço negativo) indica falta de servidores; Ideal (balanço zero) indica equilíbrio; Excesso (balanço positivo) indica servidores acima do necessário.',
  },
  {
    pergunta: 'O que fazer se a sincronização com Folha/RH falhar?',
    resposta:
      'Verifique em Integração se a URL e a chave de API estão configuradas corretamente. Confirme conectividade com o sandbox Folha/RH. Se persistir, anote a mensagem de erro exibida e acione o gestor ou a equipe de TI para revisar credenciais e logs do conector.',
  },
  {
    pergunta: 'Qual a diferença entre Simulação e uma ação real no sistema?',
    resposta:
      'A Simulação (Q3/Mediana e Realocação) calcula cenários hipotéticos sem salvar alterações — serve para testar impactos antes de decidir. Ações reais (cadastro de unidades, lançamento de esforços, alteração de pesos) persistem no banco e afetam indicadores e relatórios.',
  },
];

function ModuloCard({ modulo }: { modulo: ModuloGuia }) {
  const Icon = modulo.icon;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-3">
      <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
        <Icon className="w-4 h-4 shrink-0" />
        <span>
          {modulo.titulo}{' '}
          <code className="font-mono text-xs text-slate-400">({modulo.rota})</code>
        </span>
      </div>
      <div className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <p>
          <span className="font-semibold text-slate-200">O que é: </span>
          {modulo.oQueE}
        </p>
        <p>
          <span className="font-semibold text-slate-200">Para que serve: </span>
          {modulo.paraQueServe}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">
          Passos práticos
        </p>
        <ol className="list-none space-y-2">
          {modulo.passos.map((passo, idx) => (
            <li key={idx} className="flex gap-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-bold text-blue-400">
                {idx + 1}
              </span>
              <span className="text-justify">{passo}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function CapacitacaoPage() {
  const [perfilAtivo, setPerfilAtivo] = useState<Perfil>('gestor');
  const modulos = MODULOS_POR_PERFIL[perfilAtivo];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main
        id="conteudo-principal"
        className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Capacitação Operacional — TJRR / SUBGFT
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              <GraduationCap className="w-3.5 h-3.5" />
              Pilar 3 — Capacitação Continuada
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-start gap-3">
            <GraduationCap className="w-8 h-8 shrink-0 text-blue-400 mt-0.5" />
            Guia de Uso do Sistema Métrica por Perfil
          </h1>
          <p className="w-full text-sm sm:text-base mt-3 leading-relaxed text-slate-300 text-justify">
            Manual operacional passo a passo para Gestores, Executores e Apoio Exclusivo. Selecione seu
            perfil abaixo para ver apenas os módulos e ações disponíveis para você.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(PERFIL_LABELS) as Perfil[]).map((perfil) => (
            <button
              key={perfil}
              type="button"
              onClick={() => setPerfilAtivo(perfil)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                perfilAtivo === perfil
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {PERFIL_LABELS[perfil]}
              {perfilAtivo === perfil && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl mb-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">{PERFIL_LABELS[perfilAtivo]}</h2>
            <p className="text-sm text-slate-400 mt-1">{PERFIL_DESCRICAO[perfilAtivo]}</p>
          </div>

          {perfilAtivo === 'apoio_exclusivo' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Este perfil é <strong>somente leitura</strong>. O módulo Esforços não se aplica — tentativas
              de lançamento retornam HTTP 403. Use os demais módulos para acompanhamento e transparência.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5">
            {modulos.map((modulo) => (
              <ModuloCard key={modulo.id} modulo={modulo} />
            ))}
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <HelpCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Perguntas Frequentes</h2>
              <p className="text-xs text-slate-400">Dúvidas comuns sobre perfis, selos e operações</p>
            </div>
          </div>

          <div className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.pergunta}
                className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2"
              >
                <h3 className="text-sm font-bold text-emerald-400">{item.pergunta}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-justify">
                  {item.resposta}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
