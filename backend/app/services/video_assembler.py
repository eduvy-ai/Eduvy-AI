"""
Video Assembler — combines per-frame MP4s + audio track into the final video.
Runs entirely as background task; updates DB status when done.
"""
import asyncio
import json
import logging
import os
import shutil
import subprocess
import tempfile
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

# Resolve ffmpeg binary — works even if PATH wasn't updated in the current process
_FFMPEG = shutil.which("ffmpeg") or (
    r"C:\Users\pradip.pawar\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
)

# Filesystem root for generated videos (absolute path)
VIDEOS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "videos")
)
# URL prefix that FastAPI serves via StaticFiles
_VIDEOS_URL = "/videos"


async def assemble_video(
    video_id: str,
    user_id: str,
    frames: list[dict],
    style_variant: str,
    orientation: str,
    narration_language: str,
    enable_captions: bool,
) -> None:
    """
    Full pipeline for one video project:
    1. Generate HTML for each frame → render to MP4
    2. Generate TTS audio for each frame → concatenate
    3. Combine video frames with audio using ffmpeg
    4. Update DB status to 'done' (or 'error')

    Called as a FastAPI BackgroundTask.
    """
    from app.db.connection import get_db
    from app.modules.video import query as q
    from app.services.svg_renderer import generate_scene_html
    from app.services.video_renderer import render_all_frames_to_mp4
    from app.services.audio_pipeline import generate_tts, concat_audio_files, pad_audio_to_duration

    conn = get_db()
    try:
        q.update_video_status(conn, video_id, "rendering")
    finally:
        conn.close()

    out_dir = os.path.join(VIDEOS_DIR, user_id, video_id)
    os.makedirs(out_dir, exist_ok=True)

    try:
        audio_files = []
        total_duration = 0
        total_frames = len(frames)

        logger.info("=== VIDEO %s: starting assembly, %d frames ===", video_id[:8], total_frames)

        # ── Step 1: TTS for all frames (fast, no Chromium needed) ────────────
        frame_render_inputs = []
        frame_ids = []
        for frame in frames:
            fidx = frame["frame_index"]
            frame_id = frame["id"]
            svg_spec = frame.get("svg_spec", "{}")
            if isinstance(svg_spec, str):
                try:
                    svg_spec = json.loads(svg_spec)
                except json.JSONDecodeError:
                    svg_spec = {}

            duration_sec = svg_spec.get("duration_sec", 10)
            narration = frame.get("narration", "")
            total_duration += duration_sec

            logger.info("[%d/%d] Frame %d — duration=%.1fs, narration=%d chars",
                        fidx + 1, total_frames, fidx, duration_sec, len(narration))

            audio_path = os.path.join(out_dir, f"audio_{fidx:03d}.mp3")
            padded_path = os.path.join(out_dir, f"audio_padded_{fidx:03d}.mp3")
            if narration.strip():
                # Retry TTS once — edge-tts occasionally drops a websocket under
                # repeated back-to-back calls; a second try (which also falls back
                # to gTTS internally) almost always succeeds. Only after both
                # attempts fail do we fall back to silence for this scene.
                tts_ok = False
                last_tts_err = None
                for tts_attempt in range(2):
                    try:
                        logger.info("  [%d/%d] TTS start (lang=%s, attempt %d)",
                                    fidx + 1, total_frames, narration_language, tts_attempt + 1)
                        await generate_tts(narration, narration_language, audio_path)
                        await pad_audio_to_duration(audio_path, duration_sec, padded_path)
                        audio_files.append(padded_path)
                        logger.info("  [%d/%d] TTS done (%d bytes)",
                                    fidx + 1, total_frames, os.path.getsize(padded_path))
                        tts_ok = True
                        break
                    except Exception as exc:
                        last_tts_err = exc
                        logger.warning("  [%d/%d] TTS attempt %d failed: %s",
                                       fidx + 1, total_frames, tts_attempt + 1, exc)
                if not tts_ok:
                    logger.error("  [%d/%d] TTS failed after retries: %s — using silence",
                                 fidx + 1, total_frames, last_tts_err)
                    try:
                        await _generate_silence(duration_sec, padded_path)
                        audio_files.append(padded_path)
                    except Exception:
                        audio_files.append(None)
            else:
                logger.warning("  [%d/%d] No narration — using silence", fidx + 1, total_frames)
                try:
                    await _generate_silence(duration_sec, padded_path)
                    audio_files.append(padded_path)
                except Exception:
                    audio_files.append(None)

            # Optional raster hero images (free, no-key). OFF by default: generic
            # image models produce clip-art that reads as a slideshow rather than
            # a drawn whiteboard. The authentic look comes from the vector
            # stroke-by-stroke renderer. Set VIDEO_ENABLE_AI_IMAGES=1 to opt in.
            from app.services.svg_renderer import _SVG_NATIVE_DIAGRAMS
            stype = svg_spec.get("type")
            data = svg_spec.setdefault("data", {})
            diagram_type = str(data.get("diagram_type", "")).strip().lower()
            _images_on = os.getenv("VIDEO_ENABLE_AI_IMAGES", "0") == "1"
            needs_image = _images_on and (
                stype == "illustration"
                or (stype == "annotated_diagram" and diagram_type not in _SVG_NATIVE_DIAGRAMS)
            )
            if needs_image and not data.get("image_data_uri"):
                img_prompt = (data.get("prompt")
                              or svg_spec.get("title")
                              or narration[:80])
                try:
                    from app.services.image_gen import generate_illustration_data_uri
                    uri = await generate_illustration_data_uri(
                        img_prompt, style_variant, orientation, seed=fidx
                    )
                    if uri:
                        data["image_data_uri"] = uri
                        logger.info("  [%d/%d] hero image ready (~%d KB)",
                                    fidx + 1, total_frames, len(uri) // 1024)
                    else:
                        logger.warning("  [%d/%d] hero image unavailable — SVG fallback",
                                       fidx + 1, total_frames)
                except Exception as exc:
                    logger.warning("  [%d/%d] hero image gen error: %s — SVG fallback",
                                   fidx + 1, total_frames, exc)

            # `draw` scenes: sketch the ACTUAL subject. A free image model draws
            # clean line-art, OpenCV vectorizes it to contours, and the renderer
            # inks them stroke-by-stroke with the hand — recognizable + drawn, not
            # a slide. On any failure the renderer falls back to the icon scene.
            if svg_spec.get("type") in ("draw", "sketch"):
                data = svg_spec.setdefault("data", {})
                if not data.get("contours"):
                    subject = (data.get("subject") or svg_spec.get("title") or narration[:60]).strip()
                    try:
                        from app.services.line_art import generate_line_art
                        la = await generate_line_art(subject)
                        if la and la.get("contours"):
                            data["contours"] = la["contours"]
                            data["cw"] = la["w"]
                            data["ch"] = la["h"]
                            logger.info("  [%d/%d] draw '%s' -> %d contours",
                                        fidx + 1, total_frames, subject[:40], len(la["contours"]))
                        else:
                            logger.warning("  [%d/%d] draw '%s' line-art unavailable — composition fallback",
                                           fidx + 1, total_frames, subject[:40])
                    except Exception as exc:
                        logger.warning("  [%d/%d] draw gen error: %s — composition fallback",
                                       fidx + 1, total_frames, exc)

            html = generate_scene_html(svg_spec, style_variant, orientation)
            frame_render_inputs.append({
                "html": html,
                "output_path": os.path.join(out_dir, f"frame_{fidx:03d}.mp4"),
                "duration_sec": duration_sec,
            })
            frame_ids.append((fidx, frame_id))

        # ── Step 2: Render ALL frames with ONE Chromium instance ─────────────
        # Launching Chromium once for the whole video prevents the OOM pattern
        # where each per-frame launch adds ~150MB that the OS hasn't yet reclaimed.
        logger.info("=== VIDEO %s: launching Chromium (once for all %d frames) ===",
                    video_id[:8], total_frames)
        try:
            render_results = await render_all_frames_to_mp4(frame_render_inputs, out_dir, orientation)
        except Exception as exc:
            logger.error("render_all_frames_to_mp4 failed: %s", exc)
            render_results = [None] * total_frames

        frame_mp4s = []
        for idx, (fidx, frame_id) in enumerate(frame_ids):
            result = render_results[idx] if idx < len(render_results) else None
            if result and os.path.exists(result):
                frame_mp4s.append(result)
                _update_frame_status(frame_id, "done", result)
                logger.info("  [%d/%d] Frame MP4 done (%d bytes)", fidx + 1, total_frames, os.path.getsize(result))
            else:
                logger.error("  [%d/%d] Frame render FAILED", fidx + 1, total_frames)
                frame_mp4s.append(None)
                _update_frame_status(frame_id, "error")

        # ── Concatenate all frame MP4s ────────────────────────────────────
        valid_frames_list = [f for f in frame_mp4s if f and os.path.exists(f)]
        logger.info("=== VIDEO %s: %d/%d frames rendered OK, concatenating... ===",
                    video_id[:8], len(valid_frames_list), total_frames)
        if not valid_frames_list:
            raise RuntimeError("No frames rendered successfully")

        final_video = os.path.join(out_dir, f"{video_id}.mp4")
        await _concat_video_files(valid_frames_list, final_video)

        # ── Mix audio onto video ──────────────────────────────────────────
        valid_audio = [a for a in audio_files if a and os.path.exists(a)]
        logger.info("=== VIDEO %s: %d/%d audio segments ready ===",
                    video_id[:8], len(valid_audio), total_frames)
        if valid_audio:
            combined_audio = os.path.join(out_dir, "narration.mp3")
            await concat_audio_files(valid_audio, combined_audio)
            muxed_video = os.path.join(out_dir, f"{video_id}_muxed.mp4")
            await _mux_audio_video(final_video, combined_audio, muxed_video)
            os.replace(muxed_video, final_video)
        else:
            logger.error("=== VIDEO %s: NO audio segments — final video will be SILENT ===",
                         video_id[:8])

        # Verify the audio actually landed in the final file. This turns a silent
        # video (the "audio not coming" symptom) into a loud, explicit log line
        # instead of a mystery.
        if not await _probe_has_audio(final_video):
            logger.error("=== VIDEO %s: FINAL VIDEO HAS NO AUDIO STREAM after mux ===",
                         video_id[:8])
        else:
            logger.info("=== VIDEO %s: audio stream confirmed in final video ===",
                        video_id[:8])

        # ── Extract thumbnail ─────────────────────────────────────────────
        thumb_path = os.path.join(out_dir, "thumb.jpg")
        await _extract_thumbnail(final_video, thumb_path)

        # ── Upload to R2 if configured ────────────────────────────────────
        from app.services.r2_storage import r2_storage, is_r2_configured, StorageLimitExceeded
        
        if is_r2_configured():
            try:
                # Upload video to R2
                r2_video_key = f"videos/{user_id}/{video_id}/{video_id}.mp4"
                file_url = await r2_storage.upload_file(
                    file_path=final_video,
                    key=r2_video_key,
                    user_id=user_id,
                    content_type="video/mp4",
                    category="video",
                    delete_local=False,  # Keep local for now
                )
                
                # Upload thumbnail to R2
                thumb_url = ""
                if os.path.exists(thumb_path):
                    r2_thumb_key = f"videos/{user_id}/{video_id}/thumb.jpg"
                    thumb_url = await r2_storage.upload_file(
                        file_path=thumb_path,
                        key=r2_thumb_key,
                        user_id=user_id,
                        content_type="image/jpeg",
                        category="video_thumbnail",
                        delete_local=False,
                    )
                
                logger.info("Uploaded video %s to R2", video_id)
                
                # Clean up local files after successful R2 upload
                try:
                    shutil.rmtree(out_dir)
                except Exception as cleanup_err:
                    logger.warning("Failed to cleanup local video dir %s: %s", out_dir, cleanup_err)
                    
            except StorageLimitExceeded as e:
                logger.error("R2 storage limit exceeded for video %s: %s", video_id, e)
                # Fall back to local storage
                file_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/{video_id}.mp4"
                thumb_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/thumb.jpg" if os.path.exists(thumb_path) else ""
            except Exception as r2_err:
                logger.warning("R2 upload failed for video %s: %s, using local", video_id, r2_err)
                file_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/{video_id}.mp4"
                thumb_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/thumb.jpg" if os.path.exists(thumb_path) else ""
        else:
            # R2 not configured, use local storage
            file_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/{video_id}.mp4"
            thumb_url = f"{_VIDEOS_URL}/{user_id}/{video_id}/thumb.jpg" if os.path.exists(thumb_path) else ""

        # ── Update DB — done ──────────────────────────────────────────────
        conn = get_db()
        try:
            q.update_video_status(
                conn, video_id, "done",
                file_path=file_url,
                thumb_path=thumb_url,
                duration_sec=int(total_duration),
                completed_at=datetime.utcnow().isoformat(),
            )
        finally:
            conn.close()

        logger.info("Video %s assembled successfully (%ds)", video_id, total_duration)

    except Exception as exc:
        logger.error("Video assembly failed for %s: %s", video_id, exc, exc_info=True)
        conn = get_db()
        try:
            q.update_video_status(conn, video_id, "error", error_msg=str(exc))
        finally:
            conn.close()


def _update_frame_status(frame_id: int, status: str, path: str = "") -> None:
    from app.db.connection import get_db
    from app.modules.video.query import update_frame_status
    conn = get_db()
    try:
        update_frame_status(conn, frame_id, status, path)
    except Exception:
        pass
    finally:
        conn.close()


async def _generate_silence(duration_sec: float, output_path: str) -> None:
    """Generate a silent MP3 of the given duration, in the canonical
    44.1 kHz mono MP3 format so it concatenates cleanly with the TTS segments."""
    cmd = [
        _FFMPEG, "-y",
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=mono",
        "-t", str(duration_sec),
        "-ar", "44100",
        "-ac", "1",
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        output_path,
    ]
    await asyncio.to_thread(subprocess.run, cmd, capture_output=True)


async def _concat_video_files(mp4_paths: list[str], output_path: str) -> None:
    """Concatenate MP4 files using ffmpeg concat demuxer."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for p in mp4_paths:
            f.write(f"file '{p}'\n")
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
            raise RuntimeError(f"Video concat failed: {result.stderr.decode()}")
    finally:
        os.remove(list_file)


async def _mux_audio_video(video_path: str, audio_path: str, output_path: str) -> None:
    """Mux a video file with an audio file."""
    cmd = [
        _FFMPEG, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        output_path,
    ]
    result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"Mux failed: {result.stderr.decode()}")


def _ffprobe_bin() -> str:
    """Locate ffprobe next to the resolved ffmpeg binary (or on PATH)."""
    probe = shutil.which("ffprobe")
    if probe:
        return probe
    if _FFMPEG.lower().endswith("ffmpeg.exe"):
        return _FFMPEG[:-len("ffmpeg.exe")] + "ffprobe.exe"
    if _FFMPEG.lower().endswith("ffmpeg"):
        return _FFMPEG[:-len("ffmpeg")] + "ffprobe"
    return "ffprobe"


async def _probe_has_audio(video_path: str) -> bool:
    """Return True if the file contains at least one audio stream."""
    if not os.path.exists(video_path):
        return False
    cmd = [
        _ffprobe_bin(), "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "csv=p=0",
        video_path,
    ]
    try:
        result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
        return b"audio" in (result.stdout or b"")
    except Exception:
        return False


async def _extract_thumbnail(video_path: str, thumb_path: str) -> None:
    """Extract a JPEG thumbnail from the first second of a video."""
    cmd = [
        _FFMPEG, "-y",
        "-i", video_path,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-q:v", "2",
        thumb_path,
    ]
    await asyncio.to_thread(subprocess.run, cmd, capture_output=True)
