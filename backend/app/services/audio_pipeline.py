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
# Using more reliable US/UK voices as primary, Indian as fallback
_EDGE_VOICE_MAP = {
    # English variants - all map to US English for consistency
    "en":       "en-US-AriaNeural",
    "en-us":    "en-US-AriaNeural",
    "en-in":    "en-US-AriaNeural",
    "english":  "en-US-AriaNeural",
    "English":  "en-US-AriaNeural",
    # Hindi
    "hi":       "hi-IN-SwaraNeural",
    "hi-in":    "hi-IN-SwaraNeural",
    "hindi":    "hi-IN-SwaraNeural",
    "Hindi":    "hi-IN-SwaraNeural",
    # Gujarati
    "gu":       "gu-IN-DhwaniNeural",
    "gu-in":    "gu-IN-DhwaniNeural",
    "gujarati": "gu-IN-DhwaniNeural",
    "Gujarati": "gu-IN-DhwaniNeural",
    # Marathi - Using ManoharNeural (male) for better pronunciation
    "mr":       "mr-IN-ManoharNeural",
    "mr-in":    "mr-IN-ManoharNeural",
    "marathi":  "mr-IN-ManoharNeural",
    "Marathi":  "mr-IN-ManoharNeural",
    # Tamil
    "ta":       "ta-IN-PallaviNeural",
    "ta-in":    "ta-IN-PallaviNeural",
    "tamil":    "ta-IN-PallaviNeural",
    "Tamil":    "ta-IN-PallaviNeural",
    # Telugu
    "te":       "te-IN-ShrutiNeural",
    "te-in":    "te-IN-ShrutiNeural",
    "telugu":   "te-IN-ShrutiNeural",
    "Telugu":   "te-IN-ShrutiNeural",
    # Kannada
    "kn":       "kn-IN-SapnaNeural",
    "kn-in":    "kn-IN-SapnaNeural",
    "kannada":  "kn-IN-SapnaNeural",
    "Kannada":  "kn-IN-SapnaNeural",
    # Bengali
    "bn":       "bn-IN-TanishaaNeural",
    "bn-in":    "bn-IN-TanishaaNeural",
    "bengali":  "bn-IN-TanishaaNeural",
    "Bengali":  "bn-IN-TanishaaNeural",
    # Urdu
    "ur":       "ur-PK-UzmaNeural",
    "ur-pk":    "ur-PK-UzmaNeural",
    "urdu":     "ur-PK-UzmaNeural",
    "Urdu":     "ur-PK-UzmaNeural",
}

