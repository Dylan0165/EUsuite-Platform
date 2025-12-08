"""
EUAdmin Backend - Branding API Routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..tenant_database import get_tenant_db
from ..services.branding_engine import BrandingEngine, DEFAULT_BRANDING
from ..schemas_tenant import (
    CompanyBrandingCreate, CompanyBrandingResponse, BrandingJsonResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Branding"])


def get_branding_engine(db: Session = Depends(get_tenant_db)) -> BrandingEngine:
    return BrandingEngine(db)


@router.get("/companies/{company_id}/branding", response_model=CompanyBrandingResponse)
async def get_branding(
    company_id: int,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """Get branding configuration for a company."""
    branding = engine.get_branding(company_id)
    if not branding:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    return CompanyBrandingResponse(**branding.__dict__)


@router.put("/companies/{company_id}/branding", response_model=CompanyBrandingResponse)
async def update_branding(
    company_id: int,
    data: CompanyBrandingCreate,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """Update branding configuration for a company."""
    branding = engine.update_branding(
        company_id=company_id,
        company_display_name=data.company_display_name,
        tagline=data.tagline,
        logo_url=data.logo_url,
        logo_dark_url=data.logo_dark_url,
        favicon_url=data.favicon_url,
        header_logo_url=data.header_logo_url,
        login_background_url=data.login_background_url,
        colors=data.colors.dict() if data.colors else None,
        typography=data.typography.dict() if data.typography else None,
        custom_css=data.custom_css,
        login=data.login.dict() if data.login else None,
        footer=data.footer.dict() if data.footer else None,
        social_links=data.social_links,
    )
    
    if not branding:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyBrandingResponse(**branding.__dict__)


@router.post("/companies/{company_id}/branding/reset", response_model=CompanyBrandingResponse)
async def reset_branding(
    company_id: int,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """Reset branding to defaults."""
    branding = engine.reset_branding(company_id)
    if not branding:
        raise HTTPException(status_code=404, detail="Branding not found")
    
    return CompanyBrandingResponse(**branding.__dict__)


@router.get("/companies/{company_id}/branding.json")
async def get_branding_json(
    company_id: int,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """
    Get branding as JSON for frontend runtime injection.
    This endpoint is called by frontends to dynamically load branding.
    """
    branding_json = engine.get_branding_json(company_id)
    return JSONResponse(content=branding_json)


@router.get("/companies/{company_id}/branding.css")
async def get_branding_css(
    company_id: int,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """
    Get CSS variables for branding injection.
    Can be included as <link> in HTML.
    """
    css = engine.generate_css_variables(company_id)
    return JSONResponse(
        content=css,
        media_type="text/css",
    )


# Namespace-based branding endpoints (for tenant apps)
@router.get("/branding/{namespace}/branding.json")
async def get_namespace_branding_json(
    namespace: str,
    engine: BrandingEngine = Depends(get_branding_engine),
):
    """
    Get branding JSON by namespace.
    Used by tenant apps to load branding at runtime.
    """
    branding_json = engine.get_branding_json_by_namespace(namespace)
    return JSONResponse(content=branding_json)


@router.get("/branding/default")
async def get_default_branding():
    """Get default EUSuite branding."""
    return JSONResponse(content=DEFAULT_BRANDING)
