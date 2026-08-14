"""0002_fusion_domain

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-14 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("entregas", sa.Column("carga_horaria_media", sa.Float(), nullable=True))
    op.add_column("entregas", sa.Column("volume_mensal", sa.Float(), nullable=True))
    op.add_column("entregas", sa.Column("complexidade", sa.Integer(), nullable=True))
    op.add_column("entregas", sa.Column("criticidade", sa.Integer(), nullable=True))
    op.add_column("entregas", sa.Column("absenteismo_pct", sa.Float(), nullable=True))
    op.add_column("entregas", sa.Column("rotatividade_pct", sa.Float(), nullable=True))
    op.add_column("entregas", sa.Column("capacidade_produtiva", sa.Float(), nullable=True))

    op.create_table(
        "pareceres_sei",
        sa.Column("id", sa.String(), nullable=False, primary_key=True),
        sa.Column("numero_processo_sei", sa.String(), nullable=False),
        sa.Column("unidade_id", sa.String(), sa.ForeignKey("unidades.id"), nullable=False),
        sa.Column("unidade_nome", sa.String(), nullable=False),
        sa.Column("tipo_unidade", sa.String(), nullable=False),
        sa.Column("servidores_atuais", sa.Integer(), nullable=False),
        sa.Column("lotacao_ideal_calculada", sa.Integer(), nullable=False),
        sa.Column("desvio_percentual", sa.Float(), nullable=False),
        sa.Column("diagnostico", sa.String(), nullable=False),
        sa.Column("recomendacao", sa.String(), nullable=False),
        sa.Column("data_emissao", sa.Date(), nullable=False),
        sa.Column("analista_responsavel", sa.String(), nullable=False),
        sa.Column("minuta_texto_sei", sa.Text(), nullable=False),
    )


def downgrade():
    op.drop_table("pareceres_sei")
    op.drop_column("entregas", "capacidade_produtiva")
    op.drop_column("entregas", "rotatividade_pct")
    op.drop_column("entregas", "absenteismo_pct")
    op.drop_column("entregas", "criticidade")
    op.drop_column("entregas", "complexidade")
    op.drop_column("entregas", "volume_mensal")
    op.drop_column("entregas", "carga_horaria_media")
