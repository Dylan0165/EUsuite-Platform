"""
Kubernetes Service for Company Backend
Provides deployment management for tenant companies
"""

from kubernetes import client, config
from kubernetes.client.rest import ApiException
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
import random

# EUSUITE Configuration - Apps available for deployment
EUSUITE_APPS = {
    "eumail": {
        "name": "EUMail",
        "description": "Email Service",
        "frontend_image": "dylan016504/eumail-frontend:latest",
        "backend_image": "dylan016504/eumail-backend:latest",
        "frontend_port": 80,
        "backend_port": 3000,
    },
    "eucloud": {
        "name": "EUCloud",
        "description": "Cloud Storage",
        "frontend_image": "dylan016504/eucloud-frontend:latest",
        "backend_image": "dylan016504/eucloud-backend:latest",
        "frontend_port": 80,
        "backend_port": 3000,
    },
    "eutype": {
        "name": "EUType",
        "description": "Document Editor",
        "frontend_image": "dylan016504/eutype-frontend:latest",
        "frontend_port": 80,
    },
    "eugroups": {
        "name": "EUGroups",
        "description": "Team Communication",
        "frontend_image": "dylan016504/eugroups-frontend:latest",
        "backend_image": "dylan016504/eugroups-backend:latest",
        "media_image": "dylan016504/eugroups-media-server:latest",
        "frontend_port": 80,
        "backend_port": 3000,
        "media_port": 3000,
    },
}


