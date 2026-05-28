import os
import json
import asyncio
import hashlib
import time
import threading
import base64
import httpx
from collections import OrderedDict
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

# ── API key encryption (Fernet / AES-128-CBC) ─────────────────
# Keys are encrypted before writing to DB and decrypted on read.
# The Fernet key is derived from JWT_SECRET so no extra env var is needed.
def _get_fernet() -> Fernet:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("JWT_SECRET must be set to encrypt/decrypt API keys")
    # Derive a 32-byte Fernet-compatible key from the JWT secret
    key_bytes = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))

def _encrypt_key(plaintext: str) -> str:
    """Encrypt an API key for storage in DB."""
    return _get_fernet().encrypt(plaintext.encode()).decode()

def _decrypt_key(value: str) -> str:
    """Decrypt a DB-stored API key. Falls back to plaintext for pre-encryption rows."""
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        # Migration path: old plaintext value — return as-is and let next save re-encrypt
        return value

# ── Server-side keys — NEVER send to clients ──────────────
# Primary key per provider (used as fallback / _SERVER_KEYS lookup)
_SERVER_KEYS: dict[str, str] = {
    "gemini":    os.getenv("GEMINI_API_KEY", ""),
    "groq":      os.getenv("GROQ_API_KEY", ""),
    "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
    "openai":    os.getenv("OPENAI_API_KEY", ""),
    "nvidia":    os.getenv("NVIDIA_API_KEY", ""),
}

# ── Per-provider key pools — round-robin for scale ────────────
# Add _2 … _5 variants in .env to multiply each provider's quota.
def _load_pool(base_env: str, count: int = 5) -> list[str]:
    keys = [
        os.getenv(base_env, ""),
        *[os.getenv(f"{base_env}_{i}", "") for i in range(2, count + 1)],
    ]
    return [k for k in keys if k]

_KEY_POOLS: dict[str, list[str]] = {
    "groq":      _load_pool("GROQ_API_KEY"),
    "gemini":    _load_pool("GEMINI_API_KEY"),
    "anthropic": _load_pool("ANTHROPIC_API_KEY"),
    "openai":    _load_pool("OPENAI_API_KEY"),
    "nvidia":    _load_pool("NVIDIA_API_KEY"),
}

_rr_indices: dict[str, int] = {p: 0 for p in _KEY_POOLS}
_rr_lock = threading.Lock()


def _next_key(provider: str) -> str:
    """Return next key for provider in round-robin order (thread-safe).

    Uses .get() with a default of 0 so providers added dynamically after
    module startup (via save_api_key / load_plan_routing) never cause a
    KeyError — the counter is created on first access.
    """
    pool = _KEY_POOLS.get(provider, [])
    if not pool:
        return ""
    with _rr_lock:
        current = _rr_indices.get(provider, 0)
        _rr_indices[provider] = (current + 1) % len(pool)  # keep bounded, never overflows
    return pool[current % len(pool)]


# ── AI Response Cache (TTL-based LRU) ─────────────────────────
# Caches identical AI requests so 100 students asking the same
# question only cost 1 API call.  Only caches stateless calls
# (no conversation history).  Thread-safe for multi-worker uvicorn.
class _TTLCache:
    """In-process LRU cache with per-entry TTL."""

    def __init__(self, maxsize: int = 2000, ttl: int = 3600):
        self._store: OrderedDict[str, tuple] = OrderedDict()
        self._maxsize = maxsize
        self._ttl     = ttl
        self._lock    = threading.Lock()

    @staticmethod
    def make_key(provider: str, model: str, system: str, last_msg: str) -> str:
        raw = f"{provider}|{model}|{system}|{last_msg}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, key: str) -> tuple | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires = entry
            if time.monotonic() > expires:
                del self._store[key]
                return None
            self._store.move_to_end(key)   # LRU refresh
            return value

    def set(self, key: str, value: tuple) -> None:
        with self._lock:
            self._store[key] = (value, time.monotonic() + self._ttl)
            self._store.move_to_end(key)
            if len(self._store) > self._maxsize:
                self._store.popitem(last=False)   # evict oldest


