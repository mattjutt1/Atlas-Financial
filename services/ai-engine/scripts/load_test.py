"""
Atlas Financial AI Engine - Load Testing Script
Validates 10K concurrent user capacity with sub-400ms response times
"""

import asyncio
import aiohttp
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
import statistics
import argparse
import sys
import signal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LoadTestConfig:
    """Load test configuration"""
    base_url: str = "http://localhost:8083"
    concurrent_users: int = 100
    requests_per_user: int = 10
    ramp_up_seconds: int = 30
    test_duration_seconds: int = 300
    operations: List[str] = field(default_factory=lambda: [
        "budget_optimization",
        "portfolio_analysis", 
        "financial_analysis",
        "market_intelligence"
    ])
    target_p95_ms: float = 400.0
    target_success_rate: float = 0.99
    auth_token: Optional[str] = None


@dataclass
class RequestResult:
    """Individual request result"""
    operation: str
    response_time_ms: float
    success: bool
    cache_hit: bool = False
    batch_size: int = 1
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class LoadTestResults:
    """Complete load test results"""
    config: LoadTestConfig
    start_time: datetime
    end_time: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    response_times: List[float]
    cache_hits: int
    errors: List[str]
    
    @property
    def success_rate(self) -> float:
        return self.successful_requests / self.total_requests if self.total_requests > 0 else 0.0
    
    @property
    def cache_hit_rate(self) -> float:
        return self.cache_hits / self.total_requests if self.total_requests > 0 else 0.0
    
    @property
    def requests_per_second(self) -> float:
        duration = (self.end_time - self.start_time).total_seconds()
        return self.total_requests / duration if duration > 0 else 0.0
    
    @property
    def percentiles(self) -> Dict[str, float]:
        if not self.response_times:
            return {}
        
        sorted_times = sorted(self.response_times)
        return {
            "p50": self._percentile(sorted_times, 0.50),
            "p90": self._percentile(sorted_times, 0.90),
            "p95": self._percentile(sorted_times, 0.95),
            "p99": self._percentile(sorted_times, 0.99)
        }
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        index = int(len(values) * percentile)
        index = min(index, len(values) - 1)
        return values[index]


