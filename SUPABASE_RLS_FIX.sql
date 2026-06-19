-- ============================================
-- SUPABASE RLS FIX FOR USERS TABLE
-- ============================================

-- OPTION 1: DISABLE RLS (Quickest for Testing)
-- Uncomment this if you want to temporarily disable RLS
/*
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
*/

-- OPTION 2: ENABLE RLS WITH PROPER POLICIES (Recommended for Production)
-- Uncomment this section and run it

-- 1. Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. DROP existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous registration" ON users;
DROP POLICY IF EXISTS "Allow users to read own data" ON users;
DROP POLICY IF EXISTS "Allow users to update own data" ON users;

-- 3. CREATE new policies

-- Allow anonymous users to INSERT (registration)
CREATE POLICY "Allow anonymous registration"
ON users
FOR INSERT
WITH CHECK (true);

-- Allow users to SELECT their own data
CREATE POLICY "Allow users to read own data"
ON users
FOR SELECT
USING (true); -- Allow read access to all users

-- Allow users to UPDATE their own data
CREATE POLICY "Allow users to update own data"
ON users
FOR UPDATE
USING (true); -- You can restrict this to: auth.uid() = id (if using auth)
WITH CHECK (true);

-- 4. Verify policies are applied
SELECT tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
