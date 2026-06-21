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


def test_chat_suggested_questions():
    res = client.get("/api/v1/chat/suggested-questions")
    assert res.status_code == 200
    body = res.json()
    assert body["household_id"] == "demo-household"
    assert isinstance(body["questions"], list)
    assert any(question["source"] == "popular" for question in body["questions"])


def test_chat_answer_works():
    payload = {
        "household_id": "demo-household",
        "message": "How much solar energy did we generate yesterday?",
    }
    res = client.post("/api/v1/chat", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "reply" in body
    assert isinstance(body["reply"], str)
    assert body["reply"].strip() != ""