# ── gTTS fallback language codes ───────────────────────────────────────────────
LANG_CODE_MAP = {
    # English
    "en":       "en",
    "en-us":    "en",
    "en-in":    "en",
    "english":  "en",
    "English":  "en",
    # Hindi
    "hi":       "hi",
    "hi-in":    "hi",
    "hindi":    "hi",
    "Hindi":    "hi",
    # Gujarati
    "gu":       "gu",
    "gu-in":    "gu",
    "gujarati": "gu",
    "Gujarati": "gu",
    # Marathi
    "mr":       "mr",
    "mr-in":    "mr",
    "marathi":  "mr",
    "Marathi":  "mr",
    # Tamil
    "ta":       "ta",
    "ta-in":    "ta",
    "tamil":    "ta",
    "Tamil":    "ta",
    # Telugu
    "te":       "te",
    "te-in":    "te",
    "telugu":   "te",
    "Telugu":   "te",
    # Kannada
    "kn":       "kn",
    "kn-in":    "kn",
    "kannada":  "kn",
    "Kannada":  "kn",
    # Bengali
    "bn":       "bn",
    "bn-in":    "bn",
    "bengali":  "bn",
    "Bengali":  "bn",
    # Punjabi
    "pa":       "pa",
    "pa-in":    "pa",
    "punjabi":  "pa",
    "Punjabi":  "pa",
    # Urdu
    "ur":       "ur",
    "ur-pk":    "ur",
    "urdu":     "ur",
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


def _preprocess_text_for_tts(text: str, lang: str) -> str:
    """
    Preprocess text for better TTS pronunciation.
    
    - Normalizes whitespace
    - Handles mixed scripts (Devanagari + English)
    - Adds pauses between sentences
    """
    import re
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove markdown formatting that TTS can't handle
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold** -> bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # *italic* -> italic
    text = re.sub(r'`([^`]+)`', r'\1', text)        # `code` -> code
    text = re.sub(r'#+ ', '', text)                  # Remove heading markers
    
    # For Indian languages, add slight pause after English words
    # This helps TTS switch context better
    lang_lower = lang.lower() if lang else ""
    if lang_lower in ["marathi", "hindi", "gujarati", "tamil", "telugu", "kannada", "mr", "hi", "gu", "ta", "te", "kn"]:
        # Add comma pause after common English words in Devanagari text
        # This helps the TTS not stumble on script switches
        text = re.sub(r'([A-Za-z]{3,})\s+', r'\1, ', text)
    
    # Replace multiple punctuation with single
    text = re.sub(r'([.!?])\s*\1+', r'\1', text)
    
    # Ensure sentence-ending punctuation has space
    text = re.sub(r'([.!?])([A-Za-z\u0900-\u097F])', r'\1 \2', text)
    
    return text


async def _generate_tts_edge_cli(text: str, lang: str, output_path: str) -> bool:
    """
    Try edge-tts via CLI subprocess (more reliable on cloud servers).
    Returns True if successful, False otherwise.
    """
    import shutil
    
    edge_tts_bin = shutil.which("edge-tts")
    if not edge_tts_bin:
        return False
    
    # Normalize language and get voice
    lang_normalized = lang.strip().lower() if lang else "english"
    voice = _EDGE_VOICE_MAP.get(lang) or _EDGE_VOICE_MAP.get(lang_normalized) or "en-US-AriaNeural"
    
    # Write text to temp file (handles special characters better)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(text)
        text_file = f.name
    
    try:
        cmd = [
            edge_tts_bin,
            "--voice", voice,
            "--file", text_file,
            "--write-media", output_path,
        ]
        result = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, timeout=30
        )
        
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 500:
            logger.info(f"TTS SUCCESS [edge-tts CLI]: voice={voice}, size={os.path.getsize(output_path)}")
            return True
        
        stderr = result.stderr.decode() if result.stderr else ""
        logger.debug(f"edge-tts CLI failed: {stderr[:200]}")
        return False
    except subprocess.TimeoutExpired:
        logger.debug("edge-tts CLI timeout")
        return False
    except Exception as exc:
        logger.debug(f"edge-tts CLI error: {exc}")
        return False
    finally:
        if os.path.exists(text_file):
            os.remove(text_file)


