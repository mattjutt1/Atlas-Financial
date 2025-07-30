"""
JWT Token Validation for Atlas Financial AI Engine
Integrates with SuperTokens and atlas-shared auth patterns
"""

import jwt
import asyncio
import structlog
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import aiohttp

from ..config_updated import settings
from ..errors import (
    AuthenticationError,
    TokenExpiredError,
    InvalidTokenError,
    ExternalServiceError,
    handleError
)

logger = structlog.get_logger()

class JWTValidator:
    """JWT token validator using SuperTokens and atlas-shared patterns"""

    def __init__(self, jwt_secret: str, supertokens_core_url: str):
        self.jwt_secret = jwt_secret
        self.supertokens_core_url = supertokens_core_url
        self.session = None

    async def __aenter__(self):
        """Async context manager entry"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def _ensure_session(self):
        """Ensure HTTP session exists"""
        if not self.session or self.session.closed:
            self.session = aiohttp.ClientSession()

    async def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        Verify JWT token using SuperTokens patterns and atlas-shared error handling
        """
        if not token:
            raise AuthenticationError("No token provided")

        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]

            # First try local JWT verification for performance
            try:
                payload = jwt.decode(
                    token,
                    self.jwt_secret,
                    algorithms=['HS256', 'RS256'],
                    options={"verify_exp": True}
                )

                # Validate required claims
                required_claims = ['userId', 'sessionHandle', 'exp', 'iat']
                for claim in required_claims:
                    if claim not in payload:
                        raise InvalidTokenError(f"Missing required claim: {claim}")

                # Check token expiration
                exp = payload.get('exp')
                if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                    raise TokenExpiredError(metadata={'exp': exp})

                logger.debug("JWT token verified locally",
                           user_id=payload.get('userId'),
                           session_handle=payload.get('sessionHandle'))

                return payload

            except jwt.ExpiredSignatureError:
                raise TokenExpiredError()
            except jwt.InvalidTokenError as e:
                raise InvalidTokenError(str(e))

        except (AuthenticationError, TokenExpiredError, InvalidTokenError):
            # Re-raise Atlas errors as-is
            raise
        except Exception as e:
            # Try SuperTokens core verification as fallback
            logger.warning("Local JWT verification failed, trying SuperTokens core",
                         error=str(e))
            return await self._verify_with_supertokens_core(token)

    async def _verify_with_supertokens_core(self, token: str) -> Dict[str, Any]:
        """
        Verify token with SuperTokens core service as fallback
        """
        try:
            await self._ensure_session()

            # Call SuperTokens core session verification endpoint
            url = f"{self.supertokens_core_url}/recipe/session/verify"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }

            async with self.session.post(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()

                    # Extract user information from SuperTokens response
                    session_data = data.get('session', {})
                    user_id = session_data.get('userId')
                    session_handle = session_data.get('handle')

                    if not user_id:
                        raise InvalidTokenError("SuperTokens response missing user ID")

                    # Create payload compatible with our JWT format
                    payload = {
                        'userId': user_id,
                        'sessionHandle': session_handle,
                        'exp': session_data.get('expiry', 0) // 1000,  # Convert ms to seconds
                        'iat': session_data.get('timeCreated', 0) // 1000,
                        'access_token': token,
                        'verified_by': 'supertokens-core'
                    }

                    logger.info("Token verified by SuperTokens core",
                               user_id=user_id,
                               session_handle=session_handle)

                    return payload

                elif response.status == 401:
                    error_data = await response.json()
                    message = error_data.get('message', 'Token validation failed')
                    raise AuthenticationError(message)

                else:
                    error_text = await response.text()
                    raise ExternalServiceError(
                        'supertokens-core',
                        f"Token verification failed: {response.status} - {error_text}"
                    )

        except (AuthenticationError, ExternalServiceError):
            raise
        except Exception as e:
            error = handleError(e, "SuperTokens core token verification")
            logger.error("SuperTokens token verification failed", error=error.toJSON())
            raise AuthenticationError("Token verification failed")

    async def validate_session(self, session_handle: str) -> bool:
        """
        Validate if session is still active with SuperTokens core
        """
        try:
            await self._ensure_session()

            url = f"{self.supertokens_core_url}/recipe/session"
            data = {'sessionHandle': session_handle}

            async with self.session.get(url, json=data) as response:
                return response.status == 200

        except Exception as e:
            logger.warning("Session validation failed",
                         session_handle=session_handle,
                         error=str(e))
            return False

    async def revoke_session(self, session_handle: str) -> bool:
        """
        Revoke session with SuperTokens core
        """
        try:
            await self._ensure_session()

            url = f"{self.supertokens_core_url}/recipe/session/remove"
            data = {'sessionHandle': session_handle}

            async with self.session.post(url, json=data) as response:
                if response.status == 200:
                    logger.info("Session revoked successfully", session_handle=session_handle)
                    return True
                else:
                    logger.warning("Failed to revoke session",
                                 session_handle=session_handle,
                                 status_code=response.status)
                    return False

        except Exception as e:
            logger.error("Session revocation failed",
                        session_handle=session_handle,
                        error=str(e))
            return False

# Global validator instance
_validator: Optional[JWTValidator] = None

async def get_jwt_validator() -> JWTValidator:
    """Get or create JWT validator instance"""
    global _validator
    if not _validator:
        _validator = JWTValidator(
            jwt_secret=settings.jwt_secret_key,
            supertokens_core_url=settings.supertokens_core_url
        )
    return _validator

async def verify_jwt_token(token: str, jwt_secret: str = None) -> Dict[str, Any]:
    """
    Convenience function for token verification
    Uses atlas-shared error patterns and SuperTokens integration
    """
    validator = await get_jwt_validator()
    async with validator:
        return await validator.verify_jwt_token(token)

async def validate_session(session_handle: str) -> bool:
    """Convenience function for session validation"""
    validator = await get_jwt_validator()
    async with validator:
        return await validator.validate_session(session_handle)

async def revoke_session(session_handle: str) -> bool:
    """Convenience function for session revocation"""
    validator = await get_jwt_validator()
    async with validator:
        return await validator.revoke_session(session_handle)

# Export for backwards compatibility
__all__ = [
    'JWTValidator',
    'verify_jwt_token',
    'validate_session',
    'revoke_session',
    'get_jwt_validator'
]
