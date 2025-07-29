// Tauri Command Handlers for Atlas Financial Desktop
// Bank-grade financial precision with native desktop integration

use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use crate::AppState;

// Re-export all command modules
pub mod auth;
pub mod financial;
pub mod system;
pub mod preferences;
pub mod security_validation;

pub use auth::*;
pub use financial::*;
pub use system::*;
pub use preferences::*;
pub use security_validation::*;

// Common response wrapper for consistent error handling
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl<T> CommandResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: chrono::Utc::now(),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
            timestamp: chrono::Utc::now(),
        }
    }
}

// Common desktop notification helper
pub async fn send_desktop_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()?;

    Ok(())
}

// Common external URL opener
#[tauri::command]
pub async fn open_external_url(
    url: String,
    app: AppHandle,
) -> Result<CommandResponse<()>, tauri::Error> {
    use tauri_plugin_shell::ShellExt;

    match app.shell().open(&url, None) {
        Ok(_) => Ok(CommandResponse::success(())),
        Err(e) => Ok(CommandResponse::error(format!("Failed to open URL: {}", e))),
    }
}

// Desktop-specific utility functions
pub mod desktop_utils {
    use super::*;
    use tauri_plugin_fs::FsExt;
    use tauri_plugin_dialog::DialogExt;

    // Save file dialog with desktop integration
    pub async fn save_file_dialog(
        app: &AppHandle,
        title: &str,
        default_name: &str,
        filters: Vec<(&str, &[&str])>,
    ) -> Result<Option<String>, Box<dyn std::error::Error>> {
        let file_path = app.dialog()
            .file()
            .set_title(title)
            .set_file_name(default_name)
            .add_filter("All Files", &["*"]);

        for (name, extensions) in filters {
            let file_path = file_path.add_filter(name, extensions);
        }

        let result = file_path.save_file().await?;
        Ok(result.map(|p| p.to_string_lossy().to_string()))
    }

    // Open file dialog with desktop integration
    pub async fn open_file_dialog(
        app: &AppHandle,
        title: &str,
        multiple: bool,
        filters: Vec<(&str, &[&str])>,
    ) -> Result<Option<Vec<String>>, Box<dyn std::error::Error>> {
        let file_dialog = app.dialog()
            .file()
            .set_title(title);

        let file_dialog = if multiple {
            file_dialog
        } else {
            file_dialog
        };

        for (name, extensions) in filters {
            let file_dialog = file_dialog.add_filter(name, extensions);
        }

        let result = if multiple {
            file_dialog.pick_files().await?
                .map(|paths| paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect())
        } else {
            file_dialog.pick_file().await?
                .map(|path| vec![path.to_string_lossy().to_string()])
        };

        Ok(result)
    }

    // Write file with proper error handling
    pub async fn write_file(
        app: &AppHandle,
        path: &str,
        contents: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>> {
        app.fs().write(path, contents).await?;
        Ok(())
    }

    // Read file with proper error handling
    pub async fn read_file(
        app: &AppHandle,
        path: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let contents = app.fs().read(path).await?;
        Ok(contents)
    }
}
