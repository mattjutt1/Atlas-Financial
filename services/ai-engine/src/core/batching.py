"""
Atlas Financial AI Engine - Request Batching and Load Balancing
High-performance request batching with intelligent load balancing for 10K concurrent users
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Callable, Tuple
import heapq
from concurrent.futures import ThreadPoolExecutor

from prometheus_client import Counter, Histogram, Gauge, Summary

logger = logging.getLogger(__name__)

# Batching performance metrics
BATCH_REQUESTS_TOTAL = Counter('ai_batch_requests_total', 'Total batched requests', ['batch_type'])
BATCH_SIZE_HISTOGRAM = Histogram('ai_batch_size', 'Batch size distribution')
BATCH_WAIT_TIME = Histogram('ai_batch_wait_time_seconds', 'Time requests wait in batch')
BATCH_PROCESSING_TIME = Histogram('ai_batch_processing_time_seconds', 'Batch processing time')
ACTIVE_BATCHES = Gauge('ai_active_batches', 'Number of active batches')
QUEUE_SIZE = Gauge('ai_request_queue_size', 'Request queue size', ['priority'])
THROUGHPUT = Summary('ai_requests_per_second', 'Request throughput')


class BatchingStrategy(Enum):
    """Request batching strategies"""
    TIME_BASED = "time_based"  # Batch by time window
    SIZE_BASED = "size_based"  # Batch by request count
    ADAPTIVE = "adaptive"      # Dynamic based on load
    PRIORITY_AWARE = "priority_aware"  # Respect request priorities


class LoadBalancingStrategy(Enum):
    """Load balancing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED_RESPONSE_TIME = "weighted_response_time"
    RESOURCE_BASED = "resource_based"


@dataclass
class BatchConfig:
    """Configuration for request batching"""
    max_batch_size: int = 32
    max_wait_time_ms: int = 50
    min_batch_size: int = 1
    strategy: BatchingStrategy = BatchingStrategy.ADAPTIVE
    priority_weights: Dict[int, float] = field(default_factory=lambda: {1: 1.0, 2: 0.7, 3: 0.5})
    compatibility_check: bool = True


@dataclass
class PendingRequest:
    """Request waiting in batch queue"""
    request_id: str
    operation: str
    user_id: str
    data: Dict[str, Any]
    priority: int
    future: asyncio.Future
    queued_at: datetime
    timeout_ms: int
    batch_key: str


@dataclass
class BackendEndpoint:
    """Backend model endpoint information"""
    endpoint_id: str
    url: str
    max_concurrent: int
    current_load: int = 0
    avg_response_time_ms: float = 0.0
    success_rate: float = 1.0
    last_health_check: datetime = field(default_factory=datetime.utcnow)
    healthy: bool = True
    weight: float = 1.0


