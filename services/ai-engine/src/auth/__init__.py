"""
Authentication module for Atlas Financial AI Engine
Integrates with SuperTokens and atlas-shared auth patterns
"""

from .jwt_validator import (
    JWTValidator,
    verify_jwt_token,
    validate_session,
    revoke_session,
    get_jwt_validator
)

__all__ = [
    'JWTValidator',
    'verify_jwt_token', 
    'validate_session',
    'revoke_session',
    'get_jwt_validator'
]