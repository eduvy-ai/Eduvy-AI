"""
Image Generation — free, no-API-key hero illustrations for whiteboard videos.

Primary backend: Pollinations.ai (https://pollinations.ai) — a free image
generation endpoint that needs NO API key and NO payment. We request a
hand-drawn / whiteboard-styled illustration for a single scene, download it,
and cache it on disk keyed by the (prompt + style + size) hash so re-renders
are instant.

Design goals:
  * Zero cost — no paid provider, no key required.
  * Graceful — ANY failure (timeout, network, rate-limit) returns None so the
    caller falls back to the pure-SVG doodle renderer. The video never breaks
    just because an image couldn't be fetched.
  * Whiteboard-native — prompts are rewritten so the model draws clean marker
    line-art on a white/chalk background that matches the chosen style, and we
    explicitly forbid text/letters (image models garble words).

The public entry point is `generate_illustration_data_uri()`, which returns a
base64 `data:` URI ready to drop straight into an <image href="..."> element.
Data URIs are used (rather than file paths) because the renderer loads scenes
as a local file:// page in headless Chromium, where embedded data URIs are the
most reliable way to guarantee the picture actually paints.
"""
import asyncio
import base64
import hashlib
import logging
import os
import ssl
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

# Cache directory (under the repo's /videos folder, which is gitignored + writable)
_CACHE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "videos", "_img_cache")
)

_POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/"

# Per-style prompt suffix so the generated picture matches the whiteboard look.
# Keys mirror svg_renderer.STYLE_CONFIGS.
_STYLE_SUFFIX = {
    "sketch_classic": (
        "black ink marker line-art doodle, hand-drawn whiteboard illustration, "
        "thick clean confident outlines, minimal, white background, educational"
    ),
    "sketch_dark": (
        "white chalk drawing on a dark green chalkboard, hand-drawn, simple, "
        "clean chalk lines, educational sketch"
    ),
    "canvas_colorful": (
        "colorful hand-drawn marker doodle illustration, bold outlines, flat "
        "friendly colors, whiteboard explainer style, white background, playful"
    ),
    "canvas_minimal": (
        "minimal flat single-line illustration, one accent color, lots of white "
        "space, clean modern vector doodle, white background"
    ),
    "blackboard": (
        "white chalk illustration on a blackboard, simple hand-drawn chalk lines, "
        "educational diagram"
    ),
}
_DEFAULT_SUFFIX = _STYLE_SUFFIX["sketch_classic"]

# Appended to every prompt — image models cannot spell, so keep words out.
_NEGATIVE = "no text, no words, no letters, no watermark, no signature, no caption"


def _styled_prompt(prompt: str, style_variant: str) -> str:
    suffix = _STYLE_SUFFIX.get(style_variant, _DEFAULT_SUFFIX)
    clean = " ".join((prompt or "").strip().split())[:300]
    return f"{clean}. {suffix}. {_NEGATIVE}"


def _dims_for(orientation: str) -> tuple[int, int]:
    # Kept modest so free generation is fast; the SVG scales the picture up.
    return (1024, 640) if orientation == "horizontal" else (720, 960)


def _cache_path(styled: str, width: int, height: int, seed: int) -> str:
    digest = hashlib.sha256(
        f"{styled}|{width}x{height}|{seed}".encode("utf-8")
    ).hexdigest()[:24]
    return os.path.join(_CACHE_DIR, f"{digest}.jpg")


def _build_url(styled: str, width: int, height: int, seed: int) -> str:
    encoded = urllib.parse.quote(styled, safe="")
    params = urllib.parse.urlencode({
        "width": width,
        "height": height,
        "seed": seed,
        "nologo": "true",
        "model": "flux",
        "safe": "true",
    })
    return f"{_POLLINATIONS_BASE}{encoded}?{params}"


# Backoff (seconds) between fetch attempts. The free Pollinations tier
# rate-limits bursts with HTTP 429; a short wait almost always clears it.
_RETRY_DELAYS = [0.0, 4.0, 9.0]


