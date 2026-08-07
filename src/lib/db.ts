import { Categoria, Unidade, Usuario, Entrega, Esforco, DashboardStats, SimulacaoResponse, MotorPonderacaoConfig, ParecerSEI } from '@/types';

// Seed data based on core/init_db.py and initial specs
const initialCategorias: Categoria[] = [
  { id: 'cat-1', nome: 'Gestão de Pessoas', ips: 82.5 },
  { id: 'cat-2', nome: 'Tecnologia da Informação', ips: 91.0 },
  { id: 'cat-3', nome: 'Finanças e Orçamento', ips: 76.4 },
  { id: 'cat-4', nome: 'Administração e Infraestrutura', ips: 68.0 },
  { id: 'cat-5', nome: 'Comunicação Institucional', ips: 85.0 },
  { id: 'cat-6', nome: 'Jurídico e Controle Interno', ips: 88.5 },
  { id: 'cat-7', nome: 'Planejamento e Modernização', ips: 94.2 },
];

const initialUnidades: Unidade[] = [
  {
    id: 'uni-1',
    nome: 'Unidade Administrativa (Sistema)',
    tipo: 'apoio_indireto',
    categoria_id: 'cat-1',
    ips: 75.0,
  },
  {
    id: 'uni-2',
    nome: 'Secretaria de Tecnologia da Informação',
    tipo: 'apoio_indireto',
    categoria_id: 'cat-2',
    ips: 92.0,
  },
  {
    id: 'uni-3',
    nome: '1ª Vara Cível da Comarca de Boa Vista',
    tipo: 'apoio_direto',
    categoria_id: 'cat-6',
    ips: 88.0,
  },
  {
    id: 'uni-4',
    nome: '2ª Vara Cível da Comarca de Boa Vista',
    tipo: 'apoio_direto',
    categoria_id: 'cat-6',
    ips: 85.0,
  },
  {
    id: 'uni-5',
    nome: 'Secretaria de Gestão de Pessoas',
    tipo: 'apoio_indireto',
    categoria_id: 'cat-1',
    ips: 80.0,
  },
  {
    id: 'uni-6',
    nome: 'Coordenadoria de Orçamento e Finanças',
    tipo: 'apoio_indireto',
    categoria_id: 'cat-3',
    ips: 78.0,
  },
];

const initialUsuarios: Usuario[] = [
  {
    id: 'usr-admin',
    unidade_id: 'uni-1',
    perfil_dft: 'gestor',
    email: 'admin@tjrr.jus.br',
    senha_hash: 'Admin@2026!',
  },
  {
    id: 'usr-executor-1',
    unidade_id: 'uni-2',
    perfil_dft: 'executor',
    email: 'ti.executor@tjrr.jus.br',
  },
  {
    id: 'usr-apoio-1',
    unidade_id: 'uni-3',
    perfil_dft: 'apoio_exclusivo',
    email: 'apoio@tjrr.jus.br',
  },
];

const initialEntregas: Entrega[] = [
  {
    id: 'ent-1',
    unidade_id: 'uni-2',
    nome: 'Desenvolvimento e Manutenção do Sistema Métrica / SIGEP',
    fonte: 'Plano Diretor de TI 2026',
    carga_horaria_media: 12,
    volume_mensal: 45,
    complexidade: 4,
    criticidade: 5,
    absenteismo_pct: 3.5,
    rotatividade_pct: 2.0,
    capacidade_produtiva: 540,
  },
  {
    id: 'ent-2',
    unidade_id: 'uni-3',
    nome: 'Processamento de Minutas e Despachos Cíveis',
    fonte: 'Atividade Fim Judiciária',
    carga_horaria_media: 2.5,
    volume_mensal: 320,
    complexidade: 3,
    criticidade: 4,
    absenteismo_pct: 4.0,
    rotatividade_pct: 1.5,
    capacidade_produtiva: 800,
  },
  {
    id: 'ent-3',
    unidade_id: 'uni-5',
    nome: 'Gestão da Folha de Pagamento e Benefícios',
    fonte: 'Rotina Administrativa SGP',
    carga_horaria_media: 8,
    volume_mensal: 110,
    complexidade: 4,
    criticidade: 5,
    absenteismo_pct: 2.0,
    rotatividade_pct: 1.0,
    capacidade_produtiva: 880,
  },
  {
    id: 'ent-4',
    unidade_id: 'uni-6',
    nome: 'Execução Orçamentária e Empenhos',
    fonte: 'Coordenadoria de Finanças',
    carga_horaria_media: 6,
    volume_mensal: 140,
    complexidade: 3,
    criticidade: 4,
    absenteismo_pct: 3.0,
    rotatividade_pct: 2.5,
    capacidade_produtiva: 840,
  },
];

// Helper to get current YYYY-MM
function getCurrentMonthStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

const currentMonth = getCurrentMonthStr();

