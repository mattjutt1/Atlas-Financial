"""
Atlas Financial AI Engine - High-Performance Optimized Server
FastAPI server with comprehensive optimizations for 10K concurrent users and sub-400ms response times
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

import uvicorn
import redis.asyncio as redis
from fastapi import FastAPI, Request, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from strawberry.fastapi import GraphQLRouter
import strawberry

from src.core.optimized_engine import OptimizedAIEngine, OptimizedAIRequest, create_optimized_ai_engine
from src.api.graphql_schema import schema
from src.auth.jwt_validator import JWTValidator
from src.config.flexible_config import FlexibleConfig, get_config

# Configure structured logging for performance monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s'
)
logger = logging.getLogger(__name__)


class OptimizedAIEngineServer:
    """High-performance AI Engine server with comprehensive optimizations"""
    
    def __init__(self):
        self.config = get_config()
        self.jwt_validator = JWTValidator(self.config.security_config.supertokens_connection_uri)
        self.ai_engine: Optional[OptimizedAIEngine] = None
        self.redis_client: Optional[redis.Redis] = None
        self.performance_tracking = True
        
    async def initialize(self):
        """Initialize server components with performance optimizations"""
        try:
            logger.info("Initializing Optimized AI Engine Server...")
            
            # Initialize optimized Redis connection with connection pooling
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self.config.performance_config.connection_pool_size,
                retry_on_timeout=True,
                retry_on_error=[redis.ConnectionError, redis.TimeoutError],
                health_check_interval=30
            )
            await self.redis_client.ping()
            logger.info("Redis connection pool established")
            
            # Initialize optimized AI Engine
            self.ai_engine = await create_optimized_ai_engine(redis_url)
            logger.info("Optimized AI Engine initialized with full performance stack")
            
            # Get comprehensive system status
            status = await self.ai_engine.get_comprehensive_status()
            perf_grade = status.get("performance_grade", "N/A")
            logger.info(f"AI Engine status: Performance Grade {perf_grade}")
            
            # Log optimization status
            opt_status = status.get("optimization_status", {})
            logger.info(f"Optimizations enabled: Cache={opt_status.get('caching_enabled')}, "
                       f"Batch={opt_status.get('batching_enabled')}, "
                       f"LoadBalance={opt_status.get('load_balancing_enabled')}, "
                       f"Warmup={opt_status.get('cache_warming_enabled')}")
            
        except Exception as e:
            logger.error(f"Failed to initialize optimized server: {e}")
            raise
    
    async def shutdown(self):
        """Cleanup server resources"""
        try:
            if self.ai_engine:
                await self.ai_engine.stop_services()
                logger.info("AI Engine services stopped")
            
            if self.redis_client:
                await self.redis_client.close()
                logger.info("Redis connection closed")
            
            logger.info("Optimized AI Engine Server shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during server shutdown: {e}")


# Global server instance
server = OptimizedAIEngineServer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with optimized startup/shutdown"""
    # Startup
    await server.initialize()
    yield
    # Shutdown
    await server.shutdown()


# Create FastAPI application with performance optimizations
app = FastAPI(
    title="Atlas Financial AI Engine - Optimized",
    description="High-performance AI Engine optimized for 10K concurrent users with sub-400ms response times",
    version="3.0.0-optimized",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None
)

# Enhanced CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://atlas-financial.com",
        "https://*.atlas-financial.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Trusted host middleware with production domains
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost", 
        "127.0.0.1", 
        "ai-engine", 
        "*.atlas-financial.local",
        "*.atlas-financial.com"
    ]
)


