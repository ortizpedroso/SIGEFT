import json
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models import (
    Categoria,
    ConfigTexto,
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
from app.services.compatibilidade import calcular_afinidade, calcular_score, escolaridade_atende


def _auth_header(user_id: str) -> dict:
    token = create_access_token({"sub": user_id})
    return {"Authorization": f"Bearer {token}"}


def _now():
    return datetime.now(timezone.utc)


def _seed(db: Session):
    cat = Categoria(nome="Cat Etapa7", ips=80)
    db.add(cat)
    db.flush()

    unidade_deficit = Unidade(
        nome="Unidade Deficit Etapa7",
        tipo=TipoUnidadeEnum.apoio_direto,
        categoria_id=cat.id,
        ips=80,
    )
    db.add(unidade_deficit)
    db.flush()

    gestor = Usuario(
        email="etapa7@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.gestor,
        unidade_id=unidade_deficit.id,
    )
    db.add(gestor)
    db.flush()

    hab1 = Habilidade(nome="Atendimento")
    hab2 = Habilidade(nome="Planilhas")
    db.add_all([hab1, hab2])
    db.flush()

    perfil = UnidadePerfilVaga(
        unidade_id=unidade_deficit.id,
        nome_perfil="Administrativo",
        quantidade=2,
        nivel_escolaridade=NivelEscolaridadeEnum.medio,
        habilidades=[hab1, hab2],
    )
    db.add(perfil)

    for idx in range(1):
        db.add(
            Servidor(
                matricula=f"LOT-{idx}",
                nome=f"Servidor Lotado {idx}",
                unidade_id=unidade_deficit.id,
                vinculo=VinculoServidorEnum.efetivo,
                sincronizado_em=_now(),
                status_lotacao=StatusLotacaoEnum.lotado,
            )
        )

    servidor_sem = Servidor(
        matricula="SEM-001",
        nome="Servidor Sem Lotacao",
        unidade_id=None,
        vinculo=VinculoServidorEnum.efetivo,
        sincronizado_em=_now(),
        status_lotacao=StatusLotacaoEnum.sem_lotacao,
        nivel_escolaridade=NivelEscolaridadeEnum.superior,
        habilidades=[hab1, hab2],
    )
    db.add(servidor_sem)
    db.commit()
    return gestor, unidade_deficit, servidor_sem, hab1


def test_escolaridade_medio_nao_atende_perfil_superior():
    assert escolaridade_atende(NivelEscolaridadeEnum.medio, NivelEscolaridadeEnum.superior) is False


def test_escolaridade_superior_atende_perfil_medio():
    assert escolaridade_atende(NivelEscolaridadeEnum.superior, NivelEscolaridadeEnum.medio) is True


def test_escolaridade_none_nao_atende():
    assert escolaridade_atende(None, NivelEscolaridadeEnum.medio) is False


def test_afinidade_sem_habilidades_exigidas():
    assert calcular_afinidade({"a", "b"}, set()) == 100.0


def test_afinidade_parcial():
    assert calcular_afinidade({"a"}, {"a", "b"}) == 50.0


def test_score_com_bonus_deficit_respeita_teto():
    assert calcular_score(90.0, em_deficit=True) == 100.0


def test_score_sem_bonus():
    assert calcular_score(75.0, em_deficit=False) == 75.0


def test_servidores_disponiveis_sugere_unidade_deficit(client: TestClient, db: Session):
    gestor, unidade_deficit, _, _ = _seed(db)
    headers = _auth_header(gestor.id)

    res = client.get("/api/simulacao/servidores-disponiveis", headers=headers)
    assert res.status_code == 200
    body = res.json()
    item = next(i for i in body["items"] if i["matricula"] == "SEM-001")
    assert item["origem"] == "novo"
    assert len(item["unidades_candidatas"]) >= 1
    top = item["unidades_candidatas"][0]
    assert top["unidade_id"] == unidade_deficit.id
    assert top["score"] == 100.0
    assert top["em_deficit"] is True


def test_patch_servidor_e_liberar(client: TestClient, db: Session):
    gestor, _, _, hab1 = _seed(db)
    headers_gestor = _auth_header(gestor.id)

    rh = Usuario(
        email="rh.etapa7@tjrr.jus.br",
        senha_hash=get_password_hash("x"),
        perfil_dft=PerfilDFTEnum.rh,
        unidade_id=gestor.unidade_id,
    )
    db.add(rh)
    db.commit()
    headers_rh = _auth_header(rh.id)

    lotado = db.query(Servidor).filter(Servidor.matricula == "LOT-0").first()
    assert lotado is not None

    # Gestor não pode mais editar competências - isso é exclusivo do RH.
    res_patch_gestor = client.patch(
        f"/api/servidores/{lotado.id}",
        headers=headers_gestor,
        json={"nivel_escolaridade": "medio", "habilidade_ids": [hab1.id]},
    )
    assert res_patch_gestor.status_code == 403

    # RH pode editar competências normalmente.
    res_patch_rh = client.patch(
        f"/api/servidores/{lotado.id}",
        headers=headers_rh,
        json={"nivel_escolaridade": "medio", "habilidade_ids": [hab1.id]},
    )
    assert res_patch_rh.status_code == 200

    # Liberar para realocação continua sendo função do gestor (não do RH).
    res_lib = client.post(f"/api/servidores/{lotado.id}/liberar-realocacao", headers=headers_gestor)
    assert res_lib.status_code == 200
    assert res_lib.json()["status_lotacao"] == "disponivel_realocacao"


def test_backfill_status_lotacao(db: Session):
    cat = Categoria(nome="Backfill", ips=80)
    db.add(cat)
    db.flush()
    unidade = Unidade(nome="U Backfill", tipo=TipoUnidadeEnum.apoio_direto, categoria_id=cat.id)
    db.add(unidade)
    db.flush()

    com_unidade = Servidor(
        matricula="BF-1",
        nome="Com Unidade",
        unidade_id=unidade.id,
        vinculo=VinculoServidorEnum.efetivo,
        sincronizado_em=_now(),
        status_lotacao=StatusLotacaoEnum.lotado,
    )
    sem_unidade = Servidor(
        matricula="BF-2",
        nome="Sem Unidade",
        unidade_id=None,
        vinculo=VinculoServidorEnum.efetivo,
        sincronizado_em=_now(),
        status_lotacao=StatusLotacaoEnum.sem_lotacao,
    )
    db.add_all([com_unidade, sem_unidade])
    db.commit()

    assert com_unidade.status_lotacao == StatusLotacaoEnum.lotado
    assert sem_unidade.status_lotacao == StatusLotacaoEnum.sem_lotacao


def test_sync_status_lotacao(client: TestClient, db: Session):
    gestor, unidade, _, _ = _seed(db)
    db.add(
        ConfigTexto(
            chave="INTEGRACAO_API",
            valor=json.dumps({"sandbox_url": "https://sandbox.test/api", "api_key": "chave"}),
        )
    )
    db.commit()
    headers = _auth_header(gestor.id)

    mock_payload = [
        {"matricula": "SYNC-1", "nome": "Sync Lotado", "unidade_id": unidade.id, "vinculo": "efetivo"},
        {"matricula": "SYNC-2", "nome": "Sync Orfao", "unidade_id": "INEXISTENTE", "vinculo": "efetivo"},
    ]

    class MockResponse:
        status_code = 200

        def json(self):
            return mock_payload

    with patch("httpx.Client.get", return_value=MockResponse()):
        res = client.post("/api/integracao/sincronizar-folha", headers=headers)
    assert res.status_code == 200

    lotado = db.query(Servidor).filter(Servidor.matricula == "SYNC-1").first()
    orfao = db.query(Servidor).filter(Servidor.matricula == "SYNC-2").first()
    assert lotado.status_lotacao == StatusLotacaoEnum.lotado
    assert orfao.status_lotacao == StatusLotacaoEnum.sem_lotacao
