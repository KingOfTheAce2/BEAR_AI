// PII Detection Tests
//
// Comprehensive tests for Personal Identifiable Information (PII) detection
// functionality in the BEAR AI application, including accuracy, performance,
// and GDPR compliance validation.

use super::common::*;
use crate::pii_detector::*;
use serde_json::json;
use std::collections::HashMap;

#[cfg(test)]
mod pii_detection_tests {
    use super::*;
    use tokio;

    /// Test basic PII detection functionality
    #[tokio::test]
    async fn test_basic_pii_detection() {
        let test_cases = TestFixtures::sample_pii_data();

        for test_case in test_cases {
            println!("Testing: {}", test_case.name);

            let detection_request = json!({
                "content": test_case.content,
                "detection_types": ["email", "phone", "ssn", "credit_card", "address"],
                "confidence_threshold": 0.8
            });

            let result = detect_pii(detection_request.to_string()).await;
            assert!(result.is_ok(), "PII detection should succeed for: {}", test_case.name);

            let detection_result = result.unwrap();
            let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
                .expect("PII detection result should be valid JSON");

            // Verify response structure
            TestAssertions::assert_api_response(&pii_data, true);
            assert!(pii_data.get("detected_pii").is_some(), "Should have detected_pii field");

            let detected_pii = pii_data.get("detected_pii")
                .and_then(|v| v.as_array())
                .expect("detected_pii should be an array");

            // Convert detected PII to our test format for comparison
            let detected_matches: Vec<PIIMatch> = detected_pii.iter()
                .map(|item| PIIMatch {
                    pii_type: item.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    value: item.get("value").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    confidence: item.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0),
                    start_pos: item.get("start_pos").and_then(|v| v.as_u64()).unwrap_or(0) as usize,
                    end_pos: item.get("end_pos").and_then(|v| v.as_u64()).unwrap_or(0) as usize,
                })
                .collect();

            // Assert matches with tolerance for confidence scores
            TestAssertions::assert_pii_matches(&detected_matches, &test_case.expected_pii, 0.1);
        }
    }

    /// Test PII detection with different confidence thresholds
    #[tokio::test]
    async fn test_confidence_threshold_filtering() {
        let test_content = "Contact john.doe@example.com or maybe john@company.co.uk";

        let thresholds = vec![0.5, 0.7, 0.9, 0.95];

        for threshold in thresholds {
            let detection_request = json!({
                "content": test_content,
                "detection_types": ["email"],
                "confidence_threshold": threshold
            });

            let result = detect_pii(detection_request.to_string()).await;
            assert!(result.is_ok(), "PII detection should succeed for threshold: {}", threshold);

            let detection_result = result.unwrap();
            let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
                .expect("PII detection result should be valid JSON");

            let detected_pii = pii_data.get("detected_pii")
                .and_then(|v| v.as_array())
                .expect("detected_pii should be an array");

            // Higher thresholds should generally detect fewer items
            // (though this depends on the actual confidence scores)
            for item in detected_pii {
                let confidence = item.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0);
                assert!(confidence >= threshold,
                        "All detected PII should meet confidence threshold: {} >= {}",
                        confidence, threshold);
            }
        }
    }

    /// Test PII detection in different document formats
    #[tokio::test]
    async fn test_pii_detection_document_formats() {
        let test_documents = vec![
            TestUtils::create_test_file(
                "Email: support@company.com\nPhone: (555) 123-4567",
                "sample.txt"
            ),
            TestUtils::create_test_file(
                r#"{"user": {"email": "user@domain.com", "phone": "555-987-6543"}}"#,
                "data.json"
            ),
            TestUtils::create_test_file(
                "<contact><email>admin@site.org</email><phone>555-111-2222</phone></contact>",
                "contacts.xml"
            ),
        ];

        for test_file in test_documents {
            let detection_request = json!({
                "file_content": base64::encode(&test_file.content),
                "file_name": test_file.name,
                "mime_type": test_file.mime_type,
                "detection_types": ["email", "phone"]
            });

            let result = detect_pii_in_file(detection_request.to_string()).await;
            assert!(result.is_ok(), "PII detection should succeed for file: {}", test_file.name);

            let detection_result = result.unwrap();
            let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
                .expect("PII detection result should be valid JSON");

            let detected_pii = pii_data.get("detected_pii")
                .and_then(|v| v.as_array())
                .expect("detected_pii should be an array");

            // Each test file should detect at least one email and one phone
            let email_count = detected_pii.iter()
                .filter(|item| item.get("type").and_then(|v| v.as_str()) == Some("email"))
                .count();
            let phone_count = detected_pii.iter()
                .filter(|item| item.get("type").and_then(|v| v.as_str()) == Some("phone"))
                .count();

            assert!(email_count >= 1, "Should detect at least one email in {}", test_file.name);
            assert!(phone_count >= 1, "Should detect at least one phone in {}", test_file.name);
        }
    }

    /// Test PII redaction functionality
    #[tokio::test]
    async fn test_pii_redaction() {
        let test_content = "Contact John Doe at john.doe@company.com or call (555) 123-4567";

        // First detect PII
        let detection_request = json!({
            "content": test_content,
            "detection_types": ["email", "phone"]
        });

        let detection_result = detect_pii(detection_request.to_string()).await;
        assert!(detection_result.is_ok(), "PII detection should succeed");

        // Then redact the detected PII
        let redaction_request = json!({
            "content": test_content,
            "redaction_strategy": "replace",
            "replacement_text": "[REDACTED]",
            "pii_types_to_redact": ["email", "phone"]
        });

        let redaction_result = redact_pii(redaction_request.to_string()).await;
        assert!(redaction_result.is_ok(), "PII redaction should succeed");

        let redacted_data: serde_json::Value = serde_json::from_str(&redaction_result.unwrap())
            .expect("Redaction result should be valid JSON");

        let redacted_content = redacted_data.get("redacted_content")
            .and_then(|v| v.as_str())
            .expect("Should have redacted_content field");

        // Verify original PII is removed
        assert!(!redacted_content.contains("john.doe@company.com"),
                "Email should be redacted");
        assert!(!redacted_content.contains("(555) 123-4567"),
                "Phone should be redacted");
        assert!(redacted_content.contains("[REDACTED]"),
                "Should contain replacement text");

        // Verify redaction mapping
        let redaction_map = redacted_data.get("redaction_map")
            .and_then(|v| v.as_array())
            .expect("Should have redaction_map");

        assert!(redaction_map.len() >= 2, "Should have redaction entries for email and phone");
    }

    /// Test different redaction strategies
    #[tokio::test]
    async fn test_redaction_strategies() {
        let test_content = "User email: user@example.com, SSN: 123-45-6789";

        let strategies = vec![
            ("replace", "[REDACTED]"),
            ("mask", "****"),
            ("partial", "***@***.com"),
            ("hash", "<HASH>"),
        ];

        for (strategy, expected_replacement) in strategies {
            let redaction_request = json!({
                "content": test_content,
                "redaction_strategy": strategy,
                "replacement_text": expected_replacement,
                "pii_types_to_redact": ["email", "ssn"]
            });

            let result = redact_pii(redaction_request.to_string()).await;
            assert!(result.is_ok(), "Redaction should succeed for strategy: {}", strategy);

            let redacted_data: serde_json::Value = serde_json::from_str(&result.unwrap())
                .expect("Redaction result should be valid JSON");

            let redacted_content = redacted_data.get("redacted_content")
                .and_then(|v| v.as_str())
                .expect("Should have redacted_content field");

            // Verify original sensitive data is not present
            assert!(!redacted_content.contains("user@example.com"),
                    "Original email should be redacted with strategy: {}", strategy);
            assert!(!redacted_content.contains("123-45-6789"),
                    "Original SSN should be redacted with strategy: {}", strategy);

            // Strategy-specific validations
            match strategy {
                "replace" => assert!(redacted_content.contains(expected_replacement)),
                "mask" => assert!(redacted_content.contains("****")),
                "partial" => {
                    // Partial redaction should preserve some structure
                    assert!(redacted_content.contains("@"));
                }
                "hash" => assert!(redacted_content.contains("<HASH>")),
                _ => {}
            }
        }
    }

    /// Test PII detection accuracy with edge cases
    #[tokio::test]
    async fn test_pii_detection_edge_cases() {
        let edge_cases = vec![
            // False positive tests
            ("version@1.2.3 is not an email", "email", false),
            ("Call 911 for emergencies", "phone", false), // Should not detect emergency numbers
            ("Price is $123.45", "ssn", false), // Should not detect prices as SSN

            // Boundary cases
            ("a@b.co", "email", true), // Minimal valid email
            ("1-800-FLOWERS", "phone", true), // Phone with letters
            ("000-00-0000", "ssn", false), // Invalid SSN format

            // International formats
            ("+1-555-123-4567", "phone", true), // International phone
            ("user@domain.co.uk", "email", true), // International domain

            // Context-dependent cases
            ("social security number: 123-45-6789", "ssn", true), // With context
            ("reference number 123-45-6789", "ssn", false), // Without SSN context
        ];

        for (content, pii_type, should_detect) in edge_cases {
            let detection_request = json!({
                "content": content,
                "detection_types": [pii_type],
                "confidence_threshold": 0.7
            });

            let result = detect_pii(detection_request.to_string()).await;
            assert!(result.is_ok(), "PII detection should succeed for: {}", content);

            let detection_result = result.unwrap();
            let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
                .expect("PII detection result should be valid JSON");

            let detected_pii = pii_data.get("detected_pii")
                .and_then(|v| v.as_array())
                .expect("detected_pii should be an array");

            let found_pii = detected_pii.iter()
                .any(|item| item.get("type").and_then(|v| v.as_str()) == Some(pii_type));

            if should_detect {
                assert!(found_pii, "Should detect {} in: {}", pii_type, content);
            } else {
                assert!(!found_pii, "Should NOT detect {} in: {}", pii_type, content);
            }
        }
    }

    /// Test batch PII detection for multiple documents
    #[tokio::test]
    async fn test_batch_pii_detection() {
        let documents = vec![
            "Document 1: Contact john@company.com",
            "Document 2: Phone (555) 987-6543",
            "Document 3: SSN 123-45-6789",
            "Document 4: Credit card 4532-1234-5678-9012",
            "Document 5: No PII here, just regular text",
        ];

        let batch_request = json!({
            "documents": documents,
            "detection_types": ["email", "phone", "ssn", "credit_card"],
            "confidence_threshold": 0.8
        });

        let result = detect_pii_batch(batch_request.to_string()).await;
        assert!(result.is_ok(), "Batch PII detection should succeed");

        let batch_result: serde_json::Value = serde_json::from_str(&result.unwrap())
            .expect("Batch result should be valid JSON");

        let results = batch_result.get("results")
            .and_then(|v| v.as_array())
            .expect("Should have results array");

        assert_eq!(results.len(), 5, "Should have results for all documents");

        // Verify each document result
        for (i, result) in results.iter().enumerate() {
            let detected_pii = result.get("detected_pii")
                .and_then(|v| v.as_array())
                .expect("Each result should have detected_pii array");

            match i {
                0 => assert!(detected_pii.iter().any(|p| p.get("type").and_then(|v| v.as_str()) == Some("email"))),
                1 => assert!(detected_pii.iter().any(|p| p.get("type").and_then(|v| v.as_str()) == Some("phone"))),
                2 => assert!(detected_pii.iter().any(|p| p.get("type").and_then(|v| v.as_str()) == Some("ssn"))),
                3 => assert!(detected_pii.iter().any(|p| p.get("type").and_then(|v| v.as_str()) == Some("credit_card"))),
                4 => assert_eq!(detected_pii.len(), 0, "Document 5 should have no PII"),
                _ => {}
            }
        }
    }

    /// Test PII detection performance with large documents
    #[tokio::test]
    async fn test_pii_detection_performance() {
        // Create a large document with scattered PII
        let mut large_content = String::new();
        for i in 0..1000 {
            large_content.push_str(&format!(
                "Paragraph {} contains some text. Contact user{}@domain.com for information. ",
                i, i
            ));
        }

        let start_time = std::time::Instant::now();

        let detection_request = json!({
            "content": large_content,
            "detection_types": ["email", "phone", "ssn"],
            "confidence_threshold": 0.8
        });

        let result = detect_pii(detection_request.to_string()).await;
        let duration = start_time.elapsed();

        assert!(result.is_ok(), "PII detection should succeed for large document");

        // Performance assertion: should complete within 10 seconds
        TestAssertions::assert_performance(duration.as_millis() as u64, 10000);

        let detection_result = result.unwrap();
        let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
            .expect("PII detection result should be valid JSON");

        let detected_pii = pii_data.get("detected_pii")
            .and_then(|v| v.as_array())
            .expect("detected_pii should be an array");

        // Should detect 1000 email addresses
        let email_count = detected_pii.iter()
            .filter(|item| item.get("type").and_then(|v| v.as_str()) == Some("email"))
            .count();

        assert!(email_count >= 990, "Should detect most emails, got: {}", email_count);
    }

    /// Test GDPR compliance features
    #[tokio::test]
    async fn test_gdpr_compliance() {
        let pii_content = "EU citizen data: name@europa.eu, phone +49-123-456789";

        // Test GDPR-specific detection
        let gdpr_request = json!({
            "content": pii_content,
            "detection_types": ["email", "phone", "gdpr_special_categories"],
            "gdpr_mode": true,
            "jurisdiction": "EU"
        });

        let result = detect_pii_gdpr(gdpr_request.to_string()).await;
        assert!(result.is_ok(), "GDPR PII detection should succeed");

        let gdpr_result: serde_json::Value = serde_json::from_str(&result.unwrap())
            .expect("GDPR result should be valid JSON");

        // Verify GDPR-specific fields
        assert!(gdpr_result.get("gdpr_compliance_report").is_some(),
                "Should include GDPR compliance report");
        assert!(gdpr_result.get("data_subject_rights").is_some(),
                "Should include data subject rights information");
        assert!(gdpr_result.get("lawful_basis_recommendation").is_some(),
                "Should include lawful basis recommendation");

        // Test right to erasure (right to be forgotten)
        let erasure_request = json!({
            "content": pii_content,
            "data_subject_request": "erasure",
            "pii_types": ["email", "phone"]
        });

        let erasure_result = process_data_subject_request(erasure_request.to_string()).await;
        assert!(erasure_result.is_ok(), "Data subject erasure request should succeed");

        let erasure_data: serde_json::Value = serde_json::from_str(&erasure_result.unwrap())
            .expect("Erasure result should be valid JSON");

        assert!(erasure_data.get("erasure_complete").and_then(|v| v.as_bool()).unwrap_or(false),
                "Erasure should be marked as complete");
    }

    /// Test PII detection configuration and customization
    #[tokio::test]
    async fn test_pii_detection_configuration() {
        // Test custom PII patterns
        let custom_patterns = json!({
            "employee_id": {
                "pattern": "EMP\\d{6}",
                "confidence": 0.9,
                "description": "Employee ID pattern"
            },
            "internal_reference": {
                "pattern": "REF-[A-Z]{2}-\\d{4}",
                "confidence": 0.8,
                "description": "Internal reference number"
            }
        });

        let config_request = json!({
            "custom_patterns": custom_patterns,
            "enabled_detectors": ["email", "phone", "employee_id", "internal_reference"],
            "global_confidence_threshold": 0.75
        });

        let config_result = configure_pii_detection(config_request.to_string()).await;
        assert!(config_result.is_ok(), "PII detection configuration should succeed");

        // Test detection with custom patterns
        let test_content = "Employee EMP123456 has reference REF-AB-1234 for contact john@company.com";

        let detection_request = json!({
            "content": test_content,
            "use_custom_patterns": true
        });

        let result = detect_pii(detection_request.to_string()).await;
        assert!(result.is_ok(), "Detection with custom patterns should succeed");

        let detection_result = result.unwrap();
        let pii_data: serde_json::Value = serde_json::from_str(&detection_result)
            .expect("Detection result should be valid JSON");

        let detected_pii = pii_data.get("detected_pii")
            .and_then(|v| v.as_array())
            .expect("detected_pii should be an array");

        // Should detect custom patterns
        let employee_id_found = detected_pii.iter()
            .any(|item| item.get("type").and_then(|v| v.as_str()) == Some("employee_id"));
        let reference_found = detected_pii.iter()
            .any(|item| item.get("type").and_then(|v| v.as_str()) == Some("internal_reference"));

        assert!(employee_id_found, "Should detect custom employee ID pattern");
        assert!(reference_found, "Should detect custom reference pattern");
    }

    /// Test PII detection audit logging
    #[tokio::test]
    async fn test_pii_detection_audit_logging() {
        let test_session = TestUtils::create_test_session();
        let user_id = test_session.get("user_id").and_then(|v| v.as_str()).unwrap();

        let detection_request = json!({
            "content": "Audit test: contact audit@company.com",
            "detection_types": ["email"],
            "user_id": user_id,
            "audit_required": true
        });

        let result = detect_pii_with_audit(detection_request.to_string()).await;
        assert!(result.is_ok(), "PII detection with audit should succeed");

        // Verify audit log was created
        let audit_request = json!({
            "user_id": user_id,
            "operation_type": "pii_detection",
            "limit": 10
        });

        let audit_result = get_pii_audit_logs(audit_request.to_string()).await;
        assert!(audit_result.is_ok(), "Audit log retrieval should succeed");

        let audit_data: serde_json::Value = serde_json::from_str(&audit_result.unwrap())
            .expect("Audit data should be valid JSON");

        let audit_entries = audit_data.get("audit_entries")
            .and_then(|v| v.as_array())
            .expect("Should have audit entries");

        assert!(audit_entries.len() > 0, "Should have at least one audit entry");

        let latest_entry = &audit_entries[0];
        assert_eq!(latest_entry.get("user_id").and_then(|v| v.as_str()), Some(user_id));
        assert_eq!(latest_entry.get("operation").and_then(|v| v.as_str()), Some("pii_detection"));
        assert!(latest_entry.get("timestamp").is_some(), "Should have timestamp");
    }

    /// Test concurrent PII detection operations
    #[tokio::test]
    async fn test_concurrent_pii_detection() {
        let test_contents = vec![
            "Content 1: email1@test.com",
            "Content 2: phone (555) 111-1111",
            "Content 3: email2@test.com and phone (555) 222-2222",
            "Content 4: SSN 111-11-1111",
            "Content 5: credit card 4111-1111-1111-1111",
        ];

        let detection_futures = test_contents.into_iter().enumerate().map(|(i, content)| {
            let detection_request = json!({
                "content": content,
                "detection_types": ["email", "phone", "ssn", "credit_card"],
                "request_id": format!("concurrent_test_{}", i)
            });

            detect_pii(detection_request.to_string())
        });

        let start_time = std::time::Instant::now();
        let results = futures::future::join_all(detection_futures).await;
        let duration = start_time.elapsed();

        // All detections should succeed
        for (i, result) in results.iter().enumerate() {
            assert!(result.is_ok(), "Concurrent detection {} should succeed", i);
        }

        // Concurrent operations should be faster than sequential
        TestAssertions::assert_performance(duration.as_millis() as u64, 5000); // 5 seconds max

        println!("Concurrent PII detection completed in {:?}", duration);
    }
}