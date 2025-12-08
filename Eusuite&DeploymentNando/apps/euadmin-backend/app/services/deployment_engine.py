"""
EUAdmin Backend - Deployment Engine
Orchestrates tenant deployments to Kubernetes.
"""
import logging
import uuid
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
from sqlalchemy.orm import Session
from kubernetes import client, config
from kubernetes.client.rest import ApiException

from ..models import (
    Company, CompanyService, DeploymentHistory,
    DeploymentTarget, DeploymentStatus, ServiceType
)
from .yaml_generator import generate_tenant_yaml, generate_tenant_combined_yaml
from .port_manager import PortManager

logger = logging.getLogger(__name__)


class DeploymentEngine:
    """
    Orchestrates Kubernetes deployments for tenants.
    Supports real-time logging via callbacks.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.port_manager = PortManager(db)
        self._k8s_configured = False
        self._log_callback: Optional[Callable[[str, str, Dict], None]] = None
    
    def set_log_callback(self, callback: Callable[[str, str, Dict], None]):
        """Set callback for real-time log streaming."""
        self._log_callback = callback
    
    def _log(self, deployment_id: str, message: str, data: Dict = None):
        """Log message and send to callback if set."""
        logger.info(f"[{deployment_id}] {message}")
        if self._log_callback:
            self._log_callback(deployment_id, message, data or {})
    
    def _configure_k8s(self):
        """Configure Kubernetes client."""
        if self._k8s_configured:
            return
        
        try:
            # Try in-cluster config first
            config.load_incluster_config()
            self._log("system", "Using in-cluster Kubernetes config")
        except config.ConfigException:
            try:
                # Fall back to kubeconfig
                config.load_kube_config()
                self._log("system", "Using kubeconfig")
            except config.ConfigException as e:
                logger.error(f"Failed to configure Kubernetes: {e}")
                raise
        
        self._k8s_configured = True
    
    def deploy_tenant(
        self,
        company_id: int,
        deployment_type: str = "full",
        services: Optional[List[ServiceType]] = None,
        force: bool = False,
        initiated_by: Optional[int] = None,
        initiated_by_email: Optional[str] = None,
    ) -> DeploymentHistory:
        """
        Deploy a tenant's ecosystem to Kubernetes.
        
        Args:
            company_id: Company to deploy
            deployment_type: "full", "service", or "update"
            services: Specific services to deploy (None = all enabled)
            force: Force redeploy even if already deployed
            initiated_by: User ID who initiated
            initiated_by_email: Email of user who initiated
        
        Returns:
            DeploymentHistory record
        """
        self._configure_k8s()
        
        # Get company with all relationships
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        if not company.is_approved:
            raise ValueError(f"Company {company_id} is not approved")
        
        if company.is_suspended:
            raise ValueError(f"Company {company_id} is suspended")
        
        # Create deployment record
        deployment_id = str(uuid.uuid4())[:8]
        deployment = DeploymentHistory(
            company_id=company_id,
            deployment_id=deployment_id,
            deployment_type=deployment_type,
            target=company.deployment_target,
            namespace=company.namespace,
            status=DeploymentStatus.PENDING,
            initiated_by=initiated_by,
            initiated_by_email=initiated_by_email,
            started_at=datetime.utcnow(),
        )
        self.db.add(deployment)
        self.db.commit()
        
        self._log(deployment_id, f"Starting deployment for {company.name}")
        
        try:
            # Determine which services to deploy
            if services:
                services_to_deploy = services
            else:
                services_to_deploy = [
                    s.service_type for s in company.services if s.is_enabled
                ]
            
            deployment.services_deployed = [s.value for s in services_to_deploy]
            deployment.status = DeploymentStatus.IN_PROGRESS
            self.db.commit()
            
            # Allocate ports
            self._log(deployment_id, "Allocating ports...")
            port_mapping = self.port_manager.allocate_ports_for_company(
                company_id=company_id,
                namespace=company.namespace,
                services=services_to_deploy,
            )
            self._log(deployment_id, f"Ports allocated: {port_mapping}")
            
            # Generate YAML
            self._log(deployment_id, "Generating Kubernetes manifests...")
            yaml_manifests = generate_tenant_yaml(company, port_mapping)
            combined_yaml = generate_tenant_combined_yaml(company, port_mapping)
            deployment.generated_yaml = combined_yaml
            
            # Store config snapshot
            deployment.config_snapshot = {
                "ports": {k.value: v for k, v in port_mapping.items()},
                "services": deployment.services_deployed,
                "namespace": company.namespace,
            }
            self.db.commit()
            
            if company.deployment_target == DeploymentTarget.SELF_HOSTED:
                # For self-hosted, just return the YAML
                self._log(deployment_id, "Self-hosted deployment - YAML generated")
                deployment.status = DeploymentStatus.COMPLETED
                deployment.status_message = "YAML generated for self-hosted deployment"
            else:
                # Deploy to Kubernetes
                self._apply_manifests(deployment_id, yaml_manifests, company.namespace)
                
                # Update service records
                for service_type in services_to_deploy:
                    service = self.db.query(CompanyService).filter(
                        CompanyService.company_id == company_id,
                        CompanyService.service_type == service_type
                    ).first()
                    if service:
                        service.is_deployed = True
                        service.node_port = port_mapping.get(service_type)
                        service.last_deployed_at = datetime.utcnow()
                        service.last_deployment_status = "success"
                
                deployment.status = DeploymentStatus.COMPLETED
                deployment.status_message = "Deployment successful"
            
            deployment.completed_at = datetime.utcnow()
            deployment.duration_seconds = int(
                (deployment.completed_at - deployment.started_at).total_seconds()
            )
            self.db.commit()
            
            self._log(deployment_id, f"Deployment completed in {deployment.duration_seconds}s")
            
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            deployment.status = DeploymentStatus.FAILED
            deployment.status_message = str(e)
            deployment.completed_at = datetime.utcnow()
            deployment.duration_seconds = int(
                (deployment.completed_at - deployment.started_at).total_seconds()
            )
            deployment.logs = str(e)
            self.db.commit()
            
            self._log(deployment_id, f"Deployment failed: {e}", {"error": str(e)})
            raise
        
        return deployment
    
    def _apply_manifests(
        self,
        deployment_id: str,
        manifests: Dict[str, str],
        namespace: str,
    ):
        """Apply Kubernetes manifests."""
        from kubernetes import utils
        import yaml as pyyaml
        
        k8s_client = client.ApiClient()
        
        # Apply in order: namespace, secrets, configmaps, pvc, deployments, services
        order = [
            "namespace", "secrets", "branding-configmap", "pvc",
        ]
        
        # Add service manifests
        for key in manifests:
            if key not in order:
                order.append(key)
        
        for manifest_name in order:
            if manifest_name not in manifests:
                continue
            
            manifest_yaml = manifests[manifest_name]
            self._log(deployment_id, f"Applying {manifest_name}...")
            
            try:
                # Parse YAML
                manifest_dict = pyyaml.safe_load(manifest_yaml)
                
                # Apply using the appropriate API
                self._apply_single_manifest(k8s_client, manifest_dict, namespace)
                
                self._log(deployment_id, f"Applied {manifest_name}")
                
            except ApiException as e:
                if e.status == 409:  # Already exists
                    self._log(deployment_id, f"{manifest_name} already exists, updating...")
                    self._update_manifest(k8s_client, manifest_dict, namespace)
                else:
                    raise
    
    def _apply_single_manifest(self, k8s_client, manifest: Dict, namespace: str):
        """Apply a single manifest to Kubernetes."""
        kind = manifest.get("kind")
        name = manifest.get("metadata", {}).get("name")
        
        if kind == "Namespace":
            api = client.CoreV1Api(k8s_client)
            try:
                api.create_namespace(body=manifest)
            except ApiException as e:
                if e.status != 409:
                    raise
        
        elif kind == "Secret":
            api = client.CoreV1Api(k8s_client)
            try:
                api.create_namespaced_secret(namespace=namespace, body=manifest)
            except ApiException as e:
                if e.status == 409:
                    api.replace_namespaced_secret(name=name, namespace=namespace, body=manifest)
                else:
                    raise
        
        elif kind == "ConfigMap":
            api = client.CoreV1Api(k8s_client)
            try:
                api.create_namespaced_config_map(namespace=namespace, body=manifest)
            except ApiException as e:
                if e.status == 409:
                    api.replace_namespaced_config_map(name=name, namespace=namespace, body=manifest)
                else:
                    raise
        
        elif kind == "PersistentVolumeClaim":
            api = client.CoreV1Api(k8s_client)
            try:
                api.create_namespaced_persistent_volume_claim(namespace=namespace, body=manifest)
            except ApiException as e:
                if e.status != 409:
                    raise
        
        elif kind == "Deployment":
            api = client.AppsV1Api(k8s_client)
            try:
                api.create_namespaced_deployment(namespace=namespace, body=manifest)
            except ApiException as e:
                if e.status == 409:
                    api.replace_namespaced_deployment(name=name, namespace=namespace, body=manifest)
                else:
                    raise
        
        elif kind == "Service":
            api = client.CoreV1Api(k8s_client)
            try:
                api.create_namespaced_service(namespace=namespace, body=manifest)
            except ApiException as e:
                if e.status == 409:
                    # For services, delete and recreate to handle NodePort changes
                    api.delete_namespaced_service(name=name, namespace=namespace)
                    api.create_namespaced_service(namespace=namespace, body=manifest)
                else:
                    raise
    
    def _update_manifest(self, k8s_client, manifest: Dict, namespace: str):
        """Update an existing manifest."""
        # Same as apply, but expects resource to exist
        self._apply_single_manifest(k8s_client, manifest, namespace)
    
    def delete_tenant_deployment(self, company_id: int) -> bool:
        """Delete all resources for a tenant."""
        self._configure_k8s()
        
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company or not company.namespace:
            return False
        
        namespace = company.namespace
        
        try:
            api = client.CoreV1Api()
            
            # Delete namespace (cascades to all resources)
            api.delete_namespace(name=namespace)
            
            # Release ports
            self.port_manager.release_ports_for_company(company_id)
            
            # Update service records
            for service in company.services:
                service.is_deployed = False
                service.node_port = None
                service.last_deployment_status = "deleted"
            
            self.db.commit()
            
            logger.info(f"Deleted tenant deployment: {namespace}")
            return True
            
        except ApiException as e:
            if e.status == 404:
                return True  # Already deleted
            logger.error(f"Failed to delete tenant: {e}")
            raise
    
    def get_deployment_status(self, deployment_id: str) -> Optional[DeploymentHistory]:
        """Get deployment by ID."""
        return self.db.query(DeploymentHistory).filter(
            DeploymentHistory.deployment_id == deployment_id
        ).first()
    
    def get_deployment_history(
        self,
        company_id: int,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple:
        """Get deployment history for a company."""
        query = self.db.query(DeploymentHistory).filter(
            DeploymentHistory.company_id == company_id
        )
        
        total = query.count()
        deployments = query.order_by(DeploymentHistory.started_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()
        
        return deployments, total
    
    def rollback_deployment(
        self,
        company_id: int,
        target_deployment_id: str,
        initiated_by: Optional[int] = None,
    ) -> DeploymentHistory:
        """Rollback to a previous deployment."""
        target = self.db.query(DeploymentHistory).filter(
            DeploymentHistory.deployment_id == target_deployment_id,
            DeploymentHistory.company_id == company_id,
            DeploymentHistory.status == DeploymentStatus.COMPLETED,
        ).first()
        
        if not target or not target.generated_yaml:
            raise ValueError("Cannot rollback to this deployment")
        
        # Create new deployment from the old config
        deployment = DeploymentHistory(
            company_id=company_id,
            deployment_id=str(uuid.uuid4())[:8],
            deployment_type="rollback",
            target=target.target,
            namespace=target.namespace,
            status=DeploymentStatus.IN_PROGRESS,
            initiated_by=initiated_by,
            rollback_from_deployment_id=target_deployment_id,
            started_at=datetime.utcnow(),
            config_snapshot=target.config_snapshot,
            generated_yaml=target.generated_yaml,
        )
        self.db.add(deployment)
        self.db.commit()
        
        try:
            # Re-apply the old YAML
            import yaml as pyyaml
            manifests = {}
            
            for doc in target.generated_yaml.split("---"):
                if doc.strip():
                    parsed = pyyaml.safe_load(doc)
                    if parsed:
                        kind = parsed.get("kind", "unknown")
                        name = parsed.get("metadata", {}).get("name", "unknown")
                        manifests[f"{kind}-{name}"] = doc
            
            self._apply_manifests(deployment.deployment_id, manifests, target.namespace)
            
            deployment.status = DeploymentStatus.COMPLETED
            deployment.status_message = f"Rolled back to deployment {target_deployment_id}"
            
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.status_message = str(e)
            raise
        
        finally:
            deployment.completed_at = datetime.utcnow()
            deployment.duration_seconds = int(
                (deployment.completed_at - deployment.started_at).total_seconds()
            )
            self.db.commit()
        
        return deployment
