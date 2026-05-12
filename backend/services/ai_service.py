import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Server-side keys (fallback when client doesn't send one) ──
_SERVER_KEYS: dict[str, str] = {
    "gemini":    os.getenv("GEMINI_API_KEY", ""),
    "groq":      os.getenv("GROQ_API_KEY", ""),
    "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
    "openai":    os.getenv("OPENAI_API_KEY", ""),
}


def _get_key(provider: str, client_key: str | None) -> str:
    """Use the client-supplied key if provided, otherwise fall back to server key."""
    return (client_key or "").strip() or _SERVER_KEYS.get(provider, "")


async def call_ai(provider: str, model: str, prompt: str, system_prompt: str,
                  history: list[dict], max_tokens: int,
                  api_key: str | None = None) -> str:
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
