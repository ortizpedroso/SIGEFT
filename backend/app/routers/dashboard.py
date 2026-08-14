from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import Unidade, Esforco, Entrega, TipoUnidadeEnum, Categoria, Usuario
from app.schemas import (
    DashboardStatsOut,
    UnidadeChartData,
    CategoriaChartData,
    PerfilCount,
)
from app.services.dimensionamento import dimensionar_unidade, enum_value

router = APIRouter()


@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(db: Session = Depends(get_db)):
    unidades = (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .all()
    )
    total_unidades = len(unidades)
    unidades_apoio_indireto = sum(
        1 for u in unidades if enum_value(u.tipo) == TipoUnidadeEnum.apoio_indireto.value
    )

    now = datetime.now()
    esforcos_mes = (
        db.query(Esforco)
        .options(joinedload(Esforco.entrega).joinedload(Entrega.unidade))
        .filter(
            func.extract("year", Esforco.mes_referencia) == now.year,
            func.extract("month", Esforco.mes_referencia) == now.month,
        )
        .all()
    )

    esforco_total = sum(e.percentual for e in esforcos_mes)
    esforco_indireto = 0.0
    for e in esforcos_mes:
        if e.entrega and e.entrega.unidade and enum_value(e.entrega.unidade.tipo) == TipoUnidadeEnum.apoio_indireto.value:
            esforco_indireto += e.percentual

    pct = (esforco_indireto / esforco_total * 100.0) if esforco_total > 0 else 0.0

    unidades_chart = []
    for u in unidades:
        extra = dimensionar_unidade(u)
        nome = u.nome if len(u.nome) <= 22 else u.nome[:20] + "..."
        unidades_chart.append(
            UnidadeChartData(
                id=u.id,
                nome=nome,
                tipo=enum_value(u.tipo),
                servidores_atuais=extra["servidores_atuais"],
                lotacao_ideal=extra["lotacao_ideal"],
                ips=u.ips or 80,
                categoria_nome=u.categoria.nome if u.categoria else "MGI",
            )
        )

    categorias = db.query(Categoria).all()
    categorias_chart = []
    for c in categorias:
        unis = [u for u in unidades if u.categoria_id == c.id]
        if unis:
            avg_ips = sum((u.ips or 80) for u in unis) / len(unis)
        else:
            avg_ips = c.ips or 80
        nome = c.nome if len(c.nome) <= 18 else c.nome[:16] + "..."
        categorias_chart.append(
            CategoriaChartData(
                id=c.id,
                nome=nome,
                ips_medio=round(avg_ips, 1),
                benchmark_q3=c.ips or 85,
            )
        )

    usuarios = db.query(Usuario).all()
    perfil_counts = [
        PerfilCount(perfil="Gestor", total=sum(1 for u in usuarios if enum_value(u.perfil_dft) == "gestor")),
        PerfilCount(perfil="Executor", total=sum(1 for u in usuarios if enum_value(u.perfil_dft) == "executor")),
        PerfilCount(perfil="Apoio Exclusivo", total=sum(1 for u in usuarios if enum_value(u.perfil_dft) == "apoio_exclusivo")),
    ]

    return DashboardStatsOut(
        total_unidades=total_unidades,
        unidades_apoio_indireto=unidades_apoio_indireto,
        esforco_total_mes=round(esforco_total, 2),
        esforco_apoio_indireto_mes=round(esforco_indireto, 2),
        pct_esforco_indireto=round(pct, 1),
        alerta_cnj=pct > 30.0,
        unidades_chart_data=unidades_chart,
        categorias_chart_data=categorias_chart,
        perfil_dft_counts=perfil_counts,
    )
