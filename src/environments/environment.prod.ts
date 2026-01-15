export const environment = {
  production: true,
  // Legacy API (deprecated)
  //baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager',
  baseUrl: 'http://localhost:3000/tasks-manager',

  // Supabase Configuration
  supabase: {
    url: 'https://eizqvmsubhosvawlbglw.supabase.co',
    anonKey: 'YOUR_SUPABASE_ANON_KEY_HERE' // TODO: Replace with your actual Supabase anon key
  }
};
