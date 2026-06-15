"""FastAPI application entry point for the Mansi AI REST API.

Run with: uvicorn app.api.main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI

from app.api import chat, health

app = FastAPI(title="Mansi AI API")

app.include_router(health.router)
app.include_router(chat.router)
