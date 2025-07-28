/// User GraphQL schema definitions
///
/// Contains user authentication and profile management types
use async_graphql::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User profile information
#[derive(SimpleObject, Serialize, Deserialize, Debug, Clone)]
pub struct User {
    /// Unique user identifier
    pub id: Uuid,
    /// User email address
    pub email: String,
    /// Display name
    pub name: Option<String>,
    /// Profile image URL
    pub avatar_url: Option<String>,
    /// Account creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last login timestamp
    pub last_login: Option<DateTime<Utc>>,
    /// Account status
    pub status: UserStatus,
    /// User preferences
    pub preferences: UserPreferences,
}

/// User account status
#[derive(Enum, Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum UserStatus {
    /// Account is active and functional
    Active,
    /// Account is temporarily suspended
    Suspended,
    /// Account is pending email verification
    PendingVerification,
    /// Account has been deactivated
    Deactivated,
}

/// User preferences and settings
#[derive(SimpleObject, Serialize, Deserialize, Debug, Clone)]
pub struct UserPreferences {
    /// Preferred currency code (ISO 4217)
    pub currency: String,
    /// Timezone identifier
    pub timezone: String,
    /// Date format preference
    pub date_format: String,
    /// Notification preferences
    pub notifications: NotificationSettings,
    /// Privacy preferences
    pub privacy: PrivacySettings,
}

/// Notification settings
#[derive(SimpleObject, Serialize, Deserialize, Debug, Clone)]
pub struct NotificationSettings {
    /// Email notifications enabled
    pub email_enabled: bool,
    /// Push notifications enabled
    pub push_enabled: bool,
    /// SMS notifications enabled
    pub sms_enabled: bool,
    /// Weekly summary emails
    pub weekly_summary: bool,
    /// Transaction alerts
    pub transaction_alerts: bool,
    /// Budget alerts
    pub budget_alerts: bool,
}

/// Privacy settings
#[derive(SimpleObject, Serialize, Deserialize, Debug, Clone)]
pub struct PrivacySettings {
    /// Profile visibility
    pub profile_public: bool,
    /// Data sharing consent
    pub data_sharing: bool,
    /// Analytics tracking consent
    pub analytics_enabled: bool,
    /// Marketing communications consent
    pub marketing_enabled: bool,
}

/// Input for updating user profile
#[derive(InputObject, Deserialize, Debug)]
pub struct UpdateUserInput {
    /// Display name
    pub name: Option<String>,
    /// Profile image URL
    pub avatar_url: Option<String>,
    /// User preferences
    pub preferences: Option<UpdateUserPreferencesInput>,
}

/// Input for updating user preferences
#[derive(InputObject, Deserialize, Debug)]
pub struct UpdateUserPreferencesInput {
    /// Preferred currency code
    pub currency: Option<String>,
    /// Timezone identifier
    pub timezone: Option<String>,
    /// Date format preference
    pub date_format: Option<String>,
    /// Notification preferences
    pub notifications: Option<UpdateNotificationSettingsInput>,
    /// Privacy preferences
    pub privacy: Option<UpdatePrivacySettingsInput>,
}

/// Input for updating notification settings
#[derive(InputObject, Deserialize, Debug)]
pub struct UpdateNotificationSettingsInput {
    /// Email notifications enabled
    pub email_enabled: Option<bool>,
    /// Push notifications enabled
    pub push_enabled: Option<bool>,
    /// SMS notifications enabled
    pub sms_enabled: Option<bool>,
    /// Weekly summary emails
    pub weekly_summary: Option<bool>,
    /// Transaction alerts
    pub transaction_alerts: Option<bool>,
    /// Budget alerts
    pub budget_alerts: Option<bool>,
}

/// Input for updating privacy settings
#[derive(InputObject, Deserialize, Debug)]
pub struct UpdatePrivacySettingsInput {
    /// Profile visibility
    pub profile_public: Option<bool>,
    /// Data sharing consent
    pub data_sharing: Option<bool>,
    /// Analytics tracking consent
    pub analytics_enabled: Option<bool>,
    /// Marketing communications consent
    pub marketing_enabled: Option<bool>,
}

/// User authentication session
#[derive(SimpleObject, Serialize, Deserialize, Debug, Clone)]
pub struct UserSession {
    /// Session ID
    pub id: String,
    /// Associated user
    pub user_id: Uuid,
    /// Session creation time
    pub created_at: DateTime<Utc>,
    /// Session expiry time
    pub expires_at: DateTime<Utc>,
    /// Session IP address
    pub ip_address: String,
    /// User agent
    pub user_agent: Option<String>,
    /// Session status
    pub active: bool,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            currency: "USD".to_string(),
            timezone: "UTC".to_string(),
            date_format: "YYYY-MM-DD".to_string(),
            notifications: NotificationSettings::default(),
            privacy: PrivacySettings::default(),
        }
    }
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            email_enabled: true,
            push_enabled: true,
            sms_enabled: false,
            weekly_summary: true,
            transaction_alerts: true,
            budget_alerts: true,
        }
    }
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            profile_public: false,
            data_sharing: false,
            analytics_enabled: true,
            marketing_enabled: false,
        }
    }
}
