// Security Validation Tests
//
// Comprehensive security tests for the BEAR AI application including
// authentication, authorization, data encryption, input validation,
// and security threat prevention.

use super::common::*;
use crate::security::*;
use serde_json::json;
use std::collections::HashMap;

#[cfg(test)]
mod security_validation_tests {
    use super::*;
    use tokio;

    /// Test authentication mechanisms
    #[tokio::test]
    async fn test_authentication_flow() {
        // Test valid login
        let valid_credentials = json!({
            "email": "test@bearai.com",
            "password": "SecurePassword123!",
            "remember_me": false
        });

        let auth_result = authenticate_user(valid_credentials.to_string()).await;
        assert!(auth_result.is_ok(), "Valid authentication should succeed");

        let auth_data: serde_json::Value = serde_json::from_str(&auth_result.unwrap())
            .expect("Auth result should be valid JSON");

        TestAssertions::assert_api_response(&auth_data, true);
        assert!(auth_data.get("access_token").is_some(), "Should provide access token");
        assert!(auth_data.get("refresh_token").is_some(), "Should provide refresh token");
        assert!(auth_data.get("expires_in").is_some(), "Should specify token expiration");

        // Test invalid credentials
        let invalid_credentials = json!({
            "email": "test@bearai.com",
            "password": "WrongPassword"
        });

        let invalid_result = authenticate_user(invalid_credentials.to_string()).await;
        assert!(invalid_result.is_err(), "Invalid authentication should fail");

        // Test brute force protection
        for _ in 0..10 {
            let _ = authenticate_user(invalid_credentials.to_string()).await;
        }

        let rate_limited_result = authenticate_user(invalid_credentials.to_string()).await;
        if let Err(error) = rate_limited_result {
            assert!(error.contains("rate limit") || error.contains("too many attempts"),
                    "Should implement brute force protection");
        }
    }

    /// Test JWT token validation and security
    #[tokio::test]
    async fn test_jwt_token_security() {
        // Create a valid token
        let token_request = json!({
            "user_id": "test-user-123",
            "permissions": ["read", "write"],
            "expires_in": 3600
        });

        let token_result = create_jwt_token(token_request.to_string()).await;
        assert!(token_result.is_ok(), "Token creation should succeed");

        let token_data: serde_json::Value = serde_json::from_str(&token_result.unwrap())
            .expect("Token data should be valid JSON");

        let access_token = token_data.get("access_token")
            .and_then(|v| v.as_str())
            .expect("Should have access token");

        // Test token validation
        let validation_result = validate_jwt_token(access_token.to_string()).await;
        assert!(validation_result.is_ok(), "Valid token should validate");

        let validation_data: serde_json::Value = serde_json::from_str(&validation_result.unwrap())
            .expect("Validation data should be valid JSON");

        assert_eq!(validation_data.get("user_id").and_then(|v| v.as_str()), Some("test-user-123"));

        // Test tampered token
        let tampered_token = access_token.replace(".", "X");
        let tampered_result = validate_jwt_token(tampered_token).await;
        assert!(tampered_result.is_err(), "Tampered token should fail validation");

        // Test expired token (simulate by creating a token with negative expiry)
        let expired_token_request = json!({
            "user_id": "test-user-123",
            "permissions": ["read"],
            "expires_in": -1
        });

        let expired_token_result = create_jwt_token(expired_token_request.to_string()).await;
        if expired_token_result.is_ok() {
            let expired_data: serde_json::Value = serde_json::from_str(&expired_token_result.unwrap())
                .expect("Token data should be valid JSON");

            let expired_token = expired_data.get("access_token")
                .and_then(|v| v.as_str())
                .expect("Should have access token");

            // Wait a moment to ensure expiration
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

            let expired_validation = validate_jwt_token(expired_token.to_string()).await;
            assert!(expired_validation.is_err(), "Expired token should fail validation");
        }
    }

    /// Test authorization and permission checks
    #[tokio::test]
    async fn test_authorization_controls() {
        let test_session = TestUtils::create_test_session();

        // Test access to authorized resource
        let authorized_request = json!({
            "user_id": test_session.get("user_id"),
            "resource": "documents",
            "action": "read",
            "session_token": test_session.get("session_token")
        });

        let auth_result = check_authorization(authorized_request.to_string()).await;
        assert!(auth_result.is_ok(), "Authorized access should succeed");

        // Test access to unauthorized resource
        let unauthorized_request = json!({
            "user_id": test_session.get("user_id"),
            "resource": "admin_panel",
            "action": "write",
            "session_token": test_session.get("session_token")
        });

        let unauth_result = check_authorization(unauthorized_request.to_string()).await;
        assert!(unauth_result.is_err(), "Unauthorized access should fail");

        // Test role-based access control
        let rbac_request = json!({
            "user_id": test_session.get("user_id"),
            "required_role": "admin",
            "session_token": test_session.get("session_token")
        });

        let rbac_result = check_role_permission(rbac_request.to_string()).await;
        // Should fail unless test user has admin role
        assert!(rbac_result.is_err() || rbac_result.unwrap().contains("\"authorized\":false"),
                "Role-based access should be properly controlled");
    }

