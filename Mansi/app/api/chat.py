"""Chat endpoint for the Mansi AI REST API.

Reuses the existing `ChatService` orchestration layer unchanged — the same
contract (`handle_message` / `ChatServiceError`) that `main.py` uses for the
terminal chatbot.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.schemas import ChatRequest, ChatResponse
from app.services.chat_service import ChatService, ChatServiceError

router = APIRouter()
_chat_service = ChatService()


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        reply = _chat_service.handle_message(payload.message)
    except ChatServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatResponse(response=reply)
