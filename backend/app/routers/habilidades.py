from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import Habilidade, Usuario
from app.schemas import HabilidadeCreate, HabilidadeOut

router = APIRouter()


@router.get("/habilidades", response_model=list[HabilidadeOut])
def list_habilidades(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    return db.query(Habilidade).order_by(Habilidade.nome).all()


@router.post("/habilidades", response_model=HabilidadeOut, status_code=201)
def create_habilidade(
    payload: HabilidadeCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    nome = payload.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome da habilidade é obrigatório.")
    habilidade = Habilidade(nome=nome)
    db.add(habilidade)
    db.commit()
    db.refresh(habilidade)
    return habilidade
