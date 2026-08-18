from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class CategoriaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome: str = Field(min_length=1, max_length=200)
    ips: Optional[float] = Field(default=None, ge=0, le=100)


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaOut(CategoriaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class UnidadeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome: str
    tipo: str
    categoria_id: str
    ips: Optional[float] = Field(default=None, ge=0, le=100)


class UnidadeCreate(UnidadeBase):
    pass


class ComposicaoVinculoOut(BaseModel):
    sincronizado: bool
    efetivo: int = 0
    cargo_comissionado: int = 0
    funcao_confianca: int = 0


class UnidadeOut(UnidadeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    categoria: Optional[CategoriaOut] = None
    servidores_atuais: Optional[int] = None
    lotacao_ideal: Optional[int] = None
    balanco: Optional[int] = None
    status_dimensionamento: Optional[str] = None
    composicao_vinculo: Optional[ComposicaoVinculoOut] = None


class UsuarioBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    perfil_dft: str
    unidade_id: str


class UsuarioCreate(UsuarioBase):
    senha: str


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    unidade: Optional[UnidadeBase] = None


class UsuarioMe(BaseModel):
    id: str
    email: EmailStr
    perfil_dft: str
    unidade_id: str
    unidade_nome: Optional[str] = None


class EntregaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome: str
    fonte: str
    unidade_id: str
    carga_horaria_media: Optional[float] = Field(default=None, ge=0, le=24)
    volume_mensal: Optional[float] = Field(default=None, ge=0)
    complexidade: Optional[int] = Field(default=None, ge=1, le=5)
    criticidade: Optional[int] = Field(default=None, ge=1, le=5)
    absenteismo_pct: Optional[float] = Field(default=None, ge=0, le=100)
    rotatividade_pct: Optional[float] = Field(default=None, ge=0, le=100)
    capacidade_produtiva: Optional[float] = Field(default=None, ge=0)


class EntregaCreate(EntregaBase):
    pass


class EntregaOut(EntregaBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    unidade: Optional[UnidadeBase] = None


class EsforcoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: str
    entrega_id: str
    percentual: float = Field(gt=0, le=100)
    mes_referencia: date


class EsforcoCreate(EsforcoBase):
    pass


class UsuarioBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    perfil_dft: str
    unidade_id: str


class EsforcoOut(EsforcoBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    usuario: Optional[UsuarioBrief] = None
    entrega: Optional[EntregaOut] = None


class LotacaoRequest(BaseModel):
    categoria_id: str
    reducao_percentual: Optional[float] = Field(default=0.0, ge=0, le=100)


class SimulacaoOut(BaseModel):
    q3: float
    fallback: float
    strategy: str
    value: float


class MovimentacaoRealocacao(BaseModel):
    unidade_origem_id: str
    unidade_destino_id: str
    quantidade: int = Field(ge=1)

    @model_validator(mode="after")
    def origem_diferente_destino(self):
        if self.unidade_origem_id == self.unidade_destino_id:
            raise ValueError("unidade_origem_id não pode ser igual a unidade_destino_id")
        return self


class RealocacaoRequest(BaseModel):
    movimentacoes: List[MovimentacaoRealocacao] = Field(min_length=1)


class UnidadeRealocacaoOut(BaseModel):
    unidade_id: str
    nome: str
    servidores_atuais_antes: int
    servidores_atuais_depois: int
    lotacao_ideal: int
    balanco_antes: int
    balanco_depois: int
    status_antes: str
    status_depois: str


class RealocacaoResumo(BaseModel):
    total_movimentado: int
    unidades_que_pioraram: int
    unidades_que_melhoraram: int


class RealocacaoOut(BaseModel):
    unidades_afetadas: List[UnidadeRealocacaoOut]
    resumo: RealocacaoResumo


class RateioIndiretoUnidade(BaseModel):
    unidade_id: str
    nome: str
    lotacao_ideal: int
    cota_alvo_pct: float
    percentual_real_pct: float
    desvio_pct: float
    classificacao: str


class RateioIndiretoOut(BaseModel):
    teto_global_pct: float
    pct_esforco_indireto_atual: float
    unidades: List[RateioIndiretoUnidade]


class SimulacaoHistoricoItem(BaseModel):
    id: str
    tipo: str
    usuario_email: str
    criado_em: str
    payload_entrada: dict
    payload_resultado: dict


class SimulacaoHistoricoOut(BaseModel):
    items: List[SimulacaoHistoricoItem]
    total: int
    page: int
    page_size: int


class UnidadeChartData(BaseModel):
    id: str
    nome: str
    tipo: str
    servidores_atuais: int
    lotacao_ideal: int
    ips: float
    categoria_nome: str


class CategoriaChartData(BaseModel):
    id: str
    nome: str
    ips_medio: float
    benchmark_q3: float


class PerfilCount(BaseModel):
    perfil: str
    total: int


class DashboardStatsOut(BaseModel):
    total_unidades: int
    unidades_apoio_indireto: int
    esforco_total_mes: float
    esforco_apoio_indireto_mes: float
    pct_esforco_indireto: float
    alerta_cnj: bool
    unidades_chart_data: List[UnidadeChartData] = []
    categorias_chart_data: List[CategoriaChartData] = []
    perfil_dft_counts: List[PerfilCount] = []


class MotorPonderacao(BaseModel):
    pesoVolume: float = Field(default=0.40, ge=0, le=1)
    pesoComplexidade: float = Field(default=0.35, ge=0, le=1)
    pesoCriticidade: float = Field(default=0.25, ge=0, le=1)
    toleranciaDesvio: float = Field(default=20.0, ge=0, le=100)


class ParametroHistoricoItem(BaseModel):
    id: str
    chave: str
    valor_anterior: float
    valor_novo: float
    alterado_em: str
    usuario_email: str


class ParametroHistoricoOut(BaseModel):
    items: List[ParametroHistoricoItem]
    total: int
    page: int
    page_size: int


class ParecerSEICreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    unidade_id: str = Field(alias="unidadeId")
    numero_processo_sei: Optional[str] = Field(default=None, alias="numeroProcessoSEI")
    analista_responsavel: Optional[str] = Field(default=None, alias="analistaResponsavel")
    recomendacao: Optional[str] = None


class ParecerSEIOut(BaseModel):
    id: str
    numeroProcessoSEI: str
    unidadeId: str
    unidadeNome: str
    tipoUnidade: str
    servidoresAtuais: int
    lotacaoIdealCalculada: int
    desvioPercentual: float
    diagnostico: str
    recomendacao: str
    dataEmissao: str
    analistaResponsavel: str
    minutaTextoSEI: str
