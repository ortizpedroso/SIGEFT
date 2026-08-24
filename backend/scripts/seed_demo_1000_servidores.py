"""
Seed de demonstração — popula o sistema com dados fictícios em volume
realista (~1000 servidores, ~150 unidades) para testar comportamento
prático (performance, diagnósticos de déficit/excesso, sugestões de
compatibilidade da Etapa 7) antes da apresentação/demo.

IMPORTANTE: todo dado aqui é claramente fictício (nomes "Servidor Demo
NNNN", matrículas "DEMO-NNNN", unidades com nomes genéricos plausíveis
mas não reais) — nunca deve ser confundido com dado real do TJRR.

Este script é INDEPENDENTE do init_db.py (que roda automaticamente no
boot do container) — só roda quando chamado manualmente, para não
poluir todo ambiente novo com 1000 registros de teste sem querer.

Uso (dentro do container da API, ou localmente com DATABASE_URL apontando
para o banco certo):

    python -m scripts.seed_demo_1000_servidores

Para desfazer (remove só o que este script criou, identificado pelo
prefixo "DEMO-" nas matrículas e "(Demo)" nos nomes de unidade):

    python -m scripts.seed_demo_1000_servidores --limpar
"""
import argparse
import random
from datetime import datetime, timezone

from app.database import SessionLocal
from app.services.dimensionamento import dimensionar_unidade
from app.models import (
    Categoria,
    Unidade,
    TipoUnidadeEnum,
    Servidor,
    VinculoServidorEnum,
    NivelEscolaridadeEnum,
    StatusLotacaoEnum,
    Habilidade,
    UnidadePerfilVaga,
    Entrega,
    servidor_habilidade,
    perfil_vaga_habilidade,
)

random.seed(42)  # reprodutível — mesma massa de dados toda vez que rodar

PREFIXO_UNIDADE = "(Demo)"
PREFIXO_MATRICULA = "DEMO-"

NOMES_APOIO_DIRETO = [
    "Vara Cível", "Vara Criminal", "Vara de Família", "Vara da Fazenda Pública",
    "Vara do Trabalho", "Vara de Execuções Fiscais", "Juizado Especial Cível",
    "Juizado Especial Criminal", "Vara de Registros Públicos", "Vara Infracional",
]

NOMES_APOIO_INDIRETO = [
    "Secretaria de Tecnologia da Informação", "Secretaria de Gestão de Pessoas",
    "Coordenadoria de Orçamento e Finanças", "Secretaria de Comunicação",
    "Coordenadoria Jurídica", "Secretaria de Planejamento", "Coordenadoria de Infraestrutura",
    "Secretaria de Compras e Licitações", "Coordenadoria de Arquivo", "Secretaria de Segurança Institucional",
]

HABILIDADES_CATALOGO = [
    "Conhecimento básico de informática", "Conhecimento avançado em Excel/planilhas",
    "Conhecimento básico em Direito", "Conhecimento em Direito Processual",
    "Conhecimento em Direito Tributário", "Atendimento ao público",
    "Redação oficial", "Conhecimento em licitações e contratos",
    "Conhecimento em contabilidade pública", "Gestão de pessoas",
    "Conhecimento em segurança da informação", "Suporte técnico de TI",
    "Conhecimento em arquivologia", "Comunicação institucional",
]

NOMES_PROPRIOS = [
    "Ana", "Bruno", "Carla", "Daniel", "Elaine", "Fábio", "Gabriela", "Hugo",
    "Isabela", "João", "Karina", "Lucas", "Mariana", "Nelson", "Olívia",
    "Pedro", "Queila", "Rafael", "Sandra", "Tiago", "Ursula", "Vinícius",
    "Wesley", "Ximena", "Yuri", "Zélia",
]
SOBRENOMES = [
    "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues",
    "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes",
]


def _nome_fake(i: int) -> str:
    return f"{random.choice(NOMES_PROPRIOS)} {random.choice(SOBRENOMES)} (Demo {i:04d})"


