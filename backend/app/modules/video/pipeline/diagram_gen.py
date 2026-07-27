"""
Diagram Generator — Produces SVG diagrams for STEM content.
Supports: KaTeX math equations, Mermaid flowcharts, custom labeled diagrams.
"""
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class DiagramGenerator:
    """
    Generates SVG diagram strings for specialized scene types.
    Used when scenes need mathematical notation, flowcharts, or scientific diagrams.
    """

    @staticmethod
    def generate_math_svg(equation: str, parts: list = None) -> str:
        """
        Generate SVG representation of a math equation.
        Uses a simplified text-based renderer (KaTeX integration planned for v2).
        
        Args:
            equation: LaTeX-style equation string (e.g. "E=mc^2")
            parts: Optional list of equation part labels
        """
        # Simplified SVG text renderer for equations
        # Full KaTeX→SVG integration is Phase 3
        clean_eq = _latex_to_text(equation)
        
        parts_text = ""
        if parts:
            for i, part in enumerate(parts):
                y_offset = 80 + (i * 30)
                parts_text += (
                    f'<text x="50%" y="{y_offset}" text-anchor="middle" '
                    f'font-size="16" fill="#666" font-family="Sora, sans-serif">'
                    f'{_escape_xml(part)}</text>\n'
                )

        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <text x="50%" y="40" text-anchor="middle" font-size="28" 
        font-family="serif" fill="#2c3e50" font-weight="bold">
    {_escape_xml(clean_eq)}
  </text>
  {parts_text}
</svg>'''

    @staticmethod
    def generate_flowchart_svg(steps: list, descriptions: list = None) -> str:
        """
        Generate a simple horizontal flowchart SVG.
        
        Args:
            steps: List of step labels
            descriptions: Optional descriptions for each step
        """
        if not steps:
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"/>'

        n = len(steps)
        box_width = min(120, 360 // n)
        gap = 20
        total_width = n * box_width + (n - 1) * gap
        start_x = (400 - total_width) // 2

        elements = []
        for i, step in enumerate(steps):
            x = start_x + i * (box_width + gap)
            # Box
            elements.append(
                f'<rect x="{x}" y="60" width="{box_width}" height="40" '
                f'rx="8" fill="#3498db" opacity="0.9"/>'
            )
            # Label
            elements.append(
                f'<text x="{x + box_width//2}" y="85" text-anchor="middle" '
                f'font-size="11" fill="white" font-family="Sora, sans-serif">'
                f'{_escape_xml(step[:15])}</text>'
            )
            # Arrow to next
            if i < n - 1:
                ax = x + box_width + 2
                elements.append(
                    f'<line x1="{ax}" y1="80" x2="{ax + gap - 4}" y2="80" '
                    f'stroke="#2c3e50" stroke-width="2" marker-end="url(#arrow)"/>'
                )

        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
      <polygon points="0 0, 6 2, 0 4" fill="#2c3e50"/>
    </marker>
  </defs>
  {"".join(elements)}
</svg>'''

    @staticmethod
    def generate_cycle_svg(stages: list) -> str:
        """Generate a circular cycle diagram SVG."""
        import math
        if not stages:
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"/>'

        n = len(stages)
        cx, cy, r = 200, 200, 120
        elements = []
        colors = ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#8e44ad"]

        for i, stage in enumerate(stages):
            angle = (2 * math.pi * i / n) - math.pi / 2
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            color = colors[i % len(colors)]

            elements.append(
                f'<circle cx="{x:.0f}" cy="{y:.0f}" r="35" fill="{color}" opacity="0.85"/>'
            )
            elements.append(
                f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" dy="4" '
                f'font-size="10" fill="white" font-family="Sora, sans-serif">'
                f'{_escape_xml(stage[:12])}</text>'
            )

            # Arrow to next node
            if n > 1:
                next_angle = (2 * math.pi * ((i + 1) % n) / n) - math.pi / 2
                # Midpoint for curve (simplified: straight line between edges)
                nx = cx + r * math.cos(next_angle)
                ny = cy + r * math.sin(next_angle)
                # Start/end adjusted inward from circle edges
                sx = x + 30 * math.cos(angle + math.pi / n)
                sy = y + 30 * math.sin(angle + math.pi / n)
                elements.append(
                    f'<line x1="{sx:.0f}" y1="{sy:.0f}" x2="{nx - 30*math.cos(next_angle - math.pi/n):.0f}" '
                    f'y2="{ny - 30*math.sin(next_angle - math.pi/n):.0f}" '
                    f'stroke="#555" stroke-width="1.5" stroke-dasharray="3,3"/>'
                )

        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  {"".join(elements)}
</svg>'''


def _latex_to_text(latex: str) -> str:
    """Simplified LaTeX → readable text (for SVG display)."""
    text = latex
    text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', text)
    text = re.sub(r'\^(\{[^}]+\}|\w)', lambda m: '⁺' if m.group(1) == '2' else f'^{m.group(1)}', text)
    text = text.replace(r'\times', '×')
    text = text.replace(r'\div', '÷')
    text = text.replace(r'\pi', 'π')
    text = text.replace(r'\sqrt', '√')
    text = text.replace(r'\infty', '∞')
    text = re.sub(r'[{}]', '', text)
    return text


def _escape_xml(text: str) -> str:
    """Escape special XML characters."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;"))
