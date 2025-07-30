// Atlas Financial Desktop API Client
// Phase 2.6: Unified API Gateway Integration
// Routes all requests through atlas-core and atlas-api-gateway exclusively

use serde::{Deserialize, Serialize, de::DeserializeOwned};
use reqwest::{Client, Response, Error as ReqwestError};
use std::collections::HashMap;
use crate::utils::Config;
use crate::financial::FinancialError;

/// Unified API client for Atlas Financial Desktop
/// Ensures all communication goes through proper architectural boundaries
#[derive(Debug, Clone)]
pub struct AtlasApiClient {
    pub http_client: Client,
    pub atlas_core_url: String,        // Port 3000 - Main API
    pub atlas_api_gateway_url: String, // Port 8081 - GraphQL Gateway
}

impl AtlasApiClient {
    /// Create new API client with proper gateway configuration
    pub fn new(config: &Config) -> Result<Self, FinancialError> {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| FinancialError::ConfigurationError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            http_client,
            atlas_core_url: config.atlas_core_url.clone(),
            atlas_api_gateway_url: config.atlas_api_gateway_url.clone(),
        })
    }

    // ========================================================================
    // Authentication API - Routes through Atlas Core (Port 3000)
    // ========================================================================

    /// Authenticate user through Atlas Core
    pub async fn authenticate(
        &self,
        email: &str,
        password: &str,
    ) -> Result<AuthResponse, FinancialError> {
        let auth_payload = serde_json::json!({
            "email": email,
            "password": password
        });

        let url = format!("{}/api/auth/signin", self.atlas_core_url);

        let response = self.http_client
            .post(&url)
            .json(&auth_payload)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("Authentication request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown authentication error".to_string());
            return Err(FinancialError::AuthenticationError(error_text));
        }

        let auth_response: AuthResponse = response.json().await
            .map_err(|e| FinancialError::ParseError(format!("Failed to parse auth response: {}", e)))?;

        Ok(auth_response)
    }

    /// Logout user through Atlas Core
    pub async fn logout(&self, session_token: &str) -> Result<(), FinancialError> {
        let url = format!("{}/api/auth/signout", self.atlas_core_url);

        let response = self.http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", session_token))
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("Logout request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown logout error".to_string());
            return Err(FinancialError::AuthenticationError(error_text));
        }

        Ok(())
    }

    /// Validate session through Atlas Core
    pub async fn validate_session(&self, session_token: &str) -> Result<SessionInfo, FinancialError> {
        let url = format!("{}/api/auth/session", self.atlas_core_url);

        let response = self.http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", session_token))
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("Session validation failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(FinancialError::AuthenticationError("Session invalid".to_string()));
        }

        let session_info: SessionInfo = response.json().await
            .map_err(|e| FinancialError::ParseError(format!("Failed to parse session info: {}", e)))?;

        Ok(session_info)
    }

    // ========================================================================
    // GraphQL API - Routes through Atlas API Gateway (Port 8081)
    // ========================================================================

    /// Execute GraphQL query through Atlas API Gateway
    pub async fn graphql_query<T: DeserializeOwned>(
        &self,
        query: &str,
        variables: Option<serde_json::Value>,
        session_token: &str,
    ) -> Result<T, FinancialError> {
        let payload = serde_json::json!({
            "query": query,
            "variables": variables.unwrap_or(serde_json::json!({}))
        });

        let url = format!("{}/v1/graphql", self.atlas_api_gateway_url);

        let response = self.http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", session_token))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("GraphQL request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown GraphQL error".to_string());
            return Err(FinancialError::GraphQLError(error_text));
        }

        let graphql_response: GraphQLResponse<T> = response.json().await
            .map_err(|e| FinancialError::ParseError(format!("Failed to parse GraphQL response: {}", e)))?;

        if let Some(errors) = graphql_response.errors {
            let error_messages: Vec<String> = errors.iter()
                .map(|e| e.message.clone())
                .collect();
            return Err(FinancialError::GraphQLError(error_messages.join(", ")));
        }

        graphql_response.data
            .ok_or_else(|| FinancialError::GraphQLError("No data in GraphQL response".to_string()))
    }

    /// Execute GraphQL mutation through Atlas API Gateway
    pub async fn graphql_mutation<T: DeserializeOwned>(
        &self,
        mutation: &str,
        variables: Option<serde_json::Value>,
        session_token: &str,
    ) -> Result<T, FinancialError> {
        // Mutations use the same endpoint as queries
        self.graphql_query(mutation, variables, session_token).await
    }

    // ========================================================================
    // Financial Data API - Routes through GraphQL Gateway
    // ========================================================================

    /// Get accounts through GraphQL
    pub async fn get_accounts(&self, session_token: &str) -> Result<Vec<Account>, FinancialError> {
        let query = r#"
            query GetAccounts {
                accounts {
                    id
                    user_id
                    name
                    account_type
                    balance {
                        amount
                        currency
                    }
                    is_active
                    created_at
                    updated_at
                    institution
                    account_number_masked
                }
            }
        "#;

        let response: GetAccountsResponse = self.graphql_query(query, None, session_token).await?;
        Ok(response.accounts)
    }

    /// Get transactions through GraphQL
    pub async fn get_transactions(
        &self,
        account_id: Option<&str>,
        limit: Option<i32>,
        session_token: &str,
    ) -> Result<Vec<Transaction>, FinancialError> {
        let query = r#"
            query GetTransactions($account_id: String, $limit: Int) {
                transactions(where: { account_id: { _eq: $account_id } }, limit: $limit, order_by: { transaction_date: desc }) {
                    id
                    user_id
                    account_id
                    amount {
                        amount
                        currency
                    }
                    description
                    category
                    subcategory
                    transaction_date
                    created_at
                    updated_at
                    transaction_type
                    merchant
                    location
                    is_recurring
                    tags
                    notes
                }
            }
        "#;

        let variables = serde_json::json!({
            "account_id": account_id,
            "limit": limit
        });

        let response: GetTransactionsResponse = self.graphql_query(query, Some(variables), session_token).await?;
        Ok(response.transactions)
    }

    /// Create transaction through GraphQL
    pub async fn create_transaction(
        &self,
        transaction_input: &TransactionInput,
        session_token: &str,
    ) -> Result<Transaction, FinancialError> {
        let mutation = r#"
            mutation CreateTransaction($input: TransactionInput!) {
                insert_transactions_one(object: $input) {
                    id
                    user_id
                    account_id
                    amount {
                        amount
                        currency
                    }
                    description
                    category
                    subcategory
                    transaction_date
                    created_at
                    updated_at
                    transaction_type
                    merchant
                    location
                    is_recurring
                    tags
                    notes
                }
            }
        "#;

        let variables = serde_json::json!({
            "input": transaction_input
        });

        let response: CreateTransactionResponse = self.graphql_mutation(mutation, Some(variables), session_token).await?;
        Ok(response.insert_transactions_one)
    }

    // ========================================================================
    // AI Engine API - Routes through Atlas Core
    // ========================================================================

    /// Get AI insights through Atlas Core
    pub async fn get_ai_insights(&self, session_token: &str) -> Result<AIInsights, FinancialError> {
        let url = format!("{}/api/ai/insights", self.atlas_core_url);

        let response = self.http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", session_token))
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("AI insights request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown AI error".to_string());
            return Err(FinancialError::AIError(error_text));
        }

        let insights: AIInsights = response.json().await
            .map_err(|e| FinancialError::ParseError(format!("Failed to parse AI insights: {}", e)))?;

        Ok(insights)
    }

    // ========================================================================
    // Health Check API - Routes through Atlas Core
    // ========================================================================

    /// Check system health through Atlas Core
    pub async fn health_check(&self) -> Result<HealthStatus, FinancialError> {
        let url = format!("{}/api/health", self.atlas_core_url);

        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| FinancialError::NetworkError(format!("Health check failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(FinancialError::SystemError("System unhealthy".to_string()));
        }

        let health: HealthStatus = response.json().await
            .map_err(|e| FinancialError::ParseError(format!("Failed to parse health status: {}", e)))?;

        Ok(health)
    }
}

