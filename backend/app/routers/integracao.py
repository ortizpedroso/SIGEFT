from datetime import datetime, timezone
import json
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

# Locais = o que o SIGEP-Força precisa internamente para operar.
# Sandbox = sistemas externos (cada um com URL + chave de API próprias).
CONECTORES = [
    {
        "id": "metrica",
        "nome": "API Métrica (este sistema)",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "FastAPI + PostgreSQL do SIGEP-Força. Sem isso o restante não opera.",
        "dica_falha": "Suba metrica_api e metrica_db: docker compose -f docker-compose.prod.yml logs api",
    },
    {
        "id": "local_unidades",
        "nome": "Cadastro de unidades",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "Secretarias/varas no PostgreSQL — base do dimensionamento.",
        "dica_falha": "Abra Unidades e cadastre ao menos uma unidade, ou rode o seed.",
    },
    {
        "id": "local_entregas",
        "nome": "Entregas e capacidade",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "Portfólio de entregas usado no cálculo de capacidade produtiva.",
        "dica_falha": "Abra Entregas e cadastre o portfólio da unidade.",
    },
    {
        "id": "local_esforcos",
        "nome": "Alocação de esforços",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "Percentuais mensais de dedicação (trava 100%).",
        "dica_falha": "Abra Esforços e registre a alocação do mês.",
    },
    {
        "id": "local_ponderacao",
        "nome": "Motor de ponderação MGI",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "Pesos de complexidade, criticidade, absenteísmo e rotatividade.",
        "dica_falha": "Abra Ponderação e grave os pesos; o seed já cria o padrão.",
    },
    {
        "id": "local_sei_minutas",
        "nome": "Instrução SEI (minutas internas)",
        "obrigatorio": True,
        "precisa_url": False,
        "precisa_chave": False,
        "kind": "local",
        "descricao": "Módulo interno de pareceres. Distinto da API sandbox do SEI.",
        "dica_falha": "Abra Instrução SEI e gere uma minuta de teste.",
    },
    {
        "id": "sei",
        "nome": "SEI TJRR",
        "obrigatorio": True,
        "precisa_url": True,
        "precisa_chave": True,
        "kind": "sandbox",
        "path": "/health",
        "descricao": "Consulta/autuação de processos. URL sandbox + token de API.",
        "dica_falha": "Peça à STI a URL do sandbox SEI e o token. Libere o IP da VPS (187.77.240.125) no firewall deles.",
    },
    {
        "id": "folha",
        "nome": "Folha / RH",
        "obrigatorio": True,
        "precisa_url": True,
        "precisa_chave": True,
        "kind": "sandbox",
        "path": "/health",
        "descricao": "Quantitativo real de servidores (lotação atual). URL sandbox + chave.",
        "dica_falha": "Peça à SGP/RH a URL sandbox da folha e a chave. Sem isso o dimensionamento usa só o cadastro local.",
    },
    {
        "id": "unidades_ext",
        "nome": "Organograma institucional",
        "obrigatorio": False,
        "precisa_url": True,
        "precisa_chave": True,
        "kind": "sandbox",
        "path": "/health",
        "descricao": "Sincroniza secretarias/varas com o catálogo institucional (opcional).",
        "dica_falha": "Se não houver API de organograma, deixe em branco e cadastre em Unidades.",
    },
    {
        "id": "sso",
        "nome": "Identidade / SSO",
        "obrigatorio": False,
        "precisa_url": True,
        "precisa_chave": True,
        "kind": "sandbox",
        "path": "/health",
        "descricao": "Login institucional (opcional). Enquanto ausente, vale o login local.",
        "dica_falha": "URL do IdP sandbox e client secret. HTTP 401 = chave inválida.",
    },
]


class ConectorIn(BaseModel):
    id: str
    sandbox_url: str = Field(default="", max_length=500)
    api_key: Optional[str] = Field(default=None, max_length=2000)


class TesteIn(BaseModel):
    id: Optional[str] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _cfg_key(conector_id: str) -> str:
    return f"INTEGRACAO_{conector_id}"


def _validate_sandbox_url(url: str) -> str:
    raw = url.strip().rstrip("/")
    if not raw:
        return ""
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(
            status_code=400,
            detail="URL sandbox inválida. Use http(s)://host[:porta][/caminho], sem usuário na URL.",
        )
    return raw


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 4:
        return "••••"
    return f"••••{key[-4:]}"


