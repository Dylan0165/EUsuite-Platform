"""
EUAdmin Backend - Kubernetes YAML Generator
Generates Kubernetes manifests for tenant deployments.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import yaml
import json

from ..models import Company, CompanyService, CompanyBranding, ServiceType

logger = logging.getLogger(__name__)

# Base images for services
SERVICE_IMAGES = {
    ServiceType.DASHBOARD: "dylan016504/dashboard",
    ServiceType.LOGIN: "dylan016504/login",
    ServiceType.EUCLOUD: "dylan016504/eucloud-frontend",
    ServiceType.EUTYPE: "dylan016504/eutype",
    ServiceType.EUMAIL: "dylan016504/eumail-frontend",
    ServiceType.EUGROUPS: "dylan016504/eugroups-frontend",
    ServiceType.EUADMIN: "dylan016504/euadmin-frontend",
}

# Internal ports for services
SERVICE_PORTS = {
    ServiceType.DASHBOARD: 80,
    ServiceType.LOGIN: 80,
    ServiceType.EUCLOUD: 80,
    ServiceType.EUTYPE: 80,
    ServiceType.EUMAIL: 80,
    ServiceType.EUGROUPS: 80,
    ServiceType.EUADMIN: 80,
}


class KubernetesYAMLGenerator:
    """Generates Kubernetes YAML manifests for tenant deployments."""
    
    def __init__(self, company: Company, port_mapping: Dict[ServiceType, int]):
        self.company = company
        self.namespace = company.namespace
        self.port_mapping = port_mapping
        self.branding = company.branding
        self.storage_policy = company.storage_policy
        self.services = {s.service_type: s for s in company.services if s.is_enabled}
    
    def generate_all(self) -> Dict[str, str]:
        """Generate all YAML manifests."""
        yamls = {
            "namespace": self.generate_namespace_yaml(),
            "secrets": self.generate_secrets_yaml(),
            "branding-configmap": self.generate_branding_configmap_yaml(),
            "pvc": self.generate_pvc_yaml(),
        }
        
        # Generate deployment and service for each enabled service
        for service_type in self.services:
            name = service_type.value
            yamls[f"{name}-deployment"] = self.generate_service_deployment_yaml(service_type)
            yamls[f"{name}-service"] = self.generate_service_yaml(service_type)
        
        return yamls
    
    def generate_combined_yaml(self) -> str:
        """Generate single combined YAML file."""
        yamls = self.generate_all()
        
        combined = []
        for name, content in yamls.items():
            combined.append(f"# --- {name}.yaml ---")
            combined.append(content)
        
        return "\n---\n".join(combined)
    
    def generate_namespace_yaml(self) -> str:
        """Generate namespace YAML."""
        manifest = {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": self.namespace,
                "labels": {
                    "app.kubernetes.io/part-of": "eusuite",
                    "eusuite.io/tenant": self.company.slug,
                    "eusuite.io/company-id": str(self.company.id),
                },
            },
        }
        return yaml.dump(manifest, default_flow_style=False)
    
    def generate_secrets_yaml(self) -> str:
        """Generate secrets YAML."""
        import base64
        import secrets as sec
        
        # Generate secrets
        jwt_secret = base64.b64encode(sec.token_hex(32).encode()).decode()
        session_secret = base64.b64encode(sec.token_hex(32).encode()).decode()
        
        manifest = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": f"{self.company.slug}-secrets",
                "namespace": self.namespace,
            },
            "type": "Opaque",
            "data": {
                "JWT_SECRET_KEY": jwt_secret,
                "SESSION_SECRET": session_secret,
                "COMPANY_ID": base64.b64encode(str(self.company.id).encode()).decode(),
                "COMPANY_SLUG": base64.b64encode(self.company.slug.encode()).decode(),
            },
        }
        return yaml.dump(manifest, default_flow_style=False)
    
    def generate_branding_configmap_yaml(self) -> str:
        """Generate branding ConfigMap for runtime injection."""
        branding_json = self.branding.to_branding_json() if self.branding else {
            "companyName": self.company.name,
            "colors": {
                "primary": "#1E40AF",
                "secondary": "#3B82F6",
            }
        }
        
        manifest = {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {
                "name": "branding-config",
                "namespace": self.namespace,
            },
            "data": {
                "branding.json": json.dumps(branding_json, indent=2),
            },
        }
        return yaml.dump(manifest, default_flow_style=False)
    
    def generate_pvc_yaml(self) -> str:
        """Generate PersistentVolumeClaim for tenant storage."""
        storage_size = "10Gi"  # Default
        if self.storage_policy:
            # Calculate from quota (max 100Gi per tenant)
            quota_gb = self.storage_policy.total_storage_quota / (1024**3)
            storage_size = f"{min(int(quota_gb), 100)}Gi"
        
        manifest = {
            "apiVersion": "v1",
            "kind": "PersistentVolumeClaim",
            "metadata": {
                "name": f"{self.company.slug}-storage",
                "namespace": self.namespace,
            },
            "spec": {
                "accessModes": ["ReadWriteOnce"],
                "resources": {
                    "requests": {
                        "storage": storage_size,
                    },
                },
                "storageClassName": "local-path",  # Or your storage class
            },
        }
        return yaml.dump(manifest, default_flow_style=False)
    
    def generate_service_deployment_yaml(self, service_type: ServiceType) -> str:
        """Generate deployment YAML for a service."""
        service_config = self.services.get(service_type)
        if not service_config:
            service_config = self._default_service_config(service_type)
        
        name = f"{self.company.slug}-{service_type.value}"
        image = f"{service_config.image_repository}:{service_config.image_tag}"
        
        manifest = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
                "labels": {
                    "app": name,
                    "eusuite.io/service": service_type.value,
                    "eusuite.io/tenant": self.company.slug,
                },
            },
            "spec": {
                "replicas": service_config.replicas if service_config else 1,
                "selector": {
                    "matchLabels": {
                        "app": name,
                    },
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": name,
                            "eusuite.io/service": service_type.value,
                        },
                    },
                    "spec": {
                        "imagePullSecrets": [
                            {"name": "docker-registry-secret"},
                        ],
                        "containers": [
                            {
                                "name": name,
                                "image": image,
                                "imagePullPolicy": "Always",
                                "ports": [
                                    {
                                        "containerPort": service_config.internal_port if service_config else 80,
                                    },
                                ],
                                "env": self._generate_env_vars(service_type),
                                "volumeMounts": [
                                    {
                                        "name": "branding",
                                        "mountPath": "/usr/share/nginx/html/branding.json",
                                        "subPath": "branding.json",
                                    },
                                ],
                                "resources": {
                                    "requests": {
                                        "cpu": service_config.cpu_request if service_config else "100m",
                                        "memory": service_config.memory_request if service_config else "128Mi",
                                    },
                                    "limits": {
                                        "cpu": service_config.cpu_limit if service_config else "500m",
                                        "memory": service_config.memory_limit if service_config else "512Mi",
                                    },
                                },
                                "livenessProbe": {
                                    "httpGet": {
                                        "path": "/",
                                        "port": service_config.internal_port if service_config else 80,
                                    },
                                    "initialDelaySeconds": 10,
                                    "periodSeconds": 30,
                                },
                                "readinessProbe": {
                                    "httpGet": {
                                        "path": "/",
                                        "port": service_config.internal_port if service_config else 80,
                                    },
                                    "initialDelaySeconds": 5,
                                    "periodSeconds": 10,
                                },
                            },
                        ],
                        "volumes": [
                            {
                                "name": "branding",
                                "configMap": {
                                    "name": "branding-config",
                                },
                            },
                        ],
                    },
                },
            },
        }
        
        return yaml.dump(manifest, default_flow_style=False)
    
    def generate_service_yaml(self, service_type: ServiceType) -> str:
        """Generate Kubernetes Service YAML."""
        service_config = self.services.get(service_type)
        name = f"{self.company.slug}-{service_type.value}"
        node_port = self.port_mapping.get(service_type)
        
        manifest = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
                "labels": {
                    "app": name,
                    "eusuite.io/service": service_type.value,
                },
            },
            "spec": {
                "type": "NodePort",
                "selector": {
                    "app": name,
                },
                "ports": [
                    {
                        "port": 80,
                        "targetPort": service_config.internal_port if service_config else 80,
                        "nodePort": node_port,
                        "protocol": "TCP",
                    },
                ],
            },
        }
        
        return yaml.dump(manifest, default_flow_style=False)
    
    def _generate_env_vars(self, service_type: ServiceType) -> List[Dict[str, Any]]:
        """Generate environment variables for a service."""
        base_url = f"http://192.168.124.50"  # TODO: Make configurable
        
        env_vars = [
            {"name": "COMPANY_ID", "value": str(self.company.id)},
            {"name": "COMPANY_SLUG", "value": self.company.slug},
            {"name": "COMPANY_NAME", "value": self.company.name},
            {"name": "NAMESPACE", "value": self.namespace},
        ]
        
        # Add service-specific URLs
        if service_type == ServiceType.DASHBOARD:
            env_vars.extend([
                {"name": "VITE_API_BASE", "value": f"{base_url}:{self.port_mapping.get(ServiceType.EUCLOUD, 30080)}/api"},
                {"name": "VITE_LOGIN_URL", "value": f"{base_url}:{self.port_mapping.get(ServiceType.LOGIN, 30090)}"},
            ])
        elif service_type == ServiceType.LOGIN:
            env_vars.extend([
                {"name": "VITE_API_BASE", "value": f"{base_url}:{self.port_mapping.get(ServiceType.EUCLOUD, 30080)}/api"},
                {"name": "VITE_DASHBOARD_URL", "value": f"{base_url}:{self.port_mapping.get(ServiceType.DASHBOARD, 30091)}"},
            ])
        
        return env_vars
    
    def _default_service_config(self, service_type: ServiceType):
        """Return default config for a service type."""
        class DefaultConfig:
            def __init__(self, stype):
                self.image_repository = SERVICE_IMAGES.get(stype, "nginx")
                self.image_tag = "latest"
                self.internal_port = SERVICE_PORTS.get(stype, 80)
                self.replicas = 1
                self.cpu_request = "100m"
                self.cpu_limit = "500m"
                self.memory_request = "128Mi"
                self.memory_limit = "512Mi"
        
        return DefaultConfig(service_type)


def generate_tenant_yaml(
    company: Company,
    port_mapping: Dict[ServiceType, int],
) -> Dict[str, str]:
    """
    Generate all Kubernetes YAML for a tenant.
    
    Args:
        company: Company model with all relationships loaded
        port_mapping: Mapping of ServiceType to NodePort
    
    Returns:
        Dict mapping filename to YAML content
    """
    generator = KubernetesYAMLGenerator(company, port_mapping)
    return generator.generate_all()


def generate_tenant_combined_yaml(
    company: Company,
    port_mapping: Dict[ServiceType, int],
) -> str:
    """Generate combined YAML file for a tenant."""
    generator = KubernetesYAMLGenerator(company, port_mapping)
    return generator.generate_combined_yaml()
