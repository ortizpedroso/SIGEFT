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


def test_login_invalido_nao_revela_usuario(client: TestClient):
    res = client.post("/api/token", data={"username": "naoexiste@tjrr.jus.br", "password": "errada"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Credenciais inválidas"


def test_capacidade_produtiva_formula():
    # CH=10, abs=10, rot=10 => fator 0.8 => (10/0.8)*100 = 1250
    assert capacidade_produtiva(10, 100, 10, 10) == 1250
