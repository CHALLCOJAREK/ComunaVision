from sqlalchemy import select

from app.models.usuario import Usuario, RolEnum
from app.utils.security import hash_password


def _create_user(db, email, rol):
    u = db.execute(select(Usuario).where(Usuario.email == email)).scalar_one_or_none()
    if not u:
        u = Usuario(
            email=email,
            nombre=email.split("@")[0],
            hashed_password=hash_password("123456"),
            rol=rol,
            activo=True,
        )
        db.add(u)
        db.commit()
    return u


def _login(client, email):
    r = client.post("/auth/login", data={"username": email, "password": "123456"})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_export_admin_200(client, db):
    _create_user(db, "admin@test.com", RolEnum.ADMIN)
    token = _login(client, "admin@test.com")

    r = client.get(
        "/exportaciones/comuneros?formato=csv",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200


def test_export_operador_denied_403(client, db):
    _create_user(db, "op@test.com", RolEnum.OPERADOR)
    token = _login(client, "op@test.com")

    r = client.get(
        "/exportaciones/comuneros?formato=json",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_export_requires_auth_401(client):
    r = client.get("/exportaciones/comuneros?formato=csv")
    assert r.status_code == 401