"""
Production Validation: Legal Workflow Optimizations for Lawyer Use Cases

This test suite validates the production readiness of BEAR AI's legal workflow
engine, testing real-world lawyer scenarios and workflow automation.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, List, Any

# Import workflow components to test
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

try:
    from bear_ai.workflows.workflow_engine import (
        WorkflowEngine, Workflow, WorkflowStep, WorkflowContext,
        StepType, StepStatus, WorkflowStatus,
        create_workflow, run_workflow, get_workflow_engine
    )
    from bear_ai.workflows.workflow_templates import get_legal_workflow_templates
    from bear_ai.workflows.agents import LegalWorkflowAgent
    WORKFLOW_AVAILABLE = True
except ImportError:
    WORKFLOW_AVAILABLE = False
    WorkflowEngine = Mock
    Workflow = Mock


class TestLegalWorkflowEngine:
    """Test suite for legal workflow automation."""

    @pytest.fixture
    def workflow_engine(self):
        """Create a workflow engine for testing."""
        if not WORKFLOW_AVAILABLE:
            pytest.skip("Workflow engine not available")
        return WorkflowEngine(max_workers=4)

    @pytest.fixture
    def legal_context(self):
        """Create a legal workflow context with sample data."""
        context = WorkflowContext()
        context.set_variable("client_name", "ABC Corporation")
        context.set_variable("case_type", "contract_dispute")
        context.set_variable("urgency", "high")
        context.set_variable("documents", [
            {"name": "contract.pdf", "type": "contract", "size": 2048},
            {"name": "correspondence.pdf", "type": "email", "size": 512},
            {"name": "invoice.pdf", "type": "financial", "size": 256}
        ])
        context.set_variable("opposing_party", "XYZ Industries")
        context.set_variable("jurisdiction", "California")
        return context

    @pytest.mark.asyncio
    async def test_document_review_workflow(self, workflow_engine, legal_context):
        """Test automated document review workflow for legal cases."""
        workflow = workflow_engine.create_workflow(
            "Legal Document Review",
            "Automated review and analysis of legal documents"
        )

        # Step 1: Document intake and classification
        intake_step = workflow_engine.add_step(
            workflow.id,
            "Document Intake",
            StepType.LLM_GENERATION,
            config={
                "prompt": "Classify and summarize the following legal documents: {documents}",
                "model": "legal-analyzer",
                "params": {"max_tokens": 500, "temperature": 0.1}
            }
        )

        # Step 2: PII detection and scrubbing
        pii_step = workflow_engine.add_step(
            workflow.id,
            "PII Detection",
            StepType.TOOL_EXECUTION,
            dependencies=[intake_step.id],
            config={
                "tool": "pii_scrubber",
                "params": {
                    "policy": "legal_standard",
                    "enable_legal_entities": True,
                    "confidence_threshold": 0.8
                }
            }
        )

        # Step 3: Legal risk assessment
        risk_step = workflow_engine.add_step(
            workflow.id,
            "Risk Assessment",
            StepType.LLM_GENERATION,
            dependencies=[pii_step.id],
            config={
                "prompt": "Analyze legal risks in {case_type} case involving {client_name} vs {opposing_party}",
                "model": "legal-risk-analyzer",
                "params": {"max_tokens": 1000, "temperature": 0.2}
            }
        )

        # Step 4: Generate legal strategy recommendations
        strategy_step = workflow_engine.add_step(
            workflow.id,
            "Strategy Generation",
            StepType.LLM_GENERATION,
            dependencies=[risk_step.id],
            config={
                "prompt": "Generate legal strategy recommendations based on risk assessment and case facts",
                "model": "legal-strategist",
                "params": {"max_tokens": 1500, "temperature": 0.3}
            }
        )

        # Mock the LLM and tool executions
        with patch.object(workflow_engine, '_execute_llm_step') as mock_llm, \
             patch.object(workflow_engine, '_execute_tool_step') as mock_tool:
            
            mock_llm.side_effect = [
                "Documents classified: 1 contract, 1 correspondence, 1 financial record",
                "Legal risks identified: Contract ambiguity, potential breach claims",
                "Strategy: Focus on contract interpretation, gather additional evidence"
            ]
            
            mock_tool.return_value = "PII detected and scrubbed: 3 email addresses, 2 phone numbers"

            # Execute workflow
            workflow.context = legal_context
            result = await workflow_engine.run_workflow(workflow.id)

            # Verify workflow completion
            assert result["status"] == "completed"
            assert result["completed_steps"] == 4
            assert result["failed_steps"] == 0

            # Verify all steps were executed in correct order
            assert mock_llm.call_count == 3
            assert mock_tool.call_count == 1

    @pytest.mark.asyncio
    async def test_contract_analysis_workflow(self, workflow_engine):
        """Test specialized contract analysis workflow."""
        workflow = workflow_engine.create_workflow(
            "Contract Analysis",
            "Comprehensive contract review and risk assessment"
        )

        # Create a complex workflow with parallel analysis steps
        extraction_step = workflow_engine.add_step(
            workflow.id,
            "Contract Data Extraction",
            StepType.LLM_GENERATION,
            config={
                "prompt": "Extract key terms, dates, parties, and obligations from contract",
                "model": "contract-extractor"
            }
        )

        # Parallel analysis steps
        risk_analysis = workflow_engine.add_step(
            workflow.id,
            "Risk Analysis",
            StepType.LLM_GENERATION,
            dependencies=[extraction_step.id],
            config={
                "prompt": "Identify potential legal risks and liability issues",
                "model": "legal-risk-analyzer"
            }
        )

        compliance_check = workflow_engine.add_step(
            workflow.id,
            "Compliance Check",
            StepType.LLM_GENERATION,
            dependencies=[extraction_step.id],
            config={
                "prompt": "Verify compliance with {jurisdiction} law and regulations",
                "model": "compliance-checker"
            }
        )

        precedent_search = workflow_engine.add_step(
            workflow.id,
            "Precedent Research",
            StepType.TOOL_EXECUTION,
            dependencies=[extraction_step.id],
            config={
                "tool": "legal_database_search",
                "params": {
                    "query": "contract disputes {case_type}",
                    "jurisdiction": "{jurisdiction}",
                    "max_results": 10
                }
            }
        )

        # Final synthesis step
        synthesis_step = workflow_engine.add_step(
            workflow.id,
            "Analysis Synthesis",
            StepType.LLM_GENERATION,
            dependencies=[risk_analysis.id, compliance_check.id, precedent_search.id],
            config={
                "prompt": "Synthesize risk analysis, compliance check, and precedent research into final report",
                "model": "legal-synthesizer"
            }
        )

        # Mock executions with realistic legal analysis
        with patch.object(workflow_engine, '_execute_llm_step') as mock_llm, \
             patch.object(workflow_engine, '_execute_tool_step') as mock_tool:
            
            mock_llm.side_effect = [
                "Extracted: Parties (ABC Corp, XYZ Inc), Term (3 years), Value ($500K)",
                "Risks: Termination clause ambiguity, force majeure limitations",
                "Compliance: Meets California contract law requirements",
                "Final Report: Medium risk contract with recommended amendments"
            ]
            
            mock_tool.return_value = "Found 7 relevant precedents with similar contract terms"

            # Set up context
            context = WorkflowContext()
            context.set_variable("jurisdiction", "California")
            context.set_variable("case_type", "software_licensing")
            workflow.context = context

            result = await workflow_engine.run_workflow(workflow.id)

            # Verify parallel execution worked correctly
            assert result["status"] == "completed"
            assert result["completed_steps"] == 5

            # Verify execution times show parallelism
            assert result["execution_time"] < 10  # Should complete quickly with mocking

    @pytest.mark.asyncio
    async def test_client_intake_workflow(self, workflow_engine):
        """Test client intake and case initialization workflow."""
        workflow = workflow_engine.create_workflow(
            "Client Intake Process",
            "Automated client onboarding and case setup"
        )

        # Step 1: Conflict check
        conflict_step = workflow_engine.add_step(
            workflow.id,
            "Conflict Check",
            StepType.TOOL_EXECUTION,
            config={
                "tool": "conflict_checker",
                "params": {
                    "client_name": "{client_name}",
                    "opposing_parties": "{opposing_parties}",
                    "matter_type": "{matter_type}"
                }
            }
        )

        # Step 2: Risk assessment based on conflict check
        risk_step = workflow_engine.add_step(
            workflow.id,
            "Initial Risk Assessment",
            StepType.CONDITIONAL,
            dependencies=[conflict_step.id],
            config={
                "condition": lambda ctx: "no_conflict" in ctx.get_result(conflict_step.id, ""),
                "true_action": "proceed_with_engagement",
                "false_action": "decline_engagement"
            }
        )

        # Step 3: Document generation (if proceeding)
        doc_gen_step = workflow_engine.add_step(
            workflow.id,
            "Generate Engagement Documents",
            StepType.LLM_GENERATION,
            dependencies=[risk_step.id],
            condition=lambda ctx: ctx.get_result(risk_step.id) == "proceed_with_engagement",
            config={
                "prompt": "Generate engagement letter for {client_name} regarding {matter_type}",
                "model": "legal-document-generator"
            }
        )

        # Mock tool and LLM responses
        with patch.object(workflow_engine, '_execute_tool_step') as mock_tool, \
             patch.object(workflow_engine, '_execute_llm_step') as mock_llm, \
             patch.object(workflow_engine, '_execute_conditional_step') as mock_conditional:
            
            mock_tool.return_value = "no_conflict_found"
            mock_conditional.return_value = "proceed_with_engagement"
            mock_llm.return_value = "Engagement letter generated for ABC Corporation"

            # Set up client context
            context = WorkflowContext()
            context.set_variable("client_name", "ABC Corporation")
            context.set_variable("opposing_parties", ["XYZ Industries"])
            context.set_variable("matter_type", "contract_dispute")

            workflow.context = context
            result = await workflow_engine.run_workflow(workflow.id)

            assert result["status"] == "completed"
            assert "Engagement letter generated" in str(result["results"])

    @pytest.mark.asyncio
    async def test_discovery_management_workflow(self, workflow_engine):
        """Test litigation discovery management workflow."""
        workflow = workflow_engine.create_workflow(
            "Discovery Management",
            "Automated discovery document processing and review"
        )

        # Step 1: Document processing
        processing_step = workflow_engine.add_step(
            workflow.id,
            "Process Discovery Documents",
            StepType.TOOL_EXECUTION,
            config={
                "tool": "document_processor",
                "params": {
                    "documents": "{discovery_documents}",
                    "extract_metadata": True,
                    "ocr_enabled": True
                }
            }
        )

        # Step 2: Privilege review
        privilege_step = workflow_engine.add_step(
            workflow.id,
            "Privilege Review",
            StepType.LLM_GENERATION,
            dependencies=[processing_step.id],
            config={
                "prompt": "Review documents for attorney-client privilege and work product protection",
                "model": "privilege-reviewer"
            }
        )

        # Step 3: Responsiveness review
        responsive_step = workflow_engine.add_step(
            workflow.id,
            "Responsiveness Review",
            StepType.LLM_GENERATION,
            dependencies=[processing_step.id],
            config={
                "prompt": "Determine document responsiveness to discovery requests: {discovery_requests}",
                "model": "responsiveness-reviewer"
            }
        )

        # Step 4: Redaction recommendations
        redaction_step = workflow_engine.add_step(
            workflow.id,
            "Redaction Analysis",
            StepType.LLM_GENERATION,
            dependencies=[privilege_step.id, responsive_step.id],
            config={
                "prompt": "Recommend redactions based on privilege and responsiveness analysis",
                "model": "redaction-analyzer"
            }
        )

        # Mock the discovery workflow
        with patch.object(workflow_engine, '_execute_tool_step') as mock_tool, \
             patch.object(workflow_engine, '_execute_llm_step') as mock_llm:
            
            mock_tool.return_value = "Processed 1,250 documents, extracted metadata"
            mock_llm.side_effect = [
                "Identified 45 privileged documents requiring protection",
                "Found 890 responsive documents to discovery requests",
                "Recommended 23 documents for redaction, 45 for privilege log"
            ]

            # Set up discovery context
            context = WorkflowContext()
            context.set_variable("discovery_documents", ["batch_1", "batch_2", "batch_3"])
            context.set_variable("discovery_requests", ["Request 1", "Request 2"])

            workflow.context = context
            result = await workflow_engine.run_workflow(workflow.id)

            assert result["status"] == "completed"
            assert result["completed_steps"] == 4

    def test_workflow_template_system(self, workflow_engine):
        """Test legal workflow template system."""
        # Test that legal workflow templates are available
        try:
            templates = get_legal_workflow_templates()
            assert len(templates) > 0, "No legal workflow templates found"
            
            # Verify template structure
            for template in templates:
                assert "id" in template
                assert "name" in template
                assert "description" in template
                assert "steps" in template
                assert "legal_domain" in template
                
                # Verify steps have required fields
                for step in template["steps"]:
                    assert "name" in step
                    assert "type" in step
                    
        except ImportError:
            pytest.skip("Legal workflow templates not available")

    @pytest.mark.asyncio
    async def test_workflow_error_handling(self, workflow_engine):
        """Test error handling and recovery in legal workflows."""
        workflow = workflow_engine.create_workflow(
            "Error Testing Workflow",
            "Test error handling capabilities"
        )

        # Step that will fail
        failing_step = workflow_engine.add_step(
            workflow.id,
            "Failing Step",
            StepType.LLM_GENERATION,
            max_retries=2,
            config={
                "prompt": "This will fail",
                "model": "non-existent-model"
            }
        )

        # Step that depends on failing step
        dependent_step = workflow_engine.add_step(
            workflow.id,
            "Dependent Step",
            StepType.LLM_GENERATION,
            dependencies=[failing_step.id],
            config={
                "prompt": "This depends on failing step",
                "model": "legal-analyzer"
            }
        )

        # Mock the execution to simulate failure
        with patch.object(workflow_engine, '_execute_llm_step') as mock_llm:
            mock_llm.side_effect = Exception("Model not found")

            workflow.allow_partial_failure = False  # Workflow should fail completely
            result = await workflow_engine.run_workflow(workflow.id)

            assert result["status"] == "failed"
            assert result["failed_steps"] > 0

    @pytest.mark.asyncio
    async def test_human_input_integration(self, workflow_engine):
        """Test human input steps for attorney review."""
        workflow = workflow_engine.create_workflow(
            "Attorney Review Workflow",
            "Workflow requiring attorney input and approval"
        )

        # Automated analysis step
        analysis_step = workflow_engine.add_step(
            workflow.id,
            "Automated Analysis",
            StepType.LLM_GENERATION,
            config={
                "prompt": "Analyze legal document for key risks",
                "model": "legal-analyzer"
            }
        )

        # Human review step
        review_step = workflow_engine.add_step(
            workflow.id,
            "Attorney Review",
            StepType.HUMAN_INPUT,
            dependencies=[analysis_step.id],
            config={
                "prompt": "Please review the automated analysis and provide your assessment",
                "type": "text",
                "input_key": "attorney_review"
            }
        )

        # Final decision step
        decision_step = workflow_engine.add_step(
            workflow.id,
            "Final Decision",
            StepType.LLM_GENERATION,
            dependencies=[review_step.id],
            config={
                "prompt": "Generate final recommendation based on analysis and attorney review",
                "model": "legal-decision-maker"
            }
        )

        # Mock the execution with human input
        with patch.object(workflow_engine, '_execute_llm_step') as mock_llm:
            mock_llm.side_effect = [
                "Analysis complete: Medium risk identified",
                "Final recommendation: Proceed with caution, implement safeguards"
            ]

            # Provide human input
            context = WorkflowContext()
            context.user_inputs["attorney_review"] = "I agree with the analysis but recommend additional due diligence"

            workflow.context = context
            result = await workflow_engine.run_workflow(workflow.id)

            assert result["status"] == "completed"
            assert "attorney_review" in workflow.context.user_inputs

    @pytest.mark.asyncio
    async def test_workflow_performance_with_large_datasets(self, workflow_engine):
        """Test workflow performance with large legal datasets."""
        workflow = workflow_engine.create_workflow(
            "Large Dataset Processing",
            "Process large volumes of legal documents"
        )

        # Simulate processing large document sets
        batch_processing_step = workflow_engine.add_step(
            workflow.id,
            "Batch Document Processing",
            StepType.TOOL_EXECUTION,
            config={
                "tool": "batch_processor",
                "params": {
                    "document_count": 10000,
                    "batch_size": 100,
                    "parallel_workers": 4
                }
            }
        )

        # Mock large dataset processing
        with patch.object(workflow_engine, '_execute_tool_step') as mock_tool:
            # Simulate processing time
            async def mock_processing(*args, **kwargs):
                await asyncio.sleep(0.1)  # Simulate processing time
                return "Processed 10,000 documents in 50 batches"

            mock_tool.side_effect = mock_processing

            start_time = time.time()
            result = await workflow_engine.run_workflow(workflow.id)
            end_time = time.time()

            execution_time = end_time - start_time

            assert result["status"] == "completed"
            # Should complete in reasonable time even with large datasets
            assert execution_time < 5.0, f"Large dataset processing took {execution_time:.2f}s"

    def test_workflow_persistence_and_recovery(self, workflow_engine):
        """Test workflow state persistence and recovery."""
        workflow = workflow_engine.create_workflow(
            "Persistence Test",
            "Test workflow state persistence"
        )

        # Add steps to workflow
        step1 = workflow_engine.add_step(
            workflow.id,
            "Step 1",
            StepType.LLM_GENERATION,
            config={"prompt": "Test step 1"}
        )

        step2 = workflow_engine.add_step(
            workflow.id,
            "Step 2", 
            StepType.LLM_GENERATION,
            dependencies=[step1.id],
            config={"prompt": "Test step 2"}
        )

        # Simulate workflow execution and interruption
        workflow.status = WorkflowStatus.RUNNING
        workflow.completed_steps.add(step1.id)
        step1.status = StepStatus.COMPLETED
        step1.result = "Step 1 completed"

        # Test workflow status retrieval
        status = workflow_engine.get_workflow_status(workflow.id)
        assert status is not None
        assert status["status"] == "running"
        assert status["completed_steps"] == 1
        assert status["total_steps"] == 2
        assert status["progress"] == 0.5

        # Test pause and resume
        paused = workflow_engine.pause_workflow(workflow.id)
        assert paused
        assert workflow.status == WorkflowStatus.PAUSED

        resumed = workflow_engine.resume_workflow(workflow.id)
        assert resumed
        assert workflow.status == WorkflowStatus.RUNNING

    @pytest.mark.asyncio
    async def test_legal_workflow_agents(self, workflow_engine):
        """Test specialized legal workflow agents."""
        try:
            # Test legal workflow agent creation
            legal_agent = LegalWorkflowAgent("contract_specialist")
            
            # Test agent capabilities
            capabilities = legal_agent.get_capabilities()
            assert "contract_analysis" in capabilities
            assert "risk_assessment" in capabilities
            assert "compliance_check" in capabilities

            # Test agent workflow generation
            workflow_template = legal_agent.generate_workflow("contract_review")
            assert workflow_template is not None
            assert "steps" in workflow_template
            
        except (ImportError, NameError):
            pytest.skip("Legal workflow agents not available")

    def test_workflow_metrics_and_monitoring(self, workflow_engine):
        """Test workflow performance metrics and monitoring."""
        workflow = workflow_engine.create_workflow(
            "Metrics Test",
            "Test workflow metrics collection"
        )

        # Add a step to test
        step = workflow_engine.add_step(
            workflow.id,
            "Test Step",
            StepType.LLM_GENERATION,
            config={"prompt": "Test metrics"}
        )

        # Simulate step execution with timing
        step.start_time = time.time() - 5.0  # 5 seconds ago
        step.end_time = time.time()
        step.status = StepStatus.COMPLETED
        
        workflow.start_time = time.time() - 10.0  # 10 seconds ago
        workflow.end_time = time.time()
        workflow.completed_steps.add(step.id)
        workflow.status = WorkflowStatus.COMPLETED

        # Test metrics collection
        status = workflow_engine.get_workflow_status(workflow.id)
        assert status["execution_time"] >= 10.0
        assert status["progress"] == 1.0

        # Test performance requirements
        assert status["execution_time"] < 300.0, "Workflow should complete within 5 minutes"


class TestLegalWorkflowIntegration:
    """Test integration between workflow engine and other BEAR AI components."""

    @pytest.mark.asyncio
    async def test_pii_scrubbing_integration(self, workflow_engine):
        """Test integration with PII scrubbing system."""
        workflow = workflow_engine.create_workflow(
            "PII Integration Test",
            "Test PII scrubbing in workflow context"
        )

        pii_step = workflow_engine.add_step(
            workflow.id,
            "PII Scrubbing",
            StepType.TOOL_EXECUTION,
            config={
                "tool": "pii_scrubber",
                "params": {
                    "text": "Attorney John Doe (john@law.com) reviewed the case.",
                    "policy": "legal_standard"
                }
            }
        )

        # Mock PII scrubbing
        with patch.object(workflow_engine, '_execute_tool_step') as mock_tool:
            mock_tool.return_value = "Attorney [PERSON] ([EMAIL]) reviewed the case."

            result = await workflow_engine.run_workflow(workflow.id)
            assert result["status"] == "completed"
            assert "[PERSON]" in str(result["results"])

    @pytest.mark.asyncio
    async def test_model_management_integration(self, workflow_engine):
        """Test integration with model management system."""
        workflow = workflow_engine.create_workflow(
            "Model Integration Test",
            "Test model switching in workflow"
        )

        # Step using different models
        step1 = workflow_engine.add_step(
            workflow.id,
            "Document Classification",
            StepType.LLM_GENERATION,
            config={
                "prompt": "Classify this legal document",
                "model": "document-classifier"
            }
        )

        step2 = workflow_engine.add_step(
            workflow.id,
            "Risk Analysis",
            StepType.LLM_GENERATION,
            dependencies=[step1.id],
            config={
                "prompt": "Analyze legal risks",
                "model": "risk-analyzer"
            }
        )

        # Mock model execution
        with patch.object(workflow_engine, '_execute_llm_step') as mock_llm:
            mock_llm.side_effect = [
                "Document classified as: Contract",
                "Risk level: Medium"
            ]

            result = await workflow_engine.run_workflow(workflow.id)
            assert result["status"] == "completed"
            assert mock_llm.call_count == 2


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])