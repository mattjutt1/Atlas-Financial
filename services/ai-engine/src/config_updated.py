"""
Configuration settings for Atlas Financial AI Engine
Uses atlas-shared configuration patterns for consistency across services
"""

import os
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field
from dataclasses import dataclass
from enum import Enum

# Try to import atlas-shared config (fallback for local development)
try:
    # This would be available when properly integrated with atlas-shared
    from atlas_shared.config import (
        getServiceConfig,
        getEnvironment,
        getRequiredEnv,
        getOptionalEnv,
        getBooleanEnv,
        getNumberEnv,
        CONFIG_CONSTANTS
    )
    HAS_ATLAS_SHARED = True
except ImportError:
    # Fallback implementations for local development
    HAS_ATLAS_SHARED = False

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

class HonestyLevel(Enum):
    """AI honesty level configuration"""
    GENTLE = "gentle"
    MODERATE = "moderate"
    BRUTAL = "brutal"

@dataclass
class AIModelConfig:
    """AI model configuration"""
    model_path: str
    model_name: str
    max_context_length: int
    temperature: float
    top_p: float
    honesty_level: HonestyLevel
    include_tough_love: bool

@dataclass
class ProcessingConfig:
    """Processing and performance configuration"""
    max_concurrent_requests: int
    request_timeout_seconds: int
    cache_ttl_seconds: int
    enable_caching: bool

@dataclass
class FinancialRulesConfig:
    """Financial analysis rules configuration"""
    budget_75_15_10_enabled: bool
    ramsey_steps_enabled: bool
    dalio_all_weather_enabled: bool

@dataclass
class ExternalServicesConfig:
    """External service integration configuration"""
    openai_api_key: Optional[str]
    use_external_llm_fallback: bool
    nordigen_secret_id: Optional[str]
    nordigen_secret_key: Optional[str]

