"""
EUAdmin Backend - Port Manager
Manages NodePort allocation for tenant services.
"""
import logging
from typing import Optional, List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models import PortAllocation, ServiceType

logger = logging.getLogger(__name__)

# Port ranges for different service types
# Central cloud uses 30080-30099
# Tenants use 30100-32767
PORT_RANGE_START = 30100
PORT_RANGE_END = 32767

# Default ports per service type (offsets from base)
SERVICE_PORT_OFFSETS = {
    ServiceType.DASHBOARD: 0,
    ServiceType.LOGIN: 1,
    ServiceType.EUCLOUD: 2,
    ServiceType.EUTYPE: 3,
    ServiceType.EUMAIL: 4,
    ServiceType.EUGROUPS: 5,
    ServiceType.EUADMIN: 6,
}

# Reserved ports (central cloud)
RESERVED_PORTS = [
    30080,  # eucloud-frontend
    30081,  # eutype
    30082,  # eugroups-frontend
    30083,  # eumail-frontend
    30084,  # eugroups-media
    30090,  # login
    30091,  # dashboard
    30095,  # euadmin-frontend
    30096,  # euadmin-backend (old)
    30500,  # eucloud-backend
    30501,  # eugroups-backend
    30502,  # eumail-backend
    30620,  # euadmin-backend
]


class PortManager:
    """Service for managing NodePort allocations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def allocate_ports_for_company(
        self,
        company_id: int,
        namespace: str,
        services: List[ServiceType],
    ) -> Dict[ServiceType, int]:
        """
        Allocate NodePorts for a company's services.
        Returns mapping of service type to port.
        """
        allocated = {}
        
        # Find a block of consecutive ports
        base_port = self._find_available_port_block(len(services))
        
        for i, service_type in enumerate(services):
            port = base_port + i
            
            # Check if already allocated
            existing = self.db.query(PortAllocation).filter(
                PortAllocation.port == port
            ).first()
            
            if existing and existing.is_allocated:
                # Find next available
                port = self._find_next_available_port(port + 1)
            
            # Create or update allocation
            if existing:
                existing.company_id = company_id
                existing.service_type = service_type
                existing.namespace = namespace
                existing.is_allocated = True
                existing.released_at = None
            else:
                allocation = PortAllocation(
                    port=port,
                    company_id=company_id,
                    service_type=service_type,
                    namespace=namespace,
                    is_allocated=True,
                )
                self.db.add(allocation)
            
            allocated[service_type] = port
        
        self.db.commit()
        logger.info(f"Allocated ports for company {company_id}: {allocated}")
        return allocated
    
    def allocate_single_port(
        self,
        company_id: int,
        namespace: str,
        service_type: ServiceType,
        preferred_port: Optional[int] = None,
    ) -> int:
        """Allocate a single port for a service."""
        if preferred_port and self._is_port_available(preferred_port):
            port = preferred_port
        else:
            port = self._find_next_available_port(PORT_RANGE_START)
        
        allocation = PortAllocation(
            port=port,
            company_id=company_id,
            service_type=service_type,
            namespace=namespace,
            is_allocated=True,
        )
        self.db.add(allocation)
        self.db.commit()
        
        logger.info(f"Allocated port {port} for {service_type} (company {company_id})")
        return port
    
    def release_ports_for_company(self, company_id: int) -> int:
        """Release all ports allocated to a company."""
        from datetime import datetime
        
        allocations = self.db.query(PortAllocation).filter(
            PortAllocation.company_id == company_id,
            PortAllocation.is_allocated == True
        ).all()
        
        count = 0
        for allocation in allocations:
            allocation.is_allocated = False
            allocation.released_at = datetime.utcnow()
            count += 1
        
        self.db.commit()
        logger.info(f"Released {count} ports for company {company_id}")
        return count
    
    def get_company_ports(self, company_id: int) -> Dict[str, int]:
        """Get all ports allocated to a company."""
        allocations = self.db.query(PortAllocation).filter(
            PortAllocation.company_id == company_id,
            PortAllocation.is_allocated == True
        ).all()
        
        return {
            alloc.service_type.value if alloc.service_type else f"port_{alloc.port}": alloc.port
            for alloc in allocations
        }
    
    def get_available_ports(self, count: int = 10) -> List[int]:
        """Get list of next available ports."""
        available = []
        port = PORT_RANGE_START
        
        while len(available) < count and port <= PORT_RANGE_END:
            if self._is_port_available(port):
                available.append(port)
            port += 1
        
        return available
    
    def get_all_allocations(self) -> List[PortAllocation]:
        """Get all port allocations."""
        return self.db.query(PortAllocation).filter(
            PortAllocation.is_allocated == True
        ).order_by(PortAllocation.port).all()
    
    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        if port in RESERVED_PORTS:
            return False
        
        if port < PORT_RANGE_START or port > PORT_RANGE_END:
            return False
        
        existing = self.db.query(PortAllocation).filter(
            PortAllocation.port == port,
            PortAllocation.is_allocated == True
        ).first()
        
        return existing is None
    
    def _find_next_available_port(self, start: int = PORT_RANGE_START) -> int:
        """Find next available port starting from given port."""
        port = max(start, PORT_RANGE_START)
        
        while port <= PORT_RANGE_END:
            if self._is_port_available(port):
                return port
            port += 1
        
        raise ValueError("No available ports in range")
    
    def _find_available_port_block(self, size: int) -> int:
        """Find a block of consecutive available ports."""
        port = PORT_RANGE_START
        
        while port + size <= PORT_RANGE_END:
            block_available = True
            for i in range(size):
                if not self._is_port_available(port + i):
                    block_available = False
                    port = port + i + 1
                    break
            
            if block_available:
                return port
        
        # Fallback: just return next available
        return self._find_next_available_port(PORT_RANGE_START)
