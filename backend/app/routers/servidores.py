from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import (
    Habilidade,
    NivelEscolaridadeEnum,
    Servidor,
    StatusLotacaoEnum,
    Usuario,
)
from app.schemas import ServidorBasicoOut, ServidorUpdate
from app.services.compatibilidade import enum_value

router = APIRouter()


def _to_basico(servidor: Servidor) -> ServidorBasicoOut:
    return ServidorBasicoOut(
        id=servidor.id,
        matricula=servidor.matricula,
        nome=servidor.nome,
        nivel_escolaridade=enum_value(servidor.nivel_escolaridade)
        if servidor.nivel_escolaridade
        else None,
        status_lotacao=enum_value(servidor.status_lotacao),
        unidade_id=servidor.unidade_id,
        unidade_nome=servidor.unidade.nome if servidor.unidade else None,
        habilidades=[{"id": h.id, "nome": h.nome} for h in (servidor.habilidades or [])],
    )


def _load_servidor(db: Session, servidor_id: str) -> Servidor:
    servidor = (
        db.query(Servidor)
        .options(joinedload(Servidor.habilidades), joinedload(Servidor.unidade))
        .filter(Servidor.id == servidor_id)
        .first()
    )
    if not servidor:
        raise HTTPException(status_code=404, detail="Servidor não encontrado.")
    return servidor


def _replace_habilidades(db: Session, servidor: Servidor, habilidade_ids: list[str]) -> None:
    if not habilidade_ids:
        servidor.habilidades = []
        return
    habilidades = db.query(Habilidade).filter(Habilidade.id.in_(habilidade_ids)).all()
    if len(habilidades) != len(set(habilidade_ids)):
        raise HTTPException(status_code=400, detail="Uma ou mais habilidades informadas não existem.")
    servidor.habilidades = habilidades


@router.get("/servidores", response_model=list[ServidorBasicoOut])
def listar_servidores(
    busca: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("rh", "gestor")),
):
    """Listagem geral de servidores, para a tela de Cadastro de Competências (RH).
    Leitura liberada também para gestor (oversight), mas a edição
    (PATCH /servidores/{id}) é exclusiva do perfil RH."""
    query = db.query(Servidor).options(joinedload(Servidor.habilidades), joinedload(Servidor.unidade))
    termo = busca.strip()
    if termo:
        like = f"%{termo}%"
        query = query.filter(
            (Servidor.nome.ilike(like)) | (Servidor.matricula.ilike(like))
        )
    servidores = (
        query.order_by(Servidor.nome)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_to_basico(s) for s in servidores]


@router.get("/servidores/lotados", response_model=list[ServidorBasicoOut])
def listar_servidores_lotados(
    busca: str = Query("", max_length=200),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    query = (
        db.query(Servidor)
        .options(joinedload(Servidor.habilidades), joinedload(Servidor.unidade))
        .filter(
            Servidor.status_lotacao == StatusLotacaoEnum.lotado,
            Servidor.unidade_id.isnot(None),
        )
    )
    termo = busca.strip()
    if termo:
        like = f"%{termo}%"
        query = query.filter(
            (Servidor.nome.ilike(like)) | (Servidor.matricula.ilike(like))
        )
    servidores = query.order_by(Servidor.nome).limit(50).all()
    return [_to_basico(s) for s in servidores]


@router.patch("/servidores/{servidor_id}", response_model=ServidorBasicoOut)
def atualizar_servidor(
    servidor_id: str,
    payload: ServidorUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("rh")),
):
    servidor = _load_servidor(db, servidor_id)

    fields_set = payload.model_dump(exclude_unset=True)

    if "nivel_escolaridade" in fields_set:
        raw_nivel = fields_set["nivel_escolaridade"]
        if raw_nivel is None:
            servidor.nivel_escolaridade = None
        elif raw_nivel not in {item.value for item in NivelEscolaridadeEnum}:
            raise HTTPException(status_code=400, detail="nivel_escolaridade deve ser medio ou superior.")
        else:
            servidor.nivel_escolaridade = NivelEscolaridadeEnum(raw_nivel)

    if payload.habilidade_ids is not None:
        _replace_habilidades(db, servidor, payload.habilidade_ids)

    db.commit()
    db.refresh(servidor)
    return _to_basico(servidor)


@router.post("/servidores/{servidor_id}/liberar-realocacao", response_model=ServidorBasicoOut)
def liberar_realocacao(
    servidor_id: str,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    servidor = _load_servidor(db, servidor_id)
    if servidor.unidade_id is None and servidor.status_lotacao == StatusLotacaoEnum.sem_lotacao:
        raise HTTPException(
            status_code=400,
            detail="Servidor sem lotação não precisa ser liberado — já está disponível.",
        )
    servidor.status_lotacao = StatusLotacaoEnum.disponivel_realocacao
    db.commit()
    db.refresh(servidor)
    return _to_basico(servidor)


@router.post("/servidores/{servidor_id}/cancelar-liberacao", response_model=ServidorBasicoOut)
def cancelar_liberacao(
    servidor_id: str,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    servidor = _load_servidor(db, servidor_id)
    if servidor.status_lotacao != StatusLotacaoEnum.disponivel_realocacao:
        raise HTTPException(status_code=400, detail="Servidor não está liberado para realocação.")
    if not servidor.unidade_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Não é possível voltar para 'lotado': este servidor não possui unidade de origem "
                "cadastrada. Atribua uma unidade antes de cancelar a liberação."
            ),
        )
    servidor.status_lotacao = StatusLotacaoEnum.lotado
    db.commit()
    db.refresh(servidor)
    return _to_basico(servidor)