class Settings(BaseSettings):
    """
    Atlas AI Engine Settings using shared configuration patterns
    Integrates with atlas-shared config management for consistency
    """

    # Core service information
    app_name: str = "Atlas Financial AI Engine"
    version: str = "1.2.0"  # Updated version for architectural alignment
    service_name: str = "ai-engine"

    # Environment configuration using atlas-shared patterns
    environment: str = Field(default_factory=getEnvironment)
    debug: bool = Field(default_factory=lambda: getBooleanEnv("DEBUG", False))
    log_level: str = Field(default_factory=lambda: getOptionalEnv("LOG_LEVEL", "INFO"))

    # API Gateway configuration (NEW - replaces direct DB access)
    api_gateway_url: str = Field(default_factory=lambda: getOptionalEnv(
        "API_GATEWAY_URL",
        "http://atlas-api-gateway:8080"
    ))
    api_timeout: int = Field(default_factory=lambda: getNumberEnv("API_TIMEOUT", 30))

    # Authentication configuration using atlas-shared patterns
    jwt_secret_key: str = Field(default_factory=lambda: getRequiredEnv("JWT_SECRET"))
    supertokens_core_url: str = Field(default_factory=lambda: getOptionalEnv(
        "SUPERTOKENS_CORE_URL",
        "http://atlas-core:3567"
    ))

    # Legacy Hasura configuration (for backwards compatibility)
    hasura_endpoint: str = Field(default_factory=lambda: getOptionalEnv(
        "HASURA_ENDPOINT",
        "http://atlas-hasura:8080/v1/graphql"
    ))
    hasura_admin_secret: str = Field(default_factory=lambda: getOptionalEnv(
        "HASURA_ADMIN_SECRET",
        ""
    ))

    # Rust Financial Engine integration
    rust_engine_url: str = Field(default_factory=lambda: getOptionalEnv(
        "RUST_ENGINE_URL",
        "http://atlas-rust-engine:8000"
    ))

    # AI Model configuration
    ai_model_path: str = Field(default_factory=lambda: getOptionalEnv(
        "AI_MODEL_PATH",
        "/app/models"
    ))
    ai_model_name: str = Field(default_factory=lambda: getOptionalEnv(
        "AI_MODEL_NAME",
        "qwen-2.5-32b-finance"
    ))
    max_context_length: int = Field(default_factory=lambda: getNumberEnv(
        "AI_MAX_CONTEXT_LENGTH",
        4096
    ))
    temperature: float = Field(default=0.7)
    top_p: float = Field(default=0.9)

    # Cache configuration using atlas-shared patterns
    cache_dir: str = Field(default_factory=lambda: getOptionalEnv("CACHE_DIR", "/app/cache"))
    redis_url: str = Field(default_factory=lambda: getOptionalEnv(
        "REDIS_URL",
        "redis://atlas-data:6379"
    ))
    cache_ttl_seconds: int = Field(default_factory=lambda: getNumberEnv("CACHE_TTL_SECONDS", 3600))

    # Financial rules configuration
    budget_75_15_10_enabled: bool = Field(default_factory=lambda: getBooleanEnv(
        "BUDGET_75_15_10_ENABLED",
        True
    ))
    ramsey_steps_enabled: bool = Field(default_factory=lambda: getBooleanEnv(
        "RAMSEY_STEPS_ENABLED",
        True
    ))
    dalio_all_weather_enabled: bool = Field(default_factory=lambda: getBooleanEnv(
        "DALIO_ALL_WEATHER_ENABLED",
        True
    ))

    # AI personality settings
    honesty_level: str = Field(default_factory=lambda: getOptionalEnv("HONESTY_LEVEL", "moderate"))
    include_tough_love: bool = Field(default_factory=lambda: getBooleanEnv("INCLUDE_TOUGH_LOVE", True))

    # Processing limits using atlas-shared patterns
    max_concurrent_requests: int = Field(default_factory=lambda: getNumberEnv(
        "MAX_CONCURRENT_REQUESTS",
        3
    ))
    request_timeout_seconds: int = Field(default_factory=lambda: getNumberEnv(
        "REQUEST_TIMEOUT_SECONDS",
        120
    ))

    # External API configuration (optional)
    openai_api_key: Optional[str] = Field(default_factory=lambda: getOptionalEnv("OPENAI_API_KEY", None))
    use_external_llm_fallback: bool = Field(default_factory=lambda: getBooleanEnv(
        "USE_EXTERNAL_LLM_FALLBACK",
        False
    ))

    # Bank data integration (optional)
    nordigen_secret_id: Optional[str] = Field(default_factory=lambda: getOptionalEnv("NORDIGEN_SECRET_ID", None))
    nordigen_secret_key: Optional[str] = Field(default_factory=lambda: getOptionalEnv("NORDIGEN_SECRET_KEY", None))

    # CORS configuration using atlas-shared patterns
    cors_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",  # Frontend dev
        "http://atlas-web:3000",  # Frontend container
        "http://atlas-platform:3000"  # Platform container
    ])

    # Monitoring and observability
    enable_metrics: bool = Field(default_factory=lambda: getBooleanEnv("ENABLE_METRICS", True))
    metrics_port: int = Field(default_factory=lambda: getNumberEnv("METRICS_PORT", 9090))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def get_ai_model_config(self) -> AIModelConfig:
        """Get AI model configuration"""
        return AIModelConfig(
            model_path=self.ai_model_path,
            model_name=self.ai_model_name,
            max_context_length=self.max_context_length,
            temperature=self.temperature,
            top_p=self.top_p,
            honesty_level=HonestyLevel(self.honesty_level),
            include_tough_love=self.include_tough_love
        )

    def get_processing_config(self) -> ProcessingConfig:
        """Get processing configuration"""
        return ProcessingConfig(
            max_concurrent_requests=self.max_concurrent_requests,
            request_timeout_seconds=self.request_timeout_seconds,
            cache_ttl_seconds=self.cache_ttl_seconds,
            enable_caching=True  # Always enabled for AI engine
        )

    def get_financial_rules_config(self) -> FinancialRulesConfig:
        """Get financial rules configuration"""
        return FinancialRulesConfig(
            budget_75_15_10_enabled=self.budget_75_15_10_enabled,
            ramsey_steps_enabled=self.ramsey_steps_enabled,
            dalio_all_weather_enabled=self.dalio_all_weather_enabled
        )

    def get_external_services_config(self) -> ExternalServicesConfig:
        """Get external services configuration"""
        return ExternalServicesConfig(
            openai_api_key=self.openai_api_key,
            use_external_llm_fallback=self.use_external_llm_fallback,
            nordigen_secret_id=self.nordigen_secret_id,
            nordigen_secret_key=self.nordigen_secret_key
        )

    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == 'production'

    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == 'development'

    def validate_configuration(self) -> None:
        """Validate critical configuration settings"""
        errors = []

        # Validate API Gateway URL
        if not self.api_gateway_url:
            errors.append("API_GATEWAY_URL is required for proper service boundaries")

        # Validate JWT secret for authentication
        if not self.jwt_secret_key:
            errors.append("JWT_SECRET is required for authentication")

        # Validate AI model configuration
        if not self.ai_model_path:
            errors.append("AI_MODEL_PATH is required")

        if not self.ai_model_name:
            errors.append("AI_MODEL_NAME is required")

        # Production-specific validation
        if self.is_production():
            if self.debug:
                errors.append("DEBUG mode should be disabled in production")

            if not self.enable_metrics:
                errors.append("Metrics should be enabled in production")

        if errors:
            raise ValueError(f"Configuration validation failed: {', '.join(errors)}")

# Create settings instance using atlas-shared patterns if available
if HAS_ATLAS_SHARED:
    # Use atlas-shared service config for AI Engine
    atlas_config = getServiceConfig('ai-engine')
    settings = Settings()
else:
    # Fallback for local development
    settings = Settings()

# Validate configuration
settings.validate_configuration()

# Export configuration objects for easy access
ai_model_config = settings.get_ai_model_config()
processing_config = settings.get_processing_config()
financial_rules_config = settings.get_financial_rules_config()
external_services_config = settings.get_external_services_config()
