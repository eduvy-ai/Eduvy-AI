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

# Cloudflare (in front of api.groq.com, etc.) 1010-blocks requests whose client
# looks like a bare bot. A real browser User-Agent reliably passes its bot check.
_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

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

_decrypt_logger = __import__("logging").getLogger(__name__)

def _decrypt_key(value: str) -> str:
    """Decrypt a DB-stored API key.

    Fallback logic:
    - If decryption succeeds → return plaintext.
    - If decryption fails AND the value does NOT start with 'gAAAAA'
      (i.e. it's an old plaintext row, not a Fernet token) → return as-is.
    - If decryption fails AND the value looks like a Fernet token → it means
      JWT_SECRET has changed; log a warning and return "" so the key is not
      added to the pool with a garbage value.
    """
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except (InvalidToken, Exception) as exc:
        # Fernet tokens always start with 'gAAAAA' (URL-safe base64 prefix)
        if value.startswith("gAAAAA"):
            _decrypt_logger.error(
                "_decrypt_key: failed to decrypt a Fernet token — JWT_SECRET may have changed. "
                "Re-save the API key via the admin panel. Error: %s", exc,
            )
            return ""  # do NOT add garbage to the pool
        # Old plaintext row (before encryption was added) — return as-is
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
# All plans use Gemini by default; Groq is primary fallback
_DEFAULT_PLAN_ROUTING: dict[str, dict] = {
    "free":    {"provider": "gemini", "model": "gemini-3.5-flash"},
    "basic":   {"provider": "gemini", "model": "gemini-3.5-flash"},
    "pro":     {"provider": "gemini", "model": "gemini-3.5-flash"},
    "premium": {"provider": "gemini", "model": "gemini-3.5-flash"},
}

# In-memory cache — updated by load_plan_routing() / save_plan_routing()
_PLAN_ROUTING: dict[str, dict] = dict(_DEFAULT_PLAN_ROUTING)


# Models that have been decommissioned → auto-replace on load
_DECOMMISSIONED_MODELS = {
    "llama3-8b-8192":         "openai/gpt-oss-20b",
    "llama3-70b-8192":        "openai/gpt-oss-120b",
    "llama-3.1-8b-instant":   "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile":"openai/gpt-oss-120b",
    "mixtral-8x7b-32768":     "openai/gpt-oss-120b",
    "gemma2-9b-it":           "openai/gpt-oss-20b",
    "gemma-7b-it":            "openai/gpt-oss-20b",
    "gemini-2.0-flash":       "gemini-3.5-flash",
    "gemini-2.0-flash-lite":  "gemini-3.5-flash-lite",
    "gemini-2.5-flash":       "gemini-3.5-flash",
    "gemini-2.5-flash-lite":  "gemini-3.5-flash-lite",
}


def _fix_model(provider: str, model: str) -> str:
    if provider == "groq":
        return _DECOMMISSIONED_MODELS.get(model, model)
    if provider == "gemini":
        return _DECOMMISSIONED_MODELS.get(model, model)
    return model



