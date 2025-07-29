pub mod domain_event;
pub mod event_store;
pub mod handlers;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

use crate::domain::{EntityId, Timestamp};
use crate::error::AppResult;

pub use domain_event::*;
pub use event_store::*;
pub use handlers::*;

/// Base trait for all domain events
#[async_trait]
pub trait DomainEvent: Debug + Clone + Send + Sync + Serialize + for<'de> Deserialize<'de> {
    fn event_type(&self) -> String;
    fn aggregate_id(&self) -> EntityId;
    fn aggregate_type(&self) -> String;
    fn event_version(&self) -> i32;
    fn occurred_at(&self) -> Timestamp;
}

/// Event handler trait for processing domain events
#[async_trait]
pub trait EventHandler<T: DomainEvent> {
    async fn handle(&self, event: &T) -> AppResult<()>;
}

/// Event bus for publishing and subscribing to events
#[async_trait]
pub trait EventBus {
    async fn publish<T: DomainEvent>(&self, event: T) -> AppResult<()>;
    async fn subscribe<T: DomainEvent + 'static>(
        &self,
        handler: Box<dyn EventHandler<T> + Send + Sync>,
    ) -> AppResult<()>;
}

/// Event store for persisting events
#[async_trait]
pub trait EventStore {
    async fn append_event<T: DomainEvent>(&self, event: T) -> AppResult<()>;
    async fn get_events_for_aggregate(
        &self,
        aggregate_id: EntityId,
        aggregate_type: &str,
    ) -> AppResult<Vec<StoredEvent>>;
    async fn get_events_by_type(&self, event_type: &str) -> AppResult<Vec<StoredEvent>>;
    async fn get_events_since(&self, timestamp: Timestamp) -> AppResult<Vec<StoredEvent>>;
}

/// Stored event with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredEvent {
    pub id: EntityId,
    pub aggregate_id: EntityId,
    pub aggregate_type: String,
    pub event_type: String,
    pub event_data: String, // JSON serialized event data
    pub event_version: i32,
    pub created_at: Timestamp,
    pub user_id: Option<EntityId>,
}