def limpar(db):
    print("Removendo dados de demonstração anteriores...")
    ids_servidores_demo = [
        row[0]
        for row in db.query(Servidor.id).filter(Servidor.matricula.like(f"{PREFIXO_MATRICULA}%")).all()
    ]
    n_serv_hab = 0
    if ids_servidores_demo:
        n_serv_hab = db.execute(
            servidor_habilidade.delete().where(
                servidor_habilidade.c.servidor_id.in_(ids_servidores_demo)
            )
        ).rowcount
    n_serv = db.query(Servidor).filter(Servidor.matricula.like(f"{PREFIXO_MATRICULA}%")).delete(
        synchronize_session=False
    )

    unidades_demo = db.query(Unidade).filter(Unidade.nome.like(f"%{PREFIXO_UNIDADE}%")).all()
    ids_unidades_demo = [u.id for u in unidades_demo]
    n_perfis = 0
    n_entregas = 0
    n_perfil_hab = 0
    if ids_unidades_demo:
        ids_perfis_demo = [
            row[0]
            for row in db.query(UnidadePerfilVaga.id)
            .filter(UnidadePerfilVaga.unidade_id.in_(ids_unidades_demo))
            .all()
        ]
        if ids_perfis_demo:
            n_perfil_hab = db.execute(
                perfil_vaga_habilidade.delete().where(
                    perfil_vaga_habilidade.c.perfil_vaga_id.in_(ids_perfis_demo)
                )
            ).rowcount
        n_perfis = db.query(UnidadePerfilVaga).filter(
            UnidadePerfilVaga.unidade_id.in_(ids_unidades_demo)
        ).delete(synchronize_session=False)
        n_entregas = db.query(Entrega).filter(Entrega.unidade_id.in_(ids_unidades_demo)).delete(
            synchronize_session=False
        )
        for u in unidades_demo:
            db.delete(u)
    db.commit()
    print(
        f"Removidos: {n_serv} servidores, {n_serv_hab} vínculos servidor-habilidade, "
        f"{len(ids_unidades_demo)} unidades, {n_perfis} perfis de vaga, "
        f"{n_perfil_hab} vínculos perfil-habilidade, {n_entregas} entregas."
    )


