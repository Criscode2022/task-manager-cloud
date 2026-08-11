/**
 * Script to generate environment.local.ts files from .env or process.env
 *
 * Priority order:
 * 1. Process environment variables (e.g. Netlify dashboard env vars)
 * 2. .env file in the project root
 * 3. .env.example as a fallback template (will abort for local dev)
 *
 * Frontend only needs API_BASE_URL (Neon DATABASE_URL stays server-side).
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

function resolveApiBaseUrl(fromEnv) {
  return fromEnv || '/api';
}

// --- Step 1: Check process.env first (Netlify / CI) ---
const processApiBaseUrl = process.env.API_BASE_URL;

if (process.env.CI || process.env.NETLIFY || processApiBaseUrl) {
  console.log('🌐 Found environment variables from process (CI/CD)');
  console.log('   API_BASE_URL:', resolveApiBaseUrl(processApiBaseUrl));
  generateEnvFiles(resolveApiBaseUrl(processApiBaseUrl));
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
    console.log('⚠️  Please edit .env and add your Neon DATABASE_URL');
    process.exit(1);
  } else {
    console.error('❌ .env.example not found either!');
    process.exit(1);
  }
}

// Parse .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach((line) => {
  if (line.trim().startsWith('#') || !line.trim()) {
    return;
  }

  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('\n📖 Reading .env file...');
console.log('   API_BASE_URL:', envVars.API_BASE_URL || '/api (default)');
console.log(
  '   DATABASE_URL:',
  envVars.DATABASE_URL
    ? envVars.DATABASE_URL.replace(/:[^:@/]+@/, ':***@').slice(0, 60) + '...'
    : '(not set — required for local API / Netlify functions)',
);

if (
  envVars.DATABASE_URL &&
  (envVars.DATABASE_URL.includes('your-') ||
    envVars.DATABASE_URL.includes('USER:PASSWORD'))
) {
  console.warn('⚠️  Warning: DATABASE_URL appears to be a placeholder');
  console.warn('   Update .env with your Neon connection string\n');
}

generateEnvFiles(resolveApiBaseUrl(envVars.API_BASE_URL));

function generateEnvFiles(apiBaseUrl) {
  const devEnvContent = `// This file is auto-generated from .env or process.env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: false,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Neon-backed API (Netlify Functions locally via proxy)
  apiBaseUrl: '${apiBaseUrl}'
};
`;

  const prodEnvContent = `// This file is auto-generated from .env or process.env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: true,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Neon-backed API (Netlify Functions)
  apiBaseUrl: '${apiBaseUrl}'
};
`;

  const envDir = path.join(__dirname, '..', 'src', 'environments');

  fs.writeFileSync(path.join(envDir, 'environment.local.ts'), devEnvContent);
  fs.writeFileSync(
    path.join(envDir, 'environment.prod.local.ts'),
    prodEnvContent,
  );

  console.log('✅ Environment files generated successfully!');
  console.log('   - src/environments/environment.local.ts');
  console.log('   - src/environments/environment.prod.local.ts');
  console.log('\n🔒 These files are gitignored and contain no database secrets');
}
