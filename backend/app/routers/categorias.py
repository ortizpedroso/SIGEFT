from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Categoria, Usuario
from app.schemas import CategoriaCreate, CategoriaOut
from app.core.security import get_current_user, require_roles

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaOut])
def list_categorias(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return db.query(Categoria).order_by(Categoria.nome).all()


@router.post("/categorias", response_model=CategoriaOut, status_code=201)
def create_categoria(
    body: CategoriaCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    nome = (body.nome or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome da categoria MGI.")
    exists = db.query(Categoria).filter(Categoria.nome == nome).first()
    if exists:
        raise HTTPException(status_code=409, detail="Já existe uma categoria MGI com este nome.")
    cat = Categoria(nome=nome, ips=body.ips if body.ips is not None else 80.0)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
