#!/usr/bin/env python3
"""
Atlas Financial AI Engine v2.0 - Phase 2.5 Validation Script
Validates that architectural violations have been eliminated
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Dict, Any, List
import json

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def print_header(title: str):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_section(title: str):
    """Print formatted section"""
    print(f"\n{'-'*40}")
    print(f" {title}")
    print(f"{'-'*40}")

def print_success(message: str):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message: str):
    """Print error message"""
    print(f"❌ {message}")

def print_warning(message: str):
    """Print warning message"""
    print(f"⚠️  {message}")

def print_info(message: str):
    """Print info message"""
    print(f"ℹ️  {message}")

async def validate_configuration():
    """Validate configuration integration"""
    print_section("Configuration Validation")

    try:
        from src.config.atlas_config_bridge import get_atlas_config, ATLAS_SHARED_AVAILABLE

        if ATLAS_SHARED_AVAILABLE:
            print_success("Atlas-shared configuration integration available")
        else:
            print_warning("Atlas-shared configuration not available - using fallback")

        config = get_atlas_config()
        consolidated_config = config.get_consolidated_config()

        # Validate key configuration elements
        required_sections = ['environment', 'api', 'auth', 'architectural_compliance']
        for section in required_sections:
            if section in consolidated_config:
                print_success(f"Configuration section '{section}' present")
            else:
                print_error(f"Missing configuration section '{section}'")
                return False

        # Validate architectural compliance
        compliance = consolidated_config['architectural_compliance']
        if compliance.get('direct_db_access') is False:
            print_success("No direct database access configured")
        else:
            print_error("Direct database access detected - architectural violation")
            return False

        if compliance.get('service_boundaries') == 'api-gateway':
            print_success("API Gateway service boundaries configured")
        else:
            print_error("API Gateway service boundaries not configured")
            return False

        if compliance.get('authentication') == 'supertokens':
            print_success("SuperTokens authentication configured")
        else:
            print_error("SuperTokens authentication not properly configured")
            return False

        if compliance.get('error_handling') == 'atlas-shared':
            print_success("Atlas-shared error handling configured")
        else:
            print_error("Atlas-shared error handling not configured")
            return False

        print_success("Configuration validation passed")
        return True

    except Exception as e:
        print_error(f"Configuration validation failed: {e}")
        return False

async def validate_service_boundaries():
    """Validate service boundaries implementation"""
    print_section("Service Boundaries Validation")

    try:
        from src.services.service_registry_v2 import ServiceRegistryV2

        registry = ServiceRegistryV2()

        # Check required services
        required_services = ['api-gateway', 'supertokens-core']
        for service in required_services:
            if service in registry.services:
                print_success(f"Required service '{service}' registered")
            else:
                print_error(f"Required service '{service}' not registered")
                return False

        # Get service boundaries information
        boundary_info = registry.get_service_boundaries_info()

        if boundary_info['registry_version'] == '2.0.0':
            print_success("Service registry v2.0 active")
        else:
            print_error("Service registry version mismatch")
            return False

        if boundary_info['phase'] == 'phase-2.5':
            print_success("Phase 2.5 architectural compliance")
        else:
            print_warning("Phase identifier not set correctly")

        # Validate compliance markers
        compliance = boundary_info['compliance']
        compliance_checks = [
            ('direct_db_access', False, "No direct database access"),
            ('service_isolation', True, "Service isolation enabled"),
            ('proper_authentication', True, "Proper authentication enabled")
        ]

        for key, expected, description in compliance_checks:
            if compliance.get(key) == expected:
                print_success(description)
            else:
                print_error(f"Compliance check failed: {description}")
                return False

        print_success("Service boundaries validation passed")
        return True

    except Exception as e:
        print_error(f"Service boundaries validation failed: {e}")
        return False

async def validate_error_handling():
    """Validate error handling patterns"""
    print_section("Error Handling Validation")

    try:
        from src.errors import (
            AtlasError,
            AuthenticationError,
            AuthorizationError,
            ExternalServiceError,
            handleError,
            ErrorFactory
        )

        # Test AtlasError base class
        error = AtlasError("Test", "TEST", "test", 400, False, ["suggestion"], {"meta": "data"})

        # Validate error structure
        required_methods = ['toJSON', 'toApiResponse']
        for method in required_methods:
            if hasattr(error, method):
                print_success(f"AtlasError has required method '{method}'")
            else:
                print_error(f"AtlasError missing method '{method}'")
                return False

        # Test JSON serialization
        error_json = error.toJSON()
        required_fields = ['name', 'code', 'category', 'statusCode', 'isRetryable', 'suggestions', 'metadata']
        for field in required_fields:
            if field in error_json:
                print_success(f"Error JSON includes field '{field}'")
            else:
                print_error(f"Error JSON missing field '{field}'")
                return False

        # Test specific error types
        auth_error = AuthenticationError("Test auth error")
        if auth_error.code == 'AUTH_FAILED' and auth_error.statusCode == 401:
            print_success("AuthenticationError properly configured")
        else:
            print_error("AuthenticationError configuration incorrect")
            return False

        external_error = ExternalServiceError("test-service", "Test error")
        if external_error.isRetryable and external_error.statusCode == 502:
            print_success("ExternalServiceError properly configured")
        else:
            print_error("ExternalServiceError configuration incorrect")
            return False

        print_success("Error handling validation passed")
        return True

    except Exception as e:
        print_error(f"Error handling validation failed: {e}")
        return False

async def validate_authentication():
    """Validate authentication integration"""
    print_section("Authentication Validation")

    try:
        from src.auth.jwt_validator import JWTValidator

        # Test JWT validator initialization
        validator = JWTValidator("test_secret", "http://test:3567")

        if validator.jwt_secret == "test_secret":
            print_success("JWT validator properly configured")
        else:
            print_error("JWT validator configuration incorrect")
            return False

        if validator.supertokens_core_url == "http://test:3567":
            print_success("SuperTokens core URL configured")
        else:
            print_error("SuperTokens core URL not configured")
            return False

        # Test that validator has required methods
        required_methods = ['verify_jwt_token', 'validate_session', 'revoke_session']
        for method in required_methods:
            if hasattr(validator, method):
                print_success(f"JWT validator has method '{method}'")
            else:
                print_error(f"JWT validator missing method '{method}'")
                return False

        print_success("Authentication validation passed")
        return True

    except Exception as e:
        print_error(f"Authentication validation failed: {e}")
        return False

async def validate_containerization():
    """Validate containerization support"""
    print_section("Containerization Validation")

    # Check for Docker files
    docker_files = [
        Path(__file__).parent / 'Dockerfile.v2',
        Path(__file__).parent / 'docker-compose.ai-engine-v2.yml'
    ]

    for docker_file in docker_files:
        if docker_file.exists():
            print_success(f"Docker file exists: {docker_file.name}")
        else:
            print_error(f"Docker file missing: {docker_file.name}")
            return False

    # Check Dockerfile.v2 content
    dockerfile_v2 = Path(__file__).parent / 'Dockerfile.v2'
    if dockerfile_v2.exists():
        content = dockerfile_v2.read_text()

        required_elements = [
            'FROM python:3.11-slim',  # Base image
            'API_GATEWAY_URL',  # API gateway config
            'SUPERTOKENS_CORE_URL',  # SuperTokens config
            'JWT_SECRET',  # Authentication
            'atlas',  # Non-root user
            'HEALTHCHECK',  # Health check
        ]

        for element in required_elements:
            if element in content:
                print_success(f"Dockerfile contains: {element}")
            else:
                print_error(f"Dockerfile missing: {element}")
                return False

    print_success("Containerization validation passed")
    return True

async def validate_api_client():
    """Validate API client implementation"""
    print_section("API Client Validation")

    try:
        from src.clients.api_client import AtlasApiClient, create_api_client

        # Test API client creation
        client = create_api_client()

        if isinstance(client, AtlasApiClient):
            print_success("API client created successfully")
        else:
            print_error("API client creation failed")
            return False

        # Test that client has required methods
        required_methods = [
            'get_user_financial_data',
            'get_user_accounts',
            'get_user_transactions',
            'get_user_debt_data',
            'get_user_portfolio_data',
            'store_user_insights',
            'health_check'
        ]

        for method in required_methods:
            if hasattr(client, method):
                print_success(f"API client has method '{method}'")
            else:
                print_error(f"API client missing method '{method}'")
                return False

        print_success("API client validation passed")
        return True

    except Exception as e:
        print_error(f"API client validation failed: {e}")
        return False

async def main():
    """Main validation function"""
    print_header("Atlas Financial AI Engine v2.0 - Phase 2.5 Validation")
    print_info("Validating architectural violation elimination...")

    validation_functions = [
        ("Configuration Integration", validate_configuration),
        ("Service Boundaries", validate_service_boundaries),
        ("Error Handling", validate_error_handling),
        ("Authentication", validate_authentication),
        ("Containerization", validate_containerization),
        ("API Client", validate_api_client)
    ]

    results = {}
    all_passed = True

    for name, validation_func in validation_functions:
        try:
            result = await validation_func()
            results[name] = result
            if not result:
                all_passed = False
        except Exception as e:
            print_error(f"{name} validation error: {e}")
            results[name] = False
            all_passed = False

    # Print summary
    print_header("Validation Summary")

    for name, result in results.items():
        if result:
            print_success(f"{name}: PASSED")
        else:
            print_error(f"{name}: FAILED")

    print(f"\nOverall Result: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")

    if all_passed:
        print_success("Phase 2.5 architectural violations have been eliminated!")
        print_info("AI CFO system now follows established patterns:")
        print_info("  - Uses API gateway instead of direct DB access")
        print_info("  - Implements standard SuperTokens authentication")
        print_info("  - Uses atlas-shared error handling patterns")
        print_info("  - Supports containerized deployment")
        print_info("  - Maintains proper service boundaries")
    else:
        print_error("Some validation checks failed - review issues above")
        return 1

    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
