"""
Atlas Financial AI Engine - Finance Brain (v2.0)
Refactored to eliminate architectural violations:
- Uses API gateway instead of direct DB access
- Implements standard SuperTokens authentication
- Uses atlas-shared error handling patterns
- Follows proper service boundaries
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
import structlog

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Use updated configuration with atlas-shared patterns
from src.config_updated import settings, ai_model_config, processing_config
from src.ai.insights_generator import InsightsGenerator
from src.clients.api_client import AtlasApiClient, create_api_client
from src.models.insights import InsightRequest, InsightResponse, HealthResponse
from src.financial.calculations import FinancialCalculations
from src.financial.precision_client import FinancialAmount

# Import atlas-shared error handling patterns
from src.errors import (
    AtlasError,
    AuthenticationError,
    AuthorizationError,
    ExternalServiceError,
    NotFoundError,
    RateLimitError,
    TimeoutError,
    InternalError,
    FinancialCalculationError,
    handleError
)

# Configure structured logging using atlas-shared patterns
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
api_client: AtlasApiClient = None
insights_generator: InsightsGenerator = None
financial_calculations: FinancialCalculations = None

# Authentication security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with proper error handling"""
    global api_client, insights_generator, financial_calculations

    logger.info("Starting Atlas Financial AI Engine",
               version="2.0.0",
               service="ai-engine",
               environment=settings.environment)

    try:
        # Initialize API client for proper service boundaries
        api_client = create_api_client()

        # Test API gateway connectivity
        is_healthy = await api_client.health_check()
        if not is_healthy:
            logger.warning("API gateway health check failed, continuing with degraded functionality")

        # Initialize financial calculations with Rust engine integration
        financial_calculations = FinancialCalculations(
            rust_engine_url=settings.rust_engine_url
        )

        # Initialize AI insights generator
        insights_generator = InsightsGenerator(
            model_config=ai_model_config,
            processing_config=processing_config,
            financial_calculations=financial_calculations
        )

        # Load AI model
        await insights_generator.initialize()

        logger.info("AI Engine initialized successfully",
                   api_gateway_url=settings.api_gateway_url,
                   rust_engine_url=settings.rust_engine_url,
                   model_loaded=insights_generator.is_model_loaded())

        yield

    except Exception as e:
        error = handleError(e, "AI Engine initialization")
        logger.error("Failed to initialize AI Engine", error=error.toJSON())
        raise
    finally:
        # Cleanup resources
        if insights_generator:
            await insights_generator.cleanup()
        if api_client:
            await api_client.close()
        logger.info("AI Engine shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Atlas Financial AI Engine",
    description="Finance Brain - Brutal Honesty Financial Insights (v2.0)",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware using atlas-shared configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify JWT token using SuperTokens/atlas-shared authentication patterns
    """
    try:
        from src.auth.jwt_validator import verify_jwt_token

        token = credentials.credentials
        if not token:
            raise AuthenticationError("No authentication token provided")

        # Verify token using atlas-shared JWT patterns
        payload = await verify_jwt_token(token, settings.jwt_secret_key)

        if not payload.get('userId'):
            raise AuthenticationError("Invalid token: missing user ID")

        logger.debug("Token verified successfully", user_id=payload.get('userId'))
        return payload

    except AuthenticationError:
        raise
    except Exception as e:
        error = handleError(e, "Token verification")
        logger.error("Token verification failed", error=error.toJSON())
        raise AuthenticationError("Invalid authentication token")

async def get_authenticated_user(token_payload: Dict[str, Any] = Depends(verify_token)) -> str:
    """Extract user ID from verified token"""
    return token_payload.get('userId')

async def get_api_client_with_auth(token_payload: Dict[str, Any] = Depends(verify_token)) -> AtlasApiClient:
    """Get API client with authentication token"""
    # Extract token from the Authorization header for API client
    from fastapi import Request
    # We'll pass the token to the API client for downstream requests
    return create_api_client(auth_token=f"Bearer {token_payload.get('access_token', '')}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with proper error handling"""
    try:
        # Check API gateway connectivity instead of direct DB access
        api_healthy = await api_client.health_check() if api_client else False

        # Check AI model status
        model_loaded = insights_generator.is_model_loaded() if insights_generator else False

        # Check financial calculations service
        rust_engine_healthy = True
        try:
            if financial_calculations:
                # Simple test calculation to verify Rust engine
                test_amount = FinancialAmount("100.00")
                await financial_calculations.validate_amount(test_amount)
        except Exception:
            rust_engine_healthy = False

        status = "healthy" if api_healthy and model_loaded and rust_engine_healthy else "degraded"

        return HealthResponse(
            status=status,
            version="2.0.0",
            services={
                "api_gateway": "healthy" if api_healthy else "unhealthy",
                "ai_model": "loaded" if model_loaded else "not_loaded",
                "rust_engine": "healthy" if rust_engine_healthy else "unhealthy"
            }
        )
    except Exception as e:
        error = handleError(e, "Health check")
        logger.error("Health check failed", error=error.toJSON())
        raise HTTPException(status_code=503, detail="Service unhealthy")

@app.post("/insights/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_authenticated_user),
    auth_api_client: AtlasApiClient = Depends(get_api_client_with_auth)
) -> InsightResponse:
    """
    Generate financial insights using API gateway instead of direct DB access
    """
    logger.info("Generating insights",
               user_id=user_id,
               insight_type=request.insight_type,
               authenticated_user=user_id)

    try:
        # Validate user has access to requested user data
        if request.user_id != user_id:
            raise AuthorizationError(
                "Cannot access insights for different user",
                resource=f"user:{request.user_id}"
            )

        # Generate insights using AI engine
        insights = await insights_generator.generate_insights(request, auth_api_client)

        # Store insights back via API gateway (not direct DB access)
        background_tasks.add_task(
            store_insights_via_api,
            user_id,
            insights,
            auth_api_client
        )

        logger.info("Insights generated successfully",
                   user_id=user_id,
                   insights_count=len(insights.insights) if hasattr(insights, 'insights') else 0)

        return insights

    except (AuthenticationError, AuthorizationError):
        raise
    except Exception as e:
        error = handleError(e, f"Generate insights for user {user_id}")
        logger.error("Failed to generate insights",
                    user_id=user_id,
                    error=error.toJSON())

        if isinstance(error, AtlasError):
            raise HTTPException(status_code=error.statusCode, detail=error.message)
        else:
            raise HTTPException(status_code=500, detail="Failed to generate insights")

@app.post("/insights/budget-check")
async def budget_check(
    user_id: str = Depends(get_authenticated_user),
    auth_api_client: AtlasApiClient = Depends(get_api_client_with_auth)
) -> Dict[str, Any]:
    """
    Check budget against 75/15/10 rule using API gateway and bank-grade precision
    """
    logger.info("Running budget check", user_id=user_id)

    try:
        # Get user's financial data via API gateway (not direct DB access)
        financial_data = await auth_api_client.get_user_financial_data(user_id)

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
            "engine": "rust-financial-engine",
            "data_source": "api-gateway"  # NEW: indicates proper service boundaries
        }

    except NotFoundError as e:
        logger.warning("User financial data not found", user_id=user_id)
        raise HTTPException(status_code=404, detail=f"Financial data not found: {e.message}")
    except FinancialCalculationError as e:
        logger.error("Budget calculation failed", user_id=user_id, error=e.toJSON())
        raise HTTPException(status_code=400, detail=f"Budget calculation error: {e.message}")
    except Exception as e:
        error = handleError(e, f"Budget check for user {user_id}")
        logger.error("Budget check failed", user_id=user_id, error=error.toJSON())
        raise HTTPException(status_code=500, detail="Budget check failed")

