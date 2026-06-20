"""
Video Module — Database query functions.
All functions are synchronous (psycopg2) and run via asyncio.to_thread().
"""
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def insert_video_project(conn, project: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new video project row and return the full row."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO video_projects
            (id, user_id, title, topic, engine, style_variant,
             narration_language, onscreen_language, orientation, pacing,
             timing, status, script_json, bg_music, voice_instructions,
             enable_captions)
        VALUES
            (%(id)s, %(user_id)s, %(title)s, %(topic)s, %(engine)s,
             %(style_variant)s, %(narration_language)s, %(onscreen_language)s,
             %(orientation)s, %(pacing)s, %(timing)s, 'queued',
             %(script_json)s, %(bg_music)s, %(voice_instructions)s,
             %(enable_captions)s)
        RETURNING *
    """, project)
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return _row_to_dict(row, cur.description if row else None, cur)


def get_video_project(conn, video_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetch a single video project. If user_id provided, scoped to that user."""
    cur = conn.cursor()
    if user_id:
        cur.execute("SELECT * FROM video_projects WHERE id=%s AND user_id=%s", (video_id, user_id))
    else:
        cur.execute("SELECT * FROM video_projects WHERE id=%s", (video_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return None
    result = _row_to_dict(row, cur.description, cur)
    cur.close()
    return result


def update_video_status(conn, video_id: str, status: str, **kwargs) -> None:
    """Update status and optional fields (file_path, duration_sec, error_msg, etc.)."""
    allowed = {"file_path", "thumb_path", "share_token", "duration_sec",
               "frame_count", "error_msg", "completed_at"}
    updates = {"status": status}
    for k, v in kwargs.items():
        if k in allowed:
            updates[k] = v

    set_clauses = ", ".join(f"{k} = %({k})s" for k in updates)
    updates["video_id"] = video_id
    cur = conn.cursor()
    cur.execute(f"UPDATE video_projects SET {set_clauses} WHERE id = %(video_id)s", updates)
    conn.commit()
    cur.close()


def list_user_videos(conn, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    """Return all videos for a user, newest first."""
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM video_projects WHERE user_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (user_id, limit, offset)
    )
    rows = cur.fetchall()
    desc = cur.description
    cur.close()
    return [_row_to_dict(r, desc, None) for r in rows]


def count_user_videos(conn, user_id: str) -> int:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS count FROM video_projects WHERE user_id=%s", (user_id,))
    count = cur.fetchone()["count"]
    cur.close()
    return count


def delete_video_project(conn, video_id: str, user_id: str) -> bool:
    cur = conn.cursor()
    cur.execute("DELETE FROM video_projects WHERE id=%s AND user_id=%s", (video_id, user_id))
    deleted = cur.rowcount > 0
    conn.commit()
    cur.close()
    return deleted


# ── Frame queries ─────────────────────────────────────────────────────────────

def insert_video_frame(conn, frame: Dict[str, Any]) -> int:
    """Insert a frame row; returns the new serial id."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO video_frames (video_id, frame_index, narration, svg_spec, status)
        VALUES (%(video_id)s, %(frame_index)s, %(narration)s, %(svg_spec)s, 'pending')
        ON CONFLICT (video_id, frame_index) DO UPDATE
            SET narration=EXCLUDED.narration, svg_spec=EXCLUDED.svg_spec, status='pending'
        RETURNING id
    """, frame)
    row_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    return row_id


def get_video_frames(conn, video_id: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM video_frames WHERE video_id=%s ORDER BY frame_index ASC",
        (video_id,)
    )
    rows = cur.fetchall()
    desc = cur.description
    cur.close()
    return [_row_to_dict(r, desc, None) for r in rows]


def update_frame_status(conn, frame_id: int, status: str, frame_path: str = "") -> None:
    cur = conn.cursor()
    cur.execute(
        "UPDATE video_frames SET status=%s, frame_path=%s WHERE id=%s",
        (status, frame_path, frame_id)
    )
    conn.commit()
    cur.close()


def count_frames_by_status(conn, video_id: str, status: str) -> int:
    cur = conn.cursor()
    cur.execute(
        "SELECT COUNT(*) AS count FROM video_frames WHERE video_id=%s AND status=%s",
        (video_id, status)
    )
    count = cur.fetchone()["count"]
    cur.close()
    return count


# ── Helper ────────────────────────────────────────────────────────────────────

def _row_to_dict(row, description, _cur) -> Dict[str, Any]:
    if row is None:
        return {}
    # RealDictCursor returns RealDictRow (already dict-like); plain cursor returns tuple
    if hasattr(row, 'keys'):
        result = dict(row)
    else:
        if description is None:
            return {}
        keys = [col.name for col in description]
        result = dict(zip(keys, row))
    # Serialize timestamps to ISO strings
    for k, v in result.items():
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
    return result
