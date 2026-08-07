from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Unidade
from app.schemas import UnidadeCreate, UnidadeOut

router = APIRouter()

@router.get("/unidades", response_model=List[UnidadeOut])
def list_unidades(db: Session = Depends(get_db)):
    return db.query(Unidade).all()

@router.post("/unidades", response_model=UnidadeOut, status_code=201)
def create_unidade(unidade_in: UnidadeCreate, db: Session = Depends(get_db)):
    unidade = Unidade(**unidade_in.model_dump())
    db.add(unidade)
    db.commit()
    db.refresh(unidade)
    return unidade
