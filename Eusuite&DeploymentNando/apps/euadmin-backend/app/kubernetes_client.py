"""
EUAdmin Backend - Kubernetes integration
Provides access to Kubernetes metrics and cluster information.
"""
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class KubernetesClient:
    """Client for interacting with Kubernetes API."""
    
    def __init__(self):
        self.namespace = os.getenv("KUBE_NAMESPACE", "eucloud")
        self._client = None
        self._metrics_client = None
        self._initialized = False
    
    def _init_client(self):
        """Initialize the Kubernetes client (lazy loading)."""
        if self._initialized:
            return
        
        try:
            from kubernetes import client, config
            
            # Try in-cluster config first, fall back to kubeconfig
            try:
                config.load_incluster_config()
                logger.info("Loaded in-cluster Kubernetes config")
            except config.ConfigException:
                try:
                    config.load_kube_config()
                    logger.info("Loaded kubeconfig")
                except config.ConfigException:
                    logger.warning("Could not load Kubernetes config")
                    self._initialized = True
                    return
            
            self._client = client.CoreV1Api()
            self._apps_client = client.AppsV1Api()
            self._custom_client = client.CustomObjectsApi()
            self._initialized = True
            logger.info("Kubernetes client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Kubernetes client: {e}")
            self._initialized = True
    
    def get_pods(self) -> List[Dict[str, Any]]:
        """Get all pods in the namespace."""
        self._init_client()
        if not self._client:
            return []
        
        try:
            pods = self._client.list_namespaced_pod(self.namespace)
            return [
                {
                    "name": pod.metadata.name,
                    "status": pod.status.phase,
                    "ready": self._is_pod_ready(pod),
                    "restarts": self._get_restart_count(pod),
                    "created": pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
                    "app": pod.metadata.labels.get("app", "unknown") if pod.metadata.labels else "unknown",
                    "node": pod.spec.node_name,
                }
                for pod in pods.items
            ]
        except Exception as e:
            logger.error(f"Failed to get pods: {e}")
            return []
    
    def _is_pod_ready(self, pod) -> bool:
        """Check if a pod is ready."""
        if not pod.status.conditions:
            return False
        for condition in pod.status.conditions:
            if condition.type == "Ready":
                return condition.status == "True"
        return False
    
    def _get_restart_count(self, pod) -> int:
        """Get total restart count for a pod."""
        if not pod.status.container_statuses:
            return 0
        return sum(cs.restart_count for cs in pod.status.container_statuses)
    
    def get_deployments(self) -> List[Dict[str, Any]]:
        """Get all deployments in the namespace."""
        self._init_client()
        if not self._client:
            return []
        
        try:
            deployments = self._apps_client.list_namespaced_deployment(self.namespace)
            return [
                {
                    "name": dep.metadata.name,
                    "replicas": dep.spec.replicas,
                    "ready_replicas": dep.status.ready_replicas or 0,
                    "available_replicas": dep.status.available_replicas or 0,
                    "updated_replicas": dep.status.updated_replicas or 0,
                    "created": dep.metadata.creation_timestamp.isoformat() if dep.metadata.creation_timestamp else None,
                }
                for dep in deployments.items
            ]
        except Exception as e:
            logger.error(f"Failed to get deployments: {e}")
            return []
    
    def get_pod_metrics(self) -> List[Dict[str, Any]]:
        """Get pod resource metrics using metrics API."""
        self._init_client()
        if not self._custom_client:
            return []
        
        try:
            metrics = self._custom_client.list_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=self.namespace,
                plural="pods"
            )
            
            result = []
            for pod in metrics.get("items", []):
                containers = pod.get("containers", [])
                total_cpu = 0
                total_memory = 0
                
                for container in containers:
                    cpu = container.get("usage", {}).get("cpu", "0")
                    memory = container.get("usage", {}).get("memory", "0")
                    total_cpu += self._parse_cpu(cpu)
                    total_memory += self._parse_memory(memory)
                
                result.append({
                    "name": pod.get("metadata", {}).get("name", "unknown"),
                    "cpu_millicores": total_cpu,
                    "memory_mb": round(total_memory / (1024 * 1024), 2),
                    "timestamp": pod.get("timestamp", datetime.utcnow().isoformat())
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get pod metrics: {e}")
            return []
    
    def _parse_cpu(self, cpu_string: str) -> int:
        """Parse CPU string to millicores."""
        try:
            if cpu_string.endswith("n"):
                return int(cpu_string[:-1]) // 1000000
            elif cpu_string.endswith("m"):
                return int(cpu_string[:-1])
            else:
                return int(float(cpu_string) * 1000)
        except (ValueError, AttributeError):
            return 0
    
    def _parse_memory(self, memory_string: str) -> int:
        """Parse memory string to bytes."""
        try:
            if memory_string.endswith("Ki"):
                return int(memory_string[:-2]) * 1024
            elif memory_string.endswith("Mi"):
                return int(memory_string[:-2]) * 1024 * 1024
            elif memory_string.endswith("Gi"):
                return int(memory_string[:-2]) * 1024 * 1024 * 1024
            elif memory_string.endswith("K"):
                return int(memory_string[:-1]) * 1000
            elif memory_string.endswith("M"):
                return int(memory_string[:-1]) * 1000 * 1000
            elif memory_string.endswith("G"):
                return int(memory_string[:-1]) * 1000 * 1000 * 1000
            else:
                return int(memory_string)
        except (ValueError, AttributeError):
            return 0
    
    def get_node_metrics(self) -> List[Dict[str, Any]]:
        """Get node resource metrics."""
        self._init_client()
        if not self._custom_client:
            return []
        
        try:
            metrics = self._custom_client.list_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="nodes"
            )
            
            result = []
            for node in metrics.get("items", []):
                usage = node.get("usage", {})
                result.append({
                    "name": node.get("metadata", {}).get("name", "unknown"),
                    "cpu_millicores": self._parse_cpu(usage.get("cpu", "0")),
                    "memory_mb": round(self._parse_memory(usage.get("memory", "0")) / (1024 * 1024), 2),
                    "timestamp": node.get("timestamp", datetime.utcnow().isoformat())
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get node metrics: {e}")
            return []
    
    def get_persistent_volumes(self) -> List[Dict[str, Any]]:
        """Get persistent volume claims in the namespace."""
        self._init_client()
        if not self._client:
            return []
        
        try:
            pvcs = self._client.list_namespaced_persistent_volume_claim(self.namespace)
            return [
                {
                    "name": pvc.metadata.name,
                    "status": pvc.status.phase,
                    "capacity": pvc.status.capacity.get("storage", "0") if pvc.status.capacity else "0",
                    "storage_class": pvc.spec.storage_class_name,
                    "created": pvc.metadata.creation_timestamp.isoformat() if pvc.metadata.creation_timestamp else None,
                }
                for pvc in pvcs.items
            ]
        except Exception as e:
            logger.error(f"Failed to get PVCs: {e}")
            return []
    
    def get_pod_logs(self, pod_name: str, lines: int = 100) -> str:
        """Get logs from a specific pod."""
        self._init_client()
        if not self._client:
            return ""
        
        try:
            logs = self._client.read_namespaced_pod_log(
                name=pod_name,
                namespace=self.namespace,
                tail_lines=lines
            )
            return logs
        except Exception as e:
            logger.error(f"Failed to get logs for pod {pod_name}: {e}")
            return f"Error: {str(e)}"
    
    def restart_deployment(self, deployment_name: str) -> bool:
        """Restart a deployment by patching it."""
        self._init_client()
        if not self._apps_client:
            return False
        
        try:
            from kubernetes.client import V1Deployment
            import json
            
            # Patch the deployment with a restart annotation
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
            
            self._apps_client.patch_namespaced_deployment(
                name=deployment_name,
                namespace=self.namespace,
                body=patch
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to restart deployment {deployment_name}: {e}")
            return False


# Singleton instance
k8s_client = KubernetesClient()
