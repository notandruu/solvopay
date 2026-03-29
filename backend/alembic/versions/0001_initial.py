"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(66), primary_key=True),
        sa.Column("escrow_address", sa.String(42), nullable=False),
        sa.Column("agent", sa.String(42), nullable=False),
        sa.Column("recipient", sa.String(42), nullable=False),
        sa.Column("deposit", sa.Numeric(30, 0), nullable=False),
        sa.Column("agent_yield_share", sa.Integer, nullable=False),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "SETTLED", "REFUNDED", name="sessionstatus"),
            nullable=False,
            server_default="ACTIVE",
        ),
        sa.Column("deadline_at", sa.Numeric(20, 0), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "voucher_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "session_id",
            sa.String(66),
            sa.ForeignKey("sessions.id"),
            nullable=False,
        ),
        sa.Column("total_authorized", sa.Numeric(30, 0), nullable=False),
        sa.Column("nonce", sa.Numeric(20, 0), nullable=False),
        sa.Column("sig", sa.String(132), nullable=False),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_voucher_events_session_id", "voucher_events", ["session_id"])


def downgrade() -> None:
    op.drop_table("voucher_events")
    op.drop_table("sessions")
    op.execute("DROP TYPE IF EXISTS sessionstatus")