@app.post("/insights/debt-snowball")
async def debt_snowball_analysis(
    extra_payment: float = 0.0,
    user_id: str = Depends(get_authenticated_user),
    auth_api_client: AtlasApiClient = Depends(get_api_client_with_auth)
) -> Dict[str, Any]:
    """
    Generate debt snowball payoff plan using API gateway and bank-grade precision
    """
    logger.info("Generating debt snowball analysis",
               user_id=user_id,
               extra_payment=extra_payment)

    try:
        from src.financial.calculations import DebtInfo
        from decimal import Decimal

        # Get user's debt data via API gateway (not direct DB access)
        debt_data = await auth_api_client.get_user_debt_data(user_id)

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
            "engine": "rust-financial-engine",
            "data_source": "api-gateway"  # NEW: indicates proper service boundaries
        }

    except NotFoundError as e:
        logger.warning("User debt data not found", user_id=user_id)
        raise HTTPException(status_code=404, detail=f"Debt data not found: {e.message}")
    except FinancialCalculationError as e:
        logger.error("Debt analysis failed", user_id=user_id, error=e.toJSON())
        raise HTTPException(status_code=400, detail=f"Debt analysis error: {e.message}")
    except Exception as e:
        error = handleError(e, f"Debt snowball analysis for user {user_id}")
        logger.error("Debt snowball analysis failed", user_id=user_id, error=error.toJSON())
        raise HTTPException(status_code=500, detail="Debt analysis failed")