_ai_cache = _TTLCache(
    maxsize=int(os.getenv("AI_CACHE_SIZE", "2000")),
    ttl=int(os.getenv("AI_CACHE_TTL", "3600")),  # 1 hour default
)

# ── Plan → default model routing (hardcoded fallback) ─────────
# Using llama-3.1-8b-instant for free tier (gemma2-9b-it was decommissioned)
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
    "llama3-8b-8192":       "llama-3.1-8b-instant",
    "llama3-70b-8192":      "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768":   "llama-3.3-70b-versatile",
    "gemma2-9b-it":         "llama-3.1-8b-instant",    # decommissioned May 2026
    "gemma-7b-it":          "llama-3.1-8b-instant",
}


def _fix_model(provider: str, model: str) -> str:
    if provider == "groq":
        return _DECOMMISSIONED_MODELS.get(model, model)
    return model



def load_plan_routing():
    """Load plan routing config AND stored API keys from app_settings into memory."""
    try:
        from app.db.connection import get_db   # local import to avoid circular deps at module load
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
                    # Handles both "api_key_groq" (slot 1) and "api_key_groq_2" … "api_key_groq_5"
                    import re as _re
                    suffix = k[len("api_key_"):]
                    slot_m = _re.match(r'^([a-z]+)_(\d+)$', suffix)
                    provider = slot_m.group(1) if slot_m else suffix
                    plain = _decrypt_key(v) if v else ""
                    if provider in _SERVER_KEYS and plain:
                        # Slot-1 key also populates _SERVER_KEYS fallback
                        if not slot_m and not _SERVER_KEYS[provider]:
                            _SERVER_KEYS[provider] = plain
                        # Add every slot to the round-robin pool (deduplicated)
                        if plain not in _KEY_POOLS.get(provider, []):
                            _KEY_POOLS.setdefault(provider, []).append(plain)
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass  # silently fall back to defaults


_ENV_BASE = {
    "groq": "GROQ_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "nvidia": "NVIDIA_API_KEY",
}


