"""Insights generation routes"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
import structlog

from ..models.insights import InsightRequest, InsightResponse
from ..services.service_registry import ServiceRegistry

logger = structlog.get_logger()
router = APIRouter(prefix="/insights")

@router.post("/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightRequest,
    background_tasks: BackgroundTasks
) -> InsightResponse:
    """Generate financial insights for a user"""
    logger.info("Generating insights", user_id=request.user_id, insight_type=request.insight_type)

    try:
        services = ServiceRegistry.get_instance()

        # Generate insights using AI engine
        insights = await services.insights_generator.generate_insights(request)

        # Store insights back to database in background
        background_tasks.add_task(_store_insights, request.user_id, insights)

        return insights

    except Exception as e:
        logger.error("Failed to generate insights", user_id=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate insights")

@router.post("/budget-check")
async def budget_check(user_id: str) -> Dict[str, Any]:
    """Check budget against 75/15/10 rule"""
    logger.info("Running budget check", user_id=user_id)

    try:
        services = ServiceRegistry.get_instance()

        # Get user's financial data
        financial_data = await services.hasura_client.get_user_financial_data(user_id)

        # Apply 75/15/10 rule
        budget_analysis = services.rules_engine.apply_75_15_10_rule(financial_data)

        return budget_analysis

    except Exception as e:
        logger.error("Budget check failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Budget check failed")

@router.post("/debt-snowball")
async def debt_snowball_analysis(user_id: str) -> Dict[str, Any]:
    """Generate debt snowball payoff plan"""
    logger.info("Generating debt snowball analysis", user_id=user_id)

    try:
        services = ServiceRegistry.get_instance()

        # Get user's debt data
        debt_data = await services.hasura_client.get_user_debt_data(user_id)

        # Apply Ramsey debt snowball method
        snowball_plan = services.rules_engine.calculate_debt_snowball(debt_data)

        return snowball_plan

    except Exception as e:
        logger.error("Debt snowball analysis failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Debt analysis failed")

@router.post("/portfolio-analysis")
async def portfolio_analysis(user_id: str) -> Dict[str, Any]:
    """Analyze investment portfolio using Dalio's All-Weather principles"""
    logger.info("Running portfolio analysis", user_id=user_id)

    try:
        services = ServiceRegistry.get_instance()

        # Get user's investment data
        portfolio_data = await services.hasura_client.get_user_portfolio_data(user_id)

        # Apply All-Weather portfolio analysis
        portfolio_analysis = services.rules_engine.analyze_all_weather_portfolio(portfolio_data)

        return portfolio_analysis

    except Exception as e:
        logger.error("Portfolio analysis failed", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Portfolio analysis failed")

async def _store_insights(user_id: str, insights: InsightResponse):
    """Store generated insights back to database"""
    try:
        services = ServiceRegistry.get_instance()
        await services.hasura_client.store_user_insights(user_id, insights)
        logger.info("Insights stored successfully", user_id=user_id)
    except Exception as e:
        logger.error("Failed to store insights", user_id=user_id, error=str(e))
