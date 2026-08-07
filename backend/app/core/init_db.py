from app.database import SessionLocal, Base, engine
from app.models import Categoria, Parametro, Unidade, Usuario, TipoUnidadeEnum, PerfilDFTEnum
from app.core.security import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed Parametros Globais
        if not db.query(Parametro).filter(Parametro.chave == "ITP").first():
            db.add(Parametro(chave="ITP", valor=70.0))
        if not db.query(Parametro).filter(Parametro.chave == "TETO_APOIO_INDIRETO").first():
            db.add(Parametro(chave="TETO_APOIO_INDIRETO", valor=30.0))

        # Seed Categorias MGI
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

        # Seed Unidade do Sistema
        cat_ti = db.query(Categoria).filter(Categoria.nome == "Tecnologia da Informação").first()
        unidade_sys = db.query(Unidade).filter(Unidade.nome == "Unidade Administrativa (Sistema)").first()
        if not unidade_sys and cat_ti:
            unidade_sys = Unidade(
                nome="Unidade Administrativa (Sistema)",
                tipo=TipoUnidadeEnum.apoio_indireto,
                categoria_id=cat_ti.id,
                ips=90.0,
            )
            db.add(unidade_sys)
            db.commit()

        # Seed Super Admin
        if unidade_sys and not db.query(Usuario).filter(Usuario.email == "admin@tjrr.jus.br").first():
            admin = Usuario(
                email="admin@tjrr.jus.br",
                senha_hash=get_password_hash("Admin@2026!"),
                perfil_dft=PerfilDFTEnum.gestor,
                unidade_id=unidade_sys.id,
            )
            db.add(admin)
            db.commit()

        print("Database initialized successfully with default seeds!")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
