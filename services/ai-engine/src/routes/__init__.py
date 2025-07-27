"""Routes module"""
from .health import router as health_router
from .insights import router as insights_router
from .models import router as models_router

__all__ = ['health_router', 'insights_router', 'models_router']