from datetime import datetime

from sqlalchemy import (
    String,
    Boolean,
    Integer,
    DateTime,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.config import Base


class CampoFormulario(Base):
    __tablename__ = "campos_formulario"

    # =========================
    # PK
    # =========================
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    # =========================
    # Configuración del campo
    # =========================
    nombre_campo: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    tipo: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    # Ejemplo: text, number, select, checkbox, date

    obligatorio: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    orden: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        index=True,
    )

    # Opciones dinámicas (para selects, radios, etc.)
    opciones: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    # =========================
    # Auditoría
    # =========================
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


# Índice compuesto útil si consultas por tipo + activo
Index(
    "ix_campos_tipo_activo",
    CampoFormulario.tipo,
    CampoFormulario.activo,
)
