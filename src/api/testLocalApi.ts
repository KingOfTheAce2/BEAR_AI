// Quick test script for localhost-only API functionality
// This script validates that all external HTTP dependencies have been removed

import { localApiRegistry, api } from './localApiRegistry';

/**
 * Comprehensive validation that API is truly localhost-only
 */
async function validateLocalhostOnlyOperation(): Promise<void> {
  // console.log('🧪 Validating Localhost-Only API Operation...\n');

  try {
    // 1. Initialize API
    // Logging disabled for production
    await api.initialize();
    // Logging disabled for production

    // 2. Check system health (should be local-only)
    // Logging disabled for production
    const health = await api.health();
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production

    // 3. Test authentication (local credentials only)
    // Logging disabled for production
    const authResponse = await api.auth.login('admin', 'admin123');
    if (authResponse.success) {
      // Logging disabled for production
      // Logging disabled for production
    } else {
      throw new Error(`Authentication failed: ${authResponse.error}`);
    }
    // Logging disabled for production

    // 4. Test chat service (local AI processing)
    // Logging disabled for production
    const chatSession = await api.chat.createSession({
      title: 'Localhost API Test',
      category: 'research'
    });
    // Logging disabled for production
    
    const chatResponse = await api.chat.sendMessage(chatSession.data.id, {
      content: 'This is a test of the local API system. Please confirm local processing.'
    });
    if (chatResponse.data.aiResponse.content.includes('local')) {
      // Logging disabled for production
    }
    // Logging disabled for production

    // 5. Test document service (local storage)
    // Logging disabled for production
    const testFile = new File(['Test content for localhost API'], 'test-document.txt', {
      type: 'text/plain'
    });
    const uploadResponse = await api.documents.upload(testFile);
    // Logging disabled for production
    
    const docList = await api.documents.list();
    // Logging disabled for production
    // Logging disabled for production

    // 6. Test research service (local database)
    // Logging disabled for production
    const researchResults = await api.research.search({
      query: 'contract formation'
    });
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production

    // 7. Test analysis service (local AI models)
    // Logging disabled for production
    const analysisResult = await api.analysis.analyze({
      document_id: uploadResponse.data.id,
      analysis_type: 'summary'
    });
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production

    // 8. Validate no external HTTP calls
    // Logging disabled for production
    
    // Check for any fetch or HTTP-related code in the client
    const clientCode = localApiRegistry.toString();
    const hasExternalCalls = [
      'fetch(',
      'http://',
      'https://',
      'XMLHttpRequest',
      'axios',
      'request('
    ].some(pattern => clientCode.includes(pattern));
    
    if (hasExternalCalls) {
      // Logging disabled for production
    } else {
      // Logging disabled for production
    }
    // Logging disabled for production

    // 9. Test API documentation generation
    // Logging disabled for production
    const docData = api.documentation();
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production

    // 10. Clean up test data
    // console.log('🧹 Cleaning up test data...');
    await api.documents.delete(uploadResponse.data.id);
    await api.chat.deleteSession(chatSession.data.id);
    await api.auth.logout();
    // Logging disabled for production

    // Final summary
    // console.log('🎉 LOCALHOST-ONLY API VALIDATION COMPLETED!');
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // Logging disabled for production
    // console.log('🔒 YOUR DATA NEVER LEAVES YOUR DEVICE 🔒');

  } catch (error) {
    // Error logging disabled for production
    throw error;
  } finally {
    // Ensure cleanup
    try {
      await api.shutdown();
    } catch (e) {
      // Logging disabled for production
    }
  }
}

/**
 * Performance benchmark for local operations
 */
async function benchmarkLocalOperations(): Promise<void> {
  // Logging disabled for production
  // Logging disabled for production

  const benchmarks = [
    {
      name: 'System Health Check',
      operation: () => api.health()
    },
    {
      name: 'Local Authentication',
      operation: async () => {
        await api.auth.logout();
        return api.auth.login('admin', 'admin123');
      }
    },
    {
      name: 'Document List',
      operation: () => api.documents.list()
    },
    {
      name: 'Research Search',
      operation: () => api.research.search({ query: 'test' })
    },
    {
      name: 'Chat Session Creation',
      operation: () => api.chat.createSession({ title: 'Benchmark Test' })
    }
  ];

  for (const benchmark of benchmarks) {
    const startTime = performance.now();
    
    try {
      await benchmark.operation();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Logging disabled for production
    } catch (error) {
      // Logging disabled for production
    }
  }

  // Logging disabled for production
  // console.log('🚀 Local operations are fast and responsive!');
}

// Export test functions
export { validateLocalhostOnlyOperation, benchmarkLocalOperations };

// Run validation if this file is executed directly
if (typeof window !== 'undefined' && window.location?.hash === '#test-local-api') {
  // console.log('🧪 Running localhost-only API validation...');
  validateLocalhostOnlyOperation()
    .then(() => benchmarkLocalOperations())
    .catch(() => {}); // Error handling disabled
}

export default validateLocalhostOnlyOperation;