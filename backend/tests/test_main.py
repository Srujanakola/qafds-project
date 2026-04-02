from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def login_as(username: str = "demo", password: str = "demo123") -> dict:
    """Helper that logs in and returns auth headers."""
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, "login failed"
    data = res.json()
    token = data.get("access_token")
    assert token, "no token returned"
    return {"Authorization": f"Bearer {token}"}


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json().get("status") == "QAFDS Backend Running"


def test_register_and_login():
    # new user should be able to register and then authenticate
    username = "testuser"
    password = "secret123"
    email = "testuser@example.com"

    res = client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "email": email,
    })
    assert res.status_code == 200
    assert res.json().get("success") is True

    # duplicate registration fails
    res2 = client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "email": email,
    })
    assert res2.status_code == 400

    # login with the new account
    res3 = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res3.status_code == 200
    data = res3.json()
    assert "access_token" in data

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    # /api/auth/me should return profile info
    res4 = client.get("/api/auth/me", headers=headers)
    assert res4.status_code == 200
    info = res4.json()
    assert info.get("username") == username
    assert info.get("email") == email


def test_get_transactions_unauth():
    res = client.get("/api/transactions")
    assert res.status_code == 401


def test_connect_invalid_key():
    headers = login_as()
    res = client.post("/api/connect", headers=headers, json={"api_key": "invalid_key"})
    assert res.status_code == 400
