"""
Database connection layer.
Supports PostgreSQL (Supabase), SQLite, MySQL.
Change DATABASE_URL in .env - nothing else changes.
"""
import os
import json
import threading
from urllib.parse import urlparse, quote, urlunparse

import psycopg2
import psycopg2.extras
import psycopg2.pool
from dotenv import load_dotenv

load_dotenv()


def _get_conn_params() -> dict:
    """
    Return psycopg2 connection kwargs from environment.
    Supports both individual vars and DATABASE_URL.
    """
    host = os.getenv("DB_HOST", "")
    if host:
        params: dict = {
            "host":     host,
            "port":     int(os.getenv("DB_PORT", "5432")),
            "user":     os.getenv("DB_USER", ""),
            "password": os.getenv("DB_PASS", ""),
            "dbname":   os.getenv("DB_NAME", "eduvyai"),
        }
        return {k: v for k, v in params.items() if v not in ("", None)}

    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError(
            "Database not configured. Set DATABASE_URL or "
            "DB_HOST / DB_USER / DB_PASS / DB_NAME in .env"
        )

    # Strip SQLAlchemy dialect suffix
    if url.startswith("postgresql+"):
        url = "postgresql" + url[url.index("://"):]

    # Auto-encode special chars in password
    parsed = urlparse(url)
    if parsed.password:
        encoded_pw = quote(parsed.password, safe="")
        if encoded_pw != parsed.password:
            userinfo = f"{parsed.username}:{encoded_pw}"
            host_part = parsed.hostname or ""
            if parsed.port:
                host_part += f":{parsed.port}"
            netloc = f"{userinfo}@{host_part}"
            url = urlunparse((
                parsed.scheme, netloc, parsed.path,
                parsed.params, parsed.query, parsed.fragment,
            ))
    return {"dsn": url}


# ── Connection Pool ───────────────────────────────────────────
_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_pool_lock = threading.Lock()


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is not None and not _pool.closed:
        return _pool
    with _pool_lock:
        if _pool is None or _pool.closed:
            min_conn = int(os.getenv("DB_POOL_MIN", "2"))
            max_conn = int(os.getenv("DB_POOL_MAX", "20"))
            conn_params = _get_conn_params()
            # Fail fast on stale/dropped connections instead of hanging forever
            conn_params.setdefault("connect_timeout", 10)
            conn_params.setdefault("options", "-c statement_timeout=30000")
            _pool = psycopg2.pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                cursor_factory=psycopg2.extras.RealDictCursor,
                **conn_params,
            )
    return _pool


class _PooledConn:
    """Wrapper that returns connection to pool on close()."""
    __slots__ = ("_conn", "_pool_ref")

    def __init__(self, conn, pool):
        object.__setattr__(self, "_conn", conn)
        object.__setattr__(self, "_pool_ref", pool)

    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, "_conn"), name)

    def cursor(self, *args, **kwargs):
        return object.__getattribute__(self, "_conn").cursor(*args, **kwargs)

    def commit(self):
        return object.__getattribute__(self, "_conn").commit()

    def rollback(self):
        return object.__getattribute__(self, "_conn").rollback()

    def close(self):
        conn = object.__getattribute__(self, "_conn")
        pool_ = object.__getattribute__(self, "_pool_ref")
        try:
            conn.rollback()
        except Exception:
            pass
        pool_.putconn(conn)


def get_db() -> _PooledConn:
    """Get a connection from the pool."""
    pool = _get_pool()
    conn = pool.getconn()
    return _PooledConn(conn, pool)


def init_db():
    """Create all tables if they don't exist (idempotent)."""
    from app.db.schema import create_all_tables
    create_all_tables()


def row_to_dict(row) -> dict | None:
    """Convert a RealDictRow to a plain dict."""
    if row is None:
        return None
    d = dict(row)
    
    # Parse JSON fields
    for field in ["subjects", "ai_keys", "questions_json"]:
        if field in d and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = [] if field != "ai_keys" else {}
    
    # Convert snake_case to camelCase for frontend
    if "display_language" in d:
        d["displayLanguage"] = d.pop("display_language")
    
    return d
