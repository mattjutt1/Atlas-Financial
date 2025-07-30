"""
Atlas Financial AI Engine - Optimized High-Performance Engine
Integrates caching, batching, and load balancing for 10K concurrent users with sub-400ms response times
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from contextlib import asynccontextmanager

import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge, Summary

from .caching import InferenceCache, CacheWarmer, CacheType
from .batching import RequestBatcher, LoadBalancer, BatchConfig, LoadBalancingStrategy
from ..config.flexible_config import FlexibleConfig, get_config

logger = logging.getLogger(__name__)

# Performance metrics
OPTIMIZED_REQUESTS_TOTAL = Counter('ai_optimized_requests_total', 'Total optimized requests', ['operation', 'cache_status'])
OPTIMIZED_REQUEST_DURATION = Histogram('ai_optimized_request_duration_seconds', 'Optimized request duration', ['operation'])
CONCURRENT_REQUESTS = Gauge('ai_concurrent_requests', 'Current concurrent requests')
THROUGHPUT_RPS = Summary('ai_throughput_requests_per_second', 'Request throughput per second')
CACHE_HIT_RATE = Gauge('ai_cache_hit_rate', 'Cache hit rate', ['operation'])
RESPONSE_TIME_P95 = Gauge('ai_response_time_p95_ms', '95th percentile response time')


@dataclass
class OptimizedAIRequest:
    """Enhanced AI request with performance optimizations"""
    request_id: str
    user_id: str
    operation: str
    data: Dict[str, Any]
    priority: int = 2
    timeout_ms: int = 5000
    cache_enabled: bool = True
    batch_enabled: bool = True
    context: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    submitted_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class OptimizedAIResponse:
    """Enhanced AI response with performance metadata"""
    request_id: str
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    insights: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 0.0
    
    # Performance metadata
    total_time_ms: int = 0
    cache_hit: bool = False
    batch_size: int = 1
    backend_used: str = ""
    endpoint_id: str = ""
    queue_time_ms: int = 0
    processing_time_ms: int = 0
    
    # Error handling
    error: Optional[str] = None
    retry_count: int = 0


class PerformanceMonitor:
    """Real-time performance monitoring and adaptation"""
    
    def __init__(self):
        self.request_times = []
        self.cache_stats = {}
        self.batch_stats = {}
        self.load_stats = {}
        self.alerts = []
    
    def record_request(self, request: OptimizedAIRequest, response: OptimizedAIResponse):
        """Record request performance data"""
        # Track response times for P95 calculation
        self.request_times.append(response.total_time_ms)
        if len(self.request_times) > 1000:  # Keep last 1000 requests
            self.request_times = self.request_times[-1000:]
        
        # Update P95 metric
        if self.request_times:
            sorted_times = sorted(self.request_times)
            p95_index = int(len(sorted_times) * 0.95)
            RESPONSE_TIME_P95.set(sorted_times[p95_index])
        
        # Update cache hit rate
        operation = request.operation
        if operation not in self.cache_stats:
            self.cache_stats[operation] = {'hits': 0, 'total': 0}
        
        self.cache_stats[operation]['total'] += 1
        if response.cache_hit:
            self.cache_stats[operation]['hits'] += 1
        
        hit_rate = self.cache_stats[operation]['hits'] / self.cache_stats[operation]['total']
        CACHE_HIT_RATE.labels(operation=operation).set(hit_rate)
        
        # Check for performance alerts
        self._check_performance_alerts(response)
    
    def _check_performance_alerts(self, response: OptimizedAIResponse):
        """Check for performance degradation and create alerts"""
        alerts_to_add = []
        
        # Response time alert
        if response.total_time_ms > 400:  # Above target
            alerts_to_add.append({
                'type': 'high_response_time',
                'message': f'Response time {response.total_time_ms}ms exceeds 400ms target',
                'severity': 'warning',
                'timestamp': datetime.utcnow()
            })
        
        if response.total_time_ms > 1000:  # Critical threshold
            alerts_to_add.append({
                'type': 'critical_response_time',
                'message': f'Response time {response.total_time_ms}ms exceeds 1000ms critical threshold',
                'severity': 'critical',
                'timestamp': datetime.utcnow()
            })
        
        # Cache miss alerts
        if not response.cache_hit and response.processing_time_ms > 200:
            alerts_to_add.append({
                'type': 'cache_miss_performance',
                'message': f'Cache miss with {response.processing_time_ms}ms processing time',
                'severity': 'info',
                'timestamp': datetime.utcnow()
            })
        
        # Add alerts and maintain recent history
        self.alerts.extend(alerts_to_add)
        if len(self.alerts) > 100:  # Keep last 100 alerts
            self.alerts = self.alerts[-100:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        if not self.request_times:
            return {"error": "No performance data available"}
        
        sorted_times = sorted(self.request_times)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "response_times": {
                "count": len(sorted_times),
                "mean_ms": sum(sorted_times) / len(sorted_times),
                "p50_ms": sorted_times[int(len(sorted_times) * 0.5)],
                "p95_ms": sorted_times[int(len(sorted_times) * 0.95)],
                "p99_ms": sorted_times[int(len(sorted_times) * 0.99)],
                "max_ms": max(sorted_times)
            },
            "cache_stats": {
                op: {
                    "hit_rate": stats['hits'] / stats['total'],
                    "total_requests": stats['total']
                }
                for op, stats in self.cache_stats.items()
            },
            "recent_alerts": self.alerts[-10:],  # Last 10 alerts
            "performance_grade": self._calculate_performance_grade()
        }
    
    def _calculate_performance_grade(self) -> str:
        """Calculate overall performance grade"""
        if not self.request_times:
            return "N/A"
        
        sorted_times = sorted(self.request_times)
        p95_time = sorted_times[int(len(sorted_times) * 0.95)]
        
        # Calculate cache hit rate
        total_hits = sum(stats['hits'] for stats in self.cache_stats.values())
        total_requests = sum(stats['total'] for stats in self.cache_stats.values())
        overall_hit_rate = total_hits / total_requests if total_requests > 0 else 0
        
        # Grade based on P95 response time and cache hit rate
        if p95_time <= 200 and overall_hit_rate >= 0.9:
            return "A+"
        elif p95_time <= 300 and overall_hit_rate >= 0.8:
            return "A"
        elif p95_time <= 400 and overall_hit_rate >= 0.7:
            return "B"
        elif p95_time <= 600 and overall_hit_rate >= 0.6:
            return "C"
        else:
            return "D"


class OptimizedAIEngine:
    """High-performance AI Engine with integrated optimizations"""
    
    def __init__(self, redis_client: redis.Redis, config: Optional[FlexibleConfig] = None):
        self.redis = redis_client
        self.config = config or get_config()
        self.performance_monitor = PerformanceMonitor()
        
        # Initialize core components
        self.cache = InferenceCache(redis_client)
        self.cache_warmer = CacheWarmer(self.cache, redis_client)
        
        # Initialize request batcher
        batch_config = BatchConfig(
            max_batch_size=self.config.performance_config.batch_size,
            max_wait_time_ms=self.config.performance_config.batch_timeout_ms,
            strategy=self._get_batching_strategy()
        )
        self.batcher = RequestBatcher(batch_config)
        
        # Initialize load balancer
        self.load_balancer = LoadBalancer(LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME)
        self._setup_model_endpoints()
        
        # Performance tracking
        self.active_requests = 0
        self.startup_time = datetime.utcnow()
        
        # Model computation function
        self.model_compute_func = self._create_model_compute_function()
    
    def _get_batching_strategy(self):
        """Determine optimal batching strategy based on configuration"""
        from .batching import BatchingStrategy
        
        if self.config.performance_config.enable_request_batching:
            return BatchingStrategy.ADAPTIVE
        else:
            return BatchingStrategy.TIME_BASED
    
    def _setup_model_endpoints(self):
        """Setup model endpoints for load balancing"""
        # Register monolithic endpoint
        if self.config.backend_config.monolithic_model:
            self.load_balancer.register_endpoint(
                endpoint_id="monolithic",
                url=self.config.backend_config.monolithic_model.endpoint,
                max_concurrent=50,
                weight=1.0
            )
        
        # Register multi-agent endpoints
        if self.config.backend_config.supervisor_agent:
            self.load_balancer.register_endpoint(
                endpoint_id="supervisor",
                url=self.config.backend_config.supervisor_agent.model_config.endpoint,
                max_concurrent=30,
                weight=1.2  # Slightly higher weight for coordinated responses
            )
        
        # Register worker agents
        for worker in self.config.backend_config.worker_agents:
            if worker.enabled:
                self.load_balancer.register_endpoint(
                    endpoint_id=worker.agent_type.value,
                    url=worker.model_config.endpoint,
                    max_concurrent=20,
                    weight=0.8  # Lower weight for specialized agents
                )
    
    def _create_model_compute_function(self) -> Callable:
        """Create model computation function for batch processing"""
        
        async def compute_batch(requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            """Process batch of requests through model inference"""
            results = []
            
            for request_data in requests:
                try:
                    # Select optimal endpoint
                    endpoint = await self.load_balancer.select_endpoint(request_data['operation'])
                    if not endpoint:
                        raise Exception("No available endpoints")
                    
                    # Acquire endpoint
                    acquired = await self.load_balancer.acquire_endpoint(endpoint)
                    if not acquired:
                        raise Exception(f"Could not acquire endpoint {endpoint.endpoint_id}")
                    
                    start_time = time.time()
                    
                    try:
                        # Simulate model inference - replace with actual model calls
                        result = await self._execute_model_inference(
                            endpoint, 
                            request_data['operation'], 
                            request_data['data']
                        )
                        
                        processing_time_ms = (time.time() - start_time) * 1000
                        
                        # Release endpoint with success
                        await self.load_balancer.release_endpoint(
                            endpoint, 
                            processing_time_ms, 
                            True
                        )
                        
                        result.update({
                            "endpoint_id": endpoint.endpoint_id,
                            "processing_time_ms": int(processing_time_ms)
                        })
                        
                        results.append(result)
                        
                    except Exception as e:
                        processing_time_ms = (time.time() - start_time) * 1000
                        
                        # Release endpoint with failure
                        await self.load_balancer.release_endpoint(
                            endpoint, 
                            processing_time_ms, 
                            False
                        )
                        
                        raise e
                
                except Exception as e:
                    logger.error(f"Model inference error: {e}")
                    # Return error result
                    results.append({
                        "error": str(e),
                        "endpoint_id": "none",
                        "processing_time_ms": 0
                    })
            
            return results
        
        return compute_batch
    
    async def _execute_model_inference(
        self, 
        endpoint, 
        operation: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute actual model inference - placeholder implementation"""
        
        # Simulate model processing time based on operation complexity
        complexity_delays = {
            "budget_optimization": 0.15,
            "portfolio_analysis": 0.20,
            "debt_strategy": 0.12,
            "market_intelligence": 0.08,
            "goal_planning": 0.18,
            "financial_analysis": 0.25
        }
        
        delay = complexity_delays.get(operation, 0.15)
        await asyncio.sleep(delay)
        
        # Generate realistic mock response
        confidence = 0.85 + (hash(str(data)) % 100) / 1000  # 0.85-0.95
        
        return {
            "operation": operation,
            "result": f"{operation}_optimized_result",
            "confidence": confidence,
            "insights": [
                {
                    "id": f"insight_{operation}",
                    "title": f"AI Insight for {operation}",
                    "description": f"Optimized analysis result with {confidence:.2f} confidence",
                    "severity": "info"
                }
            ],
            "recommendations": [
                {
                    "id": f"rec_{operation}",
                    "title": f"Recommendation for {operation}",
                    "description": "AI-generated recommendation",
                    "impact_score": confidence * 10
                }
            ]
        }
    
    async def process_request(self, request: OptimizedAIRequest) -> OptimizedAIResponse:
        """Process AI request with full optimization pipeline"""
        
        start_time = time.time()
        CONCURRENT_REQUESTS.inc()
        self.active_requests += 1
        
        try:
            # Update metrics
            OPTIMIZED_REQUESTS_TOTAL.labels(
                operation=request.operation,
                cache_status="checking"
            ).inc()
            
            with OPTIMIZED_REQUEST_DURATION.labels(operation=request.operation).time():
                
                # Step 1: Try cache first if enabled
                cached_result = None
                if request.cache_enabled:
                    cached_result = await self.cache.get_cached_result(
                        request.operation,
                        request.user_id,
                        request.data
                    )
                
                if cached_result:
                    # Cache hit - return immediately
                    total_time_ms = int((time.time() - start_time) * 1000)
                    
                    response = OptimizedAIResponse(
                        request_id=request.request_id,
                        success=True,
                        data=cached_result.get("data", {}),
                        insights=cached_result.get("insights", []),
                        recommendations=cached_result.get("recommendations", []),
                        confidence=cached_result.get("confidence", 0.85),
                        total_time_ms=total_time_ms,
                        cache_hit=True,
                        batch_size=1,
                        backend_used="cache",
                        queue_time_ms=0,
                        processing_time_ms=0
                    )
                    
                    OPTIMIZED_REQUESTS_TOTAL.labels(
                        operation=request.operation,
                        cache_status="hit"
                    ).inc()
                    
                    self.performance_monitor.record_request(request, response)
                    return response
                
                # Step 2: Cache miss - process with batching if enabled
                OPTIMIZED_REQUESTS_TOTAL.labels(
                    operation=request.operation,
                    cache_status="miss"
                ).inc()
                
                queue_start_time = time.time()
                
                if request.batch_enabled:
                    # Use intelligent batching
                    result = await self.cache.get_or_batch_compute(
                        request.operation,
                        request.user_id,
                        request.data,
                        self.model_compute_func,
                        batch_timeout_ms=50
                    )
                else:
                    # Process immediately
                    batch_result = await self.model_compute_func([{
                        "operation": request.operation,
                        "user_id": request.user_id,
                        "data": request.data
                    }])
                    result = batch_result[0]
                
                queue_time_ms = int((time.time() - queue_start_time) * 1000)
                total_time_ms = int((time.time() - start_time) * 1000)
                
                # Create response
                response = OptimizedAIResponse(
                    request_id=request.request_id,
                    success=not result.get("error"),
                    data=result.get("data", result),
                    insights=result.get("insights", []),
                    recommendations=result.get("recommendations", []),
                    confidence=result.get("confidence", 0.85),
                    total_time_ms=total_time_ms,
                    cache_hit=False,
                    batch_size=result.get("batch_size", 1),
                    backend_used=result.get("backend_used", "unknown"),
                    endpoint_id=result.get("endpoint_id", ""),
                    queue_time_ms=queue_time_ms,
                    processing_time_ms=result.get("processing_time_ms", 0),
                    error=result.get("error")
                )
                
                self.performance_monitor.record_request(request, response)
                return response
        
        finally:
            CONCURRENT_REQUESTS.dec()
            self.active_requests -= 1
    
    async def start_services(self):
        """Start all background services"""
        try:
            # Start cache warming
            await self.cache_warmer.start_warmup_scheduler()
            logger.info("Cache warming started")
            
            # Start load balancer health checks
            await self.load_balancer.start_health_checks()
            logger.info("Load balancer health checks started")
            
            logger.info("Optimized AI Engine services started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start AI Engine services: {e}")
            raise
    
    async def stop_services(self):
        """Stop all background services"""
        try:
            # Stop cache warming
            await self.cache_warmer.stop_warmup_scheduler()
            logger.info("Cache warming stopped")
            
            # Stop load balancer health checks
            await self.load_balancer.stop_health_checks()
            logger.info("Load balancer health checks stopped")
            
            logger.info("Optimized AI Engine services stopped successfully")
            
        except Exception as e:
            logger.error(f"Error stopping AI Engine services: {e}")
    
    async def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive system status including all optimizations"""
        
        # Get individual component statuses
        cache_stats = await self.cache.get_cache_stats()
        batch_stats = await self.batcher.get_batch_stats()
        load_balancer_stats = self.load_balancer.get_load_balancer_stats()
        performance_summary = self.performance_monitor.get_performance_summary()
        
        # Calculate uptime
        uptime_seconds = (datetime.utcnow() - self.startup_time).total_seconds()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": uptime_seconds,
            "active_requests": self.active_requests,
            "performance_grade": performance_summary.get("performance_grade", "N/A"),
            "optimization_status": {
                "caching_enabled": True,
                "batching_enabled": self.config.performance_config.enable_request_batching,
                "load_balancing_enabled": True,
                "cache_warming_enabled": True
            },
            "performance_summary": performance_summary,
            "cache_stats": cache_stats,
            "batch_stats": batch_stats,
            "load_balancer_stats": load_balancer_stats,
            "configuration": {
                "max_concurrent_requests": self.config.performance_config.max_concurrent_requests,
                "request_timeout_ms": self.config.performance_config.request_timeout_ms,
                "batch_size": self.config.performance_config.batch_size,
                "batch_timeout_ms": self.config.performance_config.batch_timeout_ms
            }
        }


# Factory function for creating optimized engine
async def create_optimized_ai_engine(redis_url: str = "redis://localhost:6379") -> OptimizedAIEngine:
    """Create optimized AI Engine with all performance enhancements"""
    
    redis_client = redis.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,  # Connection pool optimization
        retry_on_timeout=True
    )
    
    # Test Redis connection
    await redis_client.ping()
    
    # Create optimized engine
    engine = OptimizedAIEngine(redis_client)
    
    # Start background services
    await engine.start_services()
    
    return engine


@asynccontextmanager
async def optimized_ai_engine_context(redis_url: str = "redis://localhost:6379"):
    """Context manager for optimized AI Engine lifecycle"""
    engine = None
    try:
        engine = await create_optimized_ai_engine(redis_url)
        yield engine
    finally:
        if engine:
            await engine.stop_services()
            await engine.redis.close()