use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::value_objects::{EntityId, Money, Timestamp, Currency};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: EntityId,
    pub user_id: EntityId,
    pub name: String,
    pub account_type: AccountType,
    pub balance: Money,
    pub institution_name: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub is_active: bool,
    pub metadata: HashMap<String, String>,
}

impl Account {
    pub fn new(
        user_id: EntityId,
        name: String,
        account_type: AccountType,
        currency: Currency,
        institution_name: Option<String>,
    ) -> Self {
        let now = Timestamp::now();
        Self {
            id: EntityId::new(),
            user_id,
            name,
            account_type,
            balance: Money::zero(currency),
            institution_name,
            account_number: None,
            routing_number: None,
            created_at: now,
            updated_at: now,
            is_active: true,
            metadata: HashMap::new(),
        }
    }

    pub fn update_balance(&mut self, new_balance: Money) -> Result<(), crate::error::AppError> {
        if new_balance.currency() != self.balance.currency() {
            return Err(crate::error::AppError::FinancialCalculation {
                message: "Currency mismatch when updating balance".to_string(),
            });
        }

        self.balance = new_balance;
        self.updated_at = Timestamp::now();
        Ok(())
    }

    pub fn add_to_balance(&mut self, amount: Money) -> Result<(), crate::error::AppError> {
        let new_balance = self.balance.add(&amount)?;
        self.update_balance(new_balance)
    }

    pub fn subtract_from_balance(&mut self, amount: Money) -> Result<(), crate::error::AppError> {
        let new_balance = self.balance.subtract(&amount)?;
        self.update_balance(new_balance)
    }

    pub fn update_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
        self.updated_at = Timestamp::now();
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
        self.updated_at = Timestamp::now();
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AccountType {
    Checking,
    Savings,
    Credit,
    Investment,
    Retirement,
    Loan,
    Mortgage,
    Cash,
    Other,
}

impl AccountType {
    pub fn is_asset(&self) -> bool {
        matches!(
            self,
            AccountType::Checking
                | AccountType::Savings
                | AccountType::Investment
                | AccountType::Retirement
                | AccountType::Cash
        )
    }

    pub fn is_liability(&self) -> bool {
        matches!(
            self,
            AccountType::Credit | AccountType::Loan | AccountType::Mortgage
        )
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            AccountType::Checking => "Checking Account",
            AccountType::Savings => "Savings Account",
            AccountType::Credit => "Credit Card",
            AccountType::Investment => "Investment Account",
            AccountType::Retirement => "Retirement Account",
            AccountType::Loan => "Loan",
            AccountType::Mortgage => "Mortgage",
            AccountType::Cash => "Cash",
            AccountType::Other => "Other",
        }
    }
}

impl Default for AccountType {
    fn default() -> Self {
        AccountType::Checking
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    pub account_type: AccountType,
    pub currency: Currency,
    pub institution_name: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub initial_balance: Option<Money>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountRequest {
    pub id: EntityId,
    pub name: Option<String>,
    pub institution_name: Option<String>,
    pub account_number: Option<String>,
    pub routing_number: Option<String>,
    pub is_active: Option<bool>,
}
