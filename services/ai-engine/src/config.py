"""
Configuration settings for Atlas Financial AI Engine
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Application settings"""

    # Service configuration
    app_name: str = "Atlas Financial AI Engine"
    version: str = "1.1.0"
    debug: bool = Field(default=False, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    # Hasura configuration
    hasura_endpoint: str = Field(env="HASURA_ENDPOINT")
    hasura_admin_secret: str = Field(env="HASURA_ADMIN_SECRET")

    # Database configuration
    postgres_url: str = Field(env="POSTGRES_URL")

    # AI Model configuration
    ai_model_path: str = Field(default="/app/models", env="AI_MODEL_PATH")
    ai_model_name: str = Field(default="llama-2-7b-chat-finance", env="AI_MODEL_NAME")
    max_context_length: int = Field(default=4096, env="AI_MAX_CONTEXT_LENGTH")
    temperature: float = Field(default=0.7, env="AI_TEMPERATURE")
    top_p: float = Field(default=0.9, env="AI_TOP_P")

    # Cache configuration
    cache_dir: str = Field(default="/app/cache", env="CACHE_DIR")
    cache_ttl_seconds: int = Field(default=3600, env="CACHE_TTL_SECONDS")  # 1 hour

    # Financial rules configuration
    budget_75_15_10_enabled: bool = Field(default=True, env="BUDGET_75_15_10_ENABLED")
    ramsey_steps_enabled: bool = Field(default=True, env="RAMSEY_STEPS_ENABLED")
    dalio_all_weather_enabled: bool = Field(default=True, env="DALIO_ALL_WEATHER_ENABLED")

    # Brutal honesty settings
    honesty_level: str = Field(default="moderate", env="HONESTY_LEVEL")  # gentle, moderate, brutal
    include_tough_love: bool = Field(default=True, env="INCLUDE_TOUGH_LOVE")

    # Processing limits
    max_concurrent_requests: int = Field(default=3, env="MAX_CONCURRENT_REQUESTS")
    request_timeout_seconds: int = Field(default=120, env="REQUEST_TIMEOUT_SECONDS")

    # External API configuration (optional)
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    use_external_llm_fallback: bool = Field(default=False, env="USE_EXTERNAL_LLM_FALLBACK")

    # Bank data configuration
    nordigen_secret_id: Optional[str] = Field(default=None, env="NORDIGEN_SECRET_ID")
    nordigen_secret_key: Optional[str] = Field(default=None, env="NORDIGEN_SECRET_KEY")
    aqbanking_data_dir: Optional[str] = Field(default=None, env="AQBANKING_DATA_DIR")

    # Security
    jwt_secret_key: Optional[str] = Field(default=None, env="JWT_SECRET_KEY")
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8081"],
        env="CORS_ORIGINS"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Global settings instance
settings = Settings()

# Validate critical settings
if not settings.hasura_endpoint:
    raise ValueError("HASURA_ENDPOINT environment variable is required")

if not settings.hasura_admin_secret:
    raise ValueError("HASURA_ADMIN_SECRET environment variable is required")

if not settings.postgres_url:
    raise ValueError("POSTGRES_URL environment variable is required")
