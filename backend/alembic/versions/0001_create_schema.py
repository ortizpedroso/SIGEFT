"""0001_create_schema

Revision ID: 0001
Revises:
Create Date: 2026-08-07 00:00:00

"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'categorias',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('nome', sa.String(), nullable=False, unique=True),
        sa.Column('ips', sa.Float(), nullable=True),
    )

    op.create_table(
        'parametros',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('chave', sa.String(), nullable=False, unique=True),
        sa.Column('valor', sa.Float(), nullable=False),
    )

    op.create_table(
        'unidades',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('tipo', sa.Enum('apoio_direto', 'apoio_indireto', name='tipounidadeenum'), nullable=False),
        sa.Column('categoria_id', sa.String(), sa.ForeignKey('categorias.id'), nullable=False),
        sa.Column('ips', sa.Float(), nullable=True),
    )

    op.create_table(
        'usuarios',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('unidade_id', sa.String(), sa.ForeignKey('unidades.id'), nullable=False),
        sa.Column('perfil_dft', sa.Enum('gestor', 'executor', 'apoio_exclusivo', name='perfildftenum'), nullable=False),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('senha_hash', sa.String(), nullable=False),
    )

    op.create_table(
        'entregas',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('unidade_id', sa.String(), sa.ForeignKey('unidades.id'), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('fonte', sa.String(), nullable=False),
    )

    op.create_table(
        'esforcos',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('usuario_id', sa.String(), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('entrega_id', sa.String(), sa.ForeignKey('entregas.id'), nullable=False),
        sa.Column('percentual', sa.Float(), nullable=False),
        sa.Column('mes_referencia', sa.Date(), nullable=False),
    )

def downgrade():
    op.drop_table('esforcos')
    op.drop_table('entregas')
    op.drop_table('usuarios')
    op.drop_table('unidades')
    op.drop_table('parametros')
    op.drop_table('categorias')
