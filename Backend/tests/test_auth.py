from sqlalchemy import select
from app.models.usuario import Usuario, RolEnum
from app.utils.security import hash_password


def test_login_ok(client, db):
    # seed usuario
    email = "admin@test.com"
    user = db.execute(select(Usuario).where(Usuario.email == email)).scalar_one_or_none()
    if not user:
        user = Usuario(
            email=email,
            nombre="Admin Test",
            hashed_password=hash_password("123456"),
            rol=RolEnum.ADMIN,
            activo=True,
        )
        db.add(user)
        db.commit()

    resp = client.post("/auth/login", data={"username": email, "password": "123456"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"