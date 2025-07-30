"""
Atlas Configuration Bridge for AI Engine
Integrates with atlas-shared configuration management
"""

import os
import sys
from typing import Dict, Any, Optional
from pathlib import Path

# Add atlas-shared to path if available
atlas_shared_path = Path(__file__).parent.parent.parent.parent.parent / 'packages' / 'atlas-shared' / 'src'
if atlas_shared_path.exists():
    sys.path.insert(0, str(atlas_shared_path))

try:
    # Import atlas-shared configuration if available
    from config import (
        createConfig,
        getServiceConfig,
        getEnvironment,
        getRequiredEnv,
        getOptionalEnv,
        getBooleanEnv,
        getNumberEnv,
        CONFIG_CONSTANTS
    )
    ATLAS_SHARED_AVAILABLE = True
    print("✅ Atlas-shared configuration loaded successfully")
except ImportError as e:
    print(f"⚠️  Atlas-shared configuration not available: {e}")
    ATLAS_SHARED_AVAILABLE = False

    # Fallback implementations
    def getEnvironment():
        env = os.getenv('NODE_ENV', os.getenv('ENVIRONMENT', 'development'))
        return env.lower() if env else 'development'

    def getRequiredEnv(key: str) -> str:
        value = os.getenv(key)
        if not value:
            raise ValueError(f"Required environment variable {key} is not set")
        return value

    def getOptionalEnv(key: str, fallback: str) -> str:
        return os.getenv(key, fallback)

    def getBooleanEnv(key: str, fallback: bool = False) -> bool:
        value = os.getenv(key)
        if not value:
            return fallback
        return value.lower() in ['true', '1', 'yes', 'on']

    def getNumberEnv(key: str, fallback: int) -> int:
        value = os.getenv(key)
        if not value:
            return fallback
        try:
            return int(value)
        except ValueError:
            return fallback

