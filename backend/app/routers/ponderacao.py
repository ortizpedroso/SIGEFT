from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Parametro, Usuario
from app.schemas import MotorPonderacao
from app.core.security import get_current_user

router = APIRouter()

KEYS = {
    "pesoVolume": "PESO_VOLUME",
    "pesoComplexidade": "PESO_COMPLEXIDADE",
    "pesoCriticidade": "PESO_CRITICIDADE",
    "toleranciaDesvio": "TOLERANCIA_DESVIO",
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
def get_ponderacao(db: Session = Depends(get_db)):
    return _read_config(db)


@router.post("/ponderacao", response_model=MotorPonderacao)
def save_ponderacao(
    config: MotorPonderacao,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    payload = {
        "PESO_VOLUME": config.pesoVolume,
        "PESO_COMPLEXIDADE": config.pesoComplexidade,
        "PESO_CRITICIDADE": config.pesoCriticidade,
        "TOLERANCIA_DESVIO": config.toleranciaDesvio,
    }
    for chave, valor in payload.items():
        row = db.query(Parametro).filter(Parametro.chave == chave).first()
        if row:
            row.valor = valor
        else:
            db.add(Parametro(chave=chave, valor=valor))
    db.commit()
    return _read_config(db)
