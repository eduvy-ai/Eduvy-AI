"""
Video Renderer — Playwright screenshot scrubbing → H.264 MP4.

ROOT CAUSE OF PREVIOUS FAILURE:
  headless Chromium does NOT reliably re-composite SVG properties like
  stroke-dashoffset when you set animation.currentTime on a CSSAnimation.
  The GPU compositor handles SVG paint in a separate thread; setting
  currentTime on paused CSS animations does NOT flush that thread in headless
  mode with --disable-gpu, so all elements appear at their final/initial state
  rather than an intermediate "being drawn" state.

SOLUTION: Direct style interpolation (zero dependency on the browser animation engine).
  1. Load HTML with all CSS animations frozen (paused via injected style).
  2. Parse every inline `animation:` declaration → build a JS lookup table
     { el, name, durMs, delMs }.
  3. Suppress each CSS animation via `el.style.animation = 'none'`.
  4. Apply hard initial state (strokeDashoffset=4000, opacity=0, etc.).
  5. For each frame at time T_ms: write the interpolated property value:
       strokeDashoffset = 4000*(1-p),  opacity = p,  transform = translateY(...)
  6. `getBoundingClientRect()` forces layout → screenshot → ffmpeg pipe.

  This is GUARANTEED to show the progressive draw animation because we are
  directly controlling SVG presentation properties, not waiting for the
  CSS animation compositor.
"""
import asyncio
import logging
import os
import shutil
import subprocess
import tempfile

logger = logging.getLogger(__name__)

_FFMPEG = (
    shutil.which("ffmpeg")
    or shutil.which("ffmpeg.exe")
    or (
        r"C:\Users\pradip.pawar\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
    )
)

_FPS = 5    # 5 fps — halves screenshot count vs 10fps; animation still smooth for educational content
            # At 10fps, each Playwright screenshot on 512MB Render took 0.5-1s → 5 min per video
            # At 5fps, same video takes ~2.5 min and stays within memory budget

# ─────────────────────────────────────────────────────────────────────────────
# JavaScript executed ONCE after page load
# ─────────────────────────────────────────────────────────────────────────────
# Parses all inline `animation: <name> <dur>s <timing> forwards <delay>s`
# declarations, suppresses the CSS animation, applies initial property state,
# and stores the params in window.__vi for per-frame interpolation.
_JS_SETUP = r"""
() => {
    var freeze = document.getElementById('__vr_freeze__');
    if (freeze) freeze.remove();

    // Keep the drawing hand visible; we position it per-frame (not real-time).
    var pen = document.getElementById('pen');
    if (pen) { pen.style.display = ''; pen.style.transition = 'none'; pen.style.opacity = '0'; }

    window.__vi = [];
    document.querySelectorAll('[style*="animation:"]').forEach(function(el) {
        var style = el.getAttribute('style') || '';
        // Matches: animation: <name> <dur>s <timing> forwards <delay>s
        var m = style.match(/animation:\s*(\w+)\s+([\d.]+)s\s+\S+\s+forwards\s+([\d.]+)s/);
        if (!m) return;
        var name  = m[1];
        var durMs = parseFloat(m[2]) * 1000;
        var delMs = parseFloat(m[3]) * 1000;
        window.__vi.push({ el: el, name: name, durMs: durMs, delMs: delMs });

        // Suppress the CSS animation — we write the property directly
        el.style.animation = 'none';

        // Hard initial state so frame-0 shows everything undrawn
        if (name === 'drawLine') {
            el.style.strokeDashoffset = '4000';
        } else if (name === 'fadeIn' || name === 'fadeUp' || name === 'popIn') {
            el.style.opacity = '0';
            if (name === 'fadeUp') {
                el.style.transform = 'translateY(18px)';
            }
        } else if (name === 'wipeReveal') {
            el.style.clipPath = 'inset(0 100% 0 0)';
            el.style.webkitClipPath = 'inset(0 100% 0 0)';
        } else if (name === 'handSweep') {
            el.style.opacity = '0';
            var hx0 = parseFloat(el.getAttribute('data-x0') || '0');
            var hy0 = parseFloat(el.getAttribute('data-y') || '0');
            el.setAttribute('transform', 'translate(' + hx0 + ',' + hy0 + ')');
        }
    });
    void document.documentElement.getBoundingClientRect();
    return window.__vi.length;
}
"""