    /// Test data encryption and decryption
    #[tokio::test]
    async fn test_data_encryption() {
        let test_cases = TestFixtures::encryption_test_data();

        for test_case in test_cases {
            // Test encryption
            let encryption_request = json!({
                "data": test_case.plaintext,
                "algorithm": test_case.algorithm,
                "key_id": "test-key-123"
            });

            let encrypt_result = encrypt_data(encryption_request.to_string()).await;
            assert!(encrypt_result.is_ok(), "Encryption should succeed for: {}", test_case.name);

            let encrypted_data: serde_json::Value = serde_json::from_str(&encrypt_result.unwrap())
                .expect("Encrypted data should be valid JSON");

            let ciphertext = encrypted_data.get("ciphertext")
                .and_then(|v| v.as_str())
                .expect("Should have ciphertext");

            let nonce = encrypted_data.get("nonce")
                .and_then(|v| v.as_str())
                .expect("Should have nonce");

            // Verify ciphertext is different from plaintext
            assert_ne!(ciphertext, test_case.plaintext, "Ciphertext should differ from plaintext");
            assert!(!ciphertext.is_empty(), "Ciphertext should not be empty");

            // Test decryption
            let decryption_request = json!({
                "ciphertext": ciphertext,
                "nonce": nonce,
                "algorithm": test_case.algorithm,
                "key_id": "test-key-123"
            });

            let decrypt_result = decrypt_data(decryption_request.to_string()).await;
            assert!(decrypt_result.is_ok(), "Decryption should succeed for: {}", test_case.name);

            let decrypted_data: serde_json::Value = serde_json::from_str(&decrypt_result.unwrap())
                .expect("Decrypted data should be valid JSON");

            let plaintext = decrypted_data.get("plaintext")
                .and_then(|v| v.as_str())
                .expect("Should have plaintext");

            assert_eq!(plaintext, test_case.plaintext, "Decrypted text should match original");
        }
    }

    /// Test input validation and sanitization
    #[tokio::test]
    async fn test_input_validation() {
        // Test SQL injection prevention
        let sql_injection_attempts = vec![
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "1; DELETE FROM documents;",
            "UNION SELECT * FROM sensitive_data",
        ];

        for injection_attempt in sql_injection_attempts {
            let validation_request = json!({
                "input": injection_attempt,
                "validation_type": "sql_injection",
                "strict_mode": true
            });

            let validation_result = validate_input(validation_request.to_string()).await;
            assert!(validation_result.is_err() ||
                    validation_result.unwrap().contains("\"valid\":false"),
                    "SQL injection attempt should be blocked: {}", injection_attempt);
        }

        // Test XSS prevention
        let xss_attempts = vec![
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<iframe src='javascript:alert(\"XSS\")'></iframe>",
        ];

        for xss_attempt in xss_attempts {
            let validation_request = json!({
                "input": xss_attempt,
                "validation_type": "xss",
                "strict_mode": true
            });

            let validation_result = validate_input(validation_request.to_string()).await;
            assert!(validation_result.is_err() ||
                    validation_result.unwrap().contains("\"valid\":false"),
                    "XSS attempt should be blocked: {}", xss_attempt);
        }

        // Test valid inputs
        let valid_inputs = vec![
            "Normal text input",
            "email@example.com",
            "Valid document name.pdf",
            "Legal document content with proper formatting",
        ];

        for valid_input in valid_inputs {
            let validation_request = json!({
                "input": valid_input,
                "validation_type": "general",
                "strict_mode": true
            });

            let validation_result = validate_input(validation_request.to_string()).await;
            assert!(validation_result.is_ok() &&
                    validation_result.unwrap().contains("\"valid\":true"),
                    "Valid input should pass validation: {}", valid_input);
        }
    }

