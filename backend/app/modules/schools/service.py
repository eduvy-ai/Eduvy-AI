"""
Schools Service - Business logic for B2B school management.
"""
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException
import bcrypt as _bcrypt

from app.db.connection import get_db, row_to_dict
from app.utils.email import school_admin_welcome_html, school_admin_welcome_plain
import logging

logger = logging.getLogger(__name__)


# ── School Plan Pricing ───────────────────────────────────────

SCHOOL_PLANS = {
    "pilot": {
        "amount": 0,
        "label": "Pilot (30-day trial)",
        "duration_days": 30,
        "student_limit": 100,
        "features": ["Basic AI access", "Muqabla battles", "Study squads"],
    },
    "school_basic": {
        "amount": 2500000,  # ₹25,000
        "label": "School Basic",
        "duration_days": 365,
        "student_limit": 200,
        "features": ["Pilot features", "Labs access", "Notebook", "Priority support"],
    },
    "school_pro": {
        "amount": 5000000,  # ₹50,000
        "label": "School Pro",
        "duration_days": 365,
        "student_limit": 500,
        "features": ["All features", "Unlimited AI", "Custom branding", "Dedicated support"],
    },
}

# Map school plans to individual plan tiers (for feature inheritance)
SCHOOL_TO_USER_PLAN = {
    "pilot": "basic",
    "school_basic": "pro",
    "school_pro": "premium",
}


