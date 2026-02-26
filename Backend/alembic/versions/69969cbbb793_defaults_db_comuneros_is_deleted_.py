"""Defaults DB comuneros is_deleted created_at updated_at

Revision ID: 69969cbbb793
Revises: d53e14e71ff8
Create Date: 2026-02-25 17:44:52.181652
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "69969cbbb793"
down_revision: Union[str, Sequence[str], None] = "d53e14e71ff8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Backfill por si ya hay nulls
    op.execute(sa.text("UPDATE comuneros SET is_deleted = false WHERE is_deleted IS NULL"))
    op.execute(sa.text("UPDATE comuneros SET created_at = now() WHERE created_at IS NULL"))
    op.execute(sa.text("UPDATE comuneros SET updated_at = now() WHERE updated_at IS NULL"))

    # 2) Defaults en DB (Postgres manda)
    op.alter_column(
        "comuneros",
        "is_deleted",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )

    op.alter_column(
        "comuneros",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )

    op.alter_column(
        "comuneros",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    # Quitamos server_default (mantenemos NOT NULL)
    op.alter_column("comuneros", "updated_at", server_default=None)
    op.alter_column("comuneros", "created_at", server_default=None)
    op.alter_column("comuneros", "is_deleted", server_default=None)