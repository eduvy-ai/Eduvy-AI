"""
KaTeX & Mermaid Integration — Real SVG rendering for math and diagrams.
Uses subprocess calls to KaTeX CLI and Mermaid CLI for production-quality output.
Falls back to simplified text rendering when binaries are unavailable.
"""
import asyncio
import logging
import os
import shutil
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

# Detect available binaries
_KATEX_CLI = shutil.which("katex")
_MMDC_CLI = shutil.which("mmdc")  # Mermaid CLI (npm install -g @mermaid-js/mermaid-cli)
_NPXL = shutil.which("npx")


async def render_katex_to_svg(latex: str, display_mode: bool = True) -> Optional[str]:
    """
    Render a LaTeX equation to SVG using KaTeX CLI.
    
    Args:
        latex: LaTeX math string (e.g. "E = mc^2")
        display_mode: True for display math (block), False for inline
        
    Returns:
        SVG string, or None if KaTeX is unavailable
    """
    # Try KaTeX CLI directly
    if _KATEX_CLI:
        return await _katex_cli(latex, display_mode)

    # Try via npx
    if _NPXL:
        return await _katex_npx(latex, display_mode)

    # Fallback: Python katex package
    try:
        return _katex_python(latex, display_mode)
    except Exception:
        pass

    logger.warning("KaTeX not available (install: npm install -g katex)")
    return None


async def render_mermaid_to_svg(diagram_code: str) -> Optional[str]:
    """
    Render a Mermaid diagram definition to SVG using mmdc CLI.
    
    Args:
        diagram_code: Mermaid diagram source (e.g. "graph TD; A-->B;")
        
    Returns:
        SVG string, or None if Mermaid CLI is unavailable
    """
    if not _MMDC_CLI and not _NPXL:
        logger.warning("Mermaid CLI not available (install: npm install -g @mermaid-js/mermaid-cli)")
        return None

    try:
        return await _mermaid_cli(diagram_code)
    except Exception as exc:
        logger.warning("Mermaid rendering failed: %s", exc)
        return None


async def _katex_cli(latex: str, display_mode: bool) -> Optional[str]:
    """Render via `katex` CLI binary."""
    cmd = [_KATEX_CLI, "--format", "mathml"]
    if display_mode:
        cmd.append("--display-mode")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate(input=latex.encode("utf-8"))
    if proc.returncode == 0 and stdout:
        # KaTeX CLI outputs HTML/MathML — wrap in SVG foreignObject
        html = stdout.decode("utf-8").strip()
        return _wrap_html_in_svg(html)
    logger.warning("KaTeX CLI error: %s", stderr.decode(errors="replace")[:200])
    return None


async def _katex_npx(latex: str, display_mode: bool) -> Optional[str]:
    """Render via npx katex."""
    cmd = [_NPXL, "katex", "--format", "mathml"]
    if display_mode:
        cmd.append("--display-mode")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate(input=latex.encode("utf-8"))
    if proc.returncode == 0 and stdout:
        html = stdout.decode("utf-8").strip()
        return _wrap_html_in_svg(html)
    return None


def _katex_python(latex: str, display_mode: bool) -> Optional[str]:
    """Render using Python katex package (pip install katex)."""
    try:
        import katex as katex_pkg
        html = katex_pkg.render(latex, {"displayMode": display_mode, "output": "html"})
        return _wrap_html_in_svg(html)
    except ImportError:
        return None


async def _mermaid_cli(diagram_code: str) -> Optional[str]:
    """Render Mermaid diagram via mmdc CLI."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".mmd", delete=False, encoding="utf-8") as f:
        f.write(diagram_code)
        input_path = f.name

    output_path = input_path.replace(".mmd", ".svg")
    try:
        cli = _MMDC_CLI or _NPXL
        cmd = ([cli, "mmdc"] if cli == _NPXL else [cli])
        cmd += ["-i", input_path, "-o", output_path, "-t", "dark", "--quiet"]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode == 0 and os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                svg = f.read()
            return svg
        logger.warning("Mermaid CLI failed: %s", stderr.decode(errors="replace")[:200])
        return None
    finally:
        for p in (input_path, output_path):
            if os.path.exists(p):
                os.remove(p)


def _wrap_html_in_svg(html: str, width: int = 600, height: int = 200) -> str:
    """Wrap HTML (from KaTeX) in an SVG foreignObject for embedding."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
  <foreignObject x="0" y="0" width="{width}" height="{height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:24px; color:#2c3e50; display:flex; align-items:center; justify-content:center; height:100%;">
      {html}
    </div>
  </foreignObject>
</svg>'''


def is_katex_available() -> bool:
    """Check if KaTeX rendering is available."""
    if _KATEX_CLI or _NPXL:
        return True
    try:
        import katex  # noqa: F401
        return True
    except ImportError:
        return False


def is_mermaid_available() -> bool:
    """Check if Mermaid CLI is available."""
    return bool(_MMDC_CLI or _NPXL)
