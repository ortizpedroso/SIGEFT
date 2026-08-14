import os
from datetime import date

from app.database import SessionLocal, Base, engine
from app.models import (
    Categoria,
    Parametro,
    Unidade,
    Usuario,
    Entrega,
    Esforco,
    ParecerSEI,
    TipoUnidadeEnum,
    PerfilDFTEnum,
)
from app.core.security import get_password_hash
from app.services.dimensionamento import capacidade_produtiva, dimensionar_unidade, enum_value


def _upsert_parametro(db, chave: str, valor: float) -> None:
    existing = db.query(Parametro).filter(Parametro.chave == chave).first()
    if not existing:
        db.add(Parametro(chave=chave, valor=valor))


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _upsert_parametro(db, "ITP", 70.0)
        _upsert_parametro(db, "TETO_APOIO_INDIRETO", 30.0)
        _upsert_parametro(db, "PESO_VOLUME", 0.40)
        _upsert_parametro(db, "PESO_COMPLEXIDADE", 0.35)
        _upsert_parametro(db, "PESO_CRITICIDADE", 0.25)
        _upsert_parametro(db, "TOLERANCIA_DESVIO", 20.0)

        categorias_data = [
            ("Gestão de Pessoas", 82.5),
            ("Tecnologia da Informação", 91.0),
            ("Finanças e Orçamento", 76.4),
            ("Administração e Infraestrutura", 68.0),
            ("Comunicação Institucional", 85.0),
            ("Jurídico e Controle Interno", 88.5),
            ("Planejamento e Modernização", 94.2),
        ]
        for nome, ips in categorias_data:
            if not db.query(Categoria).filter(Categoria.nome == nome).first():
                db.add(Categoria(nome=nome, ips=ips))
        db.commit()

        def cat(nome: str) -> Categoria:
            return db.query(Categoria).filter(Categoria.nome == nome).first()

        unidades_seed = [
            ("Unidade Administrativa (Sistema)", TipoUnidadeEnum.apoio_indireto, "Gestão de Pessoas", 75.0),
            ("Secretaria de Tecnologia da Informação", TipoUnidadeEnum.apoio_indireto, "Tecnologia da Informação", 92.0),
            ("1ª Vara Cível da Comarca de Boa Vista", TipoUnidadeEnum.apoio_direto, "Jurídico e Controle Interno", 88.0),
            ("2ª Vara Cível da Comarca de Boa Vista", TipoUnidadeEnum.apoio_direto, "Jurídico e Controle Interno", 85.0),
            ("Secretaria de Gestão de Pessoas", TipoUnidadeEnum.apoio_indireto, "Gestão de Pessoas", 80.0),
            ("Coordenadoria de Orçamento e Finanças", TipoUnidadeEnum.apoio_indireto, "Finanças e Orçamento", 78.0),
        ]
        for nome, tipo, cat_nome, ips in unidades_seed:
            if not db.query(Unidade).filter(Unidade.nome == nome).first():
                categoria = cat(cat_nome)
                if categoria:
                    db.add(Unidade(nome=nome, tipo=tipo, categoria_id=categoria.id, ips=ips))
        db.commit()

        admin_email = os.getenv("ADMIN_EMAIL", "admin@tjrr.jus.br")
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@2026!")
        unidade_admin = db.query(Unidade).filter(Unidade.nome == "Unidade Administrativa (Sistema)").first()
        unidade_ti = db.query(Unidade).filter(Unidade.nome == "Secretaria de Tecnologia da Informação").first()
        unidade_vara = db.query(Unidade).filter(Unidade.nome == "1ª Vara Cível da Comarca de Boa Vista").first()

        users_seed = [
            (admin_email, admin_password, PerfilDFTEnum.gestor, unidade_admin),
            ("ti.executor@tjrr.jus.br", "Executor@2026!", PerfilDFTEnum.executor, unidade_ti),
            ("apoio@tjrr.jus.br", "Apoio@2026!", PerfilDFTEnum.apoio_exclusivo, unidade_vara),
        ]
        for email, senha, perfil, unidade in users_seed:
            if unidade and not db.query(Usuario).filter(Usuario.email == email).first():
                db.add(
                    Usuario(
                        email=email,
                        senha_hash=get_password_hash(senha),
                        perfil_dft=perfil,
                        unidade_id=unidade.id,
                    )
                )
        db.commit()

        entregas_seed = [
            (
                "Secretaria de Tecnologia da Informação",
                "Desenvolvimento e Manutenção do Sistema Métrica / SIGEP",
                "Plano Diretor de TI 2026",
                12, 45, 4, 5, 3.5, 2.0,
            ),
            (
                "1ª Vara Cível da Comarca de Boa Vista",
                "Processamento de Minutas e Despachos Cíveis",
                "Atividade Fim Judiciária",
                2.5, 320, 3, 4, 4.0, 1.5,
            ),
            (
                "Secretaria de Gestão de Pessoas",
                "Gestão da Folha de Pagamento e Benefícios",
                "Rotina Administrativa SGP",
                8, 110, 4, 5, 2.0, 1.0,
            ),
            (
                "Coordenadoria de Orçamento e Finanças",
                "Execução Orçamentária e Empenhos",
                "Coordenadoria de Finanças",
                6, 140, 3, 4, 3.0, 2.5,
            ),
        ]
        for uni_nome, nome, fonte, ch, vol, comp, crit, abs_pct, rot_pct in entregas_seed:
            if not db.query(Entrega).filter(Entrega.nome == nome).first():
                unidade = db.query(Unidade).filter(Unidade.nome == uni_nome).first()
                if unidade:
                    db.add(
                        Entrega(
                            unidade_id=unidade.id,
                            nome=nome,
                            fonte=fonte,
                            carga_horaria_media=ch,
                            volume_mensal=vol,
                            complexidade=comp,
                            criticidade=crit,
                            absenteismo_pct=abs_pct,
                            rotatividade_pct=rot_pct,
                            capacidade_produtiva=capacidade_produtiva(ch, vol, abs_pct, rot_pct),
                        )
                    )
        db.commit()

        if db.query(Esforco).count() == 0:
            admin = db.query(Usuario).filter(Usuario.email == admin_email).first()
            executor = db.query(Usuario).filter(Usuario.email == "ti.executor@tjrr.jus.br").first()
            ent_ti = db.query(Entrega).filter(Entrega.nome.like("%SIGEP%")).first()
            ent_sgp = db.query(Entrega).filter(Entrega.nome.like("%Folha%")).first()
            mes = date.today().replace(day=1)
            if admin and ent_ti:
                db.add(Esforco(usuario_id=admin.id, entrega_id=ent_ti.id, percentual=40.0, mes_referencia=mes))
            if executor and ent_ti:
                db.add(Esforco(usuario_id=executor.id, entrega_id=ent_ti.id, percentual=50.0, mes_referencia=mes))
            if admin and ent_sgp:
                db.add(Esforco(usuario_id=admin.id, entrega_id=ent_sgp.id, percentual=20.0, mes_referencia=mes))
            db.commit()

        if db.query(ParecerSEI).count() == 0:
            sgp = (
                db.query(Unidade)
                .filter(Unidade.nome == "Secretaria de Gestão de Pessoas")
                .first()
            )
            if sgp:
                extra = dimensionar_unidade(sgp)
                servidores = extra["servidores_atuais"]
                lotacao = extra["lotacao_ideal"]
                desvio = round(((servidores - lotacao) / lotacao) * 100, 1) if lotacao else 0.0
                diagnostico = "déficit severo" if servidores < lotacao else ("excesso de força" if servidores > lotacao else "equilibrado")
                db.add(
                    ParecerSEI(
                        numero_processo_sei="SEI 0010293-84.2026.8.23.8000",
                        unidade_id=sgp.id,
                        unidade_nome=sgp.nome,
                        tipo_unidade=enum_value(sgp.tipo),
                        servidores_atuais=servidores,
                        lotacao_ideal_calculada=lotacao,
                        desvio_percentual=desvio,
                        diagnostico=diagnostico,
                        recomendacao="Remanejamento emergencial de analistas administrativos de setor superdimensionado.",
                        data_emissao=date(2026, 8, 1),
                        analista_responsavel="Analista SUBGFT / TJRR",
                        minuta_texto_sei=(
                            "PROCESSO SEI Nº 0010293-84.2026.8.23.8000\n"
                            "UNIDADE INTERESSADA: Secretaria de Gestão de Pessoas (SGP)\n"
                            "ASSUNTO: Instrução Técnica de Dimensionamento da Força de Trabalho (DFT/SUBGFT)\n"
                        ),
                    )
                )
                db.commit()

        print("Database initialized successfully with default seeds!")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
