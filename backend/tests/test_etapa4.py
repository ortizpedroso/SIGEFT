import json
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models import (
    Categoria,
    Parametro,
    ParametroLog,
    PerfilDFTEnum,
    Servidor,
    TipoUnidadeEnum,
    Unidade,
    Usuario,
    VinculoServidorEnum,
)
from app.services.dimensionamento import dimensionar_unidade


def _auth_header(user_id: str) -> dict:
    token = create_access_token({"sub": user_id})
    return {"Authorization": f"Bearer {token}"}


def _seed_gestor(db: Session):
    cat = Categoria(nome="Cat Etapa4", ips=85)
    db.add(cat)
    db.flush()
    unidade = Unidade(nome="Unidade Teste Sync", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=80)
    db.add(unidade)
    db.flush()
    gestor = Usuario(
        email="etapa4@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=unidade.id,
    )
    db.add(gestor)
    db.commit()
    return gestor, unidade


def _save_integracao_config(db: Session):
    from app.models import ConfigTexto

    payload = json.dumps({"sandbox_url": "https://sandbox.test/api", "api_key": "chave-teste"})
    db.add(ConfigTexto(chave="INTEGRACAO_API", valor=payload))
    db.commit()


def test_sincronizar_folha_upsert_orfaos_e_atualizacao(client: TestClient, db: Session):
    gestor, unidade = _seed_gestor(db)
    _save_integracao_config(db)
    headers = _auth_header(gestor.id)

    mock_payload = [
        {
            "matricula": "TESTE-001",
            "nome": "Servidor Teste 1",
            "unidade_id": unidade.id,
            "vinculo": "efetivo",
            "cargo": "Cargo Teste A",
        },
        {
            "matricula": "TESTE-002",
            "nome": "Servidor Teste 2",
            "unidade_id": "UNIDADE-INEXISTENTE",
            "vinculo": "cargo_comissionado",
        },
    ]

    class MockResponse:
        status_code = 200

        def json(self):
            return mock_payload

    with patch("httpx.Client.get", return_value=MockResponse()):
        res1 = client.post("/api/integracao/sincronizar-folha", headers=headers)
    assert res1.status_code == 200
    body1 = res1.json()
    assert body1["sincronizados"] == 2
    assert body1["orfaos"] == 1

    servidor1 = db.query(Servidor).filter(Servidor.matricula == "TESTE-001").first()
    assert servidor1 is not None
    assert servidor1.unidade_id == unidade.id
    assert servidor1.vinculo == VinculoServidorEnum.efetivo

    orfao = db.query(Servidor).filter(Servidor.matricula == "TESTE-002").first()
    assert orfao is not None
    assert orfao.unidade_id is None

    mock_payload_update = [
        {
            "matricula": "TESTE-001",
            "nome": "Servidor Teste 1 Atualizado",
            "unidade_id": unidade.id,
            "vinculo": "funcao_confianca",
            "cargo": "Cargo Teste B",
        }
    ]

    class MockResponseUpdate:
        status_code = 200

        def json(self):
            return mock_payload_update

    with patch("httpx.Client.get", return_value=MockResponseUpdate()):
        res2 = client.post("/api/integracao/sincronizar-folha", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["sincronizados"] == 1
    assert db.query(Servidor).count() == 2

    db.refresh(servidor1)
    assert servidor1.nome == "Servidor Teste 1 Atualizado"
    assert servidor1.vinculo == VinculoServidorEnum.funcao_confianca


def test_sincronizar_folha_sem_config_retorna_400(client: TestClient, db: Session):
    gestor, _ = _seed_gestor(db)
    headers = _auth_header(gestor.id)
    res = client.post("/api/integracao/sincronizar-folha", headers=headers)
    assert res.status_code == 400


def test_dimensionar_unidade_usa_servidores_sincronizados(db: Session):
    cat = Categoria(nome="Cat Dim", ips=80)
    db.add(cat)
    db.flush()
    unidade = Unidade(nome="Unidade Dim", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=80)
    db.add(unidade)
    db.flush()
    user = Usuario(
        email="user-dim@test.local",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=unidade.id,
    )
    db.add(user)
    db.flush()
    db.add(
        Servidor(
            matricula="TESTE-DIM-001",
            nome="Servidor Teste Dim",
            unidade_id=unidade.id,
            vinculo=VinculoServidorEnum.efetivo,
            sincronizado_em=datetime.now(timezone.utc),
        )
    )
    db.commit()

    db.refresh(unidade)
    unidade.usuarios = [user]
    unidade.servidores = db.query(Servidor).filter(Servidor.unidade_id == unidade.id).all()

    result = dimensionar_unidade(unidade)
    assert result["servidores_atuais"] == 1


def test_dimensionar_unidade_fallback_sem_servidores(db: Session):
    cat = Categoria(nome="Cat Fallback", ips=80)
    db.add(cat)
    db.flush()
    unidade = Unidade(nome="Unidade Fallback", tipo=TipoUnidadeEnum.apoio_indireto, categoria_id=cat.id, ips=80)
    db.add(unidade)
    db.commit()
    db.refresh(unidade)
    unidade.usuarios = []
    unidade.servidores = []
    unidade.entregas = []

    result = dimensionar_unidade(unidade)
    assert result["servidores_atuais"] == 4


def test_composicao_vinculo_na_lista_unidades(client: TestClient, db: Session):
    gestor, unidade = _seed_gestor(db)
    db.add(
        Servidor(
            matricula="TESTE-COMP-001",
            nome="Servidor Teste Comp",
            unidade_id=unidade.id,
            vinculo=VinculoServidorEnum.efetivo,
            sincronizado_em=datetime.now(timezone.utc),
        )
    )
    db.commit()
    headers = _auth_header(gestor.id)
    res = client.get("/api/unidades", headers=headers)
    assert res.status_code == 200
    item = next(u for u in res.json() if u["id"] == unidade.id)
    assert item["composicao_vinculo"]["sincronizado"] is True
    assert item["composicao_vinculo"]["efetivo"] == 1


def test_ponderacao_grava_historico_quando_valor_muda(client: TestClient, db: Session):
    gestor, _ = _seed_gestor(db)
    db.add(Parametro(chave="PESO_VOLUME", valor=0.40))
    db.commit()
    headers = _auth_header(gestor.id)

    res = client.post(
        "/api/ponderacao",
        headers=headers,
        json={
            "pesoVolume": 0.45,
            "pesoComplexidade": 0.35,
            "pesoCriticidade": 0.25,
            "toleranciaDesvio": 20,
        },
    )
    assert res.status_code == 200
    logs = db.query(ParametroLog).all()
    assert len(logs) == 1
    assert logs[0].chave == "PESO_VOLUME"
    assert logs[0].valor_anterior == 0.40
    assert logs[0].valor_novo == 0.45


def test_parametros_historico_paginado(client: TestClient, db: Session):
    gestor, _ = _seed_gestor(db)
    db.add(
        ParametroLog(
            usuario_id=gestor.id,
            chave="PESO_VOLUME",
            valor_anterior=0.40,
            valor_novo=0.45,
        )
    )
    db.commit()
    headers = _auth_header(gestor.id)
    res = client.get("/api/parametros/historico?page=1&page_size=20", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["usuario_email"] == gestor.email
    assert body["items"][0]["chave"] == "PESO_VOLUME"