async def _fetch(url: str, timeout: float) -> Optional[bytes]:
    """Download image bytes, retrying transient failures / 429s. None on give-up."""
    try:
        import httpx
    except ImportError:  # pragma: no cover - httpx ships with FastAPI stack
        logger.warning("image_gen: httpx not installed, skipping illustration")
        return None

    # Unverified SSL context tolerates corporate proxies (same rationale as the
    # edge-tts SSL patch in audio_pipeline). Cloud hosts are unaffected.
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    async with httpx.AsyncClient(
        verify=ctx, follow_redirects=True, timeout=timeout
    ) as client:
        for attempt, delay in enumerate(_RETRY_DELAYS):
            if delay:
                await asyncio.sleep(delay)
            try:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            except Exception as exc:
                logger.warning("image_gen: fetch error (attempt %d): %s", attempt + 1, exc)
                continue  # transient — retry

            if resp.status_code == 429:
                logger.warning("image_gen: rate-limited (429), attempt %d/%d",
                               attempt + 1, len(_RETRY_DELAYS))
                continue  # back off and retry
            if resp.status_code != 200:
                logger.warning("image_gen: HTTP %s from Pollinations (giving up)",
                               resp.status_code)
                return None  # non-retryable

            content = resp.content
            ctype = resp.headers.get("content-type", "")
            if not content or len(content) < 1024 or "image" not in ctype:
                logger.warning("image_gen: bad response (len=%d, type=%s), attempt %d",
                               len(content), ctype, attempt + 1)
                continue  # sometimes a transient error page — retry
            return content

    logger.warning("image_gen: exhausted retries, falling back to SVG")
    return None


async def generate_illustration(
    prompt: str,
    style_variant: str = "sketch_classic",
    orientation: str = "horizontal",
    seed: int = 0,
    timeout: float = 28.0,
) -> Optional[str]:
    """
    Generate (or fetch from cache) a whiteboard-style illustration.
    Returns an absolute local file path, or None if generation failed.
    """
    if not (prompt and prompt.strip()):
        return None

    width, height = _dims_for(orientation)
    styled = _styled_prompt(prompt, style_variant)
    path = _cache_path(styled, width, height, seed)

    # Cache hit
    if os.path.exists(path) and os.path.getsize(path) > 1024:
        logger.info("image_gen: cache hit %s", os.path.basename(path))
        return path

    url = _build_url(styled, width, height, seed)
    logger.info("image_gen: requesting illustration (%dx%d) '%s...'",
                width, height, styled[:70])
    data = await _fetch(url, timeout)
    if not data:
        return None

    os.makedirs(_CACHE_DIR, exist_ok=True)
    try:
        with open(path, "wb") as f:
            f.write(data)
    except OSError as exc:
        logger.warning("image_gen: could not cache image: %s", exc)
        # Still usable in-memory this run
        return None
    logger.info("image_gen: saved %s (%d bytes)", os.path.basename(path), len(data))
    return path


def to_data_uri(path: str) -> Optional[str]:
    """Read an image file and return a base64 data: URI (or None)."""
    try:
        with open(path, "rb") as f:
            raw = f.read()
        b64 = base64.b64encode(raw).decode("ascii")
        # Cache files are always JPEG from Pollinations.
        return f"data:image/jpeg;base64,{b64}"
    except OSError as exc:
        logger.warning("image_gen: could not read image %s: %s", path, exc)
        return None


async def generate_illustration_data_uri(
    prompt: str,
    style_variant: str = "sketch_classic",
    orientation: str = "horizontal",
    seed: int = 0,
    timeout: float = 28.0,
) -> Optional[str]:
    """
    Convenience wrapper: generate an illustration and return it as a base64
    data: URI ready for an <image href="..."> element. None on failure.
    """
    path = await generate_illustration(prompt, style_variant, orientation, seed, timeout)
    if not path:
        return None
    return to_data_uri(path)
