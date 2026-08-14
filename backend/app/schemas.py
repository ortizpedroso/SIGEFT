from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
