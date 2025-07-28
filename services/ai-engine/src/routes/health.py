"""Health check routes"""
from fastapi import APIRouter, HTTPException
import structlog

from ..models.insights import HealthResponse
from ..services.service_registry import ServiceRegistry

logger = structlog.get_logger()
router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        services = ServiceRegistry.get_instance()

        # Check Hasura connectivity
        hasura_healthy = await services.hasura_client.health_check()

        # Check AI model status
        model_loaded = services.insights_generator.is_model_loaded() if services.insights_generator else False

        status = "healthy" if hasura_healthy and model_loaded else "degraded"

        return HealthResponse(
            status=status,
            version="1.1.0",
            services={
                "hasura": "healthy" if hasura_healthy else "unhealthy",
                "ai_model": "loaded" if model_loaded else "not_loaded"
            }
        )
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")
