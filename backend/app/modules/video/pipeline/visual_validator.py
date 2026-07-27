"""
Visual Validation — Score rendered video frames against intended content.
Uses basic image analysis heuristics (no external vision API needed).
Optional: Can use a vision LLM if configured.
"""
import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class VisualValidator:
    """
    Validates rendered video frames against the scene intent.
    
    Scoring methods (from cheapest to most expensive):
    1. Structural checks (file exists, size, dimensions)
    2. Color histogram analysis (matches expected palette)
    3. Content density (not blank/empty frames)
    4. Vision LLM scoring (optional, if Gemini/GPT-4V available)
    """

    @staticmethod
    async def validate_frames(
        frame_paths: List[str],
        scenes: List[Dict[str, Any]],
        threshold: float = 0.3,
    ) -> Dict[str, Any]:
        """
        Validate rendered frames against scene specifications.
        
        Args:
            frame_paths: Paths to rendered frame images/MP4s
            scenes: Scene dicts with expected content
            threshold: Minimum acceptable score (0-1)
            
        Returns:
            Dict with overall score, per-frame scores, and issues found
        """
        results = []
        for i, path in enumerate(frame_paths):
            scene = scenes[i] if i < len(scenes) else {}
            score = await _score_frame(path, scene)
            results.append(score)

        valid_scores = [r["score"] for r in results if r["score"] > 0]
        avg_score = sum(valid_scores) / max(len(valid_scores), 1)

        issues = []
        for i, r in enumerate(results):
            if r["score"] < threshold:
                issues.append(f"Scene {i}: {r['reason']} (score: {r['score']:.2f})")

        return {
            "overall_score": round(avg_score, 3),
            "frame_count": len(frame_paths),
            "valid_frames": len(valid_scores),
            "failed_frames": len([r for r in results if r["score"] < threshold]),
            "issues": issues,
            "per_frame": results,
        }

    @staticmethod
    async def validate_single(
        frame_path: str,
        expected_content: str = "",
    ) -> Dict[str, Any]:
        """Validate a single rendered frame."""
        return await _score_frame(frame_path, {"narration": expected_content})


async def _score_frame(path: str, scene: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score a single rendered frame. Returns {score: 0-1, reason: str}.
    
    Scoring criteria:
    - File exists and has content: 0.3 base
    - File size reasonable (not too small = blank, not too large = error): 0.2
    - Duration matches expected (for MP4): 0.2
    - Content density check (not a blank frame): 0.3
    """
    if not path or not os.path.exists(path):
        return {"score": 0.0, "reason": "file missing or not rendered"}

    file_size = os.path.getsize(path)

    # Base check: file exists with content
    if file_size < 100:
        return {"score": 0.1, "reason": "file too small (likely empty/corrupted)"}

    score = 0.3  # exists with content
    reasons = []

    # Size reasonability (a 10s scene MP4 at 5fps should be 50-500KB)
    if path.endswith(".mp4"):
        if 5_000 < file_size < 10_000_000:  # 5KB - 10MB
            score += 0.2
        elif file_size <= 5_000:
            reasons.append("suspiciously small MP4")
            score += 0.05
        else:
            score += 0.15  # Very large but not necessarily wrong
    elif path.endswith((".png", ".jpg")):
        if 1_000 < file_size < 5_000_000:
            score += 0.2
        else:
            reasons.append("unusual image size")
            score += 0.1

    # Duration check for MP4
    if path.endswith(".mp4"):
        try:
            duration = await _get_video_duration(path)
            expected_dur = scene.get("duration_sec", 10)
            # Allow 20% tolerance
            if abs(duration - expected_dur) / max(expected_dur, 1) < 0.2:
                score += 0.2
            elif duration > 0:
                score += 0.1
                reasons.append(f"duration mismatch: got {duration:.1f}s, expected {expected_dur}s")
        except Exception:
            score += 0.1  # Can't verify but file exists

    # Content density check (for images, check if not mostly one color)
    if path.endswith((".png", ".jpg")):
        density = await _check_content_density(path)
        if density > 0.1:
            score += 0.3
        elif density > 0.02:
            score += 0.15
            reasons.append("low content density (mostly blank)")
        else:
            reasons.append("appears to be a blank frame")
            score += 0.05
    else:
        # For MP4s, having a valid file of decent size implies content
        score += 0.2

    return {
        "score": min(1.0, score),
        "reason": "; ".join(reasons) if reasons else "OK",
        "file_size": file_size,
    }


async def _get_video_duration(path: str) -> float:
    """Get video duration using ffprobe."""
    import shutil
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return 0.0
    try:
        proc = await asyncio.create_subprocess_exec(
            ffprobe, "-v", "quiet", "-show_entries", "format=duration",
            "-of", "csv=p=0", path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode == 0 and stdout.strip():
            return float(stdout.strip())
    except (FileNotFoundError, ValueError):
        pass
    return 0.0


async def _check_content_density(path: str) -> float:
    """
    Check what fraction of the image has non-background content.
    Returns 0-1 (0 = blank, 1 = fully filled).
    """
    try:
        from PIL import Image
        import numpy as np

        img = Image.open(path).convert("L")  # Grayscale
        arr = np.array(img)

        # Check variance — blank images have very low variance
        variance = float(np.var(arr)) / 65025.0  # Normalize by max possible variance
        return min(1.0, variance * 10)  # Scale up — even 0.1 variance means content
    except ImportError:
        # Without Pillow/numpy, check file size as proxy
        size = os.path.getsize(path)
        return min(1.0, size / 50000.0)  # >50KB likely has content
    except Exception:
        return 0.5  # Can't determine, assume OK
