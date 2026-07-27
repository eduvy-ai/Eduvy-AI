"""
Subtitle Generator — Creates SRT/VTT subtitle files from narration + timing.
"""
import logging
import os
from typing import List, Tuple

logger = logging.getLogger(__name__)


class SubtitleGenerator:
    """
    Generates subtitle files (SRT format) from scene narrations and audio durations.
    Supports word-level timing estimation for smooth reveal.
    """

    @staticmethod
    def generate_srt(
        scenes: List[dict],
        audio_durations: List[float],
        output_path: str,
    ) -> str:
        """
        Generate an SRT subtitle file from scenes and their audio durations.
        
        Args:
            scenes: List of scene dicts with 'narration' key
            audio_durations: Duration in seconds for each scene's audio
            output_path: Where to save the .srt file
            
        Returns:
            Path to generated SRT file
        """
        srt_lines = []
        subtitle_index = 1
        cumulative_time = 0.0

        for i, scene in enumerate(scenes):
            narration = scene.get("narration", "") if isinstance(scene, dict) else ""
            if not narration.strip():
                cumulative_time += audio_durations[i] if i < len(audio_durations) else 5.0
                continue

            duration = audio_durations[i] if i < len(audio_durations) else 5.0

            # Split narration into chunks (2-3 sentences each for readability)
            chunks = _split_narration(narration, max_words=12)

            chunk_duration = duration / max(len(chunks), 1)
            for j, chunk in enumerate(chunks):
                start = cumulative_time + (j * chunk_duration)
                end = start + chunk_duration

                srt_lines.append(str(subtitle_index))
                srt_lines.append(f"{_format_time(start)} --> {_format_time(end)}")
                srt_lines.append(chunk)
                srt_lines.append("")
                subtitle_index += 1

            cumulative_time += duration

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))

        logger.info("Generated SRT: %d subtitles, total %.1fs", subtitle_index - 1, cumulative_time)
        return output_path

    @staticmethod
    def generate_vtt(
        scenes: List[dict],
        audio_durations: List[float],
        output_path: str,
    ) -> str:
        """Generate WebVTT subtitle file (similar to SRT with WEBVTT header)."""
        # Generate SRT first, then convert
        srt_path = output_path.replace(".vtt", ".srt")
        SubtitleGenerator.generate_srt(scenes, audio_durations, srt_path)

        # Convert SRT → VTT
        with open(srt_path, "r", encoding="utf-8") as f:
            srt_content = f.read()

        vtt_content = "WEBVTT\n\n" + srt_content.replace(",", ".")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(vtt_content)

        # Cleanup temp SRT if VTT path differs
        if srt_path != output_path and os.path.exists(srt_path):
            os.remove(srt_path)

        return output_path


def _split_narration(text: str, max_words: int = 12) -> List[str]:
    """Split narration into readable subtitle chunks."""
    import re
    # Split on sentence boundaries first
    sentences = re.split(r'(?<=[.!?।])\s+', text.strip())

    chunks = []
    current = ""
    for sentence in sentences:
        words = sentence.split()
        if len(current.split()) + len(words) <= max_words:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            # If single sentence is too long, split by word count
            if len(words) > max_words:
                for k in range(0, len(words), max_words):
                    chunk = " ".join(words[k:k + max_words])
                    chunks.append(chunk)
                current = ""
            else:
                current = sentence

    if current:
        chunks.append(current)

    return chunks or [text]


def _format_time(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
