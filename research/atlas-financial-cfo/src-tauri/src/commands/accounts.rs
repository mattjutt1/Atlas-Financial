use tauri::State;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    domain::{Account, CreateAccountRequest, UpdateAccountRequest, EntityId, Money, AccountType, Currency, Timestamp},
    error::AppResult,
};

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequestDto {
    pub name: String,
    pub account_type: String,
    pub currency: String,
    pub institution_name: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub initial_balance: Option<String>, // Decimal as string
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequestDto {
    pub id: String,
    pub name: Option<String>,
    pub institution_name: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub async fn create_account(
    request: CreateAccountRequestDto,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<Account, String> {
    let user_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&user_id).map_err(|e| format!("Invalid user ID: {}", e))?
    );

    let account_type = match request.account_type.as_str() {
        "Checking" => AccountType::Checking,
        "Savings" => AccountType::Savings,
        "Credit" => AccountType::Credit,
        "Investment" => AccountType::Investment,
        "Retirement" => AccountType::Retirement,
        "Loan" => AccountType::Loan,
        "Mortgage" => AccountType::Mortgage,
        "Cash" => AccountType::Cash,
        _ => AccountType::Other,
    };

    let currency = match request.currency.as_str() {
        "USD" => Currency::USD,
        "EUR" => Currency::EUR,
        "GBP" => Currency::GBP,
        "CAD" => Currency::CAD,
        "AUD" => Currency::AUD,
        _ => Currency::USD,
    };

    let mut account = Account::new(
        user_id,
        request.name,
        account_type,
        currency,
        request.institution_name,
    );

    if let Some(account_number) = request.account_number {
        account.account_number = Some(account_number);
    }

    if let Some(routing_number) = request.routing_number {
        account.routing_number = Some(routing_number);
    }

    if let Some(initial_balance_str) = request.initial_balance {
        let initial_amount = initial_balance_str
            .parse()
            .map_err(|e| format!("Invalid initial balance: {}", e))?;
        let initial_balance = Money::new(initial_amount, currency);
        account.update_balance(initial_balance)
            .map_err(|e| e.to_string())?;
    }

    state
        .services
        .account_repository
        .create(&account)
        .await
        .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub async fn get_accounts(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Account>, String> {
    let user_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&user_id).map_err(|e| format!("Invalid user ID: {}", e))?
    );

    state
        .services
        .account_repository
        .find_by_user_id(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_account(
    request: UpdateAccountRequestDto,
    state: State<'_, AppState>,
) -> Result<Account, String> {
    let account_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&request.id).map_err(|e| format!("Invalid account ID: {}", e))?
    );

    let mut account = state
        .services
        .account_repository
        .find_by_id(account_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Account not found")?;

    if let Some(name) = request.name {
        account.name = name;
    }

    if let Some(institution_name) = request.institution_name {
        account.institution_name = Some(institution_name);
    }

    if let Some(account_number) = request.account_number {
        account.account_number = Some(account_number);
    }

    if let Some(routing_number) = request.routing_number {
        account.routing_number = Some(routing_number);
    }

    if let Some(is_active) = request.is_active {
        account.is_active = is_active;
    }

    account.updated_at = Timestamp::now();

    state
        .services
        .account_repository
        .update(&account)
        .await
        .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub async fn delete_account(
    account_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let account_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&account_id).map_err(|e| format!("Invalid account ID: {}", e))?
    );

    state
        .services
        .account_repository
        .delete(account_id)
        .await
        .map_err(|e| e.to_string())
}
