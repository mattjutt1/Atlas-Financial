use sqlx::{Pool, Sqlite};
use std::collections::HashMap;

use crate::domain::{Account, EntityId, Money, AccountType, Currency, Timestamp};
use crate::error::{AppError, AppResult};

#[derive(Clone)]
pub struct AccountRepository {
    pool: Pool<Sqlite>,
}

impl AccountRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn create(&self, account: &Account) -> AppResult<()> {
        let metadata_json = serde_json::to_string(&account.metadata).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize metadata: {}", e),
            }
        })?;

        sqlx::query(
            r#"
            INSERT INTO accounts (
                id, user_id, name, account_type, balance_amount, balance_currency,
                institution_name, account_number, routing_number, created_at,
                updated_at, is_active, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(account.id.to_string())
        .bind(account.user_id.to_string())
        .bind(&account.name)
        .bind(format!("{:?}", account.account_type))
        .bind(account.balance.amount().to_string())
        .bind(format!("{:?}", account.balance.currency()))
        .bind(&account.institution_name)
        .bind(&account.account_number)
        .bind(&account.routing_number)
        .bind(account.created_at.as_datetime())
        .bind(account.updated_at.as_datetime())
        .bind(account.is_active)
        .bind(metadata_json)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_by_id(&self, id: EntityId) -> AppResult<Option<Account>> {
        let row = sqlx::query!(
            r#"
            SELECT id, user_id, name, account_type, balance_amount, balance_currency,
                   institution_name, account_number, routing_number, created_at,
                   updated_at, is_active, metadata
            FROM accounts
            WHERE id = ?
            "#,
            id.to_string()
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let account_type = match row.account_type.as_str() {
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

                let currency = match row.balance_currency.as_str() {
                    "USD" => Currency::USD,
                    "EUR" => Currency::EUR,
                    "GBP" => Currency::GBP,
                    "CAD" => Currency::CAD,
                    "AUD" => Currency::AUD,
                    _ => Currency::USD,
                };

                let balance_amount = row.balance_amount.parse().map_err(|e| {
                    AppError::Database {
                        message: format!("Invalid balance amount: {}", e),
                    }
                })?;

                let metadata: HashMap<String, String> = serde_json::from_str(&row.metadata)
                    .unwrap_or_default();

                let account = Account {
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
                    name: row.name,
                    account_type,
                    balance: Money::new(balance_amount, currency),
                    institution_name: row.institution_name,
                    account_number: row.account_number,
                    routing_number: row.routing_number,
                    created_at: Timestamp::from_datetime(row.created_at),
                    updated_at: Timestamp::from_datetime(row.updated_at),
                    is_active: row.is_active,
                    metadata,
                };

                Ok(Some(account))
            }
            None => Ok(None),
        }
    }

    pub async fn find_by_user_id(&self, user_id: EntityId) -> AppResult<Vec<Account>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, user_id, name, account_type, balance_amount, balance_currency,
                   institution_name, account_number, routing_number, created_at,
                   updated_at, is_active, metadata
            FROM accounts
            WHERE user_id = ? AND is_active = 1
            ORDER BY name ASC
            "#,
            user_id.to_string()
        )
        .fetch_all(&self.pool)
        .await?;

        let mut accounts = Vec::new();
        for row in rows {
            let account_type = match row.account_type.as_str() {
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

            let currency = match row.balance_currency.as_str() {
                "USD" => Currency::USD,
                "EUR" => Currency::EUR,
                "GBP" => Currency::GBP,
                "CAD" => Currency::CAD,
                "AUD" => Currency::AUD,
                _ => Currency::USD,
            };

            let balance_amount = row.balance_amount.parse().map_err(|e| {
                AppError::Database {
                    message: format!("Invalid balance amount: {}", e),
                }
            })?;

            let metadata: HashMap<String, String> = serde_json::from_str(&row.metadata)
                .unwrap_or_default();

            let account = Account {
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
                name: row.name,
                account_type,
                balance: Money::new(balance_amount, currency),
                institution_name: row.institution_name,
                account_number: row.account_number,
                routing_number: row.routing_number,
                created_at: Timestamp::from_datetime(row.created_at),
                updated_at: Timestamp::from_datetime(row.updated_at),
                is_active: row.is_active,
                metadata,
            };

            accounts.push(account);
        }

        Ok(accounts)
    }

    pub async fn update(&self, account: &Account) -> AppResult<()> {
        let metadata_json = serde_json::to_string(&account.metadata).map_err(|e| {
            AppError::Database {
                message: format!("Failed to serialize metadata: {}", e),
            }
        })?;

        let affected = sqlx::query(
            r#"
            UPDATE accounts
            SET name = ?, balance_amount = ?, balance_currency = ?,
                institution_name = ?, account_number = ?, routing_number = ?,
                updated_at = ?, is_active = ?, metadata = ?
            WHERE id = ?
            "#,
        )
        .bind(&account.name)
        .bind(account.balance.amount().to_string())
        .bind(format!("{:?}", account.balance.currency()))
        .bind(&account.institution_name)
        .bind(&account.account_number)
        .bind(&account.routing_number)
        .bind(account.updated_at.as_datetime())
        .bind(account.is_active)
        .bind(metadata_json)
        .bind(account.id.to_string())
        .execute(&self.pool)
        .await?
        .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "Account".to_string(),
            });
        }

        Ok(())
    }

    pub async fn delete(&self, id: EntityId) -> AppResult<()> {
        let affected = sqlx::query("DELETE FROM accounts WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?
            .rows_affected();

        if affected == 0 {
            return Err(AppError::NotFound {
                resource: "Account".to_string(),
            });
        }

        Ok(())
    }
}
