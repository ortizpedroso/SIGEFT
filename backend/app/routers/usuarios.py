from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Usuario
from app.schemas import UsuarioOut
from app.core.security import get_current_user
from app.services.dimensionamento import enum_value

router = APIRouter()


@router.get("/usuarios", response_model=List[UsuarioOut])
def list_usuarios(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    usuarios = db.query(Usuario).options(joinedload(Usuario.unidade)).all()
    return [
        UsuarioOut(
            id=u.id,
            email=u.email,
            perfil_dft=enum_value(u.perfil_dft),
            unidade_id=u.unidade_id,
            unidade=u.unidade,
        )
        for u in usuarios
    ]
