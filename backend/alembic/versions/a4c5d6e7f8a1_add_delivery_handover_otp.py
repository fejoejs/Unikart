"""add_delivery_handover_otp_and_security_fields

Revision ID: a4c5d6e7f8a1
Revises: f3b4c5d6e7f8
Create Date: 2026-11-08 17:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a4c5d6e7f8a1'
down_revision: Union[str, Sequence[str], None] = 'f3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    order_cols = [col['name'] for col in insp.get_columns('orders')]
    
    if 'delivery_handover_otp' not in order_cols:
        op.add_column('orders', sa.Column('delivery_handover_otp', sa.String(length=128), nullable=True))
    if 'delivery_otp_expires_at' not in order_cols:
        op.add_column('orders', sa.Column('delivery_otp_expires_at', sa.DateTime(), nullable=True))
    if 'delivery_otp_attempts' not in order_cols:
        op.add_column('orders', sa.Column('delivery_otp_attempts', sa.Integer(), server_default='0', nullable=False))
    if 'delivery_verified_at' not in order_cols:
        op.add_column('orders', sa.Column('delivery_verified_at', sa.DateTime(), nullable=True))

    user_cols = [col['name'] for col in insp.get_columns('users')]
    if 'oauth_provider' not in user_cols:
        op.add_column('users', sa.Column('oauth_provider', sa.String(length=50), nullable=True))
    if 'oauth_id' not in user_cols:
        op.add_column('users', sa.Column('oauth_id', sa.String(length=255), nullable=True))

    prt_cols = [col['name'] for col in insp.get_columns('password_reset_tokens')]
    if 'attempts' not in prt_cols:
        op.add_column('password_reset_tokens', sa.Column('attempts', sa.Integer(), server_default='0', nullable=False))

def downgrade() -> None:
    op.drop_column('orders', 'delivery_verified_at')
    op.drop_column('orders', 'delivery_otp_attempts')
    op.drop_column('orders', 'delivery_otp_expires_at')
    op.drop_column('orders', 'delivery_handover_otp')
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
