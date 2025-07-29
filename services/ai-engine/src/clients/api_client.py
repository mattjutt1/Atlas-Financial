"""
Atlas Financial API Client for AI Engine
Implements proper service boundaries by going through API gateway instead of direct DB access
"""

import aiohttp
import asyncio
import structlog
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

from ..config import settings
from ..errors import (
    AtlasError,
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    NotFoundError,
    RateLimitError,
    TimeoutError,
    handleError
)

logger = structlog.get_logger()

class RetryStrategy(Enum):
    NONE = "none"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"

@dataclass
class RequestConfig:
    """Configuration for API requests"""
    timeout: int = 30
    retries: int = 3
    retry_strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    retry_backoff: float = 1.0
    require_auth: bool = True

class AtlasApiClient:
    """
    API client for Atlas Financial services that follows architectural patterns:
    - Goes through API gateway instead of direct database access
    - Implements proper authentication with JWT tokens
    - Uses atlas-shared error handling patterns
    - Provides service boundary isolation
    """

    def __init__(self, 
                 base_url: str = None,
                 auth_token: str = None,
                 timeout: int = 30):
        self.base_url = base_url or settings.api_gateway_url
        self.auth_token = auth_token
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
        logger.info("Initializing Atlas API Client", 
                   base_url=self.base_url,
                   has_auth_token=bool(auth_token))

    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def _ensure_session(self):
        """Ensure HTTP session is created"""
        if self.session is None or self.session.closed:
            connector = aiohttp.TCPConnector(
                limit=50,
                limit_per_host=10,
                ttl_dns_cache=300,
                use_dns_cache=True,
            )
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Atlas-AI-Engine/1.0'
                }
            )

    async def close(self):
        """Close the HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()

    def _prepare_headers(self, require_auth: bool = True) -> Dict[str, str]:
        """Prepare request headers with authentication"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        if require_auth and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        elif require_auth and not self.auth_token:
            logger.warning("Authentication required but no token provided")

        return headers

    async def _make_request(self,
                          method: str,
                          endpoint: str,
                          data: Optional[Dict[str, Any]] = None,
                          params: Optional[Dict[str, Any]] = None,
                          config: RequestConfig = None) -> Dict[str, Any]:
        """Make HTTP request with retry logic and error handling"""
        if config is None:
            config = RequestConfig()

        await self._ensure_session()
        
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = self._prepare_headers(config.require_auth)

        last_exception = None
        
        for attempt in range(config.retries + 1):
            try:
                logger.debug("Making API request",
                           method=method,
                           url=url,
                           attempt=attempt + 1,
                           max_attempts=config.retries + 1)

                async with self.session.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    headers=headers
                ) as response:
                    
                    # Handle specific HTTP status codes
                    if response.status == 401:
                        error_data = await self._safe_json_response(response)
                        raise AuthenticationError(
                            error_data.get('message', 'Authentication failed'),
                            metadata={'status_code': response.status, 'url': url}
                        )
                    
                    elif response.status == 403:
                        error_data = await self._safe_json_response(response)
                        raise AuthorizationError(
                            error_data.get('message', 'Access denied'),
                            metadata={'status_code': response.status, 'url': url}
                        )
                    
                    elif response.status == 404:
                        raise NotFoundError(
                            'endpoint',
                            endpoint,
                            metadata={'status_code': response.status, 'url': url}
                        )
                    
                    elif response.status == 429:
                        retry_after = response.headers.get('Retry-After', '60')
                        raise RateLimitError(
                            limit=1000,  # Default assumption
                            window='1 minute',
                            retryAfter=int(retry_after),
                            metadata={'status_code': response.status, 'url': url}
                        )
                    
                    elif response.status >= 500:
                        error_data = await self._safe_json_response(response)
                        raise ExternalServiceError(
                            'api-gateway',
                            error_data.get('message', f'Server error: {response.status}'),
                            metadata={'status_code': response.status, 'url': url}
                        )
                    
                    elif response.status >= 400:
                        error_data = await self._safe_json_response(response)
                        raise AtlasError(
                            error_data.get('message', f'Request failed: {response.status}'),
                            f'HTTP_{response.status}',
                            'client_error',
                            response.status,
                            False,
                            [],
                            {'status_code': response.status, 'url': url, 'error_data': error_data}
                        )

                    # Success response
                    response_data = await self._safe_json_response(response)
                    
                    logger.info("API request successful",
                              method=method,
                              url=url,
                              status_code=response.status,
                              attempt=attempt + 1)
                    
                    return response_data

            except (aiohttp.ClientTimeout, asyncio.TimeoutError) as e:
                last_exception = TimeoutError(
                    config.timeout * 1000,
                    metadata={'url': url, 'attempt': attempt + 1}
                )
                
            except (aiohttp.ClientError, OSError) as e:
                last_exception = ExternalServiceError(
                    'api-gateway',
                    f'Network error: {str(e)}',
                    metadata={'url': url, 'attempt': attempt + 1}
                )
            
            except AtlasError:
                # Re-raise AtlasErrors immediately
                raise
                
            except Exception as e:
                last_exception = handleError(e, f"API request to {url}")

            # Calculate retry delay if not the last attempt
            if attempt < config.retries:
                delay = self._calculate_retry_delay(attempt, config)
                logger.warning("Request failed, retrying",
                             attempt=attempt + 1,
                             max_attempts=config.retries + 1,
                             delay_seconds=delay,
                             error=str(last_exception))
                await asyncio.sleep(delay)

        # All retries failed
        logger.error("All retry attempts failed",
                    method=method,
                    url=url,
                    attempts=config.retries + 1)
        
        if last_exception:
            raise last_exception
        else:
            raise ExternalServiceError(
                'api-gateway',
                'Request failed after all retries',
                metadata={'url': url, 'attempts': config.retries + 1}
            )

    def _calculate_retry_delay(self, attempt: int, config: RequestConfig) -> float:
        """Calculate delay before retry based on strategy"""
        if config.retry_strategy == RetryStrategy.NONE:
            return 0
        elif config.retry_strategy == RetryStrategy.LINEAR:
            return config.retry_backoff * (attempt + 1)
        else:  # EXPONENTIAL
            return config.retry_backoff * (2 ** attempt)

    async def _safe_json_response(self, response: aiohttp.ClientResponse) -> Dict[str, Any]:
        """Safely parse JSON response, returning empty dict on error"""
        try:
            return await response.json()
        except (aiohttp.ContentTypeError, ValueError):
            text = await response.text()
            return {'message': text[:500]} if text else {}

    # High-level API methods that AI Engine will use

    async def get_user_financial_data(self, user_id: str) -> Dict[str, Any]:
        """Get user's financial data through API gateway"""
        return await self._make_request(
            'GET',
            f'/api/v1/users/{user_id}/financial-data',
            config=RequestConfig(require_auth=True)
        )

    async def get_user_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's accounts through API gateway"""
        response = await self._make_request(
            'GET',
            f'/api/v1/users/{user_id}/accounts',
            config=RequestConfig(require_auth=True)
        )
        return response.get('accounts', [])

    async def get_user_transactions(self, 
                                  user_id: str, 
                                  limit: int = 100,
                                  offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's transactions through API gateway"""
        params = {'limit': limit, 'offset': offset}
        response = await self._make_request(
            'GET',
            f'/api/v1/users/{user_id}/transactions',
            params=params,
            config=RequestConfig(require_auth=True)
        )
        return response.get('transactions', [])

    async def get_user_debt_data(self, user_id: str) -> Dict[str, Any]:
        """Get user's debt information through API gateway"""
        return await self._make_request(
            'GET',
            f'/api/v1/users/{user_id}/debts',
            config=RequestConfig(require_auth=True)
        )

    async def get_user_portfolio_data(self, user_id: str) -> Dict[str, Any]:
        """Get user's portfolio/investment data through API gateway"""
        return await self._make_request(
            'GET',
            f'/api/v1/users/{user_id}/portfolio',
            config=RequestConfig(require_auth=True)
        )

    async def store_user_insights(self, user_id: str, insights: Dict[str, Any]) -> Dict[str, Any]:
        """Store AI-generated insights through API gateway"""
        return await self._make_request(
            'POST',
            f'/api/v1/users/{user_id}/insights',
            data=insights,
            config=RequestConfig(require_auth=True)
        )

    async def health_check(self) -> bool:
        """Check API gateway health"""
        try:
            response = await self._make_request(
                'GET',
                '/health',
                config=RequestConfig(require_auth=False, retries=1)
            )
            return response.get('status') == 'healthy'
        except Exception as e:
            logger.warning("Health check failed", error=str(e))
            return False

    async def validate_user_auth(self, user_id: str) -> Dict[str, Any]:
        """Validate user authentication through API gateway"""
        return await self._make_request(
            'GET',
            f'/api/v1/auth/validate/{user_id}',
            config=RequestConfig(require_auth=True, retries=1)
        )

# Factory function for creating client instances
def create_api_client(auth_token: str = None) -> AtlasApiClient:
    """Create an API client instance with proper configuration"""
    return AtlasApiClient(
        base_url=settings.api_gateway_url,
        auth_token=auth_token,
        timeout=settings.api_timeout
    )