// Atlas Financial Desktop Application
// Tauri-first hybrid architecture for Windows desktop optimization

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    generate_context, generate_handler,
    App, AppHandle, Manager, State, Window,
};
// use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

mod commands;
mod financial;
mod storage;
mod system;
mod utils;
mod security;

use commands::*;
use security::RateLimiter;
// use financial::FinancialEngine;
// use storage::DatabaseManager;

// Application State
#[derive(Debug)]
pub struct AppState {
    // pub financial_engine: FinancialEngine,
    // pub database: DatabaseManager,
    pub config: utils::Config,
    pub rate_limiter: RateLimiter,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("atlas_desktop=debug,tauri=info")
        .init();

    tracing::info!("Starting Atlas Financial Desktop v1.1.0");

    // Initialize application state
    let config = utils::Config::load().await?;
    // let database = DatabaseManager::new(&config.database_url).await?;
    // let financial_engine = FinancialEngine::new().await?;

    // Initialize rate limiter with security configuration
    let rate_limiter = RateLimiter::new();

    let app_state = AppState {
        // financial_engine,
        // database,
        config,
        rate_limiter,
    };

    // Build Tauri application
    let app = tauri::Builder::default()
        .manage(app_state)
        // .plugin(tauri_plugin_window_state::Builder::default().build())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        // .plugin(tauri_plugin_fs::init())
        // .plugin(tauri_plugin_dialog::init())
        // .plugin(tauri_plugin_notification::init())
        // .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // .plugin(tauri_plugin_clipboard_manager::init())
        // .plugin(tauri_plugin_shell::init())
        .invoke_handler(generate_handler![
            // Authentication commands
            authenticate_user,
            logout_user,
            get_session_status,
            // Rate limiting and security commands
            get_security_stats,
            admin_unlock_account,
            whitelist_ip_address,
            // Financial data commands
            get_accounts,
            get_account_details,
            get_transactions,
            get_financial_overview,
            calculate_net_worth,
            // Transaction management
            add_transaction,
            update_transaction,
            delete_transaction,
            categorize_transaction,
            // Insights and analytics
            get_brutal_honesty_insights,
            get_spending_analysis,
            get_budget_recommendations,
            // Data export/import
            export_financial_data,
            import_financial_data,
            // System commands
            get_system_info,
            monitor_performance,
            get_disk_usage,
            check_for_updates,
            download_update,
            install_update,
            open_file_location,
            validate_file_permissions,
            manage_app_data_directory,
            send_system_notification,
            schedule_recurring_notifications,
            monitor_file_system_changes,
            validate_application_integrity,
            log_security_events,
            open_external_url,
            // User Preferences
            get_user_preferences,
            update_user_preferences,
            reset_preferences_to_default,
            // Financial Settings
            get_currency_preferences,
            update_precision_settings,
            configure_transaction_defaults,
            // Security Settings
            get_security_settings,
            manage_biometric_settings,
            configure_backup_preferences,
            // UI/Performance Settings
            get_theme_settings,
            manage_layout_preferences,
            update_performance_settings,
        ])
        .setup(|app| {
            // setup_application(app)?;
            Ok(())
        })
        .build(generate_context!())?;

    // Run application
    app.run(|_app_handle, _event| {
        // handle_app_event(app_handle, event);
    });

    Ok(())
}

/*
fn setup_application(app: &mut App) -> tauri::Result<()> {
    tracing::info!("Setting up Atlas Financial Desktop application");

    // Get main window
    let main_window = app.get_webview_window("main").unwrap();

    // Set window properties for optimal desktop experience
    setup_window_properties(&main_window)?;

    // Set up system tray (Windows)
    #[cfg(target_os = "windows")]
    setup_system_tray(app)?;

    // Set up global shortcuts
    setup_global_shortcuts(app)?;

    // Restore window state
    let _ = app.save_window_state(StateFlags::all());

    tracing::info!("Application setup completed successfully");
    Ok(())
}
*/

/*
fn setup_window_properties(window: &Window) -> tauri::Result<()> {
    // Enable window state management
    let _ = window.restore_state(StateFlags::all());

    // Set up window event handlers
    window.on_window_event(|event| {
        match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Handle close request (minimize to tray on Windows)
                #[cfg(target_os = "windows")]
                {
                    api.prevent_close();
                    let _ = event.window().hide();
                }
            }
            tauri::WindowEvent::Focused(focused) => {
                if *focused {
                    tracing::debug!("Window gained focus");
                } else {
                    tracing::debug!("Window lost focus");
                }
            }
            _ => {}
        }
    });

    Ok(())
}
*/

// #[cfg(target_os = "windows")]
// fn setup_system_tray(app: &mut App) -> tauri::Result<()> {
//     use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
//
//     let show = CustomMenuItem::new("show".to_string(), "Show Atlas Financial");
//     let hide = CustomMenuItem::new("hide".to_string(), "Hide");
//     let quit = CustomMenuItem::new("quit".to_string(), "Quit");
//
//     let tray_menu = SystemTrayMenu::new()
//         .add_item(show)
//         .add_native_item(SystemTrayMenuItem::Separator)
//         .add_item(hide)
//         .add_item(quit);
//
//     let system_tray = SystemTray::new().with_menu(tray_menu);
//
//     app.system_tray(system_tray)?
//         .on_system_tray_event(|app, event| {
//             match event {
//                 SystemTrayEvent::LeftClick { .. } => {
//                     let window = app.get_webview_window("main").unwrap();
//                     let _ = window.show();
//                     let _ = window.set_focus();
//                 }
//                 SystemTrayEvent::MenuItemClick { id, .. } => {
//                     let window = app.get_webview_window("main").unwrap();
//                     match id.as_str() {
//                         "show" => {
//                             let _ = window.show();
//                             let _ = window.set_focus();
//                         }
//                         "hide" => {
//                             let _ = window.hide();
//                         }
//                         "quit" => {
//                             std::process::exit(0);
//                         }
//                         _ => {}
//                     }
//                 }
//                 _ => {}
//             }
//         });
//
//     Ok(())
// }
//
// fn setup_global_shortcuts(app: &mut App) -> tauri::Result<()> {
//     use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
//
//     let app_handle = app.handle().clone();
//
//     // Register Ctrl+Shift+A to show/focus Atlas Financial
//     app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
//
//     let shortcut = Shortcut::new(Some(tauri_plugin_global_shortcut::Modifiers::CONTROL | tauri_plugin_global_shortcut::Modifiers::SHIFT), tauri_plugin_global_shortcut::Code::KeyA)?;
//
//     app.global_shortcut().register(shortcut, move || {
//         if let Some(window) = app_handle.get_webview_window("main") {
//             let _ = window.show();
//             let _ = window.set_focus();
//         }
//     })?;
//
//     tracing::info!("Global shortcuts registered: Ctrl+Shift+A");
//     Ok(())
// }
//
// fn handle_app_event(app_handle: &AppHandle, event: tauri::RunEvent) {
//     match event {
//         tauri::RunEvent::ExitRequested { .. } => {
//             tracing::info!("Exit requested, shutting down gracefully");
//         }
//         tauri::RunEvent::WindowEvent { label, event, .. } => {
//             if label == "main" {
//                 match event {
//                     tauri::WindowEvent::Destroyed => {
//                         tracing::info!("Main window destroyed");
//                     }
//                     _ => {}
//                 }
//             }
//         }
//         _ => {}
//     }
// }