def _load_creds(db: Session, conector_id: str) -> dict:
    row = db.query(ConfigTexto).filter(ConfigTexto.chave == _cfg_key(conector_id)).first()
    if not row or not row.valor:
        env_url = os.getenv(f"INTEGRACAO_{conector_id.upper()}_URL", "").strip()
        env_key = os.getenv(f"INTEGRACAO_{conector_id.upper()}_KEY", "").strip()
        return {"sandbox_url": env_url, "api_key": env_key}
    try:
        data = json.loads(row.valor)
        return {
            "sandbox_url": str(data.get("sandbox_url") or ""),
            "api_key": str(data.get("api_key") or ""),
        }
    except json.JSONDecodeError:
        return {"sandbox_url": row.valor, "api_key": ""}


def _save_creds(db: Session, conector_id: str, url: str, api_key: Optional[str]) -> dict:
    current = _load_creds(db, conector_id)
    if api_key is None:
        key = current["api_key"]
    else:
        key = api_key.strip()
    payload = json.dumps({"sandbox_url": url, "api_key": key})
    row = db.query(ConfigTexto).filter(ConfigTexto.chave == _cfg_key(conector_id)).first()
    if row:
        row.valor = payload
    else:
        db.add(ConfigTexto(chave=_cfg_key(conector_id), valor=payload))
    return {"sandbox_url": url, "api_key": key}


def _upsert_check(db: Session, check_id: str, status_value: str, detalhe: str, evidencia: str = "") -> None:
    blob = json.dumps({"detalhe": detalhe, "evidencia": evidencia}, ensure_ascii=False)
    row = db.query(IntegracaoCheck).filter(IntegracaoCheck.id == check_id).first()
    if row:
        row.status = status_value
        row.detalhe = blob
        row.testado_em = _now()
    else:
        db.add(IntegracaoCheck(id=check_id, status=status_value, detalhe=blob, testado_em=_now()))


def _parse_check(row: Optional[IntegracaoCheck]) -> dict:
    if not row:
        return {"status": "pendente", "detalhe": None, "evidencia": None, "testado_em": None}
    detalhe = row.detalhe
    evidencia = None
    if detalhe:
        try:
            parsed = json.loads(detalhe)
            detalhe = parsed.get("detalhe")
            evidencia = parsed.get("evidencia")
        except json.JSONDecodeError:
            pass
    return {
        "status": row.status,
        "detalhe": detalhe,
        "evidencia": evidencia,
        "testado_em": row.testado_em,
    }


def _dica_http(code: int, item: dict) -> str:
    base = item.get("dica_falha") or "Revise a URL sandbox e a chave de API."
    if code in (401, 403):
        return f"HTTP {code}: a chave de API foi recusada. {base}"
    if code == 404:
        return (
            f"HTTP 404: o caminho {item.get('path', '/health')} não existe nessa URL. "
            "Ajuste a URL sandbox (muitas APIs usam a raiz ou /api/health)."
        )
    if code >= 500:
        return f"HTTP {code}: o sandbox falhou do lado do provedor. Tente de novo ou abra o painel deles."
    return f"HTTP {code}. {base}"


def _run_local(db: Session, item: dict) -> tuple[str, str, str]:
    cid = item["id"]
    if cid == "metrica":
        partes = [
            f"unidades={db.query(Unidade).count()}",
            f"entregas={db.query(Entrega).count()}",
            f"esforcos={db.query(Esforco).count()}",
            f"parametros={db.query(Parametro).count()}",
            f"minutas_sei={db.query(ParecerSEI).count()}",
        ]
        return "ok", "API Métrica e PostgreSQL respondendo.", " · ".join(partes)
    if cid == "local_unidades":
        n = db.query(Unidade).count()
        if n == 0:
            return "falha", "Nenhuma unidade cadastrada. Abra Unidades ou rode o seed.", "unidades=0"
        return "ok", f"{n} unidade(s) no cadastro local.", f"unidades={n}"
    if cid == "local_entregas":
        n = db.query(Entrega).count()
        if n == 0:
            return "falha", "Nenhuma entrega cadastrada. Abra Entregas e inclua o portfólio.", "entregas=0"
        return "ok", f"{n} entrega(s) mapeada(s).", f"entregas={n}"
    if cid == "local_esforcos":
        n = db.query(Esforco).count()
        if n == 0:
            return "aguardando", "Ainda não há esforços no mês. Abra Esforços para registrar.", "esforcos=0"
        return "ok", f"{n} esforço(s) registrado(s).", f"esforcos={n}"
    if cid == "local_ponderacao":
        n = db.query(Parametro).count()
        if n == 0:
            return "falha", "Motor sem parâmetros. Abra Ponderação e grave os pesos.", "parametros=0"
        return "ok", f"{n} parâmetro(s) no motor MGI.", f"parametros={n}"
    if cid == "local_sei_minutas":
        n = db.query(ParecerSEI).count()
        evid = f"minutas_sei={n}"
        if n == 0:
            return "aguardando", "Nenhuma minuta ainda. Abra Instrução SEI e gere um parecer.", evid
        return "ok", f"{n} minuta(s) SEI no Métrica.", evid
    return "falha", "Check local desconhecido.", ""


