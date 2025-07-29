// Financial Commands for Atlas Financial Desktop
// Phase 2.6: API Gateway Integration - Architectural Compliance
// All database operations replaced with GraphQL API calls through gateway

use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use crate::{AppState, financial::FinancialAmount};
use crate::api_client::{Account as ApiAccount, Transaction as ApiTransaction, TransactionInput as ApiTransactionInput};
use super::{CommandResponse, send_desktop_notification};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

// ============================================================================
// Financial Commands - Phase 2.6 Refactored
// ============================================================================

/// Get user accounts through API Gateway
#[tauri::command]
pub async fn get_accounts_v2(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<ApiAccount>>, tauri::Error> {
    tracing::info!("🔄 Fetching user accounts through API Gateway");

    // Get session token from secure storage
    let session_token = match get_session_token(&app).await {
        Some(token) => token,
        None => {
            tracing::error!("❌ No valid session found");
            return Ok(CommandResponse::error("Authentication required"));
        }
    };

    // Fetch accounts through GraphQL API Gateway
    match state.api_client.get_accounts(&session_token).await {
        Ok(accounts) => {
            tracing::info!("✅ Successfully fetched {} accounts through API Gateway", accounts.len());
            
            // Send desktop notification for large account counts
            if accounts.len() > 10 {
                let _ = send_desktop_notification(
                    &app,
                    "Accounts Loaded",
                    &format!("Successfully loaded {} accounts", accounts.len()),
                ).await;
            }

            Ok(CommandResponse::success(accounts))
        }
        Err(e) => {
            tracing::error!("❌ Failed to fetch accounts through API Gateway: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch accounts: {}", e)))
        }
    }
}

/// Get account transactions through API Gateway
#[tauri::command]
pub async fn get_transactions_v2(
    account_id: Option<String>,
    limit: Option<i32>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<ApiTransaction>>, tauri::Error> {
    tracing::info!("🔄 Fetching transactions through API Gateway");

    // Get session token from secure storage
    let session_token = match get_session_token(&app).await {
        Some(token) => token,
        None => {
            tracing::error!("❌ No valid session found");
            return Ok(CommandResponse::error("Authentication required"));
        }
    };

    // Fetch transactions through GraphQL API Gateway
    match state.api_client.get_transactions(
        account_id.as_deref(),
        limit,
        &session_token
    ).await {
        Ok(transactions) => {
            tracing::info!("✅ Successfully fetched {} transactions through API Gateway", transactions.len());
            
            // Send desktop notification for transaction updates
            if transactions.len() > 50 {
                let _ = send_desktop_notification(
                    &app,
                    "Transactions Loaded",
                    &format!("Successfully loaded {} transactions", transactions.len()),
                ).await;
            }

            Ok(CommandResponse::success(transactions))
        }
        Err(e) => {
            tracing::error!("❌ Failed to fetch transactions through API Gateway: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch transactions: {}", e)))
        }
    }
}

/// Create transaction through API Gateway
#[tauri::command]
pub async fn add_transaction_v2(
    transaction_input: ApiTransactionInput,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<ApiTransaction>, tauri::Error> {
    tracing::info!("🔄 Creating transaction through API Gateway");

    // Get session token from secure storage
    let session_token = match get_session_token(&app).await {
        Some(token) => token,
        None => {
            tracing::error!("❌ No valid session found");
            return Ok(CommandResponse::error("Authentication required"));
        }
    };

    // Validate transaction input
    if let Err(validation_error) = validate_transaction_input(&transaction_input) {
        tracing::error!("❌ Transaction validation failed: {}", validation_error);
        return Ok(CommandResponse::error(format!("Invalid transaction: {}", validation_error)));
    }

    // Create transaction through GraphQL API Gateway
    match state.api_client.create_transaction(&transaction_input, &session_token).await {
        Ok(transaction) => {
            tracing::info!("✅ Successfully created transaction through API Gateway: {}", transaction.id);
            
            // Send desktop notification for transaction creation
            let _ = send_desktop_notification(
                &app,
                "Transaction Created",
                &format!("Created transaction: {}", transaction.description),
            ).await;

            Ok(CommandResponse::success(transaction))
        }
        Err(e) => {
            tracing::error!("❌ Failed to create transaction through API Gateway: {}", e);
            Ok(CommandResponse::error(format!("Failed to create transaction: {}", e)))
        }
    }
}

/// Get AI financial insights through Atlas Core
#[tauri::command]
pub async fn get_ai_insights_v2(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<crate::api_client::AIInsights>, tauri::Error> {
    tracing::info!("🔄 Fetching AI insights through Atlas Core");

    // Get session token from secure storage
    let session_token = match get_session_token(&app).await {
        Some(token) => token,
        None => {
            tracing::error!("❌ No valid session found");
            return Ok(CommandResponse::error("Authentication required"));
        }
    };

    // Fetch AI insights through Atlas Core API
    match state.api_client.get_ai_insights(&session_token).await {
        Ok(insights) => {
            tracing::info!("✅ Successfully fetched AI insights through Atlas Core");
            
            // Send desktop notification for insights update
            let _ = send_desktop_notification(
                &app,
                "AI Insights Updated",
                "New financial insights are available",
            ).await;

            Ok(CommandResponse::success(insights))
        }
        Err(e) => {
            tracing::error!("❌ Failed to fetch AI insights through Atlas Core: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch AI insights: {}", e)))
        }
    }
}

