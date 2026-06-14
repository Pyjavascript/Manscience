"""Mansi AI — terminal chatbot entry point."""

from __future__ import annotations

import logging
import sys

try:
    from app.config.settings import settings
except Exception as exc:  # ConfigurationError, but caught broadly since it can't
    # be imported if settings failed to load.
    print(f"Configuration error: {exc}")
    print("Please check your .env file (see .env.example) and try again.")
    sys.exit(1)

from app.services.chat_service import ChatService, ChatServiceError

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def main() -> None:
    chat = ChatService()
    print("Mansi AI — type 'exit' to quit, '/reset' to clear memory.")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if user_input.lower() in ("exit", "quit"):
            break

        if user_input == "/reset":
            chat.memory.clear()
            print("Memory cleared.")
            continue

        try:
            reply = chat.handle_message(user_input)
            print(f"Mansi: {reply}")
        except ChatServiceError as exc:
            print(f"Mansi: {exc}")


if __name__ == "__main__":
    main()
