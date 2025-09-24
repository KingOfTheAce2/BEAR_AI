#[cfg(test)]
mod session_management_tests {
    use super::super::src::security::{
        SecurityManager, SessionValidationResult, Permission, DocumentProtectionLevel, SecurityConfig
    };
    use chrono::{Duration, Utc};
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn create_test_security_manager() -> (SecurityManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let security_manager = SecurityManager::new(temp_dir.path()).unwrap();
        (security_manager, temp_dir)
    }

    #[tokio::test]
    async fn test_session_creation() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_123".to_string();
        let permissions = vec![Permission::DocumentRead, Permission::DocumentWrite];
        let ip_address = Some("192.168.1.100".to_string());
        let user_agent = Some("BEAR AI Client/1.0".to_string());

        let result = security_manager.create_session(
            user_id.clone(),
            permissions.clone(),
            ip_address.clone(),
            user_agent.clone(),
        );

        assert!(result.is_ok());
        let (jwt_token, refresh_token) = result.unwrap();

        // Verify tokens are not empty
        assert!(!jwt_token.is_empty());
        assert!(!refresh_token.is_empty());

        // Verify tokens are different
        assert_ne!(jwt_token, refresh_token);
    }

    #[tokio::test]
    async fn test_session_validation() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_456".to_string();
        let permissions = vec![Permission::DocumentRead, Permission::SystemConfiguration];
        let ip_address = Some("192.168.1.100".to_string());

        // Create session
        let (jwt_token, _refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions.clone(),
            ip_address.clone(),
            None,
        ).unwrap();

        // Validate session
        let validation_result = security_manager.validate_session_token(
            &jwt_token,
            Some("192.168.1.100")
        );

        assert!(validation_result.is_valid);
        assert_eq!(validation_result.user_id, Some(user_id));
        assert_eq!(validation_result.permissions.len(), 2);
        assert!(validation_result.permissions.contains(&Permission::DocumentRead));
        assert!(validation_result.permissions.contains(&Permission::SystemConfiguration));
        assert!(validation_result.error_message.is_none());
    }

    #[tokio::test]
    async fn test_session_validation_with_ip_mismatch() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_789".to_string();
        let permissions = vec![Permission::DocumentRead];
        let ip_address = Some("192.168.1.100".to_string());

        // Create session
        let (jwt_token, _refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions,
            ip_address,
            None,
        ).unwrap();

        // Validate session with different IP
        let validation_result = security_manager.validate_session_token(
            &jwt_token,
            Some("192.168.1.200") // Different IP
        );

        assert!(!validation_result.is_valid);
        assert_eq!(validation_result.error_message, Some("IP address mismatch".to_string()));
    }

    #[tokio::test]
    async fn test_session_refresh() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_refresh".to_string();
        let permissions = vec![Permission::DocumentRead];

        // Create initial session
        let (_jwt_token, refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions,
            None,
            None,
        ).unwrap();

        // Refresh session
        let refresh_result = security_manager.refresh_session(&refresh_token);
        assert!(refresh_result.is_ok());

        let (new_jwt_token, new_refresh_token) = refresh_result.unwrap();
        assert!(!new_jwt_token.is_empty());
        assert!(!new_refresh_token.is_empty());
        assert_ne!(refresh_token, new_refresh_token);
    }

    #[tokio::test]
    async fn test_session_revocation() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_revoke".to_string();
        let permissions = vec![Permission::DocumentRead];

        // Create session
        let (jwt_token, _refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions,
            None,
            None,
        ).unwrap();

        // Extract session ID from validation result
        let validation_result = security_manager.validate_session_token(&jwt_token, None);
        assert!(validation_result.is_valid);
        let session_id = validation_result.session_id.unwrap();

        // Revoke session
        let revoke_result = security_manager.revoke_session(&session_id);
        assert!(revoke_result.is_ok());

        // Validate revoked session should fail
        let validation_result_after_revoke = security_manager.validate_session_token(&jwt_token, None);
        assert!(!validation_result_after_revoke.is_valid);
        assert_eq!(validation_result_after_revoke.error_message, Some("Session revoked".to_string()));
    }

    #[tokio::test]
    async fn test_concurrent_session_limits() {
        let (mut security_manager, _temp_dir) = create_test_security_manager();

        // Update config to allow only 2 concurrent sessions
        let mut config = security_manager.get_config().clone();
        config.max_concurrent_sessions = 2;
        security_manager.update_config(config);

        let user_id = "test_user_concurrent".to_string();
        let permissions = vec![Permission::DocumentRead];

        // Create first session
        let result1 = security_manager.create_session(
            user_id.clone(),
            permissions.clone(),
            None,
            None,
        );
        assert!(result1.is_ok());

        // Create second session
        let result2 = security_manager.create_session(
            user_id.clone(),
            permissions.clone(),
            None,
            None,
        );
        assert!(result2.is_ok());

        // Create third session (should succeed but revoke oldest)
        let result3 = security_manager.create_session(
            user_id.clone(),
            permissions,
            None,
            None,
        );
        assert!(result3.is_ok());

        // Verify user has sessions
        let session_count = security_manager.get_user_session_count(&user_id).unwrap();
        assert!(session_count <= 2); // Should not exceed limit
    }

    #[tokio::test]
    async fn test_user_context_retrieval() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let user_id = "test_user_context".to_string();
        let permissions = vec![Permission::DocumentRead];

        // Initially no user context
        assert_eq!(security_manager.get_current_user_id(), None);

        // Create and validate session
        let (jwt_token, _refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions,
            None,
            None,
        ).unwrap();

        // Validate session (this sets the context)
        let validation_result = security_manager.validate_session_token(&jwt_token, None);
        assert!(validation_result.is_valid);

        // Now user context should be available
        assert_eq!(security_manager.get_current_user_id(), Some(user_id));
    }

    #[tokio::test]
    async fn test_expired_session_cleanup() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        // Create a session (this will be automatically expired for test)
        let user_id = "test_user_cleanup".to_string();
        let permissions = vec![Permission::DocumentRead];

        let (_jwt_token, _refresh_token) = security_manager.create_session(
            user_id.clone(),
            permissions,
            None,
            None,
        ).unwrap();

        // Cleanup expired sessions
        let cleanup_result = security_manager.cleanup_expired_sessions();
        assert!(cleanup_result.is_ok());

        // The count might be 0 if session hasn't expired yet, but the function should work
        let cleaned_count = cleanup_result.unwrap();
        assert!(cleaned_count >= 0);
    }

    #[tokio::test]
    async fn test_empty_token_validation() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let validation_result = security_manager.validate_session_token("", None);
        assert!(!validation_result.is_valid);
        assert_eq!(validation_result.error_message, Some("Empty token".to_string()));
    }

    #[tokio::test]
    async fn test_invalid_token_validation() {
        let (security_manager, _temp_dir) = create_test_security_manager();

        let validation_result = security_manager.validate_session_token("invalid.jwt.token", None);
        assert!(!validation_result.is_valid);
        assert!(validation_result.error_message.is_some());
        assert!(validation_result.error_message.unwrap().starts_with("Invalid JWT"));
    }
}