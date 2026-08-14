from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Usuario
from app.core.security import verify_password, create_access_token, get_current_user
from app.schemas import UsuarioMe
from app.services.dimensionamento import enum_value

router = APIRouter()


@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UsuarioMe)
def read_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    user = (
        db.query(Usuario)
        .options(joinedload(Usuario.unidade))
        .filter(Usuario.id == current_user.id)
        .first()
    )
    return UsuarioMe(
        id=user.id,
        email=user.email,
        perfil_dft=enum_value(user.perfil_dft),
        unidade_id=user.unidade_id,
        unidade_nome=user.unidade.nome if user.unidade else None,
    )
