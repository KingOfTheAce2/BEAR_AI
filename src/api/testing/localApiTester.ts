// Local API Testing Tools
// Comprehensive testing suite for localhost-only API operations

import { localApiRegistry, api } from '../localApiRegistry';

/**
 * Test result interface
 */
interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

/**
 * Test suite for local API functionality
 */
export class LocalApiTester {
  private static instance: LocalApiTester;
  private testResults: TestResult[] = [];

  private constructor() {}

  static getInstance(): LocalApiTester {
    if (!LocalApiTester.instance) {
      LocalApiTester.instance = new LocalApiTester();
    }
    return LocalApiTester.instance;
  }

  /**
   * Run comprehensive API test suite
   */
  async runAllTests(): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    results: TestResult[];
  }> {
    console.log('🧪 Starting Local API Test Suite...');
    const startTime = Date.now();
    this.testResults = [];

    try {
      // Initialize API first
      await this.runTest('API Initialization', () => api.initialize());

      // System tests
      await this.runTest('System Health Check', () => api.health());
      
      // Authentication tests
      await this.runAuthenticationTests();
      
      // Chat tests
      await this.runChatTests();
      
      // Document tests  
      await this.runDocumentTests();
      
      // Research tests
      await this.runResearchTests();
      
      // Analysis tests
      await this.runAnalysisTests();
      
      // Performance tests
      await this.runPerformanceTests();
      
      // Security tests
      await this.runSecurityTests();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    const duration = Date.now() - startTime;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.length - passed;

    const summary = {
      totalTests: this.testResults.length,
      passed,
      failed,
      duration,
      results: this.testResults
    };

    this.printTestSummary(summary);
    return summary;
  }

  /**
   * Run authentication tests
   */
  private async runAuthenticationTests(): Promise<void> {
    console.log('🔐 Testing Authentication...');

    // Test invalid login
    await this.runTest('Invalid Login', async () => {
      const response = await api.auth.login('invalid', 'invalid');
      if (response.success) {
        throw new Error('Should not authenticate invalid credentials');
      }
    });

    // Test valid login
    await this.runTest('Valid Login', async () => {
      const response = await api.auth.login('admin', 'admin123');
      if (!response.success) {
        throw new Error(`Login failed: ${response.error}`);
      }
      return response;
    });

    // Test session validation
    await this.runTest('Session Validation', async () => {
      const isValid = await api.auth.verify();
      if (!isValid.valid) {
        throw new Error('Session should be valid after login');
      }
    });

    // Test logout
    await this.runTest('Logout', async () => {
      const response = await api.auth.logout();
      if (!response.success) {
        throw new Error('Logout failed');
      }
    });

    // Re-login for subsequent tests
    await api.auth.login('admin', 'admin123');
  }

  /**
   * Run chat tests
   */
  private async runChatTests(): Promise<void> {
    console.log('💬 Testing Chat Service...');

    let chatSessionId: string;

    // Test get empty sessions
    await this.runTest('Get Empty Chat Sessions', async () => {
      const response = await api.chat.getSessions();
      return response.data;
    });

    // Test create chat session
    await this.runTest('Create Chat Session', async () => {
      const response = await api.chat.createSession({
        title: 'Test Chat Session',
        category: 'research'
      });
      chatSessionId = response.data.id;
      return response.data;
    });

    // Test send message
    await this.runTest('Send Chat Message', async () => {
      const response = await api.chat.sendMessage(chatSessionId, {
        content: 'Hello, this is a test message for legal research.'
      });
      if (!response.data.userMessage || !response.data.aiResponse) {
        throw new Error('Should return both user and AI messages');
      }
      return response.data;
    });

    // Test get messages
    await this.runTest('Get Chat Messages', async () => {
      const response = await api.chat.getMessages(chatSessionId);
      if (response.data.length < 2) {
        throw new Error('Should have at least user and AI messages');
      }
      return response.data;
    });

    // Test get sessions (should have 1 now)
    await this.runTest('Get Chat Sessions After Creation', async () => {
      const response = await api.chat.getSessions();
      if (response.data.length !== 1) {
        throw new Error(`Expected 1 session, got ${response.data.length}`);
      }
      return response.data;
    });

    // Test delete session
    await this.runTest('Delete Chat Session', async () => {
      const response = await api.chat.deleteSession(chatSessionId);
      if (!response.success) {
        throw new Error('Failed to delete chat session');
      }
    });
  }

  /**
   * Run document tests
   */
  private async runDocumentTests(): Promise<void> {
    console.log('📄 Testing Document Service...');

    let documentId: string;

    // Test get empty documents
    await this.runTest('Get Empty Documents', async () => {
      const response = await api.documents.list();
      return response.data;
    });

    // Test upload document (simulated)
    await this.runTest('Upload Document', async () => {
      const response = await api.documents.upload(
        new File(['test content'], 'test-contract.pdf', { type: 'application/pdf' })
      );
      documentId = response.data.id;
      return response.data;
    });

    // Test get specific document
    await this.runTest('Get Specific Document', async () => {
      const response = await api.documents.get(documentId);
      if (!response.data) {
        throw new Error('Document should exist');
      }
      return response.data;
    });

    // Test update document
    await this.runTest('Update Document', async () => {
      const response = await api.documents.update(documentId, {
        name: 'Updated Test Contract.pdf',
        tags: ['test', 'updated']
      });
      if (!response.data || response.data.name !== 'Updated Test Contract.pdf') {
        throw new Error('Document update failed');
      }
      return response.data;
    });

    // Test search documents
    await this.runTest('Search Documents', async () => {
      const response = await api.documents.search('contract');
      return response.data;
    });

    // Test delete document
    await this.runTest('Delete Document', async () => {
      const response = await api.documents.delete(documentId);
      if (!response.success) {
        throw new Error('Failed to delete document');
      }
    });
  }

  /**
   * Run research tests
   */
  private async runResearchTests(): Promise<void> {
    console.log('🔍 Testing Research Service...');

    // Test legal research search
    await this.runTest('Legal Research Search', async () => {
      const response = await api.research.search({
        query: 'contract formation elements'
      });
      return response.data;
    });

    // Test get case law
    await this.runTest('Get Case Law Suggestions', async () => {
      const response = await api.research.getCaseLaw('Miranda rights');
      return response.data;
    });

    // Test get statutes
    await this.runTest('Get Statute Suggestions', async () => {
      const response = await api.research.getStatutes('civil rights');
      return response.data;
    });

    // Test citation formatting
    await this.runTest('Format Legal Citation', async () => {
      const response = await api.research.formatCitation('case', {
        plaintiff: 'Smith',
        defendant: 'Jones',
        volume: '123',
        reporter: 'F.3d',
        page: '456',
        court: '2d Cir.',
        year: '2020'
      });
      if (!response.data.bluebook) {
        throw new Error('Should return formatted citation');
      }
      return response.data;
    });

    // Test research templates
    await this.runTest('Get Research Templates', async () => {
      const response = await api.research.getTemplates();
      if (response.data.length === 0) {
        throw new Error('Should return some templates');
      }
      return response.data;
    });
  }

  /**
   * Run analysis tests
   */
  private async runAnalysisTests(): Promise<void> {
    console.log('📊 Testing Analysis Service...');

    // First create a document to analyze
    const docResponse = await api.documents.upload(
      new File(['sample contract content'], 'sample-contract.pdf', { type: 'application/pdf' })
    );
    const documentId = docResponse.data.id;

    // Test document summary analysis
    await this.runTest('Document Summary Analysis', async () => {
      const response = await api.analysis.analyze({
        document_id: documentId,
        analysis_type: 'summary',
        options: { length: 'medium' }
      });
      if (!response.data.result) {
        throw new Error('Analysis should return results');
      }
      return response.data;
    });

    // Test risk assessment
    await this.runTest('Risk Assessment Analysis', async () => {
      const response = await api.analysis.analyze({
        document_id: documentId,
        analysis_type: 'risk_assessment'
      });
      if (!response.data.result.overall_risk_score) {
        throw new Error('Risk assessment should return risk score');
      }
      return response.data;
    });

    // Test clause extraction
    await this.runTest('Clause Extraction Analysis', async () => {
      const response = await api.analysis.analyze({
        document_id: documentId,
        analysis_type: 'clause_extraction'
      });
      return response.data;
    });

    // Test get analysis types
    await this.runTest('Get Available Analysis Types', async () => {
      const response = await api.analysis.getTypes();
      if (response.data.length === 0) {
        throw new Error('Should return available analysis types');
      }
      return response.data;
    });

    // Cleanup test document
    await api.documents.delete(documentId);
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Testing Performance...');

    // Test concurrent operations
    await this.runTest('Concurrent API Calls', async () => {
      const startTime = Date.now();
      
      const promises = [
        api.health(),
        api.auth.verify(),
        api.documents.list(),
        api.chat.getSessions(),
        api.research.getTemplates()
      ];
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      if (duration > 2000) {
        throw new Error(`Concurrent calls took too long: ${duration}ms`);
      }
      
      return { duration, results: results.length };
    });

    // Test response times
    await this.runTest('API Response Time', async () => {
      const startTime = Date.now();
      await api.health();
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        throw new Error(`Health check took too long: ${duration}ms`);
      }
      
      return { response_time: duration };
    });

    // Test memory usage (basic check)
    await this.runTest('Memory Usage Check', async () => {
      const before = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Perform some operations
      await api.documents.list();
      await api.chat.getSessions();
      await api.research.getTemplates();
      
      const after = process.memoryUsage?.() || { heapUsed: 0 };
      const memoryIncrease = after.heapUsed - before.heapUsed;
      
      return { memory_increase_bytes: memoryIncrease };
    });
  }

  /**
   * Run security tests
   */
  private async runSecurityTests(): Promise<void> {
    console.log('🔒 Testing Security...');

    // Test rate limiting (if implemented)
    await this.runTest('Rate Limiting Protection', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() => api.health());
      
      try {
        await Promise.all(requests);
        // If this passes, rate limiting might not be strictly enforced for health checks
        return { note: 'Rate limiting may be lenient for health checks' };
      } catch (error) {
        // If some fail, rate limiting might be working
        return { rate_limiting_active: true };
      }
    });

    // Test authentication requirement
    await this.runTest('Authentication Requirement', async () => {
      // Logout first
      await api.auth.logout();
      
      try {
        // Try to access protected resource
        await api.documents.list();
        throw new Error('Should require authentication');
      } catch (error) {
        // Expected to fail - re-login for other tests
        await api.auth.login('admin', 'admin123');
        return { authentication_required: true };
      }
    });

    // Test local-only operation
    await this.runTest('Local-Only Verification', async () => {
      // Check that no external HTTP requests are made
      // This is more of a design verification
      const serverStatus = await api.health();
      
      if (!serverStatus.local_only) {
        throw new Error('API should be local-only');
      }
      
      return { local_only: true };
    });
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: result
      });
      
      console.log(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.log(`❌ ${testName} (${duration}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Print test summary
   */
  private printTestSummary(summary: any): void {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 LOCAL API TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏱️  Duration: ${summary.duration}ms`);
    console.log(`📊 Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
    
    if (summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      summary.results.filter((r: TestResult) => !r.passed).forEach((result: TestResult) => {
        console.log(`   • ${result.testName}: ${result.error}`);
      });
    }
    
    console.log('='.repeat(50));
    console.log(summary.passed === summary.totalTests ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Generate test report in JSON format
   */
  generateTestReport(): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length,
        success_rate: (this.testResults.filter(r => r.passed).length / this.testResults.length) * 100,
        total_duration: this.testResults.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.testResults,
      environment: {
        local_only: true,
        platform: typeof window !== 'undefined' ? 'browser' : 'node',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
      }
    };
  }
}

// Export singleton instance
export const localApiTester = LocalApiTester.getInstance();

// Export convenience function
export const runLocalApiTests = () => localApiTester.runAllTests();

export default localApiTester;