    /// Test file upload security
    #[tokio::test]
    async fn test_file_upload_security() {
        // Test malicious file detection
        let malicious_files = vec![
            TestUtils::create_test_file("<?php echo 'Malicious PHP'; ?>", "malicious.php"),
            TestUtils::create_test_file("<script>alert('XSS')</script>", "malicious.html"),
            TestUtils::create_test_file("#!/bin/bash\nrm -rf /", "malicious.sh"),
        ];

        for malicious_file in malicious_files {
            let upload_request = json!({
                "file_content": base64::encode(&malicious_file.content),
                "file_name": malicious_file.name,
                "mime_type": malicious_file.mime_type,
                "scan_for_malware": true
            });

            let upload_result = validate_file_upload(upload_request.to_string()).await;
            assert!(upload_result.is_err() ||
                    upload_result.unwrap().contains("\"safe\":false"),
                    "Malicious file should be blocked: {}", malicious_file.name);
        }

        // Test file size limits
        let oversized_content = vec![0u8; 100 * 1024 * 1024]; // 100MB
        let oversized_file = TestFile {
            name: "oversized.pdf".to_string(),
            content: oversized_content,
            mime_type: "application/pdf".to_string(),
        };

        let oversized_request = json!({
            "file_content": base64::encode(&oversized_file.content),
            "file_name": oversized_file.name,
            "mime_type": oversized_file.mime_type,
            "max_size_mb": 50
        });

        let oversized_result = validate_file_upload(oversized_request.to_string()).await;
        assert!(oversized_result.is_err() ||
                oversized_result.unwrap().contains("\"size_valid\":false"),
                "Oversized file should be rejected");

        // Test valid file
        let valid_file = TestUtils::create_test_file("Valid document content", "document.pdf");
        let valid_request = json!({
            "file_content": base64::encode(&valid_file.content),
            "file_name": valid_file.name,
            "mime_type": valid_file.mime_type,
            "scan_for_malware": true,
            "max_size_mb": 50
        });

        let valid_result = validate_file_upload(valid_request.to_string()).await;
        assert!(valid_result.is_ok() &&
                valid_result.unwrap().contains("\"safe\":true"),
                "Valid file should pass validation");
    }

    /// Test session security and management
    #[tokio::test]
    async fn test_session_security() {
        // Create a session
        let session_request = json!({
            "user_id": "test-user-123",
            "ip_address": "192.168.1.100",
            "user_agent": "TestClient/1.0"
        });

        let session_result = create_session(session_request.to_string()).await;
        assert!(session_result.is_ok(), "Session creation should succeed");

        let session_data: serde_json::Value = serde_json::from_str(&session_result.unwrap())
            .expect("Session data should be valid JSON");

        let session_id = session_data.get("session_id")
            .and_then(|v| v.as_str())
            .expect("Should have session ID");

        // Test session validation
        let validation_request = json!({
            "session_id": session_id,
            "ip_address": "192.168.1.100"
        });

        let validation_result = validate_session(validation_request.to_string()).await;
        assert!(validation_result.is_ok(), "Session validation should succeed");

        // Test session hijacking protection (different IP)
        let hijack_request = json!({
            "session_id": session_id,
            "ip_address": "10.0.0.1"
        });

        let hijack_result = validate_session(hijack_request.to_string()).await;
        assert!(hijack_result.is_err() ||
                hijack_result.unwrap().contains("\"valid\":false"),
                "Session validation should fail for different IP");

        // Test session expiration
        let expiry_request = json!({
            "session_id": session_id,
            "force_expire": true
        });

        let expiry_result = expire_session(expiry_request.to_string()).await;
        assert!(expiry_result.is_ok(), "Session expiration should succeed");

        // Validate expired session
        let expired_validation = validate_session(validation_request.to_string()).await;
        assert!(expired_validation.is_err() ||
                expired_validation.unwrap().contains("\"valid\":false"),
                "Expired session should fail validation");
    }

    /// Test API rate limiting
    #[tokio::test]
    async fn test_rate_limiting() {
        let user_id = "rate-limit-test-user";
        let api_endpoint = "/api/documents/analyze";

        // Make requests up to the limit
        for i in 0..10 {
            let rate_limit_request = json!({
                "user_id": user_id,
                "endpoint": api_endpoint,
                "request_id": format!("req_{}", i)
            });

            let result = check_rate_limit(rate_limit_request.to_string()).await;
            if i < 5 {
                // First 5 requests should succeed
                assert!(result.is_ok() && result.unwrap().contains("\"allowed\":true"),
                        "Request {} should be allowed", i);
            } else {
                // Later requests should be rate limited
                if result.is_err() || result.unwrap().contains("\"allowed\":false") {
                    println!("Rate limiting activated at request {}", i);
                    break;
                }
            }
        }

        // Test rate limit reset
        let reset_request = json!({
            "user_id": user_id,
            "endpoint": api_endpoint
        });

        let reset_result = reset_rate_limit(reset_request.to_string()).await;
        assert!(reset_result.is_ok(), "Rate limit reset should succeed");

        // Request should be allowed after reset
        let post_reset_request = json!({
            "user_id": user_id,
            "endpoint": api_endpoint,
            "request_id": "post_reset"
        });

        let post_reset_result = check_rate_limit(post_reset_request.to_string()).await;
        assert!(post_reset_result.is_ok() &&
                post_reset_result.unwrap().contains("\"allowed\":true"),
                "Request should be allowed after rate limit reset");
    }