def _generate_school_code() -> str:
    """Generate 8-char alphanumeric school join code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def _generate_password() -> str:
    """Generate a random 12-char password for school admins."""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(12))


class SchoolsService:
    """Schools business logic."""

    # ── CRUD ──────────────────────────────────────────────────

    @staticmethod
    def create_school(data: dict) -> dict:
        """Create a new school with admin account."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Generate unique school code
            school_code = _generate_school_code()
            while True:
                cur.execute("SELECT id FROM schools WHERE school_code = %s", (school_code,))
                if not cur.fetchone():
                    break
                school_code = _generate_school_code()

            # Calculate plan expiry
            plan = data.get("plan", "pilot")
            plan_info = SCHOOL_PLANS.get(plan, SCHOOL_PLANS["pilot"])
            expiry = datetime.now(timezone.utc) + timedelta(days=plan_info["duration_days"])

            cur.execute("""
                INSERT INTO schools (name, logo_url, contact_email, contact_phone, address, city, state,
                                     plan, student_limit, plan_expires_at, school_code, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id, name, logo_url, contact_email, contact_phone, address, city, state,
                          plan, student_limit, plan_expires_at, school_code, admin_user_id, is_active, created_at
            """, (
                data["name"],
                data.get("logo_url", ""),
                data.get("contact_email", ""),
                data.get("contact_phone", ""),
                data.get("address", ""),
                data.get("city", ""),
                data.get("state", ""),
                plan,
                data.get("student_limit", plan_info["student_limit"]),
                expiry.strftime("%Y-%m-%d"),
                school_code,
            ))
            row = cur.fetchone()
            school_id = row["id"]
            school_name = row["name"]
            contact_email = row["contact_email"]
            
            # Create school admin account if contact_email provided
            admin_created = False
            temp_password = None
            logger.info(f"Checking admin creation for email: {contact_email}")
            if contact_email and "@" in contact_email:
                # Check if admin with this email already exists
                cur.execute("SELECT id FROM admin_users WHERE email = %s", (contact_email.lower(),))
                existing = cur.fetchone()
                if existing:
                    logger.info(f"Admin already exists for email {contact_email}, skipping creation")
                else:
                    temp_password = _generate_password()
                    password_hash = _bcrypt.hashpw(temp_password.encode(), _bcrypt.gensalt()).decode()
                    
                    cur.execute("""
                        INSERT INTO admin_users (email, password_hash, name, role, school_id, must_change_password)
                        VALUES (%s, %s, %s, 'school_admin', %s, TRUE)
                        RETURNING id
                    """, (contact_email.lower(), password_hash, f"{school_name} Admin", school_id))
                    admin_row = cur.fetchone()
                    
                    # Update school with admin_user_id
                    cur.execute(
                        "UPDATE schools SET admin_user_id = %s WHERE id = %s",
                        (str(admin_row["id"]), school_id)
                    )
                    admin_created = True
                    logger.info(f"Admin created for {contact_email}, password generated")
            else:
                logger.info(f"No valid contact_email provided: '{contact_email}'")
            
            conn.commit()

            school = row_to_dict(row)
            school["student_count"] = 0
            school["admin_created"] = admin_created
            
            # Return email data for background task (router will handle sending)
            if admin_created and temp_password:
                school["_email_data"] = {
                    "email": contact_email,
                    "school_name": school_name,
                    "password": temp_password,
                }
            
            return school
        finally:
            conn.close()

    @staticmethod
    def send_admin_welcome_email_sync(email: str, school_name: str, password: str):
        """Send welcome email to school admin (sync version for background task)."""
        import smtplib
        import ssl
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from app.core.config import settings
        
        logger.info(f"Attempting to send welcome email to {email}")
        
        if not settings.smtp_configured:
            logger.warning(f"SMTP not configured, cannot send email to {email}")
            return
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Eduvy-AI Admin Account for {school_name}"
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
            msg["To"] = email
            
            plain_body = school_admin_welcome_plain(school_name, email, password)
            html_body = school_admin_welcome_html(school_name, email, password)
            
            msg.attach(MIMEText(plain_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))
            
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(settings.SMTP_FROM, email, msg.as_string())
            
            logger.info(f"Welcome email sent to school admin: {email}")
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {e}")

    @staticmethod
    def get_school(school_id: int) -> dict:
        """Get school by ID."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.*, COUNT(u.id) AS student_count
                FROM schools s
                LEFT JOIN users u ON u.school_id = s.id
                WHERE s.id = %s
                GROUP BY s.id
            """, (school_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="School not found")
            return row_to_dict(row)
        finally:
            conn.close()

    @staticmethod
    def get_school_by_code(school_code: str) -> dict:
        """Get school by join code."""
        conn = get_db()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT s.*, COUNT(u.id) AS student_count
                FROM schools s
                LEFT JOIN users u ON u.school_id = s.id
                WHERE s.school_code = %s
                GROUP BY s.id
            """, (school_code.upper(),))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Invalid school code")
            return row_to_dict(row)
        finally:
            conn.close()

    @staticmethod
    def list_schools(limit: int = 100, offset: int = 0, search: str = "") -> dict:
        """List all schools with pagination."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Count total
            if search:
                cur.execute(
                    "SELECT COUNT(*) AS cnt FROM schools WHERE name ILIKE %s",
                    (f"%{search}%",)
                )
            else:
                cur.execute("SELECT COUNT(*) AS cnt FROM schools")
            total = cur.fetchone()["cnt"]

            # Fetch schools with student count
            query = """
                SELECT s.*, COUNT(u.id) AS student_count
                FROM schools s
                LEFT JOIN users u ON u.school_id = s.id
            """
            params = []
            if search:
                query += " WHERE s.name ILIKE %s"
                params.append(f"%{search}%")
            query += " GROUP BY s.id ORDER BY s.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])

            cur.execute(query, params)
            rows = cur.fetchall()
            schools = [row_to_dict(r) for r in rows]

            return {"schools": schools, "total": total}
        finally:
            conn.close()

    @staticmethod
    def update_school(school_id: int, data: dict) -> dict:
        """Update school details."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Build dynamic update
            fields = []
            values = []
            for key in ["name", "logo_url", "contact_email", "contact_phone", 
                        "address", "city", "state", "plan", "student_limit", "is_active"]:
                if key in data and data[key] is not None:
                    fields.append(f"{key} = %s")
                    values.append(data[key])

            if not fields:
                return SchoolsService.get_school(school_id)

            fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(school_id)

            cur.execute(
                f"UPDATE schools SET {', '.join(fields)} WHERE id = %s RETURNING id",
                values
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="School not found")
            conn.commit()

            return SchoolsService.get_school(school_id)
        finally:
            conn.close()

    @staticmethod
    def delete_school(school_id: int) -> dict:
        """Delete school, its admin, and unlink students."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Unlink students first
            cur.execute("UPDATE users SET school_id = NULL WHERE school_id = %s", (school_id,))

            # Delete school admin (admin_users with this school_id)
            cur.execute("DELETE FROM admin_users WHERE school_id = %s", (school_id,))

            # Delete school
            cur.execute("DELETE FROM schools WHERE id = %s RETURNING name", (school_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="School not found")

            conn.commit()
            return {"success": True, "message": f"School '{row['name']}' deleted"}
        finally:
            conn.close()

    # ── Student Management ────────────────────────────────────

    @staticmethod
    def get_school_students(school_id: int, limit: int = 100, offset: int = 0, search: str = "") -> dict:
        """Get students enrolled in a school."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Verify school exists
            cur.execute("SELECT id FROM schools WHERE id = %s", (school_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="School not found")

            # Count total
            base_where = "WHERE school_id = %s"
            params: list = [school_id]
            if search:
                base_where += " AND (name ILIKE %s OR email ILIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])

            cur.execute(f"SELECT COUNT(*) AS cnt FROM users {base_where}", params)
            total = cur.fetchone()["cnt"]

            # Fetch students
            cur.execute(f"""
                SELECT id, name, email, mobile, standard, board, language, xp, plan, 
                       last_active, created_at
                FROM users {base_where}
                ORDER BY name ASC
                LIMIT %s OFFSET %s
            """, params + [limit, offset])
            rows = cur.fetchall()
            students = [row_to_dict(r) for r in rows]

            return {"students": students, "total": total}
        finally:
            conn.close()

    @staticmethod
    def import_students(school_id: int, students: List[dict]) -> dict:
        """Bulk import students into a school."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Get school info
            cur.execute("SELECT id, student_limit, plan FROM schools WHERE id = %s", (school_id,))
            school_row = cur.fetchone()
            if not school_row:
                raise HTTPException(status_code=404, detail="School not found")
            
            student_limit = school_row["student_limit"]

            # Check current student count
            cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
            current_count = cur.fetchone()["cnt"]

            if current_count + len(students) > student_limit:
                raise HTTPException(
                    status_code=400,
                    detail=f"Would exceed student limit ({student_limit}). Current: {current_count}, Importing: {len(students)}"
                )

            # Get school plan for inherited user plan
            school_plan = school_row["plan"]
            user_plan = SCHOOL_TO_USER_PLAN.get(school_plan, "basic")

            created = 0
            skipped = 0
            errors = []

            for i, student in enumerate(students):
                try:
                    name = student.get("name", "").strip()
                    if not name:
                        errors.append(f"Row {i+1}: Name is required")
                        continue

                    email = student.get("email", "").strip().lower()
                    mobile = student.get("mobile", "").strip()

                    # Check for existing user by email or mobile
                    if email:
                        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                        if cur.fetchone():
                            skipped += 1
                            continue
                    if mobile:
                        cur.execute("SELECT id FROM users WHERE mobile = %s", (mobile,))
                        if cur.fetchone():
                            skipped += 1
                            continue

                    # Generate credentials
                    user_id = str(uuid.uuid4())
                    password = _generate_password()
                    password_hash = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

                    cur.execute("""
                        INSERT INTO users (id, name, email, mobile, password_hash, standard, board, language,
                                           school_id, plan, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)
                    """, (
                        user_id,
                        name,
                        email or f"{user_id[:8]}@school.local",
                        mobile,
                        password_hash,
                        student.get("standard", "Class 10"),
                        student.get("board", "CBSE"),
                        student.get("medium", "English"),
                        school_id,
                        user_plan,
                    ))
                    created += 1

                except Exception as e:
                    errors.append(f"Row {i+1}: {str(e)}")

            conn.commit()
            return {"created": created, "skipped": skipped, "errors": errors[:20]}  # Limit error messages
        finally:
            conn.close()

    @staticmethod
    def join_school(user_id: str, school_code: str) -> dict:
        """Student joins a school using school code."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Find school
            cur.execute("""
                SELECT id, name, student_limit, plan, is_active
                FROM schools WHERE school_code = %s
            """, (school_code.upper(),))
            school = cur.fetchone()
            if not school:
                raise HTTPException(status_code=404, detail="Invalid school code")
            
            school_id, school_name, student_limit, school_plan, is_active = (
                school["id"], school["name"], school["student_limit"], school["plan"], school["is_active"]
            )

            if not is_active:
                raise HTTPException(status_code=400, detail="This school is no longer active")

            # Check student limit
            cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
            current_count = cur.fetchone()["cnt"]
            if current_count >= student_limit:
                raise HTTPException(status_code=400, detail="School has reached student limit")

            # Check if user already in a school
            cur.execute("SELECT school_id FROM users WHERE id = %s", (user_id,))
            user_row = cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=404, detail="User not found")
            if user_row["school_id"]:
                raise HTTPException(status_code=400, detail="Already enrolled in a school")

            # Join school and inherit plan
            user_plan = SCHOOL_TO_USER_PLAN.get(school_plan, "basic")
            cur.execute(
                "UPDATE users SET school_id = %s, school = %s, plan = %s WHERE id = %s",
                (school_id, school_name, user_plan, user_id)
            )
            conn.commit()

            return {
                "success": True,
                "school_name": school_name,
                "message": f"Successfully joined {school_name}!"
            }
        finally:
            conn.close()

    # ── Analytics ─────────────────────────────────────────────

    @staticmethod
    def get_school_analytics(school_id: int) -> dict:
        """Get analytics for a school."""
        conn = get_db()
        try:
            cur = conn.cursor()

            # Verify school
            cur.execute("SELECT id FROM schools WHERE id = %s", (school_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="School not found")

            # Total students
            cur.execute("SELECT COUNT(*) AS cnt FROM users WHERE school_id = %s", (school_id,))
            total_students = cur.fetchone()["cnt"]

            # Active in last 7 days
            cur.execute("""
                SELECT COUNT(*) AS cnt FROM users 
                WHERE school_id = %s AND last_active >= CURRENT_DATE - INTERVAL '7 days'
            """, (school_id,))
            active_7d = cur.fetchone()["cnt"]

            # Total AI calls (from ai_usage table)
            cur.execute("""
                SELECT COALESCE(SUM(au.call_count), 0) AS total
                FROM ai_usage au
                JOIN users u ON u.id = au.user_id
                WHERE u.school_id = %s
            """, (school_id,))
            total_ai_calls = cur.fetchone()["total"]

            # Total battles
            cur.execute("""
                SELECT COUNT(*) AS cnt FROM muqabla_battles mb
                JOIN users u ON u.id = mb.challenger_id OR u.id = mb.opponent_id
                WHERE u.school_id = %s
            """, (school_id,))
            total_battles = cur.fetchone()["cnt"]

            # Total study minutes (from sessions)
            cur.execute("""
                SELECT COALESCE(SUM(ss.duration_minutes), 0) AS total
                FROM study_sessions ss
                JOIN users u ON u.id = ss.user_id
                WHERE u.school_id = %s
            """, (school_id,))
            total_minutes = cur.fetchone()["total"] or 0

            # Average mastery
            cur.execute("""
                SELECT COALESCE(AVG(m.score), 50) AS avg
                FROM mastery m
                JOIN users u ON u.id = m.user_id
                WHERE u.school_id = %s
            """, (school_id,))
            avg_mastery = round(cur.fetchone()["avg"] or 50, 1)

            # Top 5 students by XP
            cur.execute("""
                SELECT id, name, xp, standard
                FROM users WHERE school_id = %s
                ORDER BY xp DESC LIMIT 5
            """, (school_id,))
            top_students = [row_to_dict(r) for r in cur.fetchall()]

            return {
                "total_students": total_students,
                "active_students_7d": active_7d,
                "total_ai_calls": total_ai_calls,
                "total_battles": total_battles,
                "total_study_minutes": total_minutes,
                "avg_mastery": avg_mastery,
                "top_students": top_students,
            }
        finally:
            conn.close()

    # ── Billing ───────────────────────────────────────────────

    @staticmethod
    def get_school_plans() -> dict:
        """Get available school plans."""
        return {
            plan: {
                "amount_paise": info["amount"],
                "amount_rupees": info["amount"] // 100,
                "label": info["label"],
                "duration_days": info["duration_days"],
                "student_limit": info["student_limit"],
                "features": info["features"],
            }
            for plan, info in SCHOOL_PLANS.items()
            if plan != "pilot"  # Don't show pilot in paid plans
        }

    @staticmethod
    def upgrade_school_plan(school_id: int, plan: str) -> dict:
        """Upgrade school to a paid plan (after payment verification)."""
        if plan not in SCHOOL_PLANS or plan == "pilot":
            raise HTTPException(status_code=400, detail="Invalid plan")

        plan_info = SCHOOL_PLANS[plan]
        conn = get_db()
        try:
            cur = conn.cursor()

            expiry = datetime.now(timezone.utc) + timedelta(days=plan_info["duration_days"])

            cur.execute("""
                UPDATE schools 
                SET plan = %s, student_limit = %s, plan_expires_at = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (plan, plan_info["student_limit"], expiry.strftime("%Y-%m-%d"), school_id))

            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="School not found")

            # Update all students' plans to match
            user_plan = SCHOOL_TO_USER_PLAN.get(plan, "pro")
            cur.execute(
                "UPDATE users SET plan = %s WHERE school_id = %s",
                (user_plan, school_id)
            )

            conn.commit()
            return SchoolsService.get_school(school_id)
        finally:
            conn.close()