const initialEsforcos: Esforco[] = [
  {
    id: 'esf-1',
    usuario_id: 'usr-admin',
    entrega_id: 'ent-1',
    percentual: 40.0,
    mes_referencia: currentMonth,
  },
  {
    id: 'esf-2',
    usuario_id: 'usr-executor-1',
    entrega_id: 'ent-1',
    percentual: 50.0,
    mes_referencia: currentMonth,
  },
  {
    id: 'esf-3',
    usuario_id: 'usr-admin',
    entrega_id: 'ent-3',
    percentual: 20.0,
    mes_referencia: currentMonth,
  },
];

// In-Memory Global Collections
class DatabaseStore {
  categorias: Categoria[] = [...initialCategorias];
  unidades: Unidade[] = [...initialUnidades];
  usuarios: Usuario[] = [...initialUsuarios];
  entregas: Entrega[] = [...initialEntregas];
  esforcos: Esforco[] = [...initialEsforcos];

  motorPonderacao: MotorPonderacaoConfig = {
    pesoVolume: 0.40,
    pesoComplexidade: 0.35,
    pesoCriticidade: 0.25,
    toleranciaDesvio: 20,
  };

  pareceresSEI: ParecerSEI[] = [
    {
      id: 'par-1',
      numeroProcessoSEI: 'SEI 0010293-84.2026.8.23.8000',
      unidadeId: 'uni-5',
      unidadeNome: 'Secretaria de Gestão de Pessoas',
      tipoUnidade: 'apoio_indireto',
      servidoresAtuais: 4,
      lotacaoIdealCalculada: 6,
      desvioPercentual: -33.3,
      diagnostico: 'déficit severo',
      recomendacao: 'Remanejamento emergencial de 2 analistas administrativos de setor superdimensionado.',
      dataEmissao: '2026-08-01',
      analistaResponsavel: 'Analista SUBGFT / TJRR',
      minutaTextoSEI: `PROCESSO SEI Nº 0010293-84.2026.8.23.8000
UNIDADE INTERESSADA: Secretaria de Gestão de Pessoas (SGP)
ASSUNTO: Instrução Técnica de Dimensionamento da Força de Trabalho (DFT/SUBGFT)

PARECER TÉCNICO DE LOTAÇÃO PARADIGMA - SIGEP-FORÇA / TJRR

1. RELATÓRIO
Trata-se de instrução processual para análise da força de trabalho da Secretaria de Gestão de Pessoas (SGP), realizada por meio da metodologia DFT (MGI/UnB) e das diretrizes da Resolução CNJ nº 219/2016.

2. DIAGNÓSTICO OPERACIONAL DE CAPACIDADE
- Lotação Atual: 4 servidores
- Lotação Ideal Calculada pelo SIGEP-Força: 6 servidores
- Desvio Verificado: -33,3% (Déficit operacional acima da margem de tolerância de 20% do CNJ 553/2024).

3. CONCLUSÃO E ENCAMINHAMENTO
Submetem-se os autos à Presidência do TJRR recomendando o provimento/remanejamento de 2 (dois) servidores para reequilíbrio da capacidade produtiva da SGP.`,
    },
  ];

  // Getters with joins and workforce sizing calculations
  getUnidadesWithCategory(): Unidade[] {
    return this.unidades.map((u) => {
      const cat = this.categorias.find((c) => c.id === u.categoria_id);
      const usuariosUnidade = this.usuarios.filter((usr) => usr.unidade_id === u.id);
      const entregasUnidade = this.entregas.filter((ent) => ent.unidade_id === u.id);
      
      const servidoresAtuais = usuariosUnidade.length > 0 ? usuariosUnidade.length : (u.tipo === 'apoio_indireto' ? 4 : 6);
      const unitIps = u.ips !== null && u.ips !== undefined ? u.ips : (cat?.ips ?? 80);
      
      // Metodologia MGI / Resolução CNJ 219: Lotação Ideal calculada
      const multiplicadorAtividades = 1 + (entregasUnidade.length * 0.25);
      const baseWorkload = (unitIps / 80) * 3 * multiplicadorAtividades;
      const lotacaoIdeal = Math.max(1, Math.round(baseWorkload));
      const balanco = servidoresAtuais - lotacaoIdeal;
      
      let statusDim: 'deficit' | 'ideal' | 'excesso' = 'ideal';
      if (balanco < 0) statusDim = 'deficit';
      else if (balanco > 0) statusDim = 'excesso';

      return {
        ...u,
        categoria: cat,
        servidores_atuais: servidoresAtuais,
        lotacao_ideal: lotacaoIdeal,
        balanco,
        status_dimensionamento: statusDim,
      };
    });
  }

  getEntregasWithUnidade(): Entrega[] {
    return this.entregas.map((e) => {
      const uni = this.unidades.find((u) => u.id === e.unidade_id);
      return { ...e, unidade: uni };
    });
  }

  getEsforcosPopulated(): Esforco[] {
    const entregasPop = this.getEntregasWithUnidade();
    return this.esforcos.map((esf) => {
      const usr = this.usuarios.find((u) => u.id === esf.usuario_id);
      const ent = entregasPop.find((e) => e.id === esf.entrega_id);
      return { ...esf, usuario: usr, entrega: ent };
    });
  }

