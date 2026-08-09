"""
School expiry reminder service.

This module checks for schools with expiring plans and sends reminder emails.
Can be run as a daily cron job or scheduled task.

Usage:
    python -m app.services.expiry_reminders

Or call from FastAPI startup/background:
    asyncio.create_task(run_expiry_check())
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.db.connection import get_db
from app.utils.email import (
    send_email,
    school_expiry_reminder_html,
    school_expiry_reminder_plain,
)

logger = logging.getLogger(__name__)

# Days before expiry to send reminders
REMINDER_DAYS = [14, 7, 3, 1]

# Admin portal URL for renewal
ADMIN_PORTAL_URL = "https://eduvy.co.in/admin/schools"


async def get_expiring_schools(days: int) -> List[Dict[str, Any]]:
    """Get schools expiring within N days."""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Get schools expiring in exactly N days (for daily cron)
            target_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
            
            cur.execute("""
                SELECT id, name, contact_email, plan, plan_expires_at, student_count
                FROM schools
                WHERE plan != 'pilot'
                  AND contact_email IS NOT NULL
                  AND contact_email != ''
                  AND plan_expires_at::date = %s
            """, (target_date,))
            
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


async def send_expiry_reminders() -> Dict[str, int]:
    """
    Send expiry reminder emails for all reminder intervals.
    Returns dict with counts: {sent: N, failed: N, skipped: N}
    """
    result = {"sent": 0, "failed": 0, "skipped": 0}
    
    for days in REMINDER_DAYS:
        schools = await get_expiring_schools(days)
        logger.info(f"Found {len(schools)} schools expiring in {days} days")
        
        for school in schools:
            if not school.get("contact_email"):
                result["skipped"] += 1
                continue
            
            plan_label = {
                "school_basic": "School Basic",
                "school_pro": "School Pro",
            }.get(school["plan"], school["plan"])
            
            html = school_expiry_reminder_html(
                school_name=school["name"],
                days_left=days,
                plan=plan_label,
                renewal_link=ADMIN_PORTAL_URL,
            )
            
            plain = school_expiry_reminder_plain(
                school_name=school["name"],
                days_left=days,
                plan=plan_label,
                renewal_link=ADMIN_PORTAL_URL,
            )
            
            subject = f"{'⚠️ ' if days <= 3 else ''}Your Eduvy-AI plan expires in {days} days"
            
            success = await send_email(
                to_email=school["contact_email"],
                subject=subject,
                html_body=html,
                plain_body=plain,
            )
            
            if success:
                result["sent"] += 1
                logger.info(f"Sent reminder to {school['name']} ({school['contact_email']})")
            else:
                result["failed"] += 1
                logger.warning(f"Failed to send reminder to {school['name']}")
    
    return result


async def run_expiry_check():
    """Main entry point for expiry check."""
    logger.info("Starting school expiry check...")
    result = await send_expiry_reminders()
    logger.info(f"Expiry check complete: {result}")
    return result


# CLI entry point
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_expiry_check())
