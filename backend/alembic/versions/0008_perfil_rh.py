"""0008_perfil_rh

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-23 00:00:00

Adiciona o valor 'rh' ao enum de perfil de acesso (PerfilDFTEnum), para
suportar um perfil dedicado de Recursos Humanos responsável por cadastrar
as competências (escolaridade e habilidades) dos servidores — separado do
perfil "gestor" (que define o perfil de vaga por unidade, mas não deve
editar dado de competência individual do servidor).

IMPORTANTE (lição da migração 0007): no PostgreSQL, adicionar um valor a
um ENUM existente exige `ALTER TYPE ... ADD VALUE`, que não pode ser usado
na MESMA transação em que o valor é referenciado por um INSERT/UPDATE -
mas pode ser criado e commitado aqui normalmente, e usado por processos
seguintes (como o init_db.py, que roda depois da migração terminar).
No SQLite, a coluna `perfil_dft` é um VARCHAR sem CHECK constraint (o
projeto não usa native_enum ali), então nenhuma ação é necessária.

Testado contra PostgreSQL 16 real (upgrade + init_db em sequência,
simulando o fluxo exato de deploy) e contra SQLite.
"""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE perfildftenum ADD VALUE IF NOT EXISTS 'rh'")
    # SQLite: nada a fazer (ver nota acima).


def downgrade():
    # PostgreSQL não suporta remover um valor de ENUM diretamente (exigiria
    # recriar o tipo inteiro e todas as colunas que o usam). Como o valor
    # 'rh' simplesmente fica sem uso após o downgrade, este é um no-op
    # seguro - não deixa o banco em estado inconsistente.
    pass
