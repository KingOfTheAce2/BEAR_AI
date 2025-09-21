// Document Analysis Tests
//
// Comprehensive tests for document analysis functionality including
// text extraction, entity recognition, classification, and AI-powered insights.

use super::common::*;
use crate::document_analyzer::*;
use serde_json::json;
use std::collections::HashMap;

#[cfg(test)]
mod document_analysis_tests {
    use super::*;
    use tokio;

    /// Test basic document analysis workflow
    #[tokio::test]
    async fn test_basic_document_analysis() {
        let test_documents = TestFixtures::sample_documents();

        for document in test_documents {
            println!("Testing document analysis: {}", document.name);

            let analysis_request = json!({
                "content": document.content,
                "document_type": document.document_type,
                "analysis_options": {
                    "extract_entities": true,
                    "classify_document": true,
                    "detect_language": true,
                    "sentiment_analysis": false
                }
            });

            let result = analyze_document(analysis_request.to_string()).await;
            assert!(result.is_ok(), "Document analysis should succeed for: {}", document.name);

            let analysis_result = result.unwrap();
            let analysis_data: serde_json::Value = serde_json::from_str(&analysis_result)
                .expect("Analysis result should be valid JSON");

            // Verify response structure
            TestAssertions::assert_api_response(&analysis_data, true);
            assert!(analysis_data.get("document_classification").is_some(), "Should have document classification");
            assert!(analysis_data.get("extracted_entities").is_some(), "Should have extracted entities");
            assert!(analysis_data.get("confidence_score").is_some(), "Should have confidence score");

            // Verify document type classification
            let classified_type = analysis_data.get("document_classification")
                .and_then(|v| v.get("type"))
                .and_then(|v| v.as_str())
                .expect("Should have classified document type");

            assert_eq!(classified_type, document.document_type,
                      "Document should be classified correctly as: {}", document.document_type);

            // Verify entity extraction
            let extracted_entities = analysis_data.get("extracted_entities")
                .and_then(|v| v.as_array())
                .expect("Should have extracted entities array");

            // Check that expected entities were found
            for expected_entity in &document.expected_entities {
                let entity_found = extracted_entities.iter().any(|entity| {
                    entity.get("text").and_then(|v| v.as_str())
                        .map(|text| text.contains(expected_entity))
                        .unwrap_or(false)
                });

                assert!(entity_found, "Should extract entity: {}", expected_entity);
            }

            // Verify confidence score is reasonable
            let confidence = analysis_data.get("confidence_score")
                .and_then(|v| v.as_f64())
                .expect("Should have confidence score");

            assert!(confidence >= 0.0 && confidence <= 1.0,
                   "Confidence score should be between 0 and 1: {}", confidence);
        }
    }

    /// Test document format support and text extraction
    #[tokio::test]
    async fn test_document_format_support() {
        let test_files = vec![
            TestUtils::create_test_file(
                "This is a plain text document for testing.",
                "sample.txt"
            ),
            TestUtils::create_test_file(
                r#"{"title": "JSON Document", "content": "JSON formatted legal data"}"#,
                "data.json"
            ),
            TestUtils::create_test_file(
                "<document><title>XML Legal Document</title><content>XML formatted content</content></document>",
                "legal.xml"
            ),
            TestUtils::create_test_file(
                "Name,Email,Department\nJohn Doe,john@company.com,Legal\nJane Smith,jane@company.com,Compliance",
                "contacts.csv"
            ),
        ];

        for test_file in test_files {
            let extraction_request = json!({
                "file_content": base64::encode(&test_file.content),
                "file_name": test_file.name,
                "mime_type": test_file.mime_type,
                "extraction_options": {
                    "preserve_formatting": true,
                    "extract_metadata": true,
                    "detect_encoding": true
                }
            });

            let result = extract_text_from_file(extraction_request.to_string()).await;
            assert!(result.is_ok(), "Text extraction should succeed for: {}", test_file.name);

            let extraction_result = result.unwrap();
            let extraction_data: serde_json::Value = serde_json::from_str(&extraction_result)
                .expect("Extraction result should be valid JSON");

            // Verify extracted text
            let extracted_text = extraction_data.get("extracted_text")
                .and_then(|v| v.as_str())
                .expect("Should have extracted text");

            assert!(!extracted_text.is_empty(), "Extracted text should not be empty");

            // Verify metadata
            let metadata = extraction_data.get("metadata")
                .and_then(|v| v.as_object())
                .expect("Should have metadata");

            assert!(metadata.contains_key("file_size"), "Should include file size");
            assert!(metadata.contains_key("mime_type"), "Should include MIME type");

            // Format-specific validations
            match test_file.mime_type.as_str() {
                "application/json" => {
                    assert!(extracted_text.contains("JSON Document"), "Should extract JSON content");
                }
                "application/xml" => {
                    assert!(extracted_text.contains("XML Legal Document"), "Should extract XML content");
                }
                "text/csv" => {
                    assert!(extracted_text.contains("John Doe"), "Should extract CSV content");
                }
                _ => {}
            }
        }
    }