def seed(db, total_servidores: int = 1000, total_unidades: int = 150):
    print(f"Semeando ~{total_unidades} unidades e {total_servidores} servidores de demonstração...")

    categorias = db.query(Categoria).all()
    if not categorias:
        raise SystemExit("Nenhuma categoria MGI encontrada - rode o seed padrão (init_db) primeiro.")

    habilidades_map = {}
    for nome in HABILIDADES_CATALOGO:
        h = db.query(Habilidade).filter(Habilidade.nome == nome).first()
        if not h:
            h = Habilidade(nome=nome)
            db.add(h)
        habilidades_map[nome] = h
    db.commit()

    unidades = []
    n_direto = total_unidades // 2
    n_indireto = total_unidades - n_direto

    for i in range(n_direto):
        base = random.choice(NOMES_APOIO_DIRETO)
        nome = f"{i+1}ª {base} {PREFIXO_UNIDADE}"
        categoria = random.choice(categorias)
        u = Unidade(
            nome=nome,
            tipo=TipoUnidadeEnum.apoio_direto,
            categoria_id=categoria.id,
            ips=round(random.uniform(60, 98), 1),
        )
        db.add(u)
        unidades.append(u)

    for i in range(n_indireto):
        base = random.choice(NOMES_APOIO_INDIRETO)
        nome = f"{base} {i+1} {PREFIXO_UNIDADE}"
        categoria = random.choice(categorias)
        u = Unidade(
            nome=nome,
            tipo=TipoUnidadeEnum.apoio_indireto,
            categoria_id=categoria.id,
            ips=round(random.uniform(60, 98), 1),
        )
        db.add(u)
        unidades.append(u)

    db.commit()
    for u in unidades:
        db.refresh(u)

    for u in unidades:
        n_entregas = random.randint(1, 4)
        for j in range(n_entregas):
            db.add(Entrega(
                unidade_id=u.id,
                nome=f"Entrega Demo {j+1} - {u.nome}",
                fonte="Seed de Demonstração",
                carga_horaria_media=round(random.uniform(1, 10), 1),
                volume_mensal=round(random.uniform(20, 300), 0),
                complexidade=random.randint(1, 5),
                criticidade=random.randint(1, 5),
                absenteismo_pct=round(random.uniform(1, 8), 1),
                rotatividade_pct=round(random.uniform(1, 8), 1),
            ))
    db.commit()

    unidades_embaralhadas = unidades[:]
    random.shuffle(unidades_embaralhadas)
    n_deficit = int(len(unidades_embaralhadas) * 0.35)
    n_ideal = int(len(unidades_embaralhadas) * 0.30)
    grupo_deficit = set(u.id for u in unidades_embaralhadas[:n_deficit])
    grupo_ideal = set(u.id for u in unidades_embaralhadas[n_deficit:n_deficit + n_ideal])

    for u in unidades:
        if u.id not in grupo_deficit and random.random() >= 0.6:
            continue
        n_perfis = random.randint(1, 2)
        for _ in range(n_perfis):
            nivel = random.choice(list(NivelEscolaridadeEnum))
            perfil = UnidadePerfilVaga(
                unidade_id=u.id,
                nome_perfil=random.choice(["Administrativo", "Técnico", "Analista", "Atendimento"]),
                quantidade=random.randint(1, 4),
                nivel_escolaridade=nivel,
            )
            n_habilidades_exigidas = random.randint(1, 3)
            perfil.habilidades = random.sample(list(habilidades_map.values()), n_habilidades_exigidas)
            db.add(perfil)
    db.commit()

    agora = datetime.now(timezone.utc)
    vinculos = list(VinculoServidorEnum)
    pesos_vinculo = [0.75, 0.15, 0.10]

    idx = 1
    n_lotados_total = 0
    fracoes_por_unidade = {}
    for u in unidades:
        dim = dimensionar_unidade(u)
        l_ideal = dim["lotacao_ideal"]
        if u.id in grupo_deficit:
            fracao = random.uniform(0.4, 0.7)
        elif u.id in grupo_ideal:
            fracao = random.uniform(0.9, 1.1)
        else:
            fracao = random.uniform(1.3, 1.8)
        qtd = max(0, round(l_ideal * fracao))
        fracoes_por_unidade[u.id] = qtd
        n_lotados_total += qtd

    n_lotados_alvo = int(total_servidores * 0.90)
    escala_bruta = n_lotados_alvo / n_lotados_total if n_lotados_total > 0 else 1.0
    escala = max(0.6, min(1.6, escala_bruta))
    n_disponiveis = total_servidores - n_lotados_alvo

    for u in unidades:
        qtd = max(0, round(fracoes_por_unidade[u.id] * escala))
        for _ in range(qtd):
            vinculo = random.choices(vinculos, weights=pesos_vinculo, k=1)[0]
            tem_perfil = random.random() < 0.6
            servidor = Servidor(
                matricula=f"{PREFIXO_MATRICULA}{idx:04d}",
                nome=_nome_fake(idx),
                unidade_id=u.id,
                vinculo=vinculo,
                cargo_nome=random.choice(["Técnico Judiciário", "Analista Judiciário", "Auxiliar Administrativo"]),
                sincronizado_em=agora,
                status_lotacao=StatusLotacaoEnum.lotado,
                nivel_escolaridade=random.choice(list(NivelEscolaridadeEnum)) if tem_perfil else None,
            )
            if tem_perfil:
                servidor.habilidades = random.sample(
                    list(habilidades_map.values()), random.randint(1, 3)
                )
            db.add(servidor)
            idx += 1

    for _ in range(n_disponiveis):
        vinculo = random.choices(vinculos, weights=pesos_vinculo, k=1)[0]
        tem_perfil = random.random() < 0.6
        status = StatusLotacaoEnum.sem_lotacao if random.random() < 0.5 else StatusLotacaoEnum.disponivel_realocacao
        servidor = Servidor(
            matricula=f"{PREFIXO_MATRICULA}{idx:04d}",
            nome=_nome_fake(idx),
            unidade_id=random.choice(unidades).id if status == StatusLotacaoEnum.disponivel_realocacao else None,
            vinculo=vinculo,
            cargo_nome=random.choice(["Técnico Judiciário", "Analista Judiciário", "Auxiliar Administrativo"]),
            sincronizado_em=agora,
            status_lotacao=status,
            nivel_escolaridade=random.choice(list(NivelEscolaridadeEnum)) if tem_perfil else None,
        )
        if tem_perfil:
            servidor.habilidades = random.sample(
                list(habilidades_map.values()), random.randint(1, 3)
            )
        db.add(servidor)
        idx += 1

    db.commit()
    print(f"Concluído: {len(unidades)} unidades, {idx - 1} servidores ({n_disponiveis} disponíveis para realocação/novos).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limpar", action="store_true", help="Remove os dados de demonstração em vez de criar")
    parser.add_argument("--total-servidores", type=int, default=1000)
    parser.add_argument("--total-unidades", type=int, default=150)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.limpar:
            limpar(db)
        else:
            seed(db, total_servidores=args.total_servidores, total_unidades=args.total_unidades)
    finally:
        db.close()


if __name__ == "__main__":
    main()
