from typing import Optional
import redis.asyncio as redis
from app.config import settings


class PortManager:
    """
    Service for managing NodePort allocations.
    Ensures unique port assignments across all companies.
    Port range: 30100 - 32767 (NodePort range minus reserved ports)
    """
    
    PORT_MIN = 30100
    PORT_MAX = 32767
    RESERVED_PORTS = {
        30080, 30081, 30082, 30083,  # Existing apps
        30090, 30091,  # Dashboard, Login
        30500, 30510, 30600,  # Backend ports
    }
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
    
    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(settings.redis_url)
        return self._redis
    
    async def allocate_port(self, company_id: int, app_type: str) -> int:
        """
        Allocate a unique NodePort for a company's app.
        Returns the allocated port number.
        """
        r = await self._get_redis()
        key = f"port:{company_id}:{app_type}"
        
        # Check if already allocated
        existing = await r.get(key)
        if existing:
            return int(existing)
        
        # Find next available port
        for port in range(self.PORT_MIN, self.PORT_MAX + 1):
            if port in self.RESERVED_PORTS:
                continue
            
            port_key = f"port:allocated:{port}"
            # Try to set the port (NX = only if not exists)
            if await r.set(port_key, f"{company_id}:{app_type}", nx=True):
                # Successfully allocated
                await r.set(key, port)
                return port
        
        raise RuntimeError("No available ports")
    
    async def release_port(self, company_id: int, app_type: str) -> bool:
        """Release a port allocation."""
        r = await self._get_redis()
        key = f"port:{company_id}:{app_type}"
        
        port = await r.get(key)
        if port:
            port_key = f"port:allocated:{port.decode()}"
            await r.delete(port_key)
            await r.delete(key)
            return True
        return False
    
    async def get_port(self, company_id: int, app_type: str) -> Optional[int]:
        """Get the port allocated for a company's app."""
        r = await self._get_redis()
        key = f"port:{company_id}:{app_type}"
        port = await r.get(key)
        return int(port) if port else None
    
    async def get_all_allocations(self, company_id: int) -> dict:
        """Get all port allocations for a company."""
        r = await self._get_redis()
        pattern = f"port:{company_id}:*"
        allocations = {}
        
        async for key in r.scan_iter(match=pattern):
            app_type = key.decode().split(":")[-1]
            port = await r.get(key)
            if port:
                allocations[app_type] = int(port)
        
        return allocations
    
    async def is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        if port in self.RESERVED_PORTS:
            return False
        if port < self.PORT_MIN or port > self.PORT_MAX:
            return False
        
        r = await self._get_redis()
        port_key = f"port:allocated:{port}"
        return not await r.exists(port_key)


port_manager = PortManager()