_load_logger = __import__("logging").getLogger(__name__)

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
            keys_loaded: list[str] = []
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
                    except Exception as _e:
                        _load_logger.warning("load_plan_routing: failed to parse routing row %s: %s", k, _e)
                elif k.startswith("api_key_"):
                    # Handles both "api_key_groq" (slot 1) and "api_key_groq_2" … "api_key_groq_5"
                    import re as _re
                    suffix = k[len("api_key_"):]
                    slot_m = _re.match(r'^([a-z]+)_(\d+)$', suffix)
                    provider = slot_m.group(1) if slot_m else suffix
                    _PROVIDER_ALIASES = {"google": "gemini"}
                    provider = _PROVIDER_ALIASES.get(provider, provider)
                    try:
                        plain = _decrypt_key(v) if v else ""
                    except Exception as _e:
                        _load_logger.warning("load_plan_routing: failed to decrypt key %s: %s", k, _e)
                        plain = ""
                    if provider in _SERVER_KEYS and plain:
                        # Slot-1 key also populates _SERVER_KEYS fallback
                        if not slot_m and not _SERVER_KEYS[provider]:
                            _SERVER_KEYS[provider] = plain
                        # Add every slot to the round-robin pool (deduplicated)
                        if plain not in _KEY_POOLS.get(provider, []):
                            _KEY_POOLS.setdefault(provider, []).append(plain)
                        keys_loaded.append(k)
                    elif provider not in _SERVER_KEYS:
                        _load_logger.warning("load_plan_routing: unknown provider '%s' for DB key %s", provider, k)
                    elif not plain:
                        _load_logger.warning("load_plan_routing: key %s decrypted to empty string (check JWT_SECRET)", k)
            conn.commit()
            if keys_loaded:
                _load_logger.info("load_plan_routing: loaded DB keys for: %s", keys_loaded)
            else:
                _load_logger.warning(
                    "load_plan_routing: no API keys found in DB (app_settings). "
                    "Pool sizes after load: %s",
                    {p: len(pool) for p, pool in _KEY_POOLS.items()},
                )
        finally:
            conn.close()
    except Exception as exc:
        _load_logger.error(
            "load_plan_routing: failed to load from DB — AI will use env-var keys only. Error: %s",
            exc,
            exc_info=True,
        )


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
                    plain = _decrypt_key(key_val)
                    if plain and len(plain) > 10:
                        hints[s] = f"{plain[:4]}...{plain[-4:]}"
                    elif plain:
                        hints[s] = "****"
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
# Gemini is primary; Groq absorbs overflow before burning other quotas.
_FALLBACK_ORDER = ["gemini", "groq", "nvidia", "anthropic", "openai"]

# Default model per provider used when falling back (not the user's chosen model).
# Use the most capable model per provider so fallbacks can handle large outputs
# (e.g. video script generation that needs 8k–16k output tokens).
_PROVIDER_DEFAULT_MODEL = {
    "groq":      "openai/gpt-oss-120b",
    "gemini":    "gemini-3.5-flash",
    "anthropic": "claude-3-5-haiku-20241022",
    "openai":    "gpt-4o-mini",
    "nvidia":    "meta/llama-3.3-70b-instruct",
}

# Hard per-model output token caps — used to clamp max_tokens before sending.
# Prevents HTTP 400 "max_tokens exceeds model limit" errors.
_MODEL_MAX_OUTPUT_TOKENS: dict[str, int] = {
    "openai/gpt-oss-20b":       16384,
    "openai/gpt-oss-120b":      32768,
    "qwen/qwen3.6-27b":         32768,
    "gemini-3.5-flash":          8192,
    "gemini-3.5-flash-lite":     8192,
    "gemini-3.7-flash":          8192,
    "gpt-4o-mini":              16384,
    "gpt-4o":                   16384,
    "claude-3-5-haiku-20241022": 8192,
    "claude-3-5-sonnet-20241022": 8192,
    "meta/llama-3.3-70b-instruct": 32768,
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

    async with httpx.AsyncClient(timeout=120.0, headers={"User-Agent": _BROWSER_UA}) as client:
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
                    import logging as _lg
                    if status == 429:
                        # Rate limited. Log the ACTUAL limit (tokens-per-day vs
                        # tokens-per-minute + reset) so it's never opaque, then try
                        # the next round-robin key immediately (it may have budget).
                        retry_after = exc.response.headers.get("retry-after", "?")
                        _lg.getLogger(__name__).warning(
                            "call_ai [%s/%s] 429 rate limit (key %d/%d, retry-after=%ss): %s",
                            cur_provider, cur_model, attempt + 1, n_attempts, retry_after,
                            exc.response.text[:150],
                        )
                        if attempt < n_attempts - 1:
                            await asyncio.sleep(1)  # brief — next key may be fine
                            continue
                        break  # every key rate-limited → try next provider
                    # Non-429: surface the real cause (403 Cloudflare block, 401 bad
                    # key, etc.) instead of a silent fallthrough.
                    _lg.getLogger(__name__).warning(
                        "call_ai [%s/%s] HTTP %s (attempt %d): %s",
                        cur_provider, cur_model, status, attempt + 1,
                        exc.response.text[:180],
                    )
                    if status == 400:
                        err_text = exc.response.text.lower()
                        if "decommissioned" in err_text or "deprecated" in err_text or "no longer supported" in err_text:
                            fixed = _DECOMMISSIONED_MODELS.get(cur_model)
                            if fixed and fixed != cur_model:
                                cur_model = fixed
                                continue
                        # max_tokens exceeds this model's hard limit — clamp and retry.
                        # Groq 8b models cap at 8192; 70b at 32768.
                        if "max_tokens" in err_text and max_tokens > 4096:
                            model_cap = _MODEL_MAX_OUTPUT_TOKENS.get(cur_model, 8192)
                            clamped = min(max_tokens, model_cap)
                            if clamped < max_tokens:
                                max_tokens = clamped
                                continue  # retry same key with clamped value
                        break  # unrecoverable 400 → try next provider
                    if status == 413:
                        if cur_provider == "groq" and cur_model != "openai/gpt-oss-120b":
                            cur_model = "openai/gpt-oss-120b"
                            continue
                        break  # request too large → try next provider
                    if attempt == n_attempts - 1:
                        break
                    await asyncio.sleep(2)

                except Exception as _exc:
                    import logging as _lg
                    _lg.getLogger(__name__).error(
                        "call_ai [%s/%s] unexpected error (attempt %d): %s",
                        cur_provider, cur_model, attempt + 1, _exc
                    )
                    if attempt == n_attempts - 1:
                        break  # unexpected error → try next provider
                    await asyncio.sleep(2)

    import logging as _lg
    _lg.getLogger(__name__).error(
        "call_ai: all providers exhausted — no valid response. providers_tried=%s",
        [p for p, _ in _provider_order()]
    )
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
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
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


async def _gemini_vision(client: httpx.AsyncClient, model: str, key: str,
                         prompt: str, image_base64: str, mime_type: str,
                         max_tokens: int = 1000) -> tuple[str, int, int]:
    """Call Gemini Vision API with an image."""
    r = await client.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        json={
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_base64}}
                ]
            }],
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


