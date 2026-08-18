import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import SimulacaoLog, Usuario


def registrar_simulacao(
    db: Session,
    usuario: Usuario,
    tipo: str,
    payload_entrada: Any,
    payload_resultado: Any,
) -> None:
    db.add(
        SimulacaoLog(
            usuario_id=usuario.id,
            tipo=tipo,
            payload_entrada=json.dumps(payload_entrada, ensure_ascii=False, default=str),
            payload_resultado=json.dumps(payload_resultado, ensure_ascii=False, default=str),
        )
    )
    db.commit()
