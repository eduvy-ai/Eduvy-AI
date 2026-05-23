"""
Email background tasks.
"""
from app.utils.email import send_welcome_email, send_password_reset_email
from app.utils.logger import log_info, log_error


async def send_welcome_email_task(email: str, name: str):
    """Background task to send welcome email."""
    try:
        await send_welcome_email(email, name)
        log_info(f"Welcome email sent to {email}")
    except Exception as e:
        log_error(f"Failed to send welcome email to {email}", e)


async def send_password_reset_task(email: str, reset_link: str):
    """Background task to send password reset email."""
    try:
        await send_password_reset_email(email, reset_link)
        log_info(f"Password reset email sent to {email}")
    except Exception as e:
        log_error(f"Failed to send password reset email to {email}", e)


async def send_order_confirmation_task(email: str, order_id: str):
    """Background task to send order confirmation email."""
    from app.utils.email import send_email
    try:
        subject = "Order Confirmation"
        body = f"""
        <h1>Order Confirmed!</h1>
        <p>Your order #{order_id} has been confirmed.</p>
        <p>Thank you for your purchase!</p>
        """
        await send_email([email], subject, body, html=True)
        log_info(f"Order confirmation email sent to {email}")
    except Exception as e:
        log_error(f"Failed to send order confirmation email to {email}", e)
