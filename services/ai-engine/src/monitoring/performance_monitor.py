"""
Atlas Financial AI Engine - Performance Monitoring and Alerting
Real-time performance monitoring with intelligent alerting for 10K concurrent users
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Any, Optional, Callable
import statistics
import json

from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class MetricType(Enum):
    """Types of performance metrics"""
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    CACHE_HIT_RATE = "cache_hit_rate"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"
    QUEUE_SIZE = "queue_size"
    CONNECTION_COUNT = "connection_count"


@dataclass
class PerformanceThreshold:
    """Performance threshold configuration"""
    metric_type: MetricType
    warning_threshold: float
    critical_threshold: float
    emergency_threshold: Optional[float] = None
    window_size_minutes: int = 5
    min_samples: int = 10
    enabled: bool = True


@dataclass
class PerformanceAlert:
    """Performance alert data structure"""
    alert_id: str
    metric_type: MetricType
    severity: AlertSeverity
    message: str
    current_value: float
    threshold_value: float
    timestamp: datetime
    duration_seconds: int = 0
    resolved: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass 
class MetricSnapshot:
    """Point-in-time metric snapshot"""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class PerformanceCollector:
    """Collects and analyzes performance metrics"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.metric_buffers: Dict[MetricType, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.collection_interval = 5.0  # 5 seconds
        self.collection_task: Optional[asyncio.Task] = None
        
        # Performance counters
        self.metrics_collected = Counter('perf_metrics_collected_total', 'Total metrics collected')
        self.collection_errors = Counter('perf_collection_errors_total', 'Collection errors')
        self.collection_duration = Histogram('perf_collection_duration_seconds', 'Collection duration')
    
    async def start_collection(self):
        """Start periodic metric collection"""
        if self.collection_task:
            return
        
        self.collection_task = asyncio.create_task(self._collection_loop())
        logger.info("Performance metric collection started")
    
    async def stop_collection(self):
        """Stop metric collection"""
        if self.collection_task:
            self.collection_task.cancel()
            try:
                await self.collection_task
            except asyncio.CancelledError:
                pass
            self.collection_task = None
        logger.info("Performance metric collection stopped")
    
    async def _collection_loop(self):
        """Main collection loop"""
        while True:
            try:
                await asyncio.sleep(self.collection_interval)
                
                with self.collection_duration.time():
                    await self._collect_system_metrics()
                    await self._collect_application_metrics()
                    await self._store_metrics_snapshot()
                
                self.metrics_collected.inc()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Metric collection error: {e}")
                self.collection_errors.inc()
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            import psutil
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            self.record_metric(MetricType.CPU_USAGE, cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            self.record_metric(MetricType.MEMORY_USAGE, memory_percent)
            
        except ImportError:
            # Fallback metrics without psutil
            pass
        except Exception as e:
            logger.error(f"System metric collection error: {e}")
    
    async def _collect_application_metrics(self):
        """Collect application-specific metrics"""
        try:
            # Get Redis info for connection count
            redis_info = await self.redis.info()
            connected_clients = redis_info.get('connected_clients', 0)
            self.record_metric(MetricType.CONNECTION_COUNT, connected_clients)
            
            # Get queue sizes from Redis
            queue_keys = await self.redis.keys("ai_*:queue:*")
            total_queue_size = 0
            for key in queue_keys:
                queue_size = await self.redis.llen(key)
                total_queue_size += queue_size
            
            self.record_metric(MetricType.QUEUE_SIZE, total_queue_size)
            
        except Exception as e:
            logger.error(f"Application metric collection error: {e}")
    
    async def _store_metrics_snapshot(self):
        """Store current metrics snapshot in Redis"""
        try:
            snapshot = {
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": {}
            }
            
            for metric_type, buffer in self.metric_buffers.items():
                if buffer:
                    latest_metric = buffer[-1]
                    snapshot["metrics"][metric_type.value] = {
                        "value": latest_metric.value,
                        "timestamp": latest_metric.timestamp.isoformat()
                    }
            
            # Store in Redis with 1-hour TTL
            await self.redis.setex(
                "perf_snapshot:latest",
                3600,
                json.dumps(snapshot)
            )
            
        except Exception as e:
            logger.error(f"Snapshot storage error: {e}")
    
    def record_metric(self, metric_type: MetricType, value: float, metadata: Dict[str, Any] = None):
        """Record a performance metric"""
        snapshot = MetricSnapshot(
            timestamp=datetime.utcnow(),
            value=value,
            metadata=metadata or {}
        )
        
        self.metric_buffers[metric_type].append(snapshot)
    
    def get_metric_statistics(
        self, 
        metric_type: MetricType, 
        window_minutes: int = 5
    ) -> Dict[str, float]:
        """Get statistical summary for a metric over time window"""
        
        buffer = self.metric_buffers[metric_type]
        if not buffer:
            return {}
        
        # Filter to time window
        cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
        recent_values = [
            snap.value for snap in buffer 
            if snap.timestamp >= cutoff_time
        ]
        
        if not recent_values:
            return {}
        
        return {
            "count": len(recent_values),
            "mean": statistics.mean(recent_values),
            "median": statistics.median(recent_values),
            "min": min(recent_values),
            "max": max(recent_values),
            "std_dev": statistics.stdev(recent_values) if len(recent_values) > 1 else 0,
            "p95": self._percentile(recent_values, 0.95),
            "p99": self._percentile(recent_values, 0.99)
        }
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile)
        index = min(index, len(sorted_values) - 1)
        return sorted_values[index]