class RequestBatcher:
    """High-performance request batcher with intelligent queuing"""
    
    def __init__(self, config: BatchConfig):
        self.config = config
        self.request_queues: Dict[str, List[PendingRequest]] = defaultdict(list)
        self.batch_timers: Dict[str, asyncio.Task] = {}
        self.active_batches: Dict[str, int] = defaultdict(int)
        self.batch_stats = defaultdict(lambda: {'count': 0, 'total_time': 0.0})
        
        # Priority queue for time-sensitive requests
        self.priority_queue: List[Tuple[float, PendingRequest]] = []
        self.queue_lock = asyncio.Lock()
        
        # Adaptive batching parameters
        self.adaptive_params = {
            'base_wait_time': config.max_wait_time_ms,
            'load_factor': 1.0,
            'recent_latencies': deque(maxlen=100)
        }
    
    async def submit_request(
        self,
        operation: str,
        user_id: str,
        data: Dict[str, Any],
        priority: int = 2,
        timeout_ms: int = 5000
    ) -> asyncio.Future:
        """Submit request for batched processing"""
        
        request_id = f"{operation}_{user_id}_{int(time.time() * 1000)}"
        future = asyncio.Future()
        
        # Generate batch key for grouping compatible requests
        batch_key = self._generate_batch_key(operation, data)
        
        pending_request = PendingRequest(
            request_id=request_id,
            operation=operation,
            user_id=user_id,
            data=data,
            priority=priority,
            future=future,
            queued_at=datetime.utcnow(),
            timeout_ms=timeout_ms,
            batch_key=batch_key
        )
        
        QUEUE_SIZE.labels(priority=str(priority)).inc()
        
        async with self.queue_lock:
            if self.config.strategy == BatchingStrategy.PRIORITY_AWARE:
                # Use priority queue for high-priority requests
                priority_score = self._calculate_priority_score(pending_request)
                heapq.heappush(self.priority_queue, (priority_score, pending_request))
            else:
                # Add to batch queue
                self.request_queues[batch_key].append(pending_request)
            
            # Trigger batch processing if needed
            await self._maybe_trigger_batch(batch_key)
        
        return future
    
    def _generate_batch_key(self, operation: str, data: Dict[str, Any]) -> str:
        """Generate key for grouping batchable requests"""
        
        if not self.config.compatibility_check:
            return operation
        
        # Extract batch-compatible features from request data
        batch_features = {}
        
        # Operation-specific batching logic
        if operation == "budget_optimization":
            batch_features = {
                "analysis_type": data.get("analysis_type", "standard"),
                "time_period": data.get("time_period", "monthly")
            }
        elif operation == "portfolio_analysis":
            batch_features = {
                "analysis_depth": data.get("analysis_depth", "standard"),
                "risk_tolerance": data.get("risk_tolerance", "moderate")
            }
        elif operation == "market_intelligence":
            batch_features = {
                "asset_class": data.get("asset_class", "equity"),
                "time_horizon": data.get("time_horizon", "short")
            }
        
        # Create batch key
        if batch_features:
            feature_str = "_".join(f"{k}={v}" for k, v in sorted(batch_features.items()))
            return f"{operation}_{feature_str}"
        
        return operation
    
    def _calculate_priority_score(self, request: PendingRequest) -> float:
        """Calculate priority score for queue ordering (lower = higher priority)"""
        base_priority = request.priority
        age_factor = (datetime.utcnow() - request.queued_at).total_seconds()
        
        # Lower score = higher priority
        score = base_priority - (age_factor * 0.1)  # Age increases priority
        
        return score
    
    async def _maybe_trigger_batch(self, batch_key: str):
        """Check if batch should be triggered"""
        
        queue_size = len(self.request_queues[batch_key])
        
        # Size-based triggering
        if queue_size >= self.config.max_batch_size:
            await self._trigger_batch(batch_key)
            return
        
        # Time-based triggering
        if batch_key not in self.batch_timers and queue_size > 0:
            wait_time = self._calculate_adaptive_wait_time(batch_key)
            self.batch_timers[batch_key] = asyncio.create_task(
                self._batch_timer(batch_key, wait_time)
            )
    
    def _calculate_adaptive_wait_time(self, batch_key: str) -> float:
        """Calculate adaptive wait time based on current load and performance"""
        
        base_wait_time = self.config.max_wait_time_ms / 1000.0
        
        if self.config.strategy != BatchingStrategy.ADAPTIVE:
            return base_wait_time
        
        # Adjust based on queue length
        queue_len = len(self.request_queues[batch_key])
        queue_factor = min(queue_len / self.config.max_batch_size, 1.0)
        
        # Adjust based on recent latencies
        if self.adaptive_params['recent_latencies']:
            avg_latency = sum(self.adaptive_params['recent_latencies']) / len(self.adaptive_params['recent_latencies'])
            latency_factor = max(0.5, min(2.0, avg_latency / 200))  # Target 200ms
        else:
            latency_factor = 1.0
        
        # Adjust based on system load
        load_factor = self.adaptive_params['load_factor']
        
        # Calculate adaptive wait time
        adaptive_wait = base_wait_time * (1 - queue_factor * 0.5) * latency_factor * load_factor
        
        return max(0.01, min(adaptive_wait, base_wait_time * 2))  # 10ms to 2x base
    
    async def _batch_timer(self, batch_key: str, wait_time: float):
        """Timer to trigger batch after wait time"""
        try:
            await asyncio.sleep(wait_time)
            await self._trigger_batch(batch_key)
        except asyncio.CancelledError:
            pass
        finally:
            self.batch_timers.pop(batch_key, None)
    
    async def _trigger_batch(self, batch_key: str):
        """Trigger batch processing for accumulated requests"""
        
        async with self.queue_lock:
            # Get requests from queue
            if self.config.strategy == BatchingStrategy.PRIORITY_AWARE:
                requests = self._extract_priority_requests(batch_key)
            else:
                requests = self.request_queues[batch_key][:self.config.max_batch_size]
                self.request_queues[batch_key] = self.request_queues[batch_key][self.config.max_batch_size:]
            
            if not requests:
                return
            
            # Cancel timer if exists
            if batch_key in self.batch_timers:
                self.batch_timers[batch_key].cancel()
                self.batch_timers.pop(batch_key, None)
        
        # Update metrics
        batch_size = len(requests)
        BATCH_SIZE_HISTOGRAM.observe(batch_size)
        ACTIVE_BATCHES.inc()
        BATCH_REQUESTS_TOTAL.labels(batch_type=batch_key).inc(batch_size)
        
        # Process batch
        asyncio.create_task(self._process_batch(batch_key, requests))
    
    def _extract_priority_requests(self, batch_key: str) -> List[PendingRequest]:
        """Extract requests from priority queue for specific batch key"""
        requests = []
        remaining_queue = []
        
        while self.priority_queue and len(requests) < self.config.max_batch_size:
            priority_score, request = heapq.heappop(self.priority_queue)
            
            if request.batch_key == batch_key:
                requests.append(request)
            else:
                remaining_queue.append((priority_score, request))
        
        # Restore remaining requests to queue
        for item in remaining_queue:
            heapq.heappush(self.priority_queue, item)
        
        return requests
    
    async def _process_batch(self, batch_key: str, requests: List[PendingRequest]):
        """Process batch of requests"""
        start_time = time.time()
        
        try:
            # Calculate wait times
            now = datetime.utcnow()
            for request in requests:
                wait_time = (now - request.queued_at).total_seconds()
                BATCH_WAIT_TIME.observe(wait_time)
                QUEUE_SIZE.labels(priority=str(request.priority)).dec()
            
            with BATCH_PROCESSING_TIME.time():
                # This will be implemented by the caller
                logger.info(f"Processing batch of {len(requests)} requests for {batch_key}")
                
                # Simulate batch processing - in production this calls the actual model
                await asyncio.sleep(0.1)  # Placeholder
                
                # Generate mock results for each request
                for i, request in enumerate(requests):
                    result = {
                        "request_id": request.request_id,
                        "operation": request.operation,
                        "result": f"batch_result_{i}",
                        "batch_size": len(requests),
                        "processing_time_ms": int((time.time() - start_time) * 1000)
                    }
                    
                    if not request.future.cancelled():
                        request.future.set_result(result)
            
            # Update adaptive parameters
            processing_time_ms = (time.time() - start_time) * 1000
            self.adaptive_params['recent_latencies'].append(processing_time_ms)
            
            # Update batch statistics
            self.batch_stats[batch_key]['count'] += len(requests)
            self.batch_stats[batch_key]['total_time'] += processing_time_ms
            
            logger.info(f"Completed batch processing: {len(requests)} requests in {processing_time_ms:.1f}ms")
            
        except Exception as e:
            logger.error(f"Batch processing error for {batch_key}: {e}")
            
            # Set exception for all requests in batch
            for request in requests:
                if not request.future.cancelled():
                    request.future.set_exception(e)
        
        finally:
            ACTIVE_BATCHES.dec()
    
    async def get_batch_stats(self) -> Dict[str, Any]:
        """Get batching performance statistics"""
        queue_sizes = {
            batch_key: len(requests) 
            for batch_key, requests in self.request_queues.items()
        }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "queue_sizes": queue_sizes,
            "active_batches": len(self.batch_timers),
            "priority_queue_size": len(self.priority_queue),
            "batch_stats": dict(self.batch_stats),
            "adaptive_params": {
                "current_wait_time": self.adaptive_params['base_wait_time'],
                "load_factor": self.adaptive_params['load_factor'],
                "avg_recent_latency": (
                    sum(self.adaptive_params['recent_latencies']) / len(self.adaptive_params['recent_latencies'])
                    if self.adaptive_params['recent_latencies'] else 0
                )
            }
        }


