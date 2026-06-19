"""
Gmail sender using SMTP + App Password.
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()


def send_email(to_email: str, subject: str, body: str,
               gmail_user: str = None, gmail_app_password: str = None) -> bool:
    """
    Send an email via Gmail SMTP.
    Returns True on success, False on failure.
    """
    user     = gmail_user         or os.getenv("GMAIL_USER")
    password = gmail_app_password or os.getenv("GMAIL_APP_PASSWORD")

    if not user or not password:
        print("[Sender] Gmail credentials not configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = user
        msg["To"]      = to_email

        # Plain text + HTML versions
        plain_body = body.replace("<br>", "\n").replace("<br/>", "\n")
        html_body  = f"""
        <html><body style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #222;">
            <p>{body.replace(chr(10), '<br>')}</p>
        </body></html>
        """

        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body,  "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(user, password)
            server.sendmail(user, to_email, msg.as_string())

        print(f"[Sender] Email sent to {to_email}")
        return True

    except Exception as e:
        print(f"[Sender] Failed to send to {to_email}: {e}")
        return False
