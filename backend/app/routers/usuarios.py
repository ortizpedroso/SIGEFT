from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_password_hash, require_roles
from app.database import get_db
from app.models import PerfilDFTEnum, Unidade, Usuario
from app.schemas import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.dimensionamento import enum_value

router = APIRouter()

PERFIS_VALIDOS = {item.value for item in PerfilDFTEnum}


def _to_out(usuario: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=usuario.id,
        email=usuario.email,
        perfil_dft=enum_value(usuario.perfil_dft),
        unidade_id=usuario.unidade_id,
        unidade=usuario.unidade,
    )


def _validar_perfil(perfil: str) -> PerfilDFTEnum:
    if perfil not in PERFIS_VALIDOS:
        raise HTTPException(status_code=400, detail="perfil_dft inválido.")
    return PerfilDFTEnum(perfil)


def _validar_unidade(db: Session, unidade_id: str) -> Unidade:
    unidade = db.query(Unidade).filter(Unidade.id == unidade_id).first()
    if not unidade:
        raise HTTPException(status_code=400, detail="Unidade informada não existe.")
    return unidade


@router.get("/usuarios", response_model=List[UsuarioOut])
def list_usuarios(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    usuarios = db.query(Usuario).options(joinedload(Usuario.unidade)).order_by(Usuario.email).all()
    return [_to_out(u) for u in usuarios]


@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
def criar_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")
    _validar_perfil(payload.perfil_dft)
    _validar_unidade(db, payload.unidade_id)
    usuario = Usuario(
        email=payload.email,
        senha_hash=get_password_hash(payload.senha),
        perfil_dft=PerfilDFTEnum(payload.perfil_dft),
        unidade_id=payload.unidade_id,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.unidade))
        .filter(Usuario.id == usuario.id)
        .first()
    )
    return _to_out(usuario)


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioOut)
def atualizar_usuario(
    usuario_id: str,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles("gestor")),
):
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.unidade))
        .filter(Usuario.id == usuario_id)
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    fields = payload.model_dump(exclude_unset=True)
    if "email" in fields:
        existente = db.query(Usuario).filter(Usuario.email == fields["email"], Usuario.id != usuario_id).first()
        if existente:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado.")
        usuario.email = fields["email"]
    if "perfil_dft" in fields:
        _validar_perfil(fields["perfil_dft"])
        usuario.perfil_dft = PerfilDFTEnum(fields["perfil_dft"])
    if "unidade_id" in fields:
        _validar_unidade(db, fields["unidade_id"])
        usuario.unidade_id = fields["unidade_id"]
    if payload.senha:
        usuario.senha_hash = get_password_hash(payload.senha)

    db.commit()
    db.refresh(usuario)
    return _to_out(usuario)


@router.delete("/usuarios/{usuario_id}", status_code=204)
def excluir_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles("gestor")),
):
    if usuario_id == current.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário logado.")
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    db.delete(usuario)
    db.commit()
