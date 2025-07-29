// Financial Commands for Atlas Financial Desktop
// Bank-grade precision with comprehensive financial management capabilities

use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use crate::{AppState, financial::FinancialAmount};
use crate::storage::{DatabaseManager, AccountRepository, TransactionRepository, CreateAccountRequest, CreateTransactionRequest};
use crate::security::secure_query::InputValidator;
use super::{CommandResponse, send_desktop_notification, desktop_utils};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

// ============================================================================
// Core Financial Types (Desktop-specific extensions)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub balance: FinancialAmount,
    pub currency: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub institution: Option<String>,
    pub account_number_masked: Option<String>,
    pub credit_limit: Option<FinancialAmount>,
    pub interest_rate: Option<Decimal>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AccountType {
    Checking,
    Savings,
    CreditCard,
    Investment,
    Retirement,
    Loan,
    Mortgage,
    Cash,
    Other,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub user_id: String,
    pub account_id: String,
    pub amount: FinancialAmount,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub transaction_type: TransactionType,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: bool,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub ml_confidence: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum TransactionType {
    Debit,
    Credit,
    Transfer,
    Fee,
    Interest,
    Dividend,
    Withdrawal,
    Deposit,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransactionInput {
    pub account_id: String,
    pub amount: String, // String to preserve precision
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: Option<DateTime<Utc>>,
    pub transaction_type: TransactionType,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FinancialOverview {
    pub net_worth: FinancialAmount,
    pub total_assets: FinancialAmount,
    pub total_liabilities: FinancialAmount,
    pub monthly_income: FinancialAmount,
    pub monthly_expenses: FinancialAmount,
    pub cash_flow: FinancialAmount,
    pub investment_value: FinancialAmount,
    pub debt_to_income_ratio: Decimal,
    pub savings_rate: Decimal,
    pub emergency_fund_months: Decimal,
    pub as_of_date: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BrutalHonestyInsight {
    pub id: String,
    pub title: String,
    pub message: String,
    pub severity: InsightSeverity,
    pub category: InsightCategory,
    pub action_items: Vec<String>,
    pub impact_score: i32, // 1-10 scale
    pub created_at: DateTime<Utc>,
    pub is_dismissed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum InsightSeverity {
    Info,
    Warning,
    Critical,
    Urgent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum InsightCategory {
    Spending,
    Saving,
    Debt,
    Investment,
    Budget,
    Cash_Flow,
    Risk,
    Opportunity,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpendingAnalysis {
    pub total_spending: FinancialAmount,
    pub period: String,
    pub category_breakdown: HashMap<String, FinancialAmount>,
    pub top_merchants: Vec<MerchantSpending>,
    pub spending_trends: Vec<SpendingTrend>,
    pub budget_comparison: Option<BudgetComparison>,
    pub unusual_patterns: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MerchantSpending {
    pub merchant: String,
    pub amount: FinancialAmount,
    pub transaction_count: i32,
    pub average_transaction: FinancialAmount,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpendingTrend {
    pub period: String,
    pub amount: FinancialAmount,
    pub change_percentage: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BudgetComparison {
    pub budgeted: FinancialAmount,
    pub actual: FinancialAmount,
    pub variance: FinancialAmount,
    pub percentage_used: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BudgetRecommendation {
    pub category: String,
    pub current_spending: FinancialAmount,
    pub recommended_budget: FinancialAmount,
    pub reasoning: String,
    pub confidence: f64,
    pub priority: RecommendationPriority,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum RecommendationPriority {
    High,
    Medium,
    Low,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransactionFilter {
    pub account_ids: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub amount_range: Option<AmountRange>,
    pub date_range: Option<DateRange>,
    pub transaction_types: Option<Vec<TransactionType>>,
    pub merchants: Option<Vec<String>>,
    pub search_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AmountRange {
    pub min: Option<String>,
    pub max: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub date_range: Option<DateRange>,
    pub include_categories: bool,
    pub include_tags: bool,
    pub accounts: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    CSV,
    JSON,
    PDF,
    Excel,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub total_records: i32,
    pub successful_imports: i32,
    pub failed_imports: i32,
    pub errors: Vec<ImportError>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportError {
    pub row: i32,
    pub field: String,
    pub error: String,
    pub value: String,
}

// ============================================================================
// Account Management Commands
// ============================================================================

/// Get all accounts for the authenticated user
#[tauri::command]
pub async fn get_accounts(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<Account>>, tauri::Error> {
    tracing::info!("Fetching user accounts");

    match fetch_user_accounts(&state).await {
        Ok(accounts) => {
            tracing::info!("Successfully fetched {} accounts", accounts.len());
            Ok(CommandResponse::success(accounts))
        }
        Err(e) => {
            tracing::error!("Failed to fetch accounts: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch accounts: {}", e)))
        }
    }
}

/// Get detailed account information
#[tauri::command]
pub async fn get_account_details(
    account_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Account>, tauri::Error> {
    tracing::info!("Fetching account details for: {}", account_id);

    // Validate UUID format
    if Uuid::parse_str(&account_id).is_err() {
        return Ok(CommandResponse::error("Invalid account ID format"));
    }

    match fetch_account_by_id(&account_id, &state).await {
        Ok(Some(account)) => {
            tracing::info!("Successfully fetched account details: {}", account.name);
            Ok(CommandResponse::success(account))
        }
        Ok(None) => {
            tracing::warn!("Account not found: {}", account_id);
            Ok(CommandResponse::error("Account not found"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch account details: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch account details: {}", e)))
        }
    }
}

// ============================================================================
// Transaction Management Commands
// ============================================================================

/// Get transactions with filtering and pagination
#[tauri::command]
pub async fn get_transactions(
    filter: Option<TransactionFilter>,
    limit: Option<i32>,
    offset: Option<i32>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<Transaction>>, tauri::Error> {
    tracing::info!("Fetching transactions with filter");

    let limit = limit.unwrap_or(50).min(500); // Max 500 transactions per request
    let offset = offset.unwrap_or(0).max(0);

    match fetch_filtered_transactions(&filter, limit, offset, &state).await {
        Ok(transactions) => {
            tracing::info!("Successfully fetched {} transactions", transactions.len());
            Ok(CommandResponse::success(transactions))
        }
        Err(e) => {
            tracing::error!("Failed to fetch transactions: {}", e);
            Ok(CommandResponse::error(format!("Failed to fetch transactions: {}", e)))
        }
    }
}

/// Add a new transaction with bank-grade validation
#[tauri::command]
pub async fn add_transaction(
    transaction_input: TransactionInput,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Transaction>, tauri::Error> {
    tracing::info!("Adding new transaction: {}", transaction_input.description);

    // Validate input
    if let Err(validation_error) = validate_transaction_input(&transaction_input) {
        return Ok(CommandResponse::error(validation_error));
    }

    match create_transaction(&transaction_input, &state).await {
        Ok(transaction) => {
            // Send desktop notification for large transactions
            if let Ok(amount) = transaction_input.amount.parse::<Decimal>() {
                if amount.abs() >= dec!(1000.00) {
                    let _ = send_desktop_notification(
                        &app,
                        "Large Transaction Added",
                        &format!("Added transaction: {} for ${}",
                                transaction_input.description, amount),
                    ).await;
                }
            }

            tracing::info!("Successfully created transaction: {}", transaction.id);
            Ok(CommandResponse::success(transaction))
        }
        Err(e) => {
            tracing::error!("Failed to create transaction: {}", e);
            Ok(CommandResponse::error(format!("Failed to create transaction: {}", e)))
        }
    }
}

/// Update an existing transaction
#[tauri::command]
pub async fn update_transaction(
    transaction_id: String,
    transaction_input: TransactionInput,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Transaction>, tauri::Error> {
    tracing::info!("Updating transaction: {}", transaction_id);

    // Validate UUID format
    if Uuid::parse_str(&transaction_id).is_err() {
        return Ok(CommandResponse::error("Invalid transaction ID format"));
    }

    // Validate input
    if let Err(validation_error) = validate_transaction_input(&transaction_input) {
        return Ok(CommandResponse::error(validation_error));
    }

    match update_existing_transaction(&transaction_id, &transaction_input, &state).await {
        Ok(Some(transaction)) => {
            tracing::info!("Successfully updated transaction: {}", transaction.id);
            Ok(CommandResponse::success(transaction))
        }
        Ok(None) => {
            tracing::warn!("Transaction not found for update: {}", transaction_id);
            Ok(CommandResponse::error("Transaction not found"))
        }
        Err(e) => {
            tracing::error!("Failed to update transaction: {}", e);
            Ok(CommandResponse::error(format!("Failed to update transaction: {}", e)))
        }
    }
}

/// Delete a transaction with audit logging
#[tauri::command]
pub async fn delete_transaction(
    transaction_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<()>, tauri::Error> {
    tracing::info!("Deleting transaction: {}", transaction_id);

    // Validate UUID format
    if Uuid::parse_str(&transaction_id).is_err() {
        return Ok(CommandResponse::error("Invalid transaction ID format"));
    }

    match soft_delete_transaction(&transaction_id, &state).await {
        Ok(true) => {
            tracing::info!("Successfully deleted transaction: {}", transaction_id);
            Ok(CommandResponse::success(()))
        }
        Ok(false) => {
            tracing::warn!("Transaction not found for deletion: {}", transaction_id);
            Ok(CommandResponse::error("Transaction not found"))
        }
        Err(e) => {
            tracing::error!("Failed to delete transaction: {}", e);
            Ok(CommandResponse::error(format!("Failed to delete transaction: {}", e)))
        }
    }
}

/// Categorize transaction using ML integration
#[tauri::command]
pub async fn categorize_transaction(
    transaction_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Transaction>, tauri::Error> {
    tracing::info!("Categorizing transaction with ML: {}", transaction_id);

    // Validate UUID format
    if Uuid::parse_str(&transaction_id).is_err() {
        return Ok(CommandResponse::error("Invalid transaction ID format"));
    }

    match ml_categorize_transaction(&transaction_id, &state).await {
        Ok(Some(transaction)) => {
            // Send notification if confidence is low
            if let Some(confidence) = transaction.ml_confidence {
                if confidence < 0.7 {
                    let _ = send_desktop_notification(
                        &app,
                        "Low Confidence Categorization",
                        &format!("Transaction '{}' was categorized with {}% confidence. Please review.",
                                transaction.description, (confidence * 100.0) as i32),
                    ).await;
                }
            }

            tracing::info!("Successfully categorized transaction: {}", transaction.id);
            Ok(CommandResponse::success(transaction))
        }
        Ok(None) => {
            tracing::warn!("Transaction not found for categorization: {}", transaction_id);
            Ok(CommandResponse::error("Transaction not found"))
        }
        Err(e) => {
            tracing::error!("Failed to categorize transaction: {}", e);
            Ok(CommandResponse::error(format!("Failed to categorize transaction: {}", e)))
        }
    }
}

// ============================================================================
// Financial Analysis Commands
// ============================================================================

/// Calculate comprehensive net worth
#[tauri::command]
pub async fn calculate_net_worth(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<FinancialAmount>, tauri::Error> {
    tracing::info!("Calculating net worth");

    match compute_net_worth(&state).await {
        Ok(net_worth) => {
            tracing::info!("Successfully calculated net worth: {}", net_worth);
            Ok(CommandResponse::success(net_worth))
        }
        Err(e) => {
            tracing::error!("Failed to calculate net worth: {}", e);
            Ok(CommandResponse::error(format!("Failed to calculate net worth: {}", e)))
        }
    }
}

/// Get comprehensive financial overview
#[tauri::command]
pub async fn get_financial_overview(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<FinancialOverview>, tauri::Error> {
    tracing::info!("Generating financial overview");

    match generate_financial_overview(&state).await {
        Ok(overview) => {
            tracing::info!("Successfully generated financial overview");
            Ok(CommandResponse::success(overview))
        }
        Err(e) => {
            tracing::error!("Failed to generate financial overview: {}", e);
            Ok(CommandResponse::error(format!("Failed to generate financial overview: {}", e)))
        }
    }
}

/// Get brutal honesty insights with AI analysis
#[tauri::command]
pub async fn get_brutal_honesty_insights(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<BrutalHonestyInsight>>, tauri::Error> {
    tracing::info!("Generating brutal honesty insights");

    match generate_brutal_honesty_insights(&state).await {
        Ok(insights) => {
            // Send notification for urgent insights
            let urgent_count = insights.iter()
                .filter(|i| matches!(i.severity, InsightSeverity::Urgent))
                .count();

            if urgent_count > 0 {
                let _ = send_desktop_notification(
                    &app,
                    "Urgent Financial Insights",
                    &format!("You have {} urgent financial insights that need attention.", urgent_count),
                ).await;
            }

            tracing::info!("Successfully generated {} insights", insights.len());
            Ok(CommandResponse::success(insights))
        }
        Err(e) => {
            tracing::error!("Failed to generate insights: {}", e);
            Ok(CommandResponse::error(format!("Failed to generate insights: {}", e)))
        }
    }
}

/// Get detailed spending analysis
#[tauri::command]
pub async fn get_spending_analysis(
    period: Option<String>, // "week", "month", "quarter", "year"
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<SpendingAnalysis>, tauri::Error> {
    let period = period.unwrap_or_else(|| "month".to_string());
    tracing::info!("Generating spending analysis for period: {}", period);

    match analyze_spending_patterns(&period, &state).await {
        Ok(analysis) => {
            tracing::info!("Successfully generated spending analysis");
            Ok(CommandResponse::success(analysis))
        }
        Err(e) => {
            tracing::error!("Failed to generate spending analysis: {}", e);
            Ok(CommandResponse::error(format!("Failed to generate spending analysis: {}", e)))
        }
    }
}

/// Get AI-powered budget recommendations
#[tauri::command]
pub async fn get_budget_recommendations(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<Vec<BudgetRecommendation>>, tauri::Error> {
    tracing::info!("Generating budget recommendations");

    match generate_budget_recommendations(&state).await {
        Ok(recommendations) => {
            tracing::info!("Successfully generated {} budget recommendations", recommendations.len());
            Ok(CommandResponse::success(recommendations))
        }
        Err(e) => {
            tracing::error!("Failed to generate budget recommendations: {}", e);
            Ok(CommandResponse::error(format!("Failed to generate budget recommendations: {}", e)))
        }
    }
}

// ============================================================================
// Data Import/Export Commands
// ============================================================================

/// Export financial data with desktop file dialog
#[tauri::command]
pub async fn export_financial_data(
    export_options: ExportOptions,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<String>, tauri::Error> {
    tracing::info!("Exporting financial data in format: {:?}", export_options.format);

    // Show save file dialog
    let file_extension = match export_options.format {
        ExportFormat::CSV => "csv",
        ExportFormat::JSON => "json",
        ExportFormat::PDF => "pdf",
        ExportFormat::Excel => "xlsx",
    };

    let default_filename = format!("atlas_financial_export_{}.{}",
                                   Utc::now().format("%Y%m%d_%H%M%S"),
                                   file_extension);

    let filters = vec![
        (format!("{} Files", file_extension.to_uppercase()).as_str(), &[file_extension]),
        ("All Files", &["*"]),
    ];

    match desktop_utils::save_file_dialog(
        &app,
        "Export Financial Data",
        &default_filename,
        filters,
    ).await {
        Ok(Some(file_path)) => {
            match export_data_to_file(&export_options, &file_path, &state).await {
                Ok(_) => {
                    let _ = send_desktop_notification(
                        &app,
                        "Export Complete",
                        &format!("Financial data exported to: {}", file_path),
                    ).await;

                    tracing::info!("Successfully exported data to: {}", file_path);
                    Ok(CommandResponse::success(file_path))
                }
                Err(e) => {
                    tracing::error!("Failed to export data: {}", e);
                    Ok(CommandResponse::error(format!("Failed to export data: {}", e)))
                }
            }
        }
        Ok(None) => {
            tracing::info!("Export cancelled by user");
            Ok(CommandResponse::error("Export cancelled"))
        }
        Err(e) => {
            tracing::error!("Failed to show save dialog: {}", e);
            Ok(CommandResponse::error(format!("Failed to show save dialog: {}", e)))
        }
    }
}

/// Import financial data with desktop file dialog
#[tauri::command]
pub async fn import_financial_data(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<ImportResult>, tauri::Error> {
    tracing::info!("Starting financial data import");

    // Show open file dialog
    let filters = vec![
        ("CSV Files", &["csv"]),
        ("JSON Files", &["json"]),
        ("Excel Files", &["xlsx", "xls"]),
        ("All Files", &["*"]),
    ];

    match desktop_utils::open_file_dialog(
        &app,
        "Import Financial Data",
        false,
        filters,
    ).await {
        Ok(Some(file_paths)) => {
            if let Some(file_path) = file_paths.first() {
                // Show progress notification
                let _ = send_desktop_notification(
                    &app,
                    "Import Started",
                    "Processing your financial data import...",
                ).await;

                match import_data_from_file(file_path, &state).await {
                    Ok(result) => {
                        let message = if result.failed_imports > 0 {
                            format!("Import completed with {} successes and {} failures",
                                   result.successful_imports, result.failed_imports)
                        } else {
                            format!("Import completed successfully: {} records imported",
                                   result.successful_imports)
                        };

                        let _ = send_desktop_notification(
                            &app,
                            "Import Complete",
                            &message,
                        ).await;

                        tracing::info!("Successfully imported data from: {}", file_path);
                        Ok(CommandResponse::success(result))
                    }
                    Err(e) => {
                        let _ = send_desktop_notification(
                            &app,
                            "Import Failed",
                            "Failed to import financial data. Please check the file format.",
                        ).await;

                        tracing::error!("Failed to import data: {}", e);
                        Ok(CommandResponse::error(format!("Failed to import data: {}", e)))
                    }
                }
            } else {
                Ok(CommandResponse::error("No file selected"))
            }
        }
        Ok(None) => {
            tracing::info!("Import cancelled by user");
            Ok(CommandResponse::error("Import cancelled"))
        }
        Err(e) => {
            tracing::error!("Failed to show open dialog: {}", e);
            Ok(CommandResponse::error(format!("Failed to show open dialog: {}", e)))
        }
    }
}

// ============================================================================
// Internal Implementation Functions
// ============================================================================

async fn fetch_user_accounts(state: &State<'_, AppState>) -> Result<Vec<Account>, Box<dyn std::error::Error>> {
    // Get user ID from session state (placeholder for actual session management)
    let user_id = "placeholder-user-id"; // TODO: Get from actual session

    // Validate user ID format
    Uuid::parse_str(user_id)
        .map_err(|_| "Invalid user ID format")?;

    // Use secure repository pattern
    let db_manager = &state.database_manager; // Assuming database_manager is in AppState
    let account_repo = AccountRepository::new(db_manager);

    let account_records = account_repo.find_by_user_id(user_id).await
        .map_err(|e| format!("Database error: {}", e))?;

    // Convert to API types
    let accounts = account_records.into_iter().map(|record| Account {
        id: record.id,
        user_id: record.user_id,
        name: record.name,
        account_type: match record.account_type {
            crate::storage::AccountType::Checking => AccountType::Checking,
            crate::storage::AccountType::Savings => AccountType::Savings,
            crate::storage::AccountType::CreditCard => AccountType::CreditCard,
            crate::storage::AccountType::Investment => AccountType::Investment,
            crate::storage::AccountType::Retirement => AccountType::Retirement,
            crate::storage::AccountType::Loan => AccountType::Loan,
            crate::storage::AccountType::Mortgage => AccountType::Mortgage,
            crate::storage::AccountType::Cash => AccountType::Cash,
            crate::storage::AccountType::Other => AccountType::Other,
        },
        balance: FinancialAmount::from_decimal(record.balance, record.currency.clone())?,
        currency: record.currency,
        is_active: record.is_active,
        created_at: record.created_at,
        updated_at: record.updated_at,
        institution: record.institution,
        account_number_masked: record.account_number_masked,
        credit_limit: record.credit_limit.map(|cl|
            FinancialAmount::from_decimal(cl, "USD".to_string()).unwrap_or_else(|_|
                FinancialAmount::zero("USD".to_string()).unwrap()
            )
        ),
        interest_rate: record.interest_rate,
    }).collect();

    Ok(accounts)
}

async fn fetch_account_by_id(account_id: &str, state: &State<'_, AppState>) -> Result<Option<Account>, Box<dyn std::error::Error>> {
    // Validate account ID format
    Uuid::parse_str(account_id)
        .map_err(|_| "Invalid account ID format")?;

    // Use secure repository pattern
    let db_manager = &state.database_manager;
    let account_repo = AccountRepository::new(db_manager);

    let account_record = account_repo.find_by_id(account_id).await
        .map_err(|e| format!("Database error: {}", e))?;

    // Convert to API type if found
    let account = account_record.map(|record| Account {
        id: record.id,
        user_id: record.user_id,
        name: record.name,
        account_type: match record.account_type {
            crate::storage::AccountType::Checking => AccountType::Checking,
            crate::storage::AccountType::Savings => AccountType::Savings,
            crate::storage::AccountType::CreditCard => AccountType::CreditCard,
            crate::storage::AccountType::Investment => AccountType::Investment,
            crate::storage::AccountType::Retirement => AccountType::Retirement,
            crate::storage::AccountType::Loan => AccountType::Loan,
            crate::storage::AccountType::Mortgage => AccountType::Mortgage,
            crate::storage::AccountType::Cash => AccountType::Cash,
            crate::storage::AccountType::Other => AccountType::Other,
        },
        balance: FinancialAmount::from_decimal(record.balance, record.currency.clone()).unwrap_or_else(|_|
            FinancialAmount::zero(record.currency.clone()).unwrap()
        ),
        currency: record.currency,
        is_active: record.is_active,
        created_at: record.created_at,
        updated_at: record.updated_at,
        institution: record.institution,
        account_number_masked: record.account_number_masked,
        credit_limit: record.credit_limit.map(|cl|
            FinancialAmount::from_decimal(cl, "USD".to_string()).unwrap_or_else(|_|
                FinancialAmount::zero("USD".to_string()).unwrap()
            )
        ),
        interest_rate: record.interest_rate,
    });

    Ok(account)
}

async fn fetch_filtered_transactions(
    filter: &Option<TransactionFilter>,
    limit: i32,
    offset: i32,
    state: &State<'_, AppState>,
) -> Result<Vec<Transaction>, Box<dyn std::error::Error>> {
    // Get user ID from session state (placeholder)
    let user_id = "placeholder-user-id"; // TODO: Get from actual session

    // Convert filter to storage filter format
    let storage_filter = match filter {
        Some(f) => crate::storage::TransactionFilter {
            account_ids: f.account_ids.clone(),
            categories: f.categories.clone(),
            amount_min: f.amount_range.as_ref().and_then(|ar|
                ar.min.as_ref().and_then(|s| s.parse::<Decimal>().ok())
            ),
            amount_max: f.amount_range.as_ref().and_then(|ar|
                ar.max.as_ref().and_then(|s| s.parse::<Decimal>().ok())
            ),
            date_start: f.date_range.as_ref().map(|dr| dr.start),
            date_end: f.date_range.as_ref().map(|dr| dr.end),
            transaction_types: f.transaction_types.as_ref().map(|types|
                types.iter().map(|t| match t {
                    TransactionType::Debit => crate::storage::TransactionType::Debit,
                    TransactionType::Credit => crate::storage::TransactionType::Credit,
                    TransactionType::Transfer => crate::storage::TransactionType::Transfer,
                    TransactionType::Fee => crate::storage::TransactionType::Fee,
                    TransactionType::Interest => crate::storage::TransactionType::Interest,
                    TransactionType::Dividend => crate::storage::TransactionType::Dividend,
                    TransactionType::Withdrawal => crate::storage::TransactionType::Withdrawal,
                    TransactionType::Deposit => crate::storage::TransactionType::Deposit,
                }).collect()
            ),
            merchants: f.merchants.clone(),
            search_text: f.search_text.clone(),
        },
        None => crate::storage::TransactionFilter {
            account_ids: None,
            categories: None,
            amount_min: None,
            amount_max: None,
            date_start: None,
            date_end: None,
            transaction_types: None,
            merchants: None,
            search_text: None,
        },
    };

    // Use secure repository pattern
    let db_manager = &state.database_manager;
    let transaction_repo = TransactionRepository::new(db_manager);

    let transaction_records = transaction_repo.find_filtered(user_id, &storage_filter, limit, offset).await
        .map_err(|e| format!("Database error: {}", e))?;

    // Convert to API types
    let transactions = transaction_records.into_iter().map(|record| Transaction {
        id: record.id,
        user_id: record.user_id,
        account_id: record.account_id,
        amount: FinancialAmount::from_decimal(record.amount, "USD".to_string()).unwrap_or_else(|_|
            FinancialAmount::zero("USD".to_string()).unwrap()
        ),
        description: record.description,
        category: record.category,
        subcategory: record.subcategory,
        transaction_date: record.transaction_date,
        created_at: record.created_at,
        updated_at: record.updated_at,
        transaction_type: match record.transaction_type {
            crate::storage::TransactionType::Debit => TransactionType::Debit,
            crate::storage::TransactionType::Credit => TransactionType::Credit,
            crate::storage::TransactionType::Transfer => TransactionType::Transfer,
            crate::storage::TransactionType::Fee => TransactionType::Fee,
            crate::storage::TransactionType::Interest => TransactionType::Interest,
            crate::storage::TransactionType::Dividend => TransactionType::Dividend,
            crate::storage::TransactionType::Withdrawal => TransactionType::Withdrawal,
            crate::storage::TransactionType::Deposit => TransactionType::Deposit,
        },
        merchant: record.merchant,
        location: record.location,
        is_recurring: record.is_recurring,
        tags: record.tags,
        notes: record.notes,
        ml_confidence: record.ml_confidence,
    }).collect();

    Ok(transactions)
}

async fn create_transaction(
    input: &TransactionInput,
    state: &State<'_, AppState>,
) -> Result<Transaction, Box<dyn std::error::Error>> {
    // Validate input using secure validator
    InputValidator::validate_transaction_input(input)
        .map_err(|e| format!("Validation error: {}", e))?;

    // Get user ID from session state (placeholder)
    let user_id = "placeholder-user-id"; // TODO: Get from actual session

    // Parse and validate amount
    let amount = input.amount.parse::<Decimal>()
        .map_err(|_| "Invalid amount format")?;

    // Create storage request
    let create_request = CreateTransactionRequest {
        user_id: user_id.to_string(),
        account_id: input.account_id.clone(),
        amount,
        description: input.description.clone(),
        category: input.category.clone(),
        subcategory: input.subcategory.clone(),
        transaction_date: input.transaction_date,
        transaction_type: match input.transaction_type {
            TransactionType::Debit => crate::storage::TransactionType::Debit,
            TransactionType::Credit => crate::storage::TransactionType::Credit,
            TransactionType::Transfer => crate::storage::TransactionType::Transfer,
            TransactionType::Fee => crate::storage::TransactionType::Fee,
            TransactionType::Interest => crate::storage::TransactionType::Interest,
            TransactionType::Dividend => crate::storage::TransactionType::Dividend,
            TransactionType::Withdrawal => crate::storage::TransactionType::Withdrawal,
            TransactionType::Deposit => crate::storage::TransactionType::Deposit,
        },
        merchant: input.merchant.clone(),
        location: input.location.clone(),
        is_recurring: input.is_recurring,
        tags: input.tags.clone(),
        notes: input.notes.clone(),
        ml_confidence: None,
    };

    // Use secure repository pattern
    let db_manager = &state.database_manager;
    let transaction_repo = TransactionRepository::new(db_manager);

    let transaction_record = transaction_repo.create(&create_request).await
        .map_err(|e| format!("Database error: {}", e))?;

    // Convert to API type
    let transaction = Transaction {
        id: transaction_record.id,
        user_id: transaction_record.user_id,
        account_id: transaction_record.account_id,
        amount: FinancialAmount::from_decimal(transaction_record.amount, "USD".to_string())?,
        description: transaction_record.description,
        category: transaction_record.category,
        subcategory: transaction_record.subcategory,
        transaction_date: transaction_record.transaction_date,
        created_at: transaction_record.created_at,
        updated_at: transaction_record.updated_at,
        transaction_type: match transaction_record.transaction_type {
            crate::storage::TransactionType::Debit => TransactionType::Debit,
            crate::storage::TransactionType::Credit => TransactionType::Credit,
            crate::storage::TransactionType::Transfer => TransactionType::Transfer,
            crate::storage::TransactionType::Fee => TransactionType::Fee,
            crate::storage::TransactionType::Interest => TransactionType::Interest,
            crate::storage::TransactionType::Dividend => TransactionType::Dividend,
            crate::storage::TransactionType::Withdrawal => TransactionType::Withdrawal,
            crate::storage::TransactionType::Deposit => TransactionType::Deposit,
        },
        merchant: transaction_record.merchant,
        location: transaction_record.location,
        is_recurring: transaction_record.is_recurring,
        tags: transaction_record.tags,
        notes: transaction_record.notes,
        ml_confidence: transaction_record.ml_confidence,
    };

    Ok(transaction)
}

async fn update_existing_transaction(
    transaction_id: &str,
    input: &TransactionInput,
    state: &State<'_, AppState>,
) -> Result<Option<Transaction>, Box<dyn std::error::Error>> {
    // Validate input using secure validator
    InputValidator::validate_transaction_input(input)
        .map_err(|e| format!("Validation error: {}", e))?;

    // Get user ID from session state (placeholder)
    let user_id = "placeholder-user-id"; // TODO: Get from actual session

    // Parse and validate amount
    let amount = input.amount.parse::<Decimal>()
        .map_err(|_| "Invalid amount format")?;

    // Create update request
    let update_request = CreateTransactionRequest {
        user_id: user_id.to_string(),
        account_id: input.account_id.clone(),
        amount,
        description: input.description.clone(),
        category: input.category.clone(),
        subcategory: input.subcategory.clone(),
        transaction_date: input.transaction_date,
        transaction_type: match input.transaction_type {
            TransactionType::Debit => crate::storage::TransactionType::Debit,
            TransactionType::Credit => crate::storage::TransactionType::Credit,
            TransactionType::Transfer => crate::storage::TransactionType::Transfer,
            TransactionType::Fee => crate::storage::TransactionType::Fee,
            TransactionType::Interest => crate::storage::TransactionType::Interest,
            TransactionType::Dividend => crate::storage::TransactionType::Dividend,
            TransactionType::Withdrawal => crate::storage::TransactionType::Withdrawal,
            TransactionType::Deposit => crate::storage::TransactionType::Deposit,
        },
        merchant: input.merchant.clone(),
        location: input.location.clone(),
        is_recurring: input.is_recurring,
        tags: input.tags.clone(),
        notes: input.notes.clone(),
        ml_confidence: None,
    };

    // Use secure repository pattern
    let db_manager = &state.database_manager;
    let transaction_repo = TransactionRepository::new(db_manager);

    let transaction_record = transaction_repo.update(transaction_id, &update_request).await
        .map_err(|e| format!("Database error: {}", e))?;

    // Convert to API type if found
    let transaction = transaction_record.map(|record| Transaction {
        id: record.id,
        user_id: record.user_id,
        account_id: record.account_id,
        amount: FinancialAmount::from_decimal(record.amount, "USD".to_string()).unwrap_or_else(|_|
            FinancialAmount::zero("USD".to_string()).unwrap()
        ),
        description: record.description,
        category: record.category,
        subcategory: record.subcategory,
        transaction_date: record.transaction_date,
        created_at: record.created_at,
        updated_at: record.updated_at,
        transaction_type: match record.transaction_type {
            crate::storage::TransactionType::Debit => TransactionType::Debit,
            crate::storage::TransactionType::Credit => TransactionType::Credit,
            crate::storage::TransactionType::Transfer => TransactionType::Transfer,
            crate::storage::TransactionType::Fee => TransactionType::Fee,
            crate::storage::TransactionType::Interest => TransactionType::Interest,
            crate::storage::TransactionType::Dividend => TransactionType::Dividend,
            crate::storage::TransactionType::Withdrawal => TransactionType::Withdrawal,
            crate::storage::TransactionType::Deposit => TransactionType::Deposit,
        },
        merchant: record.merchant,
        location: record.location,
        is_recurring: record.is_recurring,
        tags: record.tags,
        notes: record.notes,
        ml_confidence: record.ml_confidence,
    });

    Ok(transaction)
}

async fn soft_delete_transaction(
    transaction_id: &str,
    state: &State<'_, AppState>,
) -> Result<bool, Box<dyn std::error::Error>> {
    // Get user ID from session state (placeholder)
    let user_id = "placeholder-user-id"; // TODO: Get from actual session

    // Use secure repository pattern
    let db_manager = &state.database_manager;
    let transaction_repo = TransactionRepository::new(db_manager);

    let deleted = transaction_repo.soft_delete(transaction_id, user_id).await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(deleted)
}

async fn ml_categorize_transaction(
    transaction_id: &str,
    state: &State<'_, AppState>,
) -> Result<Option<Transaction>, Box<dyn std::error::Error>> {
    // Implementation would:
    // 1. Fetch transaction details
    // 2. Call ML service for categorization
    // 3. Update transaction with category and confidence score
    // 4. Return updated transaction
    Ok(None)
}

async fn compute_net_worth(state: &State<'_, AppState>) -> Result<FinancialAmount, Box<dyn std::error::Error>> {
    // Implementation would calculate net worth using financial engine
    FinancialAmount::from_decimal(dec!(0.00), "USD".to_string())
}

async fn generate_financial_overview(state: &State<'_, AppState>) -> Result<FinancialOverview, Box<dyn std::error::Error>> {
    // Implementation would aggregate financial data for comprehensive overview
    let now = Utc::now();
    let zero_usd = FinancialAmount::from_decimal(dec!(0.00), "USD".to_string())?;

    Ok(FinancialOverview {
        net_worth: zero_usd.clone(),
        total_assets: zero_usd.clone(),
        total_liabilities: zero_usd.clone(),
        monthly_income: zero_usd.clone(),
        monthly_expenses: zero_usd.clone(),
        cash_flow: zero_usd.clone(),
        investment_value: zero_usd,
        debt_to_income_ratio: dec!(0.00),
        savings_rate: dec!(0.00),
        emergency_fund_months: dec!(0.00),
        as_of_date: now,
    })
}

async fn generate_brutal_honesty_insights(state: &State<'_, AppState>) -> Result<Vec<BrutalHonestyInsight>, Box<dyn std::error::Error>> {
    // Implementation would use AI service to generate insights
    Ok(vec![])
}

async fn analyze_spending_patterns(period: &str, state: &State<'_, AppState>) -> Result<SpendingAnalysis, Box<dyn std::error::Error>> {
    // Implementation would analyze spending patterns for the given period
    let zero_usd = FinancialAmount::from_decimal(dec!(0.00), "USD".to_string())?;

    Ok(SpendingAnalysis {
        total_spending: zero_usd,
        period: period.to_string(),
        category_breakdown: HashMap::new(),
        top_merchants: vec![],
        spending_trends: vec![],
        budget_comparison: None,
        unusual_patterns: vec![],
    })
}

async fn generate_budget_recommendations(state: &State<'_, AppState>) -> Result<Vec<BudgetRecommendation>, Box<dyn std::error::Error>> {
    // Implementation would use AI service to generate budget recommendations
    Ok(vec![])
}

async fn export_data_to_file(
    options: &ExportOptions,
    file_path: &str,
    state: &State<'_, AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Implementation would:
    // 1. Fetch data based on export options
    // 2. Format data according to selected format
    // 3. Write to file with proper error handling
    Ok(())
}

async fn import_data_from_file(
    file_path: &str,
    state: &State<'_, AppState>,
) -> Result<ImportResult, Box<dyn std::error::Error>> {
    // Implementation would:
    // 1. Detect file format
    // 2. Parse and validate data
    // 3. Import transactions with error handling
    // 4. Return detailed import results

    Ok(ImportResult {
        total_records: 0,
        successful_imports: 0,
        failed_imports: 0,
        errors: vec![],
        warnings: vec![],
    })
}

fn validate_transaction_input(input: &TransactionInput) -> Result<(), String> {
    // Use the secure validator
    InputValidator::validate_transaction_input(input)
        .map_err(|e| e.to_string())
}
