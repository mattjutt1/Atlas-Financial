use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::value_objects::{EntityId, Money, Timestamp};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: EntityId,
    pub user_id: EntityId,
    pub account_id: EntityId,
    pub transaction_type: TransactionType,
    pub amount: Money,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Vec<String>,
    pub transaction_date: Timestamp,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub reconciled: bool,
    pub reference_number: Option<String>,
    pub counterparty: Option<String>,
    pub metadata: HashMap<String, String>,
}

impl Transaction {
    pub fn new(
        user_id: EntityId,
        account_id: EntityId,
        transaction_type: TransactionType,
        amount: Money,
        description: String,
        transaction_date: Option<Timestamp>,
    ) -> Self {
        let now = Timestamp::now();
        Self {
            id: EntityId::new(),
            user_id,
            account_id,
            transaction_type,
            amount,
            description,
            category: None,
            subcategory: None,
            tags: Vec::new(),
            transaction_date: transaction_date.unwrap_or(now),
            created_at: now,
            updated_at: now,
            reconciled: false,
            reference_number: None,
            counterparty: None,
            metadata: HashMap::new(),
        }
    }

    pub fn categorize(&mut self, category: String, subcategory: Option<String>) {
        self.category = Some(category);
        self.subcategory = subcategory;
        self.updated_at = Timestamp::now();
    }

    pub fn add_tag(&mut self, tag: String) {
        if !self.tags.contains(&tag) {
            self.tags.push(tag);
            self.updated_at = Timestamp::now();
        }
    }

    pub fn remove_tag(&mut self, tag: &str) {
        if let Some(pos) = self.tags.iter().position(|t| t == tag) {
            self.tags.remove(pos);
            self.updated_at = Timestamp::now();
        }
    }

    pub fn reconcile(&mut self) {
        self.reconciled = true;
        self.updated_at = Timestamp::now();
    }

    pub fn update_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
        self.updated_at = Timestamp::now();
    }

    /// Returns the effective amount based on transaction type
    /// Debits are negative, Credits are positive
    pub fn effective_amount(&self) -> Money {
        match self.transaction_type {
            TransactionType::Debit | TransactionType::Withdrawal | TransactionType::Payment => {
                Money::new(-self.amount.amount(), self.amount.currency())
            }
            TransactionType::Credit | TransactionType::Deposit => self.amount,
            TransactionType::Transfer => self.amount, // Direction depends on account perspective
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransactionType {
    Debit,
    Credit,
    Deposit,
    Withdrawal,
    Transfer,
    Payment,
}

impl TransactionType {
    pub fn display_name(&self) -> &'static str {
        match self {
            TransactionType::Debit => "Debit",
            TransactionType::Credit => "Credit",
            TransactionType::Deposit => "Deposit",
            TransactionType::Withdrawal => "Withdrawal",
            TransactionType::Transfer => "Transfer",
            TransactionType::Payment => "Payment",
        }
    }

    pub fn is_outflow(&self) -> bool {
        matches!(
            self,
            TransactionType::Debit
                | TransactionType::Withdrawal
                | TransactionType::Payment
        )
    }

    pub fn is_inflow(&self) -> bool {
        matches!(
            self,
            TransactionType::Credit | TransactionType::Deposit
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTransactionRequest {
    pub account_id: EntityId,
    pub transaction_type: TransactionType,
    pub amount: Money,
    pub description: String,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Vec<String>,
    pub transaction_date: Option<Timestamp>,
    pub reference_number: Option<String>,
    pub counterparty: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTransactionRequest {
    pub id: EntityId,
    pub description: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Option<Vec<String>>,
    pub transaction_date: Option<Timestamp>,
    pub reconciled: Option<bool>,
    pub reference_number: Option<String>,
    pub counterparty: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFilter {
    pub account_ids: Option<Vec<EntityId>>,
    pub transaction_types: Option<Vec<TransactionType>>,
    pub categories: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub amount_min: Option<Money>,
    pub amount_max: Option<Money>,
    pub date_from: Option<Timestamp>,
    pub date_to: Option<Timestamp>,
    pub reconciled: Option<bool>,
    pub search_text: Option<String>,
}
