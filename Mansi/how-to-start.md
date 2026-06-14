# How to Start — Mansi AI (Phase 1)

Step-by-step guide to get the terminal chatbot running from a clean checkout.

## 1. Activate the virtual environment

A virtual environment already exists at `venv/`.

```bash
cd /home/user/Mansi_chatboat/mansi
source venv/bin/activate
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

For running the test suite, install the dev extras instead (includes
`requirements.txt`):

```bash
pip install -r requirements-dev.txt
```

> **Note:** `requirements.txt` pins `httpx==0.27.2`. Newer `httpx` (0.28+)
> removed a parameter that `openai==1.54.4` still relies on internally and
> will cause `TypeError: Client.__init__() got an unexpected keyword
> argument 'proxies'` if installed. Keep the pin unless you also upgrade
> `openai`.

## 3. Configure your environment

Copy the template and edit it:

```bash
cp .env.example .env
```

Open `.env` and set `OPENAI_API_KEY` to a real OpenAI API key (starts with
`sk-`). Get one from https://platform.openai.com/account/api-keys.

Other settings in `.env` have sensible defaults (model, retries, memory size,
temperature, etc.) — see `.env.example` for the full list and
`claude/spec/mansi-ai-spec-steps-3-8.md` for what each one does.

If `OPENAI_API_KEY` is missing or malformed, the app will print a
configuration error and exit immediately — it won't start the chat loop.

## 4. Run the chatbot

```bash
python main.py
```

Example session:

```
Mansi AI — type 'exit' to quit, '/reset' to clear memory.
You: Hello!
Mansi: Hi there! How can I help you today?
You: /reset
Memory cleared.
You: exit
```

Commands:
- `/reset` — clears conversation memory (the bot "forgets" prior messages)
- `exit` or `quit` — ends the session
- `Ctrl+D` / `Ctrl+C` — also ends the session

## 5. Run the test suite

```bash
pytest -q
```

All 44 tests run fully offline (the OpenAI SDK is mocked) — no API key or
network access required. Expected output:

```
............................................                             [100%]
44 passed
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Configuration error: ... OPENAI_API_KEY is missing or invalid` | `.env` is missing, not copied from `.env.example`, or the key doesn't start with `sk-`. |
| `Mansi: Sorry, I couldn't process that right now. Please try again.` | The API key is a placeholder or invalid (401 from OpenAI), or the request failed. Check `OPENAI_API_KEY` in `.env`. |
| `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'` | `httpx` was upgraded past `0.27.x`. Run `pip install "httpx==0.27.2"`. |
| Very verbose `DEBUG`-level logs on every request | Expected when `DEBUG=true` / `LOG_LEVEL=DEBUG` in `.env` (the default for local dev). Set `DEBUG=false` and `LOG_LEVEL=INFO` for quieter output. |
