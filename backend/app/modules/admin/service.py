"""
Admin Service - Business logic for admin panel.
"""
import os
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from fastapi import HTTPException
from jose import jwt

from app.db.connection import get_db

_JWT_SECRET = os.getenv("JWT_SECRET", "eduvyai-change-me")
_JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_ADMIN_JWT_DAYS = 7


def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _make_admin_token(admin_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=_ADMIN_JWT_DAYS)
    return jwt.encode(
        {"sub": str(admin_id), "role": "admin", "exp": exp},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )


class AdminService:
    """Admin panel business logic."""
    
    @staticmethod
    def setup(email: str, password: str, name: str) -> Dict:
        """Create first superadmin."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) AS cnt FROM admin_users")
            row = cur.fetchone()
            if row and row["cnt"] > 0:
                raise HTTPException(status_code=403, detail="Admin already exists. Use login.")
            
            email = email.strip().lower()
            if "@" not in email:
                raise HTTPException(status_code=422, detail="Valid email required")
            if len(password) < 8:
                raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
            
            pw_hash = _hash(password)
            cur.execute(
                "INSERT INTO admin_users (email, password_hash, name, role) VALUES (%s,%s,%s,'superadmin') RETURNING id",
                (email, pw_hash, name.strip())
            )
            new_id = cur.fetchone()["id"]
            conn.commit()
            
            token = _make_admin_token(new_id)
            return {"token": token, "email": email, "name": name.strip()}
        finally:
            conn.close()
    
    @staticmethod
    def login(email: str, password: str) -> Dict:
        """Admin login."""
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT * FROM admin_users WHERE email = %s", (email,))
            admin = cur.fetchone()
            if not admin or not _verify(password, admin["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            token = _make_admin_token(admin["id"])
            return {"token": token, "email": admin["email"], "name": admin["name"]}
        finally:
            conn.close()
    
    @staticmethod
    def get_me(admin_id: int) -> Dict:
        """Get admin profile."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, email, name, role, created_at FROM admin_users WHERE id = %s", (admin_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Admin not found")
            return dict(row)
        finally:
            conn.close()
    
    # ── Boards ────────────────────────────────────────────────
    
    @staticmethod
    def list_boards() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM boards ORDER BY sort_order, name")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_board(board_id: str, name: str, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO boards (id, name, sort_order, is_active)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (board_id.lower().strip(), name.strip(), sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_board(board_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE boards SET is_active=FALSE WHERE id=%s", (board_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_boards(rows: List[Dict]) -> Dict:
        """Bulk upsert boards. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                bid = str(row.get("id", "")).strip().lower()
                if not bid:
                    continue
                cur.execute("SELECT id FROM boards WHERE id=%s", (bid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO boards (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (bid, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    # ── Standards ─────────────────────────────────────────────
    
    @staticmethod
    def list_standards() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM standards ORDER BY grade_num")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_standard(std_id: str, name: str, grade_num: int, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (std_id.lower().strip(), name.strip(), grade_num, sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_standard(std_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE standards SET is_active=FALSE WHERE id=%s", (std_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
    
    # ── Mediums ───────────────────────────────────────────────
    
    @staticmethod
    def list_mediums() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM mediums ORDER BY sort_order, name")
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    
    @staticmethod
    def upsert_medium(med_id: str, name: str, sort_order: int, is_active: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO mediums (id, name, sort_order, is_active)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                   sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (med_id.lower().strip(), name.strip(), sort_order, is_active)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            conn.close()
    
    @staticmethod
    def delete_medium(med_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE mediums SET is_active=FALSE WHERE id=%s", (med_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_standards(rows: List[Dict]) -> Dict:
        """Bulk upsert standards. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                sid = str(row.get("id", "")).strip().lower()
                if not sid:
                    continue
                cur.execute("SELECT id FROM standards WHERE id=%s", (sid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO standards (id, name, grade_num, sort_order, is_active)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, grade_num=EXCLUDED.grade_num,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (sid, str(row.get("name", "")).strip(),
                     int(row.get("grade_num", 0)), int(row.get("sort_order", 0)),
                     bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    @staticmethod
    def import_mediums(rows: List[Dict]) -> Dict:
        """Bulk upsert mediums. Returns {inserted, updated}."""
        conn = get_db()
        try:
            cur = conn.cursor()
            inserted = 0
            updated = 0
            for row in rows:
                mid = str(row.get("id", "")).strip().lower()
                if not mid:
                    continue
                cur.execute("SELECT id FROM mediums WHERE id=%s", (mid,))
                exists = cur.fetchone()
                cur.execute(
                    """INSERT INTO mediums (id, name, sort_order, is_active)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,
                       sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active""",
                    (mid, str(row.get("name", "")).strip(),
                     int(row.get("sort_order", 0)), bool(row.get("is_active", True)))
                )
                if exists:
                    updated += 1
                else:
                    inserted += 1
            conn.commit()
            return {"inserted": inserted, "updated": updated}
        finally:
            conn.close()

    # ── Curriculum ────────────────────────────────────────────

    @staticmethod
    def list_curriculum() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT c.id, c.board_id, c.standard_id, c.medium_id, c.subjects, c.is_active,
                          b.name AS board_name, s.name AS standard_name, m.name AS medium_name
                   FROM curriculum c
                   LEFT JOIN boards b ON c.board_id = b.id
                   LEFT JOIN standards s ON c.standard_id = s.id
                   LEFT JOIN mediums m ON c.medium_id = m.id
                   ORDER BY c.board_id, c.standard_id, c.medium_id"""
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                import json as _json
                try:
                    d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
                except Exception:
                    d["subjects"] = []
                result.append(d)
            return result
        finally:
            conn.close()

    @staticmethod
    def create_curriculum(board_id: str, standard_id: str, medium_id: str, subjects: List[str], is_active: bool = True) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (board_id, standard_id, medium_id)
                   DO UPDATE SET subjects=EXCLUDED.subjects, is_active=EXCLUDED.is_active
                   RETURNING *""",
                (board_id, standard_id, medium_id, _json.dumps(subjects), is_active)
            )
            row = cur.fetchone()
            conn.commit()
            d = dict(row)
            try:
                d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
            except Exception:
                d["subjects"] = []
            return d
        finally:
            conn.close()

    @staticmethod
    def update_curriculum(row_id: int, subjects: List[str] = None, is_active: bool = None) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            if subjects is not None and is_active is not None:
                cur.execute(
                    "UPDATE curriculum SET subjects=%s, is_active=%s WHERE id=%s RETURNING *",
                    (_json.dumps(subjects), is_active, row_id)
                )
            elif subjects is not None:
                cur.execute(
                    "UPDATE curriculum SET subjects=%s WHERE id=%s RETURNING *",
                    (_json.dumps(subjects), row_id)
                )
            elif is_active is not None:
                cur.execute(
                    "UPDATE curriculum SET is_active=%s WHERE id=%s RETURNING *",
                    (is_active, row_id)
                )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Curriculum row not found")
            conn.commit()
            d = dict(row)
            try:
                d["subjects"] = _json.loads(d["subjects"]) if isinstance(d["subjects"], str) else d["subjects"]
            except Exception:
                d["subjects"] = []
            return d
        finally:
            conn.close()

    @staticmethod
    def delete_curriculum(row_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM curriculum WHERE id=%s", (row_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def import_curriculum(rows: List[Dict]) -> Dict:
        import json as _json
        conn = get_db()
        created = 0
        errors = []
        try:
            cur = conn.cursor()
            for r in rows:
                try:
                    cur.execute(
                        """INSERT INTO curriculum (board_id, standard_id, medium_id, subjects, is_active)
                           VALUES (%s,%s,%s,%s,TRUE)
                           ON CONFLICT (board_id, standard_id, medium_id)
                           DO UPDATE SET subjects=EXCLUDED.subjects, is_active=TRUE""",
                        (r["board_id"], r["standard_id"], r["medium_id"], _json.dumps(r.get("subjects", [])))
                    )
                    created += 1
                except Exception as e:
                    errors.append(str(e))
            conn.commit()
            return {"created": created, "errors": errors}
        finally:
            conn.close()

    # ── Users ─────────────────────────────────────────────────

    @staticmethod
    def list_users(search: str = "", plan: str = "", drishti_only: bool = False) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            conditions = []
            params = []
            if search:
                conditions.append("(LOWER(name) LIKE %s OR LOWER(email) LIKE %s)")
                like = f"%{search.lower()}%"
                params.extend([like, like])
            if plan:
                conditions.append("plan = %s")
                params.append(plan)
            if drishti_only:
                conditions.append("is_drishti = TRUE")
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cur.execute(
                f"""SELECT id, name, email, standard, board, language, plan,
                           plan_expires_at, xp, streak, is_drishti,
                           ai_provider, ai_model, ai_admin_override, created_at
                    FROM users {where}
                    ORDER BY created_at DESC LIMIT 500""",
                params
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def update_user_plan(user_id: str, plan: str, plan_expires_at: str = None) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET plan=%s, plan_expires_at=%s WHERE id=%s",
                (plan, plan_expires_at or "", user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def toggle_drishti(user_id: str, is_drishti: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE users SET is_drishti=%s WHERE id=%s", (is_drishti, user_id))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def update_user_ai_config(user_id: str, provider: str, model: str, override: bool) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE users SET ai_provider=%s, ai_model=%s, ai_admin_override=%s WHERE id=%s",
                (provider, model, override, user_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def create_drishti_student(name: str, email: str, password: str, standard: str, board: str, language: str) -> Dict:
        import uuid
        import bcrypt as _bcrypt
        conn = get_db()
        try:
            cur = conn.cursor()
            email = email.strip().lower()
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email already registered")
            pw_hash = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
            user_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO users (id, name, email, password_hash, standard, board, language, is_drishti, plan)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE,'free')""",
                (user_id, name.strip(), email, pw_hash, standard, board, language)
            )
            conn.commit()
            return {"id": user_id, "name": name, "email": email}
        finally:
            conn.close()

    # ── AI Usage ──────────────────────────────────────────────

    @staticmethod
    def get_usage_summary(days: int = 7) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            # All-time totals
            cur.execute("SELECT COALESCE(SUM(call_count),0) AS calls, COALESCE(SUM(prompt_tokens+completion_tokens),0) AS tokens FROM ai_usage")
            row = cur.fetchone()
            all_time = {"calls": int(row["calls"]), "tokens": int(row["tokens"])}
            # Daily breakdown for past N days
            cur.execute(
                """SELECT date, SUM(call_count) AS calls, SUM(prompt_tokens+completion_tokens) AS tokens
                   FROM ai_usage
                   WHERE date >= CURRENT_DATE - INTERVAL '%s days'
                   GROUP BY date ORDER BY date DESC""",
                (days,)
            )
            daily = [{"date": r["date"], "calls": int(r["calls"]), "tokens": int(r["tokens"])} for r in cur.fetchall()]
            return {"all_time": all_time, "daily": daily}
        finally:
            conn.close()

    @staticmethod
    def get_usage_by_date(date: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT u.user_id, us.name,
                          u.call_count AS calls,
                          u.prompt_tokens + u.completion_tokens AS tokens
                   FROM ai_usage u
                   LEFT JOIN users us ON us.id = u.user_id
                   WHERE u.date = %s
                   ORDER BY u.call_count DESC LIMIT 100""",
                (date,)
            )
            rows = [dict(r) for r in cur.fetchall()]
            return {"rows": rows}
        finally:
            conn.close()

    # ── AI Config ─────────────────────────────────────────────

    @staticmethod
    def get_ai_config() -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            # Routing
            cur.execute("SELECT key, value FROM app_settings WHERE key LIKE 'ai_routing_%'")
            routing = {}
            for r in cur.fetchall():
                plan = r["key"].replace("ai_routing_", "")
                try:
                    routing[plan] = _json.loads(r["value"])
                except Exception:
                    pass
            default_routing = {
                "free":    {"provider": "groq",   "model": "llama-3.1-8b-instant"},
                "basic":   {"provider": "groq",   "model": "llama-3.3-70b-versatile"},
                "pro":     {"provider": "gemini", "model": "gemini-2.0-flash"},
                "premium": {"provider": "gemini", "model": "gemini-2.0-flash"},
            }
            for plan, val in default_routing.items():
                if plan not in routing:
                    routing[plan] = val
            # Key status and slots
            providers = ["gemini", "groq", "anthropic", "openai", "nvidia"]
            key_status = {}
            key_slots = {}
            def mask_key(k: str) -> str:
                """Return masked hint like 'sk-••••abc' for UI display"""
                if not k or len(k) < 8:
                    return "••••••••"
                return k[:4] + "••••" + k[-4:]

            for prov in providers:
                has_key = False
                db_slots = {}
                db_hints = {}
                for slot in range(1, 6):
                    dk = f"api_key_{prov}" if slot == 1 else f"api_key_{prov}_{slot}"
                    cur.execute("SELECT value FROM app_settings WHERE key=%s AND value != ''", (dk,))
                    row = cur.fetchone()
                    key_val = row["value"] if row else ""
                    db_slots[slot] = bool(key_val)
                    db_hints[slot] = mask_key(key_val) if key_val else ""
                    if key_val:
                        has_key = True
                # Also check env vars
                env_base = {"gemini": "GEMINI_API_KEY", "groq": "GROQ_API_KEY",
                            "anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY",
                            "nvidia": "NVIDIA_API_KEY"}.get(prov, "")
                import os as _os
                env_count = sum(1 for i in ([""] + [f"_{j}" for j in range(2, 6)])
                                if _os.getenv(f"{env_base}{i}", ""))
                if env_count:
                    has_key = True
                key_status[prov] = has_key
                key_slots[prov] = {
                    "db_slots": db_slots,  # {1: bool, 2: bool, ...}
                    "db_hints": db_hints,  # {1: "sk-••••abc", 2: "", ...}
                    "env_count": env_count,
                    "pool_size": sum(1 for v in db_slots.values() if v) + env_count,
                }
            return {"routing": routing, "key_status": key_status, "key_slots": key_slots}
        finally:
            conn.close()

    @staticmethod
    def save_ai_routing(plan: str, provider: str, model: str) -> Dict:
        import json as _json
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
                (f"ai_routing_{plan}", _json.dumps({"provider": provider, "model": model}))
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def save_ai_key(provider: str, key: str, slot: int = 1) -> Dict:
        import hashlib, base64
        from cryptography.fernet import Fernet
        import os as _os
        secret = _os.getenv("JWT_SECRET", "")
        fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))
        encrypted = fernet.encrypt(key.encode()).decode()
        db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP""",
                (db_key, encrypted)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def remove_ai_key(provider: str, slot: int) -> Dict:
        db_key = f"api_key_{provider}" if slot == 1 else f"api_key_{provider}_{slot}"
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM app_settings WHERE key=%s", (db_key,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    async def fetch_provider_models(provider: str) -> List[str]:
        """
        Fetch the live model list from the provider's API using the configured key.
        Falls back to a safe static list if the call fails or no key is set.
        Returns a list of model id strings.
        """
        import httpx as _httpx
        from services.ai_service import _next_key

        # Static fallback per provider (used when key missing or API down)
        _FALLBACK: Dict[str, List[str]] = {
            "groq":      ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            "gemini":    ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
            "anthropic": ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
            "openai":    ["gpt-4o-mini", "gpt-4o"],
            "nvidia":    [
                "meta/llama-3.3-70b-instruct",
                "meta/llama-3.1-8b-instruct",
                "nvidia/llama-3.3-nemotron-super-49b-v1",
                "nvidia/llama-3.1-nemotron-ultra-253b-v1",
                "mistralai/mistral-nemotron",
                "deepseek-ai/deepseek-v4-flash",
            ],
        }

        key = _next_key(provider)
        if not key:
            return _FALLBACK.get(provider, [])

        try:
            async with _httpx.AsyncClient(timeout=10.0) as client:
                if provider == "groq":
                    r = await client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = [m["id"] for m in data.get("data", []) if m.get("id")]
                    # Only keep chat-capable models (filter out whisper, tts, etc.)
                    ids = [m for m in ids if "whisper" not in m and "tts" not in m
                           and "guard" not in m and "embed" not in m]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "openai":
                    r = await client.get(
                        "https://api.openai.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    # Keep only GPT / o-series chat models
                    ids = [m["id"] for m in data.get("data", [])
                           if m.get("id") and (
                               m["id"].startswith("gpt-") or m["id"].startswith("o1") or m["id"].startswith("o3")
                           )]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "gemini":
                    r = await client.get(
                        f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = []
                    for m in data.get("models", []):
                        name = m.get("name", "")          # "models/gemini-2.0-flash"
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            ids.append(name.replace("models/", ""))
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "nvidia":
                    r = await client.get(
                        "https://integrate.api.nvidia.com/v1/models",
                        headers={"Authorization": f"Bearer {key}"},
                    )
                    r.raise_for_status()
                    data = r.json()
                    ids = [m["id"] for m in data.get("data", []) if m.get("id")]
                    # Filter to chat-capable models only (skip embedding/rerank/image)
                    ids = [m for m in ids if not any(
                        kw in m for kw in ["embed", "rerank", "vision", "vlm", "clip",
                                           "safety", "guard", "pii", "translate"]
                    )]
                    return sorted(ids) or _FALLBACK.get(provider, [])

                elif provider == "anthropic":
                    # Anthropic has no public /models listing — return curated list
                    return _FALLBACK.get(provider, [])

        except Exception:
            pass  # network error / bad key — return fallback silently

        return _FALLBACK.get(provider, [])

    # ── Drishti Helpers ───────────────────────────────────────

    @staticmethod
    def list_helpers() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT h.id, h.helper_name, h.helper_email, h.helper_type,
                       h.notes, h.is_active, h.created_at,
                       LEFT(h.helper_token, 8) AS token_preview,
                       COUNT(da.id) FILTER (WHERE da.is_active = TRUE) AS student_count
                FROM drishti_helpers h
                LEFT JOIN drishti_assignments da ON da.helper_id = h.id
                GROUP BY h.id
                ORDER BY h.created_at DESC
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def create_helper(helper_name: str, helper_email: str, helper_type: str, notes: str) -> Dict:
        import secrets
        conn = get_db()
        try:
            cur = conn.cursor()
            email = helper_email.strip().lower()
            token = secrets.token_urlsafe(32)
            cur.execute(
                """INSERT INTO drishti_helpers (helper_name, helper_email, helper_type, helper_token, notes)
                   VALUES (%s,%s,%s,%s,%s) RETURNING id, helper_name, helper_email, helper_type, notes, is_active, created_at""",
                (helper_name.strip(), email, helper_type.strip(), token, notes.strip())
            )
            row = cur.fetchone()
            conn.commit()
            d = dict(row)
            d["helper_token"] = token
            return d
        finally:
            conn.close()

    @staticmethod
    def update_helper(helper_id: int, helper_name: str, helper_email: str, helper_type: str, notes: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """UPDATE drishti_helpers
                   SET helper_name=%s, helper_email=%s, helper_type=%s, notes=%s
                   WHERE id=%s RETURNING id, helper_name, helper_email, helper_type, notes, is_active""",
                (helper_name.strip(), helper_email.strip().lower(), helper_type.strip(), notes.strip(), helper_id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Helper not found")
            conn.commit()
            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def deactivate_helper(helper_id: int) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE drishti_helpers SET is_active=FALSE WHERE id=%s", (helper_id,))
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def get_helper_students(helper_id: int) -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.standard, u.board, u.language, u.plan, u.xp, u.streak
                FROM users u
                JOIN drishti_assignments da ON da.student_id = u.id
                WHERE da.helper_id = %s AND da.is_active = TRUE
                ORDER BY u.name
            """, (helper_id,))
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def assign_student(helper_id: int, student_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO drishti_assignments (helper_id, student_id, is_active)
                   VALUES (%s,%s,TRUE)
                   ON CONFLICT (helper_id, student_id)
                   DO UPDATE SET is_active=TRUE, assigned_at=CURRENT_TIMESTAMP""",
                (helper_id, student_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def unassign_student(helper_id: int, student_id: str) -> Dict:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE drishti_assignments SET is_active=FALSE WHERE helper_id=%s AND student_id=%s",
                (helper_id, student_id)
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    @staticmethod
    def list_drishti_students() -> List[Dict]:
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.name, u.standard, u.board, u.language, u.plan, u.xp, u.streak,
                       h.helper_name AS assigned_to
                FROM users u
                LEFT JOIN drishti_assignments da ON da.student_id = u.id AND da.is_active = TRUE
                LEFT JOIN drishti_helpers h ON h.id = da.helper_id
                WHERE u.is_drishti = TRUE
                ORDER BY u.name
            """)
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

