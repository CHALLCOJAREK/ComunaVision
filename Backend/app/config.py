from functools import lru_cache
from typing import Generator

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


# ===============================
# Cargar variables de entorno
# ===============================
load_dotenv()


# ===============================
# Settings (Pydantic v2 limpio)
# ===============================
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # ====== App ======
    APP_NAME: str = "ComunaVision API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ====== Database ======
    DB_HOST: str
    DB_PORT: int = 5432
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    # ====== Security ======
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# ===============================
# SQLAlchemy Base
# ===============================
class Base(DeclarativeBase):
    pass


# ===============================
# Engine (Optimizado)
# ===============================
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    future=True,
)


# ===============================
# Session Factory
# ===============================
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# ===============================
# Dependency: DB Session
# ===============================
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()