class AtlasConfigBridge:
    """
    Configuration bridge that integrates with atlas-shared patterns
    """

    def __init__(self, service_name: str = "ai-engine"):
        self.service_name = service_name
        self.environment = getEnvironment()
        self._atlas_config = self._load_atlas_config()

    def _load_atlas_config(self) -> Optional[Dict[str, Any]]:
        """Load atlas-shared configuration if available"""
        if not ATLAS_SHARED_AVAILABLE:
            return None

        try:
            # Get service-specific configuration from atlas-shared
            config = getServiceConfig(self.service_name, self.environment)
            return config
        except Exception as e:
            print(f"⚠️  Failed to load atlas-shared config: {e}")
            return None

    def get_api_config(self) -> Dict[str, Any]:
        """Get API configuration using atlas-shared patterns"""
        if self._atlas_config and 'api' in self._atlas_config:
            api_config = self._atlas_config['api']
            return {
                'base_url': getOptionalEnv('API_GATEWAY_URL', api_config.get('baseUrl', 'http://atlas-api-gateway:8080')),
                'timeout': api_config.get('timeout', 30000),
                'retries': api_config.get('retries', 3),
                'rate_limit': api_config.get('rateLimit', {
                    'requests': 1000,
                    'window': 60000
                })
            }
        else:
            # Fallback configuration
            return {
                'base_url': getOptionalEnv('API_GATEWAY_URL', 'http://atlas-api-gateway:8080'),
                'timeout': getNumberEnv('API_TIMEOUT', 30) * 1000,  # Convert to ms
                'retries': getNumberEnv('API_RETRIES', 3),
                'rate_limit': {
                    'requests': 1000,
                    'window': 60000
                }
            }

    def get_auth_config(self) -> Dict[str, Any]:
        """Get authentication configuration using atlas-shared patterns"""
        if self._atlas_config and 'auth' in self._atlas_config:
            auth_config = self._atlas_config['auth']
            return {
                'provider': auth_config.get('provider', 'supertokens'),
                'jwt_secret': getRequiredEnv('JWT_SECRET'),
                'supertokens_core_url': getOptionalEnv('SUPERTOKENS_CORE_URL', auth_config.get('apiDomain', 'http://atlas-core:3567')),
                'token_expiry': auth_config.get('tokenExpiry', 3600),
                'cookie_secure': auth_config.get('cookieSecure', self.environment == 'production')
            }
        else:
            # Fallback configuration
            return {
                'provider': 'supertokens',
                'jwt_secret': getRequiredEnv('JWT_SECRET'),
                'supertokens_core_url': getOptionalEnv('SUPERTOKENS_CORE_URL', 'http://atlas-core:3567'),
                'token_expiry': getNumberEnv('JWT_TOKEN_EXPIRY', 3600),
                'cookie_secure': self.environment == 'production'
            }

    def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration using atlas-shared patterns"""
        if self._atlas_config and 'monitoring' in self._atlas_config:
            monitoring_config = self._atlas_config['monitoring']
            return {
                'enabled': monitoring_config.get('enabled', True),
                'level': monitoring_config.get('level', 'info'),
                'service': monitoring_config.get('service', self.service_name),
                'version': getOptionalEnv('SERVICE_VERSION', '2.0.0'),
                'metrics': monitoring_config.get('metrics', {
                    'enabled': True,
                    'port': 9090
                }),
                'tracing': monitoring_config.get('tracing', {
                    'enabled': self.environment == 'production',
                    'sample_rate': 0.1
                })
            }
        else:
            # Fallback configuration
            is_production = self.environment == 'production'
            return {
                'enabled': getBooleanEnv('MONITORING_ENABLED', is_production),
                'level': getOptionalEnv('LOG_LEVEL', 'info' if is_production else 'debug'),
                'service': self.service_name,
                'version': getOptionalEnv('SERVICE_VERSION', '2.0.0'),
                'metrics': {
                    'enabled': getBooleanEnv('ENABLE_METRICS', True),
                    'port': getNumberEnv('METRICS_PORT', 9090)
                },
                'tracing': {
                    'enabled': getBooleanEnv('TRACING_ENABLED', is_production),
                    'sample_rate': float(getOptionalEnv('TRACING_SAMPLE_RATE', '0.1'))
                }
            }

    def get_feature_flags(self) -> Dict[str, Any]:
        """Get feature flags using atlas-shared patterns"""
        if self._atlas_config and 'features' in self._atlas_config:
            features = self._atlas_config['features']
            return {
                'enable_ai_insights': features.get('enableAIInsights', True),
                'enable_real_time_data': features.get('enableRealTimeData', False),
                'enable_debug_mode': features.get('enableDebugMode', self.environment == 'development'),
                'enable_metrics': features.get('enableMetrics', True),
                'enable_rate_limiting': features.get('enableRateLimiting', True)
            }
        else:
            # Fallback configuration
            is_development = self.environment == 'development'
            return {
                'enable_ai_insights': getBooleanEnv('FEATURE_AI_INSIGHTS', True),
                'enable_real_time_data': getBooleanEnv('FEATURE_REAL_TIME_DATA', False),
                'enable_debug_mode': getBooleanEnv('FEATURE_DEBUG_MODE', is_development),
                'enable_metrics': getBooleanEnv('FEATURE_METRICS', True),
                'enable_rate_limiting': getBooleanEnv('FEATURE_RATE_LIMITING', True)
            }

    def get_database_config(self) -> Optional[Dict[str, Any]]:
        """Get database configuration using atlas-shared patterns"""
        if self._atlas_config and 'database' in self._atlas_config:
            db_config = self._atlas_config['database']
            return {
                'url': db_config.get('url'),
                'pool_size': db_config.get('poolSize', 10),
                'timeout': db_config.get('timeout', 30000),
                'ssl': db_config.get('ssl', self.environment == 'production')
            }
        else:
            # Fallback - AI Engine should NOT have direct database access
            return None

    def get_redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration using atlas-shared patterns"""
        if self._atlas_config and 'redis' in self._atlas_config:
            redis_config = self._atlas_config['redis']
            return {
                'url': getOptionalEnv('REDIS_URL', redis_config.get('url', 'redis://atlas-data:6379')),
                'pool_size': redis_config.get('poolSize', 10),
                'timeout': redis_config.get('timeout', 5000),
                'default_ttl': redis_config.get('defaultTtl', 3600),
                'enabled': redis_config.get('enabled', True)
            }
        else:
            # Fallback configuration
            return {
                'url': getOptionalEnv('REDIS_URL', 'redis://atlas-data:6379'),
                'pool_size': getNumberEnv('REDIS_POOL_SIZE', 10),
                'timeout': getNumberEnv('REDIS_TIMEOUT', 5000),
                'default_ttl': getNumberEnv('REDIS_DEFAULT_TTL', 3600),
                'enabled': getBooleanEnv('REDIS_ENABLED', True)
            }

    def validate_configuration(self) -> None:
        """Validate configuration for architectural compliance"""
        errors = []

        # Ensure API gateway is configured (eliminates direct DB access)
        api_config = self.get_api_config()
        if not api_config['base_url']:
            errors.append("API_GATEWAY_URL is required for proper service boundaries")

        # Ensure authentication is properly configured
        auth_config = self.get_auth_config()
        if not auth_config['jwt_secret']:
            errors.append("JWT_SECRET is required for authentication")

        # Ensure database is NOT directly accessible (architectural violation)
        db_config = self.get_database_config()
        if db_config and db_config.get('url'):
            errors.append("⚠️  ARCHITECTURAL VIOLATION: AI Engine should not have direct database access")

        # Production-specific validation
        if self.environment == 'production':
            monitoring_config = self.get_monitoring_config()
            if not monitoring_config['enabled']:
                errors.append("Monitoring should be enabled in production")

            features = self.get_feature_flags()
            if features['enable_debug_mode']:
                errors.append("Debug mode should be disabled in production")

        if errors:
            error_message = f"Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in errors)
            raise ValueError(error_message)

    def get_consolidated_config(self) -> Dict[str, Any]:
        """Get consolidated configuration for the AI Engine"""
        return {
            'environment': self.environment,
            'service_name': self.service_name,
            'api': self.get_api_config(),
            'auth': self.get_auth_config(),
            'monitoring': self.get_monitoring_config(),
            'features': self.get_feature_flags(),
            'redis': self.get_redis_config(),
            'atlas_shared_available': ATLAS_SHARED_AVAILABLE,
            'architectural_compliance': {
                'service_boundaries': 'api-gateway',
                'authentication': 'supertokens',
                'error_handling': 'atlas-shared',
                'configuration': 'atlas-shared-bridge',
                'direct_db_access': False  # Architectural compliance marker
            }
        }

# Global configuration instance
_config_bridge: Optional[AtlasConfigBridge] = None

def get_atlas_config(service_name: str = "ai-engine") -> AtlasConfigBridge:
    """Get or create atlas configuration bridge"""
    global _config_bridge
    if not _config_bridge:
        _config_bridge = AtlasConfigBridge(service_name)
        _config_bridge.validate_configuration()
    return _config_bridge

def reset_atlas_config():
    """Reset configuration (for testing)"""
    global _config_bridge
    _config_bridge = None

# Export for easy access
__all__ = [
    'AtlasConfigBridge',
    'get_atlas_config',
    'reset_atlas_config',
    'ATLAS_SHARED_AVAILABLE'
]
