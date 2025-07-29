use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    #[error("Database error: {message}")]
    Database { message: String },

    #[error("Authentication error: {message}")]
    Authentication { message: String },

    #[error("Validation error: {message}")]
    Validation { message: String },

    #[error("Not found: {resource}")]
    NotFound { resource: String },

    #[error("Permission denied: {action}")]
    PermissionDenied { action: String },

    #[error("Financial calculation error: {message}")]
    FinancialCalculation { message: String },

    #[error("Encryption error: {message}")]
    Encryption { message: String },

    #[error("Internal error: {message}")]
    Internal { message: String },
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database {
            message: err.to_string(),
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Internal {
            message: err.to_string(),
        }
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(err: bcrypt::BcryptError) -> Self {
        AppError::Authentication {
            message: err.to_string(),
        }
    }
}

// Result type for the application
pub type AppResult<T> = Result<T, AppError>;

// Implement Tauri command error conversion
impl From<AppError> for tauri::InvokeError {
    fn from(err: AppError) -> Self {
        tauri::InvokeError::from_anyhow(anyhow::anyhow!(err))
    }
}
