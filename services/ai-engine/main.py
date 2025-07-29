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
from src.financial.calculations import FinancialCalculations
from src.financial.precision_client import FinancialAmount

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
financial_calculations: FinancialCalculations = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global hasura_client, insights_generator, financial_calculations

    logger.info("Starting Atlas Financial AI Engine", version="1.1.0")

    try:
        # Initialize services
        hasura_client = HasuraClient(
            endpoint=settings.hasura_endpoint,
            admin_secret=settings.hasura_admin_secret
        )

        # Initialize financial calculations with Rust engine integration
        financial_calculations = FinancialCalculations(
            rust_engine_url=settings.rust_engine_url if hasattr(settings, 'rust_engine_url') else "http://localhost:8080"
        )

        insights_generator = InsightsGenerator(
            model_path=settings.ai_model_path,
            financial_calculations=financial_calculations
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
    """Check budget against 75/15/10 rule using bank-grade precision"""
    logger.info("Running budget check", user_id=user_id)

    try:
        # Get user's financial data
        financial_data = await hasura_client.get_user_financial_data(user_id)
        
        # Extract monthly income with precision validation
        monthly_income = FinancialAmount(str(financial_data.get("monthly_income", "0")))

        # Apply 75/15/10 rule using Rust Financial Engine
        budget_breakdown = await financial_calculations.apply_75_15_10_rule(monthly_income)

        return {
            "user_id": user_id,
            "monthly_income": monthly_income.value,
            "budget_breakdown": {
                "needs": budget_breakdown.needs.value,
                "wants": budget_breakdown.wants.value,
                "savings": budget_breakdown.savings.value
            },
            "percentages": {
                "needs": "75%",
                "wants": "15%", 
                "savings": "10%"
            },
            "precision": "DECIMAL(19,4)",
            "engine": "rust-financial-engine"
        }

    except Exception as e:
        logger.error("Budget check failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Budget check failed")

@app.post("/insights/debt-snowball")
async def debt_snowball_analysis(user_id: str, extra_payment: float = 0.0) -> Dict[str, Any]:
    """Generate debt snowball payoff plan using Ramsey method with bank-grade precision"""
    logger.info("Generating debt snowball analysis", user_id=user_id, extra_payment=extra_payment)

    try:
        from src.financial.calculations import DebtInfo
        from decimal import Decimal
        
        # Get user's debt data
        debt_data = await hasura_client.get_user_debt_data(user_id)
        
        # Convert to DebtInfo objects with precision validation
        debts = []
        for debt in debt_data.get("debts", []):
            debt_info = DebtInfo(
                name=debt["name"],
                balance=FinancialAmount(str(debt["balance"])),
                minimum_payment=FinancialAmount(str(debt["minimum_payment"])),
                interest_rate=Decimal(str(debt["interest_rate"]))
            )
            debts.append(debt_info)
        
        # Extra payment amount
        extra_payment_amount = FinancialAmount(str(extra_payment))

        # Apply Ramsey debt snowball method using Rust Financial Engine
        snowball_plan = await financial_calculations.calculate_debt_snowball(debts, extra_payment_amount)

        return {
            "user_id": user_id,
            "method": "debt_snowball",
            "strategy": "smallest_balance_first",
            "debts": snowball_plan.debts,
            "summary": {
                "total_interest_saved": snowball_plan.total_interest_saved.value,
                "payoff_time_months": snowball_plan.payoff_time_months,
                "monthly_extra_payment": snowball_plan.monthly_extra_payment.value
            },
            "precision": "DECIMAL(19,4)",
            "engine": "rust-financial-engine"
        }

    except Exception as e:
        logger.error("Debt snowball analysis failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Debt analysis failed")

@app.post("/insights/portfolio-analysis")
async def portfolio_analysis(user_id: str) -> Dict[str, Any]:
    """Calculate net worth with bank-grade precision"""
    logger.info("Running portfolio analysis", user_id=user_id)

    try:
        # Get user's investment and asset data
        portfolio_data = await hasura_client.get_user_portfolio_data(user_id)
        
        # Extract assets and liabilities with precision validation
        assets = []
        liabilities = []
        
        for asset in portfolio_data.get("assets", []):
            assets.append(FinancialAmount(str(asset["value"])))
        
        for liability in portfolio_data.get("liabilities", []):
            liabilities.append(FinancialAmount(str(liability["balance"])))
        
        # Calculate net worth using Rust Financial Engine
        net_worth = await financial_calculations.calculate_net_worth(assets, liabilities)
        
        # Calculate emergency fund target
        monthly_expenses = FinancialAmount(str(portfolio_data.get("monthly_expenses", "0")))
        emergency_fund_target = await financial_calculations.calculate_emergency_fund_target(monthly_expenses)

        return {
            "user_id": user_id,
            "net_worth": net_worth.value,
            "assets": {
                "total": (await financial_calculations.client.add_amounts(assets)).value if assets else "0.0000",
                "count": len(assets)
            },
            "liabilities": {
                "total": (await financial_calculations.client.add_amounts(liabilities)).value if liabilities else "0.0000",
                "count": len(liabilities)
            },
            "emergency_fund": {
                "target": emergency_fund_target.value,
                "months_coverage": 6
            },
            "precision": "DECIMAL(19,4)",
            "engine": "rust-financial-engine"
        }

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
