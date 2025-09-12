import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Launch browser for cleanup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🧹 Cleaning up test environment...');

    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle');

    // Cleanup test data
    await cleanupTestData(page);

    // Reset application state
    await resetApplicationState(page);

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't throw error to avoid failing the test run
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any) {
  // Cleanup any test data created during tests
  await page.evaluate(() => {
    // Remove test mode indicators
    localStorage.removeItem('test-mode');
    localStorage.removeItem('skip-onboarding');
    
    // Clear any test-specific data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('test-')) {
        localStorage.removeItem(key);
      }
    });
  });
}

async function resetApplicationState(page: any) {
  // Reset application to clean state
  await page.evaluate(() => {
    // Clear all application data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB
    if (window.indexedDB) {
      window.indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  });
}

export default globalTeardown;