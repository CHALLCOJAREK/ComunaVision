"""Drop unique viejo ix_comuneros_documento

Revision ID: 80dd1e915f55
Revises: 69969cbbb793
Create Date: 2026-02-25 18:02:57.708842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80dd1e915f55'
down_revision: Union[str, Sequence[str], None] = '69969cbbb793'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    conn = op.get_bind()

    # 1) Si es CONSTRAINT unique
    conn.execute(sa.text('ALTER TABLE "comuneros" DROP CONSTRAINT IF EXISTS "ix_comuneros_documento"'))

    # 2) Si es INDEX unique (por si acaso)
    conn.execute(sa.text('DROP INDEX IF EXISTS "ix_comuneros_documento"'))

    # 3) Asegura que exista el bueno (por si falló antes)
    conn.execute(sa.text('ALTER TABLE "comuneros" DROP CONSTRAINT IF EXISTS "uq_comuneros_documento"'))
    op.create_unique_constraint("uq_comuneros_documento", "comuneros", ["documento"])


def downgrade():
    # reversión conservadora: recrea el constraint viejo (si lo necesitas)
    op.create_unique_constraint("ix_comuneros_documento", "comuneros", ["documento"])
    op.drop_constraint("uq_comuneros_documento", "comuneros", type_="unique")