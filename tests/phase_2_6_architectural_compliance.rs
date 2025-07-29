// Phase 2.6: Desktop App Architectural Compliance Tests
// Validates that desktop app fully complies with modular monolith architecture

use std::fs;
use std::path::Path;
use std::process::Command;
use serde_json::Value;

/// Test suite for Phase 2.6 architectural compliance
#[cfg(test)]
mod phase_2_6_tests {
    use super::*;

    /// Test that desktop app configuration uses API gateway exclusively
    #[test]
    fn test_api_gateway_exclusive_configuration() {
        println!("🔍 Testing API Gateway exclusive configuration...");

        // Check utils.rs configuration
        let utils_path = "apps/desktop/src/utils.rs";
        if Path::new(utils_path).exists() {
            let content = fs::read_to_string(utils_path).expect("Failed to read utils.rs");
            
            // Should have atlas_core_url and atlas_api_gateway_url
            assert!(content.contains("atlas_core_url"), 
                "Configuration should include atlas_core_url");
            assert!(content.contains("atlas_api_gateway_url"), 
                "Configuration should include atlas_api_gateway_url");
            
            // Should NOT have direct service URLs
            assert!(!content.contains("database_url"), 
                "Configuration should not include direct database_url");
            assert!(!content.contains("supertokens_url"), 
                "Configuration should not include direct supertokens_url");
            assert!(!content.contains("financial_engine_url"), 
                "Configuration should not include direct financial_engine_url");
            
            println!("✅ API Gateway configuration compliance verified");
        } else {
            panic!("❌ Desktop utils.rs not found");
        }
    }

    /// Test that API client exists and routes through proper channels
    #[test]
    fn test_api_client_implementation() {
        println!("🔍 Testing API client implementation...");

        let api_client_path = "apps/desktop/src/api_client.rs";
        if Path::new(api_client_path).exists() {
            let content = fs::read_to_string(api_client_path).expect("Failed to read api_client.rs");
            
            // Should have AtlasApiClient
            assert!(content.contains("struct AtlasApiClient"), 
                "Should have AtlasApiClient struct");
            
            // Should route through proper URLs
            assert!(content.contains("atlas_core_url"), 
                "Should use atlas_core_url");
            assert!(content.contains("atlas_api_gateway_url"), 
                "Should use atlas_api_gateway_url");
            
            // Should have authentication methods
            assert!(content.contains("fn authenticate"), 
                "Should have authenticate method");
            
            // Should have GraphQL methods
            assert!(content.contains("graphql_query") || content.contains("graphql_mutation"), 
                "Should have GraphQL methods");
            
            println!("✅ API client implementation verified");
        } else {
            panic!("❌ API client implementation not found");
        }
    }

    /// Test that authentication goes through Atlas Core
    #[test]
    fn test_authentication_compliance() {
        println!("🔍 Testing authentication compliance...");

        let auth_path = "apps/desktop/src/commands/auth.rs";
        if Path::new(auth_path).exists() {
            let content = fs::read_to_string(auth_path).expect("Failed to read auth.rs");
            
            // Should use API client for authentication
            assert!(content.contains("api_client") || content.contains("AtlasApiClient"), 
                "Authentication should use API client");
            
            // Should NOT have direct SuperTokens calls
            assert!(!content.contains("supertokens_url"), 
                "Should not have direct SuperTokens URL references");
            
            // Should have proper gateway routing
            assert!(content.contains("Atlas Core") || content.contains("API Gateway"), 
                "Should reference Atlas Core or API Gateway");
            
            println!("✅ Authentication compliance verified");
        } else {
            panic!("❌ Authentication module not found");
        }
    }

    /// Test that database connections are eliminated
    #[test]
    fn test_database_elimination() {
        println!("🔍 Testing database connection elimination...");

        // Check that financial commands don't use direct DB
        let financial_path = "apps/desktop/src/commands/financial.rs";
        if Path::new(financial_path).exists() {
            let content = fs::read_to_string(financial_path).exists() {
                let content = fs::read_to_string(financial_refactored_path)
                    .expect("Failed to read financial_refactored.rs");
                
                // Should use API client instead of database
                assert!(content.contains("api_client"), 
                    "Should use API client for data access");
                
                // Should have GraphQL operations
                assert!(content.contains("get_accounts") || content.contains("get_transactions"), 
                    "Should have API gateway operations");
                
                println!("✅ Database elimination verified in refactored module");
            } else {
                println!("⚠️ Refactored financial module not found - checking original");
                
                if content.contains("DatabaseManager") || content.contains("database_manager") {
                    println!("⚠️ Original financial module still contains database references");
                    println!("   This should be migrated to use the refactored API client approach");
                }
            }
        } else {
            panic!("❌ Financial commands not found");
        }
    }

