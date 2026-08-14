from datetime import datetime, timezone
import os
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ConfigTexto,
    Entrega,
    Esforco,
    IntegracaoCheck,
    Parametro,
    ParecerSEI,
    Unidade,
    Usuario,
)
from app.core.security import get_current_user, require_roles

router = APIRouter()

SANDBOX_KEY = "INTEGRACAO_SANDBOX_URL"

CATALOGO = [
    {
        "id": "metrica_health",
        "nome": "API Métrica",
        "grupo": "local",
        "descricao": "A própria API do Métrica responde (este serviço).",
        "kind": "local",
    },
    {
        "id": "local_unidades",
        "nome": "Unidades e lotação",
        "grupo": "local",
        "descricao": "Cadastro relacional de unidades no PostgreSQL.",
        "kind": "local",
    },
    {
        "id": "local_entregas",
        "nome": "Entregas e capacidade",
        "grupo": "local",
        "descricao": "Portfólio de entregas mapeado no Métrica.",
        "kind": "local",
    },
    {
        "id": "local_esforcos",
        "nome": "Alocação de esforços",
        "grupo": "local",
        "descricao": "Registros de esforço mensal dos servidores.",
        "kind": "local",
    },
    {
        "id": "local_ponderacao",
        "nome": "Motor de ponderação",
        "grupo": "local",
        "descricao": "Pesos MGI gravados em parametros.",
        "kind": "local",
    },
    {
        "id": "local_sei_minutas",
        "nome": "Instrução SEI (minutas)",
        "grupo": "local",
        "descricao": "Módulo interno de pareceres — distinto deste checklist.",
        "kind": "local",
    },
    {
        "id": "sandbox_health",
        "nome": "Sandbox — health",
        "grupo": "sandbox",
        "descricao": "GET {sandbox}/health",
        "kind": "sandbox",
        "path": "/health",
    },
    {
        "id": "sandbox_auth",
        "nome": "Sandbox — autenticação",
        "grupo": "sandbox",
        "descricao": "GET {sandbox}/auth/health",
        "kind": "sandbox",
        "path": "/auth/health",
    },
    {
        "id": "sandbox_sei",
        "nome": "Sandbox — SEI",
        "grupo": "sandbox",
        "descricao": "GET {sandbox}/sei/health",
        "kind": "sandbox",
        "path": "/sei/health",
    },
    {
        "id": "sandbox_folha",
        "nome": "Sandbox — Folha / RH",
        "grupo": "sandbox",
        "descricao": "GET {sandbox}/folha/health",
        "kind": "sandbox",
        "path": "/folha/health",
    },
    {
        "id": "sandbox_unidades",
        "nome": "Sandbox — unidades externas",
        "grupo": "sandbox",
        "descricao": "GET {sandbox}/unidades/health",
        "kind": "sandbox",
        "path": "/unidades/health",
    },
]


class SandboxConfigIn(BaseModel):
    sandbox_url: str = Field(default="", max_length=500)


class TesteIn(BaseModel):
    id: Optional[str] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _read_sandbox_url(db: Session) -> str:
    row = db.query(ConfigTexto).filter(ConfigTexto.chave == SANDBOX_KEY).first()
    if row and row.valor.strip():
        return row.valor.strip()
    return os.getenv("INTEGRACAO_SANDBOX_URL", "").strip()


def _validate_sandbox_url(url: str) -> str:
    raw = url.strip().rstrip("/")
    if not raw:
        return ""
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="URL sandbox inválida. Use http(s)://host[:porta][/caminho].")
    return raw


def _upsert_check(db: Session, check_id: str, status_value: str, detalhe: str) -> IntegracaoCheck:
    row = db.query(IntegracaoCheck).filter(IntegracaoCheck.id == check_id).first()
    if row:
        row.status = status_value
        row.detalhe = detalhe
        row.testado_em = _now()
    else:
        row = IntegracaoCheck(id=check_id, status=status_value, detalhe=detalhe, testado_em=_now())
        db.add(row)
    return row


def _run_local(db: Session, item: dict) -> tuple[str, str]:
    cid = item["id"]
    if cid == "metrica_health":
        return "ok", "API do Métrica no ar."
    if cid == "local_unidades":
        n = db.query(Unidade).count()
        return "ok", f"{n} unidade(s) cadastrada(s)."
    if cid == "local_entregas":
        n = db.query(Entrega).count()
        return "ok", f"{n} entrega(s) cadastrada(s)."
    if cid == "local_esforcos":
        n = db.query(Esforco).count()
        return "ok", f"{n} esforço(s) registrado(s)."
    if cid == "local_ponderacao":
        n = db.query(Parametro).count()
        return "ok", f"{n} parâmetro(s) no motor."
    if cid == "local_sei_minutas":
        n = db.query(ParecerSEI).count()
        return "ok", f"{n} minuta(s) SEI no Métrica."
    return "falha", "Check local desconhecido."


def _run_sandbox(base: str, item: dict) -> tuple[str, str]:
    if not base:
        return "aguardando", "Informe a URL da API sandbox para testar este item."
    path = item.get("path") or "/health"
    url = urljoin(base.rstrip("/") + "/", path.lstrip("/"))
    try:
        with httpx.Client(timeout=5.0, follow_redirects=True) as client:
            res = client.get(url)
        if 200 <= res.status_code < 400:
            return "ok", f"{res.status_code} {url}"
        return "falha", f"HTTP {res.status_code} em {url}"
    except httpx.HTTPError as exc:
        return "falha", f"Erro ao chamar {url}: {exc}"


def _catalogo_com_resultados(db: Session, sandbox_url: str) -> list[dict]:
    rows = {r.id: r for r in db.query(IntegracaoCheck).all()}
    out = []
    for item in CATALOGO:
        saved = rows.get(item["id"])
        out.append(
            {
                "id": item["id"],
                "nome": item["nome"],
                "grupo": item["grupo"],
                "descricao": item["descricao"],
                "kind": item["kind"],
                "path": item.get("path"),
                "status": saved.status if saved else "pendente",
                "detalhe": saved.detalhe if saved else None,
                "testado_em": saved.testado_em if saved else None,
                "sandbox_obrigatorio": item["kind"] == "sandbox" and not sandbox_url,
            }
        )
    return out


@router.get("/integracao")
def get_integracao(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    sandbox_url = _read_sandbox_url(db)
    items = _catalogo_com_resultados(db, sandbox_url)
    ok = sum(1 for i in items if i["status"] == "ok")
    return {
        "sandbox_url": sandbox_url,
        "resumo": {"ok": ok, "total": len(items)},
        "items": items,
    }


@router.post("/integracao")
def save_sandbox(
    payload: SandboxConfigIn,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    url = _validate_sandbox_url(payload.sandbox_url)
    row = db.query(ConfigTexto).filter(ConfigTexto.chave == SANDBOX_KEY).first()
    if row:
        row.valor = url
    else:
        db.add(ConfigTexto(chave=SANDBOX_KEY, valor=url))
    db.commit()
    return get_integracao(db, _user)


@router.post("/integracao/testar")
def testar(
    payload: TesteIn,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    sandbox_url = _read_sandbox_url(db)
    alvos = CATALOGO
    if payload.id:
        alvos = [i for i in CATALOGO if i["id"] == payload.id]
        if not alvos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do checklist não encontrado.")
    for item in alvos:
        if item["kind"] == "local":
            st, det = _run_local(db, item)
        else:
            st, det = _run_sandbox(sandbox_url, item)
        _upsert_check(db, item["id"], st, det)
    db.commit()
    return get_integracao(db, _user)