# ─────────────────────────────────────────────────────────────────────────────
# JavaScript called per-frame with current time in ms
# ─────────────────────────────────────────────────────────────────────────────
_JS_FRAME = r"""
(tMs) => {
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    window.__vi.forEach(function(a) {
        var dt  = tMs - a.delMs;
        var raw = dt < 0 ? 0 : dt >= a.durMs ? 1 : dt / a.durMs;
        var p   = ease(raw);
        if (a.name === 'drawLine') {
            a.el.style.strokeDashoffset = String(4000 * (1 - p));
        } else if (a.name === 'fadeIn') {
            a.el.style.opacity = String(p);
        } else if (a.name === 'fadeUp') {
            a.el.style.opacity = String(p);
            a.el.style.transform = 'translateY(' + (18 * (1 - p)) + 'px)';
        } else if (a.name === 'popIn') {
            a.el.style.opacity = String(Math.min(1, p * 1.43));
            var s = p < 0.7 ? (0.5 + 0.58 * (p / 0.7)) : (1.08 - 0.08 * ((p - 0.7) / 0.3));
            a.el.style.transform = 'scale(' + s + ')';
        } else if (a.name === 'wipeReveal') {
            var inset = 'inset(0 ' + (100 * (1 - p)) + '% 0 0)';
            a.el.style.clipPath = inset;
            a.el.style.webkitClipPath = inset;
        } else if (a.name === 'handSweep') {
            var x0 = parseFloat(a.el.getAttribute('data-x0') || '0');
            var x1 = parseFloat(a.el.getAttribute('data-x1') || '0');
            var hy = parseFloat(a.el.getAttribute('data-y') || '0');
            var hx = x0 + (x1 - x0) * p;
            a.el.setAttribute('transform', 'translate(' + hx + ',' + hy + ')');
            var op = 1;
            if (raw <= 0.001 || raw >= 0.999) op = 0;
            else if (p < 0.12) op = p / 0.12;
            else if (p > 0.9) op = (1 - p) / 0.1;
            a.el.style.opacity = String(op);
        }
    });

    // Drive the drawing hand along the pen-hint timeline so each scene looks
    // hand-drawn. Show it at the most recent hint whose stroke is still drawing.
    var pen = document.getElementById('pen');
    if (pen && window.__penHints && window.__penHints.length) {
        var tS = tMs / 1000;
        var active = null;
        for (var k = 0; k < window.__penHints.length; k++) {
            var hnt = window.__penHints[k];
            if (hnt[2] <= tS) active = hnt; else break;
        }
        if (!active) {
            pen.style.opacity = '0';
        } else {
            pen.style.transform = 'translate(' + (active[0] - 8) + 'px,' + (active[1] - 30) + 'px)';
            var since = tS - active[2];
            pen.style.opacity = since < 0.55 ? '0.92' : (since < 1.1 ? '0.3' : '0');
        }
    }
    void document.documentElement.getBoundingClientRect();
}
"""


