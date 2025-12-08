"""
EUSuite Public Backend - Plans Routes
Subscription plans and pricing
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan, PlanType
from ..schemas import PlanResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/plans", tags=["Plans"])


def seed_default_plans(db: Session):
    """Seed default plans if they don't exist."""
    plans_data = [
        {
            "name": "Particulier",
            "slug": "particulier",
            "plan_type": PlanType.PARTICULIER,
            "description": "Gratis voor particulieren. 5GB opslag, alle basis apps.",
            "price_monthly": 0,
            "price_yearly": 0,
            "max_users": 1,
            "max_storage_gb": 5,
            "max_apps": -1,
            "features": [
                "eucloud",
                "eutype", 
                "eumail",
                "eugroups",
                "5gb_storage",
                "basic_support"
            ],
            "is_featured": False
        },
        {
            "name": "Business",
            "slug": "business",
            "plan_type": PlanType.BUSINESS,
            "description": "Voor kleine tot middelgrote bedrijven. Tot 50 gebruikers.",
            "price_monthly": 1499,  # €14.99
            "price_yearly": 14990,  # €149.90 (2 months free)
            "max_users": 50,
            "max_storage_gb": 100,
            "max_apps": -1,
            "features": [
                "eucloud",
                "eutype",
                "eumail",
                "eugroups",
                "100gb_storage",
                "custom_branding",
                "storage_policies",
                "bulk_user_import",
                "priority_support",
                "admin_portal"
            ],
            "is_featured": True
        },
        {
            "name": "Enterprise",
            "slug": "enterprise",
            "plan_type": PlanType.ENTERPRISE,
            "description": "Voor grote organisaties. Onbeperkt gebruikers, dedicated support.",
            "price_monthly": 2999,  # €29.99
            "price_yearly": 29990,  # €299.90 (2 months free)
            "max_users": -1,  # Unlimited
            "max_storage_gb": 1000,
            "max_apps": -1,
            "features": [
                "eucloud",
                "eutype",
                "eumail",
                "eugroups",
                "1tb_storage",
                "custom_branding",
                "storage_policies",
                "bulk_user_import",
                "dedicated_support",
                "admin_portal",
                "isolated_namespace",
                "custom_domain",
                "sla_guarantee",
                "audit_logs",
                "sso_integration",
                "api_access"
            ],
            "is_featured": False
        }
    ]
    
    for plan_data in plans_data:
        existing = db.query(Plan).filter(Plan.slug == plan_data["slug"]).first()
        if not existing:
            plan = Plan(**plan_data)
            db.add(plan)
            logger.info(f"Created plan: {plan_data['name']}")
    
    db.commit()


@router.get("", response_model=List[PlanResponse])
async def get_plans(db: Session = Depends(get_db)):
    """Get all active plans."""
    # Seed plans if needed
    seed_default_plans(db)
    
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    return [PlanResponse(**plan.to_dict()) for plan in plans]


