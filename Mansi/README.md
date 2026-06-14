# Mansi AI — Terminal Chatbot (Phase 1)

A provider-agnostic AI chatbot. Phase 1 is a terminal REPL backed by OpenAI's
Chat Completions API, with conversation memory and a clean architecture ready
for future FastAPI/RAG/multi-provider extensions.

See `claude/spec/mansi-ai-spec-steps-3-8.md` for the full design spec.

## Setup

1. Activate the virtual environment:

   ```bash
   source venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

   For development (includes test dependencies):

   ```bash
   pip install -r requirements-dev.txt
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and set `OPENAI_API_KEY` to your real OpenAI API key.

## Running

```bash
python main.py
```

Type a message and press Enter to chat. Special commands:

- `/reset` — clear conversation memory
- `exit` or `quit` — end the session

## Testing

```bash
pytest -q
```

All tests run offline — the OpenAI SDK is mocked, so no API key or network
access is required.
