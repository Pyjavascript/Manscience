"""Tests for `POST /chat`.

`ChatService.handle_message` is monkeypatched on the shared `_chat_service`
instance so no real OpenAI calls are made, mirroring the dependency-mocking
style used in `tests/test_chat_service.py`.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.api import chat as chat_module
from app.api.main import app
from app.services.chat_service import ChatServiceError

client = TestClient(app)


def test_chat_returns_response_for_valid_message(monkeypatch):
    monkeypatch.setattr(
        chat_module._chat_service, "handle_message", lambda message: "Hello there!"
    )

    response = client.post("/chat", json={"message": "Hello Mansi"})

    assert response.status_code == 200
    assert response.json() == {"response": "Hello there!"}


def test_chat_rejects_empty_message_with_422():
    response = client.post("/chat", json={"message": ""})

    assert response.status_code == 422


def test_chat_wraps_chat_service_error_as_400(monkeypatch):
    def failing_handle_message(message):
        raise ChatServiceError("Message cannot be empty.")

    monkeypatch.setattr(chat_module._chat_service, "handle_message", failing_handle_message)

    response = client.post("/chat", json={"message": "   "})

    assert response.status_code == 400
    assert response.json() == {"detail": "Message cannot be empty."}
