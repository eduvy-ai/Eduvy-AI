"""
Audio Pipeline — TTS generation and audio mixing for video narration.

Primary TTS: edge-tts (Microsoft Neural Voices — natural, warm quality)
Fallback TTS: gTTS (Google TTS — always available)
"""
import asyncio
import logging
import os
import shutil
import ssl
import subprocess
import tempfile

logger = logging.getLogger(__name__)

# Resolve ffmpeg binary — cross-platform (Linux/Render + Windows dev)
_FFMPEG = (
    shutil.which("ffmpeg")
    or shutil.which("ffmpeg.exe")
    or (
        r"C:\Users\pradip.pawar\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
    )
)

# ── Microsoft Neural Voice map (edge-tts) ─────────────────────────────────────
# Indian-accent voices for best quality with Indian languages
_EDGE_VOICE_MAP = {
    "en":       "en-IN-NeerjaNeural",
    "English":  "en-IN-NeerjaNeural",
    "hi":       "hi-IN-SwaraNeural",
    "Hindi":    "hi-IN-SwaraNeural",
    "gu":       "gu-IN-DhwaniNeural",
    "Gujarati": "gu-IN-DhwaniNeural",
    "mr":       "mr-IN-AarohiNeural",
    "Marathi":  "mr-IN-AarohiNeural",
    "ta":       "ta-IN-PallaviNeural",
    "Tamil":    "ta-IN-PallaviNeural",
    "te":       "te-IN-ShrutiNeural",
    "Telugu":   "te-IN-ShrutiNeural",
    "kn":       "kn-IN-SapnaNeural",
    "Kannada":  "kn-IN-SapnaNeural",
    "bn":       "bn-IN-TanishaaNeural",
    "Bengali":  "bn-IN-TanishaaNeural",
    "ur":       "ur-PK-UzmaNeural",
    "Urdu":     "ur-PK-UzmaNeural",
}

# ── gTTS fallback language codes ───────────────────────────────────────────────
LANG_CODE_MAP = {
    "en":       "en",
    "English":  "en",
    "hi":       "hi",
    "Hindi":    "hi",
    "gu":       "gu",
    "Gujarati": "gu",
    "mr":       "mr",
    "Marathi":  "mr",
    "ta":       "ta",
    "Tamil":    "ta",
    "te":       "te",
    "Telugu":   "te",
    "kn":       "kn",
    "Kannada":  "kn",
    "bn":       "bn",
    "Bengali":  "bn",
    "pa":       "pa",
    "Punjabi":  "pa",
    "ur":       "ur",
    "Urdu":     "ur",
}


def _patch_edge_tts_ssl() -> None:
    """
    Monkey-patch edge-tts SSL context to bypass corporate proxy certificate issues.
    Safe to call multiple times — idempotent.
    """
    try:
        import edge_tts.communicate as _c
        if getattr(_c._SSL_CTX, "_patched_no_verify", False):
            return  # Already patched
        no_verify_ctx = ssl.create_default_context()
        no_verify_ctx.check_hostname = False
        no_verify_ctx.verify_mode = ssl.CERT_NONE
        no_verify_ctx._patched_no_verify = True  # type: ignore[attr-defined]
        _c._SSL_CTX = no_verify_ctx
    except Exception as exc:
        logger.debug("edge-tts SSL patch skipped: %s", exc)


