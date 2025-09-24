#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building BEAR AI application...');

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';

// Check if dependencies are installed
if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
  console.log('Installing dependencies...');
  execSync('npm ci', { stdio: 'inherit' });
}

// Build the React app using Vite (if available) or webpack
try {
  // Try Vite first
  if (fs.existsSync(path.join(__dirname, '../vite.config.js')) ||
      fs.existsSync(path.join(__dirname, '../vite.config.ts'))) {
    console.log('Building with Vite...');
    execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } else {
    // Fallback to webpack
    console.log('Building with webpack...');
    execSync('npx webpack --mode production', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}