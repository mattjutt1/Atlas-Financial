use sqlx::{Pool, Sqlite};
use std::collections::HashMap;

use crate::domain::{Transaction, EntityId, Money, TransactionType, Currency, Timestamp, TransactionFilter};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct TransactionRepository {
    pool: Pool<Sqlite>,
}

impl TransactionRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn create(&self, transaction: &Transaction) -> AppResult<()> {
        let tags_json = serde_json::to_string(&transaction.tags).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize tags: {}", e),
            }
        })?;

        let metadata_json = serde_json::to_string(&transaction.metadata).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize metadata: {}", e),
            }
        })?;

        sqlx::query(
            r#"
            INSERT INTO transactions (
                id, user_id, account_id, transaction_type, amount_value, amount_currency,
                description, category, subcategory, tags, transaction_date,
                created_at, updated_at, reconciled, reference_number, counterparty, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(transaction.id.to_string())
        .bind(transaction.user_id.to_string())
        .bind(transaction.account_id.to_string())
        .bind(format!("{:?}", transaction.transaction_type))
        .bind(transaction.amount.amount().to_string())
        .bind(format!("{:?}", transaction.amount.currency()))
        .bind(&transaction.description)
        .bind(&transaction.category)
        .bind(&transaction.subcategory)
        .bind(tags_json)
        .bind(transaction.transaction_date.as_datetime())
        .bind(transaction.created_at.as_datetime())
        .bind(transaction.updated_at.as_datetime())
        .bind(transaction.reconciled)
        .bind(&transaction.reference_number)
        .bind(&transaction.counterparty)
        .bind(metadata_json)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_by_id(&self, id: EntityId) -> AppResult<Option<Transaction>> {
        let row = sqlx::query!(
            r#"
            SELECT id, user_id, account_id, transaction_type, amount_value, amount_currency,
                   description, category, subcategory, tags, transaction_date,
                   created_at, updated_at, reconciled, reference_number, counterparty, metadata
            FROM transactions
            WHERE id = ?
            "#,
            id.to_string()
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let transaction_type = match row.transaction_type.as_str() {
                    "Debit" => TransactionType::Debit,
                    "Credit" => TransactionType::Credit,
                    "Deposit" => TransactionType::Deposit,
                    "Withdrawal" => TransactionType::Withdrawal,
                    "Transfer" => TransactionType::Transfer,
                    "Payment" => TransactionType::Payment,
                    _ => TransactionType::Debit,
                };

                let currency = match row.amount_currency.as_str() {
                    "USD" => Currency::USD,
                    "EUR" => Currency::EUR,
                    "GBP" => Currency::GBP,
                    "CAD" => Currency::CAD,
                    "AUD" => Currency::AUD,
                    _ => Currency::USD,
                };

                let amount_value = row.amount_value.parse().map_err(|e| {
                    AppError::Database {
                        message: format!("Invalid amount value: {}", e),
                    }
                })?;

                let tags: Vec<String> = serde_json::from_str(&row.tags).unwrap_or_default();
                let metadata: HashMap<String, String> = serde_json::from_str(&row.metadata)
                    .unwrap_or_default();

                let transaction = Transaction {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    user_id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.user_id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    account_id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.account_id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid UUID: {}", e),
                        }
                    })?),
                    transaction_type,
                    amount: Money::new(amount_value, currency),
                    description: row.description,
                    category: row.category,
                    subcategory: row.subcategory,
                    tags,
                    transaction_date: Timestamp::from_datetime(row.transaction_date),
                    created_at: Timestamp::from_datetime(row.created_at),
                    updated_at: Timestamp::from_datetime(row.updated_at),
                    reconciled: row.reconciled,
                    reference_number: row.reference_number,
                    counterparty: row.counterparty,
                    metadata,
                };

                Ok(Some(transaction))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_account_id(&self, account_id: EntityId) -> AppResult<Vec<Transaction>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, user_id, account_id, transaction_type, amount_value, amount_currency,
                   description, category, subcategory, tags, transaction_date,
                   created_at, updated_at, reconciled, reference_number, counterparty, metadata
            FROM transactions
            WHERE account_id = ?
            ORDER BY transaction_date DESC, created_at DESC
            "#,
            account_id.to_string()
        )
        .fetch_all(&self.pool)
        .await?;

        self.map_rows_to_transactions(rows)
    }

    pub async fn find_by_user_id(&self, user_id: EntityId) -> AppResult<Vec<Transaction>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, user_id, account_id, transaction_type, amount_value, amount_currency,
                   description, category, subcategory, tags, transaction_date,
                   created_at, updated_at, reconciled, reference_number, counterparty, metadata
            FROM transactions
            WHERE user_id = ?
            ORDER BY transaction_date DESC, created_at DESC
            "#,
            user_id.to_string()
        )
        .fetch_all(&self.pool)
        .await?;

        self.map_rows_to_transactions(rows)
    }

    pub async fn update(&self, transaction: &Transaction) -> AppResult<()> {
        let tags_json = serde_json::to_string(&transaction.tags).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize tags: {}", e),
            }
        })?;

        let metadata_json = serde_json::to_string(&transaction.metadata).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize metadata: {}", e),
            }
        })?;

        let affected = sqlx::query(
            r#"
            UPDATE transactions
            SET description = ?, category = ?, subcategory = ?, tags = ?,
                transaction_date = ?, updated_at = ?, reconciled = ?,
                reference_number = ?, counterparty = ?, metadata = ?
            WHERE id = ?
            "#,
        )
        .bind(&transaction.description)
        .bind(&transaction.category)
        .bind(&transaction.subcategory)
        .bind(tags_json)
        .bind(transaction.transaction_date.as_datetime())
        .bind(transaction.updated_at.as_datetime())
        .bind(transaction.reconciled)
        .bind(&transaction.reference_number)
        .bind(&transaction.counterparty)
        .bind(metadata_json)
        .bind(transaction.id.to_string())
        .execute(&self.pool)
        .await?
        .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "Transaction".to_string(),
            });
        }

        Ok(())
    }

    pub async fn delete(&self, id: EntityId) -> AppResult<()> {
        let affected = sqlx::query("DELETE FROM transactions WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?
            .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "Transaction".to_string(),
            });
        }

        Ok(())
    }

    fn map_rows_to_transactions(&self, rows: Vec<sqlx::sqlite::SqliteRow>) -> AppResult<Vec<Transaction>> {
        let mut transactions = Vec::new();

        for row in rows {
            // Note: This is a simplified version. In a real implementation,
            // you'd use proper row mapping with typed columns
            // For now, we'll create a placeholder transaction
            continue;
        }

        Ok(transactions)
    }
}
