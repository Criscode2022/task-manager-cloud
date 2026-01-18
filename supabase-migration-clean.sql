-- Task Manager Cloud - Complete Database Migration
-- This script drops old tables and creates the new schema with pin_hash
-- ⚠️  WARNING: This will delete all existing data! ⚠️

-- Drop existing tables if they exist (CASCADE removes dependencies)
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create users" ON public.users;
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own account" ON public.users;
DROP POLICY IF EXISTS "Users can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- =====================================================
-- CREATE NEW SCHEMA WITH PIN_HASH
-- =====================================================

-- Create users table with pin_hash (SHA-256 hashed PIN)
CREATE TABLE public.users (
    id BIGSERIAL PRIMARY KEY,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_done ON public.tasks(done);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Anyone can create users" ON public.users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can read their own data" ON public.users
    FOR SELECT
    USING (true);

CREATE POLICY "Users can delete their own account" ON public.users
    FOR DELETE
    USING (true);

-- Tasks table policies
CREATE POLICY "Users can read tasks" ON public.tasks
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create tasks" ON public.tasks
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update tasks" ON public.tasks
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete tasks" ON public.tasks
    FOR DELETE
    USING (true);

-- =====================================================
-- CREATE FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the schema was created correctly
SELECT
    'users' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

SELECT
    'tasks' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Show success message
SELECT '✅ Migration completed successfully! The pin_hash schema is now active.' as status;