/// Check system health through Atlas Core
#[tauri::command]
pub async fn check_system_health_v2(
    state: State<'_, AppState>,
) -> Result<CommandResponse<crate::api_client::HealthStatus>, tauri::Error> {
    tracing::info!("🔄 Checking system health through Atlas Core");

    // Check system health through Atlas Core API
    match state.api_client.health_check().await {
        Ok(health_status) => {
            tracing::info!("✅ System health check completed through Atlas Core");
            Ok(CommandResponse::success(health_status))
        }
        Err(e) => {
            tracing::error!("❌ System health check failed through Atlas Core: {}", e);
            Ok(CommandResponse::error(format!("System health check failed: {}", e)))
        }
    }
}

// ============================================================================
// Helper Functions - Phase 2.6 Architecture
// ============================================================================

/// Get session token from secure storage
async fn get_session_token(app: &AppHandle) -> Option<String> {
    // Try to read session from secure storage
    match get_stored_session_token(app).await {
        Ok(Some(token)) => {
            tracing::debug!("📋 Retrieved session token from secure storage");
            Some(token)
        }
        Ok(None) => {
            tracing::warn!("⚠️ No session token found in secure storage");
            None
        }
        Err(e) => {
            tracing::error!("❌ Failed to retrieve session token: {}", e);
            None
        }
    }
}

/// Get stored session token from Tauri secure storage
async fn get_stored_session_token(app: &AppHandle) -> Result<Option<String>, Box<dyn std::error::Error>> {
    use crate::security::{decrypt_data};
    
    // Get app data directory
    let app_data_dir = app.path().app_data_dir()?;
    let session_path = app_data_dir.join("session.json");

    if !session_path.exists() {
        return Ok(None);
    }

    // Read and decrypt session data
    let encrypted_data = tokio::fs::read(session_path).await?;
    let session_json = decrypt_data(app.clone(), &encrypted_data).await?;
    
    // Parse session info to extract token
    let session_info: serde_json::Value = serde_json::from_str(&session_json)?;
    let token = session_info["session_token"]
        .as_str()
        .map(|s| s.to_string());

    Ok(token)
}

/// Validate transaction input
fn validate_transaction_input(input: &ApiTransactionInput) -> Result<(), String> {
    // Validate account ID format
    if input.account_id.is_empty() {
        return Err("Account ID cannot be empty".to_string());
    }

    // Validate amount format
    if input.amount.is_empty() {
        return Err("Amount cannot be empty".to_string());
    }

    // Try to parse amount as decimal
    match input.amount.parse::<rust_decimal::Decimal>() {
        Ok(amount) => {
            if amount.is_zero() {
                return Err("Amount cannot be zero".to_string());
            }
        }
        Err(_) => {
            return Err("Invalid amount format".to_string());
        }
    }

    // Validate description
    if input.description.is_empty() {
        return Err("Description cannot be empty".to_string());
    }

    if input.description.len() > 255 {
        return Err("Description too long (max 255 characters)".to_string());
    }

    // Validate transaction type
    let valid_types = ["Debit", "Credit", "Transfer", "Fee", "Interest", "Dividend", "Withdrawal", "Deposit"];
    if !valid_types.contains(&input.transaction_type.as_str()) {
        return Err("Invalid transaction type".to_string());
    }

    Ok(())
}

