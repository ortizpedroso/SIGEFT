from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.database import get_db
from app.models import Unidade, Esforco, Entrega, TipoUnidadeEnum
from app.schemas import DashboardStatsOut

router = APIRouter()

@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_unidades = db.query(Unidade).count()
    unidades_apoio_indireto = db.query(Unidade).filter(Unidade.tipo == TipoUnidadeEnum.apoio_indireto).count()

    now = datetime.now()
    esforcos_mes = (
        db.query(Esforco)
        .filter(
            func.extract("year", Esforco.mes_referencia) == now.year,
            func.extract("month", Esforco.mes_referencia) == now.month,
        )
        .all()
    )

    esforco_total = sum(e.percentual for e in esforcos_mes)
    esforco_indireto = 0.0

    for e in esforcos_mes:
        if e.entrega and e.entrega.unidade and e.entrega.unidade.tipo == TipoUnidadeEnum.apoio_indireto:
            esforco_indireto += e.percentual

    pct = (esforco_indireto / esforco_total * 100.0) if esforco_total > 0 else 0.0

    return DashboardStatsOut(
        total_unidades=total_unidades,
        unidades_apoio_indireto=unidades_apoio_indireto,
        esforco_total_mes=round(esforco_total, 2),
        esforco_apoio_indireto_mes=round(esforco_indireto, 2),
        pct_esforco_indireto=round(pct, 1),
        alerta_cnj=pct > 30.0,
    )
