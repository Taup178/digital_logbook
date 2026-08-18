-- ============================================================
-- Digital Logbook — Database Setup SQL
-- Run ALL of this in the Supabase SQL Editor (one shot):
-- https://supabase.com/dashboard/project/_/sql
--
-- These tables are accessed directly via the `pg` PostgreSQL driver
-- from the backend microservices. No Supabase auto-generated REST API
-- (PostgREST) is used for data operations — all queries are hand-written SQL.
-- ============================================================

-- 1. Profile service: users table
--    Used by profile-service for checkUser, getProfile, username/email/name/avatar updates.
--    Frontend inserts only { email } on signup; username/name/avatar filled later.
CREATE TABLE IF NOT EXISTS public.users (
  email      VARCHAR(255) PRIMARY KEY,
  username   VARCHAR(50)  UNIQUE,
  name       VARCHAR(100),
  avatar     TEXT,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- 2. Project service: projects table
--    Each project belongs to a user (identified by email).
--    (user_email, project_name) is unique — enforced by unique constraint.
CREATE TABLE IF NOT EXISTS public.projects (
  id           BIGSERIAL PRIMARY KEY,
  user_email   VARCHAR(255) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  description  TEXT,
  archived     BOOLEAN      DEFAULT false,
  created_at   TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (user_email, project_name)
);

-- 3. Project service: entries table
--    Each entry belongs to a user and a project.
--    The `entries` column stores a JSONB object with the entry content.
--    `duration` is computed by the database (ended_at - started_at).
CREATE TABLE IF NOT EXISTS public.entries (
  id           BIGSERIAL PRIMARY KEY,
  user_email   VARCHAR(255) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  entries      JSONB,
  due_date     TIMESTAMPTZ,
  priority     TEXT,
  status       TEXT,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  duration     INTERVAL,
  archived     BOOLEAN      DEFAULT false,
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- 4. Project service: fields table
--    Custom field definitions per project (table_name stores the project name).
CREATE TABLE IF NOT EXISTS public.fields (
  id          BIGSERIAL PRIMARY KEY,
  user_email  VARCHAR(255) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
  table_name  VARCHAR(255) NOT NULL,
  field_name  VARCHAR(255) NOT NULL,
  data_type   VARCHAR(100),
  is_required BOOLEAN,
  created_at  TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (user_email, table_name, field_name)
);

-- 5. Delete-user RPC (account deletion from Settings panel)
--    Looks up the user's email from auth, cleans up app tables, then removes the auth account.
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT u.email INTO user_email
    FROM auth.users u
   WHERE u.id = auth.uid();

  -- Clean up profile-service table
  DELETE FROM public.users   WHERE email = user_email;

  -- Finally remove the auth account itself
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 6. Backfill existing auth users into public.users
--    Run this once after creating the table to avoid FK errors for users who signed up before.
INSERT INTO public.users (email)
SELECT DISTINCT email
FROM auth.users
WHERE email IS NOT NULL
  AND email NOT IN (SELECT email FROM public.users)
ON CONFLICT (email) DO NOTHING;
