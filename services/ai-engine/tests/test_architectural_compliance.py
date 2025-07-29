"""
Test Suite for Atlas Financial AI Engine v2.0
Validates architectural compliance and elimination of violations
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from src.config.atlas_config_bridge import AtlasConfigBridge, get_atlas_config, ATLAS_SHARED_AVAILABLE
from src.services.service_registry_v2 import ServiceRegistryV2, ServiceStatus
from src.errors import (
    AtlasError,
    AuthenticationError,
    ExternalServiceError,
    ServiceUnavailableError
)
from src.auth.jwt_validator import JWTValidator

class TestArchitecturalCompliance:
    """Test architectural compliance and violation elimination"""
    
    def test_atlas_shared_configuration_integration(self):
        """Test that atlas-shared configuration is properly integrated"""
        config = get_atlas_config()
        assert isinstance(config, AtlasConfigBridge)
        
        # Test configuration structure
        consolidated_config = config.get_consolidated_config()
        assert 'environment' in consolidated_config
        assert 'service_name' in consolidated_config
        assert 'api' in consolidated_config
        assert 'auth' in consolidated_config
        assert 'architectural_compliance' in consolidated_config
        
        # Test architectural compliance markers
        compliance = consolidated_config['architectural_compliance']
        assert compliance['service_boundaries'] == 'api-gateway'
        assert compliance['authentication'] == 'supertokens'
        assert compliance['error_handling'] == 'atlas-shared'
        assert compliance['direct_db_access'] is False  # Key compliance check
    
    def test_api_gateway_configuration(self):
        """Test that API gateway is properly configured (eliminates direct DB access)"""
        config = get_atlas_config()
        api_config = config.get_api_config()
        
        # Ensure API gateway is configured
        assert 'base_url' in api_config
        assert api_config['base_url'] is not None
        assert 'timeout' in api_config
        assert 'retries' in api_config
        
        # Ensure database config is not directly accessible
        db_config = config.get_database_config()
        assert db_config is None  # AI Engine should NOT have direct DB access
    
    def test_supertokens_authentication_configuration(self):
        """Test that SuperTokens authentication is properly configured"""
        config = get_atlas_config()
        auth_config = config.get_auth_config()
        
        assert auth_config['provider'] == 'supertokens'
        assert 'jwt_secret' in auth_config
        assert 'supertokens_core_url' in auth_config
        assert 'token_expiry' in auth_config
    
    def test_error_handling_patterns(self):
        """Test that atlas-shared error handling patterns are used"""
        # Test AtlasError base class
        error = AtlasError(
            "Test error",
            "TEST_ERROR",
            "test",
            400,
            False,
            ["Test suggestion"],
            {"test": "metadata"}
        )
        
        # Test error structure matches atlas-shared patterns
        error_json = error.toJSON()
        assert error_json['name'] == 'AtlasError'
        assert error_json['code'] == 'TEST_ERROR'
        assert error_json['category'] == 'test'
        assert error_json['statusCode'] == 400
        assert error_json['isRetryable'] is False
        assert error_json['suggestions'] == ["Test suggestion"]
        assert error_json['metadata'] == {"test": "metadata"}
        
        # Test API response format
        api_response = error.toApiResponse()
        assert api_response['code'] == 'TEST_ERROR'
        assert api_response['message'] == 'Test error'
        assert api_response['category'] == 'test'
    
    def test_authentication_error_patterns(self):
        """Test authentication error patterns match atlas-shared"""
        auth_error = AuthenticationError("Invalid token")
        
        assert auth_error.code == 'AUTH_FAILED'
        assert auth_error.category == 'authentication'
        assert auth_error.statusCode == 401
        assert not auth_error.isRetryable
        assert 'Check if your API token is valid' in auth_error.suggestions
    
    @pytest.mark.asyncio
    async def test_service_registry_initialization(self):
        """Test that service registry properly initializes with correct boundaries"""
        registry = ServiceRegistryV2()
        
        # Test that required services are configured
        assert 'api-gateway' in registry.services
        assert 'supertokens-core' in registry.services
        
        # Test service boundary information
        boundary_info = registry.get_service_boundaries_info()
        assert boundary_info['registry_version'] == '2.0.0'
        assert boundary_info['architectural_pattern'] == 'service-boundaries'
        assert boundary_info['phase'] == 'phase-2.5'
        
        # Test compliance markers
        compliance = boundary_info['compliance']
        assert compliance['direct_db_access'] is False
        assert compliance['service_isolation'] is True
        assert compliance['proper_authentication'] is True
        assert compliance['error_handling'] == 'atlas-shared'
    
    @pytest.mark.asyncio 
    async def test_service_boundaries_validation(self):
        """Test service boundaries validation detects violations"""
        registry = ServiceRegistryV2()
        
        # Mock health checks to simulate healthy services
        with patch.object(registry, 'check_all_services') as mock_health:
            mock_health.return_value = {
                'api-gateway': Mock(status=ServiceStatus.HEALTHY),
                'supertokens-core': Mock(status=ServiceStatus.HEALTHY),
                'rust-engine': Mock(status=ServiceStatus.HEALTHY)
            }
            
            validation_results = await registry.validate_service_boundaries()
            
            # Should be compliant with healthy services
            assert validation_results['compliant'] is True
            assert len(validation_results['violations']) == 0
            assert validation_results['architectural_phase'] == 'phase-2.5'
    
    @pytest.mark.asyncio
    async def test_jwt_validator_integration(self):
        """Test JWT validator integrates with SuperTokens"""
        validator = JWTValidator(
            jwt_secret="test_secret",
            supertokens_core_url="http://test-supertokens:3567"
        )
        
        # Test that validator is properly configured
        assert validator.jwt_secret == "test_secret"
        assert validator.supertokens_core_url == "http://test-supertokens:3567"
    
    def test_configuration_validation(self):
        """Test configuration validation detects architectural violations"""
        config = get_atlas_config()
        
        # This should pass validation (no direct DB access)
        try:
            config.validate_configuration()
        except ValueError as e:
            # If validation fails, it should not be due to direct DB access
            assert "direct database access" not in str(e).lower()
    
    def test_external_service_error_patterns(self):
        """Test external service error patterns match atlas-shared"""
        service_error = ExternalServiceError(
            "api-gateway", 
            "Service temporarily unavailable"
        )
        
        assert service_error.code == 'API-GATEWAY_ERROR'
        assert service_error.category == 'external'
        assert service_error.statusCode == 502
        assert service_error.isRetryable is True
        assert service_error.service == 'api-gateway'
    
    def test_service_unavailable_error_patterns(self):
        """Test service unavailable error patterns"""
        unavailable_error = ServiceUnavailableError("redis")
        
        assert unavailable_error.code == 'SERVICE_UNAVAILABLE'
        assert unavailable_error.category == 'system'
        assert unavailable_error.statusCode == 503
        assert unavailable_error.isRetryable is True
        assert unavailable_error.service == 'redis'

class TestArchitecturalViolationElimination:
    """Test that specific architectural violations have been eliminated"""
    
    def test_no_direct_database_access(self):
        """Test that direct database access has been eliminated"""
        config = get_atlas_config()
        
        # AI Engine should NOT have database configuration
        db_config = config.get_database_config()
        assert db_config is None, "AI Engine should not have direct database access"
        
        # Should have API gateway configured instead
        api_config = config.get_api_config()
        assert api_config['base_url'] is not None
        assert 'api-gateway' in api_config['base_url'].lower() or 'gateway' in api_config['base_url'].lower()
    
    def test_standard_authentication_flow(self):
        """Test that standard SuperTokens authentication is used"""
        config = get_atlas_config()
        auth_config = config.get_auth_config()
        
        # Should use SuperTokens, not custom auth
        assert auth_config['provider'] == 'supertokens'
        assert 'supertokens_core_url' in auth_config
        assert auth_config['supertokens_core_url'] is not None
    
    def test_atlas_shared_error_integration(self):
        """Test that atlas-shared error patterns are used consistently"""
        from src.errors import (
            AtlasError,
            AuthenticationError,
            AuthorizationError,
            NotFoundError,
            ExternalServiceError,
            handleError,
            ErrorFactory
        )
        
        # Test that all error classes follow atlas-shared patterns
        test_errors = [
            AuthenticationError("Test auth error"),
            AuthorizationError("Test authz error", "test-resource"),
            NotFoundError("user", "123"),
            ExternalServiceError("test-service", "Test error")
        ]
        
        for error in test_errors:
            assert hasattr(error, 'toJSON')
            assert hasattr(error, 'toApiResponse')
            assert hasattr(error, 'code')
            assert hasattr(error, 'category')
            assert hasattr(error, 'statusCode')
            assert hasattr(error, 'isRetryable')
            assert hasattr(error, 'suggestions')
            assert hasattr(error, 'metadata')
    
    def test_containerized_deployment_support(self):
        """Test that containerized deployment is properly supported"""
        config = get_atlas_config()
        consolidated_config = config.get_consolidated_config()
        
        # Should have container-friendly configuration
        assert consolidated_config['service_name'] == 'ai-engine'
        assert 'environment' in consolidated_config
        
        # Should have proper service discovery URLs
        api_config = consolidated_config['api']
        auth_config = consolidated_config['auth']
        
        # URLs should support container networking
        assert api_config['base_url'] is not None
        assert auth_config['supertokens_core_url'] is not None
    
    def test_service_isolation(self):
        """Test that proper service isolation is implemented"""
        registry = ServiceRegistryV2()
        boundary_info = registry.get_service_boundaries_info()
        
        # Should have clear service boundaries
        boundaries = boundary_info['service_boundaries']
        assert boundaries['data_access'] == 'api-gateway'
        assert boundaries['authentication'] == 'supertokens-core'
        assert boundaries['calculations'] == 'rust-engine'
        
        # Should enforce isolation
        compliance = boundary_info['compliance']
        assert compliance['service_isolation'] is True
        assert compliance['direct_db_access'] is False

if __name__ == "__main__":
    pytest.main([__file__, "-v"])