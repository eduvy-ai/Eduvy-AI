"""
Pluggable Renderers — Abstract base + style presets for video rendering.
Maps pipeline style choices to the existing svg_renderer's STYLE_CONFIGS.
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Available renderer styles (maps to svg_renderer.py STYLE_CONFIGS keys)
RENDERER_STYLES = {
    "whiteboard": {
        "id": "sketch_classic",
        "label": "Whiteboard (Classic)",
        "description": "Hand-drawn on white paper with pencil strokes",
        "bg_color": "#faf9f6",
        "text_color": "#2c3e50",
        "accent_default": "#2980b9",
    },
    "blackboard": {
        "id": "blackboard",
        "label": "Blackboard (Chalk)",
        "description": "Chalk on green blackboard, old-school teacher style",
        "bg_color": "#2d4a3e",
        "text_color": "#e8e8d0",
        "accent_default": "#f4d03f",
    },
    "dark": {
        "id": "sketch_dark",
        "label": "Dark Mode Sketch",
        "description": "Neon-glow drawing on dark background",
        "bg_color": "#1a1a2e",
        "text_color": "#eeeeff",
        "accent_default": "#00e5a0",
    },
    "colorful": {
        "id": "canvas_colorful",
        "label": "Colorful Canvas",
        "description": "Vibrant colors, bold fills, playful aesthetic",
        "bg_color": "#ffffff",
        "text_color": "#333333",
        "accent_default": "#e74c3c",
    },
    "minimal": {
        "id": "canvas_minimal",
        "label": "Minimal Clean",
        "description": "Clean, minimalist vector style with subtle colors",
        "bg_color": "#ffffff",
        "text_color": "#444444",
        "accent_default": "#555555",
    },
}


def get_style_variant(style_name: str) -> str:
    """
    Map a user-friendly style name to the svg_renderer's style_variant key.
    
    Args:
        style_name: One of 'whiteboard', 'blackboard', 'dark', 'colorful', 'minimal'
        
    Returns:
        The svg_renderer STYLE_CONFIGS key (e.g. 'sketch_classic', 'blackboard')
    """
    style = RENDERER_STYLES.get(style_name)
    if style:
        return style["id"]
    # Try direct match (user might pass the svg_renderer key directly)
    valid_ids = {s["id"] for s in RENDERER_STYLES.values()}
    if style_name in valid_ids:
        return style_name
    # Default to whiteboard
    return "sketch_classic"


def get_available_styles() -> list:
    """Return list of available renderer styles for the admin UI."""
    return [
        {"key": key, **info}
        for key, info in RENDERER_STYLES.items()
    ]


def get_style_css_overrides(style_name: str) -> Dict[str, str]:
    """
    Get CSS variable overrides for a given style.
    Used when generating custom themes beyond the 5 built-in presets.
    """
    style = RENDERER_STYLES.get(style_name, RENDERER_STYLES["whiteboard"])
    return {
        "--bg-color": style["bg_color"],
        "--text-color": style["text_color"],
        "--accent": style["accent_default"],
    }