async def call_vision(
    image_base64: str,
    mime_type: str,
    prompt: str,
    language: str = "English",
) -> tuple[str, int, int]:
    """Extract text/content from an image using Gemini Vision."""
    # Get a Gemini key
    key = _next_key("gemini")
    if not key:
        return ("⚠️ Vision service is temporarily unavailable.", 0, 0)
    
    model = "gemini-3.5-flash"
    
    async with httpx.AsyncClient(timeout=60.0, headers={"User-Agent": _BROWSER_UA}) as client:
        try:
            result = await _gemini_vision(
                client, model, key, prompt, image_base64, mime_type, max_tokens=1500
            )
            return result
        except httpx.HTTPStatusError as exc:
            return (f"⚠️ Vision error: {exc.response.status_code}", 0, 0)
        except Exception as exc:
            return (f"⚠️ Vision error: {str(exc)[:100]}", 0, 0)


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


# ══════════════════════════════════════════════════════════════════════════════
# MODEL DISCOVERY — Fetch available models per provider
# ══════════════════════════════════════════════════════════════════════════════

_model_logger = __import__("logging").getLogger(__name__)


async def list_models_gemini(api_key: str) -> list[dict]:
    """Fetch available models from Gemini API.
    
    Returns list of: {id, name, context_window, max_output, capabilities}
    """
    async with httpx.AsyncClient(timeout=30.0, headers={"User-Agent": _BROWSER_UA}) as client:
        try:
            r = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": api_key},
            )
            r.raise_for_status()
            data = r.json()
            
            models = []
            for m in data.get("models", []):
                # Only include models that support generateContent
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" not in methods:
                    continue
                    
                model_id = m.get("name", "").replace("models/", "")
                if not model_id:
                    continue
                    
                models.append({
                    "id": model_id,
                    "name": m.get("displayName", model_id),
                    "context_window": m.get("inputTokenLimit", 0),
                    "max_output": m.get("outputTokenLimit", 0),
                    "capabilities": {
                        "vision": "countTokens" in methods,  # Vision models support countTokens
                        "code": "code" in model_id.lower(),
                        "thinking": "thinking" in model_id.lower(),
                    },
                })
            return models
        except httpx.HTTPStatusError as e:
            _model_logger.error("list_models_gemini HTTP %s: %s", e.response.status_code, e.response.text[:200])
            return []
        except Exception as e:
            _model_logger.error("list_models_gemini error: %s", e)
            return []


