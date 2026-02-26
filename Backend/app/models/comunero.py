from datetime import datetime
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Index,
    text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.config import Base


class Comunero(Base):
    __tablename__ = "comuneros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    # ✅ Sin unique=True acá (lo manejamos por constraint nombrado)
    documento: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    datos_dinamicos: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    creado_por: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    usuario = relationship(
        "Usuario",
        back_populates="comuneros",
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        index=True,
    )

    # ✅ Mejor en DB (consistente), y si quieres timezone=True también
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=datetime.utcnow,  # ok, aunque DB-side es más pro
    )

    __table_args__ = (
        # ✅ UNIQUE con nombre fijo (clave para 409 confiable)
        UniqueConstraint("documento", name="uq_comuneros_documento"),

        # ✅ Índice compuesto (como ya tenías)
        Index("ix_comunero_nombre_documento", "nombre", "documento"),
    )