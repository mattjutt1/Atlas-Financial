"""AI model management routes"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
import structlog

from ..services.service_registry import ServiceRegistry

logger = structlog.get_logger()
router = APIRouter(prefix="/models")

@router.get("/status")
async def model_status() -> Dict[str, Any]:
    """Get AI model status and information"""
    try:
        services = ServiceRegistry.get_instance()
        
        if not services.insights_generator:
            return {"status": "not_initialized"}
        
        return {
            "status": "loaded" if services.insights_generator.is_model_loaded() else "not_loaded",
            "model_name": services.config.ai_model_name,
            "model_path": services.config.ai_model_path,
            "memory_usage": services.insights_generator.get_memory_usage()
        }
    except Exception as e:
        logger.error("Failed to get model status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get model status")