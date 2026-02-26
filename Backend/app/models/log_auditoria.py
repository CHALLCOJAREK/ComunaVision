from datetime import datetime
from enum import Enum

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import Base


class AccionEnum(str, Enum):
    CREAR = "crear"
    EDITAR = "editar"
    ELIMINAR = "eliminar"


class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    accion: Mapped[AccionEnum] = mapped_column(
        SAEnum(AccionEnum, name="accion_enum"),
        nullable=False,
        index=True,
    )

    entidad: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    entidad_id: Mapped[int] = mapped_column(
        nullable=False,
        index=True,
    )

    datos_anteriores: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    datos_nuevos: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Relación ORM
    usuario = relationship("Usuario")

    # Índice compuesto para búsquedas rápidas por entidad
    __table_args__ = (
        Index(
            "ix_logs_entidad_entidad_id",
            "entidad",
            "entidad_id",
        ),
    )
