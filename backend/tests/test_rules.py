from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, create_access_token
from app.models import (
    Categoria,
    Unidade,
    Usuario,
    Entrega,
    TipoUnidadeEnum,
    PerfilDFTEnum,
)
from app.services.dimensionamento import capacidade_produtiva


def _auth_header(user_id: str) -> dict:
    token = create_access_token({"sub": user_id})
    return {"Authorization": f"Bearer {token}"}


def test_root_online(client: TestClient):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"


def test_login_and_me(client: TestClient, db: Session):
    cat = Categoria(nome="TI Test", ips=90)
    db.add(cat)
    db.flush()
    uni = Unidade(nome="STI Test", tipo=TipoUnidadeEnum.apoio_indireto, categoria_id=cat.id, ips=91)
    db.add(uni)
    db.flush()
    user = Usuario(
        email="gestor@tjrr.jus.br",
        senha_hash=get_password_hash("Senha@123"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=uni.id,
    )
    db.add(user)
    db.commit()

    res = client.post("/api/token", data={"username": "gestor@tjrr.jus.br", "password": "Senha@123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "gestor@tjrr.jus.br"
    assert me.json()["perfil_dft"] == "gestor"


def test_esforco_trava_100_e_apoio_exclusivo(client: TestClient, db: Session):
    cat = Categoria(nome="Cat Esforco", ips=80)
    db.add(cat)
    db.flush()
    uni = Unidade(nome="Uni Esforco", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=80)
    db.add(uni)
    db.flush()
    gestor = Usuario(
        email="exec@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=uni.id,
    )
    apoio = Usuario(
        email="apoio-test@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.apoio_exclusivo,
        unidade_id=uni.id,
    )
    db.add_all([gestor, apoio])
    db.flush()
    entrega = Entrega(unidade_id=uni.id, nome="Entrega A", fonte="Teste")
    db.add(entrega)
    db.commit()

    headers = _auth_header(gestor.id)
    first = client.post(
        "/api/esforcos",
        headers=headers,
        json={
            "usuario_id": gestor.id,
            "entrega_id": entrega.id,
            "percentual": 80,
            "mes_referencia": date.today().replace(day=1).isoformat(),
        },
    )
    assert first.status_code == 201

    overflow = client.post(
        "/api/esforcos",
        headers=headers,
        json={
            "usuario_id": gestor.id,
            "entrega_id": entrega.id,
            "percentual": 30,
            "mes_referencia": date.today().replace(day=1).isoformat(),
        },
    )
    assert overflow.status_code == 400

    forbidden = client.post(
        "/api/esforcos",
        headers=headers,
        json={
            "usuario_id": apoio.id,
            "entrega_id": entrega.id,
            "percentual": 10,
            "mes_referencia": date.today().replace(day=1).isoformat(),
        },
    )
    assert forbidden.status_code == 403


def test_simulacao_q3_e_fallback_mediana(client: TestClient, db: Session):
    cat = Categoria(nome="Cat Sim", ips=85)
    db.add(cat)
    db.flush()
    unidades = [
        Unidade(nome=f"U{i}", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=ips)
        for i, ips in enumerate([70, 80, 90, 100])
    ]
    db.add_all(unidades)
    db.flush()
    gestor = Usuario(
        email="sim@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=unidades[0].id,
    )
    db.add(gestor)
    db.commit()

    headers = _auth_header(gestor.id)
    q3 = client.post(
        "/api/simulacao/lotacao",
        headers=headers,
        json={"categoria_id": cat.id, "reducao_percentual": 10},
    )
    assert q3.status_code == 200
    assert q3.json()["strategy"] == "q3"

    median = client.post(
        "/api/simulacao/lotacao",
        headers=headers,
        json={"categoria_id": cat.id, "reducao_percentual": 31},
    )
    assert median.status_code == 200
    assert median.json()["strategy"] == "median"


def test_get_protegido_sem_token(client: TestClient):
    assert client.get("/api/unidades").status_code == 401
    assert client.get("/api/dashboard/stats").status_code == 401
    assert client.get("/api/usuarios").status_code == 401


def test_rbac_gestor_executor_apoio(client: TestClient, db: Session):
    cat = Categoria(nome="Cat RBAC", ips=80)
    db.add(cat)
    db.flush()
    uni = Unidade(nome="Uni RBAC", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=80)
    db.add(uni)
    db.flush()
    gestor = Usuario(
        email="rbac.gestor@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=uni.id,
    )
    executor = Usuario(
        email="rbac.exec@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=uni.id,
    )
    apoio = Usuario(
        email="rbac.apoio@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.apoio_exclusivo,
        unidade_id=uni.id,
    )
    db.add_all([gestor, executor, apoio])
    db.commit()

    assert client.get("/api/unidades", headers=_auth_header(apoio.id)).status_code == 200
    assert client.post(
        "/api/unidades",
        headers=_auth_header(apoio.id),
        json={"nome": "X", "tipo": "apoio_direto", "categoria_id": cat.id},
    ).status_code == 403
    assert client.post(
        "/api/simulacao/lotacao",
        headers=_auth_header(executor.id),
        json={"categoria_id": cat.id, "reducao_percentual": 0},
    ).status_code == 403
    created = client.post(
        "/api/unidades",
        headers=_auth_header(gestor.id),
        json={"nome": "Unidade Nova RBAC", "tipo": "apoio_indireto", "categoria_id": cat.id, "ips": 70},
    )
    assert created.status_code == 201

    nova_cat = client.post(
        "/api/categorias",
        headers=_auth_header(gestor.id),
        json={"nome": "Gestão Documental", "ips": 77.5},
    )
    assert nova_cat.status_code == 201
    assert nova_cat.json()["nome"] == "Gestão Documental"
    assert client.post(
        "/api/categorias",
        headers=_auth_header(executor.id),
        json={"nome": "Outra Cat", "ips": 70},
    ).status_code == 403
    assert client.post(
        "/api/categorias",
        headers=_auth_header(gestor.id),
        json={"nome": "Gestão Documental", "ips": 70},
    ).status_code == 409


def test_login_invalido_nao_revela_usuario(client: TestClient):
    res = client.post("/api/token", data={"username": "naoexiste@tjrr.jus.br", "password": "errada"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Credenciais inválidas"


def test_capacidade_produtiva_formula():
    # CH=10, abs=10, rot=10 => fator 0.8 => (10/0.8)*100 = 1250
    assert capacidade_produtiva(10, 100, 10, 10) == 1250


def test_integracao_checklist_local_e_sandbox_aguardando(client: TestClient, db: Session):
    cat = Categoria(nome="Cat Integracao", ips=80)
    db.add(cat)
    db.flush()
    uni = Unidade(nome="Uni Integracao", tipo=TipoUnidadeEnum.apoio_indireto, categoria_id=cat.id, ips=80)
    db.add(uni)
    db.flush()
    gestor = Usuario(
        email="int.gestor@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=uni.id,
    )
    db.add(gestor)
    db.commit()

    headers = _auth_header(gestor.id)
    listed = client.get("/api/integracao", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert body["resumo"]["total"] >= 10
    ids = {item["id"] for item in body["items"]}
    assert "sei" in ids
    assert "folha" in ids
    assert "sso" in ids
    assert "local_unidades" in ids
    by_get = {item["id"]: item for item in body["items"]}
    assert by_get["metrica"]["status"] == "ok"
    assert by_get["local_unidades"]["status"] == "ok"
    assert by_get["sei"]["status"] == "falha"
    assert "API de integração" in (by_get["sei"]["detalhe"] or "")

    tested = client.post("/api/integracao/testar", headers=headers, json={})
    assert tested.status_code == 200
    after = tested.json()
    by_id = {item["id"]: item for item in after["items"]}
    assert by_id["metrica"]["status"] == "ok"
    assert by_id["local_unidades"]["status"] == "ok"
    assert by_id["sei"]["status"] == "falha"

    bad = client.post(
        "/api/integracao",
        headers=headers,
        json={"sandbox_url": "javascript:alert(1)"},
    )
    assert bad.status_code == 400

    saved = client.post(
        "/api/integracao",
        headers=headers,
        json={"sandbox_url": "https://sandbox.example.invalid", "api_key": "token-teste-1234"},
    )
    assert saved.status_code == 200
    saved_json = saved.json()
    assert saved_json["has_key"] is True
    assert saved_json["api_key_masked"].endswith("1234")
    saved_body = {item["id"]: item for item in saved_json["items"]}
    assert saved_body["sei"]["status"] in ("falha", "ok")
    if saved_body["sei"]["status"] == "falha":
        assert saved_body["sei"]["detalhe"]


def test_parecer_sei_circunstanciado_todas_e_edicao(client: TestClient, db: Session):
    cat = Categoria(nome="Cat SEI", ips=80)
    db.add(cat)
    db.flush()
    uni_a = Unidade(nome="Unidade Alfa SEI", tipo=TipoUnidadeEnum.apoio_indireto, categoria_id=cat.id, ips=80)
    uni_b = Unidade(nome="Unidade Beta SEI", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id, ips=85)
    db.add_all([uni_a, uni_b])
    db.flush()
    gestor = Usuario(
        email="sei.gestor@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=uni_a.id,
    )
    db.add(gestor)
    db.commit()
    headers = _auth_header(gestor.id)

    uma = client.post(
        "/api/relatorios-sei",
        headers=headers,
        json={"unidadeId": uni_a.id, "analistaResponsavel": "Analista Teste"},
    )
    assert uma.status_code == 201
    texto = uma.json()["minutaTextoSEI"]
    assert "Resolução CNJ nº 219/2016" in texto
    assert "circunstanciada" in texto.lower() or "CIRCUNSTANCIADA" in texto.upper()
    assert "Unidade Alfa SEI" in texto

    todas = client.post(
        "/api/relatorios-sei",
        headers=headers,
        json={"unidadeId": "todas", "analistaResponsavel": "Analista Teste"},
    )
    assert todas.status_code == 201
    consolidado = todas.json()
    assert consolidado["unidadeNome"] == "Todas as unidades"
    assert "Unidade Alfa SEI" in consolidado["minutaTextoSEI"]
    assert "Unidade Beta SEI" in consolidado["minutaTextoSEI"]

    edited = "MINUTA EDITADA PELO GESTOR\n" + consolidado["minutaTextoSEI"]
    patch = client.patch(
        f"/api/relatorios-sei/{consolidado['id']}",
        headers=headers,
        json={"minutaTextoSEI": edited},
    )
    assert patch.status_code == 200
    assert patch.json()["minutaTextoSEI"].startswith("MINUTA EDITADA PELO GESTOR")

    executor = Usuario(
        email="sei.exec@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=uni_a.id,
    )
    db.add(executor)
    db.commit()
    denied = client.patch(
        f"/api/relatorios-sei/{consolidado['id']}",
        headers=_auth_header(executor.id),
        json={"minutaTextoSEI": "tentativa sem permissão de gestor " + "x" * 20},
    )
    assert denied.status_code == 403

