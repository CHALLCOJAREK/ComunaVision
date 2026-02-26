from datetime import datetime
from enum import Enum

from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import Base


# =========================
# ENUM DE ROLES
# =========================

class RolEnum(str, Enum):
    ADMIN = "admin"
    OPERADOR = "operador"


# =========================
# MODELO USUARIO
# =========================

class Usuario(Base):
    __tablename__ = "usuarios"

    # -------------------------
    # Primary Key
    # -------------------------
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    # -------------------------
    # Datos principales
    # -------------------------
    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    rol: Mapped[RolEnum] = mapped_column(
        SAEnum(
            RolEnum,
            name="rol_enum",
        ),
        default=RolEnum.OPERADOR,
        nullable=False,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    # -------------------------
    # Auditoría
    # -------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # -------------------------
    # Relaciones
    # -------------------------
    comuneros = relationship(
        "Comunero",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