// ============================================================================
// API Response Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub session_token: String,
    pub user_info: SessionInfo,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionInfo {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphQLResponse<T> {
    pub data: Option<T>,
    pub errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphQLError {
    pub message: String,
    pub locations: Option<Vec<GraphQLLocation>>,
    pub path: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphQLLocation {
    pub line: i32,
    pub column: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetAccountsResponse {
    pub accounts: Vec<Account>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetTransactionsResponse {
    pub transactions: Vec<Transaction>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransactionResponse {
    pub insert_transactions_one: Transaction,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub account_type: String,
    pub balance: FinancialAmount,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub institution: Option<String>,
    pub account_number_masked: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub user_id: String,
    pub account_id: String,
    pub amount: FinancialAmount,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub transaction_type: String,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: bool,
    pub tags: Vec<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionInput {
    pub account_id: String,
    pub amount: String,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub transaction_date: Option<chrono::DateTime<chrono::Utc>>,
    pub transaction_type: String,
    pub merchant: Option<String>,
    pub location: Option<String>,
    pub is_recurring: Option<bool>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialAmount {
    pub amount: String,
    pub currency: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIInsights {
    pub brutal_honesty: Vec<String>,
    pub spending_analysis: SpendingAnalysis,
    pub budget_recommendations: Vec<BudgetRecommendation>,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendingAnalysis {
    pub total_spending: FinancialAmount,
    pub category_breakdown: std::collections::HashMap<String, FinancialAmount>,
    pub trends: Vec<SpendingTrend>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendingTrend {
    pub category: String,
    pub change_percentage: f64,
    pub trend_direction: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BudgetRecommendation {
    pub category: String,
    pub recommended_amount: FinancialAmount,
    pub reason: String,
    pub priority: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub services: std::collections::HashMap<String, String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