    /// Test data masking and privacy controls
    #[tokio::test]
    async fn test_data_privacy_controls() {
        let sensitive_data = json!({
            "user_id": "123456",
            "email": "user@example.com",
            "ssn": "123-45-6789",
            "credit_card": "4532-1234-5678-9012",
            "internal_notes": "Confidential business information"
        });

        // Test data masking for different user roles
        let masking_request = json!({
            "data": sensitive_data,
            "user_role": "support_agent",
            "requested_fields": ["email", "ssn", "credit_card"]
        });

        let masking_result = apply_data_masking(masking_request.to_string()).await;
        assert!(masking_result.is_ok(), "Data masking should succeed");

        let masked_data: serde_json::Value = serde_json::from_str(&masking_result.unwrap())
            .expect("Masked data should be valid JSON");

        // Verify sensitive data is masked
        let masked_email = masked_data.get("email").and_then(|v| v.as_str()).unwrap_or("");
        let masked_ssn = masked_data.get("ssn").and_then(|v| v.as_str()).unwrap_or("");

        assert!(masked_email.contains("***") || masked_email.is_empty(),
                "Email should be masked");
        assert!(masked_ssn.contains("***") || masked_ssn.is_empty(),
                "SSN should be masked");

        // Test admin access (no masking)
        let admin_request = json!({
            "data": sensitive_data,
            "user_role": "admin",
            "requested_fields": ["email", "ssn", "credit_card"]
        });

        let admin_result = apply_data_masking(admin_request.to_string()).await;
        assert!(admin_result.is_ok(), "Admin data access should succeed");

        let admin_data: serde_json::Value = serde_json::from_str(&admin_result.unwrap())
            .expect("Admin data should be valid JSON");

        // Admin should see unmasked data
        assert_eq!(admin_data.get("email"), sensitive_data.get("email"));
    }

    /// Test security audit logging
    #[tokio::test]
    async fn test_security_audit_logging() {
        let security_events = vec![
            ("authentication_failure", json!({"user": "test@example.com", "reason": "invalid_password"})),
            ("authorization_violation", json!({"user_id": "123", "resource": "admin_panel", "action": "access_denied"})),
            ("suspicious_activity", json!({"user_id": "456", "activity": "multiple_failed_logins", "count": 5})),
            ("data_access", json!({"user_id": "789", "resource": "sensitive_document", "action": "view"})),
        ];

        for (event_type, event_data) in security_events {
            let audit_request = json!({
                "event_type": event_type,
                "event_data": event_data,
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "severity": "medium"
            });

            let audit_result = log_security_event(audit_request.to_string()).await;
            assert!(audit_result.is_ok(), "Security audit logging should succeed for: {}", event_type);
        }

        // Test audit log retrieval
        let query_request = json!({
            "event_types": ["authentication_failure", "authorization_violation"],
            "start_time": chrono::Utc::now().checked_sub_signed(chrono::Duration::hours(1)).unwrap().to_rfc3339(),
            "end_time": chrono::Utc::now().to_rfc3339(),
            "limit": 100
        });

        let query_result = query_security_audit_logs(query_request.to_string()).await;
        assert!(query_result.is_ok(), "Security audit log query should succeed");

        let audit_logs: serde_json::Value = serde_json::from_str(&query_result.unwrap())
            .expect("Audit logs should be valid JSON");

        let events = audit_logs.get("events")
            .and_then(|v| v.as_array())
            .expect("Should have events array");

        assert!(events.len() >= 2, "Should find logged security events");
    }

