from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Parametro, ParametroLog, Usuario
from app.schemas import MotorPonderacao, ParametroHistoricoItem, ParametroHistoricoOut
from app.core.security import get_current_user, require_roles

router = APIRouter()

KEYS = {
    "pesoVolume": "PESO_VOLUME",
    "pesoComplexidade": "PESO_COMPLEXIDADE",
    "pesoCriticidade": "PESO_CRITICIDADE",
    "toleranciaDesvio": "TOLERANCIA_DESVIO",
}

LABELS = {
    "PESO_VOLUME": "Peso Volume",
    "PESO_COMPLEXIDADE": "Peso Complexidade",
    "PESO_CRITICIDADE": "Peso Criticidade",
    "TOLERANCIA_DESVIO": "Tolerância de Desvio",
}

DEFAULTS = {
    "PESO_VOLUME": 0.40,
    "PESO_COMPLEXIDADE": 0.35,
    "PESO_CRITICIDADE": 0.25,
    "TOLERANCIA_DESVIO": 20.0,
}


def _read_config(db: Session) -> MotorPonderacao:
    rows = {p.chave: p.valor for p in db.query(Parametro).all()}
    return MotorPonderacao(
        pesoVolume=rows.get("PESO_VOLUME", DEFAULTS["PESO_VOLUME"]),
        pesoComplexidade=rows.get("PESO_COMPLEXIDADE", DEFAULTS["PESO_COMPLEXIDADE"]),
        pesoCriticidade=rows.get("PESO_CRITICIDADE", DEFAULTS["PESO_CRITICIDADE"]),
        toleranciaDesvio=rows.get("TOLERANCIA_DESVIO", DEFAULTS["TOLERANCIA_DESVIO"]),
    )


@router.get("/ponderacao", response_model=MotorPonderacao)
def get_ponderacao(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return _read_config(db)


@router.post("/ponderacao", response_model=MotorPonderacao)
def save_ponderacao(
    config: MotorPonderacao,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    payload = {
        "PESO_VOLUME": config.pesoVolume,
        "PESO_COMPLEXIDADE": config.pesoComplexidade,
        "PESO_CRITICIDADE": config.pesoCriticidade,
        "TOLERANCIA_DESVIO": config.toleranciaDesvio,
    }
    for chave, valor in payload.items():
        row = db.query(Parametro).filter(Parametro.chave == chave).first()
        valor_anterior = row.valor if row else DEFAULTS[chave]
        if valor_anterior != valor:
            db.add(
                ParametroLog(
                    usuario_id=_user.id,
                    chave=chave,
                    valor_anterior=valor_anterior,
                    valor_novo=valor,
                )
            )
        if row:
            row.valor = valor
        else:
            db.add(Parametro(chave=chave, valor=valor))
    db.commit()
    return _read_config(db)


@router.get("/parametros/historico", response_model=ParametroHistoricoOut)
def listar_historico_parametros(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    query = db.query(ParametroLog).options(joinedload(ParametroLog.usuario))
    total = query.count()
    logs = (
        query.order_by(ParametroLog.alterado_em.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        ParametroHistoricoItem(
            id=log.id,
            chave=log.chave,
            valor_anterior=log.valor_anterior,
            valor_novo=log.valor_novo,
            alterado_em=log.alterado_em.isoformat() if log.alterado_em else "",
            usuario_email=log.usuario.email if log.usuario else "—",
        )
        for log in logs
    ]
    return ParametroHistoricoOut(items=items, total=total, page=page, page_size=page_size)