async def list_models_groq(api_key: str) -> list[dict]:
    """Fetch available models from Groq API (OpenAI-compatible endpoint)."""
    async with httpx.AsyncClient(timeout=30.0, headers={"User-Agent": _BROWSER_UA}) as client:
        try:
            r = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            r.raise_for_status()
            data = r.json()
            
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                if not model_id or not m.get("active", True):
                    continue
                    
                models.append({
                    "id": model_id,
                    "name": model_id,
                    "context_window": m.get("context_window", 0),
                    "max_output": m.get("max_completion_tokens", 8192),
                    "capabilities": {
                        "vision": "vision" in model_id.lower(),
                        "code": True,  # All Groq models support code
                    },
                })
            return models
        except httpx.HTTPStatusError as e:
            _model_logger.error("list_models_groq HTTP %s: %s", e.response.status_code, e.response.text[:200])
            return []
        except Exception as e:
            _model_logger.error("list_models_groq error: %s", e)
            return []


async def list_models_openai(api_key: str) -> list[dict]:
    """Fetch available models from OpenAI API."""
    async with httpx.AsyncClient(timeout=30.0, headers={"User-Agent": _BROWSER_UA}) as client:
        try:
            r = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            r.raise_for_status()
            data = r.json()
            
            # Extract org ID from headers if present
            org_id = r.headers.get("openai-organization", "")
            
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                # Only include chat models (gpt-*)
                if not model_id.startswith("gpt-"):
                    continue
                    
                models.append({
                    "id": model_id,
                    "name": model_id,
                    "context_window": _MODEL_CONTEXT_WINDOWS.get(model_id, 128000),
                    "max_output": _MODEL_MAX_OUTPUT_TOKENS.get(model_id, 16384),
                    "capabilities": {
                        "vision": "vision" in model_id or model_id in ("gpt-4o", "gpt-4o-mini"),
                        "code": True,
                    },
                    "org_id": org_id,
                })
            return models
        except httpx.HTTPStatusError as e:
            _model_logger.error("list_models_openai HTTP %s: %s", e.response.status_code, e.response.text[:200])
            return []
        except Exception as e:
            _model_logger.error("list_models_openai error: %s", e)
            return []


async def list_models_anthropic(api_key: str) -> list[dict]:
    """Fetch available models from Anthropic API (best metadata)."""
    async with httpx.AsyncClient(timeout=30.0, headers={"User-Agent": _BROWSER_UA}) as client:
        try:
            r = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
            )
            r.raise_for_status()
            data = r.json()
            
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                if not model_id:
                    continue
                    
                models.append({
                    "id": model_id,
                    "name": m.get("display_name", model_id),
                    "context_window": m.get("input_context_window", 200000),
                    "max_output": m.get("max_tokens", 8192),
                    "capabilities": {
                        "vision": m.get("supports_vision", False),
                        "code": True,
                        "thinking": m.get("supports_extended_thinking", False),
                        "batch": m.get("supports_batch", False),
                    },
                })
            return models
        except httpx.HTTPStatusError as e:
            _model_logger.error("list_models_anthropic HTTP %s: %s", e.response.status_code, e.response.text[:200])
            return []
        except Exception as e:
            _model_logger.error("list_models_anthropic error: %s", e)
            return []


def list_models_nvidia() -> list[dict]:
    """Return hardcoded NVIDIA NIM models (no listing API available)."""
    return [
        {"id": "meta/llama-3.3-70b-instruct", "name": "Llama 3.3 70B Instruct", 
         "context_window": 128000, "max_output": 32768, "capabilities": {"code": True}},
        {"id": "meta/llama-3.1-8b-instruct", "name": "Llama 3.1 8B Instruct",
         "context_window": 128000, "max_output": 8192, "capabilities": {"code": True}},
        {"id": "nvidia/llama-3.3-nemotron-super-49b-v1", "name": "Nemotron Super 49B",
         "context_window": 128000, "max_output": 32768, "capabilities": {"code": True}},
        {"id": "nvidia/llama-3.1-nemotron-ultra-253b-v1", "name": "Nemotron Ultra 253B",
         "context_window": 128000, "max_output": 32768, "capabilities": {"code": True}},
        {"id": "mistralai/mistral-nemotron", "name": "Mistral Nemotron",
         "context_window": 128000, "max_output": 16384, "capabilities": {"code": True}},
        {"id": "deepseek-ai/deepseek-v4-flash", "name": "DeepSeek V4 Flash",
         "context_window": 64000, "max_output": 8192, "capabilities": {"code": True}},
    ]


