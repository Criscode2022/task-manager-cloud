/**
 * Script to generate environment.local.ts files from .env or process.env
 * 
 * Priority order:
 * 1. Process environment variables (e.g. Netlify dashboard env vars)
 * 2. .env file in the project root
 * 3. .env.example as a fallback template (will abort for local dev)
 * 
 * This ensures:
 * - CI/CD (Netlify) works with dashboard env vars even without a .env file
 * - Local dev works by reading the .env file
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// --- Step 1: Check process.env first (Netlify / CI) ---
const processSupabaseUrl = process.env.SUPABASE_URL;
const processSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (processSupabaseUrl && processSupabaseAnonKey) {
  console.log('🌐 Found environment variables from process (CI/CD)');
  console.log('   SUPABASE_URL:', processSupabaseUrl);
  console.log('   SUPABASE_ANON_KEY (first 30 chars):',
    processSupabaseAnonKey.substring(0, 30) + '...');
  console.log('   SUPABASE_ANON_KEY length:', processSupabaseAnonKey.length);

  generateEnvFiles(processSupabaseUrl, processSupabaseAnonKey);
  process.exit(0);
}

console.log('ℹ️  No process env vars found, falling back to .env file...');

// --- Step 2: Fall back to .env file (local development) ---
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 Creating .env from .env.example...');

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from template');
    console.log('⚠️  Please edit .env and add your actual Supabase credentials');
    process.exit(1);
  } else {
    console.error('❌ .env.example not found either!');
    process.exit(1);
  }
}

// Parse .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (line.trim().startsWith('#') || !line.trim()) {
    return;
  }

  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// Log what was read from .env
console.log('\n📖 Reading .env file...');
console.log('   SUPABASE_URL:', envVars.SUPABASE_URL || '(not set)');
console.log('   SUPABASE_ANON_KEY (first 30 chars):',
  envVars.SUPABASE_ANON_KEY ? envVars.SUPABASE_ANON_KEY.substring(0, 30) + '...' : '(not set)');
console.log('   SUPABASE_ANON_KEY length:', envVars.SUPABASE_ANON_KEY ? envVars.SUPABASE_ANON_KEY.length : 0);

// Validate required variables
if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
  console.error('\n❌ Missing required environment variables in .env file:');
  if (!envVars.SUPABASE_URL) console.error('  - SUPABASE_URL');
  if (!envVars.SUPABASE_ANON_KEY) console.error('  - SUPABASE_ANON_KEY');
  console.log('\n📝 Please update your .env file with the correct values');
  process.exit(1);
}

// Check if using placeholder values
if (envVars.SUPABASE_ANON_KEY.includes('your-') ||
    envVars.SUPABASE_ANON_KEY.includes('YOUR_') ||
    envVars.SUPABASE_ANON_KEY === 'your-actual-supabase-anon-key-here') {
  console.warn('⚠️  Warning: SUPABASE_ANON_KEY appears to be a placeholder');
  console.warn('   Please update .env with your actual Supabase anon key');
  console.warn('   Get it from: https://supabase.com/dashboard > Settings > API\n');
}

generateEnvFiles(envVars.SUPABASE_URL, envVars.SUPABASE_ANON_KEY);

// --- Helper: generate the environment TS files ---
function generateEnvFiles(supabaseUrl, supabaseAnonKey) {
  const devEnvContent = `// This file is auto-generated from .env or process.env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: false,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Supabase Configuration
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  }
};
`;

  const prodEnvContent = `// This file is auto-generated from .env or process.env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: true,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Supabase Configuration
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}'
  }
};
`;

  const envDir = path.join(__dirname, '..', 'src', 'environments');

  fs.writeFileSync(
    path.join(envDir, 'environment.local.ts'),
    devEnvContent
  );

  fs.writeFileSync(
    path.join(envDir, 'environment.prod.local.ts'),
    prodEnvContent
  );

  console.log('✅ Environment files generated successfully!');
  console.log('   - src/environments/environment.local.ts');
  console.log('   - src/environments/environment.prod.local.ts');
  console.log('\n🔒 These files are gitignored and contain your secrets');
}
