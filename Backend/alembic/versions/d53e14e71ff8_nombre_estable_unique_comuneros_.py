from alembic import op
import sqlalchemy as sa

revision = "d53e14e71ff8"
down_revision = "b47a4de2d082"
branch_labels = None
depends_on = None


def _drop_unique_if_exists(conn, table_name: str, constraint_names: list[str]):
    """
    Drop safe: elimina constraint UNIQUE si existe (evita UndefinedObject).
    """
    for name in constraint_names:
        conn.execute(sa.text(f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{name}"'))


def upgrade():
    conn = op.get_bind()

    # 1) Intentamos dropear nombres comunes del unique en Postgres (por si varía)
    _drop_unique_if_exists(
        conn,
        "comuneros",
        [
            "comuneros_documento_key",   # nombre típico
            "uq_comuneros_documento",    # por si ya existe de un intento anterior
        ],
    )

    # 2) Creamos el constraint con nombre estable
    op.create_unique_constraint("uq_comuneros_documento", "comuneros", ["documento"])


def downgrade():
    conn = op.get_bind()

    conn.execute(sa.text('ALTER TABLE "comuneros" DROP CONSTRAINT IF EXISTS "uq_comuneros_documento"'))

    # si quieres volver al estado anterior:
    op.create_unique_constraint("comuneros_documento_key", "comuneros", ["documento"])