@router.get("/{plan_slug}", response_model=PlanResponse)
async def get_plan(plan_slug: str, db: Session = Depends(get_db)):
    """Get plan by slug."""
    plan = db.query(Plan).filter(Plan.slug == plan_slug, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    
    return PlanResponse(**plan.to_dict())


@router.get("/{plan_slug}/features")
async def get_plan_features(plan_slug: str, db: Session = Depends(get_db)):
    """Get plan features with descriptions."""
    plan = db.query(Plan).filter(Plan.slug == plan_slug, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    
    feature_descriptions = {
        "eucloud": {"name": "EUCloud", "description": "Cloud opslag voor al je bestanden"},
        "eutype": {"name": "EUType", "description": "Document editor"},
        "eumail": {"name": "EUMail", "description": "E-mail service met @eumail.eu adres"},
        "eugroups": {"name": "EUGroups", "description": "Team chat en samenwerking"},
        "5gb_storage": {"name": "5GB Opslag", "description": "5GB cloud opslag per gebruiker"},
        "100gb_storage": {"name": "100GB Opslag", "description": "100GB cloud opslag per gebruiker"},
        "1tb_storage": {"name": "1TB Opslag", "description": "1TB cloud opslag per gebruiker"},
        "basic_support": {"name": "Basis Support", "description": "E-mail support"},
        "priority_support": {"name": "Priority Support", "description": "Snelle e-mail & chat support"},
        "dedicated_support": {"name": "Dedicated Support", "description": "Persoonlijke accountmanager"},
        "custom_branding": {"name": "Custom Branding", "description": "Pas kleuren en logo aan"},
        "storage_policies": {"name": "Storage Policies", "description": "Beheer waar data wordt opgeslagen"},
        "bulk_user_import": {"name": "Bulk Import", "description": "Importeer gebruikers via CSV"},
        "admin_portal": {"name": "Admin Portal", "description": "Beheer je organisatie"},
        "isolated_namespace": {"name": "Geïsoleerde Omgeving", "description": "Eigen Kubernetes namespace"},
        "custom_domain": {"name": "Custom Domain", "description": "Gebruik je eigen domein"},
        "sla_guarantee": {"name": "SLA Garantie", "description": "99.9% uptime garantie"},
        "audit_logs": {"name": "Audit Logs", "description": "Volledige activiteitenlog"},
        "sso_integration": {"name": "SSO Integratie", "description": "SAML/OAuth2 single sign-on"},
        "api_access": {"name": "API Toegang", "description": "REST API voor integraties"}
    }
    
    features = []
    for feature_slug in plan.features:
        if feature_slug in feature_descriptions:
            features.append({
                "slug": feature_slug,
                **feature_descriptions[feature_slug]
            })
    
    return {"features": features}


@router.get("/compare/all")
async def compare_plans(db: Session = Depends(get_db)):
    """Compare all plans side by side."""
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    
    comparison = {
        "plans": [plan.to_dict() for plan in plans],
        "features": [
            {
                "category": "Apps",
                "items": [
                    {"name": "EUCloud", "particulier": True, "business": True, "enterprise": True},
                    {"name": "EUType", "particulier": True, "business": True, "enterprise": True},
                    {"name": "EUMail", "particulier": True, "business": True, "enterprise": True},
                    {"name": "EUGroups", "particulier": True, "business": True, "enterprise": True},
                ]
            },
            {
                "category": "Opslag",
                "items": [
                    {"name": "Opslag per gebruiker", "particulier": "5GB", "business": "100GB", "enterprise": "1TB"},
                    {"name": "Max bestandsgrootte", "particulier": "100MB", "business": "1GB", "enterprise": "10GB"},
                ]
            },
            {
                "category": "Beheer",
                "items": [
                    {"name": "Admin Portal", "particulier": False, "business": True, "enterprise": True},
                    {"name": "Custom Branding", "particulier": False, "business": True, "enterprise": True},
                    {"name": "Bulk User Import", "particulier": False, "business": True, "enterprise": True},
                    {"name": "Storage Policies", "particulier": False, "business": True, "enterprise": True},
                    {"name": "Audit Logs", "particulier": False, "business": False, "enterprise": True},
                ]
            },
            {
                "category": "Support",
                "items": [
                    {"name": "E-mail Support", "particulier": True, "business": True, "enterprise": True},
                    {"name": "Chat Support", "particulier": False, "business": True, "enterprise": True},
                    {"name": "Dedicated Manager", "particulier": False, "business": False, "enterprise": True},
                    {"name": "SLA Garantie", "particulier": False, "business": False, "enterprise": True},
                ]
            },
            {
                "category": "Geavanceerd",
                "items": [
                    {"name": "Geïsoleerde Namespace", "particulier": False, "business": False, "enterprise": True},
                    {"name": "Custom Domain", "particulier": False, "business": False, "enterprise": True},
                    {"name": "SSO Integratie", "particulier": False, "business": False, "enterprise": True},
                    {"name": "API Toegang", "particulier": False, "business": False, "enterprise": True},
                ]
            }
        ]
    }
    
    return comparison