# Context window sizes for models (used when API doesn't return it)
_MODEL_CONTEXT_WINDOWS = {
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4-turbo": 128000,
    "gpt-4": 8192,
    "gpt-3.5-turbo": 16385,
}


async def validate_and_list_models(provider: str, api_key: str) -> dict:
    """Validate an API key and return available models.
    
    Returns: {
        valid: bool,
        error: str | None,
        models: [{id, name, context_window, max_output, capabilities}],
        org_id: str | None (OpenAI only),
        rate_limits: dict | None (Anthropic only)
    }
    """
    result = {"valid": False, "error": None, "models": [], "org_id": None, "rate_limits": None}
    
    try:
        if provider == "gemini":
            models = await list_models_gemini(api_key)
        elif provider == "groq":
            models = await list_models_groq(api_key)
        elif provider == "openai":
            models = await list_models_openai(api_key)
            if models and models[0].get("org_id"):
                result["org_id"] = models[0]["org_id"]
        elif provider == "anthropic":
            models = await list_models_anthropic(api_key)
        elif provider == "nvidia":
            # For NVIDIA, we just validate the key works with a simple call
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.get(
                    "https://integrate.api.nvidia.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                # NVIDIA may not have a models endpoint, so we just check auth
                if r.status_code in (200, 404):
                    models = list_models_nvidia()
                else:
                    r.raise_for_status()
                    models = []
        else:
            result["error"] = f"Unknown provider: {provider}"
            return result
            
        if models:
            result["valid"] = True
            result["models"] = models
        else:
            result["error"] = "Key invalid or no models available"
            
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 401:
            result["error"] = "Invalid API key"
        elif status == 403:
            result["error"] = "Access denied (key may be restricted)"
        elif status == 429:
            result["error"] = "Rate limited — try again later"
        else:
            result["error"] = f"HTTP {status}: {e.response.text[:100]}"
    except Exception as e:
        result["error"] = str(e)
        
    return result


async def validate_existing_key(provider: str, slot: int) -> dict:
    """Validate an existing key by provider+slot (fetches from DB).
    
    Returns same structure as validate_and_list_models.
    """
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT encrypted_key FROM ai_provider_keys WHERE provider = %s AND slot = %s",
            (provider, slot)
        )
        row = cur.fetchone()
        if not row:
            return {"valid": False, "error": "Key not found", "models": []}
        
        decrypted = _decrypt_key(row["encrypted_key"])
        if not decrypted:
            return {"valid": False, "error": "Failed to decrypt key", "models": []}
        
        # Run validation
        result = await validate_and_list_models(provider, decrypted)
        
        # Update validation status in DB
        new_status = "valid" if result["valid"] else "invalid"
        cur.execute("""
            UPDATE ai_provider_keys 
            SET validation_status = %s, last_validated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE provider = %s AND slot = %s
        """, (new_status, provider, slot))
        conn.commit()
        
        return result
    except Exception as e:
        _model_logger.error("validate_existing_key error: %s", e)
        return {"valid": False, "error": str(e), "models": []}
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════════
# ENHANCED KEY MANAGEMENT — Using new ai_provider_keys table
# ══════════════════════════════════════════════════════════════════════════════

