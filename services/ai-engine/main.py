"""
Atlas Financial AI Engine - Finance Brain
Generates brutal honesty financial insights using local LLM
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import structlog

from src.config import settings
from src.ai.insights_generator import InsightsGenerator
from src.data.hasura_client import HasuraClient
from src.models.insights import InsightRequest, InsightResponse, HealthResponse
from src.ai.financial_rules import FinancialRulesEngine

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global service instances
hasura_client: HasuraClient = None
insights_generator: InsightsGenerator = None
rules_engine: FinancialRulesEngine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global hasura_client, insights_generator, rules_engine
    
    logger.info("Starting Atlas Financial AI Engine", version="1.1.0")
    
    try:
        # Initialize services
        hasura_client = HasuraClient(
            endpoint=settings.hasura_endpoint,
            admin_secret=settings.hasura_admin_secret
        )
        
        rules_engine = FinancialRulesEngine()
        
        insights_generator = InsightsGenerator(
            model_path=settings.ai_model_path,
            rules_engine=rules_engine
        )
        
        # Load AI model
        await insights_generator.initialize()
        
        logger.info("AI Engine initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize AI Engine", error=str(e))
        raise
    finally:
        # Cleanup
        if insights_generator:
            await insights_generator.cleanup()
        logger.info("AI Engine shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Atlas Financial AI Engine",
    description="Finance Brain - Brutal Honesty Financial Insights",
    version="1.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],  # Frontend and Hasura
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check Hasura connectivity
        hasura_healthy = await hasura_client.health_check()
        
        # Check AI model status
        model_loaded = insights_generator.is_model_loaded() if insights_generator else False
        
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

@app.post("/insights/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightRequest,
    background_tasks: BackgroundTasks
) -> InsightResponse:
    """Generate financial insights for a user"""
    logger.info("Generating insights", user_id=request.user_id, insight_type=request.insight_type)
    
    try:
        # Generate insights using AI engine
        insights = await insights_generator.generate_insights(request)
        
        # Store insights back to database in background
        background_tasks.add_task(store_insights, request.user_id, insights)
        
        return insights
        
    except Exception as e:
        logger.error("Failed to generate insights", user_id=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate insights")

@app.post("/insights/budget-check")
async def budget_check(user_id: str) -> Dict[str, Any]:
    """Check budget against 75/15/10 rule"""
    logger.info("Running budget check", user_id=user_id)
    
    try:
        # Get user's financial data
        financial_data = await hasura_client.get_user_financial_data(user_id)
        
        # Apply 75/15/10 rule
        budget_analysis = rules_engine.apply_75_15_10_rule(financial_data)
        
        return budget_analysis
        
    except Exception as e:
        logger.error("Budget check failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Budget check failed")

@app.post("/insights/debt-snowball")
async def debt_snowball_analysis(user_id: str) -> Dict[str, Any]:
    """Generate debt snowball payoff plan"""
    logger.info("Generating debt snowball analysis", user_id=user_id)
    
    try:
        # Get user's debt data
        debt_data = await hasura_client.get_user_debt_data(user_id)
        
        # Apply Ramsey debt snowball method
        snowball_plan = rules_engine.calculate_debt_snowball(debt_data)
        
        return snowball_plan
        
    except Exception as e:
        logger.error("Debt snowball analysis failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Debt analysis failed")

@app.post("/insights/portfolio-analysis")
async def portfolio_analysis(user_id: str) -> Dict[str, Any]:
    """Analyze investment portfolio using Dalio's All-Weather principles"""
    logger.info("Running portfolio analysis", user_id=user_id)
    
    try:
        # Get user's investment data
        portfolio_data = await hasura_client.get_user_portfolio_data(user_id)
        
        # Apply All-Weather portfolio analysis
        portfolio_analysis = rules_engine.analyze_all_weather_portfolio(portfolio_data)
        
        return portfolio_analysis
        
    except Exception as e:
        logger.error("Portfolio analysis failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Portfolio analysis failed")

@app.get("/models/status")
async def model_status() -> Dict[str, Any]:
    """Get AI model status and information"""
    try:
        if not insights_generator:
            return {"status": "not_initialized"}
        
        return {
            "status": "loaded" if insights_generator.is_model_loaded() else "not_loaded",
            "model_name": settings.ai_model_name,
            "model_path": settings.ai_model_path,
            "memory_usage": insights_generator.get_memory_usage()
        }
    except Exception as e:
        logger.error("Failed to get model status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get model status")

async def store_insights(user_id: str, insights: InsightResponse):
    """Store generated insights back to database"""
    try:
        await hasura_client.store_user_insights(user_id, insights)
        logger.info("Insights stored successfully", user_id=user_id)
    except Exception as e:
        logger.error("Failed to store insights", user_id=user_id, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config={
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "default": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
            },
            "root": {
                "level": "INFO",
                "handlers": ["default"],
            },
        }
    )