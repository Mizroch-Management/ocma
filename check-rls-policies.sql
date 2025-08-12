-- Check all RLS policies on critical tables
-- Run this in Supabase SQL Editor to see what policies exist

-- 1. Check RLS status on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'organization_members', 'system_settings');

-- 2. List all policies on organizations table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  CASE 
    WHEN pol.polpermissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as type,
  pg_get_expr(pol.polqual, pol.polrelid, true) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid, true) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'organizations'
ORDER BY pol.polname;

-- 3. List all policies on organization_members table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  CASE 
    WHEN pol.polpermissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as type,
  pg_get_expr(pol.polqual, pol.polrelid, true) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid, true) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'organization_members'
ORDER BY pol.polname;

-- 4. List all policies on system_settings table
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  CASE 
    WHEN pol.polpermissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as type,
  pg_get_expr(pol.polqual, pol.polrelid, true) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid, true) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'system_settings'
ORDER BY pol.polname;

-- 5. Check if auth.uid() is working
SELECT auth.uid() as current_user_id;