class AIEngineLoadTester:
    """High-performance load tester for AI Engine"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.results: List[RequestResult] = []
        self.running = False
        self.user_semaphore = asyncio.Semaphore(config.concurrent_users)
        
        # Progress tracking
        self.completed_requests = 0
        self.progress_task: Optional[asyncio.Task] = None
        
        # Graceful shutdown
        self.shutdown_event = asyncio.Event()
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_event.set()
    
    async def setup(self):
        """Initialize HTTP session and test environment"""
        connector = aiohttp.TCPConnector(
            limit=self.config.concurrent_users + 50,  # Extra connections for safety
            limit_per_host=self.config.concurrent_users + 50,
            ttl_dns_cache=300,
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
        
        timeout = aiohttp.ClientTimeout(total=30)
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Atlas-AI-LoadTester/1.0"
        }
        
        if self.config.auth_token:
            headers["Authorization"] = f"Bearer {self.config.auth_token}"
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=headers
        )
        
        # Verify server is available
        try:
            async with self.session.get(f"{self.config.base_url}/health") as response:
                if response.status != 200:
                    raise Exception(f"Server health check failed: {response.status}")
                
                health_data = await response.json()
                logger.info(f"Server health: {health_data}")
        
        except Exception as e:
            logger.error(f"Failed to connect to server: {e}")
            raise
    
    async def teardown(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    async def run_load_test(self) -> LoadTestResults:
        """Execute complete load test"""
        logger.info(f"Starting load test: {self.config.concurrent_users} users, "
                   f"{self.config.requests_per_user} requests each")
        
        start_time = datetime.utcnow()
        self.running = True
        
        try:
            # Start progress tracking
            self.progress_task = asyncio.create_task(self._progress_tracker())
            
            # Create user tasks
            user_tasks = []
            for user_id in range(self.config.concurrent_users):
                task = asyncio.create_task(self._simulate_user(user_id))
                user_tasks.append(task)
                
                # Ramp up delay
                if self.config.ramp_up_seconds > 0:
                    delay = self.config.ramp_up_seconds / self.config.concurrent_users
                    await asyncio.sleep(delay)
                
                # Check for shutdown
                if self.shutdown_event.is_set():
                    break
            
            # Wait for all users to complete or shutdown signal
            try:
                await asyncio.wait_for(
                    asyncio.gather(*user_tasks, return_exceptions=True),
                    timeout=self.config.test_duration_seconds
                )
            except asyncio.TimeoutError:
                logger.info("Test duration reached, stopping...")
            
        except Exception as e:
            logger.error(f"Load test error: {e}")
        
        finally:
            self.running = False
            if self.progress_task:
                self.progress_task.cancel()
        
        end_time = datetime.utcnow()
        return self._compile_results(start_time, end_time)
    
    async def _simulate_user(self, user_id: int):
        """Simulate individual user behavior"""
        async with self.user_semaphore:
            user_results = []
            
            for request_num in range(self.config.requests_per_user):
                if self.shutdown_event.is_set():
                    break
                
                # Select operation
                operation = self.config.operations[request_num % len(self.config.operations)]
                
                # Execute request
                result = await self._execute_ai_request(user_id, operation)
                user_results.append(result)
                
                # Small delay between requests from same user
                await asyncio.sleep(0.1)
            
            # Add user results to global results
            self.results.extend(user_results)
            self.completed_requests += len(user_results)
    
    async def _execute_ai_request(self, user_id: int, operation: str) -> RequestResult:
        """Execute single AI request"""
        start_time = time.time()
        
        # Generate realistic request data
        request_data = self._generate_request_data(user_id, operation)
        
        try:
            # Use the optimized test endpoint
            async with self.session.post(
                f"{self.config.base_url}/ai/test/optimized",
                json=request_data
            ) as response:
                
                response_time_ms = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    response_data = await response.json()
                    
                    return RequestResult(
                        operation=operation,
                        response_time_ms=response_time_ms,
                        success=True,
                        cache_hit=response_data.get("performance_metrics", {}).get("cache_hit", False),
                        batch_size=response_data.get("performance_metrics", {}).get("batch_size", 1)
                    )
                else:
                    error_text = await response.text()
                    return RequestResult(
                        operation=operation,
                        response_time_ms=response_time_ms,
                        success=False,
                        error=f"HTTP {response.status}: {error_text[:100]}"
                    )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return RequestResult(
                operation=operation,
                response_time_ms=response_time_ms,
                success=False,
                error=str(e)[:100]
            )
    
    def _generate_request_data(self, user_id: int, operation: str) -> Dict[str, Any]:
        """Generate realistic request data for operation"""
        base_data = {
            "user_id": f"load_test_user_{user_id}",
            "operation": operation,
            "timestamp": time.time()
        }
        
        # Operation-specific data
        if operation == "budget_optimization":
            base_data.update({
                "analysis_type": "monthly_review",
                "categories": ["food", "transportation", "entertainment"],
                "budget_period": "2024-01"
            })
        elif operation == "portfolio_analysis":
            base_data.update({
                "risk_tolerance": "moderate",
                "investment_horizon": 5,
                "portfolio_value": 100000
            })
        elif operation == "financial_analysis":
            base_data.update({
                "analysis_scope": "comprehensive",
                "include_projections": True
            })
        elif operation == "market_intelligence":
            base_data.update({
                "symbols": ["AAPL", "GOOGL", "TSLA"],
                "alert_types": ["price_change", "volume_spike"]
            })
        
        return base_data
    
    async def _progress_tracker(self):
        """Track and log test progress"""
        total_expected = self.config.concurrent_users * self.config.requests_per_user
        
        while self.running:
            try:
                await asyncio.sleep(10)  # Update every 10 seconds
                
                progress_pct = (self.completed_requests / total_expected) * 100
                
                # Calculate current performance metrics
                if self.results:
                    recent_results = self.results[-100:]  # Last 100 requests
                    recent_times = [r.response_time_ms for r in recent_results if r.success]
                    recent_success_rate = sum(1 for r in recent_results if r.success) / len(recent_results)
                    
                    if recent_times:
                        recent_p95 = sorted(recent_times)[int(len(recent_times) * 0.95)]
                        logger.info(f"Progress: {progress_pct:.1f}% ({self.completed_requests}/{total_expected}) - "
                                   f"Recent P95: {recent_p95:.1f}ms, Success: {recent_success_rate:.2%}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Progress tracking error: {e}")
    
    def _compile_results(self, start_time: datetime, end_time: datetime) -> LoadTestResults:
        """Compile final test results"""
        successful_results = [r for r in self.results if r.success]
        failed_results = [r for r in self.results if not r.success]
        
        response_times = [r.response_time_ms for r in successful_results]
        cache_hits = sum(1 for r in successful_results if r.cache_hit)
        errors = [r.error for r in failed_results if r.error]
        
        return LoadTestResults(
            config=self.config,
            start_time=start_time,
            end_time=end_time,
            total_requests=len(self.results),
            successful_requests=len(successful_results),
            failed_requests=len(failed_results),
            response_times=response_times,
            cache_hits=cache_hits,
            errors=errors
        )


def print_test_results(results: LoadTestResults):
    """Print comprehensive test results"""
    print("\n" + "="*80)
    print("ATLAS FINANCIAL AI ENGINE - LOAD TEST RESULTS")
    print("="*80)
    
    # Test Configuration
    print(f"\nTEST CONFIGURATION:")
    print(f"  Concurrent Users: {results.config.concurrent_users}")
    print(f"  Requests per User: {results.config.requests_per_user}")
    print(f"  Total Duration: {(results.end_time - results.start_time).total_seconds():.1f}s")
    print(f"  Operations: {', '.join(results.config.operations)}")
    
    # Overall Performance
    print(f"\nOVERALL PERFORMANCE:")
    print(f"  Total Requests: {results.total_requests}")
    print(f"  Successful: {results.successful_requests} ({results.success_rate:.2%})")
    print(f"  Failed: {results.failed_requests}")
    print(f"  Requests/Second: {results.requests_per_second:.1f}")
    print(f"  Cache Hit Rate: {results.cache_hit_rate:.2%}")
    
    # Response Time Analysis
    if results.response_times:
        percentiles = results.percentiles
        print(f"\nRESPONSE TIME ANALYSIS:")
        print(f"  Mean: {statistics.mean(results.response_times):.1f}ms")
        print(f"  Median (P50): {percentiles.get('p50', 0):.1f}ms")
        print(f"  P90: {percentiles.get('p90', 0):.1f}ms")
        print(f"  P95: {percentiles.get('p95', 0):.1f}ms")
        print(f"  P99: {percentiles.get('p99', 0):.1f}ms")
        print(f"  Max: {max(results.response_times):.1f}ms")
        print(f"  Min: {min(results.response_times):.1f}ms")
    
    # Performance Goals Assessment
    print(f"\nPERFORMANCE GOALS ASSESSMENT:")
    
    # 10K users goal (extrapolation)
    if results.config.concurrent_users > 0:
        extrapolated_10k = (10000 / results.config.concurrent_users) * results.requests_per_second
        print(f"  Estimated 10K User Throughput: {extrapolated_10k:.1f} RPS")
    
    # Sub-400ms P95 goal
    p95_time = results.percentiles.get('p95', 1000)
    p95_status = "✅ PASS" if p95_time <= results.config.target_p95_ms else "❌ FAIL"
    print(f"  P95 Response Time Goal (<{results.config.target_p95_ms}ms): {p95_time:.1f}ms {p95_status}")
    
    # Success rate goal
    success_status = "✅ PASS" if results.success_rate >= results.config.target_success_rate else "❌ FAIL"
    print(f"  Success Rate Goal (>{results.config.target_success_rate:.1%}): {results.success_rate:.2%} {success_status}")
    
    # Error Analysis
    if results.errors:
        print(f"\nERROR ANALYSIS:")
        error_counts = {}
        for error in results.errors:
            error_counts[error] = error_counts.get(error, 0) + 1
        
        for error, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {error}: {count} occurrences")
    
    # Recommendations
    print(f"\nRECOMMENDATIONS:")
    
    if p95_time > results.config.target_p95_ms:
        print(f"  • P95 response time ({p95_time:.1f}ms) exceeds target ({results.config.target_p95_ms}ms)")
        print(f"    - Consider enabling more aggressive caching")
        print(f"    - Increase model endpoint capacity")
        print(f"    - Optimize batch processing parameters")
    
    if results.success_rate < results.config.target_success_rate:
        print(f"  • Success rate ({results.success_rate:.2%}) below target ({results.config.target_success_rate:.1%})")
        print(f"    - Review error logs for common failure patterns")
        print(f"    - Implement circuit breaker and retry logic")
        print(f"    - Check resource limits and capacity")
    
    if results.cache_hit_rate < 0.7:
        print(f"  • Cache hit rate ({results.cache_hit_rate:.2%}) could be improved")
        print(f"    - Enable cache warming for popular operations")
        print(f"    - Increase cache TTL for stable operations")
        print(f"    - Review cache key generation strategy")
    
    print("="*80)


async def main():
    """Main load testing function"""
    parser = argparse.ArgumentParser(description="Atlas Financial AI Engine Load Test")
    parser.add_argument("--url", default="http://localhost:8083", help="Base URL for AI Engine")
    parser.add_argument("--users", type=int, default=100, help="Number of concurrent users")
    parser.add_argument("--requests", type=int, default=10, help="Requests per user")
    parser.add_argument("--duration", type=int, default=300, help="Test duration in seconds")
    parser.add_argument("--ramp-up", type=int, default=30, help="Ramp up time in seconds")
    parser.add_argument("--auth-token", help="Authentication token")
    parser.add_argument("--target-p95", type=float, default=400.0, help="Target P95 response time (ms)")
    
    args = parser.parse_args()
    
    # Create test configuration
    config = LoadTestConfig(
        base_url=args.url,
        concurrent_users=args.users,
        requests_per_user=args.requests,
        test_duration_seconds=args.duration,
        ramp_up_seconds=args.ramp_up,
        target_p95_ms=args.target_p95,
        auth_token=args.auth_token
    )
    
    # Create and run load tester
    tester = AIEngineLoadTester(config)
    
    try:
        await tester.setup()
        results = await tester.run_load_test()
        print_test_results(results)
        
        # Exit with appropriate code
        success = (results.success_rate >= config.target_success_rate and
                  results.percentiles.get('p95', 1000) <= config.target_p95_ms)
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        logger.info("Load test interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Load test failed: {e}")
        sys.exit(1)
    finally:
        await tester.teardown()


if __name__ == "__main__":
    asyncio.run(main())