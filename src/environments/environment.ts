// NOTE: This file is only a fallback template
// The actual configuration is loaded from environment.local.ts (auto-generated from .env)
// Run 'npm run config' to generate environment.local.ts from your .env file

export const environment = {
  production: false,
  // Legacy API (deprecated)
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',

  // Supabase Configuration (loaded from .env via environment.local.ts)
  supabase: {
    url: '',
    anonKey: ''
  }
};