class LoadBalancer:
    """Intelligent load balancer for AI model endpoints"""
    
    def __init__(self, strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME):
        self.strategy = strategy
        self.endpoints: Dict[str, BackendEndpoint] = {}
        self.round_robin_index = 0
        self.health_check_interval = 30  # seconds
        self.health_check_task: Optional[asyncio.Task] = None
        
        # Circuit breaker parameters
        self.circuit_breaker_threshold = 5  # failures
        self.circuit_breaker_timeout = 60   # seconds
        self.circuit_breaker_state: Dict[str, Dict] = {}
    
    def register_endpoint(
        self,
        endpoint_id: str,
        url: str,
        max_concurrent: int = 50,
        weight: float = 1.0
    ):
        """Register a new backend endpoint"""
        self.endpoints[endpoint_id] = BackendEndpoint(
            endpoint_id=endpoint_id,
            url=url,
            max_concurrent=max_concurrent,
            weight=weight
        )
        
        # Initialize circuit breaker state
        self.circuit_breaker_state[endpoint_id] = {
            'failures': 0,
            'last_failure': None,
            'state': 'closed'  # closed, open, half_open
        }
        
        logger.info(f"Registered endpoint: {endpoint_id} at {url}")
    
    async def select_endpoint(self, operation: str = None) -> Optional[BackendEndpoint]:
        """Select optimal endpoint based on load balancing strategy"""
        
        available_endpoints = [
            ep for ep in self.endpoints.values()
            if ep.healthy and ep.current_load < ep.max_concurrent
            and self._is_circuit_closed(ep.endpoint_id)
        ]
        
        if not available_endpoints:
            logger.warning("No available endpoints for load balancing")
            return None
        
        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            return self._round_robin_select(available_endpoints)
        
        elif self.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return self._least_connections_select(available_endpoints)
        
        elif self.strategy == LoadBalancingStrategy.WEIGHTED_RESPONSE_TIME:
            return self._weighted_response_time_select(available_endpoints)
        
        elif self.strategy == LoadBalancingStrategy.RESOURCE_BASED:
            return self._resource_based_select(available_endpoints)
        
        return available_endpoints[0]  # Fallback
    
    def _round_robin_select(self, endpoints: List[BackendEndpoint]) -> BackendEndpoint:
        """Round-robin endpoint selection"""
        if not endpoints:
            return None
        
        endpoint = endpoints[self.round_robin_index % len(endpoints)]
        self.round_robin_index += 1
        return endpoint
    
    def _least_connections_select(self, endpoints: List[BackendEndpoint]) -> BackendEndpoint:
        """Select endpoint with least active connections"""
        return min(endpoints, key=lambda ep: ep.current_load)
    
    def _weighted_response_time_select(self, endpoints: List[BackendEndpoint]) -> BackendEndpoint:
        """Select endpoint based on weighted response time and success rate"""
        def score_endpoint(ep: BackendEndpoint) -> float:
            # Lower score is better
            response_time_factor = ep.avg_response_time_ms / 1000.0  # Convert to seconds
            success_rate_factor = 1.0 - ep.success_rate  # Invert so lower is better
            load_factor = ep.current_load / ep.max_concurrent
            
            return (response_time_factor + success_rate_factor + load_factor) / ep.weight
        
        return min(endpoints, key=score_endpoint)
    
    def _resource_based_select(self, endpoints: List[BackendEndpoint]) -> BackendEndpoint:
        """Select endpoint based on resource utilization"""
        def resource_score(ep: BackendEndpoint) -> float:
            load_ratio = ep.current_load / ep.max_concurrent
            response_penalty = min(ep.avg_response_time_ms / 500.0, 2.0)  # Cap at 2x penalty
            
            return (load_ratio + response_penalty) / ep.weight
        
        return min(endpoints, key=resource_score)
    
    def _is_circuit_closed(self, endpoint_id: str) -> bool:
        """Check if circuit breaker is closed (endpoint available)"""
        circuit_state = self.circuit_breaker_state.get(endpoint_id, {})
        state = circuit_state.get('state', 'closed')
        
        if state == 'closed':
            return True
        elif state == 'open':
            # Check if timeout has passed
            last_failure = circuit_state.get('last_failure')
            if last_failure:
                time_since_failure = (datetime.utcnow() - last_failure).total_seconds()
                if time_since_failure > self.circuit_breaker_timeout:
                    # Move to half-open state
                    circuit_state['state'] = 'half_open'
                    return True
            return False
        elif state == 'half_open':
            return True
        
        return False
    
    async def acquire_endpoint(self, endpoint: BackendEndpoint) -> bool:
        """Acquire endpoint for request processing"""
        if endpoint.current_load >= endpoint.max_concurrent:
            return False
        
        endpoint.current_load += 1
        return True
    
    async def release_endpoint(
        self,
        endpoint: BackendEndpoint,
        response_time_ms: float,
        success: bool
    ):
        """Release endpoint and update performance metrics"""
        endpoint.current_load = max(0, endpoint.current_load - 1)
        
        # Update performance metrics
        if success:
            # Update moving average of response time
            alpha = 0.1  # Smoothing factor
            endpoint.avg_response_time_ms = (
                alpha * response_time_ms + 
                (1 - alpha) * endpoint.avg_response_time_ms
            )
            
            # Update success rate
            endpoint.success_rate = min(1.0, endpoint.success_rate + 0.01)
            
            # Reset circuit breaker failures on success
            circuit_state = self.circuit_breaker_state[endpoint.endpoint_id]
            if circuit_state['state'] == 'half_open':
                circuit_state['state'] = 'closed'
                circuit_state['failures'] = 0
        
        else:
            # Handle failure
            endpoint.success_rate = max(0.0, endpoint.success_rate - 0.05)
            await self._handle_endpoint_failure(endpoint.endpoint_id)
    
    async def _handle_endpoint_failure(self, endpoint_id: str):
        """Handle endpoint failure for circuit breaker"""
        circuit_state = self.circuit_breaker_state[endpoint_id]
        circuit_state['failures'] += 1
        circuit_state['last_failure'] = datetime.utcnow()
        
        if circuit_state['failures'] >= self.circuit_breaker_threshold:
            circuit_state['state'] = 'open'
            logger.warning(f"Circuit breaker opened for endpoint {endpoint_id}")
    
    async def start_health_checks(self):
        """Start periodic health checks for endpoints"""
        self.health_check_task = asyncio.create_task(self._health_check_loop())
    
    async def stop_health_checks(self):
        """Stop health check loop"""
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
    
    async def _health_check_loop(self):
        """Periodic health check loop"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                for endpoint in self.endpoints.values():
                    health_ok = await self._check_endpoint_health(endpoint)
                    endpoint.healthy = health_ok
                    endpoint.last_health_check = datetime.utcnow()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    async def _check_endpoint_health(self, endpoint: BackendEndpoint) -> bool:
        """Check health of a specific endpoint"""
        try:
            # This would make an actual HTTP health check in production
            # For now, simulate based on current load and success rate
            
            if endpoint.current_load >= endpoint.max_concurrent:
                return False
            
            if endpoint.success_rate < 0.5:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Health check failed for {endpoint.endpoint_id}: {e}")
            return False
    
    def get_load_balancer_stats(self) -> Dict[str, Any]:
        """Get load balancer statistics"""
        endpoint_stats = {}
        
        for endpoint in self.endpoints.values():
            circuit_state = self.circuit_breaker_state.get(endpoint.endpoint_id, {})
            
            endpoint_stats[endpoint.endpoint_id] = {
                "current_load": endpoint.current_load,
                "max_concurrent": endpoint.max_concurrent,
                "load_percentage": (endpoint.current_load / endpoint.max_concurrent) * 100,
                "avg_response_time_ms": endpoint.avg_response_time_ms,
                "success_rate": endpoint.success_rate,
                "healthy": endpoint.healthy,
                "circuit_breaker_state": circuit_state.get('state', 'closed'),
                "circuit_breaker_failures": circuit_state.get('failures', 0)
            }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "strategy": self.strategy.value,
            "total_endpoints": len(self.endpoints),
            "healthy_endpoints": sum(1 for ep in self.endpoints.values() if ep.healthy),
            "total_active_connections": sum(ep.current_load for ep in self.endpoints.values()),
            "endpoints": endpoint_stats
        }