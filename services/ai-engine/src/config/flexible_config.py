"""
Atlas Financial AI Engine - Flexible Configuration Management
Supports both monolithic and multi-agent deployment configurations
"""

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
import yaml
import logging

logger = logging.getLogger(__name__)


class DeploymentMode(Enum):
    """AI Engine deployment modes"""
    MONOLITHIC = "monolithic"
    MULTI_AGENT = "multi_agent"
    HYBRID = "hybrid"  # Both backends available


class AgentType(Enum):
    """Available agent types"""
    SUPERVISOR = "supervisor"
    BUDGET_OPTIMIZER = "budget_optimizer"
    INVESTMENT_ANALYZER = "investment_analyzer"
    DEBT_STRATEGIST = "debt_strategist"
    MARKET_INTELLIGENCE = "market_intelligence"
    GOAL_PLANNER = "goal_planner"


@dataclass
class ModelConfig:
    """Configuration for a specific AI model"""
    name: str
    model_path: str
    endpoint: str
    max_tokens: int = 2048
    temperature: float = 0.7
    batch_size: int = 32
    gpu_memory_mb: int = 2048
    timeout_ms: int = 5000
    health_check_interval: int = 30
    retry_attempts: int = 3
    fallback_model: Optional[str] = None


@dataclass
class AgentConfig:
    """Configuration for a specialized agent"""
    agent_type: AgentType
    model_config: ModelConfig
    specialization_params: Dict[str, Any] = field(default_factory=dict)
    resource_limits: Dict[str, Any] = field(default_factory=dict)
    communication_config: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True


@dataclass
class BackendConfig:
    """Configuration for AI backend"""
    deployment_mode: DeploymentMode
    monolithic_model: Optional[ModelConfig] = None
    supervisor_agent: Optional[AgentConfig] = None
    worker_agents: List[AgentConfig] = field(default_factory=list)
    load_balancing: Dict[str, Any] = field(default_factory=dict)
    failover_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SecurityConfig:
    """Security configuration"""
    jwt_secret_key: str
    supertokens_connection_uri: str
    enable_rate_limiting: bool = True
    rate_limit_requests_per_minute: int = 100
    enable_request_logging: bool = True
    encrypt_context_data: bool = True
    allowed_origins: List[str] = field(default_factory=list)
    require_https: bool = True


@dataclass
class PerformanceConfig:
    """Performance tuning configuration"""
    max_concurrent_requests: int = 100
    request_timeout_ms: int = 10000
    context_cache_ttl_seconds: int = 3600
    result_cache_ttl_seconds: int = 300
    enable_request_batching: bool = True
    batch_size: int = 10
    batch_timeout_ms: int = 100
    enable_connection_pooling: bool = True
    connection_pool_size: int = 20


@dataclass
class MonitoringConfig:
    """Monitoring and observability configuration"""
    enable_prometheus_metrics: bool = True
    enable_distributed_tracing: bool = True
    log_level: str = "INFO"
    metrics_port: int = 9090
    health_check_interval_seconds: int = 30
    alert_thresholds: Dict[str, float] = field(default_factory=dict)


@dataclass
class ABTestConfig:
    """A/B testing configuration"""
    enabled: bool = False
    test_configs: List[Dict[str, Any]] = field(default_factory=list)
    traffic_allocation: Dict[str, float] = field(default_factory=dict)
    success_metrics: List[str] = field(default_factory=list)
    duration_days: int = 14


