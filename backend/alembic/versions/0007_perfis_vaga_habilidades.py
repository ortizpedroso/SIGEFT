"""0007_perfis_vaga_habilidades

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-23 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "habilidades",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("nome", sa.String(), nullable=False, unique=True),
    )

    op.create_table(
        "unidade_perfil_vaga",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("unidade_id", sa.String(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("nome_perfil", sa.String(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column(
            "nivel_escolaridade",
            sa.Enum("medio", "superior", name="nivelescolaridadeenum"),
            nullable=False,
        ),
    )
    op.create_index("ix_unidade_perfil_vaga_unidade_id", "unidade_perfil_vaga", ["unidade_id"])

    op.create_table(
        "perfil_vaga_habilidade",
        sa.Column("perfil_vaga_id", sa.String(), sa.ForeignKey("unidade_perfil_vaga.id"), primary_key=True),
        sa.Column("habilidade_id", sa.String(), sa.ForeignKey("habilidades.id"), primary_key=True),
    )

    op.create_table(
        "servidor_habilidade",
        sa.Column("servidor_id", sa.String(), sa.ForeignKey("servidores.id"), primary_key=True),
        sa.Column("habilidade_id", sa.String(), sa.ForeignKey("habilidades.id"), primary_key=True),
    )

    with op.batch_alter_table("servidores") as batch_op:
        batch_op.add_column(
            sa.Column(
                "nivel_escolaridade",
                sa.Enum("medio", "superior", name="nivelescolaridadeenum", create_type=False),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "status_lotacao",
                sa.Enum(
                    "lotado",
                    "sem_lotacao",
                    "disponivel_realocacao",
                    name="statuslotacaoenum",
                ),
                nullable=False,
                server_default="sem_lotacao",
            )
        )

    op.execute(
        "UPDATE servidores SET status_lotacao = 'lotado' WHERE unidade_id IS NOT NULL"
    )
    op.execute(
        "UPDATE servidores SET status_lotacao = 'sem_lotacao' WHERE unidade_id IS NULL"
    )


def downgrade():
    op.drop_table("servidor_habilidade")
    op.drop_table("perfil_vaga_habilidade")
    op.drop_index("ix_unidade_perfil_vaga_unidade_id", table_name="unidade_perfil_vaga")
    op.drop_table("unidade_perfil_vaga")
    op.drop_table("habilidades")

    with op.batch_alter_table("servidores") as batch_op:
        batch_op.drop_column("status_lotacao")
        batch_op.drop_column("nivel_escolaridade")

    op.execute("DROP TYPE IF EXISTS statuslotacaoenum")
    op.execute("DROP TYPE IF EXISTS nivelescolaridadeenum")
