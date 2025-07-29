use sqlx::{Pool, Sqlite};
use tracing::info;

use crate::error::AppResult;

pub async fn run_migrations(pool: &Pool<Sqlite>) -> AppResult<()> {
    let migrations = [
        ("001_initial_schema", include_str!("../../migrations/001_initial_schema.sql")),
        ("002_add_indexes", include_str!("../../migrations/002_add_indexes.sql")),
        ("003_add_metadata", include_str!("../../migrations/003_add_metadata.sql")),
    ];

    for (version, sql) in migrations.iter() {
        // Check if migration already applied
        let applied = sqlx::query_scalar::<_, i32>(
            "SELECT COUNT(*) FROM _migrations WHERE version = ?",
        )
        .bind(version)
        .fetch_one(pool)
        .await?;

        if applied == 0 {
            info!("Applying migration: {}", version);

            // Execute migration
            sqlx::query(sql).execute(pool).await?;

            // Record migration
            sqlx::query("INSERT INTO _migrations (version) VALUES (?)")
                .bind(version)
                .execute(pool)
                .await?;

            info!("Migration {} applied successfully", version);
        }
    }

    Ok(())
}