    /// Test document classification accuracy
    #[tokio::test]
    async fn test_document_classification() {
        let classification_test_cases = vec![
            (
                "Contract Agreement",
                "This is a professional services agreement between parties for software development.",
                "contract"
            ),
            (
                "Legal Motion",
                "Motion to dismiss filed in the United States District Court pursuant to Fed. R. Civ. P. 12(b)(6).",
                "motion"
            ),
            (
                "Corporate Policy",
                "Employee handbook section 4.2: Confidentiality and non-disclosure requirements for all staff.",
                "policy"
            ),
            (
                "Court Opinion",
                "The court finds that the defendant's actions constitute a breach of contract as defined in Section 2.",
                "opinion"
            ),
            (
                "Legislation",
                "H.R. 1234 - An Act to amend the Privacy Protection Act to include additional data security requirements.",
                "legislation"
            ),
        ];

        for (name, content, expected_type) in classification_test_cases {
            let classification_request = json!({
                "content": content,
                "classification_options": {
                    "confidence_threshold": 0.7,
                    "include_subcategories": true,
                    "multilabel": false
                }
            });

            let result = classify_document(classification_request.to_string()).await;
            assert!(result.is_ok(), "Document classification should succeed for: {}", name);

            let classification_result = result.unwrap();
            let classification_data: serde_json::Value = serde_json::from_str(&classification_result)
                .expect("Classification result should be valid JSON");

            let predicted_type = classification_data.get("primary_classification")
                .and_then(|v| v.get("type"))
                .and_then(|v| v.as_str())
                .expect("Should have primary classification");

            let confidence = classification_data.get("primary_classification")
                .and_then(|v| v.get("confidence"))
                .and_then(|v| v.as_f64())
                .expect("Should have classification confidence");

            assert_eq!(predicted_type, expected_type,
                      "Document should be classified as: {}", expected_type);
            assert!(confidence >= 0.7, "Classification confidence should be >= 0.7: {}", confidence);
        }
    }

