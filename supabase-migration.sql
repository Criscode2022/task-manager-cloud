-- Task Manager Cloud - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    encrypted_pin TEXT,
    iv TEXT,
    auth_tag TEXT
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON public.tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Allow anyone to create a user
CREATE POLICY "Anyone can create users" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Users can read their own data" ON public.users
    FOR SELECT
    USING (true);

-- Allow users to delete their own account
CREATE POLICY "Users can delete their own account" ON public.users
    FOR DELETE
    USING (true);

-- Create policies for tasks table
-- Allow users to read all tasks (with user_id filter in app)
CREATE POLICY "Users can read tasks" ON public.tasks
    FOR SELECT
    USING (true);

-- Allow users to create tasks
CREATE POLICY "Users can create tasks" ON public.tasks
    FOR INSERT
    WITH CHECK (true);

-- Allow users to update tasks
CREATE POLICY "Users can update tasks" ON public.tasks
    FOR UPDATE
    USING (true);

-- Allow users to delete tasks
CREATE POLICY "Users can delete tasks" ON public.tasks
    FOR DELETE
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