def save_api_key_enhanced(
    provider: str,
    key: str,
    slot: int = 1,
    owner_email: str = "",
    project_name: str = "",
    description: str = "",
    rpm_limit: int | None = None,
    tpm_limit: int | None = None,
    daily_limit: int | None = None,
    created_by: str | None = None,
) -> dict:
    """Save API key with metadata to new ai_provider_keys table.
    
    Also maintains backward compatibility by syncing to app_settings.
    """
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        encrypted = _encrypt_key(key)
        
        # Insert/update in new table
        cur.execute("""
            INSERT INTO ai_provider_keys 
                (provider, slot, encrypted_key, owner_email, project_name, description,
                 rpm_limit, tpm_limit, daily_limit, created_by, validation_status, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', CURRENT_TIMESTAMP)
            ON CONFLICT (provider, slot) DO UPDATE SET
                encrypted_key = EXCLUDED.encrypted_key,
                owner_email = EXCLUDED.owner_email,
                project_name = EXCLUDED.project_name,
                description = EXCLUDED.description,
                rpm_limit = EXCLUDED.rpm_limit,
                tpm_limit = EXCLUDED.tpm_limit,
                daily_limit = EXCLUDED.daily_limit,
                validation_status = 'pending',
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (provider, slot, encrypted, owner_email, project_name, description,
              rpm_limit, tpm_limit, daily_limit, created_by))
        
        row = cur.fetchone()
        key_id = row["id"] if row else None
        
        # Backward compat: also save to app_settings
        db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
        cur.execute("""
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP
        """, (db_key, encrypted))
        
        conn.commit()
        
        # Update in-memory pools
        if slot == 1:
            _SERVER_KEYS[provider] = key
        if key and key not in _KEY_POOLS.get(provider, []):
            _KEY_POOLS.setdefault(provider, []).append(key)
            
        return {"success": True, "id": key_id}
    except Exception as e:
        conn.rollback()
        _model_logger.error("save_api_key_enhanced error: %s", e)
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def update_key_validation_status(provider: str, slot: int, status: str):
    """Update the validation status of a key after testing it."""
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE ai_provider_keys 
            SET validation_status = %s, last_validated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE provider = %s AND slot = %s
        """, (status, provider, slot))
        conn.commit()
    finally:
        conn.close()


