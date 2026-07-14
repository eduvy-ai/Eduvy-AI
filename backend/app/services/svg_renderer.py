"""
SVG Renderer — Whiteboard-style animated HTML+SVG for each scene type.

Design principles (Golpo-style whiteboard):
  1. Everything is DRAWN stroke-by-stroke — borders trace via stroke-dashoffset animation
  2. Shape fills fade in AFTER their borders finish drawing
  3. A pen cursor (✏️) follows each new element being drawn
  4. Fonts use system cursive (Segoe Script / Comic Sans) as reliable fallback,
     with Google Fonts Caveat/Patrick Hand loaded when CDN is available
  5. All stroke-dasharray/stroke-dashoffset use _DASH=4000 consistently
  6. Backgrounds are clean whiteboard paper or chalkboard green — never dark slides

Each public renderer returns (svg_string, pen_hints_list).
generate_scene_html() is the single entry point called by video_assembler.
"""
import math
import re
from typing import Any, Dict, List, Tuple

# ── Constants ─────────────────────────────────────────────────────────────────

# Must exceed the largest possible SVG path perimeter on 1280x720:
#   2*(1280+720) = 4000 — so 4000 is the safe universal dasharray value.
_DASH = 4000

# ── Style presets ─────────────────────────────────────────────────────────────
STYLE_CONFIGS = {
    # White paper — red/blue pen marker
    "sketch_classic": {
        "bg": "#FAFAF8",
        "fg": "#1a1a2e",
        "accent":  "#c0392b",
        "accent2": "#2471a3",
        "font_family": "'Segoe Script', 'Comic Sans MS', cursive",
        "stroke_style": "sketch",
        "line_width": 2.5,
    },
    # Chalkboard green — chalk drawing style
    "sketch_dark": {
        "bg": "#1a2e1a",
        "fg": "#e8f5e9",
        "accent":  "#f9f9f9",
        "accent2": "#ffe082",
        "font_family": "'Segoe Script', 'Comic Sans MS', cursive",
        "stroke_style": "chalk",
        "line_width": 2,
    },
    # Warm yellow paper — colourful markers
    "canvas_colorful": {
        "bg": "#fffde7",
        "fg": "#1a1a2e",
        "accent":  "#8e44ad",
        "accent2": "#27ae60",
        "font_family": "'Segoe Script', 'Comic Sans MS', cursive",
        "stroke_style": "solid",
        "line_width": 2,
    },
    # Clean white — minimal blue
    "canvas_minimal": {
        "bg": "#ffffff",
        "fg": "#0f172a",
        "accent":  "#3b82f6",
        "accent2": "#10b981",
        "font_family": "'Segoe Script', 'Comic Sans MS', cursive",
        "stroke_style": "solid",
        "line_width": 1.5,
    },
    # Dark chalkboard
    "blackboard": {
        "bg": "#111d11",
        "fg": "#dff0d8",
        "accent":  "#ffffff",
        "accent2": "#ffeb3b",
        "font_family": "'Segoe Script', 'Comic Sans MS', cursive",
        "stroke_style": "chalk",
        "line_width": 2,
    },
}

DIMS = {
    "horizontal": (1280, 720),
    "vertical":   (720, 1280),
}

# diagram_type values that _annotated_bg can draw natively as stroke art. Any
# annotated_diagram whose type is NOT in this set gets a generated hero image
# instead (so a scene is never just an empty ellipse).
_SVG_NATIVE_DIAGRAMS = {
    "cell", "atom", "heart", "leaf", "dna", "waveform", "punnett",
    "gears", "flask", "magnet", "sun", "brain", "water",
}


def get_style(style_variant: str) -> Dict[str, Any]:
    return STYLE_CONFIGS.get(style_variant, STYLE_CONFIGS["sketch_classic"])


def generate_scene_html(scene_spec: Dict[str, Any],
                        style_variant: str = "sketch_classic",
                        orientation: str = "horizontal") -> str:
    """Main entry point — returns a complete HTML page string for one scene."""
    style = get_style(style_variant)
    w, h  = DIMS.get(orientation, (1280, 720))

    svg_type      = scene_spec.get("type", "bullet_reveal")
    title         = scene_spec.get("title", "")
    data          = scene_spec.get("data", {})
    onscreen_text = scene_spec.get("onscreen_text", [])
    duration_sec  = scene_spec.get("duration_sec", 10)
    accent_override = scene_spec.get("accent", "")

    effective_style = dict(style)
    if accent_override:
        effective_style["accent"] = accent_override

    renderers = {
        "title_card":        _render_title_card,
        "bullet_reveal":     _render_bullet_reveal,
        "flow_arrows":       _render_flow_arrows,
        "comparison_table":  _render_comparison_table,
        "timeline_dots":     _render_timeline_dots,
        "radial_web":        _render_radial_web,
        "equation_write":    _render_equation_write,
        "staircase_steps":   _render_staircase_steps,
        "venn_two":          _render_venn_two,
        "tree_hierarchy":    _render_tree_hierarchy,
        "bar_chart":         _render_bar_chart,
        "cycle_loop":        _render_cycle_loop,
        "funnel_layers":     _render_funnel_layers,
        "paragraph_reveal":  _render_paragraph_reveal,
        "annotated_diagram": _render_annotated_diagram,
        "illustration":      _render_illustration,
        "scene":             _render_composition,
        "composition":       _render_composition,
        "draw":              _render_line_art,
        "sketch":            _render_line_art,
        "draw_primitive":    _render_draw,
    }
    renderer = renderers.get(svg_type, _render_bullet_reveal)
    svg_body, pen_hints = renderer(title, data, effective_style, w, h, duration_sec)
    return _wrap_html(svg_body, pen_hints, effective_style, w, h,
                      duration_sec, onscreen_text, accent_override)


# ── Drawing helpers ───────────────────────────────────────────────────────────
# Each returns (svg_fragment: str, pen_hint: dict).
# pen_hint = {"x": float, "y": float, "t": float}  where t is animation start time (seconds).

PenHint = Dict[str, float]


def _draw_rect(x: float, y: float, w: float, h: float,
               fill: str, stroke: str, rx: float,
               delay: float, draw_dur: float = 0.45) -> Tuple[str, PenHint]:
    """Rect whose border draws itself, then fill fades in."""
    fill_delay = delay + draw_dur + 0.05
    svg = (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" opacity="0" '
        f'style="animation:fadeIn 0.25s ease forwards {fill_delay:.2f}s"/>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="none" '
        f'stroke="{stroke}" stroke-width="2.5" '
        f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {draw_dur:.2f}s ease forwards {delay:.2f}s"/>'
    )
    return svg, {"x": x, "y": y, "t": delay}


def _draw_circle(cx: float, cy: float, r: float,
                 fill: str, stroke: str,
                 delay: float, draw_dur: float = 0.4,
                 stroke_width: float = 2) -> Tuple[str, PenHint]:
    """Circle border draws, fill fades in after."""
    fill_delay = delay + draw_dur + 0.05
    svg = (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" opacity="0" '
        f'style="animation:fadeIn 0.25s ease forwards {fill_delay:.2f}s"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" '
        f'stroke="{stroke}" stroke-width="{stroke_width}" '
        f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {draw_dur:.2f}s ease forwards {delay:.2f}s"/>'
    )
    return svg, {"x": cx - r, "y": cy, "t": delay}


def _draw_line(x1: float, y1: float, x2: float, y2: float,
               stroke: str, delay: float, draw_dur: float = 0.4,
               stroke_width: float = 2) -> Tuple[str, PenHint]:
    """A line that draws itself left→right (or start→end)."""
    svg = (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{stroke}" stroke-width="{stroke_width}" stroke-linecap="round" '
        f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {draw_dur:.2f}s ease forwards {delay:.2f}s"/>'
    )
    return svg, {"x": x1, "y": y1, "t": delay}


def _draw_path(d_attr: str, fill: str, stroke: str,
               delay: float, draw_dur: float = 0.5,
               stroke_width: float = 2.5) -> Tuple[str, PenHint]:
    """An SVG path that traces itself (fill separate)."""
    fill_delay = delay + draw_dur + 0.05
    svg = (
        f'<path d="{d_attr}" fill="{fill}" opacity="0" '
        f'style="animation:fadeIn 0.3s ease forwards {fill_delay:.2f}s"/>'
        f'<path d="{d_attr}" fill="none" stroke="{stroke}" stroke-width="{stroke_width}" '
        f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {draw_dur:.2f}s ease forwards {delay:.2f}s"/>'
    )
    return svg, {"x": 0, "y": 0, "t": delay}


def _draw_text(x: float, y: float, text: str, size: float,
               fill: str, anchor: str, delay: float,
               bold: bool = False, family: str = "") -> Tuple[str, PenHint]:
    """Text that fades up into position."""
    weight = 'font-weight="bold" ' if bold else ""
    fam    = f'font-family="{family}" ' if family else ""
    svg = (
        f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
        f'text-anchor="{anchor}" {weight}{fam}'
        f'style="animation:fadeUp 0.5s ease forwards {delay:.2f}s;opacity:0">'
        f'{_escape(text)}</text>'
    )
    return svg, {"x": x, "y": y - size, "t": delay}


# ── HTML wrapper ──────────────────────────────────────────────────────────────

def _wrap_html(svg_body: str, pen_hints: List[PenHint],
               style: Dict, w: int, h: int,
               duration_sec: float, onscreen_text: list,
               accent_override: str = "") -> str:
    caption_html = ""
    if onscreen_text:
        items = "".join(f"<p class='cap-item'>{_escape(t)}</p>" for t in onscreen_text)
        caption_html = f"<div class='captions'>{items}</div>"

    accent = accent_override if accent_override else style["accent"]

    # Subtle background texture
    is_dark = style["bg"][1:3].lower() <= "44"
    if is_dark:
        texture = (
            "background-image: repeating-linear-gradient("
            "0deg,transparent,transparent 28px,"
            "rgba(255,255,255,0.018) 28px,rgba(255,255,255,0.018) 29px);"
        )
    else:
        texture = (
            "background-image: repeating-linear-gradient("
            "0deg,transparent,transparent 38px,"
            "rgba(0,0,200,0.035) 38px,rgba(0,0,200,0.035) 39px);"
        )

    # Build the pen/hand timeline. `pen_js` drives the cursor in a live browser;
    # `pen_hints_json` (window.__penHints) lets the MP4 renderer place the hand
    # per frame so it appears to draw every scene stroke-by-stroke.
    pen_js_lines = []
    pen_pts = []
    if pen_hints:
        for p in sorted(pen_hints, key=lambda ph: ph.get("t", 0)):
            px = int(p.get("x", w // 2))
            py = int(p.get("y", h // 2))
            pt = max(0.0, p.get("t", 0) - 0.15)
            pen_js_lines.append(f"  movePen({px},{py},{pt:.2f});")
            pen_pts.append(f"[{px},{py},{pt:.2f}]")
    pen_js = "\n".join(pen_js_lines)
    pen_hints_json = "[" + ",".join(pen_pts) + "]"

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{
    width: {w}px; height: {h}px; overflow: hidden;
    background: {style["bg"]}; {texture}
    font-family: 'Caveat','Patrick Hand',{style["font_family"]};
  }}
  .scene {{
    width: {w}px; height: {h}px; position: relative;
  }}
  /* Corner bracket decorations */
  .c {{ position: absolute; width: 34px; height: 34px;
    border-color: {accent}44; border-style: solid; }}
  .c.tl {{ top:18px; left:18px; border-width:2px 0 0 2px; border-radius:3px 0 0 0; }}
  .c.br {{ bottom:18px; right:18px; border-width:0 2px 2px 0; border-radius:0 0 3px 0; }}
  /* Caption bar */
  .captions {{
    position: absolute; bottom:24px; left:50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.74); border-radius:8px;
    padding:9px 22px; text-align:center; max-width:90%;
    border:1px solid rgba(255,255,255,0.1);
  }}
  .cap-item {{
    color:#fff; font-size:22px; line-height:1.5;
    font-family:'Caveat','Patrick Hand',{style["font_family"]};
    font-weight:600;
  }}
  /* Drawing hand cursor */
  #pen {{
    position:absolute; top:0; left:0;
    font-size:40px; line-height:1;
    pointer-events:none; z-index:200; opacity:0;
    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1),
                opacity 0.15s ease;
    transform: translate(-80px,-80px);
  }}
  /* ── Keyframes ── */
  @keyframes fadeUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
  }}
  @keyframes fadeIn {{
    from {{ opacity:0; }}
    to   {{ opacity:1; }}
  }}
  @keyframes drawLine {{
    from {{ stroke-dashoffset:{_DASH}; }}
    to   {{ stroke-dashoffset:0; }}
  }}
  @keyframes popIn {{
    0%   {{ transform:scale(0.5);  opacity:0; }}
    70%  {{ transform:scale(1.08); opacity:1; }}
    100% {{ transform:scale(1);    opacity:1; }}
  }}
  /* Left→right wipe — makes a raster illustration appear as if being drawn.
     The MP4 renderer interpolates clip-path directly (see video_renderer). */
  @keyframes wipeReveal {{
    from {{ clip-path: inset(0 100% 0 0); -webkit-clip-path: inset(0 100% 0 0); }}
    to   {{ clip-path: inset(0 0 0 0);    -webkit-clip-path: inset(0 0 0 0); }}
  }}
  /* Drawing hand — position is driven per-frame by the MP4 renderer via the
     data-x0/data-x1/data-y attributes; this keyframe only matters for live HTML. */
  @keyframes handSweep {{
    0%   {{ opacity:0; }}
    12%  {{ opacity:1; }}
    90%  {{ opacity:1; }}
    100% {{ opacity:0; }}
  }}
</style>
</head>
<body>
<div class="scene">
  <div class="c tl"></div>
  <div class="c br"></div>
  {svg_body}
  <div id="pen">&#9997;&#65039;</div>
  {caption_html}
