"""0006_parametros_log

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-18 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "parametros_log",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("usuario_id", sa.String(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("chave", sa.String(), nullable=False),
        sa.Column("valor_anterior", sa.Float(), nullable=False),
        sa.Column("valor_novo", sa.Float(), nullable=False),
        sa.Column("alterado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("parametros_log")
