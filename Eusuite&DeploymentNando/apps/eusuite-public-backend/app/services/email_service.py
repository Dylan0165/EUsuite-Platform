"""
EUSuite Public Backend - Email Service
Email sending for verification, password reset, and notifications
"""
import logging
from typing import Optional, List
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, PackageLoader, select_autoescape

from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Jinja2 environment for email templates
try:
    jinja_env = Environment(
        loader=PackageLoader("app", "templates"),
        autoescape=select_autoescape(["html", "xml"])
    )
except Exception:
    jinja_env = None


class EmailService:
    """Email sending service."""
    
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """Send an email."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to
            
            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)
            
            # Add plain text part
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            
            # Add HTML part
            msg.attach(MIMEText(html_content, "html"))
            
            # Send
            await aiosmtplib.send(
                msg,
                hostname=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                use_tls=True
            )
            
            logger.info(f"Email sent to {to}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False
    
    async def send_verification_email(self, email: str, token: str, name: str) -> bool:
        """Send email verification."""
        verification_url = f"{settings.PUBLIC_URL}/verify-email?token={token}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #166534 0%, #065f46 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
                .button {{ display: inline-block; background: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">EUSuite</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Verifieer je e-mailadres</p>
                </div>
                <div class="content">
                    <h2>Hallo {name}! 👋</h2>
                    <p>Bedankt voor je registratie bij EUSuite. Klik op de onderstaande knop om je e-mailadres te verifiëren:</p>
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verifieer E-mail</a>
                    </div>
                    <p>Of kopieer deze link:</p>
                    <p style="background: #f1f5f9; padding: 10px; border-radius: 4px; word-break: break-all;">{verification_url}</p>
                    <p>Deze link is 24 uur geldig.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 EUSuite. Alle rechten voorbehouden.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to=email,
            subject="Verifieer je EUSuite account",
            html_content=html,
            text_content=f"Hallo {name}, verifieer je account via: {verification_url}"
        )
    
    async def send_password_reset_email(self, email: str, token: str, name: str) -> bool:
        """Send password reset email."""
        reset_url = f"{settings.PUBLIC_URL}/reset-password?token={token}"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #166534 0%, #065f46 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
                .button {{ display: inline-block; background: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 14px; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">EUSuite</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Wachtwoord herstellen</p>
                </div>
                <div class="content">
                    <h2>Hallo {name},</h2>
                    <p>We hebben een verzoek ontvangen om je wachtwoord te resetten. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Wachtwoord</a>
                    </div>
                    <div class="warning">
                        ⚠️ Als je dit niet hebt aangevraagd, kun je deze e-mail negeren. Je wachtwoord blijft ongewijzigd.
                    </div>
                    <p>Deze link is 1 uur geldig.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 EUSuite. Alle rechten voorbehouden.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to=email,
            subject="Reset je EUSuite wachtwoord",
            html_content=html,
            text_content=f"Hallo {name}, reset je wachtwoord via: {reset_url}"
        )
    
    async def send_company_registration_email(
        self, 
        email: str, 
        company_name: str, 
        admin_name: str
    ) -> bool:
        """Send company registration confirmation."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #166534 0%, #065f46 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 14px; }}
                .status {{ background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">EUSuite</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Bedrijfsregistratie ontvangen</p>
                </div>
                <div class="content">
                    <h2>Hallo {admin_name}! 🎉</h2>
                    <p>Bedankt voor het registreren van <strong>{company_name}</strong> bij EUSuite.</p>
                    
                    <div class="status">
                        <strong>Status: In behandeling</strong><br>
                        Je registratie wordt momenteel beoordeeld door ons team.
                    </div>
                    
                    <p><strong>Wat gebeurt er nu?</strong></p>
                    <ol>
                        <li>Ons team beoordeelt je registratie (meestal binnen 24 uur)</li>
                        <li>Je ontvangt een e-mail zodra je account is goedgekeurd</li>
                        <li>Daarna kun je direct aan de slag met EUSuite!</li>
                    </ol>
                    
                    <p>Heb je vragen? Neem gerust contact met ons op via support@eusuite.eu</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 EUSuite. Alle rechten voorbehouden.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to=email,
            subject=f"Registratie ontvangen: {company_name}",
            html_content=html
        )
    
    async def send_company_approval_email(
        self,
        email: str,
        company_name: str,
        admin_name: str,
        login_url: str
    ) -> bool:
        """Send company approval notification."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #166534 0%, #065f46 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
                .button {{ display: inline-block; background: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 14px; }}
                .success {{ background: #dcfce7; border: 1px solid #22c55e; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; color: #166534; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">EUSuite</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Account goedgekeurd! 🎉</p>
                </div>
                <div class="content">
                    <h2>Hallo {admin_name}!</h2>
                    
                    <div class="success">
                        ✅ <strong>{company_name}</strong> is goedgekeurd!
                    </div>
                    
                    <p>Geweldig nieuws! Je bedrijfsaccount is goedgekeurd en je kunt nu aan de slag met EUSuite.</p>
                    
                    <div style="text-align: center;">
                        <a href="{login_url}" class="button">Log in op Company Portal</a>
                    </div>
                    
                    <p><strong>Wat kun je nu doen?</strong></p>
                    <ul>
                        <li>Gebruikers toevoegen aan je organisatie</li>
                        <li>Branding instellen voor je bedrijf</li>
                        <li>Storage policies configureren</li>
                        <li>EUSuite apps uitrollen</li>
                    </ul>
                    
                    <p>Welkom bij EUSuite! 🚀</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 EUSuite. Alle rechten voorbehouden.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to=email,
            subject=f"✅ {company_name} is goedgekeurd!",
            html_content=html
        )
    
    async def send_welcome_particulier_email(self, email: str, name: str) -> bool:
        """Send welcome email to individual user."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #166534 0%, #065f46 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #fff; padding: 30px; border: 1px solid #e2e8f0; }}
                .button {{ display: inline-block; background: #166534; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 14px; }}
                .feature {{ background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">Welkom bij EUSuite! 🎉</h1>
                </div>
                <div class="content">
                    <h2>Hallo {name}!</h2>
                    <p>Welkom bij EUSuite - je persoonlijke cloud werkruimte.</p>
                    
                    <div class="feature">
                        <strong>☁️ EUCloud</strong> - 5GB gratis opslag voor al je bestanden
                    </div>
                    <div class="feature">
                        <strong>📝 EUType</strong> - Documenten maken en bewerken
                    </div>
                    <div class="feature">
                        <strong>📧 EUMail</strong> - Je eigen @eumail.eu e-mailadres
                    </div>
                    <div class="feature">
                        <strong>👥 EUGroups</strong> - Samenwerken in teams
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{settings.PUBLIC_URL}/dashboard" class="button">Ga naar Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2024 EUSuite. Alle rechten voorbehouden.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to=email,
            subject="Welkom bij EUSuite! 🎉",
            html_content=html
        )


# Singleton instance
email_service = EmailService()
