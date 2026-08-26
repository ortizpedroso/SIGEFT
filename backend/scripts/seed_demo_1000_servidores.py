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

Preset enxuto para apresentação (10 unidades, 100 lotados, 10 novos,
5 liberados — novos/liberados com competências alinhadas a unidades em déficit):

    python -m scripts.seed_demo_1000_servidores --preset apresentacao

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

# Habilidades adicionais, usadas só pela atualização em lote
# (--atualizar-competencias), para diversificar o que já existe sem
# invalidar a reprodutibilidade do seed original (random.seed(42)).
HABILIDADES_CATALOGO_EXTRA = [
    "Conhecimento em Direito Eleitoral", "Conhecimento em Direito Administrativo",
    "Perícia técnica e laudos", "Conhecimento em LGPD e proteção de dados",
    "Conhecimento em Recursos Humanos", "Atendimento processual/cartorário",
    "Conhecimento em gestão de contratos de TI", "Elaboração de editais",
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


def _particionar_habilidades(habilidades_map: dict, n_partes: int) -> list[list]:
    """Divide o catálogo em blocos distintos para perfis de unidades diferentes."""
    habs = list(habilidades_map.values())
    random.shuffle(habs)
    partes: list[list] = [[] for _ in range(max(1, n_partes))]
    for i, hab in enumerate(habs):
        partes[i % len(partes)].append(hab)
    return partes


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


def atualizar_competencias_e_lotacoes(db, seed_variacao: int = 7):
    """Atualiza (não recria) os servidores demo já existentes:
    - Expande o catálogo de habilidades com HABILIDADES_CATALOGO_EXTRA.
    - Redistribui os servidores LOTADOS entre as unidades (Demo) já
      existentes, recalculando um novo agrupamento déficit/ideal/excesso
      (mesma proporção 35/30/35 do seed original) - muda quem está em
      déficit sem criar nenhuma unidade ou servidor novo.
    - Reatribui escolaridade (garantindo mistura real de médio/superior)
      e um novo conjunto de habilidades (do catálogo já expandido) para
      TODOS os servidores demo (lotados, novos e liberados).

    Não cria nem remove nenhuma unidade/servidor - só faz UPDATE no que
    já existe. Seguro para rodar quantas vezes quiser sobre a mesma base.
    """
    random.seed(seed_variacao)  # semente diferente do seed original (42),
    # para gerar uma combinação nova de habilidades/lotações a cada rodada
    # intencional desta função, mas ainda reprodutível se você passar o
    # mesmo valor de novo.

    habilidades_map = {}
    for nome in HABILIDADES_CATALOGO + HABILIDADES_CATALOGO_EXTRA:
        h = db.query(Habilidade).filter(Habilidade.nome == nome).first()
        if not h:
            h = Habilidade(nome=nome)
            db.add(h)
        habilidades_map[nome] = h
    db.commit()
    catalogo_completo = list(habilidades_map.values())

    unidades = db.query(Unidade).filter(Unidade.nome.like(f"%{PREFIXO_UNIDADE}%")).all()
    if not unidades:
        raise SystemExit(
            "Nenhuma unidade demo encontrada - rode o seed normal "
            "(sem --atualizar-competencias) pelo menos uma vez antes."
        )

    servidores_demo = db.query(Servidor).filter(Servidor.matricula.like(f"{PREFIXO_MATRICULA}%")).all()
    if not servidores_demo:
        raise SystemExit("Nenhum servidor demo encontrado - rode o seed normal antes.")

    # --- Redistribuição de lotação (só entre servidores já LOTADOS) ---
    lotados = [s for s in servidores_demo if s.status_lotacao == StatusLotacaoEnum.lotado]
    unidades_embaralhadas = unidades[:]
    random.shuffle(unidades_embaralhadas)
    n_deficit = int(len(unidades_embaralhadas) * 0.35)
    n_ideal = int(len(unidades_embaralhadas) * 0.30)
    grupo_deficit = set(u.id for u in unidades_embaralhadas[:n_deficit])
    grupo_ideal = set(u.id for u in unidades_embaralhadas[n_deficit:n_deficit + n_ideal])

    fracoes_por_unidade: dict[str, int] = {}
    total_fracoes = 0
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
        total_fracoes += qtd

    escala = len(lotados) / total_fracoes if total_fracoes > 0 else 1.0
    escala = max(0.5, min(2.0, escala))

    random.shuffle(lotados)
    cursor = 0
    n_deficit_final = 0
    n_ideal_final = 0
    n_excesso_final = 0
    for u in unidades:
        qtd = max(0, round(fracoes_por_unidade[u.id] * escala))
        qtd = min(qtd, len(lotados) - cursor)
        for servidor in lotados[cursor:cursor + qtd]:
            servidor.unidade_id = u.id
        cursor += qtd
        if u.id in grupo_deficit:
            n_deficit_final += 1
        elif u.id in grupo_ideal:
            n_ideal_final += 1
        else:
            n_excesso_final += 1
    # Sobras (arredondamento) ficam na última unidade processada, para não
    # perder nenhum servidor lotado.
    if cursor < len(lotados) and unidades:
        for servidor in lotados[cursor:]:
            servidor.unidade_id = unidades[-1].id

    # --- Escolaridade e habilidades para TODOS os servidores demo ---
    niveis = list(NivelEscolaridadeEnum)  # [medio, superior]
    n_medio = 0
    n_superior = 0
    n_sem_escolaridade = 0
    for idx, servidor in enumerate(servidores_demo):
        sorteio = random.random()
        if sorteio < 0.47:
            servidor.nivel_escolaridade = NivelEscolaridadeEnum.medio
            n_medio += 1
        elif sorteio < 0.94:
            servidor.nivel_escolaridade = NivelEscolaridadeEnum.superior
            n_superior += 1
        else:
            servidor.nivel_escolaridade = None
            n_sem_escolaridade += 1

        n_habilidades = random.randint(1, 4)
        servidor.habilidades = random.sample(catalogo_completo, min(n_habilidades, len(catalogo_completo)))

    db.commit()

    print(
        f"Atualizados {len(servidores_demo)} servidores demo (competências) e "
        f"{len(lotados)} servidores lotados redistribuídos entre {len(unidades)} unidades."
    )
    print(
        f"Escolaridade: {n_medio} médio, {n_superior} superior, "
        f"{n_sem_escolaridade} não informado."
    )
    print(
        f"Unidades: {n_deficit_final} em déficit, {n_ideal_final} próximas do ideal, "
        f"{n_excesso_final} em excesso (grupo-alvo antes do arredondamento)."
    )
    print(f"Catálogo de habilidades em uso: {len(catalogo_completo)} itens.")


def seed(
    db,
    total_servidores: int = 1000,
    total_unidades: int = 150,
    n_lotados: int | None = None,
    n_novos: int | None = None,
    n_liberados: int | None = None,
):
    if n_lotados is not None and n_novos is not None and n_liberados is not None:
        total_servidores = n_lotados + n_novos + n_liberados
        print(
            f"Semeando {total_unidades} unidades e {total_servidores} servidores "
            f"({n_lotados} lotados, {n_novos} novos, {n_liberados} sem lotação atual)..."
        )
    else:
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

    modo_apresentacao = (
        n_lotados is not None and n_novos is not None and n_liberados is not None
    )
    pacotes_candidatos: list[dict] = []
    unidades_deficit_list = sorted(
        [u for u in unidades if u.id in grupo_deficit],
        key=lambda item: item.id,
    )
    partes_habilidades: list[list] = []
    if modo_apresentacao and unidades_deficit_list:
        partes_habilidades = _particionar_habilidades(
            habilidades_map, len(unidades_deficit_list)
        )

    for u in unidades:
        if not modo_apresentacao and u.id not in grupo_deficit and random.random() >= 0.6:
            continue
        if modo_apresentacao and u.id not in grupo_deficit:
            continue
        n_perfis = 1 if modo_apresentacao else random.randint(1, 2)
        idx_deficit = (
            unidades_deficit_list.index(u) if u in unidades_deficit_list else 0
        )
        for _ in range(n_perfis):
            if modo_apresentacao:
                nivel = (
                    NivelEscolaridadeEnum.medio
                    if idx_deficit % 2 == 0
                    else NivelEscolaridadeEnum.superior
                )
                bloco = partes_habilidades[idx_deficit] if partes_habilidades else []
                n_habilidades_exigidas = min(3, max(2, len(bloco)))
                habs_perfil = bloco[:n_habilidades_exigidas] or random.sample(
                    list(habilidades_map.values()), 2
                )
            else:
                nivel = random.choice(list(NivelEscolaridadeEnum))
                n_habilidades_exigidas = random.randint(1, 3)
                habs_perfil = random.sample(
                    list(habilidades_map.values()), n_habilidades_exigidas
                )
            perfil = UnidadePerfilVaga(
                unidade_id=u.id,
                nome_perfil=random.choice(["Administrativo", "Técnico", "Analista", "Atendimento"]),
                quantidade=random.randint(1, 4),
                nivel_escolaridade=nivel,
            )
            perfil.habilidades = habs_perfil
            db.add(perfil)
            if modo_apresentacao:
                pacotes_candidatos.append(
                    {
                        "unidade_id": u.id,
                        "nivel_escolaridade": nivel,
                        "habilidades": habs_perfil[:],
                    }
                )
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

    if modo_apresentacao:
        n_lotados_alvo = n_lotados
        n_disponiveis = n_novos + n_liberados
        atribuicoes: list[str] = []
        restantes = n_lotados
        unidades_deficit = [u for u in unidades if u.id in grupo_deficit]
        if not unidades_deficit:
            unidades_deficit = unidades[: max(1, len(unidades) // 3)]
        for u in unidades_deficit:
            if restantes <= 0:
                break
            dim = dimensionar_unidade(u)
            qtd = max(1, round(dim["lotacao_ideal"] * random.uniform(0.35, 0.55)))
            qtd = min(qtd, restantes)
            atribuicoes.extend([u.id] * qtd)
            restantes -= qtd
        unidades_resto = [u for u in unidades if u.id not in grupo_deficit]
        if not unidades_resto:
            unidades_resto = unidades
        i = 0
        while restantes > 0:
            atribuicoes.append(unidades_resto[i % len(unidades_resto)].id)
            restantes -= 1
            i += 1
        random.shuffle(atribuicoes)
        for unidade_id in atribuicoes:
            vinculo = random.choices(vinculos, weights=pesos_vinculo, k=1)[0]
            servidor = Servidor(
                matricula=f"{PREFIXO_MATRICULA}{idx:04d}",
                nome=_nome_fake(idx),
                unidade_id=unidade_id,
                vinculo=vinculo,
                cargo_nome=random.choice(["Técnico Judiciário", "Analista Judiciário", "Auxiliar Administrativo"]),
                sincronizado_em=agora,
                status_lotacao=StatusLotacaoEnum.lotado,
                nivel_escolaridade=random.choice(list(NivelEscolaridadeEnum)),
            )
            servidor.habilidades = random.sample(
                list(habilidades_map.values()), random.randint(1, 3)
            )
            db.add(servidor)
            idx += 1
    else:
        if n_lotados is not None and n_novos is not None and n_liberados is not None:
            n_lotados_alvo = n_lotados
            n_disponiveis = n_novos + n_liberados
            escala = 1.0
            if n_lotados_total > 0 and n_lotados > 0:
                escala = n_lotados / n_lotados_total

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

    if modo_apresentacao:
        if not pacotes_candidatos:
            habilidades_lista = list(habilidades_map.values())
            pacotes_candidatos = [
                {
                    "unidade_id": u.id,
                    "nivel_escolaridade": NivelEscolaridadeEnum.superior,
                    "habilidades": random.sample(habilidades_lista, 2),
                }
                for u in unidades_deficit_list or unidades[:3]
            ]

        def _criar_disponivel(status: StatusLotacaoEnum, pacote: dict) -> None:
            nonlocal idx
            vinculo = random.choices(vinculos, weights=pesos_vinculo, k=1)[0]
            servidor = Servidor(
                matricula=f"{PREFIXO_MATRICULA}{idx:04d}",
                nome=_nome_fake(idx),
                unidade_id=None,
                vinculo=vinculo,
                cargo_nome=random.choice(["Técnico Judiciário", "Analista Judiciário", "Auxiliar Administrativo"]),
                sincronizado_em=agora,
                status_lotacao=status,
                nivel_escolaridade=pacote["nivel_escolaridade"],
            )
            servidor.habilidades = pacote["habilidades"][:]
            db.add(servidor)
            idx += 1

        for i in range(n_novos):
            _criar_disponivel(
                StatusLotacaoEnum.sem_lotacao,
                pacotes_candidatos[i % len(pacotes_candidatos)],
            )

        for i in range(n_liberados):
            _criar_disponivel(
                StatusLotacaoEnum.disponivel_realocacao,
                pacotes_candidatos[(n_novos + i) % len(pacotes_candidatos)],
            )
    else:
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
    if modo_apresentacao:
        print(
            f"Concluído: {len(unidades)} unidades, {idx - 1} servidores "
            f"({n_lotados} lotados, {n_novos} novos, {n_liberados} sem lotação atual)."
        )
    else:
        print(f"Concluído: {len(unidades)} unidades, {idx - 1} servidores ({n_disponiveis} disponíveis para realocação/novos).")


PRESET_APRESENTACAO = {
    "total_unidades": 10,
    "n_lotados": 100,
    "n_novos": 10,
    "n_liberados": 5,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limpar", action="store_true", help="Remove os dados de demonstração em vez de criar")
    parser.add_argument(
        "--atualizar-competencias",
        action="store_true",
        help=(
            "Não cria nada novo - atualiza escolaridade/habilidades dos servidores demo já "
            "existentes e redistribui os lotados entre as unidades demo já existentes, "
            "gerando um novo cenário de déficit/excesso."
        ),
    )
    parser.add_argument(
        "--seed-variacao",
        type=int,
        default=7,
        help="Semente aleatória usada só por --atualizar-competencias (mude para gerar outra combinação).",
    )
    parser.add_argument(
        "--preset",
        choices=["apresentacao"],
        help="Conjuntos pré-definidos de massa de dados para demo/apresentação",
    )
    parser.add_argument("--total-servidores", type=int, default=1000)
    parser.add_argument("--total-unidades", type=int, default=150)
    parser.add_argument("--lotados", type=int, help="Quantidade exata de servidores lotados (modo explícito)")
    parser.add_argument("--novos", type=int, help="Servidores novos sem lotação (sem_lotacao)")
    parser.add_argument("--liberados", type=int, help="Servidores liberados para realocação (sem unidade atual)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.limpar:
            limpar(db)
        elif args.atualizar_competencias:
            atualizar_competencias_e_lotacoes(db, seed_variacao=args.seed_variacao)
        elif args.preset == "apresentacao":
            seed(db, **PRESET_APRESENTACAO)
        elif args.lotados is not None and args.novos is not None and args.liberados is not None:
            seed(
                db,
                total_unidades=args.total_unidades,
                n_lotados=args.lotados,
                n_novos=args.novos,
                n_liberados=args.liberados,
            )
        else:
            seed(db, total_servidores=args.total_servidores, total_unidades=args.total_unidades)
    finally:
        db.close()


if __name__ == "__main__":
    main()
