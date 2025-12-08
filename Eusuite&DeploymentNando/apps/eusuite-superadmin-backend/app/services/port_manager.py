import redis.asyncio as redis
from typing import Optional
from .config import settings


class PortManager:
    """Manage NodePort allocation for tenant deployments"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.port_range_start = settings.PORT_RANGE_START
        self.port_range_end = settings.PORT_RANGE_END
        self.port_key_prefix = "superadmin:port:"
        self.allocated_ports_key = "superadmin:allocated_ports"
    
    async def connect(self):
        """Connect to Redis"""
        if not self.redis:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            self.redis = None
    
    async def allocate_port(self, tenant_id: int, app_name: str) -> int:
        """Allocate a new port for a tenant deployment"""
        await self.connect()
        
        # Check if already allocated
        existing_key = f"{self.port_key_prefix}{tenant_id}:{app_name}"
        existing_port = await self.redis.get(existing_key)
        if existing_port:
            return int(existing_port)
        
        # Find next available port
        for port in range(self.port_range_start, self.port_range_end):
            port_in_use = await self.redis.sismember(self.allocated_ports_key, str(port))
            if not port_in_use:
                # Allocate the port
                await self.redis.sadd(self.allocated_ports_key, str(port))
                await self.redis.set(existing_key, str(port))
                await self.redis.set(f"{self.port_key_prefix}reverse:{port}", f"{tenant_id}:{app_name}")
                return port
        
        raise RuntimeError("No available ports in the configured range")
    
    async def release_port(self, tenant_id: int, app_name: str) -> Optional[int]:
        """Release an allocated port"""
        await self.connect()
        
        key = f"{self.port_key_prefix}{tenant_id}:{app_name}"
        port = await self.redis.get(key)
        
        if port:
            await self.redis.srem(self.allocated_ports_key, port)
            await self.redis.delete(key)
            await self.redis.delete(f"{self.port_key_prefix}reverse:{port}")
            return int(port)
        
        return None
    
    async def get_port(self, tenant_id: int, app_name: str) -> Optional[int]:
        """Get the allocated port for a tenant deployment"""
        await self.connect()
        
        key = f"{self.port_key_prefix}{tenant_id}:{app_name}"
        port = await self.redis.get(key)
        return int(port) if port else None
    
    async def get_all_allocated_ports(self) -> dict:
        """Get all allocated ports with their assignments"""
        await self.connect()
        
        ports = await self.redis.smembers(self.allocated_ports_key)
        allocations = {}
        
        for port in ports:
            assignment = await self.redis.get(f"{self.port_key_prefix}reverse:{port}")
            if assignment:
                allocations[int(port)] = assignment
        
        return allocations


# Global instance
port_manager = PortManager()
