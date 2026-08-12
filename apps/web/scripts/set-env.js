/**
 * Script to generate environment.local.ts files from .env or process.env
 *
 * Priority order:
 * 1. Process environment variables (e.g. Netlify / CI)
 * 2. .env file in the monorepo root
 * 3. .env.example as a fallback template (will abort for local dev)
 *
 * Frontend only needs API_BASE_URL (DATABASE_URL stays server-side in apps/api).
 */

const fs = require('fs');
const path = require('path');

// apps/web/scripts -> monorepo root
const repoRoot = path.join(__dirname, '..', '..', '..');
const webRoot = path.join(__dirname, '..');
const envPath = path.join(repoRoot, '.env');
const envExamplePath = path.join(repoRoot, '.env.example');

function copyIoniconsIntoWorkspace() {
  const source = path.join(
    repoRoot,
    'node_modules',
    'ionicons',
    'dist',
    'ionicons',
    'svg',
  );
  const dest = path.join(webRoot, 'src', 'ionicons-svg');
  if (!fs.existsSync(source)) {
    return;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, { recursive: true });
}

copyIoniconsIntoWorkspace();

function resolveApiBaseUrl(fromEnv) {
  return fromEnv || '/api';
}

// --- Step 1: Check process.env first (CI/CD) ---
const processApiBaseUrl = process.env.API_BASE_URL;

if (
  process.env.CI ||
  process.env.NETLIFY ||
  process.env.VERCEL ||
  processApiBaseUrl
) {
  console.log('🌐 Found environment variables from process (CI/CD)');
  console.log('   API_BASE_URL:', resolveApiBaseUrl(processApiBaseUrl));
  generateEnvFiles(resolveApiBaseUrl(processApiBaseUrl));
  process.exit(0);
}

console.log('ℹ️  No process env vars found, falling back to .env file...');

// --- Step 2: Fall back to root .env file (local development) ---
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at repo root!');
  console.log('📝 Creating .env from .env.example...');

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from template');
    console.log('⚠️  Please edit .env and add your Neon DATABASE_URL + auth secrets');
    process.exit(1);
  } else {
    console.error('❌ .env.example not found either!');
    process.exit(1);
  }
}

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
    : '(not set — required for Nest API)',
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
  apiBaseUrl: '${apiBaseUrl}'
};
`;

  const prodEnvContent = `// This file is auto-generated from .env or process.env
// DO NOT COMMIT THIS FILE

export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}'
};
`;

  const envDir = path.join(webRoot, 'src', 'environments');

  fs.writeFileSync(path.join(envDir, 'environment.local.ts'), devEnvContent);
  fs.writeFileSync(
    path.join(envDir, 'environment.prod.local.ts'),
    prodEnvContent,
  );

  console.log('✅ Environment files generated successfully!');
  console.log('   - apps/web/src/environments/environment.local.ts');
  console.log('   - apps/web/src/environments/environment.prod.local.ts');
  console.log('\n🔒 These files are gitignored and contain no database secrets');
}
