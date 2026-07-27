"""
Thumbnail Generator — Auto-generates video thumbnail from scene content.
Creates a visually appealing thumbnail combining the topic title, key visual, and branding.
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Thumbnail dimensions
THUMB_WIDTH = 1280
THUMB_HEIGHT = 720


class ThumbnailGenerator:
    """
    Generates video thumbnails from the first scene or topic metadata.
    Uses Pillow for image composition.
    """

    @staticmethod
    def generate(
        title: str,
        subject: str = "",
        output_path: Optional[str] = None,
        accent_color: str = "#2980b9",
        style: str = "gradient",
    ) -> str:
        """
        Generate a thumbnail image for the video.
        
        Args:
            title: Video title text
            subject: Subject area for icon/color theming
            output_path: Where to save the PNG
            accent_color: Primary color for the thumbnail
            style: Thumbnail style (gradient | minimal | bold)
            
        Returns:
            Path to generated thumbnail PNG
        """
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            logger.warning("Pillow not installed — skipping thumbnail generation")
            return ""

        if not output_path:
            import tempfile
            fd, output_path = tempfile.mkstemp(suffix=".png")
            os.close(fd)

        try:
            img = _create_thumbnail(title, subject, accent_color, style)
            os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None
            img.save(output_path, "PNG", quality=90)
            logger.info("Thumbnail generated: %s", output_path)
            return output_path
        except Exception as e:
            logger.error("Thumbnail generation failed: %s", e)
            return ""


def _create_thumbnail(title: str, subject: str, accent: str, style: str):
    """Create the actual thumbnail image using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    # Parse accent color
    bg_color = _hex_to_rgb(accent)
    dark_bg = tuple(max(0, c - 40) for c in bg_color)

    img = Image.new("RGB", (THUMB_WIDTH, THUMB_HEIGHT))
    draw = ImageDraw.Draw(img)

    # Background gradient (top-left to bottom-right)
    for y in range(THUMB_HEIGHT):
        ratio = y / THUMB_HEIGHT
        r = int(dark_bg[0] + (bg_color[0] - dark_bg[0]) * ratio)
        g = int(dark_bg[1] + (bg_color[1] - dark_bg[1]) * ratio)
        b = int(dark_bg[2] + (bg_color[2] - dark_bg[2]) * ratio)
        draw.line([(0, y), (THUMB_WIDTH, y)], fill=(r, g, b))

    # Semi-transparent overlay for text readability
    overlay = Image.new("RGBA", (THUMB_WIDTH, THUMB_HEIGHT), (0, 0, 0, 100))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Try to load a nice font, fall back to default
    font_large = _get_font(48)
    font_small = _get_font(24)

    # Title text (centered, word-wrapped)
    wrapped_title = _wrap_text(title, max_chars=30)
    y_pos = THUMB_HEIGHT // 2 - (len(wrapped_title) * 55) // 2

    for line in wrapped_title:
        bbox = draw.textbbox((0, 0), line, font=font_large)
        text_width = bbox[2] - bbox[0]
        x = (THUMB_WIDTH - text_width) // 2
        # Shadow
        draw.text((x + 2, y_pos + 2), line, fill=(0, 0, 0), font=font_large)
        # Main text
        draw.text((x, y_pos), line, fill=(255, 255, 255), font=font_large)
        y_pos += 55

    # Subject badge (bottom-left)
    if subject:
        badge_text = f"📚 {subject}"
        draw.rounded_rectangle(
            [(30, THUMB_HEIGHT - 60), (30 + len(badge_text) * 14, THUMB_HEIGHT - 25)],
            radius=8, fill=(255, 255, 255, 200),
        )
        draw.text((40, THUMB_HEIGHT - 55), badge_text, fill=(50, 50, 50), font=font_small)

    # Branding (bottom-right)
    brand = "Eduvy-AI"
    draw.text((THUMB_WIDTH - 150, THUMB_HEIGHT - 50), brand, fill=(255, 255, 255, 180), font=font_small)

    return img


def _get_font(size: int):
    """Try to load Sora or a system font, fall back to default."""
    from PIL import ImageFont

    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color string to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (41, 128, 185)  # Default blue
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _wrap_text(text: str, max_chars: int = 30) -> list:
    """Wrap text into lines of max_chars width."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 <= max_chars:
            current = f"{current} {word}".strip()
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text[:max_chars]]
