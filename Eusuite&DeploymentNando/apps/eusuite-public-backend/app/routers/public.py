"""
EUSuite Public Backend - Public Routes
Public endpoints for marketing website (no auth required)
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ContactForm, NewsletterSubscribe, BaseResponse
from ..services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/stats")
async def get_public_stats(db: Session = Depends(get_db)):
    """Get public statistics for marketing."""
    # These would be real stats in production
    return {
        "total_users": 10000,
        "total_companies": 500,
        "total_files_stored": "50TB",
        "uptime_percentage": 99.9,
        "countries_served": 25
    }


@router.post("/contact", response_model=BaseResponse)
async def submit_contact_form(
    data: ContactForm,
    background_tasks: BackgroundTasks
):
    """Submit contact form."""
    logger.info(f"Contact form submitted by {data.email}: {data.subject}")
    
    # Send email to support team
    html = f"""
    <h2>Nieuw contactformulier</h2>
    <p><strong>Naam:</strong> {data.name}</p>
    <p><strong>E-mail:</strong> {data.email}</p>
    <p><strong>Bedrijf:</strong> {data.company or 'N/A'}</p>
    <p><strong>Onderwerp:</strong> {data.subject}</p>
    <hr>
    <p>{data.message}</p>
    """
    
    background_tasks.add_task(
        email_service.send_email,
        "support@eusuite.eu",
        f"Contact: {data.subject}",
        html
    )
    
    return BaseResponse(success=True, message="Bericht verzonden! We nemen zo snel mogelijk contact op.")


@router.post("/newsletter", response_model=BaseResponse)
async def subscribe_newsletter(data: NewsletterSubscribe):
    """Subscribe to newsletter."""
    logger.info(f"Newsletter subscription: {data.email}")
    
    # In production, integrate with email marketing service (Mailchimp, etc.)
    
    return BaseResponse(success=True, message="Bedankt voor je aanmelding!")


@router.get("/faq")
async def get_faq():
    """Get frequently asked questions."""
    return {
        "faq": [
            {
                "question": "Wat is EUSuite?",
                "answer": "EUSuite is een complete cloud werkruimte met opslag, e-mail, documenten en samenwerking - volledig gemaakt in Europa."
            },
            {
                "question": "Is het gratis te gebruiken?",
                "answer": "Ja! Particulieren kunnen EUSuite gratis gebruiken met 5GB opslag en alle basis functionaliteiten."
            },
            {
                "question": "Waar worden mijn gegevens opgeslagen?",
                "answer": "Al je gegevens worden opgeslagen in beveiligde datacenters binnen de Europese Unie."
            },
            {
                "question": "Kan ik overstappen van Google/Microsoft?",
                "answer": "Ja, we bieden migratietools om je data eenvoudig over te zetten naar EUSuite."
            },
            {
                "question": "Wat is het verschil tussen Business en Enterprise?",
                "answer": "Enterprise biedt geïsoleerde infrastructuur, custom domains, SLA garanties en dedicated support voor grote organisaties."
            },
            {
                "question": "Hoe veilig is EUSuite?",
                "answer": "EUSuite gebruikt end-to-end encryptie, 2FA, en voldoet aan AVG/GDPR regelgeving."
            },
            {
                "question": "Kan mijn bedrijf eigen branding gebruiken?",
                "answer": "Ja, met Business en Enterprise kun je je eigen logo's, kleuren en zelfs custom domains gebruiken."
            },
            {
                "question": "Hoe kan ik gebruikers toevoegen?",
                "answer": "Via de Admin Portal kun je individueel gebruikers toevoegen of een CSV bestand importeren."
            }
        ]
    }


@router.get("/testimonials")
async def get_testimonials():
    """Get customer testimonials."""
    return {
        "testimonials": [
            {
                "name": "Jan de Vries",
                "company": "TechStart BV",
                "role": "CEO",
                "content": "EUSuite heeft ons geholpen om volledig GDPR-compliant te werken. De migratie van Google Workspace was verrassend eenvoudig.",
                "avatar": None
            },
            {
                "name": "Maria Bakker",
                "company": "Onderwijs Innovatie",
                "role": "IT Manager",
                "content": "Voor onze school is EUSuite perfect. Leerlingen en docenten hebben een veilige omgeving en we houden controle over de data.",
                "avatar": None
            },
            {
                "name": "Peter Jansen",
                "role": "Freelancer",
                "content": "Als freelancer gebruik ik de gratis versie. 5GB is genoeg voor mijn projecten en de apps werken geweldig.",
                "avatar": None
            }
        ]
    }


@router.get("/features")
async def get_features():
    """Get feature overview."""
    return {
        "features": [
            {
                "name": "EUCloud",
                "icon": "cloud",
                "description": "Veilige cloud opslag voor al je bestanden",
                "highlights": ["Drag & drop upload", "Delen & samenwerken", "Versiegeschiedenis", "Offline toegang"]
            },
            {
                "name": "EUType",
                "icon": "document",
                "description": "Krachtige document editor",
                "highlights": ["Realtime samenwerken", "Templates", "Export naar PDF/DOCX", "Commentaren"]
            },
            {
                "name": "EUMail",
                "icon": "mail",
                "description": "Professionele e-mail service",
                "highlights": ["@eumail.eu adres", "Spam filtering", "Kalender integratie", "Mobile apps"]
            },
            {
                "name": "EUGroups",
                "icon": "users",
                "description": "Team communicatie & samenwerking",
                "highlights": ["Chat kanalen", "Video calls", "Kanban borden", "Bestandsdeling"]
            }
        ]
    }


@router.get("/security")
async def get_security_info():
    """Get security information."""
    return {
        "certifications": [
            "ISO 27001",
            "SOC 2 Type II",
            "GDPR Compliant"
        ],
        "features": [
            {
                "name": "End-to-end Encryptie",
                "description": "Al je data wordt versleuteld met AES-256"
            },
            {
                "name": "Twee-Factor Authenticatie",
                "description": "Extra beveiliging met 2FA via app of SMS"
            },
            {
                "name": "EU Data Residency",
                "description": "Je data blijft altijd binnen de Europese Unie"
            },
            {
                "name": "Audit Logging",
                "description": "Volledige audit trail van alle activiteiten"
            },
            {
                "name": "Zero-Knowledge Optie",
                "description": "Client-side encryptie voor maximale privacy"
            }
        ],
        "compliance": {
            "gdpr": True,
            "hipaa_ready": True,
            "soc2": True
        }
    }
