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

    # Build JavaScript pen cursor timeline
    pen_js_lines = []
    if pen_hints:
        for p in sorted(pen_hints, key=lambda ph: ph.get("t", 0)):
            px = int(p.get("x", w // 2))
            py = int(p.get("y", h // 2))
            pt = max(0.0, p.get("t", 0) - 0.22)
            pen_js_lines.append(f"  movePen({px},{py},{pt:.2f});")
    pen_js = "\n".join(pen_js_lines)

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
  /* Pen cursor */
  #pen {{
    position:absolute; top:0; left:0;
    font-size:24px; line-height:1;
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
</style>
</head>
<body>
<div class="scene">
  <div class="c tl"></div>
  <div class="c br"></div>
  {svg_body}
  <div id="pen">&#9999;&#65039;</div>
  {caption_html}
</div>
<script>
(function(){{
  var pen=document.getElementById('pen');
  function movePen(x,y,t){{
    setTimeout(function(){{
      pen.style.transform='translate('+(x-14)+'px,'+(y-26)+'px)';
      pen.style.opacity='0.82';
    }},t*1000);
    setTimeout(function(){{ pen.style.opacity='0.18'; }},( t+0.5)*1000);
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
            sym     = part.get("symbol", "")
            meaning = part.get("meaning", "")
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

    # Background illustration
    bg_svg = _annotated_bg(diagram_type, style, w, h, dur)
    parts.append(bg_svg)
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


def _escape(s: str) -> str:
    """Escape HTML special characters for SVG text content."""
    return (str(s)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))
