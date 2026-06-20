"""Smoke tests — prove the app boots and the API surface is wired up."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["docs"] == "/docs"


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "llm_enabled" in body


def test_unbuilt_feature_returns_501():
    """The chat feature is still stubbed and should surface as 501, not 500."""
    res = client.get("/api/v1/chat/suggested-questions")
    assert res.status_code == 501
