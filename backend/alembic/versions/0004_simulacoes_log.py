"""0004_simulacoes_log

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-18 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "simulacoes_log",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("usuario_id", sa.String(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("payload_entrada", sa.Text(), nullable=False),
        sa.Column("payload_resultado", sa.Text(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("simulacoes_log")
