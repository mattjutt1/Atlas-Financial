"""
Atlas Financial AI Engine Core
Flexible architecture supporting both monolithic and multi-agent AI approaches
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Union
from uuid import uuid4

import redis
from prometheus_client import Counter, Histogram, Gauge

# Metrics for monitoring
REQUEST_COUNT = Counter('ai_engine_requests_total', 'Total AI engine requests', ['backend_type', 'operation'])
REQUEST_DURATION = Histogram('ai_engine_request_duration_seconds', 'Request duration', ['backend_type', 'operation'])
ACTIVE_AGENTS = Gauge('ai_engine_active_agents', 'Number of active agents', ['agent_type'])


class AIBackendType(Enum):
    """Supported AI backend types"""
    MONOLITHIC = "monolithic"
    MULTI_AGENT = "multi_agent"


class OperationType(Enum):
    """AI operation types"""
    BUDGET_OPTIMIZATION = "budget_optimization"
    PORTFOLIO_ANALYSIS = "portfolio_analysis"
    DEBT_STRATEGY = "debt_strategy"
    MARKET_INTELLIGENCE = "market_intelligence"
    GOAL_PLANNING = "goal_planning"
    FINANCIAL_ANALYSIS = "financial_analysis"


@dataclass
class AIRequest:
    """Unified AI request structure"""
    request_id: str = field(default_factory=lambda: str(uuid4()))
    user_id: str = ""
    operation: OperationType = OperationType.FINANCIAL_ANALYSIS
    data: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    priority: int = 1  # 1=high, 2=medium, 3=low
    timeout_ms: int = 5000


@dataclass
class AIResponse:
    """Unified AI response structure"""
    request_id: str
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    insights: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: int = 0
    backend_used: str = ""
    agent_trace: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class PerformanceMetrics:
    """Performance metrics for backend evaluation"""
    avg_response_time_ms: float
    success_rate: float
    throughput_rps: float
    resource_utilization: float
    accuracy_score: float
    last_updated: datetime = field(default_factory=datetime.utcnow)


class AIBackendStrategy(Protocol):
    """Protocol for AI backend implementations"""
    
    async def execute_request(self, request: AIRequest) -> AIResponse:
        """Execute AI request using this backend"""
        ...
    
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get backend capabilities and supported operations"""
        ...
    
    async def get_performance_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics"""
        ...
    
    async def health_check(self) -> bool:
        """Check if backend is healthy"""
        ...


class ContextManager:
    """Manages user context and conversation history"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.context_ttl = 3600  # 1 hour
    
    async def get_context(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user context"""
        key = f"ai_context:{user_id}"
        context_data = self.redis.get(key)
        if context_data:
            import json
            return json.loads(context_data)
        return {}
    
    async def update_context(self, user_id: str, context: Dict[str, Any]) -> None:
        """Update user context"""
        key = f"ai_context:{user_id}"
        import json
        await self.redis.setex(key, self.context_ttl, json.dumps(context))
    
    async def add_interaction(self, user_id: str, request: AIRequest, response: AIResponse) -> None:
        """Add interaction to conversation history"""
        context = await self.get_context(user_id)
        if 'interactions' not in context:
            context['interactions'] = []
        
        context['interactions'].append({
            'request_id': request.request_id,
            'operation': request.operation.value,
            'timestamp': request.timestamp.isoformat(),
            'success': response.success,
            'confidence': response.confidence
        })
        
        # Keep only last 10 interactions
        context['interactions'] = context['interactions'][-10:]
        await self.update_context(user_id, context)


class BackendSelector:
    """Intelligent backend selection based on request characteristics"""
    
    def __init__(self):
        self.performance_history: Dict[AIBackendType, PerformanceMetrics] = {}
        self.ab_test_config: Dict[str, Any] = {}
    
    async def select_backend(self, request: AIRequest) -> AIBackendType:
        """Select optimal backend for request"""
        
        # A/B testing override
        if await self._is_ab_test_user(request.user_id):
            return await self._get_ab_test_variant(request.user_id)
        
        # Performance-based selection
        complexity_score = self._assess_complexity(request)
        
        if complexity_score > 0.8:
            # High complexity - prefer multi-agent if available and performing well
            if await self._is_backend_healthy(AIBackendType.MULTI_AGENT):
                return AIBackendType.MULTI_AGENT
        
        # Default to monolithic for simplicity and reliability
        return AIBackendType.MONOLITHIC
    
    def _assess_complexity(self, request: AIRequest) -> float:
        """Assess request complexity (0.0-1.0)"""
        complexity_factors = []
        
        # Data volume factor
        data_size = len(str(request.data))
        complexity_factors.append(min(data_size / 10000, 1.0))
        
        # Operation complexity
        operation_complexity = {
            OperationType.BUDGET_OPTIMIZATION: 0.6,
            OperationType.PORTFOLIO_ANALYSIS: 0.8,
            OperationType.DEBT_STRATEGY: 0.7,
            OperationType.MARKET_INTELLIGENCE: 0.9,
            OperationType.GOAL_PLANNING: 0.8,
            OperationType.FINANCIAL_ANALYSIS: 0.5
        }
        complexity_factors.append(operation_complexity.get(request.operation, 0.5))
        
        # Priority factor (high priority = potentially complex)
        complexity_factors.append(0.3 if request.priority == 1 else 0.1)
        
        return sum(complexity_factors) / len(complexity_factors)
    
    async def _is_ab_test_user(self, user_id: str) -> bool:
        """Check if user is in A/B test"""
        # Simple hash-based assignment
        return hash(user_id) % 100 < 20  # 20% of users in test
    
    async def _get_ab_test_variant(self, user_id: str) -> AIBackendType:
        """Get A/B test variant for user"""
        if hash(user_id) % 2 == 0:
            return AIBackendType.MULTI_AGENT
        return AIBackendType.MONOLITHIC
    
    async def _is_backend_healthy(self, backend_type: AIBackendType) -> bool:
        """Check if backend is healthy"""
        metrics = self.performance_history.get(backend_type)
        if not metrics:
            return False
        
        return (
            metrics.success_rate > 0.95 and
            metrics.avg_response_time_ms < 500 and
            metrics.resource_utilization < 0.9
        )


class MonolithicBackend:
    """Monolithic AI backend implementation"""
    
    def __init__(self, model_endpoint: str):
        self.model_endpoint = model_endpoint
        self.logger = logging.getLogger(__name__)
    
    async def execute_request(self, request: AIRequest) -> AIResponse:
        """Execute request using monolithic model"""
        start_time = datetime.utcnow()
        
        try:
            # Simulate model inference
            await asyncio.sleep(0.2)  # Placeholder for actual model call
            
            result_data = await self._process_with_monolithic_model(request)
            
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AIResponse(
                request_id=request.request_id,
                success=True,
                data=result_data,
                confidence=0.85,
                processing_time_ms=processing_time,
                backend_used="monolithic",
                agent_trace=["monolithic-model"]
            )
            
        except Exception as e:
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self.logger.error(f"Monolithic backend error: {e}")
            
            return AIResponse(
                request_id=request.request_id,
                success=False,
                processing_time_ms=processing_time,
                backend_used="monolithic",
                error=str(e)
            )
    
    async def _process_with_monolithic_model(self, request: AIRequest) -> Dict[str, Any]:
        """Process request with monolithic model"""
        # Placeholder implementation
        return {
            "operation": request.operation.value,
            "result": "monolithic_analysis_result",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get monolithic backend capabilities"""
        return {
            "backend_type": "monolithic",
            "supported_operations": [op.value for op in OperationType],
            "max_concurrent_requests": 100,
            "avg_response_time_ms": 300
        }
    
    async def get_performance_metrics(self) -> PerformanceMetrics:
        """Get performance metrics"""
        return PerformanceMetrics(
            avg_response_time_ms=300.0,
            success_rate=0.98,
            throughput_rps=50.0,
            resource_utilization=0.65,
            accuracy_score=0.85
        )
    
    async def health_check(self) -> bool:
        """Check backend health"""
        try:
            # Placeholder health check
            return True
        except Exception:
            return False


class MultiAgentBackend:
    """Multi-agent AI backend implementation"""
    
    def __init__(self, supervisor_endpoint: str, agent_registry: Dict[str, str]):
        self.supervisor_endpoint = supervisor_endpoint
        self.agent_registry = agent_registry
        self.logger = logging.getLogger(__name__)
    
    async def execute_request(self, request: AIRequest) -> AIResponse:
        """Execute request using multi-agent system"""
        start_time = datetime.utcnow()
        agent_trace = []
        
        try:
            # Route to supervisor agent
            agent_trace.append("supervisor")
            
            # Determine required specialized agents
            required_agents = self._determine_required_agents(request)
            agent_trace.extend(required_agents)
            
            # Coordinate agent execution
            agent_results = await self._coordinate_agents(request, required_agents)
            
            # Aggregate results
            final_result = await self._aggregate_results(agent_results)
            
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AIResponse(
                request_id=request.request_id,
                success=True,
                data=final_result,
                confidence=0.92,
                processing_time_ms=processing_time,
                backend_used="multi_agent",
                agent_trace=agent_trace
            )
            
        except Exception as e:
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            self.logger.error(f"Multi-agent backend error: {e}")
            
            return AIResponse(
                request_id=request.request_id,
                success=False,
                processing_time_ms=processing_time,
                backend_used="multi_agent",
                agent_trace=agent_trace,
                error=str(e)
            )
    
    def _determine_required_agents(self, request: AIRequest) -> List[str]:
        """Determine which agents are needed for this request"""
        agent_mapping = {
            OperationType.BUDGET_OPTIMIZATION: ["budget_agent"],
            OperationType.PORTFOLIO_ANALYSIS: ["investment_agent"],
            OperationType.DEBT_STRATEGY: ["debt_agent"],
            OperationType.MARKET_INTELLIGENCE: ["market_agent"],
            OperationType.GOAL_PLANNING: ["goal_agent"],
            OperationType.FINANCIAL_ANALYSIS: ["budget_agent", "investment_agent"]
        }
        
        return agent_mapping.get(request.operation, ["budget_agent"])
    
    async def _coordinate_agents(self, request: AIRequest, required_agents: List[str]) -> Dict[str, Any]:
        """Coordinate execution across multiple agents"""
        agent_tasks = []
        
        for agent_name in required_agents:
            task = self._execute_agent_task(agent_name, request)
            agent_tasks.append(task)
        
        # Execute agents in parallel
        results = await asyncio.gather(*agent_tasks, return_exceptions=True)
        
        agent_results = {}
        for i, agent_name in enumerate(required_agents):
            if not isinstance(results[i], Exception):
                agent_results[agent_name] = results[i]
            else:
                self.logger.error(f"Agent {agent_name} failed: {results[i]}")
        
        return agent_results
    
    async def _execute_agent_task(self, agent_name: str, request: AIRequest) -> Dict[str, Any]:
        """Execute task on specific agent"""
        # Simulate agent execution
        await asyncio.sleep(0.1)
        
        return {
            "agent": agent_name,
            "result": f"{agent_name}_analysis_result",
            "confidence": 0.9,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _aggregate_results(self, agent_results: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate results from multiple agents"""
        return {
            "aggregated_results": agent_results,
            "coordination_strategy": "parallel_execution",
            "agents_used": list(agent_results.keys()),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_capabilities(self) -> Dict[str, Any]:
        """Get multi-agent backend capabilities"""
        return {
            "backend_type": "multi_agent",
            "supported_operations": [op.value for op in OperationType],
            "available_agents": list(self.agent_registry.keys()),
            "max_concurrent_requests": 500,
            "avg_response_time_ms": 250
        }
    
    async def get_performance_metrics(self) -> PerformanceMetrics:
        """Get performance metrics"""
        return PerformanceMetrics(
            avg_response_time_ms=250.0,
            success_rate=0.96,
            throughput_rps=80.0,
            resource_utilization=0.75,
            accuracy_score=0.92
        )
    
    async def health_check(self) -> bool:
        """Check backend health"""
        try:
            # Check supervisor and key agents
            return True
        except Exception:
            return False


class AIEngineOrchestrator:
    """Main orchestrator for AI Engine requests"""
    
    def __init__(self, redis_client: redis.Redis):
        self.context_manager = ContextManager(redis_client)
        self.backend_selector = BackendSelector()
        self.backends: Dict[AIBackendType, AIBackendStrategy] = {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize backends
        self._initialize_backends()
    
    def _initialize_backends(self):
        """Initialize available backends"""
        self.backends[AIBackendType.MONOLITHIC] = MonolithicBackend("http://monolithic-model:8080")
        self.backends[AIBackendType.MULTI_AGENT] = MultiAgentBackend(
            "http://supervisor-agent:8080",
            {
                "budget_agent": "http://budget-agent:8080",
                "investment_agent": "http://investment-agent:8080",
                "debt_agent": "http://debt-agent:8080",
                "market_agent": "http://market-agent:8080",
                "goal_agent": "http://goal-agent:8080"
            }
        )
    
    async def process_request(self, request: AIRequest) -> AIResponse:
        """Process AI request using optimal backend"""
        
        # Update request with user context
        user_context = await self.context_manager.get_context(request.user_id)
        request.context.update(user_context)
        
        # Select backend strategy
        backend_type = await self.backend_selector.select_backend(request)
        backend = self.backends[backend_type]
        
        # Record metrics
        REQUEST_COUNT.labels(backend_type=backend_type.value, operation=request.operation.value).inc()
        
        # Execute request
        with REQUEST_DURATION.labels(backend_type=backend_type.value, operation=request.operation.value).time():
            response = await backend.execute_request(request)
        
        # Update context with interaction
        await self.context_manager.add_interaction(request.user_id, request, response)
        
        self.logger.info(
            f"Processed request {request.request_id} using {backend_type.value} "
            f"in {response.processing_time_ms}ms"
        )
        
        return response
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "backends": {}
        }
        
        for backend_type, backend in self.backends.items():
            try:
                health = await backend.health_check()
                capabilities = await backend.get_capabilities()
                metrics = await backend.get_performance_metrics()
                
                status["backends"][backend_type.value] = {
                    "healthy": health,
                    "capabilities": capabilities,
                    "metrics": {
                        "avg_response_time_ms": metrics.avg_response_time_ms,
                        "success_rate": metrics.success_rate,
                        "throughput_rps": metrics.throughput_rps,
                        "accuracy_score": metrics.accuracy_score
                    }
                }
            except Exception as e:
                status["backends"][backend_type.value] = {
                    "healthy": False,
                    "error": str(e)
                }
        
        return status


# Factory function for creating orchestrator
def create_ai_engine(redis_url: str = "redis://localhost:6379") -> AIEngineOrchestrator:
    """Create AI Engine orchestrator with dependencies"""
    redis_client = redis.from_url(redis_url)
    return AIEngineOrchestrator(redis_client)