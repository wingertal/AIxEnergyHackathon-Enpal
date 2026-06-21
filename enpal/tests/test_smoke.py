"""Smoke tests — prove the app boots and the API surface is wired up."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

HH = "HH-1001"  # real demo household (PV + battery + heat pump + EV)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["docs"] == "/docs"


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "ai_enabled" in body


def test_chat_suggested_questions():
    res = client.get(f"/api/v1/chat/suggested-questions?household_id={HH}")
    assert res.status_code == 200
    body = res.json()
    assert body["household_id"] == HH
    assert isinstance(body["questions"], list)
    assert any(question["source"] == "popular" for question in body["questions"])


def test_chat_answer_works():
    """Works with or without an OpenAI key (deterministic fallback otherwise)."""
    payload = {
        "household_id": HH,
        "message": "How much solar energy did we generate today?",
    }
    res = client.post("/api/v1/chat", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body["reply"], str)
    assert body["reply"].strip() != ""
    assert body["conversation_id"] is not None
