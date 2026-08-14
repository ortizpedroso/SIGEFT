from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import Unidade, TipoUnidadeEnum, Usuario
from app.schemas import UnidadeCreate, UnidadeOut
from app.core.security import get_current_user
from app.services.dimensionamento import dimensionar_unidade, enum_value

router = APIRouter()


def _to_out(unidade: Unidade) -> UnidadeOut:
    extra = dimensionar_unidade(unidade)
    return UnidadeOut(
        id=unidade.id,
        nome=unidade.nome,
        tipo=enum_value(unidade.tipo),
        categoria_id=unidade.categoria_id,
        ips=unidade.ips,
        categoria=unidade.categoria,
        **extra,
    )


def _load_unidades(db: Session):
    return (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .all()
    )


@router.get("/unidades", response_model=List[UnidadeOut])
def list_unidades(db: Session = Depends(get_db)):
    return [_to_out(u) for u in _load_unidades(db)]


@router.post("/unidades", response_model=UnidadeOut, status_code=201)
def create_unidade(
    unidade_in: UnidadeCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    if unidade_in.tipo not in {item.value for item in TipoUnidadeEnum}:
        raise HTTPException(status_code=400, detail="tipo deve ser apoio_direto ou apoio_indireto")
    unidade = Unidade(
        nome=unidade_in.nome,
        tipo=TipoUnidadeEnum(unidade_in.tipo),
        categoria_id=unidade_in.categoria_id,
        ips=unidade_in.ips,
    )
    db.add(unidade)
    db.commit()
    loaded = (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .filter(Unidade.id == unidade.id)
        .first()
    )
    return _to_out(loaded)
