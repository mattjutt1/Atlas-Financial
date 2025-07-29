"""
Service Registry v2.0 for Atlas Financial AI Engine
Implements proper service boundaries and isolation patterns
Replaces direct database access with API gateway pattern
"""

import asyncio
import structlog
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import aiohttp

from ..config.atlas_config_bridge import get_atlas_config
from ..errors import (
    ExternalServiceError,
    ServiceUnavailableError,
    TimeoutError,
    handleError
)

logger = structlog.get_logger()

class ServiceStatus(Enum):
    """Service status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded" 
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"

@dataclass
class ServiceEndpoint:
    """Service endpoint configuration"""
    name: str
    url: str
    health_path: str = "/health"
    timeout: int = 5
    required: bool = True
    retry_count: int = 3

@dataclass
class ServiceHealth:
    """Service health status"""
    name: str
    status: ServiceStatus
    response_time_ms: Optional[int] = None
    last_check: Optional[str] = None
    error: Optional[str] = None

class ServiceRegistryV2:
    """
    Service registry v2.0 implementing proper service boundaries
    Eliminates architectural violations by managing connections properly
    """
    
    def __init__(self):
        self.config = get_atlas_config()
        self.services: Dict[str, ServiceEndpoint] = {}
        self.health_cache: Dict[str, ServiceHealth] = {}
        self.session: Optional[aiohttp.ClientSession] = None
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize service endpoints based on atlas-shared configuration"""
        api_config = self.config.get_api_config()
        auth_config = self.config.get_auth_config()
        redis_config = self.config.get_redis_config()
        consolidated_config = self.config.get_consolidated_config()
        
        # API Gateway (primary service boundary - eliminates direct DB access)
        self.services['api-gateway'] = ServiceEndpoint(
            name='api-gateway',
            url=api_config['base_url'],
            health_path='/health',
            timeout=10,
            required=True,
            retry_count=3
        )
        
        # SuperTokens Core (authentication service)
        self.services['supertokens-core'] = ServiceEndpoint(
            name='supertokens-core',
            url=auth_config['supertokens_core_url'],
            health_path='/hello',  # SuperTokens health endpoint
            timeout=5,
            required=True,
            retry_count=2
        )
        
        # Rust Financial Engine (calculation service)
        if 'rust_engine_url' in consolidated_config:
            self.services['rust-engine'] = ServiceEndpoint(
                name='rust-engine',
                url=consolidated_config['rust_engine_url'],
                health_path='/health',
                timeout=15,  # Longer timeout for complex calculations
                required=True,
                retry_count=2
            )
        
        # Redis Cache (optional but recommended)
        if redis_config['enabled']:
            self.services['redis'] = ServiceEndpoint(
                name='redis',
                url=redis_config['url'],
                health_path='/ping',
                timeout=2,
                required=False,
                retry_count=1
            )
        
        logger.info("Service registry v2.0 initialized", 
                   services=list(self.services.keys()),
                   required_services=[s.name for s in self.services.values() if s.required],
                   architectural_compliance="phase-2.5")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure HTTP session exists"""
        if not self.session or self.session.closed:
            connector = aiohttp.TCPConnector(
                limit=50,
                limit_per_host=10,
                ttl_dns_cache=300,
                use_dns_cache=True,
            )
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    'User-Agent': 'Atlas-AI-Engine-ServiceRegistry/2.0'
                }
            )
    
    async def close(self):
        """Close HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def check_service_health(self, service_name: str) -> ServiceHealth:
        """Check health of a specific service"""
        if service_name not in self.services:
            return ServiceHealth(
                name=service_name,
                status=ServiceStatus.UNKNOWN,
                error="Service not registered"
            )
        
        service = self.services[service_name]
        start_time = asyncio.get_event_loop().time()
        
        try:
            await self._ensure_session()
            
            # Special handling for Redis
            if service_name == 'redis':
                return await self._check_redis_health(service)
            
            # HTTP health check for other services
            health_url = f"{service.url.rstrip('/')}{service.health_path}"
            
            async with self.session.get(
                health_url,
                timeout=aiohttp.ClientTimeout(total=service.timeout)
            ) as response:
                response_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                
                if response.status == 200:
                    health = ServiceHealth(
                        name=service_name,
                        status=ServiceStatus.HEALTHY,
                        response_time_ms=response_time_ms,
                        last_check=str(asyncio.get_event_loop().time())
                    )
                else:
                    health = ServiceHealth(
                        name=service_name,
                        status=ServiceStatus.DEGRADED,
                        response_time_ms=response_time_ms,
                        error=f"HTTP {response.status}"
                    )
                
                self.health_cache[service_name] = health
                return health
        
        except asyncio.TimeoutError:
            health = ServiceHealth(
                name=service_name,
                status=ServiceStatus.UNAVAILABLE,
                error=f"Timeout after {service.timeout}s"
            )
        except Exception as e:
            health = ServiceHealth(
                name=service_name,
                status=ServiceStatus.UNAVAILABLE,
                error=str(e)
            )
        
        self.health_cache[service_name] = health
        return health
    
    async def _check_redis_health(self, service: ServiceEndpoint) -> ServiceHealth:
        """Special health check for Redis service"""
        try:
            # Use aioredis or fallback to basic check
            try:
                import redis.asyncio as redis
                redis_client = redis.from_url(
                    service.url,
                    socket_timeout=service.timeout,
                    socket_connect_timeout=service.timeout
                )
                
                start_time = asyncio.get_event_loop().time()
                await redis_client.ping()
                response_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
                
                await redis_client.close()
                
                return ServiceHealth(
                    name=service.name,
                    status=ServiceStatus.HEALTHY,
                    response_time_ms=response_time_ms
                )
            except ImportError:
                # Fallback to HTTP-based check if redis library not available
                return ServiceHealth(
                    name=service.name,
                    status=ServiceStatus.DEGRADED,
                    error="Redis library not available for direct check"
                )
            
        except Exception as e:
            return ServiceHealth(
                name=service.name,
                status=ServiceStatus.UNAVAILABLE,
                error=str(e)
            )
    
    async def check_all_services(self) -> Dict[str, ServiceHealth]:
        """Check health of all registered services"""
        health_checks = []
        
        for service_name in self.services:
            health_checks.append(self.check_service_health(service_name))
        
        results = await asyncio.gather(*health_checks, return_exceptions=True)
        
        health_status = {}
        for i, service_name in enumerate(self.services):
            result = results[i]
            if isinstance(result, Exception):
                health_status[service_name] = ServiceHealth(
                    name=service_name,
                    status=ServiceStatus.UNAVAILABLE,
                    error=str(result)
                )
            else:
                health_status[service_name] = result
        
        return health_status
    
    async def ensure_service_availability(self, service_name: str) -> bool:
        """Ensure a service is available, with retries"""
        if service_name not in self.services:
            logger.error("Service not registered", service=service_name)
            return False
        
        service = self.services[service_name]
        
        for attempt in range(service.retry_count):
            health = await self.check_service_health(service_name)
            
            if health.status == ServiceStatus.HEALTHY:
                logger.debug("Service available", 
                           service=service_name,
                           attempt=attempt + 1,
                           response_time_ms=health.response_time_ms)
                return True
            
            if attempt < service.retry_count - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning("Service unavailable, retrying",
                             service=service_name,
                             attempt=attempt + 1,
                             wait_time=wait_time,
                             error=health.error)
                await asyncio.sleep(wait_time)
        
        # All retries failed
        if service.required:
            logger.error("Required service unavailable", 
                        service=service_name,
                        attempts=service.retry_count)
            raise ServiceUnavailableError(service_name)
        else:
            logger.warning("Optional service unavailable", 
                          service=service_name,
                          attempts=service.retry_count)
            return False
    
    async def get_service_url(self, service_name: str) -> str:
        """Get service URL, ensuring availability"""
        if service_name not in self.services:
            raise ExternalServiceError(service_name, "Service not registered")
        
        await self.ensure_service_availability(service_name)
        return self.services[service_name].url
    
    def get_service_boundaries_info(self) -> Dict[str, Any]:
        """Get information about service boundaries for compliance"""
        return {
            'registry_version': '2.0.0',
            'architectural_pattern': 'service-boundaries',
            'phase': 'phase-2.5',
            'total_services': len(self.services),
            'required_services': [s.name for s in self.services.values() if s.required],
            'optional_services': [s.name for s in self.services.values() if not s.required],
            'service_boundaries': {
                'data_access': 'api-gateway',  # No direct DB access
                'authentication': 'supertokens-core',
                'calculations': 'rust-engine',
                'caching': 'redis'
            },
            'compliance': {
                'direct_db_access': False,
                'service_isolation': True,
                'proper_authentication': True,
                'error_handling': 'atlas-shared',
                'configuration': 'atlas-shared-bridge'
            }
        }
    
    async def validate_service_boundaries(self) -> Dict[str, Any]:
        """Validate that service boundaries are properly implemented"""
        validation_results = {
            'compliant': True,
            'violations': [],
            'warnings': [],
            'service_health': {},
            'architectural_phase': 'phase-2.5'
        }
        
        # Check all services
        health_status = await self.check_all_services()
        validation_results['service_health'] = {
            name: health.status.value for name, health in health_status.items()
        }
        
        # Check for required services
        for service_name, service in self.services.items():
            if service.required:
                health = health_status.get(service_name)
                if not health or health.status != ServiceStatus.HEALTHY:
                    validation_results['violations'].append(
                        f"Required service '{service_name}' is not healthy"
                    )
                    validation_results['compliant'] = False
        
        # Check for architectural compliance
        if 'api-gateway' not in self.services:
            validation_results['violations'].append(
                "API Gateway not configured - direct DB access possible"
            )
            validation_results['compliant'] = False
        
        if 'supertokens-core' not in self.services:
            validation_results['violations'].append(
                "SuperTokens Core not configured - non-standard authentication"
            )
            validation_results['compliant'] = False
        
        # Additional Phase 2.5 compliance checks
        consolidated_config = self.config.get_consolidated_config()
        architectural_compliance = consolidated_config.get('architectural_compliance', {})
        
        if architectural_compliance.get('direct_db_access', True):
            validation_results['violations'].append(
                "Direct database access detected - violates service boundaries"
            )
            validation_results['compliant'] = False
        
        # Log validation results
        if validation_results['compliant']:
            logger.info("Service boundaries validation passed", 
                       services=list(self.services.keys()),
                       phase="phase-2.5")
        else:
            logger.error("Service boundaries validation failed", 
                        violations=validation_results['violations'],
                        phase="phase-2.5")
        
        return validation_results

# Global service registry instance
_service_registry_v2: Optional[ServiceRegistryV2] = None

async def get_service_registry_v2() -> ServiceRegistryV2:
    """Get or create service registry v2.0 instance"""
    global _service_registry_v2
    if not _service_registry_v2:
        _service_registry_v2 = ServiceRegistryV2()
        await _service_registry_v2._ensure_session()
    return _service_registry_v2

async def close_service_registry_v2():
    """Close service registry v2.0"""
    global _service_registry_v2
    if _service_registry_v2:
        await _service_registry_v2.close()
        _service_registry_v2 = None

# Export for easy access
__all__ = [
    'ServiceRegistryV2',
    'ServiceEndpoint', 
    'ServiceHealth',
    'ServiceStatus',
    'get_service_registry_v2',
    'close_service_registry_v2'
]