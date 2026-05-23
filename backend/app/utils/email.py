import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from app.core.config import settings
from app.utils.logger import log_info, log_error


async def send_email(
    to_emails: List[str],
    subject: str,
    body: str,
    html: bool = False
) -> bool:
    """Send email using SMTP."""
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject
        
        content_type = "html" if html else "plain"
        msg.attach(MIMEText(body, content_type))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_emails, msg.as_string())
        
        log_info(f"Email sent successfully to {to_emails}")
        return True
    except Exception as e:
        log_error("Failed to send email", e)
        return False


async def send_welcome_email(email: str, name: str) -> bool:
    """Send welcome email to new user."""
    subject = f"Welcome to {settings.APP_NAME}!"
    body = f"""
    <h1>Welcome, {name}!</h1>
    <p>Thank you for joining {settings.APP_NAME}.</p>
    <p>We're excited to have you on board!</p>
    """
    return await send_email([email], subject, body, html=True)


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    """Send password reset email."""
    subject = "Password Reset Request"
    body = f"""
    <h1>Password Reset</h1>
    <p>Click the link below to reset your password:</p>
    <a href="{reset_link}">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
    """
    return await send_email([email], subject, body, html=True)