def save_api_key(provider: str, key: str, slot: int = 1):
    """Persist API key for provider at the given slot (1–5) to app_settings and update the pool."""
    db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        encrypted = _encrypt_key(key)
        cur.execute(
            """INSERT INTO app_settings (key, value, updated_at)
               VALUES (%s, %s, CURRENT_TIMESTAMP)
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
            (db_key, encrypted),
        )
        conn.commit()
        if slot == 1:
            _SERVER_KEYS[provider] = key
        if key and key not in _KEY_POOLS.get(provider, []):
            _KEY_POOLS.setdefault(provider, []).append(key)
    finally:
        conn.close()


def remove_api_key_slot(provider: str, slot: int):
    """Delete a DB key slot and rebuild the in-memory pool from env vars + remaining slots."""
    db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM app_settings WHERE key=%s", (db_key,))
        conn.commit()
        if slot == 1:
            _SERVER_KEYS[provider] = ""
        # Rebuild pool: env keys first, then remaining DB slots
        env_base = _ENV_BASE.get(provider, "")
        new_pool = _load_pool(env_base) if env_base else []
        for s in range(1, 6):
            dk = f"api_key_{provider}" if s == 1 else f"api_key_{provider}_{s}"
            cur.execute("SELECT value FROM app_settings WHERE key=%s", (dk,))
            row = cur.fetchone()
            if row and row["value"]:
                plain = _decrypt_key(row["value"])
                if plain and plain not in new_pool:
                    new_pool.append(plain)
        _KEY_POOLS[provider] = new_pool
    finally:
        conn.close()


def get_key_slot_status() -> dict:
    """Return per-provider slot info for the admin panel.  Never returns actual key values."""
    from app.db.connection import get_db
    conn = get_db()
    result = {}
    try:
        cur = conn.cursor()
        for provider in _SERVER_KEYS:
            slots: dict[int, bool] = {}
            hints: dict[int, str] = {}  # Masked key hints (first4...last4)
            for s in range(1, 6):
                dk = f"api_key_{provider}" if s == 1 else f"api_key_{provider}_{s}"
                cur.execute("SELECT value FROM app_settings WHERE key=%s AND value != ''", (dk,))
                row = cur.fetchone()
                if row and row.get('value'):
                    slots[s] = True
                    key_val = row['value']
                    # Show masked hint: first4...last4
                    if len(key_val) > 10:
                        hints[s] = f"{key_val[:4]}...{key_val[-4:]}"
                    else:
                        hints[s] = "****"
                else:
                    slots[s] = False
            env_base = _ENV_BASE.get(provider, "")
            env_keys = _load_pool(env_base) if env_base else []
            env_hints = []
            for ek in env_keys:
                if len(ek) > 10:
                    env_hints.append(f"{ek[:4]}...{ek[-4:]}")
                else:
                    env_hints.append("****")
            result[provider] = {
                "db_slots": slots,          # {1: bool, …, 5: bool}
                "db_hints": hints,          # {1: "AIza...xYz4", ...}
                "env_count": len(env_keys), # keys from .env file
                "env_hints": env_hints,     # ["gsk_...qXuF", ...]
                "pool_size": len(_KEY_POOLS.get(provider, [])),
            }
    finally:
        conn.close()
    return result


def get_key_status() -> dict[str, bool]:
    """Return {provider: has_key} — NEVER returns actual key values."""
    return {prov: bool(_KEY_POOLS.get(prov)) for prov in _SERVER_KEYS}


def get_key_pool_sizes() -> dict[str, int]:
    """Return {provider: number_of_keys_configured} for admin info."""
    return {prov: len(pool) for prov, pool in _KEY_POOLS.items()}


def save_plan_routing(plan: str, provider: str, model: str):
    """Persist one plan's routing to app_settings and update the in-memory cache."""
    from app.db.connection import get_db
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


# Preferred fallback order when the primary provider is rate-limited or unavailable.
# nvidia sits after groq so it absorbs overflow before burning Gemini quota.
_FALLBACK_ORDER = ["groq", "nvidia", "gemini", "anthropic", "openai"]

# Default model per provider used when falling back (not the user's chosen model).
_PROVIDER_DEFAULT_MODEL = {
    "groq":      "llama-3.1-8b-instant",
    "gemini":    "gemini-2.0-flash",
    "anthropic": "claude-3-5-haiku-20241022",
    "openai":    "gpt-4o-mini",
    "nvidia":    "meta/llama-3.3-70b-instruct",
}


def _first_available_provider() -> tuple[str, str] | None:
    """Return (provider, default_model) for the first provider that has any key."""
    for prov in _FALLBACK_ORDER:
        if _KEY_POOLS.get(prov):
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
    if not _KEY_POOLS.get(provider):
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
    # Early exit if no keys exist anywhere
    if not _KEY_POOLS.get(provider):
        fallback = _first_available_provider()
        if not fallback:
            return ("⚠️ AI service is temporarily unavailable. Please try again shortly.", 0, 0)
        provider, model = fallback

    # Build ordered list of (provider, model) to try.
    # Primary provider first, then fallbacks — no key pre-fetched here;
    # _next_key() is called per-attempt so the round-robin is used properly.
    def _provider_order() -> list[tuple[str, str]]:
        order = [(provider, model)]
        for prov in _FALLBACK_ORDER:
            if prov != provider and _KEY_POOLS.get(prov):
                order.append((prov, _PROVIDER_DEFAULT_MODEL[prov]))
        return order

    messages = list(history[-8:])  # keep last 8 turns
    messages.append({"role": "user", "content": str(prompt)})

    # ── Cache lookup — only for stateless calls (no prior history) ─
    cache_key: str | None = None
    if not history:
        cache_key = _TTLCache.make_key(provider, model, system_prompt, str(prompt))
        cached = _ai_cache.get(cache_key)
        if cached is not None:
            return cached

    async with httpx.AsyncClient(timeout=60.0) as client:
        for (cur_provider, cur_model) in _provider_order():
            pool_size = len(_KEY_POOLS.get(cur_provider, []))
            # Attempt once per key in the pool (min 1, max 5) so every
            # round-robin slot is tried before falling back to next provider.
            n_attempts = max(min(pool_size, 5), 1)

            for attempt in range(n_attempts):
                key = _next_key(cur_provider)
                if not key:
                    break

                try:
                    if cur_provider == "anthropic":
                        result = await _anthropic(client, cur_model, key, system_prompt, messages, max_tokens)
                    elif cur_provider == "openai":
                        result = await _openai(client, cur_model, key, system_prompt, messages, max_tokens)
                    elif cur_provider == "gemini":
                        result = await _gemini(client, cur_model, key, system_prompt, messages, max_tokens)
                    elif cur_provider == "groq":
                        result = await _groq(client, cur_model, key, system_prompt, messages, max_tokens)
                    elif cur_provider == "nvidia":
                        result = await _nvidia(client, cur_model, key, system_prompt, messages, max_tokens)
                    else:
                        break  # unknown provider → try next

                    text, ptok, ctok = result
                    if text and not text.startswith("\u26a0\ufe0f"):
                        # Valid response — cache if stateless and return
                        if cache_key:
                            _ai_cache.set(cache_key, (text, ptok, ctok))
                        return text, ptok, ctok
                    elif text.startswith("\u26a0\ufe0f"):
                        # Provider returned 200 OK but with an error body
                        # (e.g. content filter, model overload). Skip remaining
                        # keys for this provider and try the next provider.
                        break
                    # Empty text → continue to next key

                except httpx.TimeoutException:
                    if attempt == n_attempts - 1:
                        break  # all keys timed out → try next provider
                    await asyncio.sleep((attempt + 1) * 2)

                except httpx.HTTPStatusError as exc:
                    status = exc.response.status_code
                    if status == 429:
                        # Key is rate-limited — next iteration will pull the next
                        # round-robin key automatically; just wait and continue.
                        if attempt < n_attempts - 1:
                            await asyncio.sleep(min((attempt + 1) * 3, 15))
                            continue
                        break  # all keys rate-limited → try next provider
                    if status == 400:
                        err_text = exc.response.text.lower()
                        if "decommissioned" in err_text or "deprecated" in err_text or "no longer supported" in err_text:
                            fixed = _DECOMMISSIONED_MODELS.get(cur_model)
                            if fixed and fixed != cur_model:
                                cur_model = fixed
                                continue
                        break  # unrecoverable 400 → try next provider
                    if status == 413:
                        if cur_provider == "groq" and cur_model != "llama-3.3-70b-versatile":
                            cur_model = "llama-3.3-70b-versatile"
                            continue
                        break  # request too large → try next provider
                    if attempt == n_attempts - 1:
                        break
                    await asyncio.sleep(2)

                except Exception:
                    if attempt == n_attempts - 1:
                        break  # unexpected error → try next provider
                    await asyncio.sleep(2)

    return ("⚠️ AI service is temporarily unavailable. Please try again shortly.", 0, 0)


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


# ── NVIDIA NIM — OpenAI-compatible, free tier 1000 calls/model ──
# Base URL: https://integrate.api.nvidia.com/v1
# Models (format: "org/model-name"):
#   meta/llama-3.3-70b-instruct      ← strong 70B, default
#   meta/llama-3.1-8b-instruct       ← fast/light
#   nvidia/llama-3.3-nemotron-super-49b-v1  ← NVIDIA fine-tune, very capable
#   nvidia/llama-3.1-nemotron-ultra-253b-v1 ← most powerful, use for premium
#   mistralai/mistral-nemotron        ← reasoning/coding
#   deepseek-ai/deepseek-v4-flash     ← fast reasoning
async def _nvidia(client: httpx.AsyncClient, model: str, key: str,
                  system: str, messages: list, max_tokens: int) -> tuple[str, int, int]:
    r = await client.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"},
        json={
            "model": model, "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": str(system)}, *messages],
        },
        timeout=90.0,  # NVIDIA NIM can be slower on first call (cold start)
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return ("⚠️ " + data["error"].get("message", "Unknown error"), 0, 0)
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = data.get("usage", {})
    return text, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
