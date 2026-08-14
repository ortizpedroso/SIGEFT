from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Categoria
from app.schemas import CategoriaOut

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaOut])
def list_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()
