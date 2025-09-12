/**
 * Quick build test script to verify dependencies and resolve build issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 BEAR AI Build Diagnostics\n');

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('✅ Package.json found');
  console.log('   Name:', pkg.name);
  console.log('   Version:', pkg.version);
  
  // Check for key dependencies
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  
  console.log('\n📦 Key Dependencies:');
  console.log('   @tauri-apps/api:', deps['@tauri-apps/api'] ? '✅ ' + deps['@tauri-apps/api'] : '❌ Missing');
  console.log('   react:', deps.react ? '✅ ' + deps.react : '❌ Missing');
  console.log('   react-scripts:', deps['react-scripts'] ? '✅ ' + deps['react-scripts'] : '❌ Missing');
  console.log('   typescript:', deps.typescript || devDeps.typescript ? '✅ Present' : '❌ Missing');
} else {
  console.log('❌ Package.json not found');
}

// Check src structure
const srcPath = path.join(__dirname, 'src');
if (fs.existsSync(srcPath)) {
  console.log('\n📁 Source Structure:');
  console.log('   src/ directory:', '✅ Exists');
  
  const apiPath = path.join(srcPath, 'api');
  if (fs.existsSync(apiPath)) {
    console.log('   src/api/:', '✅ Exists');
    
    const localClientPath = path.join(apiPath, 'localClient.ts');
    if (fs.existsSync(localClientPath)) {
      console.log('   localClient.ts:', '✅ Exists');
      
      // Check for problematic import
      const content = fs.readFileSync(localClientPath, 'utf8');
      if (content.includes("from '@tauri-apps/api/tauri'")) {
        console.log('   Direct Tauri import:', '❌ Found (this causes build failure)');
      } else if (content.includes('getTauriInvoke')) {
        console.log('   Conditional import:', '✅ Using conditional imports');
      }
    } else {
      console.log('   localClient.ts:', '❌ Missing');
    }
  } else {
    console.log('   src/api/:', '❌ Missing');
  }
  
  const utilsPath = path.join(srcPath, 'utils');
  if (fs.existsSync(utilsPath)) {
    console.log('   src/utils/:', '✅ Exists');
    
    const envDetPath = path.join(utilsPath, 'environmentDetection.ts');
    console.log('   environmentDetection.ts:', fs.existsSync(envDetPath) ? '✅ Exists' : '❌ Missing');
    
    const condImportsPath = path.join(utilsPath, 'conditionalImports.ts');
    console.log('   conditionalImports.ts:', fs.existsSync(condImportsPath) ? '✅ Exists' : '❌ Missing');
  }
} else {
  console.log('❌ src/ directory not found');
}

// Check Tauri setup
const tauriPath = path.join(__dirname, 'src-tauri');
if (fs.existsSync(tauriPath)) {
  console.log('\n🦀 Tauri Setup:');
  console.log('   src-tauri/ directory:', '✅ Exists');
  
  const tauriConfPath = path.join(tauriPath, 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    console.log('   tauri.conf.json:', '✅ Exists');
    
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    console.log('   App name:', tauriConf.productName || 'Not set');
    console.log('   Frontend dist:', tauriConf.build?.frontendDist || 'Not set');
    console.log('   Dev URL:', tauriConf.build?.devUrl || 'Not set');
  } else {
    console.log('   tauri.conf.json:', '❌ Missing');
  }
  
  const cargoPath = path.join(tauriPath, 'Cargo.toml');
  console.log('   Cargo.toml:', fs.existsSync(cargoPath) ? '✅ Exists' : '❌ Missing');
} else {
  console.log('❌ src-tauri/ directory not found');
}

// Check node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('\n📚 Dependencies:');
  console.log('   node_modules/', '✅ Exists');
  
  const tauriApiPath = path.join(nodeModulesPath, '@tauri-apps', 'api');
  console.log('   @tauri-apps/api:', fs.existsSync(tauriApiPath) ? '✅ Installed' : '❌ Not installed');
  
  const reactScriptsPath = path.join(nodeModulesPath, 'react-scripts');
  console.log('   react-scripts:', fs.existsSync(reactScriptsPath) ? '✅ Installed' : '❌ Not installed');
} else {
  console.log('❌ node_modules/ directory not found - run npm install');
}

console.log('\n🎯 Build Readiness Assessment:');

// Overall assessment
let issues = 0;
let recommendations = [];

if (!fs.existsSync(path.join(__dirname, 'node_modules', '@tauri-apps', 'api'))) {
  issues++;
  recommendations.push('Run: npm install @tauri-apps/api');
}

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'react-scripts'))) {
  issues++;
  recommendations.push('Verify react-scripts is properly installed');
}

if (fs.existsSync(path.join(__dirname, 'src', 'api', 'localClient.ts'))) {
  const content = fs.readFileSync(path.join(__dirname, 'src', 'api', 'localClient.ts'), 'utf8');
  if (content.includes("from '@tauri-apps/api/tauri'")) {
    issues++;
    recommendations.push('Replace direct Tauri imports with conditional imports');
  }
}

if (issues === 0) {
  console.log('✅ Build should work - all dependencies and imports are properly configured');
} else {
  console.log(`❌ Found ${issues} issue(s) that may cause build failures:`);
  recommendations.forEach(rec => console.log(`   • ${rec}`));
}

console.log('\n🚀 Next Steps:');
console.log('   1. Run the recommended fixes above');
console.log('   2. Test with: npm run build');
console.log('   3. For desktop: npm run tauri:dev');
console.log('   4. For web: npm start');

process.exit(issues);