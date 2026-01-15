/**
 * Script to generate environment.local.ts files from .env
 * This ensures sensitive credentials are not committed to git
 */

const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

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

// Validate required variables
if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables in .env file:');
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

// Generate environment.local.ts
const devEnvContent = `// This file is auto-generated from .env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: false,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Supabase Configuration (from .env)
  supabase: {
    url: '${envVars.SUPABASE_URL}',
    anonKey: '${envVars.SUPABASE_ANON_KEY}'
  }
};
`;

// Generate environment.prod.local.ts
const prodEnvContent = `// This file is auto-generated from .env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: true,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Supabase Configuration (from .env)
  supabase: {
    url: '${envVars.SUPABASE_URL}',
    anonKey: '${envVars.SUPABASE_ANON_KEY}'
  }
};
`;

// Write files
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
