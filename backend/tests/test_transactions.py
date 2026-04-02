import types
import stripe
from fastapi.testclient import TestClient
from backend import main as backend_main

client = TestClient(backend_main.app)


def get_auth_headers(username: str = "demo", password: str = "demo123") -> dict:
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    token = res.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


class FakeCharge:
    def __init__(self, id="ch_test_123", amount=1200, currency="usd", status="succeeded", outcome=None):
        self.id = id
        self.amount = amount
        self.currency = currency
        self.status = status
        self.outcome = outcome or {"risk_score": 20, "risk_level": "normal", "network_status": "approved_by_network"}


def test_create_transaction_success(monkeypatch):
    # Ensure backend considers us connected
    backend_main.STRIPE_SECRET_KEY = "sk_test_123"

    def fake_create(**kwargs):
        return FakeCharge(id="ch_1", amount=int(kwargs.get("amount", 100) ), currency=kwargs.get("currency", "usd"), status="succeeded")

    monkeypatch.setattr(stripe.Charge, "create", fake_create)

    payload = {
        "card_number": "4242424242424242",
        "exp_month": 12,
        "exp_year": 2026,
        "cvc": "123",
        "amount": 12.0,
        "merchant": "TestMerchant",
        "city": "TestCity",
        "category": "E-Commerce",
    }

    # include authentication header using demo user
    res = client.post("/api/transaction/create", headers=get_auth_headers(), json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data.get("success") is True
    assert "fraud_status" in data


def test_create_transaction_declined(monkeypatch):
    backend_main.STRIPE_SECRET_KEY = "sk_test_123"

    class CardErr(Exception):
        def __init__(self, decline_code="card_declined"):
            self.error = types.SimpleNamespace(decline_code=decline_code)

    def fake_create(**kwargs):
        # construct a CardError and attach an `error` object expected by the handler
        ex = stripe.error.CardError("Card declined", None, "card_declined")
        ex.error = types.SimpleNamespace(decline_code="card_declined")
        raise ex

    monkeypatch.setattr(stripe.Charge, "create", fake_create)

    payload = {
        "card_number": "4000000000000002",
        "exp_month": 12,
        "exp_year": 2026,
        "cvc": "123",
        "amount": 50.0,
        "merchant": "FailMerchant",
        "city": "TestCity",
        "category": "Payment",
    }

    # again include token
    res = client.post("/api/transaction/create", headers=get_auth_headers(), json=payload)
    assert res.status_code == 200
    data = res.json()
    # When a CardError is raised the endpoint returns success=False and declined True
    assert data.get("success") is False or data.get("declined") is True