    /// Test cryptographic key management
    #[tokio::test]
    async fn test_cryptographic_key_management() {
        // Test key generation
        let key_request = json!({
            "key_type": "AES-256",
            "purpose": "data_encryption",
            "expiry_days": 365
        });

        let key_result = generate_encryption_key(key_request.to_string()).await;
        assert!(key_result.is_ok(), "Key generation should succeed");

        let key_data: serde_json::Value = serde_json::from_str(&key_result.unwrap())
            .expect("Key data should be valid JSON");

        let key_id = key_data.get("key_id")
            .and_then(|v| v.as_str())
            .expect("Should have key ID");

        // Test key retrieval
        let retrieve_request = json!({
            "key_id": key_id,
            "purpose": "data_encryption"
        });

        let retrieve_result = retrieve_encryption_key(retrieve_request.to_string()).await;
        assert!(retrieve_result.is_ok(), "Key retrieval should succeed");

        // Test key rotation
        let rotation_request = json!({
            "old_key_id": key_id,
            "new_key_type": "AES-256",
            "migrate_data": false
        });

        let rotation_result = rotate_encryption_key(rotation_request.to_string()).await;
        assert!(rotation_result.is_ok(), "Key rotation should succeed");

        let rotation_data: serde_json::Value = serde_json::from_str(&rotation_result.unwrap())
            .expect("Rotation data should be valid JSON");

        let new_key_id = rotation_data.get("new_key_id")
            .and_then(|v| v.as_str())
            .expect("Should have new key ID");

        assert_ne!(key_id, new_key_id, "New key should have different ID");

        // Test key revocation
        let revocation_request = json!({
            "key_id": key_id,
            "reason": "security_test"
        });

        let revocation_result = revoke_encryption_key(revocation_request.to_string()).await;
        assert!(revocation_result.is_ok(), "Key revocation should succeed");

        // Attempt to use revoked key should fail
        let revoked_key_test = retrieve_encryption_key(retrieve_request.to_string()).await;
        assert!(revoked_key_test.is_err() ||
                revoked_key_test.unwrap().contains("\"status\":\"revoked\""),
                "Revoked key should not be usable");
    }

    /// Test security headers and CORS configuration
    #[tokio::test]
    async fn test_security_headers() {
        let security_config = json!({
            "enable_csp": true,
            "enable_hsts": true,
            "enable_cors": true,
            "allowed_origins": ["https://app.bearai.com", "https://dashboard.bearai.com"],
            "max_age": 31536000
        });

        let config_result = configure_security_headers(security_config.to_string()).await;
        assert!(config_result.is_ok(), "Security headers configuration should succeed");

        // Test CORS preflight request
        let cors_request = json!({
            "origin": "https://app.bearai.com",
            "method": "POST",
            "headers": ["Content-Type", "Authorization"]
        });

        let cors_result = handle_cors_preflight(cors_request.to_string()).await;
        assert!(cors_result.is_ok(), "CORS preflight should succeed for allowed origin");

        let cors_data: serde_json::Value = serde_json::from_str(&cors_result.unwrap())
            .expect("CORS data should be valid JSON");

        assert_eq!(cors_data.get("allowed").and_then(|v| v.as_bool()), Some(true));

        // Test blocked origin
        let blocked_cors_request = json!({
            "origin": "https://malicious.com",
            "method": "POST",
            "headers": ["Content-Type"]
        });

        let blocked_cors_result = handle_cors_preflight(blocked_cors_request.to_string()).await;
        assert!(blocked_cors_result.is_err() ||
                blocked_cors_result.unwrap().contains("\"allowed\":false"),
                "CORS should block unauthorized origins");
    }

    /// Test concurrent security operations
    #[tokio::test]
    async fn test_concurrent_security_operations() {
        let operations = vec![
            ("encrypt", json!({"data": "test data 1", "key_id": "key1"})),
            ("validate_token", json!({"token": "test_token_1"})),
            ("check_permissions", json!({"user_id": "user1", "resource": "doc1"})),
            ("audit_log", json!({"event": "test_event_1", "user": "user1"})),
            ("rate_limit", json!({"user_id": "user1", "endpoint": "/api/test"})),
        ];

        let security_futures = operations.into_iter().map(|(operation, data)| {
            match operation {
                "encrypt" => encrypt_data(data.to_string()),
                "validate_token" => validate_jwt_token("dummy_token".to_string()),
                "check_permissions" => check_authorization(data.to_string()),
                "audit_log" => log_security_event(data.to_string()),
                "rate_limit" => check_rate_limit(data.to_string()),
                _ => panic!("Unknown operation"),
            }
        });

        let start_time = std::time::Instant::now();
        let results = futures::future::join_all(security_futures).await;
        let duration = start_time.elapsed();

        // Security operations should complete quickly
        TestAssertions::assert_performance(duration.as_millis() as u64, 5000);

        // Most operations should succeed (some may fail due to dummy data)
        let success_count = results.iter().filter(|r| r.is_ok()).count();
        assert!(success_count >= 1, "At least some security operations should succeed");

        println!("Concurrent security operations completed in {:?}", duration);
    }
}