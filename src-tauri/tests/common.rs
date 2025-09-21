// Common test utilities and fixtures for Tauri application tests

use std::collections::HashMap;
use serde_json::{json, Value};
use tokio::time::{timeout, Duration};

/// Test configuration constants
pub const TEST_TIMEOUT: Duration = Duration::from_secs(30);
pub const LONG_TEST_TIMEOUT: Duration = Duration::from_secs(120);

/// Test data fixtures
pub struct TestFixtures;

impl TestFixtures {
    /// Sample PII data for testing detection
    pub fn sample_pii_data() -> Vec<TestPIICase> {
        vec![
            TestPIICase {
                name: "Email Detection",
                content: "Contact John at john.doe@example.com for more information.",
                expected_pii: vec![
                    PIIMatch {
                        pii_type: "email".to_string(),
                        value: "john.doe@example.com".to_string(),
                        confidence: 0.95,
                        start_pos: 17,
                        end_pos: 37,
                    }
                ],
            },
            TestPIICase {
                name: "Phone Number Detection",
                content: "Call us at (555) 123-4567 or 555.987.6543",
                expected_pii: vec![
                    PIIMatch {
                        pii_type: "phone".to_string(),
                        value: "(555) 123-4567".to_string(),
                        confidence: 0.90,
                        start_pos: 11,
                        end_pos: 25,
                    },
                    PIIMatch {
                        pii_type: "phone".to_string(),
                        value: "555.987.6543".to_string(),
                        confidence: 0.90,
                        start_pos: 29,
                        end_pos: 41,
                    }
                ],
            },
            TestPIICase {
                name: "SSN Detection",
                content: "My SSN is 123-45-6789 and it's confidential.",
                expected_pii: vec![
                    PIIMatch {
                        pii_type: "ssn".to_string(),
                        value: "123-45-6789".to_string(),
                        confidence: 0.98,
                        start_pos: 10,
                        end_pos: 21,
                    }
                ],
            },
            TestPIICase {
                name: "Credit Card Detection",
                content: "Payment with card 4532-1234-5678-9012 is processed.",
                expected_pii: vec![
                    PIIMatch {
                        pii_type: "credit_card".to_string(),
                        value: "4532-1234-5678-9012".to_string(),
                        confidence: 0.95,
                        start_pos: 18,
                        end_pos: 37,
                    }
                ],
            },
            TestPIICase {
                name: "Mixed PII Content",
                content: "Contact Jane Smith at jane@company.com or call (555) 987-6543. Her employee ID is EMP123456.",
                expected_pii: vec![
                    PIIMatch {
                        pii_type: "email".to_string(),
                        value: "jane@company.com".to_string(),
                        confidence: 0.95,
                        start_pos: 22,
                        end_pos: 38,
                    },
                    PIIMatch {
                        pii_type: "phone".to_string(),
                        value: "(555) 987-6543".to_string(),
                        confidence: 0.90,
                        start_pos: 47,
                        end_pos: 61,
                    }
                ],
            },
            TestPIICase {
                name: "No PII Content",
                content: "This is a sample document about legal procedures and regulations.",
                expected_pii: vec![],
            }
        ]
    }

    /// Sample document data for testing analysis
    pub fn sample_documents() -> Vec<TestDocument> {
        vec![
            TestDocument {
                name: "Sample Contract",
                content: r#"
                    PROFESSIONAL SERVICES AGREEMENT

                    This Agreement is entered into between Client Corp and Provider LLC.
                    Term: 12 months beginning January 1, 2024
                    Payment: $10,000 monthly, due on the 1st of each month
                    Scope: Software development and consulting services

                    Termination clause: Either party may terminate with 30 days notice.
                    Confidentiality: All information shared shall remain confidential.
                "#.to_string(),
                document_type: "contract".to_string(),
                expected_entities: vec![
                    "Client Corp".to_string(),
                    "Provider LLC".to_string(),
                    "January 1, 2024".to_string(),
                    "$10,000".to_string(),
                ],
            },
            TestDocument {
                name: "Legal Motion",
                content: r#"
                    IN THE UNITED STATES DISTRICT COURT
                    FOR THE SOUTHERN DISTRICT OF NEW YORK

                    Case No. 23-CV-12345

                    PLAINTIFF vs DEFENDANT

                    MOTION TO DISMISS

                    Comes now Defendant, by and through undersigned counsel,
                    and respectfully moves this Court to dismiss the complaint
                    pursuant to Fed. R. Civ. P. 12(b)(6) for failure to state
                    a claim upon which relief can be granted.
                "#.to_string(),
                document_type: "motion".to_string(),
                expected_entities: vec![
                    "23-CV-12345".to_string(),
                    "Fed. R. Civ. P. 12(b)(6)".to_string(),
                    "Southern District of New York".to_string(),
                ],
            }
        ]
    }

