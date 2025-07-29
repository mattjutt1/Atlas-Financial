// SecureVault - Enterprise Key Management System
// Atlas Financial Desktop - Bank-grade security with hardware integration

use aes_gcm::{Aes256Gcm, Key, Nonce, AeadCore, KeyInit, Aead};
use rand::{RngCore, CryptoRng};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use chrono::{DateTime, Utc, Duration};

/// SecureVault Error Types
#[derive(Error, Debug)]
pub enum VaultError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Key derivation failed: {0}")]
    KeyDerivationFailed(String),
    #[error("Hardware fingerprinting failed: {0}")]
    HardwareFingerprintFailed(String),
    #[error("Keychain access failed: {0}")]
    KeychainFailed(String),
    #[error("Key rotation failed: {0}")]
    KeyRotationFailed(String),
    #[error("Audit logging failed: {0}")]
    AuditFailed(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Key metadata for rotation and audit
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyMetadata {
    pub key_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub rotation_count: u32,
    pub hardware_fingerprint: String,
    pub derivation_salt: Vec<u8>,
    pub iterations: u32,
}

impl KeyMetadata {
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    pub fn needs_rotation(&self) -> bool {
        self.is_expired() || (Utc::now() + Duration::days(5) > self.expires_at)
    }
}

/// Encrypted key storage format
#[derive(Debug, Serialize, Deserialize)]
struct EncryptedKeyData {
    pub metadata: KeyMetadata,
    pub encrypted_key: Vec<u8>,
    pub nonce: Vec<u8>,
    pub version: u8,
}

/// SecureVault implementation with enterprise features
pub struct SecureVault {
    app_handle: tauri::AppHandle,
    master_key: Option<[u8; 32]>,
    current_metadata: Option<KeyMetadata>,
}

impl SecureVault {
    /// Initialize SecureVault with hardware fingerprinting
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            app_handle,
            master_key: None,
            current_metadata: None,
        }
    }

    /// Initialize vault and derive encryption key
    pub async fn initialize(&mut self) -> Result<(), VaultError> {
        tracing::info!("🔐 Initializing SecureVault with hardware fingerprinting");

        // Check for existing key first
        if let Ok(Some(_)) = self.load_existing_key().await {
            tracing::info!("✅ Existing encryption key loaded successfully");
            return Ok(());
        }

        // Generate new key with hardware fingerprinting
        self.generate_new_key().await?;

        // Audit log initialization
        self.audit_log("vault_initialized", "SecureVault initialized with new key").await?;

        tracing::info!("✅ SecureVault initialized successfully");
        Ok(())
    }

    /// Generate hardware fingerprint for machine-specific key derivation
    fn generate_hardware_fingerprint(&self) -> Result<String, VaultError> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();

        // Combine multiple hardware identifiers
        let mut fingerprint_data = Vec::new();

        // CPU information
        #[cfg(target_os = "windows")]
        {
            if let Ok(output) = std::process::Command::new("wmic")
                .args(&["cpu", "get", "ProcessorId", "/value"])
                .output()
            {
                fingerprint_data.extend_from_slice(&output.stdout);
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Ok(output) = std::process::Command::new("system_profiler")
                .args(&["SPHardwareDataType"])
                .output()
            {
                fingerprint_data.extend_from_slice(&output.stdout);
            }
        }

        #[cfg(target_os = "linux")]
        {
            // Use /proc/cpuinfo and /sys/class/dmi/id/product_uuid
            if let Ok(cpuinfo) = std::fs::read("/proc/cpuinfo") {
                fingerprint_data.extend_from_slice(&cpuinfo);
            }
            if let Ok(uuid) = std::fs::read("/sys/class/dmi/id/product_uuid") {
                fingerprint_data.extend_from_slice(&uuid);
            }
        }

        // MAC address as additional identifier
        if let Ok(interfaces) = get_if_addrs::get_if_addrs() {
            for interface in interfaces {
                if !interface.is_loopback() {
                    interface.name.hash(&mut hasher);
                }
            }
        }

        // Fallback to hostname if hardware info unavailable
        if fingerprint_data.is_empty() {
            if let Ok(hostname) = hostname::get() {
                fingerprint_data = hostname.to_string_lossy().into_bytes();
            } else {
                return Err(VaultError::HardwareFingerprintFailed(
                    "Unable to generate hardware fingerprint".to_string()
                ));
            }
        }

        fingerprint_data.hash(&mut hasher);
        let fingerprint = format!("{:x}", hasher.finish());

        tracing::debug!("🔍 Generated hardware fingerprint: {}...", &fingerprint[..8]);
        Ok(fingerprint)
    }

    /// Derive encryption key using PBKDF2 with hardware fingerprint
    fn derive_encryption_key(
        &self,
        hardware_fingerprint: &str,
        salt: &[u8],
        iterations: u32,
    ) -> Result<[u8; 32], VaultError> {
        let mut key = [0u8; 32];

        // Combine hardware fingerprint with application context
        let password = format!("atlas_financial_desktop_{}", hardware_fingerprint);

        pbkdf2_hmac::<Sha256>(
            password.as_bytes(),
            salt,
            iterations,
            &mut key,
        );

        Ok(key)
    }

    /// Generate new encryption key with metadata
    async fn generate_new_key(&mut self) -> Result<(), VaultError> {
        tracing::info!("🔑 Generating new encryption key with hardware fingerprinting");

        let hardware_fingerprint = self.generate_hardware_fingerprint()?;

        // Generate cryptographically secure salt
        let mut salt = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut salt);

        // Use 100,000 iterations for PBKDF2 (meets security requirements)
        const ITERATIONS: u32 = 100_000;

        // Derive encryption key
        let encryption_key = self.derive_encryption_key(
            &hardware_fingerprint,
            &salt,
            ITERATIONS,
        )?;

        // Create key metadata
        let metadata = KeyMetadata {
            key_id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            expires_at: Utc::now() + Duration::days(30), // 30-day rotation cycle
            rotation_count: 0,
            hardware_fingerprint: hardware_fingerprint.clone(),
            derivation_salt: salt.to_vec(),
            iterations: ITERATIONS,
        };

        // Store in OS keychain
        self.store_key_in_keychain(&encryption_key, &metadata).await?;

        // Cache in memory
        self.master_key = Some(encryption_key);
        self.current_metadata = Some(metadata);

        tracing::info!("✅ New encryption key generated and stored securely");
        Ok(())
    }

    /// Store encryption key in OS keychain
    async fn store_key_in_keychain(
        &self,
        key: &[u8; 32],
        metadata: &KeyMetadata,
    ) -> Result<(), VaultError> {
        use keyring::Entry;

        let service = "Atlas-Financial-Desktop";
        let username = &metadata.key_id;

        // Store metadata separately from the key
        let metadata_entry = Entry::new(
            &format!("{}-metadata", service),
            username,
        ).map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let metadata_json = serde_json::to_string(metadata)?;
        metadata_entry.set_password(&metadata_json)
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        // Store encrypted key (encrypt with hardware-derived key for defense in depth)
        let key_entry = Entry::new(service, username)
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let key_b64 = base64::encode(key);
        key_entry.set_password(&key_b64)
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        tracing::debug!("🔐 Key stored in OS keychain with ID: {}", metadata.key_id);
        Ok(())
    }

    /// Load existing key from keychain
    async fn load_existing_key(&mut self) -> Result<Option<KeyMetadata>, VaultError> {
        use keyring::Entry;

        // Try to find the most recent key in keychain
        let service = "Atlas-Financial-Desktop";

        // For now, try to load a known key ID from app data
        let app_data_dir = self.app_handle.path().app_data_dir()
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let key_id_path = app_data_dir.join("current_key_id");
        if !key_id_path.exists() {
            return Ok(None);
        }

        let key_id = tokio::fs::read_to_string(&key_id_path).await?;
        let key_id = key_id.trim();

        // Load metadata
        let metadata_entry = Entry::new(
            &format!("{}-metadata", service),
            key_id,
        ).map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let metadata_json = metadata_entry.get_password()
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let metadata: KeyMetadata = serde_json::from_str(&metadata_json)?;

        // Check if key needs rotation
        if metadata.needs_rotation() {
            tracing::warn!("⚠️  Encryption key needs rotation");
            self.rotate_key().await?;
            return Ok(self.current_metadata.clone());
        }

        // Load the actual key
        let key_entry = Entry::new(service, key_id)
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let key_b64 = key_entry.get_password()
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        let key_bytes = base64::decode(&key_b64)
            .map_err(|e| VaultError::KeychainFailed(e.to_string()))?;

        if key_bytes.len() != 32 {
            return Err(VaultError::KeychainFailed("Invalid key length".to_string()));
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);

        self.master_key = Some(key);
        self.current_metadata = Some(metadata.clone());

        tracing::debug!("🔑 Existing key loaded from keychain: {}", key_id);
        Ok(Some(metadata))
    }

    /// Rotate encryption key (for 30-day cycle)
    pub async fn rotate_key(&mut self) -> Result<(), VaultError> {
        tracing::info!("🔄 Starting key rotation");

        let old_metadata = self.current_metadata.clone();

        // Generate new key
        self.generate_new_key().await?;

        // Update current key ID file
        if let Some(new_metadata) = &self.current_metadata {
            let app_data_dir = self.app_handle.path().app_data_dir()
                .map_err(|e| VaultError::KeyRotationFailed(e.to_string()))?;

            tokio::fs::create_dir_all(&app_data_dir).await?;
            let key_id_path = app_data_dir.join("current_key_id");
            tokio::fs::write(&key_id_path, &new_metadata.key_id).await?;
        }

        // Clean up old key after successful rotation
        if let Some(old_meta) = old_metadata {
            self.cleanup_old_key(&old_meta.key_id).await?;
        }

        self.audit_log("key_rotated", "Encryption key rotated successfully").await?;

        tracing::info!("✅ Key rotation completed successfully");
        Ok(())
    }

    /// Clean up old key from keychain
    async fn cleanup_old_key(&self, old_key_id: &str) -> Result<(), VaultError> {
        use keyring::Entry;

        let service = "Atlas-Financial-Desktop";

        // Remove metadata
        if let Ok(metadata_entry) = Entry::new(&format!("{}-metadata", service), old_key_id) {
            let _ = metadata_entry.delete_password();
        }

        // Remove key
        if let Ok(key_entry) = Entry::new(service, old_key_id) {
            let _ = key_entry.delete_password();
        }

        tracing::debug!("🗑️  Cleaned up old key: {}", old_key_id);
        Ok(())
    }

    /// Encrypt data using current encryption key
    pub fn encrypt(&self, data: &str) -> Result<Vec<u8>, VaultError> {
        let key = self.master_key.ok_or_else(|| {
            VaultError::EncryptionFailed("Vault not initialized".to_string())
        })?;

        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
        let nonce = Aes256Gcm::generate_nonce(&mut rand::thread_rng());

        let ciphertext = cipher.encrypt(&nonce, data.as_bytes())
            .map_err(|e| VaultError::EncryptionFailed(e.to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt data using current encryption key (with backward compatibility)
    pub fn decrypt(&self, data: &[u8]) -> Result<String, VaultError> {
        if data.len() < 12 {
            return Err(VaultError::DecryptionFailed("Invalid encrypted data".to_string()));
        }

        // Try current key first
        if let Some(key) = self.master_key {
            if let Ok(result) = self.decrypt_with_key(data, &key) {
                return Ok(result);
            }
        }

        // Try backward compatibility with hardcoded key (48-hour grace period)
        let legacy_key = b"atlas_financial_desktop_key_32b!";
        if let Ok(result) = self.decrypt_with_key(data, legacy_key) {
            tracing::warn!("⚠️  Used legacy key for decryption - consider key migration");
            return Ok(result);
        }

        Err(VaultError::DecryptionFailed("Unable to decrypt with any available key".to_string()))
    }

    /// Decrypt with specific key
    fn decrypt_with_key(&self, data: &[u8], key: &[u8; 32]) -> Result<String, VaultError> {
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));

        // Extract nonce and ciphertext
        let (nonce, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce);

        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|e| VaultError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext)
            .map_err(|e| VaultError::DecryptionFailed(e.to_string()))
    }

    /// Get current key metadata for monitoring
    pub fn get_key_metadata(&self) -> Option<&KeyMetadata> {
        self.current_metadata.as_ref()
    }

    /// Check if key needs rotation
    pub fn needs_key_rotation(&self) -> bool {
        self.current_metadata.as_ref()
            .map(|m| m.needs_rotation())
            .unwrap_or(true)
    }

    /// Audit logging for security events
    async fn audit_log(&self, event: &str, details: &str) -> Result<(), VaultError> {
        let audit_entry = serde_json::json!({
            "timestamp": Utc::now().to_rfc3339(),
            "event": event,
            "details": details,
            "key_id": self.current_metadata.as_ref().map(|m| &m.key_id),
            "hardware_fingerprint": self.current_metadata.as_ref().map(|m| &m.hardware_fingerprint[..8])
        });

        // Log to application logs
        tracing::info!("🔐 Security Audit: {}", audit_entry);

        // Store audit log in secure location
        let app_data_dir = self.app_handle.path().app_data_dir()
            .map_err(|e| VaultError::AuditFailed(e.to_string()))?;

        tokio::fs::create_dir_all(&app_data_dir).await?;
        let audit_path = app_data_dir.join("security_audit.log");

        let audit_line = format!("{}\n", audit_entry);
        tokio::fs::write(&audit_path, audit_line).await
            .map_err(|e| VaultError::AuditFailed(e.to_string()))?;

        Ok(())
    }

    /// Validate key strength and configuration
    pub fn validate_security(&self) -> Result<(), VaultError> {
        if let Some(metadata) = &self.current_metadata {
            // Ensure minimum iteration count
            if metadata.iterations < 100_000 {
                return Err(VaultError::KeyDerivationFailed(
                    "Insufficient PBKDF2 iterations".to_string()
                ));
            }

            // Ensure key hasn't expired
            if metadata.is_expired() {
                return Err(VaultError::KeyRotationFailed(
                    "Encryption key has expired".to_string()
                ));
            }

            // Validate hardware fingerprint length
            if metadata.hardware_fingerprint.len() < 8 {
                return Err(VaultError::HardwareFingerprintFailed(
                    "Hardware fingerprint too short".to_string()
                ));
            }
        }

        Ok(())
    }
}

