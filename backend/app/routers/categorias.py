from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Categoria, Usuario
from app.schemas import CategoriaOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("/categorias", response_model=List[CategoriaOut])
def list_categorias(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return db.query(Categoria).all()
