from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, create_access_token
from app.models import (
    Categoria,
    Unidade,
    Usuario,
    Entrega,
    Esforco,
    Parametro,
    TipoUnidadeEnum,
    PerfilDFTEnum,
    SimulacaoLog,
)


def _auth_header(user_id: str) -> dict:
    token = create_access_token({"sub": user_id})
    return {"Authorization": f"Bearer {token}"}


def _seed_gestor_com_unidades(db: Session):
    cat = Categoria(nome="Cat Etapa3", ips=85)
    db.add(cat)
    db.flush()
    origem = Unidade(nome="Origem Realoc", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=80)
    destino = Unidade(nome="Destino Realoc", tipo=TipoUnidadeEnum.apoio_indireto, categoria_id=cat.id, ips=80)
    db.add_all([origem, destino])
    db.flush()
    gestor = Usuario(
        email="etapa3@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=origem.id,
    )
    db.add(gestor)
    db.add(Parametro(chave="TETO_APOIO_INDIRETO", valor=30.0))
    db.add(Parametro(chave="TOLERANCIA_DESVIO", valor=20.0))
    db.commit()
    return gestor, origem, destino, cat


def test_realocacao_rejeita_efetivo_negativo(client: TestClient, db: Session):
    gestor, origem, destino, _ = _seed_gestor_com_unidades(db)
    headers = _auth_header(gestor.id)
    res = client.post(
        "/api/simulacao/realocacao",
        headers=headers,
        json={
            "movimentacoes": [
                {
                    "unidade_origem_id": origem.id,
                    "unidade_destino_id": destino.id,
                    "quantidade": 999,
                }
            ]
        },
    )
    assert res.status_code == 400
    assert "negativo" in res.json()["detail"].lower()


def test_realocacao_sucesso_e_historico(client: TestClient, db: Session):
    gestor, origem, destino, cat = _seed_gestor_com_unidades(db)
    headers = _auth_header(gestor.id)
    res = client.post(
        "/api/simulacao/realocacao",
        headers=headers,
        json={
            "movimentacoes": [
                {
                    "unidade_origem_id": origem.id,
                    "unidade_destino_id": destino.id,
                    "quantidade": 1,
                }
            ]
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["unidades_afetadas"]) == 2
    assert body["resumo"]["total_movimentado"] == 1

    hist = client.get("/api/simulacao/historico", headers=headers)
    assert hist.status_code == 200
    assert hist.json()["total"] >= 1
    assert hist.json()["items"][0]["tipo"] == "realocacao"


def test_simulacao_q3_grava_historico(client: TestClient, db: Session):
    gestor, _, _, cat = _seed_gestor_com_unidades(db)
    headers = _auth_header(gestor.id)
    res = client.post(
        "/api/simulacao/lotacao",
        headers=headers,
        json={"categoria_id": cat.id, "reducao_percentual": 0},
    )
    assert res.status_code == 200
    assert db.query(SimulacaoLog).filter(SimulacaoLog.tipo == "q3_mediana").count() == 1


def test_rateio_indireto(client: TestClient, db: Session):
    gestor, origem, destino, _ = _seed_gestor_com_unidades(db)
    headers = _auth_header(gestor.id)
    res = client.get("/api/dashboard/rateio-indireto", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["teto_global_pct"] == 30.0
    assert len(body["unidades"]) >= 1
    assert body["unidades"][0]["classificacao"] in ("acima_da_cota", "abaixo_da_cota", "dentro_da_cota")


def test_documentacao_pdf_gestor(client: TestClient, db: Session):
    gestor, _, _, _ = _seed_gestor_com_unidades(db)
    headers = _auth_header(gestor.id)
    res = client.get("/api/documentacao/pdf", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"


def test_documentacao_pdf_negado_executor(client: TestClient, db: Session):
    gestor, origem, _, _ = _seed_gestor_com_unidades(db)
    executor = Usuario(
        email="exec.etapa3@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=origem.id,
    )
    db.add(executor)
    db.commit()
    res = client.get("/api/documentacao/pdf", headers=_auth_header(executor.id))
    assert res.status_code == 403
