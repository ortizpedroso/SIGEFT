"""Testes Etapa 8 — filtro de servidores, candidatas na listagem, CRUD usuários."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models import (
    Categoria,
    Habilidade,
    NivelEscolaridadeEnum,
    PerfilDFTEnum,
    Servidor,
    StatusLotacaoEnum,
    TipoUnidadeEnum,
    Unidade,
    UnidadePerfilVaga,
    Usuario,
    VinculoServidorEnum,
)


def _auth(user_id: str) -> dict:
    return {"Authorization": f"Bearer {create_access_token({'sub': user_id})}"}


def _now():
    return datetime.now(timezone.utc)


def _seed_base(db: Session):
    cat = Categoria(nome="Cat E8", ips=80)
    db.add(cat)
    db.flush()
    unidade = Unidade(
        nome="Unidade E8",
        tipo=TipoUnidadeEnum.apoio_direto,
        categoria_id=cat.id,
        ips=70,
    )
    db.add(unidade)
    db.flush()
    hab = Habilidade(nome="Habilidade E8")
    db.add(hab)
    db.flush()
    perfil = UnidadePerfilVaga(
        unidade_id=unidade.id,
        nome_perfil="Analista",
        quantidade=2,
        nivel_escolaridade=NivelEscolaridadeEnum.superior,
    )
    perfil.habilidades = [hab]
    db.add(perfil)
    gestor = Usuario(
        email="gestor.e8@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=unidade.id,
    )
    rh = Usuario(
        email="rh.e8@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.rh,
        unidade_id=unidade.id,
    )
    db.add_all([gestor, rh])
    db.flush()
    lotado = Servidor(
        matricula="E8-LOT",
        nome="Lotado E8",
        unidade_id=unidade.id,
        vinculo=VinculoServidorEnum.efetivo,
        status_lotacao=StatusLotacaoEnum.lotado,
        sincronizado_em=_now(),
    )
    novo = Servidor(
        matricula="E8-NOV",
        nome="Novo E8",
        unidade_id=None,
        vinculo=VinculoServidorEnum.efetivo,
        status_lotacao=StatusLotacaoEnum.sem_lotacao,
        nivel_escolaridade=NivelEscolaridadeEnum.superior,
        sincronizado_em=_now(),
    )
    novo.habilidades = [hab]
    db.add_all([lotado, novo])
    db.commit()
    return gestor, rh, lotado, novo


def test_listar_servidores_filtro_disponiveis(client: TestClient, db: Session):
    _, rh, lotado, novo = _seed_base(db)
    res_todos = client.get("/api/servidores", headers=_auth(rh.id))
    assert res_todos.status_code == 200
    ids_todos = {s["id"] for s in res_todos.json()}
    assert lotado.id in ids_todos

    res_disp = client.get("/api/servidores?status=disponiveis", headers=_auth(rh.id))
    assert res_disp.status_code == 200
    data = res_disp.json()
    ids = {s["id"] for s in data}
    assert novo.id in ids
    assert lotado.id not in ids


def test_listar_servidores_incluir_candidatas(client: TestClient, db: Session):
    _, rh, _, novo = _seed_base(db)
    res = client.get(
        "/api/servidores?status=disponiveis&incluir_candidatas=true",
        headers=_auth(rh.id),
    )
    assert res.status_code == 200
    item = next(s for s in res.json() if s["id"] == novo.id)
    assert "unidades_candidatas" in item


def test_crud_usuarios_gestor(client: TestClient, db: Session):
    gestor, _, _, _ = _seed_base(db)
    headers = _auth(gestor.id)

    res_create = client.post(
        "/api/usuarios",
        headers=headers,
        json={
            "email": "novo.user@tjrr.jus.br",
            "senha": "Senha@123",
            "perfil_dft": "executor",
            "unidade_id": gestor.unidade_id,
        },
    )
    assert res_create.status_code == 201
    user_id = res_create.json()["id"]

    res_list = client.get("/api/usuarios", headers=headers)
    assert res_list.status_code == 200
    assert any(u["id"] == user_id for u in res_list.json())

    res_patch = client.patch(
        f"/api/usuarios/{user_id}",
        headers=headers,
        json={"perfil_dft": "rh"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["perfil_dft"] == "rh"

    res_del = client.delete(f"/api/usuarios/{user_id}", headers=headers)
    assert res_del.status_code == 204


def test_crud_usuarios_negado_executor(client: TestClient, db: Session):
    gestor, _, _, _ = _seed_base(db)
    executor = Usuario(
        email="exec.e8@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.executor,
        unidade_id=gestor.unidade_id,
    )
    db.add(executor)
    db.commit()
    res = client.get("/api/usuarios", headers=_auth(executor.id))
    assert res.status_code == 403