    /// Sample Stripe test data
    pub fn stripe_test_data() -> StripeTestData {
        StripeTestData {
            test_cards: vec![
                TestCard {
                    number: "4242424242424242".to_string(),
                    exp_month: 12,
                    exp_year: 2025,
                    cvc: "123".to_string(),
                    description: "Valid Visa card".to_string(),
                    should_succeed: true,
                },
                TestCard {
                    number: "4000000000000002".to_string(),
                    exp_month: 12,
                    exp_year: 2025,
                    cvc: "123".to_string(),
                    description: "Card will be declined".to_string(),
                    should_succeed: false,
                },
                TestCard {
                    number: "4000000000009995".to_string(),
                    exp_month: 12,
                    exp_year: 2025,
                    cvc: "123".to_string(),
                    description: "Insufficient funds".to_string(),
                    should_succeed: false,
                },
            ],
            test_plans: vec![
                TestPlan {
                    id: "basic".to_string(),
                    name: "Basic Plan".to_string(),
                    amount: 2999, // $29.99 in cents
                    currency: "usd".to_string(),
                    interval: "month".to_string(),
                },
                TestPlan {
                    id: "professional".to_string(),
                    name: "Professional Plan".to_string(),
                    amount: 9999, // $99.99 in cents
                    currency: "usd".to_string(),
                    interval: "month".to_string(),
                },
            ],
        }
    }

    /// Generate test encryption data
    pub fn encryption_test_data() -> Vec<EncryptionTestCase> {
        vec![
            EncryptionTestCase {
                name: "Short Text".to_string(),
                plaintext: "Hello, World!".to_string(),
                algorithm: "AES-GCM".to_string(),
            },
            EncryptionTestCase {
                name: "Medium Text".to_string(),
                plaintext: "This is a longer piece of text that should be encrypted and decrypted properly.".to_string(),
                algorithm: "AES-GCM".to_string(),
            },
            EncryptionTestCase {
                name: "JSON Data".to_string(),
                plaintext: r#"{"user_id": "123", "email": "test@example.com", "sensitive_data": "confidential"}"#.to_string(),
                algorithm: "AES-GCM".to_string(),
            },
            EncryptionTestCase {
                name: "Large Text".to_string(),
                plaintext: "Lorem ipsum ".repeat(1000),
                algorithm: "AES-GCM".to_string(),
            },
        ]
    }
}

/// Test data structures
#[derive(Debug, Clone)]
pub struct TestPIICase {
    pub name: &'static str,
    pub content: &'static str,
    pub expected_pii: Vec<PIIMatch>,
}

#[derive(Debug, Clone)]
pub struct PIIMatch {
    pub pii_type: String,
    pub value: String,
    pub confidence: f64,
    pub start_pos: usize,
    pub end_pos: usize,
}

#[derive(Debug, Clone)]
pub struct TestDocument {
    pub name: &'static str,
    pub content: String,
    pub document_type: String,
    pub expected_entities: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct StripeTestData {
    pub test_cards: Vec<TestCard>,
    pub test_plans: Vec<TestPlan>,
}

#[derive(Debug, Clone)]
pub struct TestCard {
    pub number: String,
    pub exp_month: u32,
    pub exp_year: u32,
    pub cvc: String,
    pub description: String,
    pub should_succeed: bool,
}

#[derive(Debug, Clone)]
pub struct TestPlan {
    pub id: String,
    pub name: String,
    pub amount: u64,
    pub currency: String,
    pub interval: String,
}

#[derive(Debug, Clone)]
pub struct EncryptionTestCase {
    pub name: String,
    pub plaintext: String,
    pub algorithm: String,
}

/// Test utilities
pub struct TestUtils;

impl TestUtils {
    /// Create a test user session
    pub fn create_test_session() -> HashMap<String, Value> {
        let mut session = HashMap::new();
        session.insert("user_id".to_string(), json!("test-user-12345"));
        session.insert("email".to_string(), json!("test@bearai.com"));
        session.insert("subscription_tier".to_string(), json!("professional"));
        session.insert("permissions".to_string(), json!(["read", "write", "analyze", "admin"]));
        session.insert("session_token".to_string(), json!("test-session-token-abcdef"));
        session.insert("expires_at".to_string(), json!(chrono::Utc::now().timestamp() + 3600));
        session
    }

