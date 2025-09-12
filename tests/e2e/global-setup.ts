import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for application to be ready
    await page.goto(baseURL!);
    await page.waitForLoadState('networkidle');

    // Perform any necessary setup tasks
    console.log('🚀 Setting up test environment...');

    // Initialize test data if needed
    await setupTestData(page);

    // Clear any existing state
    await clearApplicationState(page);

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  // Initialize any required test data
  await page.evaluate(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Set up test configuration
    localStorage.setItem('test-mode', 'true');
    localStorage.setItem('skip-onboarding', 'true');
  });
}

async function clearApplicationState(page: any) {
  // Clear any existing application state
  await page.evaluate(() => {
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

    // Clear session storage
    sessionStorage.clear();
  });
}

export default globalSetup;