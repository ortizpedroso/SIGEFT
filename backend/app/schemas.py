from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CategoriaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nome: str
    ips: Optional[float] = None


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
    ips: Optional[float] = None


class UnidadeCreate(UnidadeBase):
    pass


class UnidadeOut(UnidadeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    categoria: Optional[CategoriaOut] = None
    servidores_atuais: Optional[int] = None
    lotacao_ideal: Optional[int] = None
    balanco: Optional[int] = None
    status_dimensionamento: Optional[str] = None


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
    carga_horaria_media: Optional[float] = None
    volume_mensal: Optional[float] = None
    complexidade: Optional[int] = None
    criticidade: Optional[int] = None
    absenteismo_pct: Optional[float] = None
    rotatividade_pct: Optional[float] = None
    capacidade_produtiva: Optional[float] = None


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
    percentual: float
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
    reducao_percentual: Optional[float] = 0.0


class SimulacaoOut(BaseModel):
    q3: float
    fallback: float
    strategy: str
    value: float


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
    pesoVolume: float = 0.40
    pesoComplexidade: float = 0.35
    pesoCriticidade: float = 0.25
    toleranciaDesvio: float = 20.0


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