async def _generate_tts_edge(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using Microsoft Neural Voice via edge-tts."""
    _patch_edge_tts_ssl()
    import edge_tts
    voice = _EDGE_VOICE_MAP.get(lang, "en-IN-NeerjaNeural")
    tts = edge_tts.Communicate(text, voice)
    await tts.save(output_path)
    return output_path


async def _generate_tts_gtts(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using gTTS (Google, robotic fallback)."""
    from gtts import gTTS
    lang_code = LANG_CODE_MAP.get(lang, "en")

    def _synth() -> None:
        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(output_path)

    await asyncio.to_thread(_synth)
    return output_path


async def generate_tts(text: str, lang: str, output_path: str) -> str:
    """
    Generate TTS MP3. Tries edge-tts (neural, natural voice) first;
    falls back to gTTS if edge-tts fails.
    Returns output_path on success.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Primary: edge-tts (Microsoft Neural TTS)
    try:
        await _generate_tts_edge(text, lang, output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 200:
            logger.debug("edge-tts OK (%s, %d bytes)", lang, os.path.getsize(output_path))
            return output_path
    except Exception as exc:
        logger.warning("edge-tts failed (lang=%s): %s — falling back to gTTS", lang, exc)

    # Fallback: gTTS
    await _generate_tts_gtts(text, lang, output_path)
    return output_path


async def concat_audio_files(audio_paths: list[str], output_path: str) -> str:
    """
    Concatenate multiple MP3/audio files in order using ffmpeg.
    Returns the output_path on success.
    """
    if not audio_paths:
        raise ValueError("No audio paths provided")

    if len(audio_paths) == 1:
        import shutil
        shutil.copy2(audio_paths[0], output_path)
        return output_path

    # Write ffmpeg concat list
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for path in audio_paths:
            f.write(f"file '{path}'\n")
        list_file = f.name

    try:
        cmd = [
            _FFMPEG, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            output_path,
        ]
        result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg concat failed: {result.stderr.decode()}")
    finally:
        os.remove(list_file)

    return output_path


async def pad_audio_to_duration(audio_path: str, target_sec: float, output_path: str) -> str:
    """
    Pad or trim an audio file to exactly target_sec seconds.
    """
    cmd = [
        _FFMPEG, "-y",
        "-i", audio_path,
        "-af", f"apad=whole_dur={target_sec}",
        "-t", str(target_sec),
        output_path,
    ]
    result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg pad failed: {result.stderr.decode()}")
    return output_path


# ── Teacher Mode: TTS with Word-Level Timing ─────────────────────────────────


def _parse_srt_to_word_timings(srt_path: str) -> list[dict]:
    """
    Parse SRT subtitle file to extract word-level timings.
    
    edge-tts generates SRT with roughly one word per cue.
    Returns: [{"word": "Hello", "start_ms": 0, "end_ms": 500}, ...]
    """
    import re
    
    if not os.path.exists(srt_path):
        return []
    
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # SRT format: index, timestamp line, text, blank line
    # Timestamp: 00:00:00,000 --> 00:00:00,500
    pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.+?)(?=\n\n|\n*$)"
    matches = re.findall(pattern, content, re.DOTALL)
    
    timings = []
    for idx, start_str, end_str, text in matches:
        # Parse timestamp to milliseconds
        def ts_to_ms(ts: str) -> int:
            h, m, rest = ts.split(":")
            s, ms = rest.split(",")
            return int(h) * 3600000 + int(m) * 60000 + int(s) * 1000 + int(ms)
        
        start_ms = ts_to_ms(start_str)
        end_ms = ts_to_ms(end_str)
        word = text.strip()
        
        if word:
            timings.append({
                "word": word,
                "start_ms": start_ms,
                "end_ms": end_ms,
            })
    
    return timings


async def generate_tts_with_timing(
    text: str, 
    lang: str, 
    output_dir: str,
    beat_id: str = "beat"
) -> dict:
    """
    Generate TTS audio with word-level timing for Teacher Mode.
    
    Uses edge-tts which generates SRT subtitles alongside audio.
    
    Args:
        text: The text to synthesize
        lang: Language code (English, Hindi, etc.)
        output_dir: Directory to store output files
        beat_id: Identifier for this beat (used in filenames)
    
    Returns:
        {
            "audio_path": "/path/to/audio.mp3",
            "duration_ms": 5000,
            "word_timings": [{"word": "Hello", "start_ms": 0, "end_ms": 500}, ...]
        }
    """
    os.makedirs(output_dir, exist_ok=True)
    
    audio_path = os.path.join(output_dir, f"{beat_id}.mp3")
    srt_path = os.path.join(output_dir, f"{beat_id}.vtt")
    
    _patch_edge_tts_ssl()
    
    try:
        import edge_tts
        voice = _EDGE_VOICE_MAP.get(lang, "en-IN-NeerjaNeural")
        logger.info(f"Using voice: {voice} for language: {lang}")
        
        tts = edge_tts.Communicate(text, voice)
        
        # Collect word boundaries directly from stream
        word_boundaries = []
        
        with open(audio_path, "wb") as audio_file:
            async for chunk in tts.stream():
                if chunk["type"] == "audio":
                    audio_file.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    # Extract word timing from WordBoundary event
                    word_boundaries.append({
                        "word": chunk.get("text", ""),
                        "start_ms": int(chunk.get("offset", 0) / 10000),  # Convert 100-nanosecond units to ms
                        "end_ms": int((chunk.get("offset", 0) + chunk.get("duration", 0)) / 10000),
                    })
        
        # Filter out empty words
        word_timings = [w for w in word_boundaries if w["word"].strip()]
        
        logger.info(f"Captured {len(word_timings)} word boundaries")
        
        # Get audio duration
        duration_ms = 0
        if word_timings:
            duration_ms = word_timings[-1]["end_ms"]
        else:
            # Fallback: estimate from file size (rough ~16kbps for mp3)
            file_size = os.path.getsize(audio_path)
            duration_ms = int((file_size / 2000) * 1000)  # rough estimate
        
        logger.info(f"Generated teacher audio: {audio_path} ({duration_ms}ms, {len(word_timings)} words)")
        
        return {
            "audio_path": audio_path,
            "srt_path": srt_path,
            "duration_ms": duration_ms,
            "word_timings": word_timings,
        }
        
    except Exception as exc:
        logger.warning(f"edge-tts with subtitles failed: {exc} — falling back to basic TTS")
        
        # Fallback: generate audio without word timings
        await _generate_tts_gtts(text, lang, audio_path)
        
        # Estimate duration from text length (~150 words/min)
        word_count = len(text.split())
        duration_ms = int((word_count / 150) * 60 * 1000)
        
        return {
            "audio_path": audio_path,
            "srt_path": None,
            "duration_ms": duration_ms,
            "word_timings": [],  # No word-level timing with fallback
        }


def split_into_beats(text: str, max_sentences: int = 2) -> list[str]:
    """
    Split text into logical beats for Teacher Mode narration.
    Each beat is 1-2 sentences for natural pacing.
    
    Args:
        text: Full text to split
        max_sentences: Maximum sentences per beat (default 2)
    
    Returns:
        List of beat texts
    """
    import re
    
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return [text] if text.strip() else []
    
    beats = []
    current_beat = []
    
    for sentence in sentences:
        current_beat.append(sentence)
        if len(current_beat) >= max_sentences:
            beats.append(" ".join(current_beat))
            current_beat = []
    
    # Don't forget remaining sentences
    if current_beat:
        beats.append(" ".join(current_beat))
    
    return beats
