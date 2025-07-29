use async_trait::async_trait;
use sqlx::{Pool, Sqlite};
use tracing::info;

use crate::domain::{EntityId, Timestamp};
use crate::error::{AppError, AppResult};
use super::{DomainEvent, EventStore, StoredEvent};

#[derive(Clone)]
pub struct SqliteEventStore {
    pool: Pool<Sqlite>,
}

impl SqliteEventStore {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EventStore for SqliteEventStore {
    async fn append_event<T: DomainEvent>(&self, event: T) -> AppResult<()> {
        let event_data = serde_json::to_string(&event).map_err(|e| AppError::Internal {
            message: format!("Failed to serialize event: {}", e),
        })?;

        sqlx::query(
            r#"
            INSERT INTO domain_events (id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(EntityId::new().to_string())
        .bind(event.aggregate_id().to_string())
        .bind(event.aggregate_type())
        .bind(event.event_type())
        .bind(event_data)
        .bind(event.event_version())
        .bind(event.occurred_at().as_datetime())
        .execute(&self.pool)
        .await?;

        info!(
            "Event stored: {} for aggregate {}",
            event.event_type(),
            event.aggregate_id()
        );

        Ok(())
    }

    async fn get_events_for_aggregate(
        &self,
        aggregate_id: EntityId,
        aggregate_type: &str,
    ) -> AppResult<Vec<StoredEvent>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at, user_id
            FROM domain_events
            WHERE aggregate_id = ? AND aggregate_type = ?
            ORDER BY created_at ASC, event_version ASC
            "#,
            aggregate_id.to_string(),
            aggregate_type
        )
        .fetch_all(&self.pool)
        .await?;

        let events = rows
            .into_iter()
            .map(|row| {
                Ok(StoredEvent {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid event ID UUID: {}", e),
                        }
                    })?),
                    aggregate_id: EntityId::from_uuid(
                        uuid::Uuid::parse_str(&row.aggregate_id).map_err(|e| {
                            AppError::Database {
                                message: format!("Invalid aggregate ID UUID: {}", e),
                            }
                        })?,
                    ),
                    aggregate_type: row.aggregate_type,
                    event_type: row.event_type,
                    event_data: row.event_data,
                    event_version: row.event_version,
                    created_at: Timestamp::from_datetime(row.created_at),
                    user_id: row
                        .user_id
                        .map(|id| {
                            uuid::Uuid::parse_str(&id).map(EntityId::from_uuid).map_err(|e| {
                                AppError::Database {
                                    message: format!("Invalid user ID UUID: {}", e),
                                }
                            })
                        })
                        .transpose()?,
                })
            })
            .collect::<AppResult<Vec<_>>>()?;

        Ok(events)
    }

    async fn get_events_by_type(&self, event_type: &str) -> AppResult<Vec<StoredEvent>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at, user_id
            FROM domain_events
            WHERE event_type = ?
            ORDER BY created_at ASC
            "#,
            event_type
        )
        .fetch_all(&self.pool)
        .await?;

        let events = rows
            .into_iter()
            .map(|row| {
                Ok(StoredEvent {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid event ID UUID: {}", e),
                        }
                    })?),
                    aggregate_id: EntityId::from_uuid(
                        uuid::Uuid::parse_str(&row.aggregate_id).map_err(|e| {
                            AppError::Database {
                                message: format!("Invalid aggregate ID UUID: {}", e),
                            }
                        })?,
                    ),
                    aggregate_type: row.aggregate_type,
                    event_type: row.event_type,
                    event_data: row.event_data,
                    event_version: row.event_version,
                    created_at: Timestamp::from_datetime(row.created_at),
                    user_id: row
                        .user_id
                        .map(|id| {
                            uuid::Uuid::parse_str(&id).map(EntityId::from_uuid).map_err(|e| {
                                AppError::Database {
                                    message: format!("Invalid user ID UUID: {}", e),
                                }
                            })
                        })
                        .transpose()?,
                })
            })
            .collect::<AppResult<Vec<_>>>()?;

        Ok(events)
    }

    async fn get_events_since(&self, timestamp: Timestamp) -> AppResult<Vec<StoredEvent>> {
        let rows = sqlx::query!(
            r#"
            SELECT id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at, user_id
            FROM domain_events
            WHERE created_at >= ?
            ORDER BY created_at ASC
            "#,
            timestamp.as_datetime()
        )
        .fetch_all(&self.pool)
        .await?;

        let events = rows
            .into_iter()
            .map(|row| {
                Ok(StoredEvent {
                    id: EntityId::from_uuid(uuid::Uuid::parse_str(&row.id).map_err(|e| {
                        AppError::Database {
                            message: format!("Invalid event ID UUID: {}", e),
                        }
                    })?),
                    aggregate_id: EntityId::from_uuid(
                        uuid::Uuid::parse_str(&row.aggregate_id).map_err(|e| {
                            AppError::Database {
                                message: format!("Invalid aggregate ID UUID: {}", e),
                            }
                        })?,
                    ),
                    aggregate_type: row.aggregate_type,
                    event_type: row.event_type,
                    event_data: row.event_data,
                    event_version: row.event_version,
                    created_at: Timestamp::from_datetime(row.created_at),
                    user_id: row
                        .user_id
                        .map(|id| {
                            uuid::Uuid::parse_str(&id).map(EntityId::from_uuid).map_err(|e| {
                                AppError::Database {
                                    message: format!("Invalid user ID UUID: {}", e),
                                }
                            })
                        })
                        .transpose()?,
                })
            })
            .collect::<AppResult<Vec<_>>>()?;

        Ok(events)
    }
}
