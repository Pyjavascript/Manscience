"""Shared pytest configuration.

Ensures required settings are present before any test module imports
`app.config.settings` (directly or transitively), independent of the local
`.env` file's contents.
"""

import os

os.environ.setdefault("OPENAI_API_KEY", "sk-test1234567890abcdef")
os.environ.setdefault("MODEL_NAME", "gpt-4o-mini")
