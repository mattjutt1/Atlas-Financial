use serde::{Deserialize, Serialize};

use crate::domain::{EntityId, Timestamp, Money, AccountType, TransactionType};
use super::DomainEvent;

/// Account-related domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AccountEvent {
    AccountCreated {
        account_id: EntityId,
        user_id: EntityId,
        name: String,
        account_type: AccountType,
        initial_balance: Money,
        institution_name: Option<String>,
        occurred_at: Timestamp,
        version: i32,
    },
    AccountUpdated {
        account_id: EntityId,
        user_id: EntityId,
        name: Option<String>,
        institution_name: Option<String>,
        occurred_at: Timestamp,
        version: i32,
    },
    AccountBalanceChanged {
        account_id: EntityId,
        user_id: EntityId,
        old_balance: Money,
        new_balance: Money,
        reason: String,
        occurred_at: Timestamp,
        version: i32,
    },
    AccountDeactivated {
        account_id: EntityId,
        user_id: EntityId,
        reason: String,
        occurred_at: Timestamp,
        version: i32,
    },
}

impl DomainEvent for AccountEvent {
    fn event_type(&self) -> String {
        match self {
            AccountEvent::AccountCreated { .. } => "AccountCreated".to_string(),
            AccountEvent::AccountUpdated { .. } => "AccountUpdated".to_string(),
            AccountEvent::AccountBalanceChanged { .. } => "AccountBalanceChanged".to_string(),
            AccountEvent::AccountDeactivated { .. } => "AccountDeactivated".to_string(),
        }
    }

    fn aggregate_id(&self) -> EntityId {
        match self {
            AccountEvent::AccountCreated { account_id, .. }
            | AccountEvent::AccountUpdated { account_id, .. }
            | AccountEvent::AccountBalanceChanged { account_id, .. }
            | AccountEvent::AccountDeactivated { account_id, .. } => *account_id,
        }
    }

    fn aggregate_type(&self) -> String {
        "Account".to_string()
    }

    fn event_version(&self) -> i32 {
        match self {
            AccountEvent::AccountCreated { version, .. }
            | AccountEvent::AccountUpdated { version, .. }
            | AccountEvent::AccountBalanceChanged { version, .. }
            | AccountEvent::AccountDeactivated { version, .. } => *version,
        }
    }

    fn occurred_at(&self) -> Timestamp {
        match self {
            AccountEvent::AccountCreated { occurred_at, .. }
            | AccountEvent::AccountUpdated { occurred_at, .. }
            | AccountEvent::AccountBalanceChanged { occurred_at, .. }
            | AccountEvent::AccountDeactivated { occurred_at, .. } => *occurred_at,
        }
    }
}

/// Transaction-related domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionEvent {
    TransactionCreated {
        transaction_id: EntityId,
        user_id: EntityId,
        account_id: EntityId,
        transaction_type: TransactionType,
        amount: Money,
        description: String,
        category: Option<String>,
        occurred_at: Timestamp,
        version: i32,
    },
    TransactionUpdated {
        transaction_id: EntityId,
        user_id: EntityId,
        description: Option<String>,
        category: Option<String>,
        tags: Option<Vec<String>>,
        occurred_at: Timestamp,
        version: i32,
    },
    TransactionReconciled {
        transaction_id: EntityId,
        user_id: EntityId,
        reconciled_by: EntityId,
        occurred_at: Timestamp,
        version: i32,
    },
    TransactionCategorized {
        transaction_id: EntityId,
        user_id: EntityId,
        old_category: Option<String>,
        new_category: String,
        occurred_at: Timestamp,
        version: i32,
    },
}

impl DomainEvent for TransactionEvent {
    fn event_type(&self) -> String {
        match self {
            TransactionEvent::TransactionCreated { .. } => "TransactionCreated".to_string(),
            TransactionEvent::TransactionUpdated { .. } => "TransactionUpdated".to_string(),
            TransactionEvent::TransactionReconciled { .. } => "TransactionReconciled".to_string(),
            TransactionEvent::TransactionCategorized { .. } => "TransactionCategorized".to_string(),
        }
    }

    fn aggregate_id(&self) -> EntityId {
        match self {
            TransactionEvent::TransactionCreated { transaction_id, .. }
            | TransactionEvent::TransactionUpdated { transaction_id, .. }
            | TransactionEvent::TransactionReconciled { transaction_id, .. }
            | TransactionEvent::TransactionCategorized { transaction_id, .. } => *transaction_id,
        }
    }

    fn aggregate_type(&self) -> String {
        "Transaction".to_string()
    }

    fn event_version(&self) -> i32 {
        match self {
            TransactionEvent::TransactionCreated { version, .. }
            | TransactionEvent::TransactionUpdated { version, .. }
            | TransactionEvent::TransactionReconciled { version, .. }
            | TransactionEvent::TransactionCategorized { version, .. } => *version,
        }
    }

    fn occurred_at(&self) -> Timestamp {
        match self {
            TransactionEvent::TransactionCreated { occurred_at, .. }
            | TransactionEvent::TransactionUpdated { occurred_at, .. }
            | TransactionEvent::TransactionReconciled { occurred_at, .. }
            | TransactionEvent::TransactionCategorized { occurred_at, .. } => *occurred_at,
        }
    }
}

/// User-related domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserEvent {
    UserRegistered {
        user_id: EntityId,
        username: String,
        email: String,
        occurred_at: Timestamp,
        version: i32,
    },
    UserLoggedIn {
        user_id: EntityId,
        session_id: String,
        ip_address: Option<String>,
        occurred_at: Timestamp,
        version: i32,
    },
    UserLoggedOut {
        user_id: EntityId,
        session_id: String,
        occurred_at: Timestamp,
        version: i32,
    },
    UserPasswordChanged {
        user_id: EntityId,
        changed_by: EntityId,
        occurred_at: Timestamp,
        version: i32,
    },
}

impl DomainEvent for UserEvent {
    fn event_type(&self) -> String {
        match self {
            UserEvent::UserRegistered { .. } => "UserRegistered".to_string(),
            UserEvent::UserLoggedIn { .. } => "UserLoggedIn".to_string(),
            UserEvent::UserLoggedOut { .. } => "UserLoggedOut".to_string(),
            UserEvent::UserPasswordChanged { .. } => "UserPasswordChanged".to_string(),
        }
    }

    fn aggregate_id(&self) -> EntityId {
        match self {
            UserEvent::UserRegistered { user_id, .. }
            | UserEvent::UserLoggedIn { user_id, .. }
            | UserEvent::UserLoggedOut { user_id, .. }
            | UserEvent::UserPasswordChanged { user_id, .. } => *user_id,
        }
    }

    fn aggregate_type(&self) -> String {
        "User".to_string()
    }

    fn event_version(&self) -> i32 {
        match self {
            UserEvent::UserRegistered { version, .. }
            | UserEvent::UserLoggedIn { version, .. }
            | UserEvent::UserLoggedOut { version, .. }
            | UserEvent::UserPasswordChanged { version, .. } => *version,
        }
    }

    fn occurred_at(&self) -> Timestamp {
        match self {
            UserEvent::UserRegistered { occurred_at, .. }
            | UserEvent::UserLoggedIn { occurred_at, .. }
            | UserEvent::UserLoggedOut { occurred_at, .. }
            | UserEvent::UserPasswordChanged { occurred_at, .. } => *occurred_at,
        }
    }
}
