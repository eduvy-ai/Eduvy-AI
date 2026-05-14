import os
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

# ── Plan → default model routing ─────────────────────────────
# When we own the keys we route cheaper models to lower plans to control cost.
# "managed" means we ignore the user's chosen model and pick one ourselves.
PLAN_MODEL_ROUTING = {
    "free":    {"provider": "groq", "model": "llama3-8b-8192"},
    "basic":   {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    # pro / premium: honour the user's own choice (pass-through)
}


def _get_key(provider: str, client_key: str | None) -> str:
    """Return server key only — never use client-supplied key in managed mode."""
    return _SERVER_KEYS.get(provider, "")


def resolve_provider_model(user_plan: str, requested_provider: str, requested_model: str):
    """
    Returns (provider, model) based on plan.
    Free/Basic get routed to cheap models regardless of what the user chose.
    Pro/Premium get whatever the user (or profile) chose.
    """
    override = PLAN_MODEL_ROUTING.get(user_plan)
    if override:
        return override["provider"], override["model"]
    return requested_provider, requested_model


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

    key = _get_key(provider, api_key)
    if not key:
        return (
            "⚠️ No API key available for this provider. "
            "Either set it in backend/.env or send it from the app."
        )

    messages = list(history[-8:])  # keep last 8 turns
    messages.append({"role": "user", "content": str(prompt)})

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            try:
                if provider == "anthropic":
                    text = await _anthropic(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "openai":
                    text = await _openai(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "gemini":
                    text = await _gemini(client, model, key, system_prompt, messages, max_tokens)
                elif provider == "groq":
                    text = await _groq(client, model, key, system_prompt, messages, max_tokens)
                else:
                    return f"⚠️ Unknown provider: {provider}"

                if text:
                    return text

            except httpx.TimeoutException:
                if attempt == 2:
                    return "⚠️ Request timed out. Please try again."
                await asyncio.sleep((attempt + 1) * 2)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429:
                    if attempt < 2:
                        await asyncio.sleep((attempt + 1) * 3)
                        continue
                    return "⚠️ Rate limit reached. Please wait and retry."
                if attempt == 2:
                    return f"⚠️ HTTP {exc.response.status_code}: {exc.response.text[:200]}"
                await asyncio.sleep(2)
            except Exception as exc:
                if attempt == 2:
                    return f"⚠️ Error: {str(exc)}"
                await asyncio.sleep(2)

    return "⚠️ Failed after 3 attempts."


# ── Provider implementations ───────────────────────────────────

async def _anthropic(client: httpx.AsyncClient, model: str, key: str,
                     system: str, messages: list, max_tokens: int) -> str:
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
        return "⚠️ " + data["error"].get("message", "Unknown error")
    return data.get("content", [{}])[0].get("text", "")


async def _openai(client: httpx.AsyncClient, model: str, key: str,
                  system: str, messages: list, max_tokens: int) -> str:
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
        return "⚠️ " + data["error"].get("message", "Unknown error")
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


async def _gemini(client: httpx.AsyncClient, model: str, key: str,
                  system: str, messages: list, max_tokens: int) -> str:
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
        return "⚠️ " + data["error"].get("message", "Unknown error")
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
    return parts[0].get("text", "") if parts else ""


async def _groq(client: httpx.AsyncClient, model: str, key: str,
                system: str, messages: list, max_tokens: int) -> str:
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
        return "⚠️ " + data["error"].get("message", "Unknown error")
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
