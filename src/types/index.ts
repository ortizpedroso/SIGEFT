export type TipoUnidade = 'apoio_direto' | 'apoio_indireto';

export type PerfilDFT = 'gestor' | 'executor' | 'apoio_exclusivo';

export interface Categoria {
  id: string;
  nome: string;
  ips: number | null;
}

export interface Unidade {
  id: string;
  nome: string;
  tipo: TipoUnidade;
  categoria_id: string;
  ips: number | null;
  categoria?: Categoria;
  servidores_atuais?: number;
  lotacao_ideal?: number;
  balanco?: number;
  status_dimensionamento?: 'deficit' | 'ideal' | 'excesso';
}

export interface Usuario {
  id: string;
  unidade_id: string;
  perfil_dft: PerfilDFT;
  email: string;
  senha_hash?: string;
  unidade?: Unidade;
}

export interface Entrega {
  id: string;
  unidade_id: string;
  nome: string;
  fonte: string;
  carga_horaria_media?: number; // horas por entrega
  volume_mensal?: number; // quantidade no mês
  complexidade?: number; // 1 (baixa) a 5 (alta)
  criticidade?: number; // 1 (baixa) a 5 (crítica)
  absenteismo_pct?: number; // percentual de absenteísmo
  rotatividade_pct?: number; // percentual de rotatividade
  capacidade_produtiva?: number; // horas totais necessárias
  unidade?: Unidade;
}

export interface MotorPonderacaoConfig {
  pesoVolume: number;
  pesoComplexidade: number;
  pesoCriticidade: number;
  toleranciaDesvio: number; // e.g. 20% CNJ 553/2024
}

export interface ParecerSEI {
  id: string;
  numeroProcessoSEI: string;
  unidadeId: string;
  unidadeNome: string;
  tipoUnidade: TipoUnidade | 'consolidado';
  servidoresAtuais: number;
  lotacaoIdealCalculada: number;
  desvioPercentual: number;
  diagnostico: 'déficit severo' | 'equilibrado' | 'excesso de força';
  recomendacao: string;
  dataEmissao: string;
  analistaResponsavel: string;
  minutaTextoSEI: string;
}

export interface Esforco {
  id: string;
  usuario_id: string;
  entrega_id: string;
  percentual: number;
  mes_referencia: string; // YYYY-MM-DD or YYYY-MM
  usuario?: Usuario;
  entrega?: Entrega;
}

export interface UnidadeChartData {
  id: string;
  nome: string;
  tipo: TipoUnidade;
  servidores_atuais: number;
  lotacao_ideal: number;
  ips: number;
  categoria_nome: string;
}

export interface CategoriaChartData {
  id: string;
  nome: string;
  ips_medio: number;
  benchmark_q3: number;
}

export interface DashboardStats {
  total_unidades: number;
  unidades_apoio_indireto: number;
  esforco_total_mes: number;
  esforco_apoio_indireto_mes: number;
  pct_esforco_indireto: number;
  alerta_cnj: boolean;
  unidades_chart_data?: UnidadeChartData[];
  categorias_chart_data?: CategoriaChartData[];
  perfil_dft_counts?: { perfil: string; total: number }[];
}

export interface LotacaoRequest {
  categoria_id: string;
  reducao_percentual?: number;
}

export interface SimulacaoResponse {
  q3: number;
  fallback: number;
  strategy: 'q3' | 'median';
  value: number;
}

export interface MovimentacaoRealocacao {
  unidade_origem_id: string;
  unidade_destino_id: string;
  quantidade: number;
}

export interface UnidadeRealocacaoResult {
  unidade_id: string;
  nome: string;
  servidores_atuais_antes: number;
  servidores_atuais_depois: number;
  lotacao_ideal: number;
  balanco_antes: number;
  balanco_depois: number;
  status_antes: string;
  status_depois: string;
}

export interface RealocacaoResponse {
  unidades_afetadas: UnidadeRealocacaoResult[];
  resumo: {
    total_movimentado: number;
    unidades_que_pioraram: number;
    unidades_que_melhoraram: number;
  };
}

export interface RateioIndiretoUnidade {
  unidade_id: string;
  nome: string;
  lotacao_ideal: number;
  cota_alvo_pct: number;
  percentual_real_pct: number;
  desvio_pct: number;
  classificacao: 'acima_da_cota' | 'abaixo_da_cota' | 'dentro_da_cota';
}

export interface RateioIndiretoResponse {
  teto_global_pct: number;
  pct_esforco_indireto_atual: number;
  unidades: RateioIndiretoUnidade[];
}

export interface SimulacaoHistoricoItem {
  id: string;
  tipo: string;
  usuario_email: string;
  criado_em: string;
  payload_entrada: Record<string, unknown>;
  payload_resultado: Record<string, unknown>;
}

export interface SimulacaoHistoricoResponse {
  items: SimulacaoHistoricoItem[];
  total: number;
  page: number;
  page_size: number;
}