    /// Generate test file data
    pub fn create_test_file(content: &str, filename: &str) -> TestFile {
        TestFile {
            name: filename.to_string(),
            content: content.as_bytes().to_vec(),
            mime_type: Self::guess_mime_type(filename),
        }
    }

    /// Guess MIME type from filename
    fn guess_mime_type(filename: &str) -> String {
        match filename.split('.').last().unwrap_or("") {
            "pdf" => "application/pdf".to_string(),
            "doc" => "application/msword".to_string(),
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string(),
            "txt" => "text/plain".to_string(),
            "json" => "application/json".to_string(),
            "xml" => "application/xml".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    }

    /// Wait for async operation with timeout
    pub async fn wait_for_result<T, F>(future: F) -> Result<T, String>
    where
        F: std::future::Future<Output = T>,
    {
        match timeout(TEST_TIMEOUT, future).await {
            Ok(result) => Ok(result),
            Err(_) => Err("Operation timed out".to_string()),
        }
    }

    /// Generate random test data
    pub fn random_string(length: usize) -> String {
        use rand::{distributions::Alphanumeric, Rng};
        rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(length)
            .map(char::from)
            .collect()
    }

    /// Validate JSON structure
    pub fn validate_json_structure(value: &Value, expected_keys: &[&str]) -> bool {
        if let Some(obj) = value.as_object() {
            expected_keys.iter().all(|key| obj.contains_key(*key))
        } else {
            false
        }
    }

    /// Compare floating point values with tolerance
    pub fn approx_equal(a: f64, b: f64, tolerance: f64) -> bool {
        (a - b).abs() < tolerance
    }

    /// Setup test environment
    pub async fn setup_test_environment() {
        // Initialize logging for tests
        env_logger::init();

        // Setup test database
        // Create temporary directories
        // Initialize test configuration
        println!("Test environment initialized");
    }

    /// Cleanup test environment
    pub async fn cleanup_test_environment() {
        // Clean up temporary files
        // Close database connections
        // Reset global state
        println!("Test environment cleaned up");
    }
}

#[derive(Debug, Clone)]
pub struct TestFile {
    pub name: String,
    pub content: Vec<u8>,
    pub mime_type: String,
}

/// Assertion helpers for tests
pub struct TestAssertions;

impl TestAssertions {
    /// Assert that PII detection results match expected
    pub fn assert_pii_matches(actual: &[PIIMatch], expected: &[PIIMatch], tolerance: f64) {
        assert_eq!(actual.len(), expected.len(), "PII match count should be equal");

        for (actual_match, expected_match) in actual.iter().zip(expected.iter()) {
            assert_eq!(actual_match.pii_type, expected_match.pii_type, "PII type should match");
            assert_eq!(actual_match.value, expected_match.value, "PII value should match");
            assert!(
                TestUtils::approx_equal(actual_match.confidence, expected_match.confidence, tolerance),
                "PII confidence should be within tolerance: {} vs {}",
                actual_match.confidence,
                expected_match.confidence
            );
        }
    }

    /// Assert API response structure
    pub fn assert_api_response(response: &Value, success: bool) {
        assert!(response.is_object(), "Response should be a JSON object");
        assert_eq!(
            response.get("success").and_then(|v| v.as_bool()).unwrap_or(false),
            success,
            "Response success status should match expected"
        );

        if success {
            assert!(response.get("data").is_some(), "Successful response should have data field");
        } else {
            assert!(response.get("error").is_some(), "Error response should have error field");
        }
    }

    /// Assert performance metrics
    pub fn assert_performance(duration_ms: u64, max_ms: u64) {
        assert!(
            duration_ms <= max_ms,
            "Operation took {}ms, expected <= {}ms",
            duration_ms,
            max_ms
        );
    }

    /// Assert memory usage is within bounds
    pub fn assert_memory_usage(current_mb: usize, max_mb: usize) {
        assert!(
            current_mb <= max_mb,
            "Memory usage {}MB exceeds limit {}MB",
            current_mb,
            max_mb
        );
    }
}