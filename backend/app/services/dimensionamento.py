"""Cálculos de dimensionamento (MGI / CNJ 219/2016) compartilhados pela API."""

from typing import Any

from app.models import TipoUnidadeEnum, Unidade


def capacidade_produtiva(
    carga_horaria_media: float,
    volume_mensal: float,
    absenteismo_pct: float,
    rotatividade_pct: float,
) -> float:
    fator = max(0.5, 1 - ((absenteismo_pct or 0) + (rotatividade_pct or 0)) / 100.0)
    ch = carga_horaria_media or 0
    vol = volume_mensal or 0
    return round((ch / fator) * vol)


def dimensionar_unidade(unidade: Unidade) -> dict[str, Any]:
    n_users = len(unidade.usuarios or [])
    n_entregas = len(unidade.entregas or [])
    tipo = unidade.tipo
    tipo_val = tipo.value if hasattr(tipo, "value") else str(tipo)
    servidores = n_users if n_users > 0 else (4 if tipo_val == TipoUnidadeEnum.apoio_indireto.value else 6)
    cat_ips = unidade.categoria.ips if unidade.categoria else None
    unit_ips = unidade.ips if unidade.ips is not None else (cat_ips if cat_ips is not None else 80.0)
    multiplicador = 1 + (n_entregas * 0.25)
    base = (float(unit_ips) / 80.0) * 3 * multiplicador
    lotacao_ideal = max(1, round(base))
    balanco = servidores - lotacao_ideal
    if balanco < 0:
        status = "deficit"
    elif balanco > 0:
        status = "excesso"
    else:
        status = "ideal"
    return {
        "servidores_atuais": servidores,
        "lotacao_ideal": lotacao_ideal,
        "balanco": balanco,
        "status_dimensionamento": status,
    }


def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)