async def _generate_tts_edge(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using Microsoft Neural Voice via edge-tts."""
    _patch_edge_tts_ssl()
    import edge_tts
    
    # Preprocess text for better pronunciation
    text = _preprocess_text_for_tts(text, lang)
    
    # Normalize language input
    lang_normalized = lang.strip().lower() if lang else "english"
    
    # Try exact match first, then lowercase, then default to US English
    voice = _EDGE_VOICE_MAP.get(lang) or _EDGE_VOICE_MAP.get(lang_normalized) or "en-US-AriaNeural"
    
    logger.info(f"TTS: lang='{lang}' -> voice='{voice}', text_preview='{text[:100]}...'")
    
    tts = edge_tts.Communicate(text, voice)
    await tts.save(output_path)
    return output_path


async def _generate_tts_gtts(text: str, lang: str, output_path: str) -> str:
    """Generate TTS using gTTS (Google, robotic fallback)."""
    from gtts import gTTS
    
    # Preprocess text
    text = _preprocess_text_for_tts(text, lang)
    
    # Normalize language input
    lang_normalized = lang.strip().lower() if lang else "english"
    lang_code = LANG_CODE_MAP.get(lang) or LANG_CODE_MAP.get(lang_normalized) or "en"
    
    logger.debug(f"gTTS fallback: lang='{lang}' -> code='{lang_code}'")

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
    
    # Log incoming language for debugging
    logger.info(f"generate_tts: lang='{lang}', text_len={len(text)}, text_preview='{text[:80]}...'")

    # Primary: edge-tts (Microsoft Neural TTS)
    try:
        await _generate_tts_edge(text, lang, output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 200:
            size = os.path.getsize(output_path)
            logger.info(f"TTS SUCCESS [edge-tts]: lang={lang}, size={size} bytes")
            return output_path
        else:
            logger.warning(f"TTS edge-tts produced empty/small file, falling back to gTTS")
    except Exception as exc:
        logger.warning(f"TTS edge-tts FAILED (lang={lang}): {exc} — falling back to gTTS")

    # Fallback: gTTS
    logger.info(f"TTS using gTTS fallback for lang={lang}")
    await _generate_tts_gtts(text, lang, output_path)
    size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    logger.info(f"TTS SUCCESS [gTTS]: lang={lang}, size={size} bytes")
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


def _estimate_word_timing_from_sentences(full_text: str, sentence_boundaries: list[dict]) -> list[dict]:
    """
    Estimate word-level timing from sentence boundaries.
    
    edge-tts 7.x only provides SentenceBoundary events, not WordBoundary.
    We estimate word timing by distributing the sentence duration proportionally.
    
    Args:
        full_text: The full text that was synthesized
        sentence_boundaries: List of {"text", "start_ms", "duration_ms"}
    
    Returns:
        List of {"word": str, "start_ms": int, "end_ms": int}
    """
    import re
    
    word_timings = []
    
    # Split full text into words (preserving order)
    all_words = re.findall(r'\S+', full_text)
    word_idx = 0
    
    for sent in sentence_boundaries:
        sent_text = sent.get("text", "")
        start_ms = sent.get("start_ms", 0)
        duration_ms = sent.get("duration_ms", 0)
        
        # Split sentence into words
        sent_words = re.findall(r'\S+', sent_text)
        if not sent_words:
            continue
        
        # Calculate total character length (for proportional timing)
        total_chars = sum(len(w) for w in sent_words)
        if total_chars == 0:
            continue
        
        # Distribute timing proportionally by word length
        current_ms = start_ms
        for word in sent_words:
            word_duration = int((len(word) / total_chars) * duration_ms)
            word_timings.append({
                "word": word,
                "start_ms": current_ms,
                "end_ms": current_ms + word_duration,
            })
            current_ms += word_duration
            word_idx += 1
    
    return word_timings


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
    import time
    os.makedirs(output_dir, exist_ok=True)
    
    audio_path = os.path.join(output_dir, f"{beat_id}.mp3")
    srt_path = os.path.join(output_dir, f"{beat_id}.vtt")
    
    _patch_edge_tts_ssl()
    
    # Retry logic for edge-tts (sometimes fails with "No audio received")
    max_retries = 3
    last_error = None
    
    for attempt in range(max_retries):
        try:
            import edge_tts
            voice = _EDGE_VOICE_MAP.get(lang, "en-IN-NeerjaNeural")
            if attempt == 0:
                logger.info(f"Using voice: {voice} for language: {lang}")
            
            tts = edge_tts.Communicate(text, voice)
            
            # Collect boundaries from stream
            # edge-tts 7.x provides SentenceBoundary (not WordBoundary)
            sentence_boundaries = []
            word_boundaries = []
            
            with open(audio_path, "wb") as audio_file:
                async for chunk in tts.stream():
                    if chunk["type"] == "audio":
                        audio_file.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        # If WordBoundary is available (older versions)
                        word_boundaries.append({
                            "word": chunk.get("text", ""),
                            "start_ms": int(chunk.get("offset", 0) / 10000),
                            "end_ms": int((chunk.get("offset", 0) + chunk.get("duration", 0)) / 10000),
                        })
                    elif chunk["type"] == "SentenceBoundary":
                        # edge-tts 7.x provides sentence-level timing
                        sentence_boundaries.append({
                            "text": chunk.get("text", ""),
                            "start_ms": int(chunk.get("offset", 0) / 10000),
                            "duration_ms": int(chunk.get("duration", 0) / 10000),
                        })
            
            # Use word boundaries if available, otherwise estimate from sentences
            if word_boundaries:
                word_timings = [w for w in word_boundaries if w["word"].strip()]
            else:
                # Estimate word timing from sentence boundaries
                word_timings = _estimate_word_timing_from_sentences(text, sentence_boundaries)
            
            logger.info(f"Captured {len(word_timings)} word timings (sentences: {len(sentence_boundaries)})")
            
            # Get audio duration
            duration_ms = 0
            if word_timings:
                duration_ms = word_timings[-1]["end_ms"]
            elif sentence_boundaries:
                last = sentence_boundaries[-1]
                duration_ms = last["start_ms"] + last["duration_ms"]
            else:
                # Fallback: estimate from file size (rough ~16kbps for mp3)
                file_size = os.path.getsize(audio_path)
                duration_ms = int((file_size / 2000) * 1000)
            
            logger.info(f"Generated teacher audio: {audio_path} ({duration_ms}ms, {len(word_timings)} words)")
            
            return {
                "audio_path": audio_path,
                "srt_path": srt_path,
                "duration_ms": duration_ms,
                "word_timings": word_timings,
            }
        
        except Exception as exc:
            last_error = exc
            if attempt < max_retries - 1:
                logger.debug(f"edge-tts attempt {attempt + 1} failed: {exc}, retrying...")
                await asyncio.sleep(0.2)  # Quick retry
                continue
            # All retries exhausted
            logger.warning(f"edge-tts failed after {max_retries} attempts: {exc} — falling back to basic TTS")
    
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
