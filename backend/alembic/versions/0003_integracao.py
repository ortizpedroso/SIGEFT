"""0003_integracao

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-14 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "config_texto",
        sa.Column("chave", sa.String(), primary_key=True, nullable=False),
        sa.Column("valor", sa.Text(), nullable=False),
    )
    op.create_table(
        "integracao_checks",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("detalhe", sa.Text(), nullable=True),
        sa.Column("testado_em", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_table("integracao_checks")
    op.drop_table("config_texto")
