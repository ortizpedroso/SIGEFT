from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np

from app.database import get_db
from app.models import Unidade, Usuario
from app.schemas import LotacaoRequest, SimulacaoOut
from app.core.security import require_roles

router = APIRouter()


@router.post("/simulacao/lotacao", response_model=SimulacaoOut)
def calcular_lotacao(
    req: LotacaoRequest,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    unidades = db.query(Unidade).filter(Unidade.categoria_id == req.categoria_id).all()
    if not unidades:
        raise HTTPException(status_code=404, detail="Categoria sem unidades cadastradas")

    ips_values = [u.ips for u in unidades if u.ips is not None]
    if not ips_values:
        raise HTTPException(status_code=400, detail="Não há dados de IPS suficientes para cálculo")

    arr = np.array(ips_values)
    q3 = float(np.percentile(arr, 75))
    mediana = float(np.median(arr))

    if req.reducao_percentual and req.reducao_percentual > 30.0:
        return SimulacaoOut(
            q3=round(q3, 2),
            fallback=round(mediana, 2),
            strategy="median",
            value=round(mediana, 2),
        )

    return SimulacaoOut(
        q3=round(q3, 2),
        fallback=round(mediana, 2),
        strategy="q3",
        value=round(q3, 2),
    )
