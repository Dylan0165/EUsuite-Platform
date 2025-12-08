"""
Shared EUSuite App Configuration
Contains all Docker images and app definitions from platform-main
"""

from typing import Dict, Any

# EUSUITE Applications - Dylan's Office 365 Suite
# All Docker images from dylan016504 DockerHub

EUSUITE_APPS: Dict[str, Dict[str, Any]] = {
    # ===============================
    # Core Authentication Apps
    # ===============================
    "eusuite-login": {
        "name": "EUSuite Login",
        "description": "Authentication & Login Portal",
        "image": "dylan016504/eusuite-login:latest",
        "port": 80,
        "type": "frontend",
        "category": "core",
        "required": True,
        "env": {}
    },
    "eusuite-dashboard": {
        "name": "EUSuite Dashboard",
        "description": "Main Dashboard & App Launcher",
        "image": "dylan016504/eusuite-dashboard:latest",
        "port": 80,
        "type": "frontend",
        "category": "core",
        "required": True,
        "env": {}
    },
    
    # ===============================
    # EUMail - Email Service
    # ===============================
    "eumail-frontend": {
        "name": "EUMail",
        "description": "Email Service (Frontend)",
        "image": "dylan016504/eumail-frontend:latest",
        "port": 80,
        "type": "frontend",
        "category": "productivity",
        "required": False,
        "env": {}
    },
    "eumail-backend": {
        "name": "EUMail API",
        "description": "Email Service (Backend)",
        "image": "dylan016504/eumail-backend:latest",
        "port": 3000,
        "type": "backend",
        "category": "productivity",
        "required": False,
        "env": {}
    },
    
    # ===============================
    # EUCloud - Cloud Storage
    # ===============================
    "eucloud-frontend": {
        "name": "EUCloud",
        "description": "Cloud Storage (Frontend)",
        "image": "dylan016504/eucloud-frontend:latest",
        "port": 80,
        "type": "frontend",
        "category": "storage",
        "required": False,
        "env": {}
    },
    "eucloud-backend": {
        "name": "EUCloud API",
        "description": "Cloud Storage (Backend)",
        "image": "dylan016504/eucloud-backend:latest",
        "port": 3000,
        "type": "backend",
        "category": "storage",
        "required": False,
        "env": {}
    },
    
    # ===============================
    # EUType - Document Editor
    # ===============================
    "eutype-frontend": {
        "name": "EUType",
        "description": "Document Editor (Frontend)",
        "image": "dylan016504/eutype-frontend:latest",
        "port": 80,
        "type": "frontend",
        "category": "productivity",
        "required": False,
        "env": {}
    },
    
    # ===============================
    # EUGroups - Team Communication
    # ===============================
    "eugroups-frontend": {
        "name": "EUGroups",
        "description": "Team Communication (Frontend)",
        "image": "dylan016504/eugroups-frontend:latest",
        "port": 80,
        "type": "frontend",
        "category": "communication",
        "required": False,
        "env": {}
    },
    "eugroups-backend": {
        "name": "EUGroups API",
        "description": "Team Communication (Backend)",
        "image": "dylan016504/eugroups-backend:latest",
        "port": 3000,
        "type": "backend",
        "category": "communication",
        "required": False,
        "env": {}
    },
    "eugroups-media": {
        "name": "EUGroups Media",
        "description": "Media Server for Teams",
        "image": "dylan016504/eugroups-media-server:latest",
        "port": 3000,
        "type": "backend",
        "category": "communication",
        "required": False,
        "env": {}
    },
    
    # ===============================
    # EUAdmin - Admin Portal
    # ===============================
    "euadmin-frontend": {
        "name": "EUAdmin",
        "description": "Admin Portal (Frontend)",
        "image": "dylan016504/euadmin-frontend:latest",
        "port": 80,
        "type": "frontend",
        "category": "admin",
        "required": False,
        "env": {}
    },
    "euadmin-backend": {
        "name": "EUAdmin API",
        "description": "Admin Portal (Backend)",
        "image": "dylan016504/euadmin-backend:latest",
        "port": 3000,
        "type": "backend",
        "category": "admin",
        "required": False,
        "env": {}
    },
}

# Service pricing (monthly in EUR)
SERVICE_PRICES = {
    "nginx": 5.00,
    "postgres": 15.00,
    "redis": 10.00,
    "mysql": 10.00,
    "wordpress": 20.00,
    "custom": 20.00,
    "uptime": 10.00,
    "eusuite": 25.00,
    # EUSuite apps
    "eumail": 15.00,
    "eucloud": 20.00,
    "eutype": 10.00,
    "eugroups": 25.00,
    "euadmin": 10.00,
}

# Plan-based app access
PLAN_APPS = {
    "free": ["eusuite-login", "eusuite-dashboard"],
    "starter": ["eusuite-login", "eusuite-dashboard", "eumail-frontend", "eumail-backend", "eucloud-frontend", "eucloud-backend"],
    "professional": list(EUSUITE_APPS.keys()),  # All apps
    "enterprise": list(EUSUITE_APPS.keys()),  # All apps + priority support
}

# Default resource limits
DEFAULT_RESOURCES = {
    "cpu_request": "100m",
    "cpu_limit": "500m",
    "memory_request": "128Mi",
    "memory_limit": "512Mi",
}

# Company storage quota (in GB)
COMPANY_STORAGE_QUOTA = {
    "free": 5,
    "starter": 50,
    "professional": 200,
    "enterprise": 1000,
}


def get_apps_for_plan(plan_slug: str) -> list:
    """Get list of available apps for a plan"""
    return PLAN_APPS.get(plan_slug.lower(), PLAN_APPS["free"])


def get_app_price(app_id: str) -> float:
    """Get monthly price for an app"""
    base_name = app_id.split("-")[0] if "-" in app_id else app_id
    return SERVICE_PRICES.get(base_name, 20.00)


def get_app_info(app_id: str) -> dict:
    """Get full app information"""
    return EUSUITE_APPS.get(app_id, {})


def get_apps_by_category(category: str) -> list:
    """Get apps filtered by category"""
    return [
        {"id": app_id, **app_info}
        for app_id, app_info in EUSUITE_APPS.items()
        if app_info.get("category") == category
    ]


def get_all_categories() -> list:
    """Get list of all app categories"""
    categories = set()
    for app_info in EUSUITE_APPS.values():
        if "category" in app_info:
            categories.add(app_info["category"])
    return list(categories)