def get_provider_keys_enhanced(provider: str | None = None) -> list[dict]:
    """Get all keys with metadata from ai_provider_keys table.
    
    If provider is None, returns all providers.
    Never returns actual key values - only masked hints.
    """
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        if provider:
            cur.execute("""
                SELECT id, provider, slot, encrypted_key, owner_email, project_name, description,
                       rpm_limit, tpm_limit, daily_limit, is_enabled, last_validated, 
                       validation_status, created_by, created_at, updated_at
                FROM ai_provider_keys
                WHERE provider = %s
                ORDER BY slot
            """, (provider,))
        else:
            cur.execute("""
                SELECT id, provider, slot, encrypted_key, owner_email, project_name, description,
                       rpm_limit, tpm_limit, daily_limit, is_enabled, last_validated,
                       validation_status, created_by, created_at, updated_at
                FROM ai_provider_keys
                ORDER BY provider, slot
            """)
        
        rows = cur.fetchall()
        result = []
        for row in rows:
            # Mask the key
            plain = _decrypt_key(row["encrypted_key"])
            if plain and len(plain) > 10:
                key_hint = f"{plain[:4]}...{plain[-4:]}"
            elif plain:
                key_hint = "****"
            else:
                key_hint = "(decryption failed)"
                
            result.append({
                "id": row["id"],
                "provider": row["provider"],
                "slot": row["slot"],
                "key_hint": key_hint,
                "owner_email": row["owner_email"] or "",
                "project_name": row["project_name"] or "",
                "description": row["description"] or "",
                "rpm_limit": row["rpm_limit"],
                "tpm_limit": row["tpm_limit"],
                "daily_limit": row["daily_limit"],
                "is_enabled": row["is_enabled"],
                "last_validated": row["last_validated"].isoformat() if row["last_validated"] else None,
                "validation_status": row["validation_status"],
                "created_by": row["created_by"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            })
        return result
    finally:
        conn.close()


def toggle_key_enabled(provider: str, slot: int, enabled: bool) -> bool:
    """Enable/disable a key without deleting it."""
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE ai_provider_keys 
            SET is_enabled = %s, updated_at = CURRENT_TIMESTAMP
            WHERE provider = %s AND slot = %s
        """, (enabled, provider, slot))
        conn.commit()
        
        # If disabling, remove from in-memory pool
        if not enabled:
            cur.execute("SELECT encrypted_key FROM ai_provider_keys WHERE provider = %s AND slot = %s", (provider, slot))
            row = cur.fetchone()
            if row:
                plain = _decrypt_key(row["encrypted_key"])
                if plain and plain in _KEY_POOLS.get(provider, []):
                    _KEY_POOLS[provider].remove(plain)
        else:
            # Re-add to pool
            cur.execute("SELECT encrypted_key FROM ai_provider_keys WHERE provider = %s AND slot = %s", (provider, slot))
            row = cur.fetchone()
            if row:
                plain = _decrypt_key(row["encrypted_key"])
                if plain and plain not in _KEY_POOLS.get(provider, []):
                    _KEY_POOLS.setdefault(provider, []).append(plain)
                    
        return True
    except Exception as e:
        conn.rollback()
        _model_logger.error("toggle_key_enabled error: %s", e)
        return False
    finally:
        conn.close()


def update_key_metadata(
    provider: str,
    slot: int,
    owner_email: str | None = None,
    project_name: str | None = None,
    description: str | None = None,
    rpm_limit: int | None = None,
    tpm_limit: int | None = None,
    daily_limit: int | None = None,
) -> bool:
    """Update key metadata without changing the key itself."""
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Check if key exists
        cur.execute("SELECT id FROM ai_provider_keys WHERE provider = %s AND slot = %s", (provider, slot))
        if not cur.fetchone():
            return False
        
        cur.execute("""
            UPDATE ai_provider_keys 
            SET owner_email = COALESCE(%s, owner_email),
                project_name = COALESCE(%s, project_name),
                description = COALESCE(%s, description),
                rpm_limit = %s,
                tpm_limit = %s,
                daily_limit = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE provider = %s AND slot = %s
        """, (owner_email, project_name, description, rpm_limit, tpm_limit, daily_limit, provider, slot))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        _model_logger.error("update_key_metadata error: %s", e)
        return False
    finally:
        conn.close()


def cache_provider_models(provider: str, models: list[dict]):
    """Cache discovered models in ai_provider_models table."""
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        for m in models:
            cur.execute("""
                INSERT INTO ai_provider_models 
                    (provider, model_id, display_name, context_window, max_output, capabilities, last_fetched)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (provider, model_id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    context_window = EXCLUDED.context_window,
                    max_output = EXCLUDED.max_output,
                    capabilities = EXCLUDED.capabilities,
                    is_available = TRUE,
                    last_fetched = CURRENT_TIMESTAMP
            """, (
                provider,
                m["id"],
                m.get("name", m["id"]),
                m.get("context_window", 0),
                m.get("max_output", 0),
                json.dumps(m.get("capabilities", {})),
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        _model_logger.error("cache_provider_models error: %s", e)
    finally:
        conn.close()


def get_cached_models(provider: str | None = None) -> list[dict]:
    """Get cached models from ai_provider_models table."""
    from app.db.connection import get_db
    conn = get_db()
    try:
        cur = conn.cursor()
        if provider:
            cur.execute("""
                SELECT provider, model_id, display_name, context_window, max_output, capabilities, is_available, last_fetched
                FROM ai_provider_models
                WHERE provider = %s AND is_available = TRUE
                ORDER BY model_id
            """, (provider,))
        else:
            cur.execute("""
                SELECT provider, model_id, display_name, context_window, max_output, capabilities, is_available, last_fetched
                FROM ai_provider_models
                WHERE is_available = TRUE
                ORDER BY provider, model_id
            """)
        
        rows = cur.fetchall()
        result = []
        for row in rows:
            caps = row["capabilities"]
            if isinstance(caps, str):
                caps = json.loads(caps)
            result.append({
                "provider": row["provider"],
                "id": row["model_id"],
                "name": row["display_name"],
                "context_window": row["context_window"],
                "max_output": row["max_output"],
                "capabilities": caps,
                "last_fetched": row["last_fetched"].isoformat() if row["last_fetched"] else None,
            })
        return result
    finally:
        conn.close()