@app.post("/insights/portfolio-analysis")
async def portfolio_analysis(
    user_id: str = Depends(get_authenticated_user),
    auth_api_client: AtlasApiClient = Depends(get_api_client_with_auth)
) -> Dict[str, Any]:
    """
    Calculate net worth using API gateway and bank-grade precision
    """
    logger.info("Running portfolio analysis", user_id=user_id)

    try:
        # Get user's investment and asset data via API gateway (not direct DB access)
        portfolio_data = await auth_api_client.get_user_portfolio_data(user_id)

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
            "engine": "rust-financial-engine",
            "data_source": "api-gateway"  # NEW: indicates proper service boundaries
        }

    except NotFoundError as e:
        logger.warning("User portfolio data not found", user_id=user_id)
        raise HTTPException(status_code=404, detail=f"Portfolio data not found: {e.message}")
    except FinancialCalculationError as e:
        logger.error("Portfolio analysis failed", user_id=user_id, error=e.toJSON())
        raise HTTPException(status_code=400, detail=f"Portfolio analysis error: {e.message}")
    except Exception as e:
        error = handleError(e, f"Portfolio analysis for user {user_id}")
        logger.error("Portfolio analysis failed", user_id=user_id, error=error.toJSON())
        raise HTTPException(status_code=500, detail="Portfolio analysis failed")

@app.get("/models/status")
async def model_status(user_id: str = Depends(get_authenticated_user)) -> Dict[str, Any]:
    """Get AI model status with authentication"""
    try:
        if not insights_generator:
            return {"status": "not_initialized"}

        return {
            "status": "loaded" if insights_generator.is_model_loaded() else "not_loaded",
            "model_name": ai_model_config.model_name,
            "model_path": ai_model_config.model_path,
            "memory_usage": insights_generator.get_memory_usage(),
            "honesty_level": ai_model_config.honesty_level.value,
            "service_boundaries": "api-gateway",  # NEW: indicates architectural compliance
            "version": "2.0.0"
        }
    except Exception as e:
        error = handleError(e, "Get model status")
        logger.error("Failed to get model status", error=error.toJSON())
        raise HTTPException(status_code=500, detail="Failed to get model status")

async def store_insights_via_api(user_id: str, insights: InsightResponse, api_client: AtlasApiClient):
    """
    Store generated insights via API gateway (not direct DB access)
    """
    try:
        await api_client.store_user_insights(user_id, insights.dict())
        logger.info("Insights stored via API gateway",
                   user_id=user_id,
                   method="api-gateway")  # NEW: indicates proper service boundaries
    except Exception as e:
        error = handleError(e, f"Store insights for user {user_id}")
        logger.error("Failed to store insights via API gateway",
                    user_id=user_id,
                    error=error.toJSON())

# Metrics endpoint for monitoring
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    if not settings.enable_metrics:
        raise HTTPException(status_code=404, detail="Metrics disabled")

    # Return basic metrics
    return {
        "service": "ai-engine",
        "version": "2.0.0",
        "architecture_compliance": "phase-2.5",
        "service_boundaries": "api-gateway",
        "authentication": "supertokens",
        "error_handling": "atlas-shared"
    }

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Atlas AI Engine v2.0",
               environment=settings.environment,
               api_gateway_url=settings.api_gateway_url)

    uvicorn.run(
        "main_refactored_v2:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development(),
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
                "level": settings.log_level,
                "handlers": ["default"],
            },
        }
    )
