from kubernetes import client, config as k8s_config
from kubernetes.client.rest import ApiException
from typing import Optional, Dict, Any, List
import logging
import yaml
from ..config import settings

logger = logging.getLogger(__name__)


class K8sService:
    """Kubernetes service for managing tenant namespaces and deployments"""
    
    def __init__(self):
        self.apps_v1: Optional[client.AppsV1Api] = None
        self.core_v1: Optional[client.CoreV1Api] = None
        self.networking_v1: Optional[client.NetworkingV1Api] = None
        self._initialized = False
    
    def _init_client(self):
        """Initialize Kubernetes client"""
        if self._initialized:
            return
        
        try:
            if settings.K8S_IN_CLUSTER:
                k8s_config.load_incluster_config()
            else:
                k8s_config.load_kube_config(config_file=settings.K8S_CONFIG_PATH)
            
            self.apps_v1 = client.AppsV1Api()
            self.core_v1 = client.CoreV1Api()
            self.networking_v1 = client.NetworkingV1Api()
            self._initialized = True
            logger.info("Kubernetes client initialized successfully")
        except Exception as e:
            logger.warning(f"Could not initialize Kubernetes client: {e}")
    
    def _get_namespace_name(self, tenant_slug: str) -> str:
        """Generate namespace name for tenant"""
        return f"{settings.K8S_NAMESPACE_PREFIX}{tenant_slug}"
    
    async def create_tenant_namespace(self, tenant_slug: str, labels: Dict[str, str] = None) -> bool:
        """Create a Kubernetes namespace for a tenant"""
        self._init_client()
        if not self.core_v1:
            logger.warning("K8s client not available, skipping namespace creation")
            return False
        
        namespace_name = self._get_namespace_name(tenant_slug)
        
        namespace_labels = {
            "app.kubernetes.io/managed-by": "eusuite-superadmin",
            "eusuite.eu/tenant": tenant_slug,
            "eusuite.eu/tier": "company",
        }
        if labels:
            namespace_labels.update(labels)
        
        namespace = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=namespace_name,
                labels=namespace_labels,
            )
        )
        
        try:
            self.core_v1.create_namespace(body=namespace)
            logger.info(f"Created namespace: {namespace_name}")
            
            # Create resource quota
            await self._create_resource_quota(namespace_name, tenant_slug)
            
            # Create network policy
            await self._create_network_policy(namespace_name, tenant_slug)
            
            return True
        except ApiException as e:
            if e.status == 409:
                logger.info(f"Namespace {namespace_name} already exists")
                return True
            logger.error(f"Failed to create namespace: {e}")
            return False
    
    async def _create_resource_quota(self, namespace: str, tenant_slug: str):
        """Create resource quota for tenant namespace"""
        quota = client.V1ResourceQuota(
            metadata=client.V1ObjectMeta(
                name=f"{tenant_slug}-quota",
                namespace=namespace,
            ),
            spec=client.V1ResourceQuotaSpec(
                hard={
                    "requests.cpu": "4",
                    "requests.memory": "8Gi",
                    "limits.cpu": "8",
                    "limits.memory": "16Gi",
                    "persistentvolumeclaims": "10",
                    "services.nodeports": "10",
                }
            )
        )
        
        try:
            self.core_v1.create_namespaced_resource_quota(namespace=namespace, body=quota)
            logger.info(f"Created resource quota in namespace: {namespace}")
        except ApiException as e:
            if e.status != 409:
                logger.error(f"Failed to create resource quota: {e}")
    
    async def _create_network_policy(self, namespace: str, tenant_slug: str):
        """Create network policy to isolate tenant namespace"""
        policy = client.V1NetworkPolicy(
            metadata=client.V1ObjectMeta(
                name=f"{tenant_slug}-isolation",
                namespace=namespace,
            ),
            spec=client.V1NetworkPolicySpec(
                pod_selector=client.V1LabelSelector(),
                policy_types=["Ingress", "Egress"],
                ingress=[
                    client.V1NetworkPolicyIngressRule(
                        _from=[
                            # Allow from same namespace
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"eusuite.eu/tenant": tenant_slug}
                                )
                            ),
                            # Allow from ingress namespace
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"name": "ingress-nginx"}
                                )
                            ),
                        ]
                    )
                ],
                egress=[
                    # Allow DNS
                    client.V1NetworkPolicyEgressRule(
                        to=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"name": "kube-system"}
                                )
                            )
                        ],
                        ports=[
                            client.V1NetworkPolicyPort(protocol="UDP", port=53),
                            client.V1NetworkPolicyPort(protocol="TCP", port=53),
                        ]
                    ),
                    # Allow egress to same namespace
                    client.V1NetworkPolicyEgressRule(
                        to=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"eusuite.eu/tenant": tenant_slug}
                                )
                            )
                        ]
                    ),
                    # Allow external (internet)
                    client.V1NetworkPolicyEgressRule(
                        to=[
                            client.V1NetworkPolicyPeer(
                                ip_block=client.V1IPBlock(cidr="0.0.0.0/0")
                            )
                        ]
                    )
                ]
            )
        )
        
        try:
            self.networking_v1.create_namespaced_network_policy(namespace=namespace, body=policy)
            logger.info(f"Created network policy in namespace: {namespace}")
        except ApiException as e:
            if e.status != 409:
                logger.error(f"Failed to create network policy: {e}")
    
    async def delete_tenant_namespace(self, tenant_slug: str) -> bool:
        """Delete a tenant namespace and all resources"""
        self._init_client()
        if not self.core_v1:
            return False
        
        namespace_name = self._get_namespace_name(tenant_slug)
        
        try:
            self.core_v1.delete_namespace(name=namespace_name)
            logger.info(f"Deleted namespace: {namespace_name}")
            return True
        except ApiException as e:
            if e.status == 404:
                logger.info(f"Namespace {namespace_name} does not exist")
                return True
            logger.error(f"Failed to delete namespace: {e}")
            return False
    
    async def deploy_app(
        self,
        tenant_slug: str,
        app_name: str,
        node_port: int,
        replicas: int = 1,
        cpu_limit: str = "500m",
        memory_limit: str = "512Mi",
        storage_limit: str = "10Gi",
        env_vars: Dict[str, str] = None,
    ) -> Dict[str, Any]:
        """Deploy an application for a tenant"""
        self._init_client()
        if not self.apps_v1:
            return {"success": False, "error": "K8s client not available"}
        
        namespace = self._get_namespace_name(tenant_slug)
        deployment_name = f"{tenant_slug}-{app_name}"
        service_name = f"{tenant_slug}-{app_name}-svc"
        
        # Image mapping
        images = {
            "eucloud": "eusuite/eucloud:latest",
            "eumail": "eusuite/eumail:latest",
            "eutype": "eusuite/eutype:latest",
            "eugroups": "eusuite/eugroups:latest",
        }
        
        image = images.get(app_name, f"eusuite/{app_name}:latest")
        
        # Container ports
        ports = {
            "eucloud": 8000,
            "eumail": 8000,
            "eutype": 8000,
            "eugroups": 8000,
        }
        container_port = ports.get(app_name, 8000)
        
        # Environment variables
        container_env = [
            client.V1EnvVar(name="TENANT_ID", value=tenant_slug),
            client.V1EnvVar(name="APP_NAME", value=app_name),
        ]
        if env_vars:
            for key, value in env_vars.items():
                container_env.append(client.V1EnvVar(name=key, value=value))
        
        # Create deployment
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(
                name=deployment_name,
                namespace=namespace,
                labels={
                    "app": app_name,
                    "tenant": tenant_slug,
                    "managed-by": "eusuite-superadmin",
                }
            ),
            spec=client.V1DeploymentSpec(
                replicas=replicas,
                selector=client.V1LabelSelector(
                    match_labels={"app": app_name, "tenant": tenant_slug}
                ),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(
                        labels={"app": app_name, "tenant": tenant_slug}
                    ),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name=app_name,
                                image=image,
                                ports=[client.V1ContainerPort(container_port=container_port)],
                                env=container_env,
                                resources=client.V1ResourceRequirements(
                                    limits={"cpu": cpu_limit, "memory": memory_limit},
                                    requests={"cpu": "100m", "memory": "128Mi"},
                                ),
                                liveness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/health",
                                        port=container_port,
                                    ),
                                    initial_delay_seconds=30,
                                    period_seconds=10,
                                ),
                                readiness_probe=client.V1Probe(
                                    http_get=client.V1HTTPGetAction(
                                        path="/health",
                                        port=container_port,
                                    ),
                                    initial_delay_seconds=5,
                                    period_seconds=5,
                                ),
                            )
                        ]
                    )
                )
            )
        )
        
        # Create service
        service = client.V1Service(
            metadata=client.V1ObjectMeta(
                name=service_name,
                namespace=namespace,
                labels={"app": app_name, "tenant": tenant_slug},
            ),
            spec=client.V1ServiceSpec(
                type="NodePort",
                selector={"app": app_name, "tenant": tenant_slug},
                ports=[
                    client.V1ServicePort(
                        port=container_port,
                        target_port=container_port,
                        node_port=node_port,
                    )
                ]
            )
        )
        
        try:
            # Create or update deployment
            try:
                self.apps_v1.create_namespaced_deployment(namespace=namespace, body=deployment)
                logger.info(f"Created deployment: {deployment_name}")
            except ApiException as e:
                if e.status == 409:
                    self.apps_v1.patch_namespaced_deployment(
                        name=deployment_name,
                        namespace=namespace,
                        body=deployment,
                    )
                    logger.info(f"Updated deployment: {deployment_name}")
                else:
                    raise
            
            # Create or update service
            try:
                self.core_v1.create_namespaced_service(namespace=namespace, body=service)
                logger.info(f"Created service: {service_name}")
            except ApiException as e:
                if e.status == 409:
                    self.core_v1.patch_namespaced_service(
                        name=service_name,
                        namespace=namespace,
                        body=service,
                    )
                    logger.info(f"Updated service: {service_name}")
                else:
                    raise
            
            return {
                "success": True,
                "deployment_name": deployment_name,
                "service_name": service_name,
                "node_port": node_port,
                "internal_url": f"http://{service_name}.{namespace}.svc.cluster.local:{container_port}",
                "external_url": f"http://{tenant_slug}.{app_name}.eusuite.eu:{node_port}",
            }
        except ApiException as e:
            logger.error(f"Failed to deploy app: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_app(self, tenant_slug: str, app_name: str) -> bool:
        """Delete an application deployment"""
        self._init_client()
        if not self.apps_v1:
            return False
        
        namespace = self._get_namespace_name(tenant_slug)
        deployment_name = f"{tenant_slug}-{app_name}"
        service_name = f"{tenant_slug}-{app_name}-svc"
        
        try:
            self.apps_v1.delete_namespaced_deployment(name=deployment_name, namespace=namespace)
            logger.info(f"Deleted deployment: {deployment_name}")
        except ApiException as e:
            if e.status != 404:
                logger.error(f"Failed to delete deployment: {e}")
        
        try:
            self.core_v1.delete_namespaced_service(name=service_name, namespace=namespace)
            logger.info(f"Deleted service: {service_name}")
        except ApiException as e:
            if e.status != 404:
                logger.error(f"Failed to delete service: {e}")
        
        return True
    
    async def scale_app(self, tenant_slug: str, app_name: str, replicas: int) -> bool:
        """Scale an application deployment"""
        self._init_client()
        if not self.apps_v1:
            return False
        
        namespace = self._get_namespace_name(tenant_slug)
        deployment_name = f"{tenant_slug}-{app_name}"
        
        try:
            self.apps_v1.patch_namespaced_deployment_scale(
                name=deployment_name,
                namespace=namespace,
                body={"spec": {"replicas": replicas}},
            )
            logger.info(f"Scaled deployment {deployment_name} to {replicas} replicas")
            return True
        except ApiException as e:
            logger.error(f"Failed to scale deployment: {e}")
            return False
    
    async def get_deployment_status(self, tenant_slug: str, app_name: str) -> Dict[str, Any]:
        """Get the status of a deployment"""
        self._init_client()
        if not self.apps_v1:
            return {"status": "unknown", "error": "K8s client not available"}
        
        namespace = self._get_namespace_name(tenant_slug)
        deployment_name = f"{tenant_slug}-{app_name}"
        
        try:
            deployment = self.apps_v1.read_namespaced_deployment(
                name=deployment_name,
                namespace=namespace,
            )
            
            status = deployment.status
            return {
                "status": "running" if status.ready_replicas == status.replicas else "pending",
                "replicas": status.replicas or 0,
                "ready_replicas": status.ready_replicas or 0,
                "available_replicas": status.available_replicas or 0,
                "updated_replicas": status.updated_replicas or 0,
            }
        except ApiException as e:
            if e.status == 404:
                return {"status": "not_found"}
            return {"status": "error", "error": str(e)}
    
    async def list_tenant_deployments(self, tenant_slug: str) -> List[Dict[str, Any]]:
        """List all deployments for a tenant"""
        self._init_client()
        if not self.apps_v1:
            return []
        
        namespace = self._get_namespace_name(tenant_slug)
        
        try:
            deployments = self.apps_v1.list_namespaced_deployment(
                namespace=namespace,
                label_selector=f"tenant={tenant_slug}",
            )
            
            result = []
            for dep in deployments.items:
                result.append({
                    "name": dep.metadata.name,
                    "app": dep.metadata.labels.get("app"),
                    "replicas": dep.status.replicas or 0,
                    "ready_replicas": dep.status.ready_replicas or 0,
                    "status": "running" if dep.status.ready_replicas == dep.status.replicas else "pending",
                })
            return result
        except ApiException as e:
            logger.error(f"Failed to list deployments: {e}")
            return []


# Global instance
k8s_service = K8sService()
