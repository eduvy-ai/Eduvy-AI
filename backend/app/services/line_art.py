"""
Line-art vectorization — turn ANY subject into hand-drawn VECTOR strokes.

This is the professional "stroke-order" whiteboard technique (the one Golpo's
own docs describe: a drawing cursor moving over the image):

  1. A free image model (Pollinations, no key) draws clean black LINE-ART of the
     subject — unlimited vocabulary, genuinely recognizable objects.
  2. OpenCV vectorizes that line-art into contour polylines (pure-wheel, no
     native crashes — unlike vtracer on this platform).
  3. The renderer inks those contours stroke-by-stroke with the hand, so it looks
     hand-DRAWN rather than a static slide.

Recognizable like an image model, animated like a whiteboard sketch. Every step
degrades gracefully: any failure returns None and the caller falls back to the
icon-composition scene, so a video is never blocked.
"""
import asyncio
import hashlib
import logging
import os
import ssl
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

_CACHE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "videos", "_lineart_cache")
)
_MEM_CACHE: dict = {}
_POLL = "https://image.pollinations.ai/prompt/"
_RETRY_DELAYS = [0.0, 4.0, 9.0]


def _prompt(subject: str) -> str:
    subject = " ".join((subject or "").strip().split())[:160]
    return (f"black and white line drawing of {subject}, bold clean black outlines "
            f"on a plain white background, coloring book style, thick even strokes, "
            f"simple, minimal, no shading, no grey, no color, centered, full view")


def _seed_for(subject: str) -> int:
    return int(hashlib.sha256(subject.strip().lower().encode()).hexdigest(), 16) % 90000 + 1


async def _fetch_image(subject: str, timeout: float = 40.0) -> Optional[str]:
    """Download clean line-art for `subject`. Returns local PNG path or None."""
    try:
        import httpx
    except ImportError:
        return None
    seed = _seed_for(subject)
    digest = hashlib.sha256(f"{_prompt(subject)}|{seed}".encode()).hexdigest()[:24]
    path = os.path.join(_CACHE_DIR, f"{digest}.png")
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return path

    url = _POLL + urllib.parse.quote(_prompt(subject), safe="") + "?" + urllib.parse.urlencode(
        {"width": 768, "height": 576, "seed": seed, "nologo": "true", "model": "flux"})
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    async with httpx.AsyncClient(verify=ctx, follow_redirects=True, timeout=timeout) as client:
        for attempt, delay in enumerate(_RETRY_DELAYS):
            if delay:
                await asyncio.sleep(delay)
            try:
                r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            except Exception as exc:
                logger.warning("line_art: fetch error (attempt %d): %s", attempt + 1, exc)
                continue
            if r.status_code == 429:
                logger.warning("line_art: rate-limited (429), attempt %d", attempt + 1)
                continue
            if r.status_code != 200 or len(r.content) < 2000 or "image" not in r.headers.get("content-type", ""):
                logger.warning("line_art: bad response %s (attempt %d)", r.status_code, attempt + 1)
                continue
            os.makedirs(_CACHE_DIR, exist_ok=True)
            try:
                with open(path, "wb") as f:
                    f.write(r.content)
            except OSError:
                return None
            return path
    return None


def _vectorize(png: str) -> Optional[dict]:
    """Trace a line-art PNG into ordered contour polylines. Returns {w,h,contours}."""
    try:
        import cv2
    except ImportError:
        logger.warning("line_art: opencv not installed")
        return None
    img = cv2.imread(png, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    h, w = img.shape
    # Keep only dark ink; everything lighter becomes background.
    _, bw = cv2.threshold(img, 190, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(bw, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    polys = []
    for c in contours:
        if cv2.arcLength(c, True) < 45:      # drop specks
            continue
        c2 = cv2.approxPolyDP(c, 1.6, True)  # simplify, keep detail
        if len(c2) < 3:
            continue
        x, y, _, _ = cv2.boundingRect(c2)
        pts = " ".join(f"{int(p[0][0])},{int(p[0][1])}" for p in c2)
        polys.append((y, x, pts))
    if len(polys) < 3:
        return None
    # Draw order: top→bottom in ~60px bands, then left→right — a natural sketch path.
    polys.sort(key=lambda t: (round(t[0] / 60.0), t[1]))
    return {"w": int(w), "h": int(h), "contours": [p[2] for p in polys][:420]}


async def generate_line_art(subject: str) -> Optional[dict]:
    """Fetch + vectorize `subject`. Returns {"w","h","contours"} or None."""
    subject = (subject or "").strip()
    if not subject:
        return None
    key = subject.lower()
    if key in _MEM_CACHE:
        return _MEM_CACHE[key]
    png = await _fetch_image(subject)
    if not png:
        return None
    data = await asyncio.to_thread(_vectorize, png)
    if data:
        _MEM_CACHE[key] = data
        logger.info("line_art: '%s' -> %d contours", subject[:40], len(data["contours"]))
    return data
