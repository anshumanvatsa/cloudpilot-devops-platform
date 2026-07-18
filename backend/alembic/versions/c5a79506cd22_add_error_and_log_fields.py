"""add error and log fields

Revision ID: c5a79506cd22
Revises: 20260413_01
Create Date: 2026-07-18 23:08:27.549498
"""
from alembic import op
import sqlalchemy as sa


revision = 'c5a79506cd22'
down_revision = '20260413_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('deployments', sa.Column('build_log', sa.Text(), nullable=True))
    op.add_column('deployments', sa.Column('error_summary', sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column('deployments', 'error_summary')
    op.drop_column('deployments', 'build_log')
