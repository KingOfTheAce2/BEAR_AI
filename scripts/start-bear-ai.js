/**
 * BEAR AI Legal Assistant - Windows Launcher
 * Proper Node.js launcher that prevents CMD window flickering
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Configuration
const PROJECT_ROOT = path.dirname(__dirname);
const isWindows = os.platform() === 'win32';

console.log('🐻 Starting BEAR AI Legal Assistant...');
console.log(`Platform: ${os.platform()}`);
console.log(`Working directory: ${PROJECT_ROOT}`);

// Change to project directory
process.chdir(PROJECT_ROOT);

// Start the application
const command = isWindows ? 'npm.cmd' : 'npm';
const args = ['start'];

const child = spawn(command, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: isWindows,
    detached: !isWindows
});

child.on('error', (error) => {
    console.error('❌ Failed to start BEAR AI:', error.message);
    console.error('💡 Make sure Node.js and npm are installed and in your PATH');
    process.exit(1);
});

child.on('close', (code) => {
    if (code !== 0) {
        console.error(`❌ BEAR AI exited with code ${code}`);
    } else {
        console.log('✅ BEAR AI closed successfully');
    }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down BEAR AI...');
    child.kill('SIGINT');
    process.exit(0);
});