class CompanyKubernetesService:
    """Kubernetes service for company-level deployment management"""
    
    def __init__(self):
        self.v1: Optional[client.CoreV1Api] = None
        self.apps_v1: Optional[client.AppsV1Api] = None
        self.networking_v1: Optional[client.NetworkingV1Api] = None
        self.custom_api: Optional[client.CustomObjectsApi] = None
        self.autoscaling_v1: Optional[client.AutoscalingV1Api] = None
        self._initialized = False
        self._init_k8s()
    
    def _init_k8s(self):
        """Initialize Kubernetes client"""
        try:
            config.load_incluster_config()
            print("[K8S] Loaded in-cluster config")
        except config.ConfigException:
            try:
                config.load_kube_config()
                print("[K8S] Loaded kubeconfig from file")
            except config.ConfigException:
                print("[K8S] Warning: Could not load kubernetes config")
                return
        
        self.v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
        self.networking_v1 = client.NetworkingV1Api()
        self.custom_api = client.CustomObjectsApi()
        self.autoscaling_v1 = client.AutoscalingV1Api()
        self._initialized = True
    
    @property
    def is_available(self) -> bool:
        return self._initialized and self.v1 is not None
    
    def get_namespace_name(self, company_slug: str) -> str:
        """Generate K8s namespace name from company slug"""
        clean_name = company_slug.lower().replace(" ", "-")
        clean_name = re.sub(r'[^a-z0-9\-]', '', clean_name)
        return f"tenant-{clean_name}"
    
    async def _ensure_regcred(self, namespace: str) -> bool:
        """Ensure Docker Hub credentials exist in namespace"""
        try:
            self.v1.read_namespaced_secret("regcred", namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                try:
                    secret = self.v1.read_namespaced_secret("regcred", "eusuite-platform")
                    secret.metadata.namespace = namespace
                    secret.metadata.resource_version = None
                    secret.metadata.uid = None
                    self.v1.create_namespaced_secret(namespace=namespace, body=secret)
                    return True
                except:
                    return False
            return False
    
    # ==================== APP DEPLOYMENT ====================
    
    async def deploy_app(
        self,
        company_slug: str,
        app_id: str
    ) -> Dict[str, Any]:
        """Deploy an EUSuite app for a company"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        if app_id not in EUSUITE_APPS:
            return {"success": False, "error": f"Unknown app: {app_id}"}
        
        namespace = self.get_namespace_name(company_slug)
        app_info = EUSUITE_APPS[app_id]
        deployed = []
        
        try:
            # Ensure namespace and regcred exist
            await self._ensure_regcred(namespace)
            
            # Deploy frontend
            if "frontend_image" in app_info:
                result = await self._create_deployment(
                    namespace=namespace,
                    name=f"{app_id}-frontend",
                    image=app_info["frontend_image"],
                    port=app_info["frontend_port"],
                    labels={"app-type": app_id, "component": "frontend"}
                )
                if result["success"]:
                    deployed.append({"component": "frontend", **result})
            
            # Deploy backend
            if "backend_image" in app_info:
                result = await self._create_deployment(
                    namespace=namespace,
                    name=f"{app_id}-backend",
                    image=app_info["backend_image"],
                    port=app_info["backend_port"],
                    labels={"app-type": app_id, "component": "backend"}
                )
                if result["success"]:
                    deployed.append({"component": "backend", **result})
            
            # Deploy media server (for eugroups)
            if "media_image" in app_info:
                result = await self._create_deployment(
                    namespace=namespace,
                    name=f"{app_id}-media",
                    image=app_info["media_image"],
                    port=app_info["media_port"],
                    labels={"app-type": app_id, "component": "media"}
                )
                if result["success"]:
                    deployed.append({"component": "media", **result})
            
            return {
                "success": True,
                "app": app_id,
                "app_name": app_info["name"],
                "deployed": deployed
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _create_deployment(
        self,
        namespace: str,
        name: str,
        image: str,
        port: int,
        labels: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a single deployment with service"""
        deployment_name = name
        
        all_labels = {"app": deployment_name}
        if labels:
            all_labels.update(labels)
        
        container = client.V1Container(
            name=name.replace("-", ""),
            image=image,
            ports=[client.V1ContainerPort(container_port=port)],
            image_pull_policy="Always"
        )
        
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(name=deployment_name, labels=all_labels),
            spec=client.V1DeploymentSpec(
                replicas=1,
                selector=client.V1LabelSelector(match_labels={"app": deployment_name}),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=all_labels),
                    spec=client.V1PodSpec(
                        containers=[container],
                        image_pull_secrets=[client.V1LocalObjectReference(name="regcred")]
                    )
                )
            )
        )
        
        try:
            self.apps_v1.create_namespaced_deployment(namespace=namespace, body=deployment)
        except ApiException as e:
            if e.status == 409:  # Already exists
                self.apps_v1.replace_namespaced_deployment(
                    name=deployment_name, namespace=namespace, body=deployment
                )
            else:
                raise
        
        # Create service
        service = client.V1Service(
            metadata=client.V1ObjectMeta(name=f"{deployment_name}-svc", labels=all_labels),
            spec=client.V1ServiceSpec(
                type="NodePort",
                selector={"app": deployment_name},
                ports=[client.V1ServicePort(port=port, target_port=port)]
            )
        )
        
        try:
            created_svc = self.v1.create_namespaced_service(namespace=namespace, body=service)
            node_port = created_svc.spec.ports[0].node_port
        except ApiException as e:
            if e.status == 409:
                existing_svc = self.v1.read_namespaced_service(
                    name=f"{deployment_name}-svc", namespace=namespace
                )
                node_port = existing_svc.spec.ports[0].node_port
            else:
                raise
        
        return {
            "success": True,
            "deployment": deployment_name,
            "service": f"{deployment_name}-svc",
            "node_port": node_port
        }
    
    async def undeploy_app(self, company_slug: str, app_id: str) -> Dict[str, Any]:
        """Remove an app deployment"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        namespace = self.get_namespace_name(company_slug)
        deleted = []
        
        try:
            # Delete all deployments with this app-type
            deployments = self.apps_v1.list_namespaced_deployment(
                namespace=namespace, label_selector=f"app-type={app_id}"
            )
            
            for dep in deployments.items:
                dep_name = dep.metadata.name
                
                # Delete deployment
                self.apps_v1.delete_namespaced_deployment(name=dep_name, namespace=namespace)
                deleted.append(dep_name)
                
                # Delete service
                try:
                    self.v1.delete_namespaced_service(
                        name=f"{dep_name}-svc", namespace=namespace
                    )
                except:
                    pass
            
            return {"success": True, "deleted": deleted}
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    # ==================== STATUS & MONITORING ====================
    
    async def get_app_status(self, company_slug: str, app_id: str) -> Dict[str, Any]:
        """Get status of a deployed app"""
        if not self.is_available:
            return {"deployed": False, "error": "Kubernetes not available"}
        
        namespace = self.get_namespace_name(company_slug)
        
        try:
            deployments = self.apps_v1.list_namespaced_deployment(
                namespace=namespace, label_selector=f"app-type={app_id}"
            )
            
            if not deployments.items:
                return {"deployed": False}
            
            components = []
            for dep in deployments.items:
                component = dep.metadata.labels.get("component", "unknown")
                ready = dep.status.ready_replicas or 0
                desired = dep.spec.replicas or 1
                
                # Get service info
                node_port = None
                try:
                    svc = self.v1.read_namespaced_service(
                        name=f"{dep.metadata.name}-svc", namespace=namespace
                    )
                    if svc.spec.ports:
                        node_port = svc.spec.ports[0].node_port
                except:
                    pass
                
                components.append({
                    "component": component,
                    "deployment": dep.metadata.name,
                    "status": "running" if ready == desired else "pending",
                    "ready": f"{ready}/{desired}",
                    "node_port": node_port
                })
            
            return {
                "deployed": True,
                "app": app_id,
                "components": components
            }
            
        except ApiException as e:
            return {"deployed": False, "error": str(e)}
    
    async def get_all_deployments(self, company_slug: str) -> List[Dict[str, Any]]:
        """Get all deployments for a company"""
        if not self.is_available:
            return []
        
        namespace = self.get_namespace_name(company_slug)
        deployments = []
        
        try:
            deps = self.apps_v1.list_namespaced_deployment(namespace=namespace)
            
            for dep in deps.items:
                labels = dep.metadata.labels or {}
                ready = dep.status.ready_replicas or 0
                desired = dep.spec.replicas or 1
                
                # Get service
                node_port = None
                try:
                    svc = self.v1.read_namespaced_service(
                        name=f"{dep.metadata.name}-svc", namespace=namespace
                    )
                    if svc.spec.ports:
                        node_port = svc.spec.ports[0].node_port
                except:
                    pass
                
                # Calculate age
                age = "Unknown"
                if dep.metadata.creation_timestamp:
                    delta = datetime.now(dep.metadata.creation_timestamp.tzinfo) - dep.metadata.creation_timestamp
                    hours = delta.total_seconds() / 3600
                    if hours < 24:
                        age = f"{int(hours)}h"
                    else:
                        age = f"{int(hours/24)}d"
                
                deployments.append({
                    "name": dep.metadata.name,
                    "app_type": labels.get("app-type", "custom"),
                    "component": labels.get("component", "unknown"),
                    "status": "running" if ready == desired else "pending",
                    "replicas": f"{ready}/{desired}",
                    "node_port": node_port,
                    "age": age
                })
            
        except ApiException:
            pass
        
        return deployments
    
    async def get_pod_logs(
        self, company_slug: str, deployment_name: str, tail_lines: int = 100
    ) -> str:
        """Get logs for a deployment's pods"""
        if not self.is_available:
            return "Kubernetes not available"
        
        namespace = self.get_namespace_name(company_slug)
        
        try:
            # Find pods for this deployment
            pods = self.v1.list_namespaced_pod(
                namespace=namespace, label_selector=f"app={deployment_name}"
            )
            
            if not pods.items:
                return "No pods found"
            
            # Get logs from first pod
            logs = self.v1.read_namespaced_pod_log(
                name=pods.items[0].metadata.name,
                namespace=namespace,
                tail_lines=tail_lines
            )
            return logs
            
        except ApiException as e:
            return f"Error: {e.reason}"
    
    async def get_metrics(self, company_slug: str) -> Dict[str, Any]:
        """Get resource metrics for a company's namespace"""
        if not self.is_available:
            return {"error": "Kubernetes not available"}
        
        namespace = self.get_namespace_name(company_slug)
        
        try:
            pods = self.v1.list_namespaced_pod(namespace=namespace)
            deployments = self.apps_v1.list_namespaced_deployment(namespace=namespace)
            
            # Count by status
            running = 0
            pending = 0
            failed = 0
            
            for pod in pods.items:
                status = pod.status.phase
                if status == "Running":
                    running += 1
                elif status == "Pending":
                    pending += 1
                else:
                    failed += 1
            
            return {
                "total_pods": len(pods.items),
                "total_deployments": len(deployments.items),
                "running": running,
                "pending": pending,
                "failed": failed,
                "namespace": namespace
            }
            
        except ApiException as e:
            return {"error": str(e)}
    
    # ==================== SCALING ====================
    
    async def scale_deployment(
        self, company_slug: str, deployment_name: str, replicas: int
    ) -> Dict[str, Any]:
        """Scale a deployment"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        namespace = self.get_namespace_name(company_slug)
        
        try:
            self.apps_v1.patch_namespaced_deployment_scale(
                name=deployment_name,
                namespace=namespace,
                body={"spec": {"replicas": replicas}}
            )
            return {"success": True, "replicas": replicas}
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    async def restart_deployment(self, company_slug: str, deployment_name: str) -> Dict[str, Any]:
        """Restart a deployment by triggering a rollout"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        namespace = self.get_namespace_name(company_slug)
        
        try:
            # Patch the deployment to trigger a rollout
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
            
            self.apps_v1.patch_namespaced_deployment(
                name=deployment_name, namespace=namespace, body=patch
            )
            return {"success": True, "message": f"Deployment {deployment_name} restarting"}
            
        except ApiException as e:
            return {"success": False, "error": str(e)}


# Singleton instance
company_k8s_service = CompanyKubernetesService()