</div>
<script>
window.__penHints = {pen_hints_json};
(function(){{
  var pen=document.getElementById('pen');
  function movePen(x,y,t){{
    setTimeout(function(){{
      pen.style.transform='translate('+(x-8)+'px,'+(y-30)+'px)';
      pen.style.opacity='0.9';
    }},t*1000);
    setTimeout(function(){{ pen.style.opacity='0.2'; }},( t+0.5)*1000);
  }}
{pen_js}
}})();
</script>
</body>
</html>"""


# ── Renderers ─────────────────────────────────────────────────────────────────
# Convention: each renderer returns (svg_string, pen_hints_list)

def _render_title_card(title: str, data: Dict, style: Dict,
                       w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    main_title = data.get("title", title)
    subtitle   = data.get("subtitle", "")
    cx, cy = w // 2, h // 2
    r = min(w, h) // 3

    parts: List[str] = []
    hints: List[PenHint] = []

    # Outer decorative ring
    s, p = _draw_circle(cx, cy - 20, r, "none", style["accent"], 0.1, dur * 0.55, 1.5)
    parts.append(s); hints.append(p)

    # Inner ring
    s, p = _draw_circle(cx, cy - 20, r - 16, "none", style["accent2"], 0.35, dur * 0.45, 1)
    parts.append(s); hints.append(p)

    # Top horizontal bar
    s, p = _draw_line(cx - r + 16, cy - 80, cx + r - 16, cy - 80,
                      style["accent"], 0.55, dur * 0.3, 2.5)
    parts.append(s); hints.append(p)

    # Main title
    fs = max(40, min(72, 1400 // max(len(main_title), 1) + 28))
    s, p = _draw_text(cx, cy - 8, main_title, fs, style["fg"], "middle", 0.8, bold=True,
                      family="'Caveat','Patrick Hand',cursive")
    parts.append(s); hints.append(p)

    # Subtitle
    if subtitle:
        s, p = _draw_text(cx, cy + 60, subtitle, 30, style["accent"],
                          "middle", 1.35, family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Bottom bar
    s, p = _draw_line(cx - r + 16, cy + 90, cx + r - 16, cy + 90,
                      style["accent"], 1.55, dur * 0.3, 2.5)
    parts.append(s); hints.append(p)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_bullet_reveal(title: str, data: Dict, style: Dict,
                          w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    items = data.get("items", ["Point 1", "Point 2", "Point 3"])
    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 90, title, 38, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)
        s, p = _draw_line(w // 2 - 200, 110, w // 2 + 200, 110,
                          style["accent"], 0.4, 0.4, 2)
        parts.append(s); hints.append(p)

    delay_per = dur / (len(items) + 1)
    bx = w // 2 - 360
    for i, item in enumerate(items):
        d = 0.55 + i * delay_per
        ty = 172 + i * 72

        # Bullet circle
        s, p = _draw_circle(bx, ty - 10, 8, style["accent"], style["accent"], d, 0.22, 2)
        parts.append(s); hints.append(p)

        # Item text
        s, p = _draw_text(bx + 26, ty, str(item), 28, style["fg"], "start",
                          d + 0.18, family="'Caveat','Patrick Hand',cursive")
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_flow_arrows(title: str, data: Dict, style: Dict,
                        w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    steps = data.get("steps", ["Step 1", "Step 2", "Step 3"])
    descriptions = data.get("descriptions", [])
    n = len(steps)
    has_desc = len(descriptions) >= n
    box_w = min(210, (w - 100) // n - 20)
    spacing = (w - 80) // n
    start_x = 80 + spacing // 2
    cy = h // 2 + 10
    box_h = 110 if has_desc else 74

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 64, title, 34, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    for i, step in enumerate(steps):
        cx = start_x + i * spacing
        d = 0.3 + i * (dur / (n + 1))

        s, p = _draw_rect(cx - box_w // 2, cy - box_h // 2,
                          box_w, box_h, style["accent"] + "28", style["accent"],
                          10, d, 0.45)
        parts.append(s); hints.append(p)

        ty = cy - 10 if has_desc else cy + 8
        s, p = _draw_text(cx, ty, str(step), 20, style["fg"], "middle",
                          d + 0.5, bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s)

        if has_desc and i < len(descriptions):
            parts.append(
                f'<text x="{cx}" y="{cy + 30}" font-size="13" fill="{style["fg"]}" '
                f'text-anchor="middle" opacity="0.78" '
                f'style="animation:fadeIn 0.3s ease forwards {d+0.65:.2f}s;opacity:0">'
                f'{_escape(str(descriptions[i])[:30])}</text>'
            )

        if i < n - 1:
            ax = cx + box_w // 2 + 4
            s, p = _draw_line(ax, cy, ax + spacing - box_w - 8, cy,
                              style["accent2"], d + 0.5, 0.25, 2.5)
            parts.append(s); hints.append(p)
            # Arrowhead
            ax2 = ax + spacing - box_w - 8
            parts.append(
                f'<polygon points="{ax2},{cy} {ax2-12},{cy-7} {ax2-12},{cy+7}" '
                f'fill="{style["accent2"]}" opacity="0" '
                f'style="animation:fadeIn 0.15s ease forwards {d+0.72:.2f}s;opacity:0"/>'
            )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_comparison_table(title: str, data: Dict, style: Dict,
                              w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    left_h  = data.get("left_header", "A")
    right_h = data.get("right_header", "B")
    rows    = data.get("rows", [["Item A", "Item B"]])
    col_w   = (w - 160) // 2
    start_y = 132
    row_h   = min(58, (h - start_y - 40) // max(len(rows), 1))

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Left header
    s, p = _draw_rect(80, start_y - 44, col_w, 42,
                      style["accent"] + "cc", style["accent"], 6, 0.2, 0.38)
    parts.append(s); hints.append(p)
    parts.append(
        f'<text x="{80 + col_w//2}" y="{start_y - 14}" font-size="20" fill="#fff" '
        f'text-anchor="middle" font-family="\'Caveat\',cursive" font-weight="bold" '
        f'style="animation:fadeIn 0.3s ease forwards 0.52s;opacity:0">{_escape(left_h)}</text>'
    )

    # Right header
    lhx = w // 2 + 10
    s, p = _draw_rect(lhx, start_y - 44, col_w, 42,
                      style["accent2"] + "cc", style["accent2"], 6, 0.35, 0.38)
    parts.append(s); hints.append(p)
    parts.append(
        f'<text x="{lhx + col_w//2}" y="{start_y - 14}" font-size="20" fill="#fff" '
        f'text-anchor="middle" font-family="\'Caveat\',cursive" font-weight="bold" '
        f'style="animation:fadeIn 0.3s ease forwards 0.68s;opacity:0">{_escape(right_h)}</text>'
    )

    # Center divider
    s, p = _draw_line(w // 2 + 5, start_y - 44,
                      w // 2 + 5, start_y + len(rows) * row_h,
                      style["fg"], 0.15, 0.5, 1)
    parts.append(s)

    for i, row in enumerate(rows):
        try:
            l_val = str(row[0]) if row else ""
            r_val = str(row[1]) if len(row) > 1 else ""
        except (IndexError, TypeError):
            l_val, r_val = str(row), ""
        d = 0.55 + i * (dur / (len(rows) + 1))
        y = start_y + i * row_h

        s, p = _draw_line(80, y + row_h - 2, w - 80, y + row_h - 2,
                          style["fg"], d, 0.28, 1)
        parts.append(s)
        hints.append({"x": 80, "y": y, "t": d})

        parts.append(
            f'<text x="{80 + col_w//2}" y="{y + row_h//2 + 7}" font-size="17" '
            f'fill="{style["fg"]}" text-anchor="middle" '
            f'style="animation:fadeUp 0.38s ease forwards {d:.2f}s;opacity:0">'
            f'{_escape(l_val)}</text>'
        )
        parts.append(
            f'<text x="{lhx + col_w//2}" y="{y + row_h//2 + 7}" font-size="17" '
            f'fill="{style["fg"]}" text-anchor="middle" '
            f'style="animation:fadeUp 0.38s ease forwards {d+0.1:.2f}s;opacity:0">'
            f'{_escape(r_val)}</text>'
        )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_timeline_dots(title: str, data: Dict, style: Dict,
                          w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    events  = data.get("events", [{"year": "2024", "label": "Event"}])
    n       = len(events)
    spacing = (w - 160) // max(n - 1, 1)
    cy      = h // 2 + 20

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Baseline
    s, p = _draw_line(80, cy, w - 80, cy, style["fg"], 0.4, dur * 0.4, 2)
    parts.append(s); hints.append(p)

    for i, ev in enumerate(events):
        x     = 80 + i * spacing
        d     = 0.7 + i * (dur / (n + 1))
        year  = str(ev.get("year", ""))
        label = str(ev.get("label", ""))
        above = (i % 2 == 0)

        # Tick
        s, p = _draw_line(x, cy - 12, x, cy + 12, style["accent"], d, 0.18, 2)
        parts.append(s)

        # Dot
        s, p = _draw_circle(x, cy, 9, style["accent"], style["accent"], d + 0.14, 0.28, 2)
        parts.append(s); hints.append(p)

        yr_y  = cy - 30 if above else cy + 48
        lbl_y = cy - 52 if above else cy + 68
        s, p  = _draw_text(x, yr_y, year, 17, style["accent2"], "middle", d + 0.32, bold=True)
        parts.append(s)
        s, p  = _draw_text(x, lbl_y, label, 14, style["fg"], "middle", d + 0.44)
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_radial_web(title: str, data: Dict, style: Dict,
                       w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    center = data.get("center", title or "Topic")
    spokes = data.get("spokes", ["A", "B", "C", "D"])
    cx, cy = w // 2, h // 2
    r      = min(w, h) // 3

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(cx, 52, title, 30, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Center node
    s, p = _draw_circle(cx, cy, 52, style["accent"] + "cc", style["accent"], 0.2, 0.5, 3)
    parts.append(s); hints.append(p)
    parts.append(
        f'<text x="{cx}" y="{cy + 7}" font-size="18" fill="{style["bg"]}" '
        f'text-anchor="middle" font-weight="bold" font-family="\'Caveat\',cursive" '
        f'style="animation:fadeIn 0.4s ease forwards 0.65s;opacity:0">{_escape(center)}</text>'
    )

    for i, spoke in enumerate(spokes):
        angle = (2 * math.pi * i) / len(spokes) - math.pi / 2
        sx = int(cx + r * math.cos(angle))
        sy = int(cy + r * math.sin(angle))
        d  = 0.5 + i * (dur / (len(spokes) + 1))

        s, p = _draw_line(cx, cy, sx, sy, style["accent2"], d, 0.32, 1.5)
        parts.append(s)

        s, p = _draw_circle(sx, sy, 38, style["accent2"] + "20",
                            style["accent2"], d + 0.28, 0.38, 1.5)
        parts.append(s); hints.append(p)

        s, p = _draw_text(sx, sy + 6, str(spoke), 16, style["fg"], "middle", d + 0.52)
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_equation_write(title: str, data: Dict, style: Dict,
                            w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    equation   = data.get("equation", "E = mc²")
    parts_data = data.get("parts", [])

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 80, title, 30, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    eq_box_y = h // 2 - 70
    s, p = _draw_rect(w // 2 - 280, eq_box_y, 560, 90,
                      style["accent"] + "14", style["accent"], 12, 0.3, 0.55)
    parts.append(s); hints.append(p)

    parts.append(
        f'<text x="{w//2}" y="{h//2 + 2}" font-size="58" fill="{style["accent"]}" '
        f'text-anchor="middle" font-weight="bold" font-style="italic" '
        f'font-family="Georgia,serif" '
        f'style="animation:fadeUp 0.6s ease forwards 0.82s;opacity:0">'
        f'{_escape(equation)}</text>'
    )
    hints.append({"x": w // 2 - 100, "y": eq_box_y, "t": 0.3})

    if parts_data:
        spacing = (w - 160) // len(parts_data)
        for i, part in enumerate(parts_data):
            # Accept both {"symbol","meaning"} objects and flat "symbol=meaning"
            # strings (the flatter form is less error-prone for the LLM to emit).
            if isinstance(part, dict):
                sym = part.get("symbol", "")
                meaning = part.get("meaning", "")
            else:
                s = str(part)
                sep = "=" if "=" in s else (":" if ":" in s else None)
                if sep:
                    sym, meaning = (x.strip() for x in s.split(sep, 1))
                else:
                    sym, meaning = s.strip(), ""
            d  = 1.4 + i * (dur / (len(parts_data) + 2))
            px = 100 + i * spacing + spacing // 2

            s, p = _draw_rect(px - 55, h // 2 + 60, 110, 58,
                              style["accent2"] + "1e", style["accent2"], 8, d, 0.38)
            parts.append(s); hints.append(p)
            parts.append(
                f'<text x="{px}" y="{h//2 + 88}" font-size="22" fill="{style["accent2"]}" '
                f'text-anchor="middle" font-weight="bold" font-style="italic" '
                f'font-family="Georgia,serif" '
                f'style="animation:fadeIn 0.3s ease forwards {d+0.34:.2f}s;opacity:0">'
                f'{_escape(sym)}</text>'
            )
            parts.append(
                f'<text x="{px}" y="{h//2 + 108}" font-size="13" fill="{style["fg"]}" '
                f'text-anchor="middle" '
                f'style="animation:fadeIn 0.3s ease forwards {d+0.5:.2f}s;opacity:0">'
                f'{_escape(meaning[:20])}</text>'
            )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_staircase_steps(title: str, data: Dict, style: Dict,
                             w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    items    = data.get("items", ["Step 1", "Step 2", "Step 3"])
    n        = len(items)
    usable_h = h - 180
    step_h   = usable_h // n
    step_w_inc = (w - 220) // n

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    for i, item in enumerate(items):
        d  = 0.3 + i * (dur / (n + 1))
        sw = step_w_inc * (i + 1) + 80
        sy = 100 + i * step_h
        sx = (w - sw) // 2
        # Increasing opacity per step
        alpha = f"{min(0xff, 0x28 + i * 0x22):02x}"
        s, p  = _draw_rect(sx, sy, sw, step_h - 6,
                           style["accent"] + alpha, style["accent"], 6, d, 0.45)
        parts.append(s); hints.append(p)

        s, p = _draw_text(w // 2, sy + step_h // 2 + 8,
                          f"{i+1}. {item}", 21, style["fg"], "middle",
                          d + 0.5, bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_venn_two(title: str, data: Dict, style: Dict,
                     w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    left          = data.get("left", "A")
    right         = data.get("right", "B")
    overlap       = data.get("overlap", "Both")
    left_items    = data.get("left_items", [])
    right_items   = data.get("right_items", [])
    overlap_items = data.get("overlap_items", [])

    cx, cy = w // 2, h // 2
    r      = min(w, h) // 4
    offset = r // 2

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(cx, 60, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    s, p = _draw_circle(cx - offset, cy, r, style["accent"] + "2e",
                        style["accent"], 0.3, 0.58, 2)
    parts.append(s); hints.append(p)
    s, p = _draw_circle(cx + offset, cy, r, style["accent2"] + "2e",
                        style["accent2"], 0.52, 0.58, 2)
    parts.append(s); hints.append(p)

    s, p = _draw_text(cx - offset - r // 2, cy - r // 3, left, 22, style["accent"],
                      "middle", 0.88, bold=True, family="'Caveat',cursive")
    parts.append(s)
    s, p = _draw_text(cx + offset + r // 2, cy - r // 3, right, 22, style["accent2"],
                      "middle", 1.1, bold=True, family="'Caveat',cursive")
    parts.append(s)
    s, p = _draw_text(cx, cy - r // 3, overlap, 18, style["fg"],
                      "middle", 1.3, family="'Caveat',cursive")
    parts.append(s)

    for i, it in enumerate(left_items[:3]):
        parts.append(
            f'<text x="{cx - offset - r//2}" y="{cy + 8 + i*24}" font-size="14" '
            f'fill="{style["fg"]}" text-anchor="middle" '
            f'style="animation:fadeIn 0.38s ease forwards {1.45+i*0.2:.2f}s;opacity:0">'
            f'{_escape(str(it))}</text>'
        )
    for i, it in enumerate(right_items[:3]):
        parts.append(
            f'<text x="{cx + offset + r//2}" y="{cy + 8 + i*24}" font-size="14" '
            f'fill="{style["fg"]}" text-anchor="middle" '
            f'style="animation:fadeIn 0.38s ease forwards {1.55+i*0.2:.2f}s;opacity:0">'
            f'{_escape(str(it))}</text>'
        )
    for i, it in enumerate(overlap_items[:3]):
        parts.append(
            f'<text x="{cx}" y="{cy + 8 + i*24}" font-size="13" '
            f'fill="{style["fg"]}" text-anchor="middle" opacity="0.85" '
            f'style="animation:fadeIn 0.38s ease forwards {1.65+i*0.2:.2f}s;opacity:0">'
            f'{_escape(str(it))}</text>'
        )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_tree_hierarchy(title: str, data: Dict, style: Dict,
                            w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    root     = data.get("root", title or "Root")
    children = data.get("children", ["Child 1", "Child 2"])
    n        = len(children)
    cx       = w // 2
    root_y   = 140
    child_y  = 330
    spacing  = (w - 200) // max(n - 1, 1)
    start_x  = 100 + spacing // 2 if n > 1 else cx

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(cx, 62, title, 30, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    s, p = _draw_rect(cx - 82, root_y - 32, 164, 68,
                      style["accent"] + "cc", style["accent"], 10, 0.25, 0.48)
    parts.append(s); hints.append(p)
    parts.append(
        f'<text x="{cx}" y="{root_y + 12}" font-size="22" fill="{style["bg"]}" '
        f'text-anchor="middle" font-weight="bold" font-family="\'Caveat\',cursive" '
        f'style="animation:fadeIn 0.35s ease forwards 0.68s;opacity:0">{_escape(root)}</text>'
    )

    for i, child in enumerate(children):
        cx_c = start_x + i * spacing
        d    = 0.6 + i * (dur / (n + 1))

        s, p = _draw_line(cx, root_y + 36, cx_c, child_y - 32,
                          style["accent2"], d - 0.1, 0.32, 1.5)
        parts.append(s)

        s, p = _draw_rect(cx_c - 68, child_y - 32, 136, 60,
                          style["accent2"] + "20", style["accent2"], 8, d, 0.4)
        parts.append(s); hints.append(p)
        parts.append(
            f'<text x="{cx_c}" y="{child_y + 6}" font-size="18" fill="{style["fg"]}" '
            f'text-anchor="middle" font-family="\'Caveat\',cursive" '
            f'style="animation:fadeIn 0.35s ease forwards {d+0.34:.2f}s;opacity:0">'
            f'{_escape(str(child))}</text>'
        )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_bar_chart(title: str, data: Dict, style: Dict,
                      w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    bars    = data.get("bars", [{"label": "A", "value": 80}, {"label": "B", "value": 50}])
    unit    = data.get("unit", "")
    max_val = max((b.get("value", 0) for b in bars), default=100) or 100
    n       = len(bars)
    bar_w   = min(100, (w - 160) // n - 20)
    spacing = (w - 120) // n
    chart_h = h - 250
    base_y  = h - 110

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Axes
    s, p = _draw_line(70, base_y, w - 60, base_y, style["fg"], 0.3, 0.4, 2)
    parts.append(s); hints.append(p)
    s, p = _draw_line(70, base_y - chart_h, 70, base_y, style["fg"], 0.3, 0.35, 2)
    parts.append(s)

    for i, bar in enumerate(bars):
        val   = bar.get("value", 0)
        label = bar.get("label", "")
        bh    = int(chart_h * val / max_val)
        bx    = 80 + i * spacing + (spacing - bar_w) // 2
        d     = 0.5 + i * (dur / (n + 1))

        s, p = _draw_rect(bx, base_y - bh, bar_w, bh,
                          style["accent"] + "cc", style["accent"], 4, d, 0.5)
        parts.append(s); hints.append(p)

        parts.append(
            f'<text x="{bx + bar_w//2}" y="{base_y - bh - 8}" font-size="16" '
            f'fill="{style["accent"]}" text-anchor="middle" font-weight="bold" '
            f'style="animation:fadeUp 0.28s ease forwards {d+0.44:.2f}s;opacity:0">'
            f'{val}{unit}</text>'
        )
        parts.append(
            f'<text x="{bx + bar_w//2}" y="{base_y + 22}" font-size="15" '
            f'fill="{style["fg"]}" text-anchor="middle" '
            f'style="animation:fadeUp 0.28s ease forwards {d+0.54:.2f}s;opacity:0">'
            f'{_escape(str(label))}</text>'
        )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_cycle_loop(title: str, data: Dict, style: Dict,
                       w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    stages = data.get("stages", ["Stage 1", "Stage 2", "Stage 3"])
    n      = len(stages)
    cx, cy = w // 2, h // 2
    r      = min(w, h) // 3 - 10

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(cx, 50, title, 30, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Dashed guide ring
    parts.append(
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" '
        f'stroke="{style["accent2"]}" stroke-width="1.5" '
        f'stroke-dasharray="12 8" opacity="0.4" '
        f'style="animation:fadeIn 0.8s ease forwards 0.3s;opacity:0"/>'
    )

    for i, stage in enumerate(stages):
        angle = (2 * math.pi * i) / n - math.pi / 2
        sx = int(cx + r * math.cos(angle))
        sy = int(cy + r * math.sin(angle))
        d  = 0.35 + i * (dur / (n + 1))

        # Arrow dot between stages
        mid_angle = angle + math.pi / n
        ax = int(cx + (r - 6) * math.cos(mid_angle))
        ay = int(cy + (r - 6) * math.sin(mid_angle))
        parts.append(
            f'<circle cx="{ax}" cy="{ay}" r="5" fill="{style["accent2"]}" opacity="0" '
            f'style="animation:fadeIn 0.2s ease forwards {d+0.38:.2f}s;opacity:0"/>'
        )

        s, p = _draw_circle(sx, sy, 46, style["accent"] + "1e",
                            style["accent"], d, 0.4, 2)
        parts.append(s); hints.append(p)

        s, p = _draw_text(sx, sy + 7, str(stage), 17, style["fg"],
                          "middle", d + 0.44, family="'Caveat','Patrick Hand',cursive")
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_funnel_layers(title: str, data: Dict, style: Dict,
                          w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    items   = data.get("items", ["Top", "Middle", "Bottom"])
    n       = len(items)
    total_h = h - 200
    layer_h = total_h // n
    max_w   = w - 160

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 32, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    for i, item in enumerate(items):
        ratio = 1.0 - i * 0.16
        lw    = int(max_w * ratio)
        lx    = (w - lw) // 2
        ly    = 100 + i * layer_h
        d     = 0.3 + i * (dur / (n + 1))
        alpha = f"{min(0xff, 0x2a + i * 0x22):02x}"
        s, p  = _draw_rect(lx, ly, lw, layer_h - 6,
                           style["accent"] + alpha, style["accent"], 4, d, 0.45)
        parts.append(s); hints.append(p)

        s, p = _draw_text(w // 2, ly + layer_h // 2 + 8, str(item), 21, style["fg"],
                          "middle", d + 0.5, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_paragraph_reveal(title: str, data: Dict, style: Dict,
                              w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    text = data.get("text", title or "Content")

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 80, title, 30, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Word-wrap at ~52 chars per line
    words = str(text).split()
    lines: List[str] = []
    cur = ""
    for word in words:
        if len(cur) + len(word) + 1 > 52:
            lines.append(cur.strip())
            cur = word
        else:
            cur = f"{cur} {word}"
    if cur:
        lines.append(cur.strip())

    top_y  = (h - len(lines) * 42) // 2
    step_t = min(0.6, dur / max(len(lines), 1) * 0.55)

    for i, line in enumerate(lines):
        d = 0.35 + i * step_t
        s, p = _draw_text(w // 2, top_y + i * 42, line, 26, style["fg"], "middle", d,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s)
        if i == 0:
            hints.append(p)

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _render_annotated_diagram(title: str, data: Dict, style: Dict,
                               w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    diagram_type = data.get("diagram_type", "generic")
    ann_parts    = data.get("parts", [])
    if not ann_parts:
        ann_parts = [{"name": "Core", "description": title or "Main concept",
                      "x": 0.5, "y": 0.5}]

    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 52, title, 34, style["accent"], "middle", 0.1, bold=True,
                          family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)

    # Background: a generated hero image if one was supplied (for diagram_types
    # without native stroke art), otherwise the built-in doodle. This guarantees
    # the scene is never just an empty shape.
    image_uri = data.get("image_data_uri", "")
    if image_uri:
        margin = max(70, w // 14)
        fx = margin
        fw = w - 2 * margin
        fy = 104
        fh = h - fy - 70
        parts.append(
            f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="14" '
            f'fill="{style["accent"]}0d" opacity="0" '
            f'style="animation:fadeIn 0.3s ease forwards 0.15s;opacity:0"/>'
        )
        s, p = _draw_rect(fx - 6, fy - 6, fw + 12, fh + 12, "none",
                          style["accent"], 16, 0.2, min(0.7, dur * 0.35))
        parts.append(s); hints.append(p)
        wipe_dur = min(1.6, max(0.9, dur * 0.5))
        parts.append(
            f'<image href="{image_uri}" x="{fx}" y="{fy}" width="{fw}" height="{fh}" '
            f'preserveAspectRatio="xMidYMid meet" '
            f'style="animation:wipeReveal {wipe_dur:.2f}s ease forwards 0.55s"/>'
        )
        parts.append(_draw_hand(fx, fy + int(fh * 0.46), fx + fw, 0.55, wipe_dur, style["accent"]))
        hints.append({"x": fx, "y": fy + fh // 2, "t": 0.55})
    else:
        parts.append(_annotated_bg(diagram_type, style, w, h, dur))
        hints.append({"x": w // 2, "y": h // 2 - 20, "t": 0.2})

    # Annotations
    for i, part in enumerate(ann_parts):
        px   = int(part.get("x", 0.5) * w)
        py   = int(part.get("y", 0.5) * h)
        name = part.get("name", f"Part {i+1}")
        desc = part.get("description", "")
        d    = 0.9 + i * (dur * 0.07)

        lx     = px + (115 if px < w // 2 else -115)
        ly     = py + (-30 if py > h // 2 else 30)
        anchor = "start" if px < w // 2 else "end"
        loff   = 10 if anchor == "start" else -10

        s, p = _draw_circle(px, py, 6, style["accent"], style["accent"], d, 0.2, 2)
        parts.append(s); hints.append(p)
        s, p = _draw_line(px, py, lx, ly, style["accent"], d + 0.16, 0.28, 1.5)
        parts.append(s)

        parts.append(
            f'<text x="{lx + loff}" y="{ly - 4}" font-size="18" fill="{style["fg"]}" '
            f'font-weight="bold" text-anchor="{anchor}" '
            f'font-family="\'Caveat\',\'Patrick Hand\',cursive" '
            f'style="animation:fadeIn 0.35s ease forwards {d+0.4:.2f}s;opacity:0">'
            f'{_escape(name)}</text>'
        )
        if desc:
            parts.append(
                f'<text x="{lx + loff}" y="{ly + 16}" font-size="13" fill="{style["fg"]}" '
                f'text-anchor="{anchor}" opacity="0.72" '
                f'style="animation:fadeIn 0.35s ease forwards {d+0.55:.2f}s;opacity:0">'
                f'{_escape(desc[:36])}</text>'
            )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _draw_hand(x0: float, y0: float, x1: float,
               delay: float, dur: float, accent: str) -> str:
    """
    A hand-holding-a-marker group whose marker TIP sits at local (0,0). The MP4
    renderer sweeps it from x0→x1 at height y0 (see `handSweep` in video_renderer),
    so it tracks the frontier of a left→right image reveal — the signature
    "being drawn by hand" look. `dur`/`delay` must match the image's wipeReveal.
    """
    return (
        f'<g id="draw-hand" data-x0="{x0:.0f}" data-x1="{x1:.0f}" data-y="{y0:.0f}" '
        f'style="animation:handSweep {dur:.2f}s linear forwards {delay:.2f}s;opacity:0">'
        # soft shadow under the marker tip
        f'<ellipse cx="4" cy="8" rx="16" ry="7" fill="rgba(0,0,0,0.12)"/>'
        # marker barrel: tip (0,0) → down-right
        f'<line x1="2" y1="3" x2="66" y2="78" stroke="#2b2b2b" stroke-width="16" stroke-linecap="round"/>'
        # metal collar
        f'<line x1="30" y1="36" x2="44" y2="52" stroke="#c9ced6" stroke-width="17" stroke-linecap="butt"/>'
        # colored nib right at the tip
        f'<line x1="0" y1="0" x2="15" y2="18" stroke="{accent}" stroke-width="9" stroke-linecap="round"/>'
        # cuff / sleeve behind the fist
        f'<rect x="92" y="104" width="78" height="46" rx="16" fill="#5566b0" '
        f'transform="rotate(38 92 104)"/>'
        # fist gripping the lower barrel
        f'<ellipse cx="78" cy="92" rx="40" ry="29" fill="#f0c088" stroke="#d29b5f" '
        f'stroke-width="2.5" transform="rotate(38 78 92)"/>'
        # thumb
        f'<ellipse cx="54" cy="78" rx="15" ry="9" fill="#f0c088" stroke="#d29b5f" '
        f'stroke-width="2" transform="rotate(38 54 78)"/>'
        f'</g>'
    )


def _render_illustration(title: str, data: Dict, style: Dict,
                         w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    """
    Hero illustration scene — embeds an AI-generated hand-drawn picture inside a
    marker frame that "wipes" in left→right, with an optional caption and up to
    four callout labels pointing at parts of the image.

    Expected `data`:
      prompt          : text used upstream to generate the picture (not drawn)
      image_data_uri  : base64 data URI of the picture (injected by the assembler)
      caption         : short line drawn under the frame
      labels          : [{"text": str, "x": 0-1, "y": 0-1}, ...]
      diagram_type    : fallback doodle when no image is available
    """
    image_uri = data.get("image_data_uri", "")
    caption   = data.get("caption", "")
    labels    = data.get("labels", []) or []

    parts: List[str] = []
    hints: List[PenHint] = []

    # Title + optional caption subtitle. Both sit at the TOP so they never
    # collide with the bottom on-screen-text bar drawn by _wrap_html.
    top = 60
    if title:
        s, p = _draw_text(w // 2, 54, title, 34, style["accent"], "middle", 0.1,
                          bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)
        top = 88
    if caption:
        s, p = _draw_text(w // 2, top + 6, str(caption)[:70], 22, style["fg"],
                          "middle", 0.35, family="'Caveat','Patrick Hand',cursive")
        parts.append(s)
        top += 36

    reserve_bottom = 76
    margin = max(70, w // 14)
    fx = margin
    fw = w - 2 * margin
    fy = top
    fh = h - top - reserve_bottom

    if image_uri:
        # Paper-tint interior so letterboxed edges look intentional
        parts.append(
            f'<rect x="{fx}" y="{fy}" width="{fw}" height="{fh}" rx="14" '
            f'fill="{style["accent"]}0d" opacity="0" '
            f'style="animation:fadeIn 0.3s ease forwards 0.15s;opacity:0"/>'
        )
        # Hand-drawn frame border traces itself
        s, p = _draw_rect(fx - 6, fy - 6, fw + 12, fh + 12, "none",
                          style["accent"], 16, 0.2, min(0.7, dur * 0.35))
        parts.append(s); hints.append(p)
        # The picture wipes in left→right (looks hand-drawn in the MP4)
        wipe_dur = min(1.6, max(0.9, dur * 0.5))
        parts.append(
            f'<image href="{image_uri}" x="{fx}" y="{fy}" width="{fw}" height="{fh}" '
            f'preserveAspectRatio="xMidYMid meet" '
            f'style="animation:wipeReveal {wipe_dur:.2f}s ease forwards 0.55s"/>'
        )
        hints.append({"x": fx, "y": fy + fh // 2, "t": 0.55})
        # Drawing hand tracks the reveal frontier (the signature "being drawn" look)
        hand_y = fy + int(fh * 0.46)
        parts.append(_draw_hand(fx, hand_y, fx + fw, 0.55, wipe_dur, style["accent"]))
    else:
        # No picture — fall back to a pure-SVG doodle so the scene still lands
        parts.append(_annotated_bg(data.get("diagram_type", "generic"), style, w, h, dur))
        hints.append({"x": w // 2, "y": h // 2, "t": 0.2})

    # Callout labels over the picture
    for i, lb in enumerate(labels[:4]):
        try:
            lx = int(float(lb.get("x", 0.5)) * w)
            ly = int(float(lb.get("y", 0.5)) * h)
        except (TypeError, ValueError):
            continue
        text = str(lb.get("text", ""))[:26]
        if not text:
            continue
        d = 1.15 + i * 0.32
        # Anchor pill toward the nearest horizontal edge so it doesn't cover the subject
        to_left = lx > w // 2
        pill_w = min(230, 16 + len(text) * 11)
        px = (lx - 40 - pill_w) if to_left else (lx + 40)
        px = max(fx + 4, min(px, fx + fw - pill_w - 4))
        py = max(fy + 20, min(ly, fy + fh - 40))

        # Target dot + connector
        s, p = _draw_circle(lx, ly, 6, style["accent"], style["accent"], d, 0.2, 2)
        parts.append(s); hints.append(p)
        anchor_x = px + pill_w if to_left else px
        s, p = _draw_line(lx, ly, anchor_x, py + 15, style["accent"], d + 0.14, 0.24, 1.5)
        parts.append(s)

        # Legible white pill + dark text (readable over any picture/style)
        parts.append(
            f'<rect x="{px}" y="{py}" width="{pill_w}" height="30" rx="15" '
            f'fill="#ffffffee" stroke="{style["accent"]}" stroke-width="1.5" opacity="0" '
            f'style="animation:fadeIn 0.25s ease forwards {d+0.24:.2f}s;opacity:0"/>'
        )
        parts.append(
            f'<text x="{px + pill_w//2}" y="{py + 20}" font-size="16" fill="#1a1a2e" '
            f'text-anchor="middle" font-weight="bold" '
            f'font-family="\'Caveat\',\'Patrick Hand\',cursive" '
            f'style="animation:fadeIn 0.25s ease forwards {d+0.34:.2f}s;opacity:0">'
            f'{_escape(text)}</text>'
        )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg" '
           f'xmlns:xlink="http://www.w3.org/1999/xlink">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


def _annotated_bg(diagram_type: str, style: Dict, w: int, h: int, dur: float) -> str:
    """SVG background illustration for annotated_diagram, drawn stroke-by-stroke."""
    cx, cy = w // 2, h // 2
    a  = style["accent"]
    a2 = style["accent2"]

    if diagram_type == "cell":
        rx_val = min(w, h) // 3
        ry_val = min(w, h) // 4
        return (
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx_val}" ry="{ry_val}" '
            f'fill="{a}12" stroke="{a}" stroke-width="3" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.5:.1f}s ease-out forwards 0.2s"/>'
            f'<ellipse cx="{cx-30}" cy="{cy+10}" rx="{min(w,h)//9}" ry="{min(w,h)//11}" '
            f'fill="{a2}28" stroke="{a2}" stroke-width="2" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.3:.1f}s ease forwards 0.85s"/>'
        )
    if diagram_type == "atom":
        rings = "".join(
            f'<ellipse cx="{cx}" cy="{cy}" rx="{110+i*40}" ry="{55+i*20}" '
            f'fill="none" stroke="{a}" stroke-width="1.5" opacity="0.45" '
            f'transform="rotate({i*60} {cx} {cy})" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.35:.1f}s ease forwards {0.28+i*0.22:.2f}s"/>'
            for i in range(3)
        )
        return (
            f'<circle cx="{cx}" cy="{cy}" r="22" fill="{a}" opacity="0" '
            f'style="animation:fadeIn 0.3s ease forwards 0.2s;opacity:0"/>'
            + rings
        )
    if diagram_type == "leaf":
        return (
            f'<path d="M{cx} {cy-120} C{cx+180} {cy-80} {cx+200} {cy+80} {cx} {cy+120} '
            f'C{cx-200} {cy+80} {cx-180} {cy-80} {cx} {cy-120}Z" '
            f'fill="{a}15" stroke="{a}" stroke-width="3" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.5:.1f}s ease-out forwards 0.2s"/>'
            f'<line x1="{cx}" y1="{cy-115}" x2="{cx}" y2="{cy+115}" '
            f'stroke="{a}" stroke-width="2" opacity="0.55" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.28:.1f}s ease forwards 0.88s"/>'
        )
    if diagram_type == "heart":
        return (
            f'<path d="M{cx} {cy+100} C{cx-250} {cy-50} {cx-250} {cy-160} '
            f'{cx} {cy-80} C{cx+250} {cy-160} {cx+250} {cy-50} {cx} {cy+100}Z" '
            f'fill="{a}15" stroke="{a}" stroke-width="3" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.55:.1f}s ease-out forwards 0.2s"/>'
        )
    if diagram_type == "dna":
        return (
            f'<path d="M{cx-60} {cy-160} C{cx+60} {cy-80} {cx-60} {cy} '
            f'{cx+60} {cy+80} S{cx-60} {cy+160} {cx-60} {cy+160}" '
            f'fill="none" stroke="{a}" stroke-width="3" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.5:.1f}s ease forwards 0.2s"/>'
            f'<path d="M{cx+60} {cy-160} C{cx-60} {cy-80} {cx+60} {cy} '
            f'{cx-60} {cy+80} S{cx+60} {cy+160} {cx+60} {cy+160}" '
            f'fill="none" stroke="{a2}" stroke-width="3" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.5:.1f}s ease forwards 0.4s"/>'
        )
    if diagram_type == "waveform":
        x0, x1 = w * 0.16, w * 0.84
        def _wave(base_y: float, amp: float, cycles: float, color: str,
                  delay: float, ddur: float) -> str:
            n = 64
            pts = []
            for i in range(n + 1):
                t = i / n
                x = x0 + (x1 - x0) * t
                y = base_y - amp * math.sin(2 * math.pi * cycles * t)
                pts.append(f"{x:.1f} {y:.1f}")
            d = "M" + " L".join(pts)
            return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3.5" '
                    f'stroke-linecap="round" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                    f'style="animation:drawLine {ddur:.1f}s ease forwards {delay:.2f}s"/>')
        return (
            f'<line x1="{x0}" y1="{cy}" x2="{x1}" y2="{cy}" stroke="{a}" stroke-width="1" '
            f'opacity="0.3" stroke-dasharray="6 6"/>'
            + _wave(cy - 45, 46, 2.5, a, 0.2, dur * 0.5)
            + _wave(cy + 55, 34, 3.5, a2, 0.6, dur * 0.5)
        )

    if diagram_type == "punnett":
        size = min(w, h) // 3
        gx, gy = cx - size // 2, cy - size // 2 + 10
        cell = size // 2
        frag = (
            f'<rect x="{gx}" y="{gy}" width="{size}" height="{size}" fill="none" '
            f'stroke="{a}" stroke-width="3" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.4:.1f}s ease forwards 0.2s"/>'
            f'<line x1="{gx+cell}" y1="{gy}" x2="{gx+cell}" y2="{gy+size}" stroke="{a}" '
            f'stroke-width="2" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.25:.1f}s ease forwards 0.6s"/>'
            f'<line x1="{gx}" y1="{gy+cell}" x2="{gx+size}" y2="{gy+cell}" stroke="{a}" '
            f'stroke-width="2" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur*0.25:.1f}s ease forwards 0.75s"/>'
        )
        heads = [("A", gx + cell * 0.5, gy - 12), ("a", gx + cell * 1.5, gy - 12),
                 ("A", gx - 20, gy + cell * 0.5 + 8), ("a", gx - 20, gy + cell * 1.5 + 8)]
        for i, (ch, tx, ty) in enumerate(heads):
            frag += (f'<text x="{tx:.0f}" y="{ty:.0f}" font-size="26" fill="{a2}" '
                     f'text-anchor="middle" font-weight="bold" font-family="cursive" opacity="0" '
                     f'style="animation:fadeIn 0.3s ease forwards {0.9+i*0.12:.2f}s;opacity:0">{ch}</text>')
        combos = ["AA", "Aa", "Aa", "aa"]
        cells = [(gx + cell * 0.5, gy + cell * 0.5), (gx + cell * 1.5, gy + cell * 0.5),
                 (gx + cell * 0.5, gy + cell * 1.5), (gx + cell * 1.5, gy + cell * 1.5)]
        for i, (cmb, (tx, ty)) in enumerate(zip(combos, cells)):
            frag += (f'<text x="{tx:.0f}" y="{ty+9:.0f}" font-size="24" fill="{style["fg"]}" '
                     f'text-anchor="middle" font-weight="bold" font-family="cursive" opacity="0" '
                     f'style="animation:fadeIn 0.3s ease forwards {1.4+i*0.15:.2f}s;opacity:0">{cmb}</text>')
        return frag

    if diagram_type == "gears":
        def _gear(gcx: float, gcy: float, r: float, teeth: int, color: str,
                  delay: float, ddur: float) -> str:
            frag = (f'<circle cx="{gcx:.0f}" cy="{gcy:.0f}" r="{r:.0f}" fill="none" '
                    f'stroke="{color}" stroke-width="3" stroke-dasharray="{_DASH}" '
                    f'stroke-dashoffset="{_DASH}" '
                    f'style="animation:drawLine {ddur:.1f}s ease forwards {delay:.2f}s"/>'
                    f'<circle cx="{gcx:.0f}" cy="{gcy:.0f}" r="{max(6, r//4):.0f}" fill="{color}" '
                    f'opacity="0" style="animation:fadeIn 0.3s ease forwards {delay+ddur:.2f}s;opacity:0"/>')
            for i in range(teeth):
                ang = 2 * math.pi * i / teeth
                x1 = gcx + r * math.cos(ang); y1 = gcy + r * math.sin(ang)
                x2 = gcx + (r + 12) * math.cos(ang); y2 = gcy + (r + 12) * math.sin(ang)
                frag += (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                         f'stroke="{color}" stroke-width="3" stroke-linecap="round" opacity="0" '
                         f'style="animation:fadeIn 0.2s ease forwards {delay+ddur+i*0.03:.2f}s;opacity:0"/>')
            return frag
        r = min(w, h) // 6
        return (_gear(cx - r * 0.9, cy, r, 10, a, 0.2, dur * 0.4)
                + _gear(cx + r * 0.9, cy + r * 0.2, r * 0.75, 8, a2, 0.6, dur * 0.4))

    if diagram_type == "flask":
        body_w = min(w, h) // 4
        ftop = cy - min(w, h) // 4
        fbot = cy + min(w, h) // 4
        neck = 24
        d = (f"M{cx-neck} {ftop} L{cx-neck} {ftop+60} L{cx-body_w} {fbot} "
             f"L{cx+body_w} {fbot} L{cx+neck} {ftop+60} L{cx+neck} {ftop}")
        frag = (f'<path d="{d}" fill="none" stroke="{a}" stroke-width="3" stroke-linejoin="round" '
                f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.5:.1f}s ease forwards 0.2s"/>')
        liq_top = fbot - 66
        frag += (f'<path d="M{cx-body_w+12} {fbot-4} L{cx+body_w-12} {fbot-4} '
                 f'L{cx+int(body_w*0.55)} {liq_top} L{cx-int(body_w*0.55)} {liq_top} Z" '
                 f'fill="{a2}44" opacity="0" '
                 f'style="animation:fadeIn 0.5s ease forwards {dur*0.5+0.3:.2f}s;opacity:0"/>')
        for i, (bx, by, br) in enumerate([(cx - 20, liq_top + 26, 7),
                                          (cx + 16, liq_top + 46, 5),
                                          (cx + 2, liq_top + 8, 6)]):
            frag += (f'<circle cx="{bx}" cy="{by}" r="{br}" fill="none" stroke="{a2}" '
                     f'stroke-width="2" opacity="0" '
                     f'style="animation:fadeIn 0.3s ease forwards {dur*0.6+i*0.2:.2f}s;opacity:0"/>')
        return frag

    if diagram_type == "magnet":
        bw = min(w, h) // 2
        bh = min(w, h) // 6
        bx, by = cx - bw // 2, cy - bh // 2
        frag = (f'<rect x="{bx}" y="{by}" width="{bw//2}" height="{bh}" fill="{a}33" '
                f'stroke="{a}" stroke-width="3" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.35:.1f}s ease forwards 0.2s"/>'
                f'<rect x="{cx}" y="{by}" width="{bw//2}" height="{bh}" fill="{a2}33" '
                f'stroke="{a2}" stroke-width="3" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.35:.1f}s ease forwards 0.5s"/>'
                f'<text x="{bx+bw//4}" y="{cy+10}" font-size="32" fill="{a}" text-anchor="middle" '
                f'font-weight="bold" opacity="0" '
                f'style="animation:fadeIn 0.3s ease forwards {dur*0.5:.2f}s;opacity:0">N</text>'
                f'<text x="{cx+bw//4}" y="{cy+10}" font-size="32" fill="{a2}" text-anchor="middle" '
                f'font-weight="bold" opacity="0" '
                f'style="animation:fadeIn 0.3s ease forwards {dur*0.5+0.15:.2f}s;opacity:0">S</text>')
        for i, rr in enumerate([bh * 1.5, bh * 2.3]):
            frag += (f'<path d="M{bx} {cy} Q{cx} {cy-rr:.0f} {bx+bw} {cy}" fill="none" '
                     f'stroke="{a}" stroke-width="1.5" opacity="0.4" '
                     f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                     f'style="animation:drawLine {dur*0.4:.1f}s ease forwards {dur*0.6+i*0.2:.2f}s"/>')
        return frag

    if diagram_type == "sun":
        r = min(w, h) // 7
        frag = (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{a}22" stroke="{a}" stroke-width="3" '
                f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.4:.1f}s ease forwards 0.2s"/>')
        for i in range(12):
            ang = 2 * math.pi * i / 12
            x1 = cx + (r + 14) * math.cos(ang); y1 = cy + (r + 14) * math.sin(ang)
            x2 = cx + (r + 44) * math.cos(ang); y2 = cy + (r + 44) * math.sin(ang)
            frag += (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                     f'stroke="{a}" stroke-width="3" stroke-linecap="round" opacity="0" '
                     f'style="animation:fadeIn 0.2s ease forwards {dur*0.4+0.2+i*0.04:.2f}s;opacity:0"/>')
        return frag

    if diagram_type == "brain":
        r = min(w, h) // 5
        frag = (f'<ellipse cx="{cx}" cy="{cy}" rx="{int(r*1.2)}" ry="{r}" fill="{a}12" '
                f'stroke="{a}" stroke-width="3" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.5:.1f}s ease forwards 0.2s"/>'
                f'<line x1="{cx}" y1="{cy-r}" x2="{cx}" y2="{cy+r}" stroke="{a}" stroke-width="2" '
                f'opacity="0.6" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {dur*0.3:.1f}s ease forwards {dur*0.5+0.2:.2f}s"/>')
        for i, off in enumerate([int(-r * 0.5), 0, int(r * 0.5)]):
            frag += (f'<path d="M{cx-int(r*1.0)} {cy+off} q{int(r*0.5)} -22 {int(r*1.0)} 0 '
                     f't {int(r*1.0)} 0" fill="none" stroke="{a}" stroke-width="1.5" opacity="0.5" '
                     f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                     f'style="animation:drawLine {dur*0.3:.1f}s ease forwards {dur*0.6+i*0.15:.2f}s"/>')
        return frag

    if diagram_type == "water":
        R = min(w, h) // 8
        ox, oy = cx, cy + 10
        hr = int(R * 0.62)
        hpos = [(cx - int(R * 1.3), oy - int(R * 0.95)),
                (cx + int(R * 1.3), oy - int(R * 0.95))]
        frag = ""
        for (hx, hy) in hpos:
            frag += (f'<line x1="{ox}" y1="{oy}" x2="{hx}" y2="{hy}" stroke="{a}" stroke-width="4" '
                     f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                     f'style="animation:drawLine {dur*0.3:.1f}s ease forwards 0.5s"/>')
        frag += (f'<circle cx="{ox}" cy="{oy}" r="{R}" fill="{a}33" stroke="{a}" stroke-width="3" '
                 f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                 f'style="animation:drawLine {dur*0.4:.1f}s ease forwards 0.2s"/>'
                 f'<text x="{ox}" y="{oy+10}" font-size="30" fill="{a}" text-anchor="middle" '
                 f'font-weight="bold" opacity="0" '
                 f'style="animation:fadeIn 0.3s ease forwards {dur*0.4+0.3:.2f}s;opacity:0">O</text>')
        for i, (hx, hy) in enumerate(hpos):
            frag += (f'<circle cx="{hx}" cy="{hy}" r="{hr}" fill="{a2}33" stroke="{a2}" stroke-width="3" '
                     f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                     f'style="animation:drawLine {dur*0.3:.1f}s ease forwards {0.8+i*0.2:.2f}s"/>'
                     f'<text x="{hx}" y="{hy+7}" font-size="20" fill="{a2}" text-anchor="middle" '
                     f'font-weight="bold" opacity="0" '
                     f'style="animation:fadeIn 0.3s ease forwards {1.1+i*0.2:.2f}s;opacity:0">H</text>')
        return frag

    # Generic — two concentric circles
    r1 = min(w, h) // 3
    r2 = min(w, h) // 5
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r1}" fill="none" stroke="{a}" stroke-width="2" '
        f'opacity="0.35" stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {dur*0.44:.1f}s ease forwards 0.2s"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r2}" fill="{a}12" stroke="{a}" stroke-width="1.5" '
        f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
        f'style="animation:drawLine {dur*0.34:.1f}s ease forwards 0.62s"/>'
    )


# ══════════════════════════════════════════════════════════════════════════════
# Dynamic composition scene — the AI assembles a content-specific drawing from a
# library of hand-drawn doodle icons + labels + arrows, laid out automatically.
# This makes each scene reflect its actual content instead of a fixed template.
# ══════════════════════════════════════════════════════════════════════════════

def _istroke(open_tag: str, color: str, t: float, dur: float = 0.45,
             sw: float = 3, fill: str = "none") -> str:
    """A shape (given as an unclosed element opener) that draws itself at time t."""
    return (f'{open_tag} fill="{fill}" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {dur:.2f}s ease forwards {t:.2f}s"/>')


# ── Icon drawers: each fills a circle of radius r around (cx,cy), stroke-by-stroke

def _ic_sun(cx, cy, r, a, a2, t):
    out = [_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.5:.0f}"', a, t, 0.4)]
    for i in range(8):
        ang = 2 * math.pi * i / 8
        x1, y1 = cx + r * 0.6 * math.cos(ang), cy + r * 0.6 * math.sin(ang)
        x2, y2 = cx + r * 0.98 * math.cos(ang), cy + r * 0.98 * math.sin(ang)
        out.append(_istroke(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"',
                            a, t + 0.3 + i * 0.03, 0.15))
    return "".join(out)


def _ic_cloud(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<circle cx="{cx-r*0.4:.0f}" cy="{cy:.0f}" r="{r*0.4:.0f}"', a, t, 0.35),
        _istroke(f'<circle cx="{cx+r*0.1:.0f}" cy="{cy-r*0.25:.0f}" r="{r*0.5:.0f}"', a, t+0.2, 0.35),
        _istroke(f'<circle cx="{cx+r*0.55:.0f}" cy="{cy:.0f}" r="{r*0.4:.0f}"', a, t+0.4, 0.35),
        _istroke(f'<line x1="{cx-r*0.75:.0f}" y1="{cy+r*0.38:.0f}" x2="{cx+r*0.9:.0f}" y2="{cy+r*0.38:.0f}"', a, t+0.55, 0.2),
    ])


def _ic_water(cx, cy, r, a, a2, t):
    d = (f"M{cx:.0f} {cy-r:.0f} C{cx+r*0.9:.0f} {cy:.0f} {cx+r*0.5:.0f} {cy+r*0.8:.0f} "
         f"{cx:.0f} {cy+r*0.8:.0f} C{cx-r*0.5:.0f} {cy+r*0.8:.0f} {cx-r*0.9:.0f} {cy:.0f} {cx:.0f} {cy-r:.0f} Z")
    return _istroke(f'<path d="{d}"', a, t, 0.6, 3, f"{a}22")


def _ic_leaf(cx, cy, r, a, a2, t):
    d = (f"M{cx:.0f} {cy-r:.0f} C{cx+r:.0f} {cy-r*0.4:.0f} {cx+r*0.6:.0f} {cy+r:.0f} {cx:.0f} {cy+r:.0f} "
         f"C{cx-r*0.6:.0f} {cy+r:.0f} {cx-r:.0f} {cy-r*0.4:.0f} {cx:.0f} {cy-r:.0f} Z")
    vein = f'<line x1="{cx:.0f}" y1="{cy-r*0.9:.0f}" x2="{cx:.0f}" y2="{cy+r*0.9:.0f}"'
    return _istroke(f'<path d="{d}"', a, t, 0.5, 3, f"{a}22") + _istroke(vein, a, t+0.4, 0.3, 2)


def _ic_tree(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy-r*0.3:.0f}" r="{r*0.6:.0f}"', a, t, 0.5, 3, f"{a}18"),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy+r*0.3:.0f}" x2="{cx:.0f}" y2="{cy+r:.0f}"', a2 or a, t+0.4, 0.25, 4),
    ])


def _ic_rocket(cx, cy, r, a, a2, t):
    body = (f"M{cx:.0f} {cy-r:.0f} C{cx+r*0.5:.0f} {cy-r*0.4:.0f} {cx+r*0.4:.0f} {cy+r*0.5:.0f} "
            f"{cx+r*0.25:.0f} {cy+r*0.7:.0f} L{cx-r*0.25:.0f} {cy+r*0.7:.0f} "
            f"C{cx-r*0.4:.0f} {cy+r*0.5:.0f} {cx-r*0.5:.0f} {cy-r*0.4:.0f} {cx:.0f} {cy-r:.0f} Z")
    return "".join([
        _istroke(f'<path d="{body}"', a, t, 0.6, 3, f"{a}12"),
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy-r*0.2:.0f}" r="{r*0.15:.0f}"', a2 or a, t+0.5, 0.3, 2, f"{a2 or a}22"),
        _istroke(f'<line x1="{cx-r*0.25:.0f}" y1="{cy+r*0.4:.0f}" x2="{cx-r*0.5:.0f}" y2="{cy+r*0.8:.0f}"', a, t+0.6, 0.2),
        _istroke(f'<line x1="{cx+r*0.25:.0f}" y1="{cy+r*0.4:.0f}" x2="{cx+r*0.5:.0f}" y2="{cy+r*0.8:.0f}"', a, t+0.7, 0.2),
        _istroke(f'<path d="M{cx-r*0.15:.0f} {cy+r*0.72:.0f} Q{cx:.0f} {cy+r*1.2:.0f} {cx+r*0.15:.0f} {cy+r*0.72:.0f}"', a2 or a, t+0.8, 0.3),
    ])


def _ic_star(cx, cy, r, a, a2, t):
    pts = []
    for i in range(5):
        o = (-math.pi/2) + 2*math.pi*i/5
        ii = o + math.pi/5
        pts.append((cx + r*math.cos(o), cy + r*math.sin(o)))
        pts.append((cx + r*0.42*math.cos(ii), cy + r*0.42*math.sin(ii)))
    d = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts) + " Z"
    return _istroke(f'<path d="{d}"', a, t, 0.7, 3, f"{a}18")


def _ic_bulb(cx, cy, r, a, a2, t):
    out = [_istroke(f'<circle cx="{cx:.0f}" cy="{cy-r*0.2:.0f}" r="{r*0.55:.0f}"', a, t, 0.5, 3, f"{a}12")]
    out.append(_istroke(f'<path d="M{cx-r*0.28:.0f} {cy+r*0.4:.0f} L{cx-r*0.28:.0f} {cy+r*0.7:.0f} '
                        f'L{cx+r*0.28:.0f} {cy+r*0.7:.0f} L{cx+r*0.28:.0f} {cy+r*0.4:.0f}"', a, t+0.4, 0.25))
    out.append(_istroke(f'<path d="M{cx-r*0.15:.0f} {cy:.0f} Q{cx:.0f} {cy-r*0.25:.0f} {cx+r*0.15:.0f} {cy:.0f}"', a2 or a, t+0.55, 0.2, 2))
    for ang in (-math.pi*0.8, -math.pi/2, -math.pi*0.2):
        x1, y1 = cx + r*0.72*math.cos(ang), (cy-r*0.2) + r*0.72*math.sin(ang)
        x2, y2 = cx + r*0.98*math.cos(ang), (cy-r*0.2) + r*0.98*math.sin(ang)
        out.append(_istroke(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"', a2 or a, t+0.65, 0.15, 2))
    return "".join(out)


def _ic_book(cx, cy, r, a, a2, t):
    left = (f'M{cx:.0f} {cy-r*0.6:.0f} C{cx-r*0.5:.0f} {cy-r*0.8:.0f} {cx-r:.0f} {cy-r*0.6:.0f} {cx-r:.0f} {cy-r*0.6:.0f} '
            f'L{cx-r:.0f} {cy+r*0.5:.0f} C{cx-r*0.5:.0f} {cy+r*0.3:.0f} {cx:.0f} {cy+r*0.5:.0f} {cx:.0f} {cy+r*0.5:.0f} Z')
    right = (f'M{cx:.0f} {cy-r*0.6:.0f} C{cx+r*0.5:.0f} {cy-r*0.8:.0f} {cx+r:.0f} {cy-r*0.6:.0f} {cx+r:.0f} {cy-r*0.6:.0f} '
             f'L{cx+r:.0f} {cy+r*0.5:.0f} C{cx+r*0.5:.0f} {cy+r*0.3:.0f} {cx:.0f} {cy+r*0.5:.0f} {cx:.0f} {cy+r*0.5:.0f} Z')
    return _istroke(f'<path d="{left}"', a, t, 0.5, 3, f"{a}10") + _istroke(f'<path d="{right}"', a, t+0.4, 0.5, 3, f"{a}10")


def _ic_brain(cx, cy, r, a, a2, t):
    out = [_istroke(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{r*0.95:.0f}" ry="{r*0.8:.0f}"', a, t, 0.5, 3, f"{a}10")]
    out.append(_istroke(f'<line x1="{cx:.0f}" y1="{cy-r*0.75:.0f}" x2="{cx:.0f}" y2="{cy+r*0.75:.0f}"', a, t+0.4, 0.3, 2))
    for i, off in enumerate((-r*0.4, 0, r*0.4)):
        out.append(_istroke(f'<path d="M{cx-r*0.7:.0f} {cy+off:.0f} q{r*0.35:.0f} -{r*0.25:.0f} {r*0.7:.0f} 0"', a, t+0.5+i*0.12, 0.25, 2))
    return "".join(out)


def _ic_heart(cx, cy, r, a, a2, t):
    d = (f"M{cx:.0f} {cy+r*0.7:.0f} C{cx-r*1.2:.0f} {cy-r*0.2:.0f} {cx-r*0.5:.0f} {cy-r*0.9:.0f} {cx:.0f} {cy-r*0.3:.0f} "
         f"C{cx+r*0.5:.0f} {cy-r*0.9:.0f} {cx+r*1.2:.0f} {cy-r*0.2:.0f} {cx:.0f} {cy+r*0.7:.0f} Z")
    return _istroke(f'<path d="{d}"', a, t, 0.6, 3, f"{a}18")


def _ic_gear(cx, cy, r, a, a2, t):
    out = [_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.55:.0f}"', a, t, 0.4),
           _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.2:.0f}"', a, t+0.3, 0.25)]
    for i in range(8):
        ang = 2*math.pi*i/8
        x1, y1 = cx + r*0.55*math.cos(ang), cy + r*0.55*math.sin(ang)
        x2, y2 = cx + r*0.92*math.cos(ang), cy + r*0.92*math.sin(ang)
        out.append(_istroke(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"', a, t+0.35+i*0.03, 0.15, 4))
    return "".join(out)


def _ic_atom(cx, cy, r, a, a2, t):
    out = [_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.14:.0f}"', a, t, 0.2, 3, a)]
    for i in range(3):
        out.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{r*0.95:.0f}" ry="{r*0.4:.0f}" '
                   f'fill="none" stroke="{a2 or a}" stroke-width="2" transform="rotate({i*60} {cx:.0f} {cy:.0f})" '
                   f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                   f'style="animation:drawLine 0.4s ease forwards {t+0.2+i*0.15:.2f}s"/>')
    return "".join(out)


def _ic_flask(cx, cy, r, a, a2, t):
    d = (f"M{cx-r*0.2:.0f} {cy-r*0.8:.0f} L{cx-r*0.2:.0f} {cy-r*0.2:.0f} L{cx-r*0.6:.0f} {cy+r*0.7:.0f} "
         f"L{cx+r*0.6:.0f} {cy+r*0.7:.0f} L{cx+r*0.2:.0f} {cy-r*0.2:.0f} L{cx+r*0.2:.0f} {cy-r*0.8:.0f}")
    liquid = (f'<path d="M{cx-r*0.42:.0f} {cy+r*0.25:.0f} L{cx+r*0.42:.0f} {cy+r*0.25:.0f} '
              f'L{cx+r*0.6:.0f} {cy+r*0.7:.0f} L{cx-r*0.6:.0f} {cy+r*0.7:.0f} Z"')
    return _istroke(f'<path d="{d}"', a, t, 0.6, 3) + _istroke(liquid, a2 or a, t+0.5, 0.3, 2, f"{a2 or a}44")


def _ic_computer(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<rect x="{cx-r*0.8:.0f}" y="{cy-r*0.6:.0f}" width="{r*1.6:.0f}" height="{r*1.05:.0f}" rx="6"', a, t, 0.5, 3, f"{a}10"),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy+r*0.45:.0f}" x2="{cx:.0f}" y2="{cy+r*0.75:.0f}"', a, t+0.4, 0.15),
        _istroke(f'<line x1="{cx-r*0.4:.0f}" y1="{cy+r*0.78:.0f}" x2="{cx+r*0.4:.0f}" y2="{cy+r*0.78:.0f}"', a, t+0.5, 0.15),
    ])


def _ic_person(cx, cy, r, a, a2, t):
    head = f'<circle cx="{cx:.0f}" cy="{cy-r*0.55:.0f}" r="{r*0.3:.0f}"'
    body = f'<path d="M{cx-r*0.5:.0f} {cy+r*0.8:.0f} C{cx-r*0.5:.0f} {cy-r*0.05:.0f} {cx+r*0.5:.0f} {cy-r*0.05:.0f} {cx+r*0.5:.0f} {cy+r*0.8:.0f}"'
    return _istroke(head, a, t, 0.4, 3, f"{a}12") + _istroke(body, a, t+0.35, 0.4)


def _ic_building(cx, cy, r, a, a2, t):
    out = [_istroke(f'<rect x="{cx-r*0.6:.0f}" y="{cy-r*0.8:.0f}" width="{r*1.2:.0f}" height="{r*1.6:.0f}"', a, t, 0.5, 3, f"{a}08")]
    for row in range(3):
        for col in range(2):
            wx, wy = cx - r*0.35 + col*r*0.5, cy - r*0.55 + row*r*0.45
            out.append(_istroke(f'<rect x="{wx:.0f}" y="{wy:.0f}" width="{r*0.22:.0f}" height="{r*0.28:.0f}"',
                                a2 or a, t+0.4+(row*2+col)*0.05, 0.1, 2))
    return "".join(out)


def _ic_globe(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.85:.0f}"', a, t, 0.5, 3, f"{a}0c"),
        _istroke(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{r*0.4:.0f}" ry="{r*0.85:.0f}"', a2 or a, t+0.4, 0.3, 2),
        _istroke(f'<line x1="{cx-r*0.85:.0f}" y1="{cy:.0f}" x2="{cx+r*0.85:.0f}" y2="{cy:.0f}"', a2 or a, t+0.55, 0.25, 2),
    ])


def _ic_coin(cx, cy, r, a, a2, t):
    return (_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.8:.0f}"', a, t, 0.5, 3, f"{a}14")
            + f'<text x="{cx:.0f}" y="{cy+r*0.3:.0f}" font-size="{r*0.9:.0f}" fill="{a}" '
              f'text-anchor="middle" font-weight="bold" opacity="0" '
              f'style="animation:fadeIn 0.3s ease forwards {t+0.5:.2f}s;opacity:0">$</text>')


def _ic_clock(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.8:.0f}"', a, t, 0.5),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy:.0f}" x2="{cx:.0f}" y2="{cy-r*0.5:.0f}"', a2 or a, t+0.45, 0.2),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy:.0f}" x2="{cx+r*0.4:.0f}" y2="{cy:.0f}"', a2 or a, t+0.6, 0.2),
    ])


def _ic_target(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.85:.0f}"', a, t, 0.4),
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.5:.0f}"', a, t+0.3, 0.3),
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.16:.0f}"', a2 or a, t+0.55, 0.2, 3, a2 or a),
    ])


def _ic_arrow(cx, cy, r, a, a2, t):
    return (_istroke(f'<line x1="{cx-r*0.8:.0f}" y1="{cy:.0f}" x2="{cx+r*0.55:.0f}" y2="{cy:.0f}"', a, t, 0.3, 4)
            + _istroke(f'<path d="M{cx+r*0.2:.0f} {cy-r*0.4:.0f} L{cx+r*0.8:.0f} {cy:.0f} L{cx+r*0.2:.0f} {cy+r*0.4:.0f}"', a, t+0.3, 0.25, 4))


def _ic_check(cx, cy, r, a, a2, t):
    return (_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.85:.0f}"', a, t, 0.4, 3, f"{a}10")
            + _istroke(f'<path d="M{cx-r*0.4:.0f} {cy:.0f} L{cx-r*0.1:.0f} {cy+r*0.35:.0f} L{cx+r*0.45:.0f} {cy-r*0.35:.0f}"', a2 or a, t+0.4, 0.3, 4))


def _ic_bolt(cx, cy, r, a, a2, t):
    d = (f"M{cx+r*0.2:.0f} {cy-r*0.9:.0f} L{cx-r*0.4:.0f} {cy+r*0.1:.0f} L{cx:.0f} {cy+r*0.1:.0f} "
         f"L{cx-r*0.2:.0f} {cy+r*0.9:.0f} L{cx+r*0.5:.0f} {cy-r*0.2:.0f} L{cx:.0f} {cy-r*0.2:.0f} Z")
    return _istroke(f'<path d="{d}"', a, t, 0.6, 3, f"{a}20")


def _ic_chat(cx, cy, r, a, a2, t):
    d = (f"M{cx-r*0.8:.0f} {cy-r*0.6:.0f} L{cx+r*0.8:.0f} {cy-r*0.6:.0f} L{cx+r*0.8:.0f} {cy+r*0.3:.0f} "
         f"L{cx-r*0.2:.0f} {cy+r*0.3:.0f} L{cx-r*0.5:.0f} {cy+r*0.7:.0f} L{cx-r*0.5:.0f} {cy+r*0.3:.0f} "
         f"L{cx-r*0.8:.0f} {cy+r*0.3:.0f} Z")
    return _istroke(f'<path d="{d}"', a, t, 0.6, 3, f"{a}10")


def _ic_chart(cx, cy, r, a, a2, t):
    out = [_istroke(f'<line x1="{cx-r*0.8:.0f}" y1="{cy+r*0.7:.0f}" x2="{cx+r*0.8:.0f}" y2="{cy+r*0.7:.0f}"', a, t, 0.3),
           _istroke(f'<line x1="{cx-r*0.8:.0f}" y1="{cy-r*0.8:.0f}" x2="{cx-r*0.8:.0f}" y2="{cy+r*0.7:.0f}"', a, t+0.2, 0.3)]
    for i, hh in enumerate((0.4, 0.75, 1.1, 1.5)):
        bx = cx - r*0.55 + i*r*0.4
        out.append(_istroke(f'<rect x="{bx:.0f}" y="{cy+r*0.7-r*hh*0.5:.0f}" width="{r*0.25:.0f}" height="{r*hh*0.5:.0f}"',
                            a2 or a, t+0.4+i*0.1, 0.3, 2, f"{a2 or a}30"))
    return "".join(out)


def _ic_search(cx, cy, r, a, a2, t):
    return (_istroke(f'<circle cx="{cx-r*0.2:.0f}" cy="{cy-r*0.2:.0f}" r="{r*0.55:.0f}"', a, t, 0.5, 3, f"{a}08")
            + _istroke(f'<line x1="{cx+r*0.25:.0f}" y1="{cy+r*0.25:.0f}" x2="{cx+r*0.75:.0f}" y2="{cy+r*0.75:.0f}"', a, t+0.45, 0.25, 5))


def _ic_molecule(cx, cy, r, a, a2, t):
    return "".join([
        _istroke(f'<line x1="{cx:.0f}" y1="{cy:.0f}" x2="{cx-r*0.6:.0f}" y2="{cy-r*0.5:.0f}"', a, t, 0.2),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy:.0f}" x2="{cx+r*0.6:.0f}" y2="{cy-r*0.5:.0f}"', a, t+0.1, 0.2),
        _istroke(f'<line x1="{cx:.0f}" y1="{cy:.0f}" x2="{cx:.0f}" y2="{cy+r*0.7:.0f}"', a, t+0.2, 0.2),
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.3:.0f}"', a, t+0.3, 0.3, 3, f"{a}30"),
        _istroke(f'<circle cx="{cx-r*0.6:.0f}" cy="{cy-r*0.5:.0f}" r="{r*0.22:.0f}"', a2 or a, t+0.4, 0.25, 3, f"{a2 or a}30"),
        _istroke(f'<circle cx="{cx+r*0.6:.0f}" cy="{cy-r*0.5:.0f}" r="{r*0.22:.0f}"', a2 or a, t+0.5, 0.25, 3, f"{a2 or a}30"),
        _istroke(f'<circle cx="{cx:.0f}" cy="{cy+r*0.7:.0f}" r="{r*0.22:.0f}"', a2 or a, t+0.6, 0.25, 3, f"{a2 or a}30"),
    ])


def _ic_shield(cx, cy, r, a, a2, t):
    d = (f"M{cx:.0f} {cy-r*0.85:.0f} L{cx+r*0.7:.0f} {cy-r*0.5:.0f} C{cx+r*0.7:.0f} {cy+r*0.3:.0f} "
         f"{cx+r*0.4:.0f} {cy+r*0.75:.0f} {cx:.0f} {cy+r*0.9:.0f} C{cx-r*0.4:.0f} {cy+r*0.75:.0f} "
         f"{cx-r*0.7:.0f} {cy+r*0.3:.0f} {cx-r*0.7:.0f} {cy-r*0.5:.0f} Z")
    return _istroke(f'<path d="{d}"', a, t, 0.7, 3, f"{a}10")


def _ic_question(cx, cy, r, a, a2, t):
    return (_istroke(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r*0.85:.0f}"', a, t, 0.4, 3, f"{a}08")
            + f'<text x="{cx:.0f}" y="{cy+r*0.35:.0f}" font-size="{r*1.1:.0f}" fill="{a}" '
              f'text-anchor="middle" font-weight="bold" opacity="0" '
              f'style="animation:fadeIn 0.3s ease forwards {t+0.4:.2f}s;opacity:0">?</text>')


_ICONS = {
    "sun": _ic_sun, "cloud": _ic_cloud, "water": _ic_water, "drop": _ic_water,
    "leaf": _ic_leaf, "plant": _ic_leaf, "tree": _ic_tree, "nature": _ic_tree,
    "rocket": _ic_rocket, "space": _ic_rocket, "star": _ic_star,
    "bulb": _ic_bulb, "idea": _ic_bulb, "light": _ic_bulb,
    "book": _ic_book, "learn": _ic_book, "study": _ic_book, "education": _ic_book,
    "brain": _ic_brain, "think": _ic_brain, "mind": _ic_brain, "ai": _ic_brain,
    "heart": _ic_heart, "love": _ic_heart, "health": _ic_heart,
    "gear": _ic_gear, "gears": _ic_gear, "settings": _ic_gear, "process": _ic_gear, "engine": _ic_gear,
    "atom": _ic_atom, "physics": _ic_atom, "flask": _ic_flask, "chemistry": _ic_flask, "science": _ic_flask,
    "computer": _ic_computer, "laptop": _ic_computer, "tech": _ic_computer, "code": _ic_computer,
    "person": _ic_person, "user": _ic_person, "people": _ic_person, "human": _ic_person,
    "building": _ic_building, "company": _ic_building, "business": _ic_building, "city": _ic_building,
    "globe": _ic_globe, "world": _ic_globe, "earth": _ic_globe, "internet": _ic_globe,
    "coin": _ic_coin, "money": _ic_coin, "cost": _ic_coin, "price": _ic_coin,
    "clock": _ic_clock, "time": _ic_clock, "speed": _ic_clock,
    "target": _ic_target, "goal": _ic_target, "aim": _ic_target,
    "arrow": _ic_arrow, "next": _ic_arrow, "result": _ic_arrow,
    "check": _ic_check, "done": _ic_check, "correct": _ic_check, "success": _ic_check,
    "bolt": _ic_bolt, "energy": _ic_bolt, "power": _ic_bolt, "electricity": _ic_bolt, "fast": _ic_bolt,
    "chat": _ic_chat, "message": _ic_chat, "talk": _ic_chat, "language": _ic_chat,
    "chart": _ic_chart, "growth": _ic_chart, "data": _ic_chart, "stats": _ic_chart, "graph": _ic_chart,
    "search": _ic_search, "find": _ic_search, "analyze": _ic_search,
    "molecule": _ic_molecule, "water_molecule": _ic_molecule,
    "shield": _ic_shield, "security": _ic_shield, "safe": _ic_shield, "protect": _ic_shield,
    "question": _ic_question, "concept": _ic_question,

    # ── Extended vocabulary ─────────────────────────────────────────────────
    # Models emit a wide range of icon names; map the common ones onto the 30
    # base doodles so scenes show a relevant picture instead of a "?".
    # Software / tech
    "web": _ic_globe, "website": _ic_globe, "online": _ic_globe, "http": _ic_globe,
    "url": _ic_globe, "browser": _ic_globe, "network": _ic_globe, "web_development": _ic_globe,
    "app": _ic_computer, "application": _ic_computer, "software": _ic_computer,
    "program": _ic_computer, "programming": _ic_computer, "coding": _ic_computer,
    "developer": _ic_computer, "development": _ic_computer, "script": _ic_computer,
    "keyboard": _ic_computer, "desktop": _ic_computer, "mobile": _ic_computer,
    "phone": _ic_computer, "smartphone": _ic_computer, "device": _ic_computer,
    "server": _ic_cloud, "backend": _ic_cloud, "hosting": _ic_cloud, "database": _ic_chart,
    "db": _ic_chart, "storage": _ic_chart, "sql": _ic_chart, "dataset": _ic_chart,
    "robot": _ic_gear, "automation": _ic_gear, "machine": _ic_gear, "machine_learning": _ic_brain,
    "ml": _ic_brain, "model": _ic_brain, "algorithm": _ic_gear, "neural": _ic_brain,
    "intelligence": _ic_brain, "logic": _ic_gear, "api": _ic_gear, "integration": _ic_gear,
    "function": _ic_gear, "framework": _ic_gear, "library": _ic_book, "module": _ic_gear,
    "analytics": _ic_chart, "analysis": _ic_search, "insight": _ic_search, "research": _ic_search,
    "explore": _ic_search, "discover": _ic_search, "investigate": _ic_search, "detail": _ic_search,
    # Science / math
    "math": _ic_chart, "maths": _ic_chart, "equation": _ic_atom, "formula": _ic_atom,
    "calculation": _ic_chart, "number": _ic_chart, "geometry": _ic_atom, "experiment": _ic_flask,
    "lab": _ic_flask, "test": _ic_flask, "biology": _ic_leaf, "cell": _ic_atom, "dna": _ic_molecule,
    "gene": _ic_molecule, "electron": _ic_atom, "proton": _ic_atom, "reaction": _ic_flask,
    "force": _ic_bolt, "motion": _ic_arrow, "wave": _ic_bolt, "magnet": _ic_bolt,
    # People / places / org
    "teacher": _ic_person, "student": _ic_person, "child": _ic_person, "kid": _ic_person,
    "team": _ic_person, "group": _ic_person, "community": _ic_person, "audience": _ic_person,
    "customer": _ic_person, "worker": _ic_person, "employee": _ic_person,
    "factory": _ic_building, "industry": _ic_building, "office": _ic_building,
    "organization": _ic_building, "school": _ic_building, "college": _ic_building,
    "university": _ic_building, "hospital": _ic_building, "bank": _ic_building, "home": _ic_building,
    # Money / time / goals
    "earn": _ic_coin, "salary": _ic_coin, "profit": _ic_coin, "finance": _ic_coin,
    "economy": _ic_coin, "budget": _ic_coin, "investment": _ic_coin, "rupee": _ic_coin,
    "dollar": _ic_coin, "revenue": _ic_coin, "cash": _ic_coin, "wealth": _ic_coin,
    "calendar": _ic_clock, "date": _ic_clock, "schedule": _ic_clock, "deadline": _ic_clock,
    "duration": _ic_clock, "history": _ic_clock, "future": _ic_clock,
    "objective": _ic_target, "mission": _ic_target, "focus": _ic_target, "purpose": _ic_target,
    "strategy": _ic_target, "plan": _ic_target,
    "step": _ic_arrow, "flow": _ic_arrow, "move": _ic_arrow, "forward": _ic_arrow,
    "direction": _ic_arrow, "path": _ic_arrow, "transfer": _ic_arrow,
    "verify": _ic_check, "complete": _ic_check, "approve": _ic_check, "tick": _ic_check,
    "valid": _ic_check, "benefit": _ic_check, "advantage": _ic_check, "pass": _ic_check,
    # Energy / comms / growth / misc
    "voltage": _ic_bolt, "battery": _ic_bolt, "charge": _ic_bolt, "current": _ic_bolt,
    "fuel": _ic_bolt, "flash": _ic_bolt,
    "communication": _ic_chat, "conversation": _ic_chat, "speak": _ic_chat, "discuss": _ic_chat,
    "word": _ic_chat, "text": _ic_chat, "reply": _ic_chat, "feedback": _ic_chat,
    "increase": _ic_chart, "trend": _ic_chart, "statistics": _ic_chart, "report": _ic_chart,
    "metric": _ic_chart, "performance": _ic_chart, "progress": _ic_chart, "improve": _ic_chart,
    "innovation": _ic_bulb, "creative": _ic_bulb, "solution": _ic_bulb, "tip": _ic_bulb,
    "achievement": _ic_star, "award": _ic_star, "win": _ic_star, "champion": _ic_star,
    "quality": _ic_star, "favorite": _ic_star, "trophy": _ic_star,
    "knowledge": _ic_book, "lesson": _ic_book, "chapter": _ic_book, "reading": _ic_book,
    "notebook": _ic_book, "note": _ic_book, "document": _ic_book, "syllabus": _ic_book,
    "planet": _ic_rocket, "launch": _ic_rocket, "startup": _ic_rocket, "growth_rocket": _ic_rocket,
    "rain": _ic_water, "river": _ic_water, "ocean": _ic_water, "sea": _ic_water, "liquid": _ic_water,
    "weather": _ic_cloud, "sky": _ic_cloud, "storm": _ic_cloud,
    "forest": _ic_tree, "wood": _ic_tree, "growth_tree": _ic_tree,
    "day": _ic_sun, "solar": _ic_sun, "bright": _ic_sun, "warm": _ic_sun, "summer": _ic_sun,
    "emotion": _ic_heart, "feeling": _ic_heart, "care": _ic_heart, "happy": _ic_heart, "life": _ic_heart,
}


# Real (non-question) doodles to rotate through when an icon truly can't be
# resolved — so a scene never shows a row of "?" marks.
_FALLBACK_ICON_KEYS = ("bulb", "star", "check", "gear", "target", "rocket", "chart", "book")


def _lookup_icon_key(name: str):
    """Return the matching _ICONS key for a name/label, or None. Skips the
    literal question-mark icon so callers can choose a better fallback."""
    key = str(name or "").strip().lower().replace(" ", "_")
    if not key:
        return None
    if key in _ICONS and key not in ("question", "concept"):
        return key
    for word in re.split(r"[_\-/,.]+", key):
        if word and word in _ICONS and word not in ("question", "concept"):
            return word
    return None


def _pick_icon_key(icon, label, idx: int) -> str:
    """Best icon key for a composition item — never a bare '?'. Tries the given
    icon name, then keywords in the label, then a rotating real doodle."""
    return (_lookup_icon_key(icon)
            or _lookup_icon_key(label)
            or _FALLBACK_ICON_KEYS[idx % len(_FALLBACK_ICON_KEYS)])


def _norm_icon(name: str):
    key = str(name or "").strip().lower().replace(" ", "_")
    if key in _ICONS:
        return _ICONS[key]
    for word in re.split(r"[_\-/,.]+", key):
        if word in _ICONS:
            return _ICONS[word]
    return _ic_question


def _draw_icon(name, cx, cy, size, style, t) -> Tuple[str, PenHint]:
    r = size / 2
    fn = _norm_icon(name)
    svg = fn(cx, cy, r, style["accent"], style.get("accent2", ""), t)
    return svg, {"x": cx, "y": cy - r * 0.5, "t": t}


def _render_composition(title: str, data: Dict, style: Dict,
                        w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    """
    Content-composed scene. `data`:
      layout : "row" | "grid" | "radial" | "center" | "compare"
      focus  : icon name for the central subject (center/radial)
      items  : [{"icon": name, "label": "..."}]
      arrows : bool — connect row items with arrows
    Draws relevant doodle icons + labels + arrows, laid out automatically and
    drawn stroke-by-stroke so every scene reflects its own content.
    """
    parts: List[str] = []
    hints: List[PenHint] = []

    if title:
        s, p = _draw_text(w // 2, 62, title, 34, style["accent"], "middle", 0.1,
                          bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)
        s, p = _draw_line(w // 2 - min(260, len(title) * 11), 82,
                          w // 2 + min(260, len(title) * 11), 82, style["accent"], 0.45, 0.4, 2)
        parts.append(s)

    items = [it for it in (data.get("items") or []) if isinstance(it, dict)]
    # Resolve every item's icon to a REAL doodle (never a "?") — try the given
    # icon name, then keywords in the label, then a rotating fallback.
    for i, it in enumerate(items):
        it["icon"] = _pick_icon_key(it.get("icon"), it.get("label"), i)
    focus = data.get("focus")
    if focus is not None:
        focus = _lookup_icon_key(focus) or _lookup_icon_key(data.get("label")) or "bulb"
    layout = str(data.get("layout", "")).strip().lower()
    if not layout:
        layout = "center" if (focus and not items) else ("radial" if focus else "row")
    cy_area = int(h * 0.52)

    def place(name, label, cx, cy, size, t):
        s, p = _draw_icon(name, cx, cy, size, style, t)
        parts.append(s); hints.append(p)
        if label:
            ls, _ = _draw_text(cx, cy + size * 0.62 + 22, str(label)[:22], 22,
                               style["fg"], "middle", t + 0.55,
                               family="'Caveat','Patrick Hand',cursive")
            parts.append(ls)

    if layout == "center" or (not items and focus):
        size = int(min(w, h) * 0.42)
        place(focus or (items[0].get("icon") if items else "concept"),
              items[0].get("label") if (items and not focus) else data.get("label", ""),
              w // 2, cy_area, size, 0.5)

    elif layout == "radial" and focus:
        R = int(min(w, h) * 0.32)
        place(focus, "", w // 2, cy_area, int(min(w, h) * 0.24), 0.4)
        n = max(1, len(items))
        for i, it in enumerate(items[:6]):
            ang = 2 * math.pi * i / n - math.pi / 2
            ix, iy = int(w // 2 + R * math.cos(ang)), int(cy_area + R * 0.8 * math.sin(ang))
            s, p = _draw_line(w // 2, cy_area, ix, iy, style.get("accent2", style["accent"]),
                              0.6 + i * 0.2, 0.3, 1.5)
            parts.append(s)
            place(it.get("icon", "concept"), it.get("label", ""), ix, iy, 110, 0.8 + i * 0.25)

    elif layout in ("grid",) or len(items) > 4:
        n = len(items) or 1
        per_row = 3 if n > 4 else n
        rows = (n + per_row - 1) // per_row
        size = 130 if rows > 1 else 150
        gy0 = int(h * 0.42) - (rows - 1) * 90
        for i, it in enumerate(items):
            rr, cc = i // per_row, i % per_row
            in_row = min(per_row, n - rr * per_row)
            xs0 = w // 2 - (in_row - 1) * (w * 0.24) / 2
            ix = int(xs0 + cc * (w * 0.24))
            iy = int(gy0 + rr * 190)
            place(it.get("icon", "concept"), it.get("label", ""), ix, iy, size, 0.4 + i * 0.25)

    elif layout == "compare":
        half = (len(items) + 1) // 2
        groups = [items[:half], items[half:]]
        for g, group in enumerate(groups):
            gx = int(w * (0.28 if g == 0 else 0.72))
            for i, it in enumerate(group):
                iy = int(h * 0.34) + i * 150
                place(it.get("icon", "concept"), it.get("label", ""), gx, iy, 110, 0.5 + (g * len(group) + i) * 0.25)
        s, p = _draw_line(w // 2, int(h * 0.24), w // 2, int(h * 0.82),
                          style["fg"], 0.3, 0.6, 1)
        parts.append(s)

    else:  # row
        n = max(1, len(items)) if items else 1
        if not items and focus:
            items = [{"icon": focus, "label": data.get("label", "")}]
            n = 1
        size = int(min(190, max(90, (w * 0.74) / n * 0.72)))
        # Symmetric centering: total span is capped so a few items don't spread
        # to the edges, and derived from a single `step` so the row is always
        # centered and the last item never clips the right margin.
        span = min(w * 0.72, (size + 120) * max(n - 1, 1))
        step = span / max(n - 1, 1) if n > 1 else 0
        xs0 = (w // 2 - span / 2) if n > 1 else w // 2
        want_arrows = bool(data.get("arrows")) and n > 1
        for i, it in enumerate(items):
            ix = int(xs0 + i * step)
            place(it.get("icon", "concept"), it.get("label", ""), ix, cy_area, size, 0.4 + i * 0.5)
            if want_arrows and i < n - 1:
                ax1 = ix + size * 0.55
                ax2 = xs0 + (i + 1) * step - size * 0.55
                s, p = _draw_line(ax1, cy_area, ax2, cy_area,
                                  style.get("accent2", style["accent"]), 0.75 + i * 0.5, 0.3, 3)
                parts.append(s)
                parts.append(
                    f'<path d="M{ax2-14:.0f} {cy_area-8} L{ax2:.0f} {cy_area} L{ax2-14:.0f} {cy_area+8}" '
                    f'fill="none" stroke="{style.get("accent2", style["accent"])}" stroke-width="3" '
                    f'opacity="0" style="animation:fadeIn 0.2s ease forwards {0.95+i*0.5:.2f}s;opacity:0"/>'
                )

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "</svg>")
    return svg, hints


_NUM_RE = __import__("re").compile(r'-?\d+\.?\d*')


def _shape_bbox(shapes: List[dict]):
    """Approximate (minX, minY, maxX, maxY) over all shape coordinates."""
    xs: List[float] = []
    ys: List[float] = []
    for s in shapes:
        t = s.get("t")
        try:
            if t == "line":
                xs += [float(s["x1"]), float(s["x2"])]; ys += [float(s["y1"]), float(s["y2"])]
            elif t == "circle":
                xs += [float(s["cx"]) - float(s["r"]), float(s["cx"]) + float(s["r"])]
                ys += [float(s["cy"]) - float(s["r"]), float(s["cy"]) + float(s["r"])]
            elif t == "ellipse":
                xs += [float(s["cx"]) - float(s["rx"]), float(s["cx"]) + float(s["rx"])]
                ys += [float(s["cy"]) - float(s["ry"]), float(s["cy"]) + float(s["ry"])]
            elif t == "rect":
                xs += [float(s["x"]), float(s["x"]) + float(s["w"])]
                ys += [float(s["y"]), float(s["y"]) + float(s["h"])]
            elif t in ("polyline", "polygon"):
                nums = [float(n) for n in _NUM_RE.findall(str(s.get("points", "")))]
                xs += nums[0::2]; ys += nums[1::2]
            elif t == "path":
                nums = [float(n) for n in _NUM_RE.findall(str(s.get("d", "")))]
                xs += nums[0::2]; ys += nums[1::2]
            elif t == "label":
                xs.append(float(s["x"])); ys.append(float(s["y"]))
        except (KeyError, ValueError, TypeError):
            continue
    if not xs or not ys:
        return 0.0, 0.0, 1000.0, 620.0
    return min(xs), min(ys), max(xs), max(ys)


def _shape_center(s: dict):
    t = s.get("t")
    try:
        if t in ("circle", "ellipse"):
            return float(s["cx"]), float(s["cy"])
        if t == "rect":
            return float(s["x"]) + float(s["w"]) / 2, float(s["y"]) + float(s["h"]) / 2
        if t == "line":
            return (float(s["x1"]) + float(s["x2"])) / 2, (float(s["y1"]) + float(s["y2"])) / 2
        if t == "label":
            return float(s["x"]), float(s["y"])
        nums = [float(n) for n in _NUM_RE.findall(str(s.get("d") or s.get("points") or ""))]
        if len(nums) >= 2:
            return nums[0], nums[1]
    except (KeyError, ValueError, TypeError):
        pass
    return 500.0, 310.0


def _render_draw(title: str, data: Dict, style: Dict,
                 w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    """
    Draw an LLM-decomposed subject: a list of primitive shapes rendered as clean
    hand-drawn line art, stroke-by-stroke, auto-fit to the frame, with the hand
    following. Falls back to the icon composition if no shapes were generated.
    """
    shapes = [s for s in (data.get("shapes") or []) if isinstance(s, dict)]
    if not shapes:
        return _render_composition(title, {"focus": data.get("subject", "concept"),
                                           "label": data.get("label", "")},
                                   style, w, h, dur)

    parts: List[str] = []
    hints: List[PenHint] = []
    top = 60
    if title:
        s, p = _draw_text(w // 2, 60, title, 34, style["accent"], "middle", 0.1,
                          bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)
        top = 100

    # Auto-fit the drawing's real bounding box into the content area
    minX, minY, maxX, maxY = _shape_bbox(shapes)
    area_x, area_y = 74, top + 8
    areaW, areaH = w - 148, h - area_y - 70
    bw, bh = max(1.0, maxX - minX), max(1.0, maxY - minY)
    sc = min(areaW / bw, areaH / bh) * 0.94
    tx = area_x + (areaW - bw * sc) / 2 - minX * sc
    ty = area_y + (areaH - bh * sc) / 2 - minY * sc

    def scr(ux, uy):
        return tx + ux * sc, ty + uy * sc

    fg = style["fg"]
    accent = style["accent"]
    n = len(shapes)
    span = min(dur * 0.75, max(2.0, n * 0.32))
    labels: List[str] = []
    group: List[str] = []

    for i, s in enumerate(shapes):
        t = s.get("t")
        delay = 0.35 + (i / max(n, 1)) * span
        col = accent if s.get("accent") else fg
        fill = f"{accent}22" if s.get("fill") else "none"
        anim = (f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
                f'style="animation:drawLine {min(0.55, span/max(n,1)+0.25):.2f}s ease forwards {delay:.2f}s"')
        common = (f'fill="{fill}" stroke="{col}" stroke-width="3.2" '
                  f'vector-effect="non-scaling-stroke" stroke-linecap="round" '
                  f'stroke-linejoin="round" {anim}')
        try:
            if t == "line":
                group.append(f'<line x1="{float(s["x1"])}" y1="{float(s["y1"])}" x2="{float(s["x2"])}" y2="{float(s["y2"])}" {common}/>')
            elif t == "circle":
                group.append(f'<circle cx="{float(s["cx"])}" cy="{float(s["cy"])}" r="{float(s["r"])}" {common}/>')
            elif t == "ellipse":
                group.append(f'<ellipse cx="{float(s["cx"])}" cy="{float(s["cy"])}" rx="{float(s["rx"])}" ry="{float(s["ry"])}" {common}/>')
            elif t == "rect":
                group.append(f'<rect x="{float(s["x"])}" y="{float(s["y"])}" width="{float(s["w"])}" height="{float(s["h"])}" rx="{float(s.get("rx", 0))}" {common}/>')
            elif t == "polyline":
                group.append(f'<polyline points="{_escape(str(s.get("points", "")))}" {common}/>')
            elif t == "polygon":
                group.append(f'<polygon points="{_escape(str(s.get("points", "")))}" {common}/>')
            elif t == "path":
                group.append(f'<path d="{_escape(str(s.get("d", "")))}" {common}/>')
            elif t == "label":
                lx, ly = scr(float(s["x"]), float(s["y"]))
                labels.append(
                    f'<text x="{lx:.0f}" y="{ly:.0f}" font-size="26" fill="{accent}" '
                    f'text-anchor="middle" font-weight="bold" '
                    f'font-family="\'Caveat\',\'Patrick Hand\',cursive" '
                    f'style="animation:fadeUp 0.5s ease forwards {delay:.2f}s;opacity:0">'
                    f'{_escape(str(s.get("text", "")))}</text>'
                )
                continue
            else:
                continue
            ux, uy = _shape_center(s)
            hx, hy = scr(ux, uy)
            hints.append({"x": hx, "y": hy, "t": delay})
        except (KeyError, ValueError, TypeError):
            continue

    body = (f'<g transform="translate({tx:.1f},{ty:.1f}) scale({sc:.4f})">'
            + "".join(group) + "</g>" + "".join(labels))
    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + body + "</svg>")
    return svg, hints


def _render_line_art(title: str, data: Dict, style: Dict,
                     w: int, h: int, dur: float) -> Tuple[str, List[PenHint]]:
    """
    Ink a vectorized line-art drawing (contours from line_art.generate_line_art)
    stroke-by-stroke, auto-fit to the frame, with the hand following the drawing.
    This is how a `draw` scene shows the ACTUAL subject as a hand-drawn sketch.
    Falls back to the icon composition if no contours were produced.
    """
    contours = data.get("contours") or []
    if not contours:
        return _render_composition(title, {"focus": data.get("subject", "concept"),
                                           "label": data.get("label", "")},
                                   style, w, h, dur)

    cw = float(data.get("cw") or 768)
    ch = float(data.get("ch") or 576)
    parts: List[str] = []
    hints: List[PenHint] = []

    top = 58
    if title:
        s, p = _draw_text(w // 2, 60, title, 34, style["accent"], "middle", 0.1,
                          bold=True, family="'Caveat','Patrick Hand',cursive")
        parts.append(s); hints.append(p)
        top = 100

    area_x, area_y = 72, top + 6
    areaW, areaH = w - 144, h - area_y - 58
    sc = min(areaW / cw, areaH / ch) * 0.97
    tx = area_x + (areaW - cw * sc) / 2
    ty = area_y + (areaH - ch * sc) / 2

    n = len(contours)
    span = max(2.5, dur * 0.82)
    ddur = min(0.5, span / max(n, 1) + 0.18)
    stroke = style["fg"]
    hint_every = max(1, n // 16)

    group = [f'<g transform="translate({tx:.1f},{ty:.1f}) scale({sc:.4f})">']
    for i, pts in enumerate(contours):
        delay = 0.3 + (i / max(n, 1)) * span
        group.append(
            f'<polygon points="{pts}" fill="none" stroke="{stroke}" stroke-width="2.4" '
            f'vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" '
            f'stroke-dasharray="{_DASH}" stroke-dashoffset="{_DASH}" '
            f'style="animation:drawLine {ddur:.2f}s ease forwards {delay:.2f}s"/>'
        )
        if i % hint_every == 0:
            try:
                fx, fy = pts.split(" ", 1)[0].split(",")
                hints.append({"x": tx + float(fx) * sc, "y": ty + float(fy) * sc, "t": delay})
            except (ValueError, IndexError):
                pass
    group.append("</g>")

    svg = (f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{w}" height="{h}" fill="{style["bg"]}"/>'
           + "".join(parts) + "".join(group) + "</svg>")
    return svg, hints


def _escape(s: str) -> str:
    """Escape HTML special characters for SVG text content."""
    return (str(s)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))
