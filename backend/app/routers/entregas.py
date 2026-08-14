from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Entrega, Unidade, Usuario
from app.schemas import EntregaCreate, EntregaOut
from app.core.security import get_current_user, require_roles
from app.services.dimensionamento import capacidade_produtiva

router = APIRouter()


@router.get("/entregas", response_model=List[EntregaOut])
def list_entregas(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return db.query(Entrega).options(joinedload(Entrega.unidade)).all()


@router.post("/entregas", response_model=EntregaOut, status_code=201)
def create_entrega(
    entrega_in: EntregaCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    unidade = db.query(Unidade).filter(Unidade.id == entrega_in.unidade_id).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    ch = entrega_in.carga_horaria_media if entrega_in.carga_horaria_media is not None else 5.0
    vol = entrega_in.volume_mensal if entrega_in.volume_mensal is not None else 100.0
    abs_pct = entrega_in.absenteismo_pct if entrega_in.absenteismo_pct is not None else 3.0
    rot_pct = entrega_in.rotatividade_pct if entrega_in.rotatividade_pct is not None else 2.0
    cap = capacidade_produtiva(ch, vol, abs_pct, rot_pct)

    entrega = Entrega(
        unidade_id=entrega_in.unidade_id,
        nome=entrega_in.nome,
        fonte=entrega_in.fonte,
        carga_horaria_media=ch,
        volume_mensal=vol,
        complexidade=entrega_in.complexidade if entrega_in.complexidade is not None else 3,
        criticidade=entrega_in.criticidade if entrega_in.criticidade is not None else 3,
        absenteismo_pct=abs_pct,
        rotatividade_pct=rot_pct,
        capacidade_produtiva=cap,
    )
    db.add(entrega)
    db.commit()
    loaded = db.query(Entrega).options(joinedload(Entrega.unidade)).filter(Entrega.id == entrega.id).first()
    return loaded
