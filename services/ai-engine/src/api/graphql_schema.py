"""
Atlas Financial AI Engine GraphQL Schema
Unified API interface for both monolithic and multi-agent AI backends
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any

import strawberry
from strawberry.types import Info

from ..core.engine import AIEngineOrchestrator, AIRequest, OperationType


# GraphQL Types
@strawberry.type
class AIInsight:
    """AI-generated insight"""
    id: str
    type: str
    severity: str
    title: str
    description: str
    confidence: float
    action_items: List[str]
    timestamp: datetime


@strawberry.type
class AIRecommendation:
    """AI-generated recommendation"""
    id: str
    category: str
    title: str
    description: str
    impact_score: float
    confidence: float
    action_required: bool
    estimated_benefit: Optional[str] = None


@strawberry.type
class BudgetOptimizationResult:
    """Budget optimization results"""
    total_savings_potential: float
    category_adjustments: List[Dict[str, Any]] = strawberry.field(default_factory=list)
    spending_alerts: List[AIInsight] = strawberry.field(default_factory=list)
    recommendations: List[AIRecommendation] = strawberry.field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0


@strawberry.type
class PortfolioAnalysisResult:
    """Portfolio analysis results"""
    current_allocation: Dict[str, float] = strawberry.field(default_factory=dict)
    recommended_allocation: Dict[str, float] = strawberry.field(default_factory=dict)
    risk_score: float = 0.0
    rebalance_actions: List[Dict[str, Any]] = strawberry.field(default_factory=list)
    performance_insights: List[AIInsight] = strawberry.field(default_factory=list)
    recommendations: List[AIRecommendation] = strawberry.field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0


@strawberry.type
class DebtPayoffStrategy:
    """Debt payoff strategy results"""
    strategy_type: str  # avalanche, snowball, or custom
    total_interest_savings: float
    payoff_timeline_months: int
    monthly_payment_plan: List[Dict[str, Any]] = strawberry.field(default_factory=list)
    recommendations: List[AIRecommendation] = strawberry.field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0


@strawberry.type
class MarketAlert:
    """Market intelligence alert"""
    id: str
    alert_type: str
    severity: str
    asset_symbol: str
    message: str
    action_suggested: str
    confidence: float
    timestamp: datetime


@strawberry.type
class GoalAchievementPlan:
    """Goal achievement plan"""
    goal_id: str
    achievement_probability: float
    optimized_timeline_months: int
    monthly_contribution_needed: float
    milestone_schedule: List[Dict[str, Any]] = strawberry.field(default_factory=list)
    adjustment_recommendations: List[AIRecommendation] = strawberry.field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0


@strawberry.type
class FinancialAnalysisReport:
    """Comprehensive financial analysis"""
    overall_health_score: float
    net_worth_trend: str
    cash_flow_analysis: Dict[str, Any] = strawberry.field(default_factory=dict)
    risk_assessment: Dict[str, Any] = strawberry.field(default_factory=dict)
    insights: List[AIInsight] = strawberry.field(default_factory=list)
    recommendations: List[AIRecommendation] = strawberry.field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0


@strawberry.type
class AISystemStatus:
    """AI system status"""
    timestamp: datetime
    healthy: bool
    active_backend: str
    performance_metrics: Dict[str, Any] = strawberry.field(default_factory=dict)
    backend_status: Dict[str, Any] = strawberry.field(default_factory=dict)


# Input Types
@strawberry.input
class BudgetPreferences:
    """Budget optimization preferences"""
    priority_categories: List[str] = strawberry.field(default_factory=list)
    savings_goal_percentage: Optional[float] = None
    risk_tolerance: Optional[str] = None
    spending_flexibility: Optional[str] = None


@strawberry.input
class PortfolioPreferences:
    """Portfolio analysis preferences"""
    risk_tolerance: str
    investment_horizon_years: int
    target_allocation: Optional[Dict[str, float]] = None
    exclude_sectors: List[str] = strawberry.field(default_factory=list)


@strawberry.input
class DebtPreferences:
    """Debt strategy preferences"""
    strategy_preference: Optional[str] = None  # avalanche, snowball, custom
    extra_payment_amount: Optional[float] = None
    priority_debts: List[str] = strawberry.field(default_factory=list)


@strawberry.input
class MarketWatchlist:
    """Market intelligence watchlist"""
    symbols: List[str]
    alert_thresholds: Dict[str, float] = strawberry.field(default_factory=dict)
    notification_preferences: Dict[str, bool] = strawberry.field(default_factory=dict)


@strawberry.input
class GoalParameters:
    """Goal planning parameters"""
    target_amount: float
    target_date: datetime
    current_savings: float
    monthly_contribution: float
    risk_tolerance: str


# Queries
@strawberry.type
class Query:
    """AI Engine GraphQL queries"""
    
    @strawberry.field
    async def ai_system_status(self, info: Info) -> AISystemStatus:
        """Get AI system status"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        status = await orchestrator.get_system_status()
        
        return AISystemStatus(
            timestamp=datetime.fromisoformat(status["timestamp"]),
            healthy=all(backend.get("healthy", False) for backend in status["backends"].values()),
            active_backend="multi_agent" if status["backends"].get("multi_agent", {}).get("healthy") else "monolithic",
            performance_metrics=status.get("performance_metrics", {}),
            backend_status=status["backends"]
        )
    
    @strawberry.field
    async def get_financial_insights(self, info: Info, user_id: str) -> List[AIInsight]:
        """Get AI-generated financial insights for user"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.FINANCIAL_ANALYSIS,
            data={"analysis_type": "insights"}
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return []
        
        insights = []
        for insight_data in response.insights:
            insights.append(AIInsight(
                id=insight_data.get("id", ""),
                type=insight_data.get("type", "general"),
                severity=insight_data.get("severity", "info"),
                title=insight_data.get("title", ""),
                description=insight_data.get("description", ""),
                confidence=insight_data.get("confidence", 0.0),
                action_items=insight_data.get("action_items", []),
                timestamp=datetime.fromisoformat(insight_data.get("timestamp", datetime.utcnow().isoformat()))
            ))
        
        return insights


# Mutations
@strawberry.type
class Mutation:
    """AI Engine GraphQL mutations"""
    
    @strawberry.field
    async def optimize_budget(
        self,
        info: Info,
        user_id: str,
        preferences: Optional[BudgetPreferences] = None
    ) -> BudgetOptimizationResult:
        """Optimize user budget using AI"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request_data = {
            "user_id": user_id,
            "preferences": {
                "priority_categories": preferences.priority_categories if preferences else [],
                "savings_goal_percentage": preferences.savings_goal_percentage if preferences else None,
                "risk_tolerance": preferences.risk_tolerance if preferences else None,
                "spending_flexibility": preferences.spending_flexibility if preferences else None
            } if preferences else {}
        }
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.BUDGET_OPTIMIZATION,
            data=request_data
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return BudgetOptimizationResult(
                total_savings_potential=0.0,
                processing_time_ms=response.processing_time_ms
            )
        
        # Parse response data
        result_data = response.data
        
        # Convert insights
        insights = []
        for insight_data in response.insights:
            insights.append(AIInsight(
                id=insight_data.get("id", ""),
                type=insight_data.get("type", "budget"),
                severity=insight_data.get("severity", "info"),
                title=insight_data.get("title", ""),
                description=insight_data.get("description", ""),
                confidence=insight_data.get("confidence", 0.0),
                action_items=insight_data.get("action_items", []),
                timestamp=datetime.fromisoformat(insight_data.get("timestamp", datetime.utcnow().isoformat()))
            ))
        
        # Convert recommendations
        recommendations = []
        for rec_data in response.recommendations:
            recommendations.append(AIRecommendation(
                id=rec_data.get("id", ""),
                category=rec_data.get("category", "budget"),
                title=rec_data.get("title", ""),
                description=rec_data.get("description", ""),
                impact_score=rec_data.get("impact_score", 0.0),
                confidence=rec_data.get("confidence", 0.0),
                action_required=rec_data.get("action_required", False),
                estimated_benefit=rec_data.get("estimated_benefit")
            ))
        
        return BudgetOptimizationResult(
            total_savings_potential=result_data.get("total_savings_potential", 0.0),
            category_adjustments=result_data.get("category_adjustments", []),
            spending_alerts=insights,
            recommendations=recommendations,
            confidence=response.confidence,
            processing_time_ms=response.processing_time_ms
        )
    
    @strawberry.field
    async def analyze_portfolio(
        self,
        info: Info,
        user_id: str,
        preferences: Optional[PortfolioPreferences] = None
    ) -> PortfolioAnalysisResult:
        """Analyze portfolio using AI"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request_data = {
            "user_id": user_id,
            "preferences": {
                "risk_tolerance": preferences.risk_tolerance if preferences else "moderate",
                "investment_horizon_years": preferences.investment_horizon_years if preferences else 10,
                "target_allocation": preferences.target_allocation if preferences else None,
                "exclude_sectors": preferences.exclude_sectors if preferences else []
            } if preferences else {}
        }
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.PORTFOLIO_ANALYSIS,
            data=request_data
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return PortfolioAnalysisResult(
                processing_time_ms=response.processing_time_ms
            )
        
        result_data = response.data
        
        # Convert insights and recommendations
        insights = [
            AIInsight(
                id=insight.get("id", ""),
                type=insight.get("type", "portfolio"),
                severity=insight.get("severity", "info"),
                title=insight.get("title", ""),
                description=insight.get("description", ""),
                confidence=insight.get("confidence", 0.0),
                action_items=insight.get("action_items", []),
                timestamp=datetime.fromisoformat(insight.get("timestamp", datetime.utcnow().isoformat()))
            )
            for insight in response.insights
        ]
        
        recommendations = [
            AIRecommendation(
                id=rec.get("id", ""),
                category=rec.get("category", "portfolio"),
                title=rec.get("title", ""),
                description=rec.get("description", ""),
                impact_score=rec.get("impact_score", 0.0),
                confidence=rec.get("confidence", 0.0),
                action_required=rec.get("action_required", False),
                estimated_benefit=rec.get("estimated_benefit")
            )
            for rec in response.recommendations
        ]
        
        return PortfolioAnalysisResult(
            current_allocation=result_data.get("current_allocation", {}),
            recommended_allocation=result_data.get("recommended_allocation", {}),
            risk_score=result_data.get("risk_score", 0.0),
            rebalance_actions=result_data.get("rebalance_actions", []),
            performance_insights=insights,
            recommendations=recommendations,
            confidence=response.confidence,
            processing_time_ms=response.processing_time_ms
        )
    
    @strawberry.field
    async def generate_debt_strategy(
        self,
        info: Info,
        user_id: str,
        preferences: Optional[DebtPreferences] = None
    ) -> DebtPayoffStrategy:
        """Generate debt payoff strategy using AI"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request_data = {
            "user_id": user_id,
            "preferences": {
                "strategy_preference": preferences.strategy_preference if preferences else None,
                "extra_payment_amount": preferences.extra_payment_amount if preferences else None,
                "priority_debts": preferences.priority_debts if preferences else []
            } if preferences else {}
        }
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.DEBT_STRATEGY,
            data=request_data
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return DebtPayoffStrategy(
                strategy_type="none",
                total_interest_savings=0.0,
                payoff_timeline_months=0,
                processing_time_ms=response.processing_time_ms
            )
        
        result_data = response.data
        
        recommendations = [
            AIRecommendation(
                id=rec.get("id", ""),
                category=rec.get("category", "debt"),
                title=rec.get("title", ""),
                description=rec.get("description", ""),
                impact_score=rec.get("impact_score", 0.0),
                confidence=rec.get("confidence", 0.0),
                action_required=rec.get("action_required", False),
                estimated_benefit=rec.get("estimated_benefit")
            )
            for rec in response.recommendations
        ]
        
        return DebtPayoffStrategy(
            strategy_type=result_data.get("strategy_type", "avalanche"),
            total_interest_savings=result_data.get("total_interest_savings", 0.0),
            payoff_timeline_months=result_data.get("payoff_timeline_months", 0),
            monthly_payment_plan=result_data.get("monthly_payment_plan", []),
            recommendations=recommendations,
            confidence=response.confidence,
            processing_time_ms=response.processing_time_ms
        )
    
    @strawberry.field
    async def setup_market_intelligence(
        self,
        info: Info,
        user_id: str,
        watchlist: MarketWatchlist
    ) -> List[MarketAlert]:
        """Setup market intelligence monitoring"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request_data = {
            "user_id": user_id,
            "watchlist": {
                "symbols": watchlist.symbols,
                "alert_thresholds": watchlist.alert_thresholds,
                "notification_preferences": watchlist.notification_preferences
            }
        }
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.MARKET_INTELLIGENCE,
            data=request_data
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return []
        
        # Convert alerts from response
        alerts = []
        for alert_data in response.data.get("alerts", []):
            alerts.append(MarketAlert(
                id=alert_data.get("id", ""),
                alert_type=alert_data.get("alert_type", "price"),
                severity=alert_data.get("severity", "info"),
                asset_symbol=alert_data.get("asset_symbol", ""),
                message=alert_data.get("message", ""),
                action_suggested=alert_data.get("action_suggested", "monitor"),
                confidence=alert_data.get("confidence", 0.0),
                timestamp=datetime.fromisoformat(alert_data.get("timestamp", datetime.utcnow().isoformat()))
            ))
        
        return alerts
    
    @strawberry.field
    async def optimize_goal_plan(
        self,
        info: Info,
        user_id: str,
        goal_id: str,
        parameters: GoalParameters
    ) -> GoalAchievementPlan:
        """Optimize goal achievement plan using AI"""
        orchestrator: AIEngineOrchestrator = info.context["ai_engine"]
        
        request_data = {
            "user_id": user_id,
            "goal_id": goal_id,
            "parameters": {
                "target_amount": parameters.target_amount,
                "target_date": parameters.target_date.isoformat(),
                "current_savings": parameters.current_savings,
                "monthly_contribution": parameters.monthly_contribution,
                "risk_tolerance": parameters.risk_tolerance
            }
        }
        
        request = AIRequest(
            user_id=user_id,
            operation=OperationType.GOAL_PLANNING,
            data=request_data
        )
        
        response = await orchestrator.process_request(request)
        
        if not response.success:
            return GoalAchievementPlan(
                goal_id=goal_id,
                achievement_probability=0.0,
                optimized_timeline_months=0,
                monthly_contribution_needed=0.0,
                processing_time_ms=response.processing_time_ms
            )
        
        result_data = response.data
        
        recommendations = [
            AIRecommendation(
                id=rec.get("id", ""),
                category=rec.get("category", "goal"),
                title=rec.get("title", ""),
                description=rec.get("description", ""),
                impact_score=rec.get("impact_score", 0.0),
                confidence=rec.get("confidence", 0.0),
                action_required=rec.get("action_required", False),
                estimated_benefit=rec.get("estimated_benefit")
            )
            for rec in response.recommendations
        ]
        
        return GoalAchievementPlan(
            goal_id=goal_id,
            achievement_probability=result_data.get("achievement_probability", 0.0),
            optimized_timeline_months=result_data.get("optimized_timeline_months", 0),
            monthly_contribution_needed=result_data.get("monthly_contribution_needed", 0.0),
            milestone_schedule=result_data.get("milestone_schedule", []),
            adjustment_recommendations=recommendations,
            confidence=response.confidence,
            processing_time_ms=response.processing_time_ms
        )


# Create the schema
schema = strawberry.Schema(query=Query, mutation=Mutation)