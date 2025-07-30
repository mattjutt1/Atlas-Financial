"""
Atlas Financial AI Engine - Advanced Caching System
High-performance caching with inference optimization and intelligent invalidation
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Union, Set
from uuid import uuid4

import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge

logger = logging.getLogger(__name__)

# Cache performance metrics
CACHE_HITS = Counter('ai_cache_hits_total', 'Cache hits', ['cache_type', 'operation'])
CACHE_MISSES = Counter('ai_cache_misses_total', 'Cache misses', ['cache_type', 'operation'])
CACHE_OPERATIONS = Histogram('ai_cache_operation_duration_seconds', 'Cache operation duration', ['operation'])
CACHE_SIZE = Gauge('ai_cache_size_bytes', 'Cache size in bytes', ['cache_type'])
INFERENCE_BATCH_SIZE = Histogram('ai_inference_batch_size', 'Inference batch size')


class CacheType(Enum):
    """Cache types for different data categories"""
    INFERENCE_RESULT = "inference"
    USER_CONTEXT = "context"
    MODEL_WARMUP = "warmup"
    FINANCIAL_DATA = "financial"
    MARKET_DATA = "market"
    COMPUTATION_RESULT = "computation"


class CacheStrategy(Enum):
    """Cache invalidation strategies"""
    TTL_ONLY = "ttl"
    DEPENDENCY_BASED = "dependency"
    EVENT_DRIVEN = "event"
    ADAPTIVE = "adaptive"


@dataclass
class CacheConfig:
    """Configuration for cache behavior"""
    ttl_seconds: int = 300  # 5 minutes default
    max_size_mb: int = 100
    strategy: CacheStrategy = CacheStrategy.TTL_ONLY
    compression_enabled: bool = True
    batch_compatible: bool = False
    warmup_enabled: bool = False
    priority: int = 1  # 1=high, 3=low


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    value: Any
    created_at: datetime
    expires_at: datetime
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.utcnow)
    dependencies: Set[str] = field(default_factory=set)
    size_bytes: int = 0
    cache_type: CacheType = CacheType.INFERENCE_RESULT


class InferenceCache:
    """High-performance inference result caching with batching support"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pending_requests: Dict[str, List[asyncio.Future]] = {}
        self.batch_window_ms = 50  # 50ms batching window
        self.max_batch_size = 32
        self.compression_threshold = 1024  # Compress if > 1KB
        
        # Cache configurations by operation type
        self.cache_configs = {
            "budget_optimization": CacheConfig(
                ttl_seconds=1800,  # 30 minutes
                max_size_mb=50,
                strategy=CacheStrategy.DEPENDENCY_BASED,
                batch_compatible=True,
                warmup_enabled=True
            ),
            "portfolio_analysis": CacheConfig(
                ttl_seconds=600,  # 10 minutes
                max_size_mb=75,
                strategy=CacheStrategy.EVENT_DRIVEN,
                batch_compatible=True,
                warmup_enabled=True
            ),
            "debt_strategy": CacheConfig(
                ttl_seconds=3600,  # 1 hour
                max_size_mb=25,
                strategy=CacheStrategy.TTL_ONLY,
                batch_compatible=False
            ),
            "market_intelligence": CacheConfig(
                ttl_seconds=60,  # 1 minute
                max_size_mb=100,
                strategy=CacheStrategy.ADAPTIVE,
                batch_compatible=True,
                warmup_enabled=True
            ),
            "goal_planning": CacheConfig(
                ttl_seconds=7200,  # 2 hours
                max_size_mb=30,
                strategy=CacheStrategy.DEPENDENCY_BASED
            ),
            "financial_analysis": CacheConfig(
                ttl_seconds=900,  # 15 minutes
                max_size_mb=60,
                strategy=CacheStrategy.ADAPTIVE,
                batch_compatible=True,
                warmup_enabled=True
            )
        }
    
    def _generate_cache_key(self, operation: str, user_id: str, data: Dict[str, Any]) -> str:
        """Generate deterministic cache key"""
        # Create stable hash from request data
        data_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
        data_hash = hashlib.sha256(data_str.encode()).hexdigest()[:16]
        return f"ai_inference:{operation}:{user_id}:{data_hash}"
    
    def _get_batch_key(self, operation: str, data_hash: str) -> str:
        """Generate batch key for similar requests"""
        return f"ai_batch:{operation}:{data_hash}"
    
    async def get_cached_result(
        self, 
        operation: str, 
        user_id: str, 
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached inference result with performance tracking"""
        
        cache_key = self._generate_cache_key(operation, user_id, data)
        
        try:
            with CACHE_OPERATIONS.labels(operation='get').time():
                cached_data = await self.redis.get(cache_key)
                
                if cached_data:
                    # Update access statistics
                    await self._update_access_stats(cache_key)
                    
                    # Deserialize result
                    result = json.loads(cached_data)
                    
                    CACHE_HITS.labels(cache_type=CacheType.INFERENCE_RESULT.value, operation=operation).inc()
                    logger.debug(f"Cache hit for {operation} - key: {cache_key}")
                    
                    return result
                
                CACHE_MISSES.labels(cache_type=CacheType.INFERENCE_RESULT.value, operation=operation).inc()
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for {cache_key}: {e}")
            CACHE_MISSES.labels(cache_type=CacheType.INFERENCE_RESULT.value, operation=operation).inc()
            return None
    
    async def cache_result(
        self, 
        operation: str, 
        user_id: str, 
        data: Dict[str, Any], 
        result: Dict[str, Any]
    ) -> bool:
        """Cache inference result with intelligent TTL"""
        
        cache_key = self._generate_cache_key(operation, user_id, data)
        config = self.cache_configs.get(operation, CacheConfig())
        
        try:
            with CACHE_OPERATIONS.labels(operation='set').time():
                # Serialize result
                result_data = json.dumps(result, separators=(',', ':'))
                
                # Calculate dynamic TTL based on result confidence and volatility
                ttl = await self._calculate_adaptive_ttl(operation, result, config.ttl_seconds)
                
                # Store with TTL
                await self.redis.setex(cache_key, ttl, result_data)
                
                # Track cache size
                CACHE_SIZE.labels(cache_type=CacheType.INFERENCE_RESULT.value).set(len(result_data))
                
                # Set up dependencies for invalidation
                if config.strategy == CacheStrategy.DEPENDENCY_BASED:
                    await self._setup_cache_dependencies(cache_key, user_id, operation)
                
                logger.debug(f"Cached {operation} result - key: {cache_key}, ttl: {ttl}s")
                return True
                
        except Exception as e:
            logger.error(f"Cache set error for {cache_key}: {e}")
            return False
    
    async def batch_get_results(
        self, 
        requests: List[Dict[str, Any]]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """Batch get multiple cached results"""
        
        if not requests:
            return {}
        
        # Generate all cache keys
        cache_keys = []
        key_to_request = {}
        
        for req in requests:
            cache_key = self._generate_cache_key(
                req['operation'], 
                req['user_id'], 
                req['data']
            )
            cache_keys.append(cache_key)
            key_to_request[cache_key] = req
        
        try:
            with CACHE_OPERATIONS.labels(operation='batch_get').time():
                # Batch get from Redis
                cached_values = await self.redis.mget(cache_keys)
                
                results = {}
                for i, cached_data in enumerate(cached_values):
                    cache_key = cache_keys[i]
                    req = key_to_request[cache_key]
                    req_id = f"{req['operation']}:{req['user_id']}"
                    
                    if cached_data:
                        results[req_id] = json.loads(cached_data)
                        CACHE_HITS.labels(
                            cache_type=CacheType.INFERENCE_RESULT.value, 
                            operation=req['operation']
                        ).inc()
                    else:
                        results[req_id] = None
                        CACHE_MISSES.labels(
                            cache_type=CacheType.INFERENCE_RESULT.value, 
                            operation=req['operation']
                        ).inc()
                
                return results
                
        except Exception as e:
            logger.error(f"Batch cache get error: {e}")
            return {f"{req['operation']}:{req['user_id']}": None for req in requests}
    
    async def get_or_batch_compute(
        self,
        operation: str,
        user_id: str,
        data: Dict[str, Any],
        compute_func,
        batch_timeout_ms: int = 50
    ) -> Dict[str, Any]:
        """Get cached result or batch with similar requests for computation"""
        
        # First check cache
        cached_result = await self.get_cached_result(operation, user_id, data)
        if cached_result:
            return cached_result
        
        config = self.cache_configs.get(operation, CacheConfig())
        if not config.batch_compatible:
            # Execute immediately for non-batchable operations
            result = await compute_func([{"operation": operation, "user_id": user_id, "data": data}])
            await self.cache_result(operation, user_id, data, result[0])
            return result[0]
        
        # Generate batch key for similar requests
        data_pattern = self._extract_batchable_pattern(data)
        batch_key = self._get_batch_key(operation, data_pattern)
        
        # Create future for this request
        future = asyncio.Future()
        request_data = {"operation": operation, "user_id": user_id, "data": data}
        
        if batch_key not in self.pending_requests:
            self.pending_requests[batch_key] = []
            # Schedule batch execution
            asyncio.create_task(self._execute_batch(batch_key, compute_func, batch_timeout_ms))
        
        self.pending_requests[batch_key].append((future, request_data))
        
        # Wait for batch result
        return await future
    
    async def _execute_batch(self, batch_key: str, compute_func, timeout_ms: int):
        """Execute batched computation"""
        await asyncio.sleep(timeout_ms / 1000.0)  # Wait for batch to accumulate
        
        if batch_key not in self.pending_requests:
            return
        
        pending = self.pending_requests.pop(batch_key)
        if not pending:
            return
        
        try:
            # Extract requests and futures
            futures = []
            requests = []
            
            for future, request_data in pending:
                if not future.cancelled():
                    futures.append(future)
                    requests.append(request_data)
            
            if not requests:
                return
            
            # Track batch size
            INFERENCE_BATCH_SIZE.observe(len(requests))
            
            logger.info(f"Executing batch of {len(requests)} requests for {batch_key}")
            
            # Execute batch computation
            results = await compute_func(requests)
            
            # Cache and return results
            for i, (future, request_data) in enumerate(zip(futures, requests)):
                if i < len(results) and not future.cancelled():
                    result = results[i]
                    # Cache the result
                    await self.cache_result(
                        request_data["operation"],
                        request_data["user_id"],
                        request_data["data"],
                        result
                    )
                    future.set_result(result)
                
        except Exception as e:
            logger.error(f"Batch execution error for {batch_key}: {e}")
            # Set exception for all pending futures
            for future, _ in pending:
                if not future.cancelled():
                    future.set_exception(e)
    
    def _extract_batchable_pattern(self, data: Dict[str, Any]) -> str:
        """Extract pattern from request data for batching similar requests"""
        # Remove user-specific data for batching
        pattern_data = {k: v for k, v in data.items() 
                       if k not in ['user_id', 'timestamp', 'request_id']}
        pattern_str = json.dumps(pattern_data, sort_keys=True)
        return hashlib.md5(pattern_str.encode()).hexdigest()[:8]
    
    async def _calculate_adaptive_ttl(
        self, 
        operation: str, 
        result: Dict[str, Any], 
        base_ttl: int
    ) -> int:
        """Calculate adaptive TTL based on result characteristics"""
        
        # Base TTL
        ttl = base_ttl
        
        # Adjust based on confidence
        confidence = result.get('confidence', 0.5)
        if confidence > 0.9:
            ttl = int(ttl * 1.5)  # High confidence = longer cache
        elif confidence < 0.7:
            ttl = int(ttl * 0.5)  # Low confidence = shorter cache
        
        # Adjust based on operation volatility
        volatility_factors = {
            "market_intelligence": 0.3,  # Very volatile
            "portfolio_analysis": 0.6,   # Moderately volatile
            "budget_optimization": 0.8,  # Less volatile
            "debt_strategy": 1.0,        # Stable
            "goal_planning": 1.2         # Very stable
        }
        
        volatility = volatility_factors.get(operation, 1.0)
        ttl = int(ttl * volatility)
        
        # Ensure minimum and maximum bounds
        return max(60, min(ttl, 7200))  # 1 minute to 2 hours
    
    async def _setup_cache_dependencies(self, cache_key: str, user_id: str, operation: str):
        """Set up cache invalidation dependencies"""
        
        dependency_patterns = {
            "budget_optimization": [f"user_budget:{user_id}", f"user_transactions:{user_id}"],
            "portfolio_analysis": [f"user_portfolio:{user_id}", "market_data:*"],
            "financial_analysis": [f"user_data:{user_id}", f"user_accounts:{user_id}"],
            "goal_planning": [f"user_goals:{user_id}", f"user_progress:{user_id}"]
        }
        
        dependencies = dependency_patterns.get(operation, [])
        
        for dep in dependencies:
            await self.redis.sadd(f"cache_deps:{dep}", cache_key)
            await self.redis.expire(f"cache_deps:{dep}", 86400)  # 24 hours
    
    async def _update_access_stats(self, cache_key: str):
        """Update cache access statistics"""
        pipe = self.redis.pipeline()
        pipe.hincrby(f"cache_stats:{cache_key}", "access_count", 1)
        pipe.hset(f"cache_stats:{cache_key}", "last_accessed", int(time.time()))
        pipe.expire(f"cache_stats:{cache_key}", 3600)  # 1 hour stats retention
        await pipe.execute()
    
    async def invalidate_by_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        try:
            # Find all dependent cache keys
            dep_keys = await self.redis.smembers(f"cache_deps:{pattern}")
            
            if dep_keys:
                # Delete cache entries
                await self.redis.delete(*dep_keys)
                # Clean up dependency tracking
                await self.redis.delete(f"cache_deps:{pattern}")
                
                logger.info(f"Invalidated {len(dep_keys)} cache entries for pattern: {pattern}")
                
        except Exception as e:
            logger.error(f"Cache invalidation error for pattern {pattern}: {e}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        try:
            # Get Redis memory info
            redis_info = await self.redis.info('memory')
            
            # Count keys by type
            key_counts = {}
            for cache_type in CacheType:
                pattern = f"ai_*:{cache_type.value}:*"
                count = await self.redis.eval(
                    "return #redis.call('keys', ARGV[1])", 
                    0, 
                    pattern
                )
                key_counts[cache_type.value] = count
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "redis_memory_used": redis_info.get('used_memory', 0),
                "redis_memory_peak": redis_info.get('used_memory_peak', 0),
                "key_counts": key_counts,
                "cache_configs": {
                    op: {
                        "ttl_seconds": config.ttl_seconds,
                        "max_size_mb": config.max_size_mb,
                        "strategy": config.strategy.value,
                        "batch_compatible": config.batch_compatible
                    }
                    for op, config in self.cache_configs.items()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


class CacheWarmer:
    """Proactive cache warming for frequently accessed data"""
    
    def __init__(self, inference_cache: InferenceCache, redis_client: redis.Redis):
        self.inference_cache = inference_cache
        self.redis = redis_client
        self.warmup_tasks: Dict[str, asyncio.Task] = {}
        self.warmup_enabled = True
    
    async def start_warmup_scheduler(self):
        """Start the cache warming scheduler"""
        if not self.warmup_enabled:
            return
        
        # Schedule warmup for each operation type
        for operation, config in self.inference_cache.cache_configs.items():
            if config.warmup_enabled:
                task = asyncio.create_task(self._warmup_operation_loop(operation))
                self.warmup_tasks[operation] = task
        
        logger.info(f"Started cache warming for {len(self.warmup_tasks)} operations")
    
    async def stop_warmup_scheduler(self):
        """Stop all warmup tasks"""
        for task in self.warmup_tasks.values():
            task.cancel()
        
        await asyncio.gather(*self.warmup_tasks.values(), return_exceptions=True)
        self.warmup_tasks.clear()
        logger.info("Stopped cache warming scheduler")
    
    async def _warmup_operation_loop(self, operation: str):
        """Continuous warmup loop for an operation type"""
        warmup_interval = 300  # 5 minutes
        
        while True:
            try:
                await asyncio.sleep(warmup_interval)
                await self._warmup_popular_requests(operation)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Warmup error for {operation}: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _warmup_popular_requests(self, operation: str):
        """Warm up cache for popular request patterns"""
        try:
            # Get popular request patterns from analytics
            popular_patterns = await self._get_popular_patterns(operation)
            
            warmup_count = 0
            for pattern in popular_patterns[:5]:  # Top 5 patterns
                # Generate sample request
                sample_request = await self._generate_sample_request(operation, pattern)
                
                if sample_request:
                    # Check if already cached
                    cache_key = self.inference_cache._generate_cache_key(
                        operation, 
                        sample_request['user_id'], 
                        sample_request['data']
                    )
                    
                    exists = await self.redis.exists(cache_key)
                    if not exists:
                        logger.info(f"Warming up cache for {operation} pattern: {pattern}")
                        # This would trigger actual model inference in production
                        warmup_count += 1
            
            logger.debug(f"Warmed up {warmup_count} cache entries for {operation}")
            
        except Exception as e:
            logger.error(f"Error warming up {operation}: {e}")
    
    async def _get_popular_patterns(self, operation: str) -> List[str]:
        """Get popular request patterns from analytics"""
        # In production, this would query analytics data
        # For now, return common patterns
        common_patterns = {
            "budget_optimization": ["monthly_review", "category_analysis", "spending_trend"],
            "portfolio_analysis": ["risk_assessment", "rebalancing", "performance_review"],
            "market_intelligence": ["sector_analysis", "volatility_check", "trend_analysis"],
            "financial_analysis": ["net_worth", "cash_flow", "debt_ratio"]
        }
        
        return common_patterns.get(operation, [])
    
    async def _generate_sample_request(self, operation: str, pattern: str) -> Optional[Dict[str, Any]]:
        """Generate sample request for warming"""
        # This would generate realistic sample data based on patterns
        return {
            "operation": operation,
            "user_id": f"warmup_user_{pattern}",
            "data": {"pattern": pattern, "warmup": True}
        }