    /// Test entity extraction and recognition
    #[tokio::test]
    async fn test_entity_extraction() {
        let entity_test_content = r#"
            This agreement is between Acme Corporation (Client) and Legal Services LLC (Provider).
            The contract period is from January 1, 2024 to December 31, 2024.
            Payment amount is $50,000 per month, due on the 15th of each month.
            Contact John Smith at john.smith@acme.com or (555) 123-4567.
            Case reference: CV-2024-001234 filed in Superior Court of California.
        "#;

        let extraction_request = json!({
            "content": entity_test_content,
            "entity_types": [
                "organization",
                "person",
                "date",
                "money",
                "email",
                "phone",
                "case_number",
                "court"
            ],
            "extraction_options": {
                "confidence_threshold": 0.8,
                "include_context": true,
                "normalize_entities": true
            }
        });

        let result = extract_entities(extraction_request.to_string()).await;
        assert!(result.is_ok(), "Entity extraction should succeed");

        let extraction_result = result.unwrap();
        let extraction_data: serde_json::Value = serde_json::from_str(&extraction_result)
            .expect("Extraction result should be valid JSON");

        let entities = extraction_data.get("entities")
            .and_then(|v| v.as_array())
            .expect("Should have entities array");

        // Define expected entities
        let expected_entities = vec![
            ("organization", "Acme Corporation"),
            ("organization", "Legal Services LLC"),
            ("person", "John Smith"),
            ("date", "January 1, 2024"),
            ("date", "December 31, 2024"),
            ("money", "$50,000"),
            ("email", "john.smith@acme.com"),
            ("phone", "(555) 123-4567"),
            ("case_number", "CV-2024-001234"),
            ("court", "Superior Court of California"),
        ];

        // Verify expected entities were found
        for (expected_type, expected_value) in expected_entities {
            let entity_found = entities.iter().any(|entity| {
                let entity_type = entity.get("type").and_then(|v| v.as_str()).unwrap_or("");
                let entity_text = entity.get("text").and_then(|v| v.as_str()).unwrap_or("");

                entity_type == expected_type && entity_text.contains(expected_value)
            });

            assert!(entity_found, "Should extract {} entity: {}", expected_type, expected_value);
        }

        // Verify entity metadata
        for entity in entities {
            assert!(entity.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0) >= 0.8,
                   "Entity confidence should meet threshold");
            assert!(entity.get("start_pos").is_some(), "Entity should have start position");
            assert!(entity.get("end_pos").is_some(), "Entity should have end position");
        }
    }

    /// Test document comparison and diff analysis
    #[tokio::test]
    async fn test_document_comparison() {
        let original_document = r#"
            Professional Services Agreement
            Term: 12 months
            Payment: $10,000 monthly
            Services: Software development
            Termination: 30 days notice
        "#;

        let revised_document = r#"
            Professional Services Agreement
            Term: 24 months
            Payment: $12,000 monthly
            Services: Software development and consulting
            Termination: 60 days notice
            Additional clause: Confidentiality agreement
        "#;

        let comparison_request = json!({
            "original_document": original_document,
            "revised_document": revised_document,
            "comparison_options": {
                "highlight_changes": true,
                "identify_additions": true,
                "identify_deletions": true,
                "identify_modifications": true,
                "semantic_comparison": true
            }
        });

        let result = compare_documents(comparison_request.to_string()).await;
        assert!(result.is_ok(), "Document comparison should succeed");

        let comparison_result = result.unwrap();
        let comparison_data: serde_json::Value = serde_json::from_str(&comparison_result)
            .expect("Comparison result should be valid JSON");

        // Verify comparison results
        let changes = comparison_data.get("changes")
            .and_then(|v| v.as_array())
            .expect("Should have changes array");

        assert!(changes.len() > 0, "Should detect changes between documents");

        // Check specific changes
        let expected_changes = vec![
            ("modification", "12 months", "24 months"),
            ("modification", "$10,000", "$12,000"),
            ("modification", "Software development", "Software development and consulting"),
            ("modification", "30 days", "60 days"),
            ("addition", "", "Confidentiality agreement"),
        ];

        for (change_type, old_text, new_text) in expected_changes {
            let change_found = changes.iter().any(|change| {
                let detected_type = change.get("type").and_then(|v| v.as_str()).unwrap_or("");
                let old_value = change.get("old_text").and_then(|v| v.as_str()).unwrap_or("");
                let new_value = change.get("new_text").and_then(|v| v.as_str()).unwrap_or("");

                detected_type == change_type &&
                (old_value.contains(old_text) || old_text.is_empty()) &&
                (new_value.contains(new_text) || new_text.is_empty())
            });

            assert!(change_found, "Should detect {} change: {} -> {}",
                   change_type, old_text, new_text);
        }

        // Verify summary statistics
        let summary = comparison_data.get("summary")
            .and_then(|v| v.as_object())
            .expect("Should have comparison summary");

        assert!(summary.contains_key("total_changes"), "Should report total changes");
        assert!(summary.contains_key("similarity_score"), "Should report similarity score");
    }

    /// Test batch document processing
    #[tokio::test]
    async fn test_batch_document_processing() {
        let documents = vec![
            ("Contract 1", "Professional services agreement for software development"),
            ("Policy 1", "Employee handbook section on data privacy"),
            ("Motion 1", "Motion to dismiss filed in federal court"),
            ("Invoice 1", "Payment request for legal services rendered"),
            ("Opinion 1", "Court decision on contract interpretation"),
        ];

        let batch_request = json!({
            "documents": documents.iter().map(|(name, content)| {
                json!({
                    "id": name,
                    "content": content,
                    "processing_options": {
                        "analyze": true,
                        "classify": true,
                        "extract_entities": true
                    }
                })
            }).collect::<Vec<_>>(),
            "batch_options": {
                "parallel_processing": true,
                "max_concurrent": 3,
                "timeout_seconds": 300
            }
        });

        let result = process_documents_batch(batch_request.to_string()).await;
        assert!(result.is_ok(), "Batch document processing should succeed");

        let batch_result = result.unwrap();
        let batch_data: serde_json::Value = serde_json::from_str(&batch_result)
            .expect("Batch result should be valid JSON");

        let results = batch_data.get("results")
            .and_then(|v| v.as_array())
            .expect("Should have results array");

        assert_eq!(results.len(), 5, "Should process all 5 documents");

        // Verify each document was processed
        for (i, result) in results.iter().enumerate() {
            let document_id = result.get("document_id")
                .and_then(|v| v.as_str())
                .expect("Should have document ID");

            assert_eq!(document_id, documents[i].0, "Document ID should match");

            let status = result.get("status")
                .and_then(|v| v.as_str())
                .expect("Should have processing status");

            assert_eq!(status, "completed", "Document processing should complete successfully");

            // Verify analysis results are present
            assert!(result.get("analysis_result").is_some(), "Should have analysis result");
            assert!(result.get("classification_result").is_some(), "Should have classification result");
            assert!(result.get("entities").is_some(), "Should have extracted entities");
        }

        // Verify batch statistics
        let statistics = batch_data.get("statistics")
            .and_then(|v| v.as_object())
            .expect("Should have batch statistics");

        assert!(statistics.contains_key("total_processed"), "Should report total processed");
        assert!(statistics.contains_key("processing_time_ms"), "Should report processing time");
        assert!(statistics.contains_key("success_rate"), "Should report success rate");
    }

    /// Test document analysis with AI insights
    #[tokio::test]
    async fn test_ai_powered_insights() {
        let contract_content = r#"
            Software Development Agreement

            This agreement lacks a specific termination clause and does not address
            intellectual property ownership. The payment terms are vague and there
            is no mention of liability limitations or dispute resolution mechanisms.

            The scope of work is broadly defined without specific deliverables.
            Confidentiality provisions are missing entirely.
        "#;

        let insights_request = json!({
            "content": contract_content,
            "document_type": "contract",
            "insight_types": [
                "risk_analysis",
                "missing_clauses",
                "compliance_check",
                "recommendations",
                "best_practices"
            ],
            "analysis_depth": "comprehensive"
        });

        let result = generate_ai_insights(insights_request.to_string()).await;
        assert!(result.is_ok(), "AI insights generation should succeed");

        let insights_result = result.unwrap();
        let insights_data: serde_json::Value = serde_json::from_str(&insights_result)
            .expect("Insights result should be valid JSON");

        // Verify insights structure
        let risk_analysis = insights_data.get("risk_analysis")
            .and_then(|v| v.as_object())
            .expect("Should have risk analysis");

        assert!(risk_analysis.contains_key("overall_risk_score"), "Should have overall risk score");
        assert!(risk_analysis.contains_key("risk_factors"), "Should identify risk factors");

        let risk_score = risk_analysis.get("overall_risk_score")
            .and_then(|v| v.as_f64())
            .expect("Should have numeric risk score");

        assert!(risk_score >= 0.0 && risk_score <= 1.0, "Risk score should be between 0 and 1");

        // Verify missing clauses detection
        let missing_clauses = insights_data.get("missing_clauses")
            .and_then(|v| v.as_array())
            .expect("Should identify missing clauses");

        let expected_missing_clauses = vec![
            "termination",
            "intellectual_property",
            "liability_limitation",
            "dispute_resolution",
            "confidentiality"
        ];

        for expected_clause in expected_missing_clauses {
            let clause_found = missing_clauses.iter().any(|clause| {
                clause.get("clause_type").and_then(|v| v.as_str())
                    .map(|s| s.contains(expected_clause))
                    .unwrap_or(false)
            });

            assert!(clause_found, "Should identify missing clause: {}", expected_clause);
        }

        // Verify recommendations
        let recommendations = insights_data.get("recommendations")
            .and_then(|v| v.as_array())
            .expect("Should provide recommendations");

        assert!(recommendations.len() > 0, "Should provide actionable recommendations");

        for recommendation in recommendations {
            assert!(recommendation.get("priority").is_some(), "Recommendation should have priority");
            assert!(recommendation.get("description").is_some(), "Recommendation should have description");
            assert!(recommendation.get("impact").is_some(), "Recommendation should assess impact");
        }
    }

    /// Test document analysis performance with large files
    #[tokio::test]
    async fn test_large_document_performance() {
        // Create a large document (approximately 1MB of text)
        let base_content = "This is a legal document with important clauses and provisions. ";
        let large_content = base_content.repeat(16384); // ~1MB

        let start_time = std::time::Instant::now();

        let analysis_request = json!({
            "content": large_content,
            "analysis_options": {
                "extract_entities": true,
                "classify_document": true,
                "generate_summary": true,
                "detect_language": true
            },
            "performance_mode": "optimized"
        });

        let result = analyze_document(analysis_request.to_string()).await;
        let duration = start_time.elapsed();

        assert!(result.is_ok(), "Large document analysis should succeed");

        // Performance assertion: should complete within 30 seconds
        TestAssertions::assert_performance(duration.as_millis() as u64, 30000);

        let analysis_result = result.unwrap();
        let analysis_data: serde_json::Value = serde_json::from_str(&analysis_result)
            .expect("Analysis result should be valid JSON");

        // Verify analysis completed despite large size
        assert!(analysis_data.get("document_classification").is_some(),
               "Should complete classification for large document");
        assert!(analysis_data.get("extracted_entities").is_some(),
               "Should extract entities from large document");

        println!("Large document analysis completed in {:?}", duration);
    }

    /// Test document analysis error handling and edge cases
    #[tokio::test]
    async fn test_document_analysis_edge_cases() {
        let edge_cases = vec![
            ("Empty document", ""),
            ("Very short document", "A"),
            ("Special characters", "αβγδε ñáéíóú 中文 العربية 🔥💯✨"),
            ("Mixed languages", "English text. Texto en español. Texte français."),
            ("Malformed content", "<<<<<>>>>> {{{{ ]]]] %%%% ####"),
            ("Numbers only", "123456789 987654321 555.123.4567"),
            ("Repeated content", "Same sentence. ".repeat(1000)),
        ];

        for (test_name, content) in edge_cases {
            let analysis_request = json!({
                "content": content,
                "analysis_options": {
                    "extract_entities": true,
                    "classify_document": true,
                    "handle_errors_gracefully": true
                }
            });

            let result = analyze_document(analysis_request.to_string()).await;

            // Analysis should either succeed or fail gracefully
            match result {
                Ok(analysis_result) => {
                    let analysis_data: serde_json::Value = serde_json::from_str(&analysis_result)
                        .expect("Analysis result should be valid JSON");

                    // Even for edge cases, should return valid structure
                    TestAssertions::assert_api_response(&analysis_data, true);
                    println!("Successfully analyzed edge case: {}", test_name);
                }
                Err(error) => {
                    // Errors should be informative
                    assert!(!error.is_empty(), "Error message should not be empty");
                    println!("Gracefully handled error for {}: {}", test_name, error);
                }
            }
        }
    }

    /// Test concurrent document analysis operations
    #[tokio::test]
    async fn test_concurrent_document_analysis() {
        let test_documents = vec![
            "Contract analysis test document with multiple clauses and terms.",
            "Legal motion filed in court with specific legal citations and arguments.",
            "Corporate policy document outlining employee guidelines and procedures.",
            "Court opinion discussing legal precedents and case law applications.",
            "Legislative bill with sections defining new legal requirements.",
        ];

        let analysis_futures = test_documents.into_iter().enumerate().map(|(i, content)| {
            let analysis_request = json!({
                "content": content,
                "document_id": format!("concurrent_test_{}", i),
                "analysis_options": {
                    "extract_entities": true,
                    "classify_document": true
                }
            });

            analyze_document(analysis_request.to_string())
        });

        let start_time = std::time::Instant::now();
        let results = futures::future::join_all(analysis_futures).await;
        let duration = start_time.elapsed();

        // All analyses should succeed
        for (i, result) in results.iter().enumerate() {
            assert!(result.is_ok(), "Concurrent analysis {} should succeed", i);
        }

        // Concurrent processing should be efficient
        TestAssertions::assert_performance(duration.as_millis() as u64, 15000); // 15 seconds max

        println!("Concurrent document analysis completed in {:?}", duration);
    }
}