async def render_frame_to_mp4(
    html_content: str,
    output_path: str,
    duration_sec: float = 10.0,
    orientation: str = "horizontal",
) -> str:
    """Render one animated HTML page to an MP4 file via Playwright + ffmpeg.
    NOTE: For multi-frame videos use render_all_frames_to_mp4() to reuse one
    browser instance across all frames — avoids OOM from repeated Chromium launches.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    await asyncio.to_thread(_render_sync, html_content, output_path, duration_sec, orientation)
    return output_path


async def render_all_frames_to_mp4(
    frames: list[dict],
    out_dir: str,
    orientation: str,
) -> list[str | None]:
    """
    Render all frames using a SINGLE Chromium instance kept alive for the whole video.

    Each dict in `frames` must have:
      - html: str          — the animated HTML content
      - output_path: str   — where to write the .mp4
      - duration_sec: float

    Returns a list of output paths (or None for failed frames), same order as input.
    Launching Chromium once instead of once-per-frame cuts peak memory from
    3×150MB to 1×150MB — critical on 512MB Render instances.
    """
    return await asyncio.to_thread(_render_all_sync, frames, out_dir, orientation)


def _render_all_sync(
    frames: list[dict],
    out_dir: str,
    orientation: str,
) -> list[str | None]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "playwright not installed. Run: pip install playwright && playwright install chromium"
        )

    _IS_CLOUD = not os.path.exists("/Users")
    # Always render at the native content size (1280×720 / 720×1280).
    # The svg_renderer generates HTML at exactly these dimensions — using a
    # smaller viewport clips content at the edges. OOM is no longer a risk
    # because we now launch ONE Chromium for the whole video, not one per frame.
    width, height = (1280, 720) if orientation == "horizontal" else (720, 1280)

    results: list[str | None] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-default-apps",
                "--disable-sync",
                "--metrics-recording-only",
                "--mute-audio",
                "--no-first-run",
                "--font-render-hinting=none",
                "--js-flags=--max-old-space-size=64",
                "--disable-features=site-per-process,TranslateUI,VizDisplayCompositor",
                "--renderer-process-limit=1",
                "--disable-renderer-accessibility",
            ],
        )
        try:
            for frame in frames:
                html_content = frame["html"]
                output_path = frame["output_path"]
                duration_sec = frame.get("duration_sec", 10.0)
                total_frames = max(_FPS, int(duration_sec * _FPS))

                freeze_css = (
                    '<style id="__vr_freeze__">'
                    "*, *::before, *::after { animation-play-state: paused !important; }"
                    "</style>"
                )
                patched = html_content.replace("</head>", freeze_css + "\n</head>", 1) \
                    if "</head>" in html_content else freeze_css + html_content

                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".html", delete=False, encoding="utf-8"
                ) as f:
                    f.write(patched)
                    temp_html = f.name

                try:
                    page = browser.new_page(viewport={"width": width, "height": height})
                    try:
                        page.goto("file:///" + temp_html.replace("\\", "/"))
                        try:
                            page.wait_for_load_state("networkidle", timeout=5000)
                        except Exception:
                            page.wait_for_load_state("load")
                        page.wait_for_timeout(400)

                        anim_count = page.evaluate(_JS_SETUP)
                        logger.info("Frame %s: %d animations, %d screenshots",
                                    os.path.basename(output_path), anim_count, total_frames)

                        ffmpeg_proc = subprocess.Popen(
                            [
                                _FFMPEG, "-y",
                                "-f", "image2pipe",
                                "-vcodec", "png",
                                "-r", str(_FPS),
                                "-i", "pipe:0",
                                "-c:v", "libx264",
                                "-preset", "fast",
                                "-crf", "23",
                                "-vf", "scale=1280:720",
                                "-pix_fmt", "yuv420p",
                                "-movflags", "+faststart",
                                output_path,
                            ],
                            stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                        try:
                            for i in range(total_frames):
                                t_ms = (i / _FPS) * 1000.0
                                page.evaluate(_JS_FRAME, t_ms)
                                png = page.screenshot(type="png")
                                ffmpeg_proc.stdin.write(png)  # type: ignore[union-attr]
                        finally:
                            ffmpeg_proc.stdin.close()  # type: ignore[union-attr]

                        ffmpeg_proc.wait(timeout=120)
                        if ffmpeg_proc.returncode != 0:
                            raise RuntimeError(f"ffmpeg failed (rc={ffmpeg_proc.returncode})")

                        results.append(output_path)
                        logger.info("Frame %s done (%d bytes)",
                                    os.path.basename(output_path), os.path.getsize(output_path))
                    finally:
                        page.close()  # close page, NOT browser — reuse the process
                except Exception as exc:
                    logger.error("Frame %s render failed: %s", os.path.basename(output_path), exc)
                    results.append(None)
                finally:
                    if os.path.exists(temp_html):
                        try:
                            os.remove(temp_html)
                        except OSError:
                            pass
        finally:
            browser.close()

    return results


def _render_sync(
    html_content: str,
    output_path: str,
    duration_sec: float,
    orientation: str,
) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "playwright not installed. Run: pip install playwright && playwright install chromium"
        )

    # 854×480 on cloud (fits in 512 MB RAM). ffmpeg upscales to 1280×720 in the output.
    # Full 1280×720 screenshots at 10fps are the single biggest memory consumer besides the browser.
    _IS_CLOUD = not os.path.exists("/Users")  # simple heuristic: no macOS/Windows /Users on Linux
    if _IS_CLOUD:
        width, height = (854, 480) if orientation == "horizontal" else (480, 854)
    else:
        width, height = (1280, 720) if orientation == "horizontal" else (720, 1280)
    total_frames = max(_FPS, int(duration_sec * _FPS))

    # Inject freeze CSS so all CSS animations are paused during page load.
    # This ensures every element starts at its initial state (opacity:0 / dashoffset:4000).
    freeze_css = (
        '<style id="__vr_freeze__">'
        "*, *::before, *::after { animation-play-state: paused !important; }"
        "</style>"
    )
    if "</head>" in html_content:
        patched = html_content.replace("</head>", freeze_css + "\n</head>", 1)
    else:
        patched = freeze_css + html_content

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".html", delete=False, encoding="utf-8"
    ) as f:
        f.write(patched)
        temp_html = f.name

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                # channel is for system browsers (chrome, msedge) — do NOT set it
                # for Playwright-managed binaries. headless=True auto-uses the
                # headless shell installed via: playwright install chromium --only-shell
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",          # prevents /dev/shm OOM in containers
                    "--disable-gpu",
                    # NOTE: --single-process was removed — Chromium marks it as explicitly unstable
                    # and it leaks memory between screenshots, causing each frame to take 2× longer
                    "--disable-extensions",
                    "--disable-background-networking",
                    "--disable-default-apps",
                    "--disable-sync",
                    "--metrics-recording-only",
                    "--mute-audio",
                    "--no-first-run",
                    "--font-render-hinting=none",
                    "--js-flags=--max-old-space-size=64",
                    "--disable-features=site-per-process,TranslateUI,VizDisplayCompositor",
                    "--renderer-process-limit=1",
                    "--disable-renderer-accessibility",
                ],
            )
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto("file:///" + temp_html.replace("\\", "/"))
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                page.wait_for_load_state("load")
            page.wait_for_timeout(400)  # font render + layout settle

            # Parse animations, suppress CSS, apply initial states
            anim_count = page.evaluate(_JS_SETUP)
            logger.info("Direct-interpolation renderer: %d animations parsed", anim_count)

            # Start ffmpeg: PNG frames piped via stdin → H.264 MP4
            ffmpeg_proc = subprocess.Popen(
                [
                    _FFMPEG, "-y",
                    "-f", "image2pipe",
                    "-vcodec", "png",
                    "-r", str(_FPS),
                    "-i", "pipe:0",
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    # On cloud (854×480 input) upscale to 1280×720 for consistent output resolution.
                    # On local dev (1280×720 input) this is a no-op.
                    "-vf", "scale=1280:720:flags=lanczos" if _IS_CLOUD else "scale=1280:720",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    output_path,
                ],
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            try:
                for i in range(total_frames):
                    t_ms = (i / _FPS) * 1000.0
                    page.evaluate(_JS_FRAME, t_ms)
                    png = page.screenshot(type="png")
                    ffmpeg_proc.stdin.write(png)  # type: ignore[union-attr]
            finally:
                ffmpeg_proc.stdin.close()  # type: ignore[union-attr]
                browser.close()

            ffmpeg_proc.wait(timeout=120)
            if ffmpeg_proc.returncode != 0:
                raise RuntimeError(
                    f"ffmpeg encoding failed (rc={ffmpeg_proc.returncode})"
                )

    finally:
        if os.path.exists(temp_html):
            try:
                os.remove(temp_html)
            except OSError:
                pass
