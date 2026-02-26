from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.config import settings, engine, Base

# ✅ Handler
from app.core.exceptions import integrity_error_to_http

# Importar modelos para que SQLAlchemy los registre
from app.models import usuario, comunero, campos_formulario, log_auditoria

# Routers
from app.routers.auth import router as auth_router
from app.routers.comuneros import router as comuneros_router
from app.routers.campos_formulario import router as campos_router
from app.routers.estadisticas import router as estadisticas_router
from app.routers.exportaciones import router as exportaciones_router
from app.routers.logs import router as logs_router
from app.routers.bootstrap import router as bootstrap_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # En producción restringir
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # ✅ Handler global: convierte IntegrityError a JSON (409/400)
    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request, exc):
        return integrity_error_to_http(request, exc)

    app.include_router(auth_router)
    app.include_router(comuneros_router)
    app.include_router(campos_router)
    app.include_router(estadisticas_router)
    app.include_router(exportaciones_router)
    app.include_router(logs_router)
    app.include_router(bootstrap_router)

    @app.get("/health", tags=["System"])
    def health_check():
        return {"status": "ok"}

    return app


app = create_app()

# ✅ Solo DEV: crea tablas automáticamente (lo mantienes comentado si ya usas Alembic)
# if settings.DEBUG:
#     Base.metadata.create_all(bind=engine)