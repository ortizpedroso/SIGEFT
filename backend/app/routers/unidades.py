from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import Unidade, TipoUnidadeEnum, Usuario, UnidadePerfilVaga, Habilidade, NivelEscolaridadeEnum
from app.schemas import UnidadeCreate, UnidadeOut, ComposicaoVinculoOut, PerfilVagaCreate, PerfilVagaOut, HabilidadeOut
from app.core.security import get_current_user, require_roles
from app.services.dimensionamento import dimensionar_unidade, enum_value, composicao_vinculo

router = APIRouter()


def _to_out(unidade: Unidade) -> UnidadeOut:
    extra = dimensionar_unidade(unidade)
    comp = composicao_vinculo(unidade)
    return UnidadeOut(
        id=unidade.id,
        nome=unidade.nome,
        tipo=enum_value(unidade.tipo),
        categoria_id=unidade.categoria_id,
        ips=unidade.ips,
        categoria=unidade.categoria,
        composicao_vinculo=ComposicaoVinculoOut(**comp),
        **extra,
    )


def _load_unidades(db: Session):
    return (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
            joinedload(Unidade.servidores),
        )
        .all()
    )


@router.get("/unidades", response_model=List[UnidadeOut])
def list_unidades(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return [_to_out(u) for u in _load_unidades(db)]


@router.post("/unidades", response_model=UnidadeOut, status_code=201)
def create_unidade(
    unidade_in: UnidadeCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
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
            joinedload(Unidade.servidores),
        )
        .filter(Unidade.id == unidade.id)
        .first()
    )
    return _to_out(loaded)


def _perfil_to_out(perfil: UnidadePerfilVaga) -> PerfilVagaOut:
    return PerfilVagaOut(
        id=perfil.id,
        unidade_id=perfil.unidade_id,
        nome_perfil=perfil.nome_perfil,
        quantidade=perfil.quantidade,
        nivel_escolaridade=enum_value(perfil.nivel_escolaridade),
        habilidades=[HabilidadeOut(id=h.id, nome=h.nome) for h in (perfil.habilidades or [])],
    )


def _get_unidade_or_404(db: Session, unidade_id: str) -> Unidade:
    unidade = db.query(Unidade).filter(Unidade.id == unidade_id).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    return unidade


@router.get("/unidades/{unidade_id}/perfis-vaga", response_model=List[PerfilVagaOut])
def list_perfis_vaga(
    unidade_id: str,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    _get_unidade_or_404(db, unidade_id)
    perfis = (
        db.query(UnidadePerfilVaga)
        .options(joinload(UnidadePerfilVaga.habilidades))
        .filter(UnidadePerfilVaga.unidade_id == unidade_id)
        .order_by(UnidadePerfilVaga.nome_perfil)
        .all()
    )
    return [_perfil_to_out(p) for p in perfis]


@router.post("/unidades/{unidade_id}/perfis-vaga", response_model=PerfilVagaOut, status_code=201)
def create_perfil_vaga(
    unidade_id: str,
    payload: PerfilVagaCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    _get_unidade_or_404(db, unidade_id)
    if payload.nivel_escolaridade not in {item.value for item in NivelEscolaridadeEnum}:
        raise HTTPException(status_code=400, detail="nivel_escolaridade deve ser medio ou superior.")

    habilidades: list[Habilidade] = []
    if payload.habilidade_ids:
        habilidades = db.query(Habilidade).filter(Habilidade.id.in_(payload.habilidade_ids)).all()
        if len(habilidades) != len(set(payload.habilidade_ids)):
            raise HTTPException(status_code=400, detail="Uma ou mais habilidades informadas não existem.")

    perfil = UnidadePerfilVaga(
        unidade_id=unidade_id,
        nome_perfil=payload.nome_perfil.strip(),
        quantidade=payload.quantidade,
        nivel_escolaridade=NivelEscolaridadeEnum(payload.nivel_escolaridade),
        habilidades=habilidades,
    )
    db.add(perfil)
    db.commit()
    db.refresh(perfil)
    return _perfil_to_out(perfil)


@router.delete("/unidades/{unidade_id}/perfis-vaga/{perfil_id}", status_code=204)
def delete_perfil_vaga(
    unidade_id: str,
    perfil_id: str,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    perfil = (
        db.query(UnidadePerfilVaga)
        .filter(UnidadePerfilVaga.id == perfil_id, UnidadePerfilVaga.unidade_id == unidade_id)
        .first()
    )
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de vaga não encontrado.")
    db.delete(perfil)
    db.commit()
    return None