class FlexibleConfig:
    """Main configuration class supporting flexible AI architectures"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.getenv("AI_ENGINE_CONFIG_PATH", "config/ai_engine.yml")
        
        # Load configuration
        self.backend_config = self._load_backend_config()
        self.security_config = self._load_security_config()
        self.performance_config = self._load_performance_config()
        self.monitoring_config = self._load_monitoring_config()
        self.ab_test_config = self._load_ab_test_config()
        
        # Validate configuration
        self._validate_config()
    
    def _load_backend_config(self) -> BackendConfig:
        """Load AI backend configuration"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config_data = yaml.safe_load(f)
                backend_data = config_data.get("backend", {})
            else:
                backend_data = {}
            
            # Default to environment-based configuration
            deployment_mode = DeploymentMode(
                backend_data.get("deployment_mode", os.getenv("AI_DEPLOYMENT_MODE", "monolithic"))
            )
            
            # Configure monolithic model
            monolithic_model = None
            if deployment_mode in [DeploymentMode.MONOLITHIC, DeploymentMode.HYBRID]:
                monolithic_config = backend_data.get("monolithic", {})
                monolithic_model = ModelConfig(
                    name=monolithic_config.get("name", "atlas-financial-3b"),
                    model_path=monolithic_config.get("model_path", "/models/atlas-financial-3b"),
                    endpoint=monolithic_config.get("endpoint", os.getenv("MONOLITHIC_MODEL_ENDPOINT", "http://monolithic-model:8080")),
                    max_tokens=monolithic_config.get("max_tokens", 2048),
                    temperature=monolithic_config.get("temperature", 0.7),
                    batch_size=monolithic_config.get("batch_size", 32),
                    gpu_memory_mb=monolithic_config.get("gpu_memory_mb", 4096),
                    timeout_ms=monolithic_config.get("timeout_ms", 5000)
                )
            
            # Configure multi-agent system
            supervisor_agent = None
            worker_agents = []
            
            if deployment_mode in [DeploymentMode.MULTI_AGENT, DeploymentMode.HYBRID]:
                # Supervisor configuration
                supervisor_config = backend_data.get("supervisor", {})
                supervisor_model = ModelConfig(
                    name=supervisor_config.get("name", "atlas-supervisor-7b"),
                    model_path=supervisor_config.get("model_path", "/models/atlas-supervisor-7b"),
                    endpoint=supervisor_config.get("endpoint", os.getenv("SUPERVISOR_ENDPOINT", "http://supervisor-agent:8080")),
                    max_tokens=supervisor_config.get("max_tokens", 4096),
                    gpu_memory_mb=supervisor_config.get("gpu_memory_mb", 8192)
                )
                
                supervisor_agent = AgentConfig(
                    agent_type=AgentType.SUPERVISOR,
                    model_config=supervisor_model,
                    specialization_params=supervisor_config.get("specialization_params", {
                        "coordination_strategy": "parallel_execution",
                        "quality_threshold": 0.85,
                        "max_agents_per_request": 5
                    })
                )
                
                # Worker agent configurations
                worker_configs = backend_data.get("workers", {})
                
                # Budget Optimizer Agent
                if worker_configs.get("budget_optimizer", {}).get("enabled", True):
                    budget_config = worker_configs.get("budget_optimizer", {})
                    budget_model = ModelConfig(
                        name="atlas-budget-800m",
                        model_path="/models/atlas-budget-800m",
                        endpoint=budget_config.get("endpoint", os.getenv("BUDGET_AGENT_ENDPOINT", "http://budget-agent:8080")),
                        gpu_memory_mb=1024,
                        timeout_ms=3000
                    )
                    
                    worker_agents.append(AgentConfig(
                        agent_type=AgentType.BUDGET_OPTIMIZER,
                        model_config=budget_model,
                        specialization_params={
                            "spending_analysis_depth": "detailed",
                            "category_optimization": True,
                            "anomaly_detection_sensitivity": 0.8
                        }
                    ))
                
                # Investment Analyzer Agent
                if worker_configs.get("investment_analyzer", {}).get("enabled", True):
                    investment_config = worker_configs.get("investment_analyzer", {})
                    investment_model = ModelConfig(
                        name="atlas-investment-800m",
                        model_path="/models/atlas-investment-800m",
                        endpoint=investment_config.get("endpoint", os.getenv("INVESTMENT_AGENT_ENDPOINT", "http://investment-agent:8080")),
                        gpu_memory_mb=1024,
                        timeout_ms=4000
                    )
                    
                    worker_agents.append(AgentConfig(
                        agent_type=AgentType.INVESTMENT_ANALYZER,
                        model_config=investment_model,
                        specialization_params={
                            "portfolio_analysis_depth": "comprehensive",
                            "risk_modeling": "monte_carlo",
                            "rebalancing_frequency": "monthly"
                        }
                    ))
                
                # Debt Strategist Agent
                if worker_configs.get("debt_strategist", {}).get("enabled", True):
                    debt_config = worker_configs.get("debt_strategist", {})
                    debt_model = ModelConfig(
                        name="atlas-debt-600m",
                        model_path="/models/atlas-debt-600m",
                        endpoint=debt_config.get("endpoint", os.getenv("DEBT_AGENT_ENDPOINT", "http://debt-agent:8080")),
                        gpu_memory_mb=768,
                        timeout_ms=3000
                    )
                    
                    worker_agents.append(AgentConfig(
                        agent_type=AgentType.DEBT_STRATEGIST,
                        model_config=debt_model,
                        specialization_params={
                            "strategy_optimization": "interest_minimization",
                            "consolidation_analysis": True,
                            "payment_planning_horizon": 60  # months
                        }
                    ))
                
                # Market Intelligence Agent
                if worker_configs.get("market_intelligence", {}).get("enabled", True):
                    market_config = worker_configs.get("market_intelligence", {})
                    market_model = ModelConfig(
                        name="atlas-market-800m",
                        model_path="/models/atlas-market-800m",
                        endpoint=market_config.get("endpoint", os.getenv("MARKET_AGENT_ENDPOINT", "http://market-agent:8080")),
                        gpu_memory_mb=1024,
                        timeout_ms=2000  # Lower timeout for real-time processing
                    )
                    
                    worker_agents.append(AgentConfig(
                        agent_type=AgentType.MARKET_INTELLIGENCE,
                        model_config=market_model,
                        specialization_params={
                            "real_time_processing": True,
                            "alert_generation": True,
                            "trend_analysis_window": "30d",
                            "correlation_analysis": True
                        }
                    ))
                
                # Goal Planner Agent
                if worker_configs.get("goal_planner", {}).get("enabled", True):
                    goal_config = worker_configs.get("goal_planner", {})
                    goal_model = ModelConfig(
                        name="atlas-goal-600m",
                        model_path="/models/atlas-goal-600m",
                        endpoint=goal_config.get("endpoint", os.getenv("GOAL_AGENT_ENDPOINT", "http://goal-agent:8080")),
                        gpu_memory_mb=768,
                        timeout_ms=3000
                    )
                    
                    worker_agents.append(AgentConfig(
                        agent_type=AgentType.GOAL_PLANNER,
                        model_config=goal_model,
                        specialization_params={
                            "timeline_optimization": True,
                            "milestone_tracking": True,
                            "adaptive_planning": True,
                            "risk_adjustment": "dynamic"
                        }
                    ))
            
            return BackendConfig(
                deployment_mode=deployment_mode,
                monolithic_model=monolithic_model,
                supervisor_agent=supervisor_agent,
                worker_agents=worker_agents,
                load_balancing=backend_data.get("load_balancing", {
                    "strategy": "round_robin",
                    "health_check_interval": 30,
                    "failure_threshold": 3
                }),
                failover_config=backend_data.get("failover", {
                    "enable_auto_failover": True,
                    "fallback_to_monolithic": True,
                    "max_retry_attempts": 3
                })
            )
            
        except Exception as e:
            logger.error(f"Failed to load backend configuration: {e}")
            # Return minimal working configuration
            return BackendConfig(
                deployment_mode=DeploymentMode.MONOLITHIC,
                monolithic_model=ModelConfig(
                    name="default-model",
                    model_path="/models/default",
                    endpoint="http://localhost:8080"
                )
            )
    
    def _load_security_config(self) -> SecurityConfig:
        """Load security configuration"""
        return SecurityConfig(
            jwt_secret_key=os.getenv("JWT_SECRET_KEY", "your-secret-key"),
            supertokens_connection_uri=os.getenv("SUPERTOKENS_CONNECTION_URI", "http://supertokens:3567"),
            enable_rate_limiting=os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true",
            rate_limit_requests_per_minute=int(os.getenv("RATE_LIMIT_RPM", "100")),
            enable_request_logging=os.getenv("ENABLE_REQUEST_LOGGING", "true").lower() == "true",
            encrypt_context_data=os.getenv("ENCRYPT_CONTEXT_DATA", "true").lower() == "true",
            allowed_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
            require_https=os.getenv("REQUIRE_HTTPS", "false").lower() == "true"
        )
    
    def _load_performance_config(self) -> PerformanceConfig:
        """Load performance configuration"""
        return PerformanceConfig(
            max_concurrent_requests=int(os.getenv("MAX_CONCURRENT_REQUESTS", "100")),
            request_timeout_ms=int(os.getenv("REQUEST_TIMEOUT_MS", "10000")),
            context_cache_ttl_seconds=int(os.getenv("CONTEXT_CACHE_TTL", "3600")),
            result_cache_ttl_seconds=int(os.getenv("RESULT_CACHE_TTL", "300")),
            enable_request_batching=os.getenv("ENABLE_REQUEST_BATCHING", "true").lower() == "true",
            batch_size=int(os.getenv("BATCH_SIZE", "10")),
            batch_timeout_ms=int(os.getenv("BATCH_TIMEOUT_MS", "100")),
            enable_connection_pooling=os.getenv("ENABLE_CONNECTION_POOLING", "true").lower() == "true",
            connection_pool_size=int(os.getenv("CONNECTION_POOL_SIZE", "20"))
        )
    
    def _load_monitoring_config(self) -> MonitoringConfig:
        """Load monitoring configuration"""
        return MonitoringConfig(
            enable_prometheus_metrics=os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true",
            enable_distributed_tracing=os.getenv("ENABLE_TRACING", "true").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            metrics_port=int(os.getenv("METRICS_PORT", "9090")),
            health_check_interval_seconds=int(os.getenv("HEALTH_CHECK_INTERVAL", "30")),
            alert_thresholds={
                "response_time_ms": float(os.getenv("ALERT_RESPONSE_TIME_MS", "500")),
                "error_rate": float(os.getenv("ALERT_ERROR_RATE", "0.05")),
                "cpu_usage": float(os.getenv("ALERT_CPU_USAGE", "0.8")),
                "memory_usage": float(os.getenv("ALERT_MEMORY_USAGE", "0.8"))
            }
        )
    
    def _load_ab_test_config(self) -> ABTestConfig:
        """Load A/B testing configuration"""
        return ABTestConfig(
            enabled=os.getenv("AB_TESTING_ENABLED", "false").lower() == "true",
            test_configs=[],  # Loaded from database or external config
            traffic_allocation={
                "monolithic": float(os.getenv("AB_MONOLITHIC_TRAFFIC", "0.5")),
                "multi_agent": float(os.getenv("AB_MULTI_AGENT_TRAFFIC", "0.5"))
            },
            success_metrics=["response_time", "accuracy", "user_satisfaction"],
            duration_days=int(os.getenv("AB_TEST_DURATION_DAYS", "14"))
        )
    
    def _validate_config(self):
        """Validate configuration consistency"""
        try:
            # Validate deployment mode consistency
            if self.backend_config.deployment_mode == DeploymentMode.MONOLITHIC:
                if not self.backend_config.monolithic_model:
                    raise ValueError("Monolithic deployment mode requires monolithic model configuration")
            
            elif self.backend_config.deployment_mode == DeploymentMode.MULTI_AGENT:
                if not self.backend_config.supervisor_agent:
                    raise ValueError("Multi-agent deployment mode requires supervisor agent configuration")
                if not self.backend_config.worker_agents:
                    raise ValueError("Multi-agent deployment mode requires at least one worker agent")
            
            elif self.backend_config.deployment_mode == DeploymentMode.HYBRID:
                if not self.backend_config.monolithic_model or not self.backend_config.supervisor_agent:
                    raise ValueError("Hybrid deployment mode requires both monolithic and multi-agent configurations")
            
            # Validate resource requirements
            total_gpu_memory = 0
            if self.backend_config.monolithic_model:
                total_gpu_memory += self.backend_config.monolithic_model.gpu_memory_mb
            
            if self.backend_config.supervisor_agent:
                total_gpu_memory += self.backend_config.supervisor_agent.model_config.gpu_memory_mb
            
            for worker in self.backend_config.worker_agents:
                total_gpu_memory += worker.model_config.gpu_memory_mb
            
            max_gpu_memory = int(os.getenv("MAX_GPU_MEMORY_MB", "16384"))  # 16GB default
            if total_gpu_memory > max_gpu_memory:
                logger.warning(f"Total GPU memory requirement ({total_gpu_memory}MB) exceeds limit ({max_gpu_memory}MB)")
            
            logger.info("Configuration validation passed")
            
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            raise
    
    def get_active_model_endpoints(self) -> Dict[str, str]:
        """Get all active model endpoints for health checking"""
        endpoints = {}
        
        if self.backend_config.monolithic_model:
            endpoints["monolithic"] = self.backend_config.monolithic_model.endpoint
        
        if self.backend_config.supervisor_agent:
            endpoints["supervisor"] = self.backend_config.supervisor_agent.model_config.endpoint
        
        for worker in self.backend_config.worker_agents:
            endpoints[worker.agent_type.value] = worker.model_config.endpoint
        
        return endpoints
    
    def get_agent_config(self, agent_type: AgentType) -> Optional[AgentConfig]:
        """Get configuration for specific agent type"""
        if agent_type == AgentType.SUPERVISOR:
            return self.backend_config.supervisor_agent
        
        for worker in self.backend_config.worker_agents:
            if worker.agent_type == agent_type:
                return worker
        
        return None
    
    def is_agent_enabled(self, agent_type: AgentType) -> bool:
        """Check if specific agent type is enabled"""
        config = self.get_agent_config(agent_type)
        return config is not None and config.enabled
    
    def export_config(self) -> Dict[str, Any]:
        """Export configuration for debugging/monitoring"""
        return {
            "deployment_mode": self.backend_config.deployment_mode.value,
            "active_endpoints": self.get_active_model_endpoints(),
            "enabled_agents": [
                agent.agent_type.value
                for agent in self.backend_config.worker_agents
                if agent.enabled
            ],
            "performance_limits": {
                "max_concurrent_requests": self.performance_config.max_concurrent_requests,
                "request_timeout_ms": self.performance_config.request_timeout_ms
            },
            "security_enabled": {
                "rate_limiting": self.security_config.enable_rate_limiting,
                "request_logging": self.security_config.enable_request_logging,
                "context_encryption": self.security_config.encrypt_context_data
            }
        }


# Global configuration instance
_config_instance: Optional[FlexibleConfig] = None


def get_config() -> FlexibleConfig:
    """Get global configuration instance"""
    global _config_instance
    if _config_instance is None:
        _config_instance = FlexibleConfig()
    return _config_instance


def reload_config(config_path: Optional[str] = None) -> FlexibleConfig:
    """Reload configuration (useful for testing or configuration updates)"""
    global _config_instance
    _config_instance = FlexibleConfig(config_path)
    return _config_instance