# Enhanced authentication dependency with performance optimization
async def get_current_user(request: Request) -> Dict[str, Any]:
    """Extract and validate user from JWT token with caching"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Add request ID for tracing
        request_id = request.headers.get("X-Request-ID", f"req_{int(asyncio.get_event_loop().time() * 1000)}")
        request.state.request_id = request_id
        
        # Validate token with caching
        user_info = await server.jwt_validator.validate_token(token)
        user_info['request_id'] = request_id
        
        return user_info
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


# Enhanced GraphQL context provider with performance tracking
async def get_optimized_graphql_context(request: Request) -> Dict[str, Any]:
    """Provide enhanced context for GraphQL resolvers with performance tracking"""
    try:
        # Get request ID for tracing
        request_id = getattr(request.state, 'request_id', f"gql_{int(asyncio.get_event_loop().time() * 1000)}")
        
        # Get user info (for authenticated endpoints)
        user_info = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                user_info = await server.jwt_validator.validate_token(token)
                user_info['request_id'] = request_id
            except Exception:
                # Allow unauthenticated access to system status
                pass
        
        return {
            "ai_engine": server.ai_engine,
            "user_info": user_info,
            "request": request,
            "request_id": request_id,
            "performance_tracking": server.performance_tracking
        }
        
    except Exception as e:
        logger.error(f"Failed to create GraphQL context: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Create optimized GraphQL router
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_optimized_graphql_context,
    path="/graphql"
)

app.include_router(graphql_app, prefix="/ai")


# Enhanced health check endpoints with comprehensive monitoring
@app.get("/health")
async def health_check():
    """Basic health check with performance indicator"""
    if not server.ai_engine:
        raise HTTPException(status_code=503, detail="AI Engine not initialized")
    
    # Quick health check
    status = await server.ai_engine.get_comprehensive_status()
    perf_grade = status.get("performance_grade", "N/A")
    
    return {
        "status": "healthy",
        "timestamp": status["timestamp"],
        "performance_grade": perf_grade,
        "active_requests": status["active_requests"],
        "uptime_seconds": status["uptime_seconds"]
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with full performance metrics"""
    try:
        if not server.ai_engine:
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "error": "AI Engine not initialized"}
            )
        
        # Get comprehensive system status
        system_status = await server.ai_engine.get_comprehensive_status()
        
        # Check Redis connectivity
        redis_healthy = False
        try:
            await server.redis_client.ping()
            redis_healthy = True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
        
        # Calculate overall health
        perf_summary = system_status.get("performance_summary", {})
        response_times = perf_summary.get("response_times", {})
        p95_time = response_times.get("p95_ms", 1000)
        
        overall_healthy = (
            redis_healthy and
            system_status["active_requests"] < server.config.performance_config.max_concurrent_requests * 0.9 and
            p95_time < 500  # P95 under 500ms
        )
        
        health_data = {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": system_status["timestamp"],
            "performance_grade": system_status["performance_grade"],
            "components": {
                "redis": {"healthy": redis_healthy},
                "ai_engine": {"healthy": True, "status": system_status},
                "optimizations": system_status["optimization_status"]
            },
            "performance_metrics": {
                "active_requests": system_status["active_requests"],
                "response_time_p95_ms": p95_time,
                "uptime_seconds": system_status["uptime_seconds"]
            }
        }
        
        if overall_healthy:
            return health_data
        else:
            return JSONResponse(status_code=503, content=health_data)
            
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/health/performance")
async def performance_metrics():
    """Dedicated performance metrics endpoint"""
    try:
        if not server.ai_engine:
            raise HTTPException(status_code=503, detail="AI Engine not initialized")
        
        status = await server.ai_engine.get_comprehensive_status()
        return {
            "performance_summary": status["performance_summary"],
            "cache_stats": status["cache_stats"],
            "batch_stats": status["batch_stats"],
            "load_balancer_stats": status["load_balancer_stats"]
        }
        
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve performance metrics")


