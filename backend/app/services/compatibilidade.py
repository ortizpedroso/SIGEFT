"""Matchmaking de servidores disponíveis com unidades em vaga aberta (Etapa 7 MVP)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models import (
    Habilidade,
    NivelEscolaridadeEnum,
    Servidor,
    StatusLotacaoEnum,
    Unidade,
    UnidadePerfilVaga,
)
from app.services.dimensionamento import dimensionar_unidade


def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def escolaridade_atende(
    servidor_nivel: NivelEscolaridadeEnum | None,
    perfil_nivel: NivelEscolaridadeEnum,
) -> bool:
    if servidor_nivel is None:
        return False
    if perfil_nivel == NivelEscolaridadeEnum.medio:
        return servidor_nivel in (
            NivelEscolaridadeEnum.medio,
            NivelEscolaridadeEnum.superior,
        )
    if perfil_nivel == NivelEscolaridadeEnum.superior:
        return servidor_nivel == NivelEscolaridadeEnum.superior
    return False


def calcular_afinidade(servidor_habilidade_ids: set[str], perfil_habilidade_ids: set[str]) -> float:
    if not perfil_habilidade_ids:
        return 100.0
    if not servidor_habilidade_ids:
        return 0.0
    comum = len(servidor_habilidade_ids & perfil_habilidade_ids)
    return (comum / len(perfil_habilidade_ids)) * 100.0


def calcular_score(afinidade: float, em_deficit: bool) -> float:
    score = afinidade + (15.0 if em_deficit else 0.0)
    return min(100.0, score)


def _score_servidor_unidade(
    servidor: Servidor,
    unidade: Unidade,
    servidor_habilidade_ids: set[str],
) -> float | None:
    perfis = unidade.perfis_vaga or []
    if not perfis:
        return None

    dim = dimensionar_unidade(unidade)
    em_deficit = dim["status_dimensionamento"] == "deficit"
    if not em_deficit:
        return None

    melhor: float | None = None
    for perfil in perfis:
        if not escolaridade_atende(servidor.nivel_escolaridade, perfil.nivel_escolaridade):
            continue
        perfil_habs = {h.id for h in (perfil.habilidades or [])}
        afinidade = calcular_afinidade(servidor_habilidade_ids, perfil_habs)
        score = calcular_score(afinidade, em_deficit=True)
        if melhor is None or score > melhor:
            melhor = score
    return melhor


def _load_unidades_candidatas(db: Session) -> list[Unidade]:
    return (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
            joinedload(Unidade.servidores),
            joinedload(Unidade.perfis_vaga).joinedload(UnidadePerfilVaga.habilidades),
        )
        .all()
    )


def _habilidades_servidor(servidor: Servidor) -> list[dict[str, str]]:
    return [{"id": h.id, "nome": h.nome} for h in (servidor.habilidades or [])]


def montar_servidor_disponivel(
    db: Session,
    servidor: Servidor,
    unidades: list[Unidade] | None = None,
) -> dict[str, Any]:
    if unidades is None:
        unidades = _load_unidades_candidatas(db)

    servidor_habs = {h.id for h in (servidor.habilidades or [])}
    candidatas: list[dict[str, Any]] = []

    for unidade in unidades:
        score = _score_servidor_unidade(servidor, unidade, servidor_habs)
        if score is None:
            continue
        dim = dimensionar_unidade(unidade)
        candidatas.append(
            {
                "unidade_id": unidade.id,
                "unidade_nome": unidade.nome,
                "score": round(score, 1),
                "em_deficit": dim["status_dimensionamento"] == "deficit",
                "lotacao_ideal": dim["lotacao_ideal"],
                "servidores_atuais": dim["servidores_atuais"],
            }
        )

    candidatas.sort(key=lambda item: item["score"], reverse=True)
    candidatas = candidatas[:5]

    origem = (
        "liberado"
        if servidor.status_lotacao == StatusLotacaoEnum.disponivel_realocacao
        else "novo"
    )

    return {
        "id": servidor.id,
        "matricula": servidor.matricula,
        "nome": servidor.nome,
        "nivel_escolaridade": enum_value(servidor.nivel_escolaridade)
        if servidor.nivel_escolaridade
        else None,
        "status_lotacao": enum_value(servidor.status_lotacao),
        "unidade_id": servidor.unidade_id,
        "unidade_nome": servidor.unidade.nome if servidor.unidade else None,
        "habilidades": _habilidades_servidor(servidor),
        "origem": origem,
        "unidades_candidatas": candidatas,
    }


def listar_servidores_disponiveis(db: Session) -> list[dict[str, Any]]:
    servidores = (
        db.query(Servidor)
        .options(
            joinedload(Servidor.habilidades),
            joinedload(Servidor.unidade),
        )
        .filter(
            Servidor.status_lotacao.in_(
                [StatusLotacaoEnum.sem_lotacao, StatusLotacaoEnum.disponivel_realocacao]
            )
        )
        .order_by(Servidor.nome)
        .all()
    )
    unidades = _load_unidades_candidatas(db)
    return [montar_servidor_disponivel(db, s, unidades) for s in servidores]
