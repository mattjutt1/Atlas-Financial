"""
Atlas Financial AI Engine - Flexible Multi-Agent Architecture
FastAPI server with GraphQL endpoint supporting both monolithic and multi-agent backends
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any

import uvicorn
import redis.asyncio as redis
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from strawberry.fastapi import GraphQLRouter
import strawberry

from src.core.engine import create_ai_engine, AIEngineOrchestrator
from src.api.graphql_schema import schema
from src.auth.jwt_validator import JWTValidator
from src.config import Config


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AIEngineServer:
    """AI Engine server with flexible backend support"""
    
    def __init__(self):
        self.config = Config()
        self.jwt_validator = JWTValidator(self.config.SUPERTOKENS_CONNECTION_URI)
        self.ai_engine: Optional[AIEngineOrchestrator] = None
        self.redis_client: Optional[redis.Redis] = None
        
    async def initialize(self):
        """Initialize server components"""
        try:
            # Initialize Redis connection
            self.redis_client = redis.from_url(
                self.config.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Redis connection established")
            
            # Initialize AI Engine
            self.ai_engine = create_ai_engine(self.config.REDIS_URL)
            logger.info("AI Engine orchestrator initialized")
            
            # Test backend connectivity
            status = await self.ai_engine.get_system_status()
            logger.info(f"AI Engine status: {status}")
            
        except Exception as e:
            logger.error(f"Failed to initialize server: {e}")
            raise
    
    async def shutdown(self):
        """Cleanup server resources"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")


# Global server instance
server = AIEngineServer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    await server.initialize()
    yield
    # Shutdown
    await server.shutdown()


# Create FastAPI application
app = FastAPI(
    title="Atlas Financial AI Engine",
    description="Flexible AI Engine supporting both monolithic and multi-agent approaches",
    version="2.0.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "ai-engine", "*.atlas-financial.local"]
)


# Authentication dependency
async def get_current_user(request: Request) -> Dict[str, Any]:
    """Extract and validate user from JWT token"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        user_info = await server.jwt_validator.validate_token(token)
        
        return user_info
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")


# GraphQL context provider
async def get_graphql_context(request: Request) -> Dict[str, Any]:
    """Provide context for GraphQL resolvers"""
    try:
        # Get user info (for authenticated endpoints)
        user_info = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                user_info = await server.jwt_validator.validate_token(token)
            except Exception:
                # Allow unauthenticated access to system status
                pass
        
        return {
            "ai_engine": server.ai_engine,
            "user_info": user_info,
            "request": request
        }
    except Exception as e:
        logger.error(f"Failed to create GraphQL context: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Create GraphQL router
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_graphql_context,
    path="/graphql"
)

app.include_router(graphql_app, prefix="/ai")


# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "timestamp": "2025-01-29T00:00:00Z"}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including AI backends"""
    try:
        if not server.ai_engine:
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "error": "AI Engine not initialized"}
            )
        
        # Get AI system status
        system_status = await server.ai_engine.get_system_status()
        
        # Check Redis connectivity
        redis_healthy = False
        try:
            await server.redis_client.ping()
            redis_healthy = True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
        
        overall_healthy = (
            redis_healthy and
            any(backend.get("healthy", False) for backend in system_status["backends"].values())
        )
        
        health_data = {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": system_status["timestamp"],
            "components": {
                "redis": {"healthy": redis_healthy},
                "ai_backends": system_status["backends"]
            }
        }
        
        if overall_healthy:
            return health_data
        else:
            return JSONResponse(status_code=503, content=health_data)
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()


# AI Engine specific endpoints
@app.get("/ai/status")
async def ai_system_status():
    """Get AI system status (public endpoint)"""
    try:
        if not server.ai_engine:
            return JSONResponse(
                status_code=503,
                content={"error": "AI Engine not initialized"}
            )
        
        status = await server.ai_engine.get_system_status()
        return status
        
    except Exception as e:
        logger.error(f"Failed to get AI status: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve AI system status"}
        )


@app.post("/ai/test")
async def test_ai_request(user: Dict[str, Any] = Depends(get_current_user)):
    """Test AI request endpoint (authenticated)"""
    try:
        from src.core.engine import AIRequest, OperationType
        
        # Create test request
        test_request = AIRequest(
            user_id=user.get("user_id", "test_user"),
            operation=OperationType.FINANCIAL_ANALYSIS,
            data={"test": True}
        )
        
        # Process request
        response = await server.ai_engine.process_request(test_request)
        
        return {
            "success": response.success,
            "processing_time_ms": response.processing_time_ms,
            "backend_used": response.backend_used,
            "agent_trace": response.agent_trace,
            "data": response.data
        }
        
    except Exception as e:
        logger.error(f"AI test request failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "AI test request failed"}
        )


# Backend configuration endpoints (admin only)
@app.get("/ai/admin/backends")
async def list_backends(user: Dict[str, Any] = Depends(get_current_user)):
    """List available AI backends (admin only)"""
    # TODO: Add admin role check
    try:
        status = await server.ai_engine.get_system_status()
        return {
            "backends": status["backends"],
            "timestamp": status["timestamp"]
        }
    except Exception as e:
        logger.error(f"Failed to list backends: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to retrieve backend information"}
        )


@app.post("/ai/admin/backend/switch")
async def switch_backend(
    backend_type: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Switch AI backend (admin only)"""
    # TODO: Add admin role check and implement backend switching
    return JSONResponse(
        status_code=501,
        content={"error": "Backend switching not yet implemented"}
    )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "path": str(request.url)}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception in request {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "path": str(request.url)}
    )


# Development utilities
if os.getenv("ENVIRONMENT") == "development":
    @app.get("/ai/dev/reset-context")
    async def reset_user_context(
        user_id: str,
        user: Dict[str, Any] = Depends(get_current_user)
    ):
        """Reset user context (development only)"""
        try:
            # Clear user context from Redis
            await server.redis_client.delete(f"ai_context:{user_id}")
            return {"message": f"Context reset for user {user_id}"}
        except Exception as e:
            logger.error(f"Failed to reset context: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to reset user context"}
            )
    
    @app.get("/ai/dev/graphql-playground")
    async def graphql_playground():
        """GraphQL playground (development only)"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Atlas AI Engine GraphQL Playground</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.26/build/static/css/index.css" />
        </head>
        <body>
            <div id="root"></div>
            <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.26/build/static/js/middleware.js"></script>
            <script>
                window.addEventListener('load', function (event) {
                    GraphQLPlayground.init(document.getElementById('root'), {
                        endpoint: '/ai/graphql'
                    })
                })
            </script>
        </body>
        </html>
        """


def main():
    """Main entry point"""
    port = int(os.getenv("PORT", 8083))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting Atlas Financial AI Engine on {host}:{port}")
    
    uvicorn.run(
        "main_flexible:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()