"""
Scene Transitions — FFmpeg-based crossfade between video frame segments.
Adds professional fade/slide transitions between scenes.
"""
import asyncio
import logging
import os
import shutil
from typing import List, Optional

logger = logging.getLogger(__name__)

_FFMPEG = shutil.which("ffmpeg") or (
    r"C:\Users\pradip.pawar\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
)

# Transition types supported by FFmpeg xfade filter
TRANSITION_TYPES = {
    "fade": "fade",
    "dissolve": "dissolve",
    "wipeleft": "wipeleft",
    "wiperight": "wiperight",
    "slidedown": "slidedown",
    "slideup": "slideup",
    "smoothleft": "smoothleft",
    "smoothright": "smoothright",
    "circlecrop": "circlecrop",
    "rectcrop": "rectcrop",
    "distance": "distance",
    "pixelize": "pixelize",
}

# Default transition duration in seconds
DEFAULT_TRANSITION_DURATION = 0.4


async def apply_transitions(
    frame_mp4s: List[str],
    output_path: str,
    transition: str = "fade",
    duration: float = DEFAULT_TRANSITION_DURATION,
) -> str:
    """
    Concatenate frame MP4s with crossfade transitions between them.
    
    Args:
        frame_mp4s: Ordered list of per-scene MP4 files
        output_path: Where to write the final transitioned video
        transition: Transition type (from TRANSITION_TYPES)
        duration: Transition duration in seconds (0.3-1.0 recommended)
        
    Returns:
        Path to output video, or falls back to simple concat on failure
    """
    if not frame_mp4s:
        raise ValueError("No frame MP4s to transition")

    if len(frame_mp4s) == 1:
        # Single frame — just copy
        shutil.copy2(frame_mp4s[0], output_path)
        return output_path

    # Validate transition type
    xfade_type = TRANSITION_TYPES.get(transition, "fade")
    duration = max(0.2, min(1.5, duration))

    # For 2 clips, use simple xfade
    if len(frame_mp4s) == 2:
        return await _xfade_two(frame_mp4s[0], frame_mp4s[1], output_path,
                                xfade_type, duration)

    # For 3+ clips, chain xfade filters
    # FFmpeg complex filter for N inputs with transitions
    try:
        return await _xfade_chain(frame_mp4s, output_path, xfade_type, duration)
    except Exception as exc:
        logger.warning("Transition chain failed (%s), falling back to simple concat", exc)
        return await _simple_concat(frame_mp4s, output_path)


async def _xfade_two(
    clip_a: str, clip_b: str, output_path: str,
    transition: str, duration: float
) -> str:
    """Apply xfade between exactly 2 clips."""
    # Get duration of first clip to calculate offset
    dur_a = await _get_duration(clip_a)
    offset = max(0, dur_a - duration)

    cmd = [
        _FFMPEG, "-y",
        "-i", clip_a,
        "-i", clip_b,
        "-filter_complex",
        f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset={offset}[v]",
        "-map", "[v]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    await _run_ffmpeg(cmd)
    return output_path


async def _xfade_chain(
    clips: List[str], output_path: str,
    transition: str, duration: float
) -> str:
    """
    Chain xfade for N clips using sequential 2-at-a-time approach.
    More memory efficient than a massive complex filter for many scenes.
    """
    import tempfile

    temp_dir = tempfile.mkdtemp(prefix="transitions_")
    try:
        current = clips[0]
        for i in range(1, len(clips)):
            temp_out = os.path.join(temp_dir, f"stage_{i:03d}.mp4")
            if i == len(clips) - 1:
                temp_out = output_path  # Final output

            try:
                await _xfade_two(current, clips[i], temp_out, transition, duration)
                current = temp_out
            except Exception as exc:
                logger.warning("xfade failed at clip %d: %s — simple concat from here", i, exc)
                # Concat remaining clips without transitions
                remaining = [current] + clips[i:]
                await _simple_concat(remaining, output_path)
                return output_path

        return output_path
    finally:
        # Cleanup temp files (but not output_path)
        try:
            for f in os.listdir(temp_dir):
                fp = os.path.join(temp_dir, f)
                if fp != output_path and os.path.exists(fp):
                    os.remove(fp)
            os.rmdir(temp_dir)
        except OSError:
            pass


async def _simple_concat(clips: List[str], output_path: str) -> str:
    """Fallback: simple concat without transitions."""
    import tempfile
    list_file = tempfile.mktemp(suffix=".txt")
    try:
        with open(list_file, "w") as f:
            for clip in clips:
                f.write(f"file '{clip}'\n")
        cmd = [
            _FFMPEG, "-y", "-f", "concat", "-safe", "0",
            "-i", list_file,
            "-c", "copy", output_path,
        ]
        await _run_ffmpeg(cmd)
    finally:
        if os.path.exists(list_file):
            os.remove(list_file)
    return output_path


async def _get_duration(path: str) -> float:
    """Get video duration via ffprobe."""
    try:
        ffprobe = _FFMPEG.replace("ffmpeg", "ffprobe") if _FFMPEG else "ffprobe"
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
    return 10.0  # Default assumption


async def _run_ffmpeg(cmd: list) -> None:
    """Run an FFmpeg command, raise on failure."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        err_msg = stderr.decode(errors="replace")[-500:]
        raise RuntimeError(f"FFmpeg failed (code {proc.returncode}): {err_msg}")
