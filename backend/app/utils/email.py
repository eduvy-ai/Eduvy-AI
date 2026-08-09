"""
Email utility for sending transactional emails via SMTP.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    plain_body: Optional[str] = None,
) -> bool:
    """
    Send an email via SMTP.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.smtp_configured:
        logger.warning("SMTP not configured, skipping email send")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM}>"
        msg["To"] = to_email

        # Plain text fallback
        if plain_body:
            msg.attach(MIMEText(plain_body, "plain"))
        
        # HTML body
        msg.attach(MIMEText(html_body, "html"))

        # Connect and send
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def school_expiry_reminder_html(
    school_name: str,
    days_left: int,
    plan: str,
    renewal_link: str,
) -> str:
    """Generate HTML for school plan expiry reminder."""
    urgency = "⚠️ Urgent: " if days_left <= 3 else ""
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 28px; font-weight: bold; color: #10b981; }}
        .alert {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; }}
        .alert.urgent {{ background: #fee2e2; border-color: #ef4444; }}
        h2 {{ color: #1f2937; margin: 0 0 8px; }}
        p {{ color: #6b7280; line-height: 1.6; }}
        .btn {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Eduvy-AI</div>
        </div>
        
        <div class="alert {'urgent' if days_left <= 3 else ''}">
            <h2>{urgency}Plan Expiring Soon</h2>
            <p>Your <strong>{plan}</strong> plan for <strong>{school_name}</strong> expires in <strong>{days_left} days</strong>.</p>
        </div>
        
        <p>
            To ensure uninterrupted access for your students, please renew your subscription before the expiry date.
        </p>
        
        <p>
            After expiry, student accounts will be downgraded to the free plan with limited features.
        </p>
        
        <div style="text-align: center;">
            <a href="{renewal_link}" class="btn">Renew Now</a>
        </div>
        
        <p style="font-size: 14px; color: #9ca3af;">
            Questions? Reply to this email or contact us at support@eduvy.co.in
        </p>
        
        <div class="footer">
            © 2026 Eduvy-AI. Empowering education with AI.
        </div>
    </div>
</body>
</html>
"""


def school_expiry_reminder_plain(
    school_name: str,
    days_left: int,
    plan: str,
    renewal_link: str,
) -> str:
    """Generate plain text for school plan expiry reminder."""
    return f"""
Eduvy-AI - Plan Expiring Soon

Your {plan} plan for {school_name} expires in {days_left} days.

To ensure uninterrupted access for your students, please renew your subscription before the expiry date.

Renew now: {renewal_link}

After expiry, student accounts will be downgraded to the free plan with limited features.

Questions? Contact us at support@eduvy.co.in

© 2026 Eduvy-AI
"""


def school_admin_welcome_html(
    school_name: str,
    admin_email: str,
    temp_password: str,
    login_url: str = "https://eduvy.co.in/admin",
) -> str:
    """Generate HTML for school admin welcome email."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 28px; font-weight: bold; color: #10b981; }}
        .credentials {{ background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .credentials p {{ margin: 8px 0; }}
        .credentials strong {{ color: #1f2937; }}
        .code {{ font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; }}
        h2 {{ color: #1f2937; margin: 0 0 8px; }}
        p {{ color: #6b7280; line-height: 1.6; }}
        .btn {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }}
        .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 14px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Eduvy-AI</div>
        </div>
        
        <h2>Welcome to Eduvy-AI! 🎉</h2>
        <p>
            Your school admin account for <strong>{school_name}</strong> has been created.
            You can now log in to manage your students and view analytics.
        </p>
        
        <div class="credentials">
            <p><strong>Login URL:</strong> <a href="{login_url}">{login_url}</a></p>
            <p><strong>Email:</strong> <span class="code">{admin_email}</span></p>
            <p><strong>Temporary Password:</strong> <span class="code">{temp_password}</span></p>
        </div>
        
        <div class="warning">
            ⚠️ <strong>Important:</strong> You will be required to change your password on first login.
        </div>
        
        <div style="text-align: center;">
            <a href="{login_url}" class="btn">Login Now</a>
        </div>
        
        <h3 style="margin-top: 24px;">What You Can Do:</h3>
        <ul style="color: #6b7280;">
            <li>View and manage your students</li>
            <li>Import students via CSV</li>
            <li>View school analytics and progress</li>
            <li>Monitor student activity</li>
        </ul>
        
        <p style="font-size: 14px; color: #9ca3af;">
            Need help? Contact us at support@eduvy.co.in
        </p>
        
        <div class="footer">
            © 2026 Eduvy-AI. Empowering education with AI.
        </div>
    </div>
</body>
</html>
"""


def school_admin_welcome_plain(
    school_name: str,
    admin_email: str,
    temp_password: str,
    login_url: str = "https://eduvy.co.in/admin",
) -> str:
    """Generate plain text for school admin welcome email."""
    return f"""
Eduvy-AI - Welcome to Your School Admin Account!

Your school admin account for {school_name} has been created.

LOGIN CREDENTIALS
-----------------
Login URL: {login_url}
Email: {admin_email}
Temporary Password: {temp_password}

IMPORTANT: You will be required to change your password on first login.

WHAT YOU CAN DO:
- View and manage your students
- Import students via CSV
- View school analytics and progress
- Monitor student activity

Need help? Contact us at support@eduvy.co.in

© 2026 Eduvy-AI
"""


def student_welcome_html(
    student_name: str,
    student_email: str,
    temp_password: str,
    school_name: str = None,
    login_url: str = "https://eduvy.co.in",
) -> str:
    """Generate HTML for student welcome email with temporary password."""
    school_text = f" from <strong>{school_name}</strong>" if school_name else ""
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 28px; font-weight: bold; color: #10b981; }}
        .credentials {{ background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }}
        .credentials p {{ margin: 8px 0; }}
        .credentials strong {{ color: #1f2937; }}
        .code {{ font-family: monospace; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 16px; }}
        h2 {{ color: #1f2937; margin: 0 0 8px; }}
        p {{ color: #6b7280; line-height: 1.6; }}
        .btn {{ display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }}
        .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 14px; }}
        .footer {{ text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Eduvy-AI</div>
        </div>
        
        <h2>Welcome to Eduvy-AI, {student_name}! 🎓</h2>
        <p>
            Your student account{school_text} has been created.
            You can now start your personalized AI-powered learning journey!
        </p>
        
        <div class="credentials">
            <p><strong>Your Email:</strong> <span class="code">{student_email}</span></p>
            <p><strong>Temporary Password:</strong> <span class="code">{temp_password}</span></p>
        </div>
        
        <div class="warning">
            ⚠️ <strong>Important:</strong> You will be asked to create a new password when you first log in.
        </div>
        
        <div style="text-align: center;">
            <a href="{login_url}" class="btn">Start Learning</a>
        </div>
        
        <h3 style="margin-top: 24px;">What Awaits You:</h3>
        <ul style="color: #6b7280;">
            <li>📚 AI-powered study assistance</li>
            <li>🎯 Personalized learning paths</li>
            <li>📝 Smart quizzes and assessments</li>
            <li>🏆 Gamified learning with XP and streaks</li>
        </ul>
        
        <p style="font-size: 14px; color: #9ca3af;">
            Need help? Contact us at support@eduvy.co.in
        </p>
        
        <div class="footer">
            © 2026 Eduvy-AI. Empowering education with AI.
        </div>
    </div>
</body>
</html>
"""


def student_welcome_plain(
    student_name: str,
    student_email: str,
    temp_password: str,
    school_name: str = None,
    login_url: str = "https://eduvy.co.in",
) -> str:
    """Generate plain text for student welcome email."""
    school_text = f" from {school_name}" if school_name else ""
    
    return f"""
Eduvy-AI - Welcome, {student_name}!

Your student account{school_text} has been created.

LOGIN CREDENTIALS
-----------------
Email: {student_email}
Temporary Password: {temp_password}

IMPORTANT: You will be asked to create a new password when you first log in.

Login at: {login_url}

WHAT AWAITS YOU:
- AI-powered study assistance
- Personalized learning paths
- Smart quizzes and assessments
- Gamified learning with XP and streaks

Need help? Contact us at support@eduvy.co.in

© 2026 Eduvy-AI
"""