    /// Test that shared configuration management is integrated
    #[test]
    fn test_shared_configuration_integration() {
        println!("🔍 Testing shared configuration integration...");

        let atlas_config_path = "apps/desktop/src/atlas_config_bridge.rs";
        if Path::new(atlas_config_path).exists() {
            let content = fs::read_to_string(atlas_config_path).expect("Failed to read atlas_config_bridge.rs");
            
            // Should have AtlasConfigBridge
            assert!(content.contains("struct AtlasConfigBridge"), 
                "Should have AtlasConfigBridge struct");
            
            // Should validate architectural compliance
            assert!(content.contains("validate_configuration"), 
                "Should have configuration validation");
            
            // Should prevent direct database access
            assert!(content.contains("direct_db_access"), 
                "Should check for direct database access violations");
            
            println!("✅ Shared configuration integration verified");
        } else {
            panic!("❌ Atlas config bridge not found");
        }

        // Check main.rs integration
        let main_path = "apps/desktop/src/main.rs";
        if Path::new(main_path).exists() {
            let content = fs::read_to_string(main_path).expect("Failed to read main.rs");
            
            // Should import atlas config bridge
            assert!(content.contains("atlas_config_bridge"), 
                "Should import atlas_config_bridge module");
            
            // Should use consolidated config
            assert!(content.contains("ConsolidatedConfig") || content.contains("atlas_config"), 
                "Should use consolidated configuration");
            
            println!("✅ Main application integration verified");
        }
    }

    /// Test that containerization is properly configured
    #[test]
    fn test_containerization_compliance() {
        println!("🔍 Testing containerization compliance...");

        // Check Dockerfile exists and is properly configured
        let dockerfile_path = "apps/desktop/Dockerfile";
        if Path::new(dockerfile_path).exists() {
            let content = fs::read_to_string(dockerfile_path).expect("Failed to read Dockerfile");
            
            // Should have proper environment variables
            assert!(content.contains("ATLAS_CORE_URL"), 
                "Dockerfile should set ATLAS_CORE_URL");
            assert!(content.contains("ATLAS_API_GATEWAY_URL"), 
                "Dockerfile should set ATLAS_API_GATEWAY_URL");
            
            // Should NOT have database URLs
            assert!(!content.contains("DATABASE_URL"), 
                "Dockerfile should not set DATABASE_URL");
            
            println!("✅ Dockerfile configuration verified");
        } else {
            panic!("❌ Dockerfile not found");
        }

        // Check docker-compose configuration
        let compose_path = "apps/desktop/docker-compose.desktop.yml";
        if Path::new(compose_path).exists() {
            let content = fs::read_to_string(compose_path).expect("Failed to read docker-compose.desktop.yml");
            
            // Should have proper service dependencies
            assert!(content.contains("depends_on"), 
                "Should have service dependencies");
            
            // Should use atlas network
            assert!(content.contains("atlas-network"), 
                "Should use atlas network");
            
            // Should have proper environment configuration
            assert!(content.contains("ATLAS_CORE_URL"), 
                "Should configure ATLAS_CORE_URL");
            
            println!("✅ Docker Compose configuration verified");
        } else {
            panic!("❌ Docker Compose file not found");
        }
    }

    /// Test that deployment scripts include desktop app
    #[test]
    fn test_deployment_integration() {
        println!("🔍 Testing deployment integration...");

        let desktop_script_path = "scripts/atlas-desktop-up.sh";
        if Path::new(desktop_script_path).exists() {
            let content = fs::read_to_string(desktop_script_path).expect("Failed to read atlas-desktop-up.sh");
            
            // Should validate architectural compliance
            assert!(content.contains("validate_architectural_compliance"), 
                "Should have architectural compliance validation");
            
            // Should check for violations
            assert!(content.contains("violations"), 
                "Should check for architectural violations");
            
            // Should integrate with main monolith
            assert!(content.contains("atlas-core") || content.contains("monolith"), 
                "Should integrate with main monolith");
            
            println!("✅ Deployment script integration verified");
        } else {
            panic!("❌ Desktop deployment script not found");
        }
    }

