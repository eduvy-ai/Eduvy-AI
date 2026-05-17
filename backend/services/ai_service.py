import os
import json
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Server-side keys — NEVER send to clients ──────────────────
_SERVER_KEYS: dict[str, str] = {
    "gemini":    os.getenv("GEMINI_API_KEY", ""),
    "groq":      os.getenv("GROQ_API_KEY", ""),
    "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
    "openai":    os.getenv("OPENAI_API_KEY", ""),
}

# ── Plan → default model routing (hardcoded fallback) ─────────
_DEFAULT_PLAN_ROUTING: dict[str, dict] = {
    "free":    {"provider": "groq",   "model": "llama-3.1-8b-instant"},
    "basic":   {"provider": "groq",   "model": "llama-3.3-70b-versatile"},
    "pro":     {"provider": "gemini", "model": "gemini-2.0-flash"},
    "premium": {"provider": "gemini", "model": "gemini-2.0-flash"},
}

# In-memory cache — updated by load_plan_routing() / save_plan_routing()
_PLAN_ROUTING: dict[str, dict] = dict(_DEFAULT_PLAN_ROUTING)


# Models that have been decommissioned → auto-replace on load
_DECOMMISSIONED_MODELS = {
    "llama3-8b-8192":      "llama-3.1-8b-instant",
    "llama3-70b-8192":     "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768":  "llama-3.3-70b-versatile",
}


def _fix_model(provider: str, model: str) -> str:
    if provider == "groq":
        return _DECOMMISSIONED_MODELS.get(model, model)
    return model