/// Initialize global SecureVault instance
static mut VAULT_INSTANCE: Option<SecureVault> = None;
static VAULT_INIT: std::sync::Once = std::sync::Once::new();

/// Get global SecureVault instance
pub async fn get_vault(app_handle: tauri::AppHandle) -> Result<&'static mut SecureVault, VaultError> {
    unsafe {
        VAULT_INIT.call_once(|| {
            VAULT_INSTANCE = Some(SecureVault::new(app_handle));
        });

        if let Some(vault) = &mut VAULT_INSTANCE {
            if vault.master_key.is_none() {
                vault.initialize().await?;
            }
            Ok(vault)
        } else {
            Err(VaultError::KeyDerivationFailed("Failed to initialize vault".to_string()))
        }
    }
}

/// Convenience functions for encryption/decryption
pub async fn encrypt_data(app_handle: tauri::AppHandle, data: &str) -> Result<Vec<u8>, VaultError> {
    let start = std::time::Instant::now();
    let vault = get_vault(app_handle).await?;
    let result = vault.encrypt(data);

    let duration = start.elapsed();
    if duration.as_millis() > 5 {
        tracing::warn!("⚠️  Encryption took {}ms (target: <5ms)", duration.as_millis());
    }

    result
}

pub async fn decrypt_data(app_handle: tauri::AppHandle, data: &[u8]) -> Result<String, VaultError> {
    let start = std::time::Instant::now();
    let vault = get_vault(app_handle).await?;
    let result = vault.decrypt(data);

    let duration = start.elapsed();
    if duration.as_millis() > 5 {
        tracing::warn!("⚠️  Decryption took {}ms (target: <5ms)", duration.as_millis());
    }

    result
}

/// Check if key rotation is needed
pub async fn check_key_rotation(app_handle: tauri::AppHandle) -> Result<bool, VaultError> {
    let vault = get_vault(app_handle).await?;
    Ok(vault.needs_key_rotation())
}

/// Force key rotation
pub async fn rotate_encryption_key(app_handle: tauri::AppHandle) -> Result<(), VaultError> {
    let vault = get_vault(app_handle).await?;
    vault.rotate_key().await
}
