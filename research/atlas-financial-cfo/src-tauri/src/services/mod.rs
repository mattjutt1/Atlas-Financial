use std::sync::Arc;

use crate::auth::AuthService;
use crate::database::{Database, UserRepository, AccountRepository, TransactionRepository};
use crate::events::{SqliteEventStore, EventStore};
use crate::error::AppResult;

pub struct AppServices {
    pub auth_service: Arc<AuthService>,
    pub user_repository: Arc<UserRepository>,
    pub account_repository: Arc<AccountRepository>,
    pub transaction_repository: Arc<TransactionRepository>,
    pub event_store: Arc<dyn EventStore + Send + Sync>,
}

impl AppServices {
    pub async fn new(database: Database) -> AppResult<Self> {
        let pool = database.pool().clone();

        // Initialize repositories
        let user_repository = Arc::new(UserRepository::new(pool.clone()));
        let account_repository = Arc::new(AccountRepository::new(pool.clone()));
        let transaction_repository = Arc::new(TransactionRepository::new(pool.clone()));

        // Initialize event store
        let event_store: Arc<dyn EventStore + Send + Sync> =
            Arc::new(SqliteEventStore::new(pool.clone()));

        // Initialize auth service
        let auth_service = Arc::new(AuthService::new(user_repository.clone()));

        Ok(Self {
            auth_service,
            user_repository,
            account_repository,
            transaction_repository,
            event_store,
        })
    }
}