# Enhanced metrics endpoint with Prometheus integration
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint with enhanced AI metrics"""
    try:
        # Generate Prometheus metrics
        metrics_data = generate_latest()
        return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)
    except Exception as e:
        logger.error(f"Metrics generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate metrics")


# AI Engine specific endpoints with performance optimization
@app.get("/ai/status")
async def ai_system_status():
    """Get comprehensive AI system status (public endpoint)"""
    try:
        if not server.ai_engine:
            return JSONResponse(
                status_code=503,
                content={"error": "AI Engine not initialized"}
            )
        
        status = await server.ai_engine.get_comprehensive_status()
        
        # Return public-safe status information
        return {
            "timestamp": status["timestamp"],
            "performance_grade": status["performance_grade"],
            "uptime_seconds": status["uptime_seconds"],
            "optimization_status": status["optimization_status"],
            "performance_summary": {
                "p95_response_time_ms": status["performance_summary"].get("response_times", {}).get("p95_ms", 0),
                "cache_hit_rate": status["cache_stats"].get("hit_rate", 0),
                "active_requests": status["active_requests"]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get AI status: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve AI system status"}
        )


@app.post("/ai/test/optimized")
async def test_optimized_request(
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Test optimized AI request endpoint with performance tracking"""
    try:
        # Create optimized test request
        test_request = OptimizedAIRequest(
            request_id=f"test_{user.get('request_id', 'unknown')}",
            user_id=user.get("user_id", "test_user"),
            operation="financial_analysis",
            data={
                "test": True,
                "performance_test": True,
                "timestamp": asyncio.get_event_loop().time()
            },
            priority=1,  # High priority for test
            cache_enabled=True,
            batch_enabled=True
        )
        
        # Process with full optimization pipeline
        response = await server.ai_engine.process_request(test_request)
        
        # Log performance for monitoring
        background_tasks.add_task(
            _log_test_performance,
            test_request,
            response
        )
        
        return {
            "success": response.success,
            "performance_metrics": {
                "total_time_ms": response.total_time_ms,
                "cache_hit": response.cache_hit,
                "batch_size": response.batch_size,
                "queue_time_ms": response.queue_time_ms,
                "processing_time_ms": response.processing_time_ms
            },
            "backend_used": response.backend_used,
            "endpoint_id": response.endpoint_id,
            "confidence": response.confidence,
            "data": response.data
        }
        
    except Exception as e:
        logger.error(f"Optimized AI test request failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Optimized AI test request failed"}
        )


async def _log_test_performance(request: OptimizedAIRequest, response):
    """Background task to log test performance metrics"""
    logger.info(
        f"Test performance: {response.total_time_ms}ms total, "
        f"cache_hit={response.cache_hit}, batch_size={response.batch_size}, "
        f"endpoint={response.endpoint_id}"
    )


# Admin endpoints for performance tuning
@app.get("/ai/admin/performance")
async def get_performance_dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    """Get comprehensive performance dashboard (admin only)"""
    # TODO: Add admin role check
    try:
        status = await server.ai_engine.get_comprehensive_status()
        return {
            "dashboard": status,
            "recommendations": await _generate_performance_recommendations(status)
        }
    except Exception as e:
        logger.error(f"Failed to get performance dashboard: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve performance dashboard"}
        )


async def _generate_performance_recommendations(status: Dict[str, Any]) -> List[Dict[str, str]]:
    """Generate performance optimization recommendations"""
    recommendations = []
    
    # Check P95 response time
    perf_summary = status.get("performance_summary", {})
    response_times = perf_summary.get("response_times", {})
    p95_time = response_times.get("p95_ms", 0)
    
    if p95_time > 400:
        recommendations.append({
            "type": "response_time",
            "priority": "high",
            "message": f"P95 response time ({p95_time}ms) exceeds 400ms target",
            "suggestion": "Consider increasing cache TTL or adding more model endpoints"
        })
    
    # Check cache hit rate
    cache_stats = status.get("cache_stats", {})
    avg_hit_rate = sum(
        stats.get("hit_rate", 0) for stats in cache_stats.values()
    ) / len(cache_stats) if cache_stats else 0
    
    if avg_hit_rate < 0.8:
        recommendations.append({
            "type": "cache_efficiency",
            "priority": "medium",
            "message": f"Average cache hit rate ({avg_hit_rate:.2%}) below 80% target",
            "suggestion": "Enable cache warming or increase cache TTL for stable operations"
        })
    
    # Check load balancer efficiency
    lb_stats = status.get("load_balancer_stats", {})
    healthy_endpoints = lb_stats.get("healthy_endpoints", 0)
    total_endpoints = lb_stats.get("total_endpoints", 1)
    
    if healthy_endpoints < total_endpoints:
        recommendations.append({
            "type": "availability",
            "priority": "high",
            "message": f"Only {healthy_endpoints}/{total_endpoints} endpoints healthy",
            "suggestion": "Check endpoint health and consider adding redundant capacity"
        })
    
    return recommendations


