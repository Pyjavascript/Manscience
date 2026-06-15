# Setup Guide

This guide covers cloning, installing, configuring, and running Mansi AI,
plus common Git/GitHub problems and how to avoid them.

## 1. Clone the repository

```bash
git clone <repo-url>
cd Mansi
```

## 2. Create a virtual environment

**Ubuntu / macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows (PowerShell or cmd):**

```bash
python -m venv venv
venv\Scripts\activate
```

Your shell prompt should now show `(venv)`.

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

For development (testing tools included):

```bash
pip install -r requirements-dev.txt
```

## 4. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY` to a real OpenAI API key (starts with
`sk-`). Get one from https://platform.openai.com/account/api-keys.

`.env` is listed in `.gitignore` and must **never** be committed.

## 5. Run the project

```bash
python main.py
```

Type a message and press Enter to chat. Special commands:

- `/reset` — clear conversation memory
- `exit` or `quit` — end the session

## 6. Run the test suite

```bash
pytest -q
```

All tests run offline (the OpenAI SDK is mocked) — no API key or network
access required.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Configuration error: ... OPENAI_API_KEY is missing or invalid` | `.env` is missing, not copied from `.env.example`, or the key doesn't start with `sk-`. |
| `Mansi: Sorry, I couldn't process that right now. Please try again.` | The API key is a placeholder or invalid (401 from OpenAI), or the request failed. Check `OPENAI_API_KEY` in `.env`. |
| `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'` | `httpx` was upgraded past `0.27.x`. Run `pip install "httpx==0.27.2"`. |
| `ModuleNotFoundError` after cloning | The virtual environment isn't activated, or dependencies weren't installed. Run `source venv/bin/activate` (or `venv\Scripts\activate` on Windows) then `pip install -r requirements.txt`. |

---

## Common Git Issues

### `.env` shows up in `git status`

If `.env` appears as a new/modified file in `git status`, double-check
`.gitignore` contains `.env` and that the file was never committed before.
Run:

```bash
git check-ignore -v .env
```

This should print the `.gitignore` rule that matches `.env`. If it prints
nothing, `.env` is not ignored — verify `.gitignore` is present and committed.

### `venv/` accidentally staged

If you see hundreds of files from `venv/` in `git status`, make sure
`.gitignore` includes `venv/` and `.venv/`, then run:

```bash
git rm -r --cached venv
```

This removes the directory from Git tracking without deleting it from disk.

### GitHub Push Protection / secret scanning

GitHub scans pushes for things that look like API keys, tokens, and other
credentials. If a push is **rejected with a "push protection" error**, it
means a commit in your push contains a secret-like string (for example, a
real `OPENAI_API_KEY` value committed inside `.env`).

To fix this:

1. **Do not bypass the protection** by committing the secret anyway.
2. Remove the secret from the file (use `.env.example` with a placeholder
   instead, and make sure `.env` is in `.gitignore` and untracked).
3. If the secret was already committed, it must be removed from the commit
   history before pushing — either by amending the offending commit (if it
   hasn't been shared yet) or rewriting history with tools like
   `git filter-repo`. This is disruptive for shared branches, so coordinate
   with your team before doing it.
4. **Always rotate/revoke any credential that was ever committed**, even if
   you remove it from history — assume it has been compromised.

### Verifying your repo is clean

```bash
# .env should be ignored
git check-ignore .env

# .env should not be tracked (no output, except possibly .env.example)
git ls-files | grep '\.env'

# working tree should have nothing unexpected staged
git status
```