def load_plan_routing():
    """Load plan routing config AND stored API keys from app_settings into memory."""
    try:
        from database import get_db   # local import to avoid circular deps at module load
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT key, value FROM app_settings WHERE key LIKE 'ai_routing_%' OR key LIKE 'api_key_%'"
            )
            rows = cur.fetchall()
            for row in rows:
                k, v = row["key"], row["value"]
                if k.startswith("ai_routing_"):
                    plan = k.replace("ai_routing_", "")
                    try:
                        entry = json.loads(v)
                        fixed_model = _fix_model(entry.get("provider", ""), entry.get("model", ""))
                        if fixed_model != entry.get("model", ""):
                            # Persist the corrected model back to DB so it doesn't re-appear
                            entry["model"] = fixed_model
                            cur.execute(
                                """INSERT INTO app_settings (key, value, updated_at)
                                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                                   ON CONFLICT (key) DO UPDATE
                                   SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
                                (k, json.dumps(entry)),
                            )
                        _PLAN_ROUTING[plan] = entry
                    except Exception:
                        pass
                elif k.startswith("api_key_"):
                    provider = k.replace("api_key_", "")
                    if provider in _SERVER_KEYS and v:
                        # DB-stored key overrides empty env var; env var wins if set
                        if not _SERVER_KEYS[provider]:
                            _SERVER_KEYS[provider] = v
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass  # silently fall back to defaults


def save_api_key(provider: str, key: str):
    """Persist an API key for a provider to app_settings and update the in-memory cache."""
    from database import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_settings (key, value, updated_at)
               VALUES (%s, %s, CURRENT_TIMESTAMP)
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
            (f"api_key_{provider}", key),
        )
        conn.commit()
        _SERVER_KEYS[provider] = key
    finally:
        conn.close()


def get_key_status() -> dict[str, bool]:
    """Return {provider: has_key} — NEVER returns actual key values."""
    return {prov: bool(key) for prov, key in _SERVER_KEYS.items()}


def save_plan_routing(plan: str, provider: str, model: str):
    """Persist one plan's routing to app_settings and update the in-memory cache."""
    from database import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        value = json.dumps({"provider": provider, "model": model})
        cur.execute(
            """INSERT INTO app_settings (key, value, updated_at)
               VALUES (%s, %s, CURRENT_TIMESTAMP)
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
            (f"ai_routing_{plan}", value),
        )
        conn.commit()
        _PLAN_ROUTING[plan] = {"provider": provider, "model": model}
    finally:
        conn.close()


def get_plan_routing() -> dict[str, dict]:
    """Return the current in-memory plan routing config."""
    return dict(_PLAN_ROUTING)


def _get_key(provider: str, client_key: str | None) -> str:
    """Return server key only — never use client-supplied key in managed mode."""
    return _SERVER_KEYS.get(provider, "")


# Preferred fallback order when the resolved provider has no key
_FALLBACK_ORDER = ["groq", "gemini", "anthropic", "openai"]

# Default first model per provider (used when falling back)
_PROVIDER_DEFAULT_MODEL = {
    "groq":      "llama-3.1-8b-instant",
    "gemini":    "gemini-2.0-flash",
    "anthropic": "claude-3-5-haiku-20241022",
    "openai":    "gpt-4o-mini",
}


def _first_available_provider() -> tuple[str, str] | None:
    """Return (provider, default_model) for the first provider that has a server key."""
    for prov in _FALLBACK_ORDER:
        if _SERVER_KEYS.get(prov):
            return prov, _PROVIDER_DEFAULT_MODEL[prov]
    return None


def resolve_provider_model(user_plan: str, requested_provider: str, requested_model: str):
    """
    Returns (provider, model) based on plan routing config.
    If the resolved provider has no server key, falls back to the
    first provider that does so the call never silently fails.
    """
    routing = _PLAN_ROUTING.get(user_plan)
    if routing:
        provider, model = routing["provider"], routing["model"]
    else:
        provider, model = requested_provider, requested_model

    model = _fix_model(provider, model)

    # If resolved provider has no key → fall back to first available
    if not _SERVER_KEYS.get(provider):
        fallback = _first_available_provider()
        if fallback:
            provider, model = fallback

    return provider, model


# ── Return type: (text, prompt_tokens, completion_tokens) ─────
async def call_ai(
    provider: str,
    model: str,
    prompt: str,
    system_prompt: str,
    history: list[dict],
    max_tokens: int,
    api_key: str | None = None,   # kept for backward compat but ignored in managed mode
) -> tuple[str, int, int]:
    key = _get_key(provider, api_key)
    # If still no key after routing, try every available provider as last resort
    if not key:
        fallback = _first_available_provider()
        if fallback:
            provider, model = fallback
            key = _SERVER_KEYS.get(provider, "")
    if not key:
        return (
            "⚠️ AI service is temporarily unavailable. Please try again shortly.",
            0, 0,
        )

    messages = list(history[-8:])  # keep last 8 turns
    messages.append({"role": "user", "content": str(prompt)})

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            try:
                if provider == "anthropic":
                    result = await _anthropic(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "openai":
                    result = await _openai(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "gemini":
                    result = await _gemini(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "groq":
                    result = await _groq(client, model, key, system_prompt, messages, max_tokens)
                else:
                    return (f"⚠️ Unknown provider: {provider}", 0, 0)

                text, ptok, ctok = result
                if text:
                    return text, ptok, ctok

            except httpx.TimeoutException:
                if attempt == 2:
                    return ("⚠️ Request timed out. Please try again.", 0, 0)
                await asyncio.sleep((attempt + 1) * 2)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    if attempt < 2:
                        await asyncio.sleep((attempt + 1) * 3)
                        continue
                    return ("⚠️ Rate limit reached on AI provider. Please wait and retry.", 0, 0)
                if attempt == 2:
                    return (f"⚠️ HTTP {exc.response.status_code}: {exc.response.text[:200]}", 0, 0)
                await asyncio.sleep(2)
            except Exception as exc:
                if attempt == 2:
                    return (f"⚠️ Error: {str(exc)}", 0, 0)
                await asyncio.sleep(2)

    return ("⚠️ Failed after 3 attempts.", 0, 0)


# ── Provider implementations — each returns (text, prompt_tokens, completion_tokens) ──

async def _anthropic(client: httpx.AsyncClient, model: str, key: str,
                     system: str, messages: list, max_tokens: int) -> tuple[str, int, int]:
    r = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        json={"model": model, "max_tokens": max_tokens,
              "system": str(system), "messages": messages},
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return ("⚠️ " + data["error"].get("message", "Unknown error"), 0, 0)
    text = data.get("content", [{}])[0].get("text", "")
    usage = data.get("usage", {})
    return text, usage.get("input_tokens", 0), usage.get("output_tokens", 0)


async def _openai(client: httpx.AsyncClient, model: str, key: str,
                  system: str, messages: list, max_tokens: int) -> tuple[str, int, int]:
    r = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"},
        json={
            "model": model, "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": str(system)}, *messages],
        },
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return ("⚠️ " + data["error"].get("message", "Unknown error"), 0, 0)
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)


async def _gemini(client: httpx.AsyncClient, model: str, key: str,
                  system: str, messages: list, max_tokens: int) -> tuple[str, int, int]:
    gemini_messages = [
        {"role": "model" if m["role"] == "assistant" else "user",
         "parts": [{"text": m["content"]}]}
        for m in messages
    ]
    r = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
        headers={"Content-Type": "application/json"},
        json={
            "system_instruction": {"parts": [{"text": str(system)}]},
            "contents": gemini_messages,
            "generationConfig": {"maxOutputTokens": max_tokens},
        },
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return ("⚠️ " + data["error"].get("message", "Unknown error"), 0, 0)
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
    text = parts[0].get("text", "") if parts else ""
    meta = data.get("usageMetadata", {})
    return text, meta.get("promptTokenCount", 0), meta.get("candidatesTokenCount", 0)


async def _groq(client: httpx.AsyncClient, model: str, key: str,
                system: str, messages: list, max_tokens: int) -> tuple[str, int, int]:
    r = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"},
        json={
            "model": model, "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": str(system)}, *messages],
        },
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return ("⚠️ " + data["error"].get("message", "Unknown error"), 0, 0)
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
