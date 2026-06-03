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

_FPS = 10   # 10 fps → each 0.45s drawLine spans ~4-5 frames (visible pencil stroke)

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

    var pen = document.getElementById('pen');
    if (pen) pen.style.display = 'none';

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
        }
    });
    void document.documentElement.getBoundingClientRect();
}
"""


async def render_frame_to_mp4(
    html_content: str,
    output_path: str,
    duration_sec: float = 10.0,
    orientation: str = "horizontal",
) -> str:
    """Render one animated HTML page to an MP4 file via Playwright + ffmpeg."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    await asyncio.to_thread(_render_sync, html_content, output_path, duration_sec, orientation)
    return output_path


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

    width, height = (1280, 720) if orientation == "horizontal" else (720, 1280)
    total_frames = max(_FPS, int(duration_sec * _FPS))

    # Inject freeze CSS so all CSS animations are paused during page load.
    # This ensures every element starts at its initial state (opacity:0 / dashoffset:4000).
    freeze_css = (
        '<style id="__vr_freeze__">'
        "*, *::before, *::after { animation-play-state: paused !important; }"
        "#pen { display: none !important; }"
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
                # No --disable-gpu: keep the software rasterizer path active
                # so direct style writes are composited correctly.
                args=["--no-sandbox", "--font-render-hinting=none"],
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
                    "-crf", "18",
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
