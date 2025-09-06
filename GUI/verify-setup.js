#!/usr/bin/env node

/**
 * BEAR AI GUI Setup Verification Script
 * 
 * This script verifies that the project structure is correctly set up
 * without requiring npm install to be completed.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const requiredFiles = [
  // Configuration files
  'package.json',
  'vite.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  'tsconfig.node.json',
  '.eslintrc.js',
  '.prettierrc',
  'postcss.config.js',
  'vitest.config.ts',
  '.env.example',
  'index.html',

  // Source files
  'src/main.tsx',
  'src/App.tsx',
  'src/types/index.ts',
  'src/utils/index.ts',
  'src/store/index.ts',
  'src/services/api.ts',
  'src/services/auth.ts',
  'src/hooks/useApi.ts',
  'src/styles/index.css',
  'src/test/setup.ts',

  // Components
  'src/components/ui/Button.tsx',
  'src/components/ui/Input.tsx',
  'src/components/ui/index.ts',
  'src/components/layout/Header.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Layout.tsx',
  'src/components/layout/index.ts',

  // Pages
  'src/pages/Dashboard.tsx',
  'src/pages/Login.tsx',
  'src/pages/index.ts',

  // Tests
  'tests/App.test.tsx',
  'tests/components/Button.test.tsx',

  // Documentation
  'README.md',
  'docs/SETUP.md',
]

const requiredDirectories = [
  'src',
  'src/components',
  'src/components/ui',
  'src/components/layout',
  'src/pages',
  'src/hooks',
  'src/services',
  'src/store',
  'src/types',
  'src/utils',
  'src/styles',
  'tests',
  'tests/components',
  'public',
  'docs',
]

function checkFile(filepath) {
  const fullPath = path.join(__dirname, filepath)
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath)
    if (stats.size > 0) {
      return { exists: true, empty: false }
    } else {
      return { exists: true, empty: true }
    }
  }
  return { exists: false, empty: false }
}

function checkDirectory(dirpath) {
  const fullPath = path.join(__dirname, dirpath)
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
}

function main() {
  console.log('🔍 BEAR AI GUI Setup Verification')
  console.log('=====================================\\n')

  let allPassed = true
  let issues = []

  // Check directories
  console.log('📁 Checking Directory Structure...')
  requiredDirectories.forEach(dir => {
    if (checkDirectory(dir)) {
      console.log(`  ✅ ${dir}`)
    } else {
      console.log(`  ❌ ${dir} - Missing`)
      allPassed = false
      issues.push(`Missing directory: ${dir}`)
    }
  })

  console.log('\\n📄 Checking Required Files...')
  
  // Check files
  requiredFiles.forEach(file => {
    const result = checkFile(file)
    if (result.exists && !result.empty) {
      console.log(`  ✅ ${file}`)
    } else if (result.exists && result.empty) {
      console.log(`  ⚠️  ${file} - Empty file`)
      issues.push(`Empty file: ${file}`)
    } else {
      console.log(`  ❌ ${file} - Missing`)
      allPassed = false
      issues.push(`Missing file: ${file}`)
    }
  })

  // Check package.json content
  console.log('\\n📦 Checking Package Configuration...')
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
    
    const requiredDeps = ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios', 'lucide-react']
    const requiredDevDeps = ['@vitejs/plugin-react', 'typescript', 'tailwindcss', 'vitest']
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`  ✅ ${dep} dependency`)
      } else {
        console.log(`  ❌ ${dep} dependency - Missing`)
        allPassed = false
        issues.push(`Missing dependency: ${dep}`)
      }
    })

    requiredDevDeps.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        console.log(`  ✅ ${dep} dev dependency`)
      } else {
        console.log(`  ❌ ${dep} dev dependency - Missing`)
        allPassed = false
        issues.push(`Missing dev dependency: ${dep}`)
      }
    })
  } catch (error) {
    console.log('  ❌ Unable to read package.json')
    allPassed = false
    issues.push('Cannot parse package.json')
  }

  // Summary
  console.log('\\n' + '='.repeat(50))
  if (allPassed && issues.length === 0) {
    console.log('✅ SUCCESS: All required files and directories are present!')
    console.log('\\n🚀 Next Steps:')
    console.log('   1. Run: npm install')
    console.log('   2. Copy .env.example to .env and configure')
    console.log('   3. Run: npm run dev')
    console.log('   4. Open http://localhost:3000')
    console.log('\\n📚 See docs/SETUP.md for detailed instructions')
  } else {
    console.log('❌ ISSUES FOUND:')
    issues.forEach(issue => console.log(`   - ${issue}`))
    console.log(`\\n⚠️  Found ${issues.length} issue(s) that need attention.`)
  }

  console.log('\\n📊 Project Statistics:')
  console.log(`   - Configuration files: ${requiredFiles.filter(f => f.includes('config') || f.includes('.json') || f.includes('.js')).length}`)
  console.log(`   - TypeScript files: ${requiredFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).length}`)
  console.log(`   - Component files: ${requiredFiles.filter(f => f.includes('components')).length}`)
  console.log(`   - Test files: ${requiredFiles.filter(f => f.includes('test') || f.includes('Test')).length}`)

  process.exit(allPassed && issues.length === 0 ? 0 : 1)
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}