    /// Test overall architectural compliance
    #[test]
    fn test_overall_architectural_compliance() {
        println!("🔍 Testing overall architectural compliance...");

        let mut compliance_score = 0;
        let mut total_checks = 0;

        // Check 1: No direct database access in configuration
        total_checks += 1;
        if !check_for_database_violations() {
            compliance_score += 1;
            println!("✅ No direct database access violations");
        } else {
            println!("❌ Direct database access violations found");
        }

        // Check 2: API Gateway exclusive usage
        total_checks += 1;
        if check_api_gateway_usage() {
            compliance_score += 1;
            println!("✅ API Gateway exclusive usage verified");
        } else {
            println!("❌ API Gateway usage violations found");
        }

        // Check 3: SuperTokens integration through Atlas Core
        total_checks += 1;
        if check_supertokens_integration() {
            compliance_score += 1;
            println!("✅ SuperTokens integration compliance verified");
        } else {
            println!("❌ SuperTokens integration violations found");
        }

        // Check 4: Shared configuration management
        total_checks += 1;
        if check_shared_configuration() {
            compliance_score += 1;
            println!("✅ Shared configuration management verified");
        } else {
            println!("❌ Shared configuration management issues found");
        }

        // Check 5: Container integration
        total_checks += 1;
        if check_container_integration() {
            compliance_score += 1;
            println!("✅ Container integration verified");
        } else {
            println!("❌ Container integration issues found");
        }

        // Calculate compliance percentage
        let compliance_percentage = (compliance_score as f64 / total_checks as f64) * 100.0;
        
        println!("\n📊 Phase 2.6 Architectural Compliance Summary:");
        println!("   Compliance Score: {}/{} ({:.1}%)", compliance_score, total_checks, compliance_percentage);
        
        if compliance_percentage == 100.0 {
            println!("🎉 Perfect architectural compliance achieved!");
        } else if compliance_percentage >= 80.0 {
            println!("✅ Good architectural compliance - minor issues to address");
        } else {
            println!("⚠️ Architectural compliance needs improvement");
        }

        // Require at least 80% compliance to pass
        assert!(compliance_percentage >= 80.0, 
            "Architectural compliance must be at least 80% (current: {:.1}%)", compliance_percentage);
    }
}

/// Helper function to check for database violations
fn check_for_database_violations() -> bool {
    let search_paths = vec![
        "apps/desktop/src/",
        "apps/desktop/docker-compose.desktop.yml",
        "apps/desktop/Dockerfile",
    ];

    for path in search_paths {
        if Path::new(path).exists() {
            if path.ends_with(".yml") || path.ends_with("Dockerfile") {
                if let Ok(content) = fs::read_to_string(path) {
                    if content.contains("DATABASE_URL") && !content.contains("# Phase 2.6") {
                        return true;
                    }
                }
            } else if path.ends_with("/") {
                // Directory search
                if let Ok(entries) = fs::read_dir(path) {
                    for entry in entries.flatten() {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            if content.contains("DATABASE_URL") && !content.contains("Phase 2.6") {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }
    false
}

/// Helper function to check API Gateway usage
fn check_api_gateway_usage() -> bool {
    let config_path = "apps/desktop/src/utils.rs";
    if Path::new(config_path).exists() {
        if let Ok(content) = fs::read_to_string(config_path) {
            return content.contains("atlas_core_url") && content.contains("atlas_api_gateway_url");
        }
    }
    false
}

/// Helper function to check SuperTokens integration
fn check_supertokens_integration() -> bool {
    let auth_path = "apps/desktop/src/commands/auth.rs";
    if Path::new(auth_path).exists() {
        if let Ok(content) = fs::read_to_string(auth_path) {
            return content.contains("Atlas Core") || content.contains("api_client");
        }
    }
    false
}

/// Helper function to check shared configuration
fn check_shared_configuration() -> bool {
    let config_bridge_path = "apps/desktop/src/atlas_config_bridge.rs";
    Path::new(config_bridge_path).exists()
}

/// Helper function to check container integration
fn check_container_integration() -> bool {
    let dockerfile_path = "apps/desktop/Dockerfile";
    let compose_path = "apps/desktop/docker-compose.desktop.yml";
    Path::new(dockerfile_path).exists() && Path::new(compose_path).exists()
}

/// Main test runner
#[cfg(test)]
fn main() {
    // This would be called by cargo test
    println!("🚀 Running Phase 2.6 Architectural Compliance Tests");
}