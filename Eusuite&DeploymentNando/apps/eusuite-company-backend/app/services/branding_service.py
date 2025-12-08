from typing import Optional
import os
import aiofiles
import uuid
from pathlib import Path
from PIL import Image
import io
from app.config import settings


class BrandingService:
    """Service for managing company branding assets."""
    
    def __init__(self):
        self.base_path = Path(settings.branding_assets_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _get_company_path(self, company_id: int) -> Path:
        """Get the path for a company's branding assets."""
        path = self.base_path / str(company_id)
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    async def save_logo(
        self,
        company_id: int,
        file_content: bytes,
        filename: str,
        is_dark: bool = False
    ) -> str:
        """Save a logo file and return the URL."""
        company_path = self._get_company_path(company_id)
        
        # Process image
        image = Image.open(io.BytesIO(file_content))
        
        # Resize if needed (max 512x512)
        max_size = (512, 512)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Generate filename
        ext = Path(filename).suffix.lower() or ".png"
        new_filename = f"logo_dark{ext}" if is_dark else f"logo{ext}"
        file_path = company_path / new_filename
        
        # Save
        output = io.BytesIO()
        image.save(output, format=image.format or "PNG", optimize=True)
        output.seek(0)
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(output.read())
        
        return f"/branding/{company_id}/{new_filename}"
    
    async def save_favicon(self, company_id: int, file_content: bytes, filename: str) -> str:
        """Save a favicon and return the URL."""
        company_path = self._get_company_path(company_id)
        
        # Process image
        image = Image.open(io.BytesIO(file_content))
        
        # Resize to favicon sizes
        image = image.resize((32, 32), Image.Resampling.LANCZOS)
        
        # Save as ICO
        file_path = company_path / "favicon.ico"
        image.save(file_path, format="ICO")
        
        return f"/branding/{company_id}/favicon.ico"
    
    async def save_login_background(
        self,
        company_id: int,
        file_content: bytes,
        filename: str
    ) -> str:
        """Save a login background image and return the URL."""
        company_path = self._get_company_path(company_id)
        
        # Process image
        image = Image.open(io.BytesIO(file_content))
        
        # Resize if too large (max 1920x1080)
        max_size = (1920, 1080)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Generate filename
        ext = Path(filename).suffix.lower() or ".jpg"
        new_filename = f"login_bg{ext}"
        file_path = company_path / new_filename
        
        # Save with compression
        output = io.BytesIO()
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.save(output, format="JPEG", quality=85, optimize=True)
        output.seek(0)
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(output.read())
        
        return f"/branding/{company_id}/{new_filename}"
    
    async def delete_asset(self, company_id: int, asset_type: str) -> bool:
        """Delete a branding asset."""
        company_path = self._get_company_path(company_id)
        
        asset_patterns = {
            "logo": ["logo.*"],
            "logo_dark": ["logo_dark.*"],
            "favicon": ["favicon.ico"],
            "login_background": ["login_bg.*"],
        }
        
        patterns = asset_patterns.get(asset_type, [])
        
        for pattern in patterns:
            for file in company_path.glob(pattern):
                os.remove(file)
                return True
        
        return False
    
    def generate_css_variables(self, branding_config) -> str:
        """Generate CSS variables from branding config."""
        return f"""
        :root {{
            --primary-color: {branding_config.primary_color};
            --secondary-color: {branding_config.secondary_color};
            --accent-color: {branding_config.accent_color or branding_config.secondary_color};
            --background-color: {branding_config.background_color};
            --text-color: {branding_config.text_color};
        }}
        """


branding_service = BrandingService()
