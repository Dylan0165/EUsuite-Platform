"""
EUAdmin Backend - Branding Engine Service
Handles company branding configuration and runtime injection.
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from ..models import CompanyBranding, Company

logger = logging.getLogger(__name__)


# Default EUSuite branding
DEFAULT_BRANDING = {
    "companyName": "EUSuite",
    "tagline": "Your Complete Digital Workspace",
    "logo": "/assets/logo.svg",
    "logoDark": "/assets/logo-dark.svg",
    "favicon": "/favicon.ico",
    "headerLogo": "/assets/logo-header.svg",
    "loginBackground": None,
    "colors": {
        "primary": "#1E40AF",
        "secondary": "#3B82F6",
        "accent": "#60A5FA",
        "background": "#F3F4F6",
        "text": "#1F2937",
        "headerBg": "#1E40AF",
        "headerText": "#FFFFFF",
        "sidebarBg": "#1F2937",
        "sidebarText": "#F9FAFB",
    },
    "typography": {
        "fontFamily": "Inter, sans-serif",
        "headingFontFamily": None,
    },
    "customCss": None,
    "login": {
        "title": "Welcome to EUSuite",
        "subtitle": "Sign in to your account",
        "welcomeMessage": None,
    },
    "footer": {
        "text": "© 2025 EUSuite. All rights reserved.",
        "links": [],
    },
    "socialLinks": {},
}


class BrandingEngine:
    """Service for managing company branding."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_branding(self, company_id: int) -> Optional[CompanyBranding]:
        """Get branding for a company."""
        return self.db.query(CompanyBranding).filter(
            CompanyBranding.company_id == company_id
        ).first()
    
    def get_branding_by_namespace(self, namespace: str) -> Optional[CompanyBranding]:
        """Get branding by Kubernetes namespace."""
        company = self.db.query(Company).filter(Company.namespace == namespace).first()
        if not company:
            return None
        return self.get_branding(company.id)
    
    def get_branding_json(self, company_id: int) -> Dict[str, Any]:
        """Get branding as JSON for frontend injection."""
        branding = self.get_branding(company_id)
        if not branding:
            return DEFAULT_BRANDING.copy()
        
        return branding.to_branding_json()
    
    def get_branding_json_by_namespace(self, namespace: str) -> Dict[str, Any]:
        """Get branding JSON by namespace for runtime injection."""
        # Check for central cloud namespace
        if namespace == "eucloud":
            return DEFAULT_BRANDING.copy()
        
        company = self.db.query(Company).filter(Company.namespace == namespace).first()
        if not company:
            return DEFAULT_BRANDING.copy()
        
        return self.get_branding_json(company.id)
    
    def update_branding(
        self,
        company_id: int,
        company_display_name: Optional[str] = None,
        tagline: Optional[str] = None,
        logo_url: Optional[str] = None,
        logo_dark_url: Optional[str] = None,
        favicon_url: Optional[str] = None,
        header_logo_url: Optional[str] = None,
        login_background_url: Optional[str] = None,
        colors: Optional[Dict[str, str]] = None,
        typography: Optional[Dict[str, str]] = None,
        custom_css: Optional[str] = None,
        login: Optional[Dict[str, str]] = None,
        footer: Optional[Dict[str, Any]] = None,
        social_links: Optional[Dict[str, str]] = None,
    ) -> Optional[CompanyBranding]:
        """Update company branding."""
        branding = self.get_branding(company_id)
        if not branding:
            # Create new branding
            branding = CompanyBranding(company_id=company_id)
            self.db.add(branding)
        
        # Update basic fields
        if company_display_name is not None:
            branding.company_display_name = company_display_name
        if tagline is not None:
            branding.tagline = tagline
        if logo_url is not None:
            branding.logo_url = logo_url
        if logo_dark_url is not None:
            branding.logo_dark_url = logo_dark_url
        if favicon_url is not None:
            branding.favicon_url = favicon_url
        if header_logo_url is not None:
            branding.header_logo_url = header_logo_url
        if login_background_url is not None:
            branding.login_background_url = login_background_url
        if custom_css is not None:
            branding.custom_css = custom_css
        
        # Update colors
        if colors:
            if 'primary' in colors:
                branding.primary_color = colors['primary']
            if 'secondary' in colors:
                branding.secondary_color = colors['secondary']
            if 'accent' in colors:
                branding.accent_color = colors['accent']
            if 'background' in colors:
                branding.background_color = colors['background']
            if 'text' in colors:
                branding.text_color = colors['text']
            if 'headerBg' in colors:
                branding.header_bg_color = colors['headerBg']
            if 'headerText' in colors:
                branding.header_text_color = colors['headerText']
            if 'sidebarBg' in colors:
                branding.sidebar_bg_color = colors['sidebarBg']
            if 'sidebarText' in colors:
                branding.sidebar_text_color = colors['sidebarText']
        
        # Update typography
        if typography:
            if 'fontFamily' in typography:
                branding.font_family = typography['fontFamily']
            if 'headingFontFamily' in typography:
                branding.heading_font_family = typography['headingFontFamily']
        
        # Update login settings
        if login:
            if 'title' in login:
                branding.login_title = login['title']
            if 'subtitle' in login:
                branding.login_subtitle = login['subtitle']
            if 'welcomeMessage' in login:
                branding.login_welcome_message = login['welcomeMessage']
        
        # Update footer
        if footer:
            if 'text' in footer:
                branding.footer_text = footer['text']
            if 'links' in footer:
                branding.footer_links = footer['links']
        
        # Update social links
        if social_links is not None:
            branding.social_links = social_links
        
        branding.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(branding)
        
        logger.info(f"Updated branding for company: {company_id}")
        return branding
    
    def reset_branding(self, company_id: int) -> Optional[CompanyBranding]:
        """Reset branding to defaults."""
        branding = self.get_branding(company_id)
        if not branding:
            return None
        
        company = self.db.query(Company).filter(Company.id == company_id).first()
        
        branding.company_display_name = company.name if company else "Company"
        branding.tagline = None
        branding.logo_url = None
        branding.logo_dark_url = None
        branding.favicon_url = None
        branding.header_logo_url = None
        branding.login_background_url = None
        branding.primary_color = "#1E40AF"
        branding.secondary_color = "#3B82F6"
        branding.accent_color = "#60A5FA"
        branding.background_color = "#F3F4F6"
        branding.text_color = "#1F2937"
        branding.header_bg_color = "#1E40AF"
        branding.header_text_color = "#FFFFFF"
        branding.sidebar_bg_color = "#1F2937"
        branding.sidebar_text_color = "#F9FAFB"
        branding.font_family = "Inter, sans-serif"
        branding.heading_font_family = None
        branding.custom_css = None
        branding.login_title = None
        branding.login_subtitle = None
        branding.login_welcome_message = None
        branding.footer_text = None
        branding.footer_links = None
        branding.social_links = None
        branding.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(branding)
        
        logger.info(f"Reset branding for company: {company_id}")
        return branding
    
    def generate_css_variables(self, company_id: int) -> str:
        """Generate CSS variables string for runtime injection."""
        branding = self.get_branding(company_id)
        if not branding:
            branding_json = DEFAULT_BRANDING
        else:
            branding_json = branding.to_branding_json()
        
        colors = branding_json.get('colors', {})
        typography = branding_json.get('typography', {})
        
        css = f"""
:root {{
  --color-primary: {colors.get('primary', '#1E40AF')};
  --color-secondary: {colors.get('secondary', '#3B82F6')};
  --color-accent: {colors.get('accent', '#60A5FA')};
  --color-background: {colors.get('background', '#F3F4F6')};
  --color-text: {colors.get('text', '#1F2937')};
  --color-header-bg: {colors.get('headerBg', '#1E40AF')};
  --color-header-text: {colors.get('headerText', '#FFFFFF')};
  --color-sidebar-bg: {colors.get('sidebarBg', '#1F2937')};
  --color-sidebar-text: {colors.get('sidebarText', '#F9FAFB')};
  --font-family: {typography.get('fontFamily', 'Inter, sans-serif')};
  --heading-font-family: {typography.get('headingFontFamily') or typography.get('fontFamily', 'Inter, sans-serif')};
}}
"""
        
        # Add custom CSS if present
        if branding and branding.custom_css:
            css += f"\n/* Custom CSS */\n{branding.custom_css}"
        
        return css.strip()
