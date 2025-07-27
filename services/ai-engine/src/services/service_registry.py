"""Service registry for dependency management"""
import structlog
from typing import Optional

from ..config import Settings
from ..ai.insights_generator import InsightsGenerator
from ..data.hasura_client import HasuraClient
from ..ai.financial_rules import FinancialRulesEngine

logger = structlog.get_logger()

class ServiceRegistry:
    """Singleton service registry for managing application dependencies"""
    
    _instance: Optional['ServiceRegistry'] = None
    
    def __init__(self):
        self.config: Optional[Settings] = None
        self.hasura_client: Optional[HasuraClient] = None
        self.insights_generator: Optional[InsightsGenerator] = None
        self.rules_engine: Optional[FinancialRulesEngine] = None
        self._initialized = False
    
    @classmethod
    def get_instance(cls) -> 'ServiceRegistry':
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def initialize(self, config: Settings):
        """Initialize all services"""
        if self._initialized:
            logger.warning("Services already initialized")
            return
        
        logger.info("Initializing services", version="1.1.0")
        
        try:
            self.config = config
            
            # Initialize Hasura client
            self.hasura_client = HasuraClient(
                endpoint=config.hasura_endpoint,
                admin_secret=config.hasura_admin_secret
            )
            
            # Initialize rules engine
            self.rules_engine = FinancialRulesEngine()
            
            # Initialize insights generator
            self.insights_generator = InsightsGenerator(
                model_path=config.ai_model_path,
                rules_engine=self.rules_engine
            )
            
            # Load AI model
            await self.insights_generator.initialize()
            
            self._initialized = True
            logger.info("All services initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize services", error=str(e))
            await self.cleanup()
            raise
    
    async def cleanup(self):
        """Cleanup all services"""
        logger.info("Cleaning up services")
        
        if self.insights_generator:
            try:
                await self.insights_generator.cleanup()
            except Exception as e:
                logger.error("Failed to cleanup insights generator", error=str(e))
        
        self._initialized = False
        logger.info("Service cleanup complete")
    
    def is_initialized(self) -> bool:
        """Check if services are initialized"""
        return self._initialized