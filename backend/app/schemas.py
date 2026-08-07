from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

# ─── Categorias ───────────────────────────────────────────────────────────────
class CategoriaBase(BaseModel):
    nome: str
    ips: Optional[float] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    id: str

    class Config:
        from_attributes = True

# ─── Unidades ─────────────────────────────────────────────────────────────────
class UnidadeBase(BaseModel):
    nome: str
    tipo: str
    categoria_id: str
    ips: Optional[float] = None

class UnidadeCreate(UnidadeBase):
    pass

class UnidadeOut(UnidadeBase):
    id: str
    categoria: Optional[CategoriaOut] = None

    class Config:
        from_attributes = True

# ─── Usuários ─────────────────────────────────────────────────────────────────
class UsuarioBase(BaseModel):
    email: EmailStr
    perfil_dft: str
    unidade_id: str

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioOut(UsuarioBase):
    id: str

    class Config:
        from_attributes = True

# ─── Entregas ─────────────────────────────────────────────────────────────────
class EntregaBase(BaseModel):
    nome: str
    fonte: str
    unidade_id: str

class EntregaCreate(EntregaBase):
    pass

class EntregaOut(EntregaBase):
    id: str

    class Config:
        from_attributes = True

# ─── Esforços ─────────────────────────────────────────────────────────────────
class EsforcoBase(BaseModel):
    usuario_id: str
    entrega_id: str
    percentual: float
    mes_referencia: date

class EsforcoCreate(EsforcoBase):
    pass

class EsforcoOut(EsforcoBase):
    id: str

    class Config:
        from_attributes = True

# ─── Simulação / Dashboard ────────────────────────────────────────────────────
class LotacaoRequest(BaseModel):
    categoria_id: str
    reducao_percentual: Optional[float] = 0.0

class SimulacaoOut(BaseModel):
    q3: float
    fallback: float
    strategy: str
    value: float

class DashboardStatsOut(BaseModel):
    total_unidades: int
    unidades_apoio_indireto: int
    esforco_total_mes: float
    esforco_apoio_indireto_mes: float
    pct_esforco_indireto: float
    alerta_cnj: bool