  getDashboardStats(): DashboardStats {
    const totalUnidades = this.unidades.length;
    const unidadesIndiretas = this.unidades.filter((u) => u.tipo === 'apoio_indireto').length;

    // Current month filter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();

    const esforcosMes = this.esforcos.filter((e) => {
      const d = new Date(e.mes_referencia);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthNum;
    });

    const esforcoTotal = esforcosMes.reduce((acc, curr) => acc + Number(curr.percentual), 0);

    const esforcoIndireto = esforcosMes.reduce((acc, curr) => {
      const entrega = this.entregas.find((ent) => ent.id === curr.entrega_id);
      if (entrega) {
        const unidade = this.unidades.find((u) => u.id === entrega.unidade_id);
        if (unidade && unidade.tipo === 'apoio_indireto') {
          return acc + Number(curr.percentual);
        }
      }
      return acc;
    }, 0);

    const pctEsforcoIndireto = esforcoTotal > 0 ? (esforcoIndireto / esforcoTotal) * 100 : 0;

    // Chart dataset 1: Unidades Atual vs Ideal
    const unidadesPop = this.getUnidadesWithCategory();
    const unidadesChartData = unidadesPop.map((u) => ({
      id: u.id,
      nome: u.nome.length > 22 ? u.nome.substring(0, 20) + '...' : u.nome,
      tipo: u.tipo,
      servidores_atuais: u.servidores_atuais || 0,
      lotacao_ideal: u.lotacao_ideal || 0,
      ips: u.ips || 80,
      categoria_nome: u.categoria?.nome || 'MGI',
    }));

    // Chart dataset 2: Categorias IPS médio vs Q3 benchmark
    const categoriasChartData = this.categorias.map((c) => {
      const unis = unidadesPop.filter((u) => u.categoria_id === c.id);
      const sumIps = unis.reduce((acc, curr) => acc + (curr.ips || 80), 0);
      const avgIps = unis.length > 0 ? sumIps / unis.length : c.ips || 80;
      return {
        id: c.id,
        nome: c.nome.length > 18 ? c.nome.substring(0, 16) + '...' : c.nome,
        ips_medio: Math.round(avgIps * 10) / 10,
        benchmark_q3: c.ips || 85,
      };
    });

    // Chart dataset 3: Perfil DFT counts
    const perfilCounts = [
      { perfil: 'Gestor', total: this.usuarios.filter((u) => u.perfil_dft === 'gestor').length },
      { perfil: 'Executor', total: this.usuarios.filter((u) => u.perfil_dft === 'executor').length },
      { perfil: 'Apoio Exclusivo', total: this.usuarios.filter((u) => u.perfil_dft === 'apoio_exclusivo').length },
    ];

    return {
      total_unidades: totalUnidades,
      unidades_apoio_indireto: unidadesIndiretas,
      esforco_total_mes: Math.round(esforcoTotal * 100) / 100,
      esforco_apoio_indireto_mes: Math.round(esforcoIndireto * 100) / 100,
      pct_esforco_indireto: Math.round(pctEsforcoIndireto * 10) / 10,
      alerta_cnj: pctEsforcoIndireto > 30.0,
      unidades_chart_data: unidadesChartData,
      categorias_chart_data: categoriasChartData,
      perfil_dft_counts: perfilCounts,
    };
  }

  calculateLotacao(categoriaId: string, reducaoPercentual: number = 0): SimulacaoResponse {
    const unidadesCat = this.unidades.filter((u) => u.categoria_id === categoriaId);
    if (unidadesCat.length === 0) {
      throw new Error('Categoria sem unidades encontradas.');
    }

    const ipsValues = unidadesCat
      .map((u) => (u.ips !== null && u.ips !== undefined ? Number(u.ips) : null))
      .filter((v): v is number => v !== null);

    if (ipsValues.length === 0) {
      throw new Error('Não há valores de IPS para esta categoria.');
    }

    const q3 = calculatePercentile(ipsValues, 75);
    const median = calculateMedian(ipsValues);

    if (reducaoPercentual > 30.0) {
      return {
        q3: Math.round(q3 * 100) / 100,
        fallback: Math.round(median * 100) / 100,
        strategy: 'median',
        value: Math.round(median * 100) / 100,
      };
    }

    return {
      q3: Math.round(q3 * 100) / 100,
      fallback: Math.round(median * 100) / 100,
      strategy: 'q3',
      value: Math.round(q3 * 100) / 100,
    };
  }
}

// Global Singleton in Node runtime
const globalForDb = global as unknown as { dbStore: DatabaseStore };

export const dbStore = globalForDb.dbStore || new DatabaseStore();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbStore = dbStore;
}

function calculatePercentile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = ((sorted.length - 1) * q) / 100;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function calculateMedian(arr: number[]): number {
  return calculatePercentile(arr, 50);
}