def _run_sandbox(item: dict, url: str, api_key: str) -> tuple[str, str, str]:
    if item.get("precisa_url") and not url:
        return "aguardando", "Informe a URL sandbox e clique em Salvar e testar.", ""
    if item.get("precisa_chave") and not api_key:
        return "aguardando", "Informe a chave de API e clique em Salvar e testar. O teste roda na hora.", ""
    path = item.get("path") or "/health"
    target = urljoin(url.rstrip("/") + "/", path.lstrip("/"))
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            res = client.get(target, headers=headers)
        snippet = (res.text or "")[:600]
        if 200 <= res.status_code < 400:
            return "ok", f"Conectado ({res.status_code}).", snippet or f"HTTP {res.status_code} sem corpo."
        return "falha", _dica_http(res.status_code, item), snippet
    except httpx.TimeoutException:
        return (
            "falha",
            "Timeout (8s). O sandbox não respondeu. Confira se a URL está no ar e se o firewall libera a VPS.",
            "",
        )
    except httpx.HTTPError as exc:
        return "falha", f"Falha de rede: {exc}. Confira DNS, HTTPS e se o host existe.", ""


def _test_one(db: Session, item: dict) -> None:
    if item["kind"] == "local":
        st, det, ev = _run_local(db, item)
    else:
        creds = _load_creds(db, item["id"])
        st, det, ev = _run_sandbox(item, creds["sandbox_url"], creds["api_key"])
    _upsert_check(db, item["id"], st, det, ev)


def _payload(db: Session) -> dict:
    rows = {r.id: r for r in db.query(IntegracaoCheck).all()}
    items = []
    for item in CONECTORES:
        creds = _load_creds(db, item["id"]) if item["kind"] != "local" else {"sandbox_url": "", "api_key": ""}
        saved = _parse_check(rows.get(item["id"]))
        if item["kind"] == "local":
            st, det, ev = _run_local(db, item)
            saved = {"status": st, "detalhe": det, "evidencia": ev, "testado_em": _now()}
            _upsert_check(db, item["id"], st, det, ev)
        elif saved["status"] == "pendente":
            # Não dispara HTTP no GET: só classifica falta de URL/chave.
            st, det, ev = "aguardando", None, None
            if item.get("precisa_url") and not creds["sandbox_url"]:
                det = "Informe a URL sandbox e clique em Salvar e testar."
            elif item.get("precisa_chave") and not creds["api_key"]:
                det = "Informe a chave de API e clique em Salvar e testar. O teste roda na hora."
            else:
                det = "Credenciais gravadas. Clique em Salvar e testar (ou Testar agora) para validar."
            saved = {"status": st, "detalhe": det, "evidencia": ev, "testado_em": None}
        items.append(
            {
                "id": item["id"],
                "nome": item["nome"],
                "descricao": item["descricao"],
                "obrigatorio": item["obrigatorio"],
                "precisa_url": item["precisa_url"],
                "precisa_chave": item["precisa_chave"],
                "kind": item["kind"],
                "sandbox_url": creds["sandbox_url"],
                "api_key_masked": _mask_key(creds["api_key"]),
                "has_key": bool(creds["api_key"]),
                "status": saved["status"],
                "detalhe": saved["detalhe"],
                "evidencia": saved["evidencia"],
                "dica": item.get("dica_falha"),
                "testado_em": saved["testado_em"],
            }
        )
    ok = sum(1 for i in items if i["status"] == "ok")
    obrigatorios = [i for i in items if i["obrigatorio"]]
    ok_obrig = sum(1 for i in obrigatorios if i["status"] == "ok")
    return {
        "resumo": {
            "ok": ok,
            "total": len(items),
            "obrigatorios_ok": ok_obrig,
            "obrigatorios_total": len(obrigatorios),
        },
        "items": items,
    }


@router.get("/integracao")
def get_integracao(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    payload = _payload(db)
    db.commit()
    return payload


@router.post("/integracao")
def save_conector(
    payload: ConectorIn,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    item = next((c for c in CONECTORES if c["id"] == payload.id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integração desconhecida.")
    if item["kind"] == "local":
        _test_one(db, item)
        db.commit()
        return _payload(db)
    url = _validate_sandbox_url(payload.sandbox_url)
    _save_creds(db, item["id"], url, payload.api_key)
    db.commit()
    _test_one(db, item)
    db.commit()
    return _payload(db)


@router.post("/integracao/testar")
def testar(
    payload: TesteIn,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    alvos = CONECTORES
    if payload.id:
        alvos = [c for c in CONECTORES if c["id"] == payload.id]
        if not alvos:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integração desconhecida.")
    for item in alvos:
        _test_one(db, item)
    db.commit()
    return _payload(db)