class PerformanceAlerter:
    """Intelligent performance alerting system"""
    
    def __init__(self, redis_client: redis.Redis, collector: PerformanceCollector):
        self.redis = redis_client
        self.collector = collector
        self.active_alerts: Dict[str, PerformanceAlert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.alerting_task: Optional[asyncio.Task] = None
        
        # Default thresholds for AI Engine performance
        self.thresholds = {
            MetricType.RESPONSE_TIME: PerformanceThreshold(
                metric_type=MetricType.RESPONSE_TIME,
                warning_threshold=300.0,  # 300ms
                critical_threshold=500.0,  # 500ms
                emergency_threshold=1000.0  # 1s
            ),
            MetricType.THROUGHPUT: PerformanceThreshold(
                metric_type=MetricType.THROUGHPUT,
                warning_threshold=50.0,   # Below 50 RPS
                critical_threshold=25.0,  # Below 25 RPS
                emergency_threshold=10.0  # Below 10 RPS
            ),
            MetricType.ERROR_RATE: PerformanceThreshold(
                metric_type=MetricType.ERROR_RATE,
                warning_threshold=5.0,    # 5% error rate
                critical_threshold=10.0,  # 10% error rate
                emergency_threshold=25.0  # 25% error rate
            ),
            MetricType.CACHE_HIT_RATE: PerformanceThreshold(
                metric_type=MetricType.CACHE_HIT_RATE,
                warning_threshold=70.0,   # Below 70%
                critical_threshold=50.0,  # Below 50%
                emergency_threshold=25.0  # Below 25%
            ),
            MetricType.MEMORY_USAGE: PerformanceThreshold(
                metric_type=MetricType.MEMORY_USAGE,
                warning_threshold=80.0,   # 80% memory usage
                critical_threshold=90.0,  # 90% memory usage
                emergency_threshold=95.0  # 95% memory usage
            ),
            MetricType.CPU_USAGE: PerformanceThreshold(
                metric_type=MetricType.CPU_USAGE,
                warning_threshold=70.0,   # 70% CPU usage
                critical_threshold=85.0,  # 85% CPU usage
                emergency_threshold=95.0  # 95% CPU usage
            ),
            MetricType.QUEUE_SIZE: PerformanceThreshold(
                metric_type=MetricType.QUEUE_SIZE,
                warning_threshold=100.0,  # 100 queued requests
                critical_threshold=500.0, # 500 queued requests
                emergency_threshold=1000.0 # 1000 queued requests
            )
        }
        
        # Alert callbacks
        self.alert_callbacks: List[Callable] = []
    
    def add_alert_callback(self, callback: Callable[[PerformanceAlert], None]):
        """Add callback function for alert notifications"""
        self.alert_callbacks.append(callback)
    
    async def start_alerting(self):
        """Start alert monitoring"""
        if self.alerting_task:
            return
        
        self.alerting_task = asyncio.create_task(self._alerting_loop())
        logger.info("Performance alerting started")
    
    async def stop_alerting(self):
        """Stop alert monitoring"""
        if self.alerting_task:
            self.alerting_task.cancel()
            try:
                await self.alerting_task
            except asyncio.CancelledError:
                pass
            self.alerting_task = None
        logger.info("Performance alerting stopped")
    
    async def _alerting_loop(self):
        """Main alerting loop"""
        while True:
            try:
                await asyncio.sleep(10)  # Check every 10 seconds
                await self._check_all_thresholds()
                await self._update_alert_durations()
                await self._cleanup_resolved_alerts()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Alerting loop error: {e}")
    
    async def _check_all_thresholds(self):
        """Check all configured thresholds"""
        for metric_type, threshold in self.thresholds.items():
            if not threshold.enabled:
                continue
            
            try:
                await self._check_threshold(metric_type, threshold)
            except Exception as e:
                logger.error(f"Threshold check error for {metric_type}: {e}")
    
    async def _check_threshold(self, metric_type: MetricType, threshold: PerformanceThreshold):
        """Check specific threshold and generate alerts"""
        stats = self.collector.get_metric_statistics(
            metric_type, 
            threshold.window_size_minutes
        )
        
        if not stats or stats["count"] < threshold.min_samples:
            return
        
        # Use appropriate statistic based on metric type
        if metric_type in [MetricType.RESPONSE_TIME, MetricType.QUEUE_SIZE]:
            current_value = stats["p95"]  # Use P95 for latency metrics
        elif metric_type == MetricType.THROUGHPUT:
            current_value = stats["mean"]  # Use mean for throughput
        elif metric_type in [MetricType.CACHE_HIT_RATE, MetricType.ERROR_RATE]:
            current_value = stats["mean"]  # Use mean for rates
        else:
            current_value = stats["max"]  # Use max for resource metrics
        
        # Determine alert severity
        severity = None
        threshold_value = None
        
        if (threshold.emergency_threshold and 
            self._threshold_exceeded(metric_type, current_value, threshold.emergency_threshold)):
            severity = AlertSeverity.EMERGENCY
            threshold_value = threshold.emergency_threshold
        elif self._threshold_exceeded(metric_type, current_value, threshold.critical_threshold):
            severity = AlertSeverity.CRITICAL
            threshold_value = threshold.critical_threshold
        elif self._threshold_exceeded(metric_type, current_value, threshold.warning_threshold):
            severity = AlertSeverity.WARNING
            threshold_value = threshold.warning_threshold
        
        alert_key = f"{metric_type.value}_threshold"
        
        if severity:
            # Create or update alert
            if alert_key not in self.active_alerts:
                alert = PerformanceAlert(
                    alert_id=alert_key,
                    metric_type=metric_type,
                    severity=severity,
                    message=self._generate_alert_message(metric_type, current_value, threshold_value, severity),
                    current_value=current_value,
                    threshold_value=threshold_value,
                    timestamp=datetime.utcnow(),
                    metadata={"stats": stats}
                )
                
                self.active_alerts[alert_key] = alert
                await self._trigger_alert(alert)
            else:
                # Update existing alert
                existing_alert = self.active_alerts[alert_key]
                if existing_alert.severity != severity:
                    existing_alert.severity = severity
                    existing_alert.message = self._generate_alert_message(
                        metric_type, current_value, threshold_value, severity
                    )
                    await self._trigger_alert(existing_alert)
                
                existing_alert.current_value = current_value
                existing_alert.metadata["stats"] = stats
        else:
            # Resolve alert if it exists
            if alert_key in self.active_alerts:
                alert = self.active_alerts[alert_key]
                alert.resolved = True
                await self._resolve_alert(alert)
    
    def _threshold_exceeded(self, metric_type: MetricType, current_value: float, threshold: float) -> bool:
        """Check if threshold is exceeded based on metric type"""
        # For these metrics, lower values are worse
        if metric_type in [MetricType.THROUGHPUT, MetricType.CACHE_HIT_RATE]:
            return current_value < threshold
        
        # For these metrics, higher values are worse
        return current_value > threshold
    
    def _generate_alert_message(
        self, 
        metric_type: MetricType, 
        current_value: float, 
        threshold_value: float, 
        severity: AlertSeverity
    ) -> str:
        """Generate human-readable alert message"""
        metric_name = metric_type.value.replace('_', ' ').title()
        
        if metric_type in [MetricType.THROUGHPUT, MetricType.CACHE_HIT_RATE]:
            return (f"{severity.value.upper()}: {metric_name} ({current_value:.1f}) "
                   f"below threshold ({threshold_value:.1f})")
        else:
            return (f"{severity.value.upper()}: {metric_name} ({current_value:.1f}) "
                   f"above threshold ({threshold_value:.1f})")
    
    async def _trigger_alert(self, alert: PerformanceAlert):
        """Trigger alert notifications"""
        logger.warning(f"ALERT: {alert.message}")
        
        # Store alert in Redis
        await self._store_alert(alert)
        
        # Call notification callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(alert) if asyncio.iscoroutinefunction(callback) else callback(alert)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
    
    async def _resolve_alert(self, alert: PerformanceAlert):
        """Resolve an active alert"""
        logger.info(f"RESOLVED: Alert {alert.alert_id} resolved")
        
        alert.duration_seconds = int((datetime.utcnow() - alert.timestamp).total_seconds())
        self.alert_history.append(alert)
        
        # Remove from active alerts
        self.active_alerts.pop(alert.alert_id, None)
        
        # Store resolution in Redis
        await self._store_alert(alert)
    
    async def _store_alert(self, alert: PerformanceAlert):
        """Store alert in Redis for persistence"""
        try:
            alert_data = {
                "alert_id": alert.alert_id,
                "metric_type": alert.metric_type.value,
                "severity": alert.severity.value,
                "message": alert.message,
                "current_value": alert.current_value,
                "threshold_value": alert.threshold_value,
                "timestamp": alert.timestamp.isoformat(),
                "duration_seconds": alert.duration_seconds,
                "resolved": alert.resolved,
                "metadata": alert.metadata
            }
            
            # Store individual alert
            await self.redis.setex(
                f"perf_alert:{alert.alert_id}:{int(alert.timestamp.timestamp())}",
                86400,  # 24 hours
                json.dumps(alert_data)
            )
            
            # Update active alerts list
            if not alert.resolved:
                await self.redis.sadd("perf_alerts:active", alert.alert_id)
            else:
                await self.redis.srem("perf_alerts:active", alert.alert_id)
            
        except Exception as e:
            logger.error(f"Alert storage error: {e}")
    
    async def _update_alert_durations(self):
        """Update duration for active alerts"""
        current_time = datetime.utcnow()
        for alert in self.active_alerts.values():
            alert.duration_seconds = int((current_time - alert.timestamp).total_seconds())
    
    async def _cleanup_resolved_alerts(self):
        """Clean up old resolved alerts"""
        # Keep only recent resolved alerts in memory
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        
        while (self.alert_history and 
               self.alert_history[0].timestamp < cutoff_time and
               self.alert_history[0].resolved):
            self.alert_history.popleft()
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of current alert status"""
        active_by_severity = defaultdict(int)
        for alert in self.active_alerts.values():
            active_by_severity[alert.severity.value] += 1
        
        recent_resolved = [
            alert for alert in self.alert_history
            if alert.resolved and alert.timestamp > datetime.utcnow() - timedelta(hours=24)
        ]
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "active_alerts": len(self.active_alerts),
            "active_by_severity": dict(active_by_severity),
            "resolved_last_24h": len(recent_resolved),
            "alert_details": [
                {
                    "alert_id": alert.alert_id,
                    "severity": alert.severity.value,
                    "message": alert.message,
                    "duration_seconds": alert.duration_seconds
                }
                for alert in self.active_alerts.values()
            ]
        }


class PerformanceMonitor:
    """Unified performance monitoring system"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.collector = PerformanceCollector(redis_client)
        self.alerter = PerformanceAlerter(redis_client, self.collector)
        self.running = False
    
    async def start(self):
        """Start all monitoring components"""
        if self.running:
            return
        
        await self.collector.start_collection()
        await self.alerter.start_alerting()
        self.running = True
        
        logger.info("Performance monitoring system started")
    
    async def stop(self):
        """Stop all monitoring components"""
        if not self.running:
            return
        
        await self.collector.stop_collection()
        await self.alerter.stop_alerting()
        self.running = False
        
        logger.info("Performance monitoring system stopped")
    
    def record_request_metric(self, response_time_ms: float, cache_hit: bool, error: bool = False):
        """Record AI request performance metrics"""
        self.collector.record_metric(MetricType.RESPONSE_TIME, response_time_ms)
        
        if cache_hit:
            self.collector.record_metric(MetricType.CACHE_HIT_RATE, 100.0)
        else:
            self.collector.record_metric(MetricType.CACHE_HIT_RATE, 0.0)
        
        if error:
            self.collector.record_metric(MetricType.ERROR_RATE, 100.0)
        else:
            self.collector.record_metric(MetricType.ERROR_RATE, 0.0)
    
    def add_alert_callback(self, callback: Callable):
        """Add alert notification callback"""
        self.alerter.add_alert_callback(callback)
    
    async def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get comprehensive monitoring status"""
        alert_summary = self.alerter.get_alert_summary()
        
        # Get recent performance statistics
        perf_stats = {}
        for metric_type in MetricType:
            stats = self.collector.get_metric_statistics(metric_type, window_minutes=5)
            if stats:
                perf_stats[metric_type.value] = stats
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "monitoring_active": self.running,
            "performance_statistics": perf_stats,
            "alert_summary": alert_summary,
            "system_health": self._calculate_system_health(perf_stats, alert_summary)
        }
    
    def _calculate_system_health(self, perf_stats: Dict, alert_summary: Dict) -> str:
        """Calculate overall system health grade"""
        # Simple health scoring based on alerts and key metrics
        active_alerts = alert_summary.get("active_alerts", 0)
        active_by_severity = alert_summary.get("active_by_severity", {})
        
        # Critical or emergency alerts = poor health
        if active_by_severity.get("critical", 0) > 0 or active_by_severity.get("emergency", 0) > 0:
            return "POOR"
        
        # Multiple warnings = fair health
        if active_by_severity.get("warning", 0) > 2:
            return "FAIR"
        
        # Some warnings = good health
        if active_alerts > 0:
            return "GOOD"
        
        # No alerts and good metrics = excellent health
        response_time_stats = perf_stats.get("response_time", {})
        if response_time_stats and response_time_stats.get("p95", 1000) < 200:
            return "EXCELLENT"
        
        return "GOOD"