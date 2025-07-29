use tauri::State;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    domain::{Transaction, CreateTransactionRequest, UpdateTransactionRequest, EntityId, Money, TransactionType, Currency, Timestamp},
    error::AppResult,
};

#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequestDto {
    pub account_id: String,
    pub transaction_type: String,
    pub amount: String, // Decimal as string
    pub currency: String,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Vec<String>,
    pub transaction_date: Option<String>,
    pub reference_number: Option<String>,
    pub counterparty: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequestDto {
    pub id: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Option<Vec<String>>,
    pub transaction_date: Option<String>,
    pub reconciled: Option<bool>,
    pub reference_number: Option<String>,
    pub counterparty: Option<String>,
}

#[tauri::command]
pub async fn create_transaction(
    request: CreateTransactionRequestDto,
    user_id: String,
    state: State<'_, AppState>,
) -> Result<Transaction, String> {
    let user_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&user_id).map_err(|e| format!("Invalid user ID: {}", e))?
    );

    let account_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&request.account_id).map_err(|e| format!("Invalid account ID: {}", e))?
    );

    let transaction_type = match request.transaction_type.as_str() {
        "Debit" => TransactionType::Debit,
        "Credit" => TransactionType::Credit,
        "Deposit" => TransactionType::Deposit,
        "Withdrawal" => TransactionType::Withdrawal,
        "Transfer" => TransactionType::Transfer,
        "Payment" => TransactionType::Payment,
        _ => TransactionType::Debit,
    };

    let currency = match request.currency.as_str() {
        "USD" => Currency::USD,
        "EUR" => Currency::EUR,
        "GBP" => Currency::GBP,
        "CAD" => Currency::CAD,
        "AUD" => Currency::AUD,
        _ => Currency::USD,
    };

    let amount_value = request.amount
        .parse()
        .map_err(|e| format!("Invalid amount: {}", e))?;
    let amount = Money::new(amount_value, currency);

    let transaction_date = if let Some(date_str) = request.transaction_date {
        let datetime = chrono::DateTime::parse_from_rfc3339(&date_str)
            .map_err(|e| format!("Invalid date format: {}", e))?;
        Some(Timestamp::from_datetime(datetime.with_timezone(&chrono::Utc)))
    } else {
        None
    };

    let mut transaction = Transaction::new(
        user_id,
        account_id,
        transaction_type,
        amount,
        request.description,
        transaction_date,
    );

    if let Some(category) = request.category {
        transaction.categorize(category, request.subcategory);
    }

    for tag in request.tags {
        transaction.add_tag(tag);
    }

    if let Some(reference_number) = request.reference_number {
        transaction.reference_number = Some(reference_number);
    }

    if let Some(counterparty) = request.counterparty {
        transaction.counterparty = Some(counterparty);
    }

    state
        .services
        .transaction_repository
        .create(&transaction)
        .await
        .map_err(|e| e.to_string())?;

    Ok(transaction)
}

#[tauri::command]
pub async fn get_transactions(
    user_id: String,
    account_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Transaction>, String> {
    let user_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&user_id).map_err(|e| format!("Invalid user ID: {}", e))?
    );

    if let Some(account_id_str) = account_id {
        let account_id = EntityId::from_uuid(
            uuid::Uuid::parse_str(&account_id_str).map_err(|e| format!("Invalid account ID: {}", e))?
        );

        state
            .services
            .transaction_repository
            .find_by_account_id(account_id)
            .await
            .map_err(|e| e.to_string())
    } else {
        state
            .services
            .transaction_repository
            .find_by_user_id(user_id)
            .await
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn update_transaction(
    request: UpdateTransactionRequestDto,
    state: State<'_, AppState>,
) -> Result<Transaction, String> {
    let transaction_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&request.id).map_err(|e| format!("Invalid transaction ID: {}", e))?
    );

    let mut transaction = state
        .services
        .transaction_repository
        .find_by_id(transaction_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Transaction not found")?;

    if let Some(description) = request.description {
        transaction.description = description;
    }

    if let Some(category) = request.category {
        transaction.categorize(category, request.subcategory);
    }

    if let Some(tags) = request.tags {
        transaction.tags = tags;
    }

    if let Some(date_str) = request.transaction_date {
        let datetime = chrono::DateTime::parse_from_rfc3339(&date_str)
            .map_err(|e| format!("Invalid date format: {}", e))?;
        transaction.transaction_date = Timestamp::from_datetime(datetime.with_timezone(&chrono::Utc));
    }

    if let Some(reconciled) = request.reconciled {
        if reconciled {
            transaction.reconcile();
        } else {
            transaction.reconciled = false;
        }
    }

    if let Some(reference_number) = request.reference_number {
        transaction.reference_number = Some(reference_number);
    }

    if let Some(counterparty) = request.counterparty {
        transaction.counterparty = Some(counterparty);
    }

    transaction.updated_at = Timestamp::now();

    state
        .services
        .transaction_repository
        .update(&transaction)
        .await
        .map_err(|e| e.to_string())?;

    Ok(transaction)
}

#[tauri::command]
pub async fn delete_transaction(
    transaction_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let transaction_id = EntityId::from_uuid(
        uuid::Uuid::parse_str(&transaction_id).map_err(|e| format!("Invalid transaction ID: {}", e))?
    );

    state
        .services
        .transaction_repository
        .delete(transaction_id)
        .await
        .map_err(|e| e.to_string())
}
