use tauri::State;
use serde::{Deserialize, Serialize};

use crate::{AppState, domain::{LoginCredentials, UserSession}, error::AppResult};

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub session: UserSession,
    pub session_token: String,
}

#[tauri::command]
pub async fn login(
    request: LoginRequest,
    state: State<'_, AppState>,
) -> Result<LoginResponse, String> {
    let credentials = LoginCredentials::new(request.username, request.password);

    let session = state
        .services
        .auth_service
        .authenticate(credentials)
        .await
        .map_err(|e| e.to_string())?;

    // Generate session token
    let session_token = uuid::Uuid::new_v4().to_string();

    Ok(LoginResponse {
        session,
        session_token,
    })
}

#[tauri::command]
pub async fn logout(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .services
        .auth_service
        .logout(&session_token)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn verify_session(
    session_token: String,
    state: State<'_, AppState>,
) -> Result<UserSession, String> {
    state
        .services
        .auth_service
        .verify_session(&session_token)
        .await
        .map_err(|e| e.to_string())
}