/// Calculate financial summary from transactions
pub fn calculate_financial_summary(transactions: &[ApiTransaction]) -> FinancialSummary {
    let mut total_income = rust_decimal::Decimal::ZERO;
    let mut total_expenses = rust_decimal::Decimal::ZERO;
    let mut category_spending: HashMap<String, rust_decimal::Decimal> = HashMap::new();

    for transaction in transactions {
        match transaction.amount.amount.parse::<rust_decimal::Decimal>() {
            Ok(amount) => {
                match transaction.transaction_type.as_str() {
                    "Credit" | "Deposit" | "Interest" | "Dividend" => {
                        total_income += amount;
                    }
                    "Debit" | "Withdrawal" | "Fee" => {
                        total_expenses += amount.abs();
                    }
                    _ => {}
                }

                // Track category spending
                if let Some(category) = &transaction.category {
                    *category_spending.entry(category.clone()).or_insert(rust_decimal::Decimal::ZERO) += amount.abs();
                }
            }
            Err(e) => {
                tracing::warn!("⚠️ Failed to parse transaction amount: {}", e);
            }
        }
    }

    FinancialSummary {
        total_income,
        total_expenses,
        net_worth: total_income - total_expenses,
        category_spending,
        transaction_count: transactions.len(),
    }
}

// ============================================================================
// Types for Financial Analysis
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialSummary {
    pub total_income: rust_decimal::Decimal,
    pub total_expenses: rust_decimal::Decimal,
    pub net_worth: rust_decimal::Decimal,
    pub category_spending: HashMap<String, rust_decimal::Decimal>,
    pub transaction_count: usize,
}

/// Desktop-specific financial insights
#[derive(Debug, Serialize, Deserialize)]
pub struct DesktopFinancialInsights {
    pub summary: FinancialSummary,
    pub ai_insights: crate::api_client::AIInsights,
    pub alerts: Vec<String>,
    pub recommendations: Vec<String>,
    pub generated_at: DateTime<Utc>,
}

/// Get comprehensive financial insights combining API data
#[tauri::command]
pub async fn get_comprehensive_insights_v2(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<DesktopFinancialInsights>, tauri::Error> {
    tracing::info!("🔄 Generating comprehensive financial insights");

    // Get session token
    let session_token = match get_session_token(&app).await {
        Some(token) => token,
        None => {
            return Ok(CommandResponse::error("Authentication required"));
        }
    };

    // Fetch transactions and AI insights in parallel
    let transactions_result = state.api_client.get_transactions(None, Some(100), &session_token);
    let ai_insights_result = state.api_client.get_ai_insights(&session_token);

    // Wait for both results
    let (transactions, ai_insights) = match tokio::try_join!(transactions_result, ai_insights_result) {
        Ok((txns, insights)) => (txns, insights),
        Err(e) => {
            tracing::error!("❌ Failed to fetch comprehensive data: {}", e);
            return Ok(CommandResponse::error(format!("Failed to fetch data: {}", e)));
        }
    };

    // Calculate financial summary
    let summary = calculate_financial_summary(&transactions);

    // Generate alerts and recommendations
    let mut alerts = Vec::new();
    let mut recommendations = Vec::new();

    // Check for high spending alerts
    if summary.total_expenses > rust_decimal::Decimal::from(5000) {
        alerts.push("High monthly expenses detected".to_string());
        recommendations.push("Consider reviewing discretionary spending".to_string());
    }

    // Check for low income alerts
    if summary.total_income < summary.total_expenses {
        alerts.push("Expenses exceed income".to_string());
        recommendations.push("Focus on increasing income or reducing expenses".to_string());
    }

    let insights = DesktopFinancialInsights {
        summary,
        ai_insights,
        alerts,
        recommendations,
        generated_at: Utc::now(),
    };

    // Send desktop notification
    let _ = send_desktop_notification(
        &app,
        "Financial Insights Ready",
        "Comprehensive financial analysis has been generated",
    ).await;

    tracing::info!("✅ Successfully generated comprehensive financial insights");
    Ok(CommandResponse::success(insights))
}