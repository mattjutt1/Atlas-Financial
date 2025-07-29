// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod commands;
mod database;
mod domain;
mod error;
mod events;
mod services;

use std::sync::Arc;
use tauri::{generate_context, generate_handler, Builder, Manager};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::database::Database;
use crate::services::AppServices;

#[derive(Clone)]
pub struct AppState {
    pub services: Arc<AppServices>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting Atlas Financial CFO");

    Builder::default()
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                // Initialize database
                let database = Database::new().await.expect("Failed to initialize database");

                // Initialize services
                let services = Arc::new(AppServices::new(database).await.expect("Failed to initialize services"));

                // Set app state
                handle.manage(AppState { services });

                info!("Application setup completed");
            });

            Ok(())
        })
        .invoke_handler(generate_handler![
            commands::auth::login,
            commands::auth::logout,
            commands::auth::verify_session,
            commands::accounts::create_account,
            commands::accounts::get_accounts,
            commands::accounts::update_account,
            commands::accounts::delete_account,
            commands::transactions::create_transaction,
            commands::transactions::get_transactions,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
        ])
        .run(generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
