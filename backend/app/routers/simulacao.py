from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import numpy as np

from app.database import get_db
from app.models import Unidade, Usuario, SimulacaoLog
from app.schemas import (
    LotacaoRequest,
    SimulacaoOut,
    RealocacaoRequest,
    RealocacaoOut,
    UnidadeRealocacaoOut,
    RealocacaoResumo,
    SimulacaoHistoricoOut,
    SimulacaoHistoricoItem,
)
from app.core.security import require_roles
from app.services.dimensionamento import dimensionar_unidade, balanco_e_status
from app.services.simulacao_log import registrar_simulacao

router = APIRouter()


@router.post("/simulacao/lotacao", response_model=SimulacaoOut)
def calcular_lotacao(
    req: LotacaoRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("gestor")),
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
        result = SimulacaoOut(
            q3=round(q3, 2),
            fallback=round(mediana, 2),
            strategy="median",
            value=round(mediana, 2),
        )
    else:
        result = SimulacaoOut(
            q3=round(q3, 2),
            fallback=round(mediana, 2),
            strategy="q3",
            value=round(q3, 2),
        )

    registrar_simulacao(
        db,
        user,
        "q3_mediana",
        req.model_dump(),
        result.model_dump(),
    )
    return result


@router.post("/simulacao/realocacao", response_model=RealocacaoOut)
def simular_realocacao(
    req: RealocacaoRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("gestor")),
):
    unidade_ids = set()
    for mov in req.movimentacoes:
        unidade_ids.add(mov.unidade_origem_id)
        unidade_ids.add(mov.unidade_destino_id)

    unidades = (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .filter(Unidade.id.in_(unidade_ids))
        .all()
    )
    unidades_map = {u.id: u for u in unidades}

    for uid in unidade_ids:
        if uid not in unidades_map:
            raise HTTPException(status_code=404, detail=f"Unidade não encontrada: {uid}")

    estado_antes: dict[str, dict] = {}
    for uid in unidade_ids:
        u = unidades_map[uid]
        dim = dimensionar_unidade(u)
        estado_antes[uid] = {
            "nome": u.nome,
            "servidores": dim["servidores_atuais"],
            "lotacao_ideal": dim["lotacao_ideal"],
            "balanco": dim["balanco"],
            "status": dim["status_dimensionamento"],
        }

    deltas: dict[str, int] = {uid: 0 for uid in unidade_ids}
    total_movimentado = 0
    for mov in req.movimentacoes:
        deltas[mov.unidade_origem_id] -= mov.quantidade
        deltas[mov.unidade_destino_id] += mov.quantidade
        total_movimentado += mov.quantidade

    for uid, delta in deltas.items():
        depois = estado_antes[uid]["servidores"] + delta
        if depois < 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Movimentação inválida: a unidade '{estado_antes[uid]['nome']}' "
                    f"ficaria com efetivo negativo ({depois} servidores)."
                ),
            )

    unidades_afetadas: list[UnidadeRealocacaoOut] = []
    pioraram = 0
    melhoraram = 0

    for uid in unidade_ids:
        antes = estado_antes[uid]
        servidores_depois = antes["servidores"] + deltas[uid]
        lotacao_ideal = antes["lotacao_ideal"]
        balanco_depois, status_depois = balanco_e_status(servidores_depois, lotacao_ideal)

        abs_antes = abs(antes["balanco"])
        abs_depois = abs(balanco_depois)
        if abs_depois > abs_antes:
            pioraram += 1
        elif abs_depois < abs_antes:
            melhoraram += 1

        unidades_afetadas.append(
            UnidadeRealocacaoOut(
                unidade_id=uid,
                nome=antes["nome"],
                servidores_atuais_antes=antes["servidores"],
                servidores_atuais_depois=servidores_depois,
                lotacao_ideal=lotacao_ideal,
                balanco_antes=antes["balanco"],
                balanco_depois=balanco_depois,
                status_antes=antes["status"],
                status_depois=status_depois,
            )
        )

    result = RealocacaoOut(
        unidades_afetadas=sorted(unidades_afetadas, key=lambda x: x.nome),
        resumo=RealocacaoResumo(
            total_movimentado=total_movimentado,
            unidades_que_pioraram=pioraram,
            unidades_que_melhoraram=melhoraram,
        ),
    )

    registrar_simulacao(
        db,
        user,
        "realocacao",
        req.model_dump(),
        result.model_dump(),
    )
    return result


@router.get("/simulacao/historico", response_model=SimulacaoHistoricoOut)
def listar_historico_simulacoes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    import json

    query = db.query(SimulacaoLog).options(joinedload(SimulacaoLog.usuario))
    total = query.count()
    logs = (
        query.order_by(SimulacaoLog.criado_em.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for log in logs:
        items.append(
            SimulacaoHistoricoItem(
                id=log.id,
                tipo=log.tipo,
                usuario_email=log.usuario.email if log.usuario else "—",
                criado_em=log.criado_em.isoformat() if log.criado_em else "",
                payload_entrada=json.loads(log.payload_entrada),
                payload_resultado=json.loads(log.payload_resultado),
            )
        )

    return SimulacaoHistoricoOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
