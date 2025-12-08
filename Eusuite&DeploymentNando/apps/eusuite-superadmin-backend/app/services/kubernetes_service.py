"""
Kubernetes Service - Complete K8s Integration for EUSuite Platform
Merged from platform-main with enhanced multi-tenant support
"""

from kubernetes import client, config
from kubernetes.client.rest import ApiException
from typing import Optional, List, Dict, Any
from datetime import datetime
import re
import random

# EUSUITE Configuration - Dylan's Office 365 Suite
# All Docker images from dylan016504 DockerHub
EUSUITE_APPS = {
    "eusuite-login": {
        "name": "EUSuite Login",
        "description": "Authentication & Login Portal",
        "image": "dylan016504/eusuite-login:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eusuite-dashboard": {
        "name": "EUSuite Dashboard",
        "description": "Main Dashboard & App Launcher",
        "image": "dylan016504/eusuite-dashboard:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eumail-frontend": {
        "name": "EUMail",
        "description": "Email Service (Frontend)",
        "image": "dylan016504/eumail-frontend:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eumail-backend": {
        "name": "EUMail API",
        "description": "Email Service (Backend)",
        "image": "dylan016504/eumail-backend:latest",
        "port": 3000,
        "type": "backend",
        "env": {}
    },
    "eucloud-frontend": {
        "name": "EUCloud",
        "description": "Cloud Storage (Frontend)",
        "image": "dylan016504/eucloud-frontend:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eucloud-backend": {
        "name": "EUCloud API",
        "description": "Cloud Storage (Backend)",
        "image": "dylan016504/eucloud-backend:latest",
        "port": 3000,
        "type": "backend",
        "env": {}
    },
    "eutype-frontend": {
        "name": "EUType",
        "description": "Document Editor (Frontend)",
        "image": "dylan016504/eutype-frontend:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eugroups-frontend": {
        "name": "EUGroups",
        "description": "Team Communication (Frontend)",
        "image": "dylan016504/eugroups-frontend:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "eugroups-backend": {
        "name": "EUGroups API",
        "description": "Team Communication (Backend)",
        "image": "dylan016504/eugroups-backend:latest",
        "port": 3000,
        "type": "backend",
        "env": {}
    },
    "eugroups-media": {
        "name": "EUGroups Media",
        "description": "Media Server for Teams",
        "image": "dylan016504/eugroups-media-server:latest",
        "port": 3000,
        "type": "backend",
        "env": {}
    },
    "euadmin-frontend": {
        "name": "EUAdmin",
        "description": "Admin Portal (Frontend)",
        "image": "dylan016504/euadmin-frontend:latest",
        "port": 80,
        "type": "frontend",
        "env": {}
    },
    "euadmin-backend": {
        "name": "EUAdmin API",
        "description": "Admin Portal (Backend)",
        "image": "dylan016504/euadmin-backend:latest",
        "port": 3000,
        "type": "backend",
        "env": {}
    }
}

# Pricing per service type (monthly in euros)
SERVICE_PRICES = {
    "nginx": 5.00,
    "postgres": 15.00,
    "redis": 10.00,
    "mysql": 10.00,
    "wordpress": 20.00,
    "custom": 20.00,
    "uptime": 10.00,
    "eusuite": 25.00  # EUSuite apps
}

# Storage quota per company (in Gi)
COMPANY_STORAGE_QUOTA = 50


class KubernetesService:
    """Complete Kubernetes service with all platform-main functionality"""
    
    def __init__(self):
        self.v1: Optional[client.CoreV1Api] = None
        self.apps_v1: Optional[client.AppsV1Api] = None
        self.networking_v1: Optional[client.NetworkingV1Api] = None
        self.custom_api: Optional[client.CustomObjectsApi] = None
        self.autoscaling_v1: Optional[client.AutoscalingV1Api] = None
        self.batch_v1: Optional[client.BatchV1Api] = None
        self._initialized = False
        self._init_k8s()
    
    def _init_k8s(self):
        """Initialize Kubernetes client"""
        try:
            # Try in-cluster config first (for running inside K8s)
            config.load_incluster_config()
            print("[K8S] Loaded in-cluster config")
        except config.ConfigException:
            try:
                # Fallback to kubeconfig file
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
        self.batch_v1 = client.BatchV1Api()
        self._initialized = True
        print("[K8S] All API clients initialized")
    
    @property
    def is_available(self) -> bool:
        return self._initialized and self.v1 is not None
    
    # ==================== NAMESPACE MANAGEMENT ====================
    
    def get_namespace_name(self, company_name: str) -> str:
        """Generate K8s-safe namespace name from company name"""
        clean_name = company_name.lower().replace(" ", "-")
        clean_name = re.sub(r'[^a-z0-9\-]', '', clean_name)
        return f"tenant-{clean_name}"
    
    def get_safe_label(self, text: str) -> str:
        """Make text safe for K8s labels"""
        return re.sub(r'[^a-zA-Z0-9\-\_\.]', '-', text)
    
    async def create_tenant_namespace(self, company_slug: str) -> Dict[str, Any]:
        """Create a new namespace for a tenant"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        ns_name = self.get_namespace_name(company_slug)
        
        try:
            # Create namespace
            ns_body = client.V1Namespace(
                metadata=client.V1ObjectMeta(
                    name=ns_name,
                    labels={
                        "eusuite-tenant": "true",
                        "company": company_slug
                    }
                )
            )
            self.v1.create_namespace(body=ns_body)
            print(f"[K8S] Created namespace: {ns_name}")
            
            # Copy regcred secret for Docker Hub access
            await self._ensure_regcred_in_namespace(ns_name)
            
            # Create default resource quota
            await self._create_resource_quota(ns_name)
            
            return {"success": True, "namespace": ns_name}
            
        except ApiException as e:
            if e.status == 409:  # Already exists
                return {"success": True, "namespace": ns_name, "existed": True}
            print(f"[K8S] Error creating namespace: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_tenant_namespace(self, company_slug: str) -> Dict[str, Any]:
        """Delete a tenant's namespace and all resources"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        ns_name = self.get_namespace_name(company_slug)
        
        try:
            self.v1.delete_namespace(name=ns_name)
            print(f"[K8S] Deleted namespace: {ns_name}")
            return {"success": True, "namespace": ns_name}
        except ApiException as e:
            if e.status == 404:
                return {"success": True, "namespace": ns_name, "not_found": True}
            return {"success": False, "error": str(e)}
    
    async def _ensure_regcred_in_namespace(self, ns_name: str) -> bool:
        """Ensure regcred secret exists in namespace by copying from eusuite-platform"""
        try:
            # Check if already exists
            self.v1.read_namespaced_secret("regcred", ns_name)
            return True
        except ApiException as e:
            if e.status == 404:
                # Copy from platform namespace
                try:
                    secret = self.v1.read_namespaced_secret("regcred", "eusuite-platform")
                    secret.metadata.namespace = ns_name
                    secret.metadata.resource_version = None
                    secret.metadata.uid = None
                    secret.metadata.creation_timestamp = None
                    secret.metadata.owner_references = None
                    self.v1.create_namespaced_secret(namespace=ns_name, body=secret)
                    print(f"[K8S] Copied regcred to {ns_name}")
                    return True
                except Exception as copy_error:
                    print(f"[K8S] Failed to copy regcred: {copy_error}")
                    return False
            return False
    
    async def _create_resource_quota(self, ns_name: str):
        """Create resource quota for namespace"""
        try:
            quota = client.V1ResourceQuota(
                metadata=client.V1ObjectMeta(name="tenant-quota"),
                spec=client.V1ResourceQuotaSpec(
                    hard={
                        "requests.cpu": "4",
                        "requests.memory": "8Gi",
                        "limits.cpu": "8",
                        "limits.memory": "16Gi",
                        "persistentvolumeclaims": "10",
                        "pods": "50"
                    }
                )
            )
            self.v1.create_namespaced_resource_quota(namespace=ns_name, body=quota)
            print(f"[K8S] Created resource quota for {ns_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if exists
                print(f"[K8S] Error creating quota: {e}")
    
    # ==================== POD MANAGEMENT ====================
    
    async def list_pods(self, namespace: str, label_selector: str = None) -> List[Dict[str, Any]]:
        """List all pods in a namespace with detailed info"""
        if not self.is_available:
            return []
        
        pods = []
        
        try:
            if label_selector:
                k8s_pods = self.v1.list_namespaced_pod(namespace=namespace, label_selector=label_selector)
            else:
                k8s_pods = self.v1.list_namespaced_pod(namespace=namespace)
            
            # Get services for node port mapping
            services = self.v1.list_namespaced_service(namespace=namespace)
            service_ports = {}
            for svc in services.items:
                if svc.spec.selector and 'app' in svc.spec.selector:
                    app_label = svc.spec.selector['app']
                    if svc.spec.ports:
                        for port in svc.spec.ports:
                            if port.node_port:
                                service_ports[app_label] = port.node_port
                                break
            
            for p in k8s_pods.items:
                try:
                    labels = p.metadata.labels or {}
                    app_type = labels.get("app", "unknown")
                    base_type = app_type.split('-')[0] if '-' in app_type else app_type
                    
                    # Calculate age
                    age = "Unknown"
                    if p.status.start_time:
                        delta = datetime.now(p.status.start_time.tzinfo) - p.status.start_time
                        age = str(delta).split('.')[0]
                    
                    # Get status with detailed info
                    status = p.status.phase
                    message = None
                    if p.status.container_statuses:
                        for cs in p.status.container_statuses:
                            if cs.state.waiting:
                                status = cs.state.waiting.reason
                                message = cs.state.waiting.message
                                break
                            if cs.state.terminated:
                                status = cs.state.terminated.reason
                                message = cs.state.terminated.message
                                break
                    
                    # Get feature status
                    has_storage, storage_size = await self._check_storage(namespace, app_type)
                    has_autoscaling, replicas = await self._check_hpa(namespace, app_type)
                    has_auto_backup, backup_count = await self._check_backups(namespace, app_type)
                    
                    pod_info = {
                        "name": p.metadata.name,
                        "status": status,
                        "message": message,
                        "type": app_type,
                        "age": age,
                        "pod_ip": p.status.pod_ip,
                        "node_name": p.spec.node_name,
                        "public_ip": p.status.host_ip,
                        "node_port": service_ports.get(app_type),
                        "group_id": labels.get("service_group"),
                        "cost": SERVICE_PRICES.get(base_type, 20.00),
                        "has_storage": has_storage,
                        "storage_size": storage_size,
                        "has_autoscaling": has_autoscaling,
                        "replicas": replicas,
                        "has_auto_backup": has_auto_backup,
                        "backup_count": backup_count,
                        "labels": labels
                    }
                    pods.append(pod_info)
                    
                except Exception as e:
                    print(f"[K8S] Error processing pod {p.metadata.name}: {e}")
                    continue
            
        except ApiException as e:
            print(f"[K8S] Error listing pods: {e}")
        
        return pods
    
    async def _check_storage(self, namespace: str, app_type: str) -> tuple:
        """Check if deployment has storage"""
        try:
            pvc = self.v1.read_namespaced_persistent_volume_claim(
                name=f"{app_type}-pvc", namespace=namespace
            )
            return True, pvc.spec.resources.requests.get("storage", "?")
        except:
            return False, None
    
    async def _check_hpa(self, namespace: str, app_type: str) -> tuple:
        """Check if deployment has autoscaling"""
        try:
            hpa = self.autoscaling_v1.read_namespaced_horizontal_pod_autoscaler(
                name=f"{app_type}-hpa", namespace=namespace
            )
            current = hpa.status.current_replicas or 1
            max_rep = hpa.spec.max_replicas
            return True, f"{current}/{max_rep}"
        except:
            return False, None
    
    async def _check_backups(self, namespace: str, app_type: str) -> tuple:
        """Check backup status"""
        has_auto_backup = False
        backup_count = 0
        
        try:
            self.batch_v1.read_namespaced_cron_job(
                name=f"autobackup-{app_type}", namespace=namespace
            )
            has_auto_backup = True
        except:
            pass
        
        try:
            jobs = self.batch_v1.list_namespaced_job(
                namespace=namespace, label_selector=f"backup-for={app_type}"
            )
            backup_count = len(jobs.items)
        except:
            pass
        
        return has_auto_backup, backup_count
    
    async def get_pod_logs(self, namespace: str, pod_name: str, tail_lines: int = 100) -> str:
        """Get logs for a pod"""
        if not self.is_available:
            return "Kubernetes not available"
        
        try:
            logs = self.v1.read_namespaced_pod_log(
                name=pod_name, namespace=namespace, tail_lines=tail_lines
            )
            return logs
        except ApiException as e:
            return f"Error fetching logs: {e.reason}"
    
    async def delete_pod(self, namespace: str, pod_name: str) -> Dict[str, Any]:
        """Delete a pod and its related resources"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        deleted_resources = []
        
        try:
            # Find deployment name from pod
            deployment_name = await self._find_deployment_from_pod(namespace, pod_name)
            
            if deployment_name:
                # Delete deployment
                self.apps_v1.delete_namespaced_deployment(
                    name=deployment_name, namespace=namespace
                )
                deleted_resources.append(f"deployment/{deployment_name}")
                
                # Delete service
                try:
                    self.v1.delete_namespaced_service(
                        name=f"{deployment_name}-svc", namespace=namespace
                    )
                    deleted_resources.append(f"service/{deployment_name}-svc")
                except:
                    pass
                
                # Delete ingress
                try:
                    self.networking_v1.delete_namespaced_ingress(
                        name=f"{deployment_name}-svc-ingress", namespace=namespace
                    )
                    deleted_resources.append(f"ingress/{deployment_name}-svc-ingress")
                except:
                    pass
            
            return {"success": True, "deleted": deleted_resources}
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    async def _find_deployment_from_pod(self, namespace: str, pod_name: str) -> Optional[str]:
        """Extract deployment name from pod name"""
        parts = pod_name.split('-')
        if len(parts) >= 3:
            for i in range(len(parts) - 1, 0, -1):
                try_name = '-'.join(parts[:i])
                try:
                    self.apps_v1.read_namespaced_deployment(
                        name=try_name, namespace=namespace
                    )
                    return try_name
                except:
                    continue
        return None
    
    # ==================== DEPLOYMENT MANAGEMENT ====================
    
    async def create_deployment(
        self,
        namespace: str,
        name: str,
        image: str,
        port: int,
        env_vars: Dict[str, str] = None,
        replicas: int = 1,
        labels: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a deployment with service"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        try:
            deployment_name = f"{name}-{random.randint(1000, 9999)}"
            
            # Ensure regcred exists
            await self._ensure_regcred_in_namespace(namespace)
            
            # Build labels
            default_labels = {"app": deployment_name}
            if labels:
                default_labels.update(labels)
            
            # Build env vars
            env_list = []
            if env_vars:
                env_list = [client.V1EnvVar(name=k, value=v) for k, v in env_vars.items()]
            
            # Create container
            container = client.V1Container(
                name=name.replace("-", ""),
                image=image,
                ports=[client.V1ContainerPort(container_port=port)],
                env=env_list if env_list else None,
                image_pull_policy="Always"
            )
            
            # Create deployment
            deployment = client.V1Deployment(
                metadata=client.V1ObjectMeta(name=deployment_name, labels=default_labels),
                spec=client.V1DeploymentSpec(
                    replicas=replicas,
                    selector=client.V1LabelSelector(match_labels={"app": deployment_name}),
                    template=client.V1PodTemplateSpec(
                        metadata=client.V1ObjectMeta(labels=default_labels),
                        spec=client.V1PodSpec(
                            containers=[container],
                            image_pull_secrets=[client.V1LocalObjectReference(name="regcred")]
                        )
                    )
                )
            )
            
            self.apps_v1.create_namespaced_deployment(namespace=namespace, body=deployment)
            
            # Create service
            service = client.V1Service(
                metadata=client.V1ObjectMeta(name=f"{deployment_name}-svc"),
                spec=client.V1ServiceSpec(
                    type="NodePort",
                    selector={"app": deployment_name},
                    ports=[client.V1ServicePort(port=port, target_port=port)]
                )
            )
            
            created_svc = self.v1.create_namespaced_service(namespace=namespace, body=service)
            node_port = created_svc.spec.ports[0].node_port
            
            return {
                "success": True,
                "deployment": deployment_name,
                "service": f"{deployment_name}-svc",
                "node_port": node_port
            }
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    async def scale_deployment(
        self, namespace: str, deployment_name: str, replicas: int
    ) -> Dict[str, Any]:
        """Scale a deployment"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        try:
            self.apps_v1.patch_namespaced_deployment_scale(
                name=deployment_name,
                namespace=namespace,
                body={"spec": {"replicas": replicas}}
            )
            return {"success": True, "replicas": replicas}
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    # ==================== EUSUITE DEPLOYMENT ====================
    
    async def deploy_eusuite_app(
        self,
        namespace: str,
        app_id: str,
        company_slug: str
    ) -> Dict[str, Any]:
        """Deploy a single EUSUITE app"""
        if app_id not in EUSUITE_APPS:
            return {"success": False, "error": f"Unknown app: {app_id}"}
        
        app_info = EUSUITE_APPS[app_id]
        deployment_name = f"eusuite-{app_id}-{company_slug[:10]}"
        
        labels = {
            "eusuite-app": app_id,
            "company": company_slug,
            "type": f"eusuite-{app_info['type']}"
        }
        
        result = await self.create_deployment(
            namespace=namespace,
            name=deployment_name,
            image=app_info["image"],
            port=app_info["port"],
            env_vars=app_info.get("env", {}),
            labels=labels
        )
        
        if result["success"]:
            result["app_name"] = app_info["name"]
            result["app_description"] = app_info["description"]
        
        return result
    
    async def deploy_full_eusuite(
        self, namespace: str, company_slug: str, apps: List[str] = None
    ) -> Dict[str, Any]:
        """Deploy multiple or all EUSUITE apps"""
        if apps is None:
            apps = list(EUSUITE_APPS.keys())
        
        deployed = []
        failed = []
        
        for app_id in apps:
            result = await self.deploy_eusuite_app(namespace, app_id, company_slug)
            if result["success"]:
                deployed.append({
                    "id": app_id,
                    "name": result.get("app_name"),
                    "deployment": result["deployment"],
                    "node_port": result["node_port"]
                })
            else:
                failed.append({"id": app_id, "error": result["error"]})
        
        return {
            "success": len(failed) == 0,
            "deployed": deployed,
            "failed": failed,
            "total_deployed": len(deployed),
            "total_failed": len(failed)
        }
    
    async def undeploy_eusuite(self, namespace: str) -> Dict[str, Any]:
        """Remove all EUSUITE apps from namespace"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        deleted = []
        
        try:
            deployments = self.apps_v1.list_namespaced_deployment(
                namespace=namespace, label_selector="eusuite-app"
            )
            
            for dep in deployments.items:
                dep_name = dep.metadata.name
                
                # Delete deployment
                self.apps_v1.delete_namespaced_deployment(name=dep_name, namespace=namespace)
                
                # Delete service
                try:
                    self.v1.delete_namespaced_service(
                        name=f"{dep_name}-svc", namespace=namespace
                    )
                except:
                    pass
                
                deleted.append(dep_name)
            
            return {"success": True, "deleted": deleted}
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    # ==================== METRICS & MONITORING ====================
    
    async def get_pod_metrics(self, namespace: str, pod_name: str) -> Dict[str, Any]:
        """Get CPU and memory metrics for a pod"""
        if not self.is_available:
            return {"cpu": "N/A", "memory": "N/A"}
        
        try:
            metrics = self.custom_api.get_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=namespace,
                plural="pods",
                name=pod_name
            )
            
            total_cpu_nano = 0
            total_memory_bytes = 0
            
            for container in metrics.get("containers", []):
                usage = container.get("usage", {})
                
                # Parse CPU
                cpu_str = usage.get("cpu", "0n")
                if cpu_str.endswith("n"):
                    total_cpu_nano += int(cpu_str[:-1])
                elif cpu_str.endswith("m"):
                    total_cpu_nano += int(cpu_str[:-1]) * 1000000
                
                # Parse Memory
                mem_str = usage.get("memory", "0")
                if mem_str.endswith("Ki"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024
                elif mem_str.endswith("Mi"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024 * 1024
                elif mem_str.endswith("Gi"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024 * 1024 * 1024
            
            cpu_milli = total_cpu_nano / 1000000
            memory_mi = total_memory_bytes / (1024 * 1024)
            
            return {
                "cpu": f"{int(cpu_milli)}m",
                "memory": f"{int(memory_mi)}Mi",
                "cpu_millicores": round(cpu_milli, 2),
                "memory_mi": round(memory_mi, 2)
            }
            
        except Exception as e:
            return {"cpu": "N/A", "memory": "N/A", "error": str(e)}
    
    async def get_namespace_monitoring(self, namespace: str) -> Dict[str, Any]:
        """Get comprehensive monitoring data for a namespace"""
        if not self.is_available:
            return {"error": "Kubernetes not available"}
        
        try:
            # Get pods
            pods = await self.list_pods(namespace)
            
            # Get deployments
            deployments = self.apps_v1.list_namespaced_deployment(namespace=namespace)
            
            # Get PVCs
            pvcs = self.v1.list_namespaced_persistent_volume_claim(namespace=namespace)
            
            # Calculate totals
            total_cost = sum(p.get("cost", 0) for p in pods)
            total_storage = 0
            
            for pvc in pvcs.items:
                size_str = pvc.spec.resources.requests.get("storage", "0Gi")
                if "Gi" in size_str:
                    total_storage += float(size_str.replace("Gi", ""))
            
            # Status counts
            status_counts = {"Running": 0, "Pending": 0, "Failed": 0, "Unknown": 0}
            for p in pods:
                status = p.get("status", "Unknown")
                if status in ["Running"]:
                    status_counts["Running"] += 1
                elif status in ["Pending", "ContainerCreating"]:
                    status_counts["Pending"] += 1
                elif status in ["Failed", "CrashLoopBackOff", "Error", "ImagePullBackOff"]:
                    status_counts["Failed"] += 1
                else:
                    status_counts["Unknown"] += 1
            
            return {
                "summary": {
                    "total_pods": len(pods),
                    "total_deployments": len(deployments.items),
                    "total_storage_gi": round(total_storage, 2),
                    "storage_quota_gi": COMPANY_STORAGE_QUOTA,
                    "total_monthly_cost": round(total_cost, 2),
                    "status_counts": status_counts
                },
                "pods": pods,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except ApiException as e:
            return {"error": str(e)}
    
    # ==================== STORAGE MANAGEMENT ====================
    
    async def add_storage(
        self, namespace: str, deployment_name: str, size: str = "1Gi"
    ) -> Dict[str, Any]:
        """Add persistent storage to a deployment"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        try:
            pvc_name = f"{deployment_name}-pvc"
            
            # Create PVC
            pvc = client.V1PersistentVolumeClaim(
                metadata=client.V1ObjectMeta(name=pvc_name, labels={"app": deployment_name}),
                spec=client.V1PersistentVolumeClaimSpec(
                    access_modes=["ReadWriteOnce"],
                    resources=client.V1ResourceRequirements(requests={"storage": size})
                )
            )
            
            try:
                self.v1.create_namespaced_persistent_volume_claim(namespace=namespace, body=pvc)
            except ApiException as e:
                if e.status != 409:
                    raise
            
            # Update deployment to mount the PVC
            deployment = self.apps_v1.read_namespaced_deployment(
                name=deployment_name, namespace=namespace
            )
            
            # Add volume
            volumes = deployment.spec.template.spec.volumes or []
            volumes.append(client.V1Volume(
                name=pvc_name,
                persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(claim_name=pvc_name)
            ))
            deployment.spec.template.spec.volumes = volumes
            
            # Add volume mount
            container = deployment.spec.template.spec.containers[0]
            mounts = container.volume_mounts or []
            mounts.append(client.V1VolumeMount(name=pvc_name, mount_path="/data"))
            container.volume_mounts = mounts
            
            self.apps_v1.patch_namespaced_deployment(
                name=deployment_name, namespace=namespace, body=deployment
            )
            
            return {"success": True, "pvc": pvc_name, "size": size}
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    # ==================== AUTOSCALING ====================
    
    async def configure_autoscaling(
        self,
        namespace: str,
        deployment_name: str,
        min_replicas: int = 1,
        max_replicas: int = 5,
        cpu_threshold: int = 70
    ) -> Dict[str, Any]:
        """Configure horizontal pod autoscaler"""
        if not self.is_available:
            return {"success": False, "error": "Kubernetes not available"}
        
        try:
            hpa_name = f"{deployment_name}-hpa"
            
            hpa = client.V1HorizontalPodAutoscaler(
                metadata=client.V1ObjectMeta(name=hpa_name),
                spec=client.V1HorizontalPodAutoscalerSpec(
                    scale_target_ref=client.V1CrossVersionObjectReference(
                        api_version="apps/v1",
                        kind="Deployment",
                        name=deployment_name
                    ),
                    min_replicas=min_replicas,
                    max_replicas=max_replicas,
                    target_cpu_utilization_percentage=cpu_threshold
                )
            )
            
            try:
                self.autoscaling_v1.create_namespaced_horizontal_pod_autoscaler(
                    namespace=namespace, body=hpa
                )
            except ApiException as e:
                if e.status == 409:
                    self.autoscaling_v1.replace_namespaced_horizontal_pod_autoscaler(
                        name=hpa_name, namespace=namespace, body=hpa
                    )
                else:
                    raise
            
            return {
                "success": True,
                "hpa": hpa_name,
                "min_replicas": min_replicas,
                "max_replicas": max_replicas
            }
            
        except ApiException as e:
            return {"success": False, "error": str(e)}
    
    # ==================== PLATFORM STATS (ADMIN) ====================
    
    async def get_platform_stats(self) -> Dict[str, Any]:
        """Get platform-wide statistics (for superadmin)"""
        if not self.is_available:
            return {"error": "Kubernetes not available"}
        
        try:
            # Get all tenant namespaces
            namespaces = self.v1.list_namespace(label_selector="eusuite-tenant=true")
            
            total_pods = 0
            total_deployments = 0
            total_storage = 0
            total_cost = 0
            
            tenant_stats = []
            
            for ns in namespaces.items:
                ns_name = ns.metadata.name
                company = ns.metadata.labels.get("company", ns_name)
                
                try:
                    pods = self.v1.list_namespaced_pod(namespace=ns_name)
                    deployments = self.apps_v1.list_namespaced_deployment(namespace=ns_name)
                    pvcs = self.v1.list_namespaced_persistent_volume_claim(namespace=ns_name)
                    
                    pod_count = len(pods.items)
                    dep_count = len(deployments.items)
                    
                    storage = 0
                    for pvc in pvcs.items:
                        size = pvc.spec.resources.requests.get("storage", "0Gi")
                        if "Gi" in size:
                            storage += float(size.replace("Gi", ""))
                    
                    cost = pod_count * 10  # Simplified cost calculation
                    
                    total_pods += pod_count
                    total_deployments += dep_count
                    total_storage += storage
                    total_cost += cost
                    
                    tenant_stats.append({
                        "namespace": ns_name,
                        "company": company,
                        "pods": pod_count,
                        "deployments": dep_count,
                        "storage_gi": storage,
                        "monthly_cost": cost
                    })
                    
                except:
                    continue
            
            return {
                "total_tenants": len(namespaces.items),
                "total_pods": total_pods,
                "total_deployments": total_deployments,
                "total_storage_gi": round(total_storage, 2),
                "total_monthly_revenue": round(total_cost, 2),
                "tenants": tenant_stats
            }
            
        except ApiException as e:
            return {"error": str(e)}


# Singleton instance
kubernetes_service = KubernetesService()