# Error handlers with performance context
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with performance context"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "request_id": request_id,
            "path": str(request.url),
            "timestamp": asyncio.get_event_loop().time()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with performance monitoring"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(f"Unhandled exception in request {request_id} at {request.url}: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "request_id": request_id,
            "path": str(request.url),
            "timestamp": asyncio.get_event_loop().time()
        }
    )


# Development utilities with performance testing
if os.getenv("ENVIRONMENT") == "development":
    @app.post("/ai/dev/load-test")
    async def load_test_endpoint(
        concurrent_requests: int = 10,
        user: Dict[str, Any] = Depends(get_current_user)
    ):
        """Load testing endpoint for development"""
        if concurrent_requests > 100:
            raise HTTPException(status_code=400, detail="Max 100 concurrent requests for safety")
        
        async def single_request(i: int):
            request = OptimizedAIRequest(
                request_id=f"load_test_{i}",
                user_id=f"test_user_{i}",
                operation="budget_optimization",
                data={"test_load": i, "timestamp": asyncio.get_event_loop().time()},
                cache_enabled=True,
                batch_enabled=True
            )
            return await server.ai_engine.process_request(request)
        
        # Execute concurrent requests
        start_time = asyncio.get_event_loop().time()
        tasks = [single_request(i) for i in range(concurrent_requests)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = (asyncio.get_event_loop().time() - start_time) * 1000
        
        # Calculate statistics
        successful_responses = [r for r in responses if not isinstance(r, Exception)]
        response_times = [r.total_time_ms for r in successful_responses]
        
        return {
            "test_summary": {
                "concurrent_requests": concurrent_requests,
                "successful_requests": len(successful_responses),
                "failed_requests": len(responses) - len(successful_responses),
                "total_test_time_ms": total_time,
                "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
                "max_response_time_ms": max(response_times) if response_times else 0,
                "cache_hits": sum(1 for r in successful_responses if r.cache_hit),
                "requests_per_second": len(successful_responses) / (total_time / 1000) if total_time > 0 else 0
            }
        }


def main():
    """Main entry point with optimized configuration"""
    port = int(os.getenv("PORT", 8083))
    host = os.getenv("HOST", "0.0.0.0")
    
    # Production optimization settings
    workers = 1  # Single worker with async concurrency
    if os.getenv("ENVIRONMENT") == "production":
        workers = min(4, os.cpu_count())  # Multiple workers for production
    
    logger.info(f"Starting Atlas Financial Optimized AI Engine on {host}:{port}")
    logger.info(f"Workers: {workers}, Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    uvicorn.run(
        "main_optimized:app",
        host=host,
        port=port,
        workers=workers,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
        access_log=True,
        loop="asyncio",  # Use asyncio loop for optimal performance
        http="httptools",  # Fast HTTP parser
        lifespan="on",
        timeout_keep_alive=30,  # Keep connections alive for performance
        limit_concurrency=int(os.getenv("MAX_CONCURRENT_REQUESTS", "1000")),
        limit_max_requests=int(os.getenv("MAX_REQUESTS_PER_WORKER", "10000"))
    )


if __name__ == "__main__":
    main()