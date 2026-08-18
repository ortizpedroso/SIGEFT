"""0005_servidores

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-18 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "servidores",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("matricula", sa.String(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("unidade_id", sa.String(), sa.ForeignKey("unidades.id"), nullable=True),
        sa.Column(
            "vinculo",
            sa.Enum("efetivo", "cargo_comissionado", "funcao_confianca", name="vinculoservidorenum"),
            nullable=False,
        ),
        sa.Column("cargo_nome", sa.String(), nullable=True),
        sa.Column("sincronizado_em", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_servidores_matricula", "servidores", ["matricula"], unique=True)


def downgrade():
    op.drop_index("ix_servidores_matricula", table_name="servidores")
    op.drop_table("servidores")
    op.execute("DROP TYPE IF EXISTS vinculoservidorenum")
