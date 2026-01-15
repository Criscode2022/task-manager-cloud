# Supabase Integration Setup Guide

This guide will help you set up Supabase as the database backend for the Task Manager Cloud application.

## Prerequisites

- A Supabase account (free tier is sufficient)
- Your Supabase project credentials

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: Task Manager Cloud
   - Database Password: (choose a strong password)
   - Region: (select closest to your users)
4. Wait for the project to be created

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-migration.sql` from this repository
3. Paste it into the SQL Editor
4. Click "Run" to execute the migration
5. Verify that the tables were created:
   - Go to **Table Editor**
   - You should see `users` and `tasks` tables

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll need two values:
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **Anon/Public Key**: A long string starting with `eyJ...`

## Step 4: Configure the Application

### Development Environment

1. Open `src/environments/environment.ts`
2. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual anon key:

```typescript
export const environment = {
  production: false,
  baseUrl: 'https://api-workspace-wczh.onrender.com/tasks-manager', // Legacy API (optional)

  supabase: {
    url: 'https://eizqvmsubhosvawlbglw.supabase.co',
    anonKey: 'YOUR_ACTUAL_ANON_KEY_HERE'
  }
};
```

### Production Environment

1. Open `src/environments/environment.prod.ts`
2. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual anon key:

```typescript
export const environment = {
  production: true,
  baseUrl: 'http://localhost:3000/tasks-manager', // Legacy API (optional)

  supabase: {
    url: 'https://eizqvmsubhosvawlbglw.supabase.co',
    anonKey: 'YOUR_ACTUAL_ANON_KEY_HERE'
  }
};
```

## Step 5: Database Schema Details

### Users Table
Stores user authentication and encryption data:
- `id`: Auto-incrementing primary key
- `created_at`: Timestamp of user creation
- `encrypted_pin`: Encrypted PIN for user verification
- `iv`: Initialization vector for encryption
- `auth_tag`: Authentication tag for encryption

### Tasks Table
Stores user tasks:
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to users table
- `title`: Task title (required)
- `description`: Task description (optional)
- `done`: Boolean indicating completion status
- `created_at`: Timestamp of task creation
- `updated_at`: Timestamp of last update (auto-updated)

## Step 6: Test the Integration

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open the application in your browser

4. Test the following features:
   - **Create User**: Go to Options tab → Click "Upload Tasks"
   - **Add Task**: Create a new task in the List tab
   - **Sync**: Tasks should automatically sync to Supabase
   - **Download**: Enter your user ID to download tasks

## Features Implemented

### ✅ Direct Database Connection
- Replaced REST API calls with direct Supabase queries
- Faster data access and reduced latency

### ✅ Real-Time Sync (Optional)
The app includes realtime sync capabilities. To enable:
```typescript
// In your component
this.taskSupabaseService.enableRealtimeSync(userId);
```

### ✅ Row Level Security (RLS)
- Database security policies are configured
- Users can only access their own data

### ✅ Automatic Timestamps
- `created_at` automatically set on record creation
- `updated_at` automatically updated on record modification

## Security Notes

### ⚠️ Important for Production

The current PIN encryption uses a simple base64 encoding which is **NOT secure** for production use. Before deploying to production:

1. Implement proper encryption:
   - Use a proper encryption library (e.g., Web Crypto API, CryptoJS)
   - Generate strong encryption keys
   - Store keys securely (environment variables, Key Management Service)

2. Example of proper encryption setup:
   ```typescript
   import CryptoJS from 'crypto-js';

   // Encrypt PIN
   const encrypted = CryptoJS.AES.encrypt(pin, secretKey).toString();

   // Decrypt PIN
   const decrypted = CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
   ```

3. Consider using Supabase Auth for user authentication instead of custom PIN system

## Troubleshooting

### Error: "No Supabase URL or Key provided"
- Verify you replaced `YOUR_SUPABASE_ANON_KEY_HERE` in environment files
- Ensure the key is properly quoted and has no extra spaces

### Error: "relation does not exist"
- Run the `supabase-migration.sql` script in your Supabase SQL Editor
- Verify tables were created in Table Editor

### Error: "JWT expired" or Authentication Errors
- Your anon key may be incorrect
- Copy the key again from Supabase dashboard
- Ensure you're using the **anon/public** key, not the service_role key

### Tasks Not Syncing
- Check browser console for errors
- Verify RLS policies are set up correctly
- Ensure your user ID is stored in local storage

## Migration from Old API

If you're migrating from the previous REST API:

1. **Export existing data** (if needed):
   - Use the old API to download all tasks
   - Save them locally

2. **Switch to Supabase**:
   - Update environment files with Supabase credentials
   - The app will automatically use Supabase

3. **Import data** (if needed):
   - Create a new user in the app
   - Use the bulk upload feature to import old tasks

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)

## Support

If you encounter any issues:

1. Check the browser console for error messages
2. Verify your Supabase dashboard for any failed queries
3. Review the [Supabase Logs](https://supabase.com/dashboard/project/_/logs/postgres-logs)
4. Create an issue in this repository with:
   - Error message
   - Steps to reproduce
   - Browser console output

---

**Note**: Your Supabase project reference is: `eizqvmsubhosvawlbglw`

Your project URL is: `https://eizqvmsubhosvawlbglw.supabase.co`
