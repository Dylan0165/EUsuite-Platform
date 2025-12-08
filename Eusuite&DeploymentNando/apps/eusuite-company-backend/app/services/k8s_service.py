from typing import Optional, Dict, Any
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import yaml
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class K8sService:
    """Service for managing Kubernetes deployments."""
    
    def __init__(self):
        self._initialized = False
        self._api_client = None
        self._apps_v1 = None
        self._core_v1 = None
    
    def _init_client(self):
        """Initialize Kubernetes client."""
        if self._initialized:
            return
        
        try:
            if settings.k8s_in_cluster:
                config.load_incluster_config()
            else:
                config.load_kube_config(config_file=settings.k8s_config_path)
            
            self._api_client = client.ApiClient()
            self._apps_v1 = client.AppsV1Api(self._api_client)
            self._core_v1 = client.CoreV1Api(self._api_client)
            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize K8s client: {e}")
            raise
    
    def _get_namespace_name(self, company_id: int) -> str:
        """Get namespace name for a company."""
        return f"{settings.k8s_namespace_prefix}{company_id}"
    
    async def create_namespace(self, company_id: int) -> bool:
        """Create a namespace for a company."""
        self._init_client()
        namespace_name = self._get_namespace_name(company_id)
        
        namespace = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=namespace_name,
                labels={
                    "app.kubernetes.io/managed-by": "eusuite",
                    "eusuite.eu/company-id": str(company_id),
                }
            )
        )
        
        try:
            self._core_v1.create_namespace(body=namespace)
            logger.info(f"Created namespace: {namespace_name}")
            return True
        except ApiException as e:
            if e.status == 409:  # Already exists
                logger.info(f"Namespace already exists: {namespace_name}")
                return True
            logger.error(f"Failed to create namespace: {e}")
            raise
    
    async def delete_namespace(self, company_id: int) -> bool:
        """Delete a company's namespace and all resources."""
        self._init_client()
        namespace_name = self._get_namespace_name(company_id)
        
        try:
            self._core_v1.delete_namespace(name=namespace_name)
            logger.info(f"Deleted namespace: {namespace_name}")
            return True
        except ApiException as e:
            if e.status == 404:
                logger.info(f"Namespace not found: {namespace_name}")
                return True
            logger.error(f"Failed to delete namespace: {e}")
            raise
    
    async def create_deployment(
        self,
        company_id: int,
        app_type: str,
        node_port: int,
        image_tag: str = "latest",
        replicas: int = 1,
        cpu_request: str = "100m",
        cpu_limit: str = "500m",
        memory_request: str = "128Mi",
        memory_limit: str = "512Mi",
        env_vars: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Create a deployment for an app."""
        self._init_client()
        namespace = self._get_namespace_name(company_id)
        deployment_name = f"{app_type}-{company_id}"
        service_name = f"{app_type}-svc-{company_id}"
        
        # App-specific configurations - Dylan's DockerHub images
        app_configs = {
            "dashboard": {"image": "dylan016504/eusuite-dashboard", "port": 80},
            "eucloud": {"image": "dylan016504/eucloud-frontend", "port": 80},
            "eumail": {"image": "dylan016504/eumail-frontend", "port": 80},
            "eutype": {"image": "dylan016504/eutype-frontend", "port": 80},
            "eugroups": {"image": "dylan016504/eugroups-frontend", "port": 80},
            "euadmin": {"image": "dylan016504/euadmin-frontend", "port": 80},
            "login": {"image": "dylan016504/eusuite-login", "port": 80},
        }
        
        app_config = app_configs.get(app_type, {"image": f"eusuite/{app_type}", "port": 80})
        
        # Environment variables
        container_env = [
            client.V1EnvVar(name="COMPANY_ID", value=str(company_id)),
            client.V1EnvVar(name="APP_TYPE", value=app_type),
        ]
        if env_vars:
            container_env.extend([
                client.V1EnvVar(name=k, value=v) for k, v in env_vars.items()
            ])
        
        # Create deployment
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(
                name=deployment_name,
                namespace=namespace,
                labels={
                    "app": app_type,
                    "company-id": str(company_id),
                    "app.kubernetes.io/managed-by": "eusuite",
                }
            ),
            spec=client.V1DeploymentSpec(
                replicas=replicas,
                selector=client.V1LabelSelector(
                    match_labels={"app": app_type, "company-id": str(company_id)}
                ),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(
                        labels={"app": app_type, "company-id": str(company_id)}
                    ),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name=app_type,
                                image=f"{app_config['image']}:{image_tag}",
                                ports=[
                                    client.V1ContainerPort(container_port=app_config["port"])
                                ],
                                env=container_env,
                                resources=client.V1ResourceRequirements(
                                    requests={"cpu": cpu_request, "memory": memory_request},
                                    limits={"cpu": cpu_limit, "memory": memory_limit},
                                ),
                                liveness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/health",
                                        port=app_config["port"],
                                    ),
                                    initial_delay_seconds=10,
                                    period_seconds=30,
                                ),
                            )
                        ]
                    )
                )
            )
        )
        
        try:
            self._apps_v1.create_namespaced_deployment(
                namespace=namespace,
                body=deployment,
            )
            logger.info(f"Created deployment: {deployment_name}")
        except ApiException as e:
            if e.status == 409:  # Already exists
                self._apps_v1.patch_namespaced_deployment(
                    name=deployment_name,
                    namespace=namespace,
                    body=deployment,
                )
                logger.info(f"Updated deployment: {deployment_name}")
            else:
                raise
        
        # Create service
        service = client.V1Service(
            metadata=client.V1ObjectMeta(
                name=service_name,
                namespace=namespace,
                labels={
                    "app": app_type,
                    "company-id": str(company_id),
                }
            ),
            spec=client.V1ServiceSpec(
                type="NodePort",
                selector={"app": app_type, "company-id": str(company_id)},
                ports=[
                    client.V1ServicePort(
                        port=app_config["port"],
                        target_port=app_config["port"],
                        node_port=node_port,
                    )
                ]
            )
        )
        
        try:
            self._core_v1.create_namespaced_service(
                namespace=namespace,
                body=service,
            )
            logger.info(f"Created service: {service_name}")
        except ApiException as e:
            if e.status == 409:  # Already exists
                self._core_v1.patch_namespaced_service(
                    name=service_name,
                    namespace=namespace,
                    body=service,
                )
                logger.info(f"Updated service: {service_name}")
            else:
                raise
        
        return {
            "namespace": namespace,
            "deployment_name": deployment_name,
            "service_name": service_name,
            "node_port": node_port,
            "internal_url": f"http://{service_name}.{namespace}.svc.cluster.local:{app_config['port']}",
        }
    
    async def scale_deployment(
        self,
        company_id: int,
        app_type: str,
        replicas: int,
    ) -> bool:
        """Scale a deployment."""
        self._init_client()
        namespace = self._get_namespace_name(company_id)
        deployment_name = f"{app_type}-{company_id}"
        
        try:
            self._apps_v1.patch_namespaced_deployment_scale(
                name=deployment_name,
                namespace=namespace,
                body={"spec": {"replicas": replicas}},
            )
            logger.info(f"Scaled deployment {deployment_name} to {replicas} replicas")
            return True
        except ApiException as e:
            logger.error(f"Failed to scale deployment: {e}")
            raise
    
    async def get_deployment_status(
        self,
        company_id: int,
        app_type: str,
    ) -> Dict[str, Any]:
        """Get deployment status."""
        self._init_client()
        namespace = self._get_namespace_name(company_id)
        deployment_name = f"{app_type}-{company_id}"
        
        try:
            deployment = self._apps_v1.read_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
            )
            
            status = deployment.status
            return {
                "replicas": status.replicas or 0,
                "ready_replicas": status.ready_replicas or 0,
                "available_replicas": status.available_replicas or 0,
                "unavailable_replicas": status.unavailable_replicas or 0,
                "conditions": [
                    {
                        "type": c.type,
                        "status": c.status,
                        "reason": c.reason,
                        "message": c.message,
                    }
                    for c in (status.conditions or [])
                ],
            }
        except ApiException as e:
            if e.status == 404:
                return {"error": "Deployment not found"}
            raise
    
    async def delete_deployment(
        self,
        company_id: int,
        app_type: str,
    ) -> bool:
        """Delete a deployment and its service."""
        self._init_client()
        namespace = self._get_namespace_name(company_id)
        deployment_name = f"{app_type}-{company_id}"
        service_name = f"{app_type}-svc-{company_id}"
        
        try:
            self._apps_v1.delete_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
            )
            logger.info(f"Deleted deployment: {deployment_name}")
        except ApiException as e:
            if e.status != 404:
                raise
        
        try:
            self._core_v1.delete_namespaced_service(
                name=service_name,
                namespace=namespace,
            )
            logger.info(f"Deleted service: {service_name}")
        except ApiException as e:
            if e.status != 404:
                raise
        
        return True
    
    async def restart_deployment(
        self,
        company_id: int,
        app_type: str,
    ) -> bool:
        """Restart a deployment by triggering a rollout."""
        self._init_client()
        namespace = self._get_namespace_name(company_id)
        deployment_name = f"{app_type}-{company_id}"
        
        from datetime import datetime
        
        patch = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": datetime.utcnow().isoformat()
                        }
                    }
                }
            }
        }
        
        try:
            self._apps_v1.patch_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
                body=patch,
            )
            logger.info(f"Restarted deployment: {deployment_name}")
            return True
        except ApiException as e:
            logger.error(f"Failed to restart deployment: {e}")
            raise


k8s_service = K8sService()
