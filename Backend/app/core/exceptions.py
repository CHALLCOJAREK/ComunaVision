from sqlalchemy.exc import IntegrityError
from psycopg.errors import UniqueViolation
from fastapi import Request
from fastapi.responses import JSONResponse


def integrity_error_to_http(request: Request, exc: IntegrityError) -> JSONResponse:
    orig = getattr(exc, "orig", None)

    # UNIQUE violations (Postgres/psycopg)
    if isinstance(orig, UniqueViolation):
        constraint = getattr(getattr(orig, "diag", None), "constraint_name", None)

        # ✅ tu constraint estable
        if constraint in {"uq_comuneros_documento", "ix_comuneros_documento"}:
            return JSONResponse(
                status_code=409,
                content={
                    "detail": "Ya existe un comunero con ese documento.",
                    "code": "DOCUMENTO_DUPLICADO",
                    "field": "documento",
                },
            )

        return JSONResponse(
            status_code=409,
            content={
                "detail": "Registro duplicado (violación de UNIQUE).",
                "code": "UNIQUE_VIOLATION",
                "constraint": constraint,
            },
        )

    # Otros IntegrityError (FK, NOT NULL, etc.)
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Error de integridad en base de datos.",
            "code": "INTEGRITY_ERROR",
        },
    )