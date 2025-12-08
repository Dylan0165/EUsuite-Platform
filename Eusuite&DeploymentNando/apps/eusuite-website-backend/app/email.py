import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from .config import get_settings

settings = get_settings()

VERIFICATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">☁️ EUSuite</div>
        </div>
        <div class="content">
            <h2>Welkom bij EUSuite, {{ first_name }}!</h2>
            <p>Bedankt voor het registreren van <strong>{{ company_name }}</strong> bij EUSuite.</p>
            <p>Klik op onderstaande knop om je e-mailadres te verifiëren en je account te activeren:</p>
            <p style="text-align: center;">
                <a href="{{ verification_url }}" class="button">Verifieer E-mail</a>
            </p>
            <p>Of kopieer deze link naar je browser:</p>
            <p style="word-break: break-all; background: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 14px;">
                {{ verification_url }}
            </p>
            <p>Deze link is 24 uur geldig.</p>
        </div>
        <div class="footer">
            <p>Je ontvangt deze e-mail omdat je een account hebt aangemaakt bij EUSuite.</p>
            <p>© {{ year }} EUSuite. Alle rechten voorbehouden.</p>
        </div>
    </div>
</body>
</html>
"""

WELCOME_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
        .feature { display: flex; align-items: center; margin: 16px 0; }
        .feature-icon { font-size: 24px; margin-right: 12px; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">☁️ EUSuite</div>
        </div>
        <div class="content">
            <h2>🎉 Je account is klaar!</h2>
            <p>Gefeliciteerd {{ first_name }}! Je bedrijf <strong>{{ company_name }}</strong> is succesvol aangemaakt.</p>
            
            <h3>Je kunt nu inloggen:</h3>
            <p style="text-align: center;">
                <a href="{{ portal_url }}" class="button">Naar Company Portal</a>
            </p>
            
            <h3>Wat je nu kunt doen:</h3>
            <div class="feature">
                <span class="feature-icon">👥</span>
                <span>Nodig teamleden uit om samen te werken</span>
            </div>
            <div class="feature">
                <span class="feature-icon">☁️</span>
                <span>Start met EUCloud voor bestandsopslag</span>
            </div>
            <div class="feature">
                <span class="feature-icon">📧</span>
                <span>Stel EUMail in voor zakelijke e-mail</span>
            </div>
            <div class="feature">
                <span class="feature-icon">📹</span>
                <span>Plan je eerste videocall met EUGroups</span>
            </div>
            
            <h3>Je inloggegevens:</h3>
            <ul>
                <li><strong>Portal:</strong> {{ portal_url }}</li>
                <li><strong>E-mail:</strong> {{ email }}</li>
                <li><strong>Subdomein:</strong> {{ company_slug }}.eusuite.eu</li>
            </ul>
        </div>
        <div class="footer">
            <p>Vragen? Neem contact op via support@eusuite.eu</p>
            <p>© {{ year }} EUSuite. Alle rechten voorbehouden.</p>
        </div>
    </div>
</body>
</html>
"""


async def send_email(to: str, subject: str, html_content: str):
    """Send an email"""
    if not settings.smtp_host or settings.smtp_host == "localhost":
        # Development mode - just log
        print(f"[EMAIL] To: {to}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Would send email (SMTP not configured)")
        return
    
    message = MIMEMultipart("alternative")
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )


async def send_verification_email(
    to: str,
    first_name: str,
    company_name: str,
    verification_token: str
):
    """Send email verification"""
    from datetime import datetime
    
    verification_url = f"https://eusuite.eu/verify?token={verification_token}"
    
    template = Template(VERIFICATION_EMAIL_TEMPLATE)
    html = template.render(
        first_name=first_name,
        company_name=company_name,
        verification_url=verification_url,
        year=datetime.now().year,
    )
    
    await send_email(
        to=to,
        subject="Verifieer je EUSuite account",
        html_content=html,
    )


async def send_welcome_email(
    to: str,
    first_name: str,
    company_name: str,
    company_slug: str,
):
    """Send welcome email after successful provisioning"""
    from datetime import datetime
    
    portal_url = f"{settings.company_portal_url}/login?company={company_slug}"
    
    template = Template(WELCOME_EMAIL_TEMPLATE)
    html = template.render(
        first_name=first_name,
        company_name=company_name,
        company_slug=company_slug,
        email=to,
        portal_url=portal_url,
        year=datetime.now().year,
    )
    
    await send_email(
        to=to,
        subject="🎉 Welkom bij EUSuite - Je account is klaar!",
        html_content=html,
    )
