"""Pydantic request/response models for the Mansi AI REST API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's chat message")


class ChatResponse(BaseModel):
    response: str


class HealthResponse(BaseModel):
    status: str = "ok"
