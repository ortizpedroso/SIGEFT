from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import Esforco, Usuario, PerfilDFTEnum, Entrega
from app.schemas import EsforcoCreate, EsforcoOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("/esforcos", response_model=List[EsforcoOut])
def list_esforcos(db: Session = Depends(get_db)):
    return (
        db.query(Esforco)
        .options(
            joinedload(Esforco.usuario),
            joinedload(Esforco.entrega).joinedload(Entrega.unidade),
        )
        .all()
    )


@router.post("/esforcos", response_model=EsforcoOut, status_code=201)
def create_esforco(
    esforco_in: EsforcoCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    usuario = db.query(Usuario).filter(Usuario.id == esforco_in.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if usuario.perfil_dft == PerfilDFTEnum.apoio_exclusivo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuários com perfil de apoio exclusivo não podem cadastrar esforços.",
        )

    ano = esforco_in.mes_referencia.year
    mes = esforco_in.mes_referencia.month

    total_existente = (
        db.query(func.coalesce(func.sum(Esforco.percentual), 0.0))
        .filter(
            Esforco.usuario_id == esforco_in.usuario_id,
            func.extract("year", Esforco.mes_referencia) == ano,
            func.extract("month", Esforco.mes_referencia) == mes,
        )
        .scalar()
    )

    if total_existente + esforco_in.percentual > 100.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A soma dos percentuais de esforço para este usuário no mês não pode ultrapassar 100%.",
        )

    esforco = Esforco(**esforco_in.model_dump())
    db.add(esforco)
    db.commit()
    loaded = (
        db.query(Esforco)
        .options(
            joinedload(Esforco.usuario),
            joinedload(Esforco.entrega).joinedload(Entrega.unidade),
        )
        .filter(Esforco.id == esforco.id)
        .first()
    )
    return loaded
