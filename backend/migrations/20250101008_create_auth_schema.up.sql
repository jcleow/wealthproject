-- Create app_auth schema for BetterAuth tables
-- This keeps authentication data logically separated from financial data
-- Note: Using app_auth instead of auth to avoid conflict with Supabase's reserved auth schema

CREATE SCHEMA IF NOT EXISTS app_auth;

-- User table - stores user accounts
CREATE TABLE IF NOT EXISTS app_auth."user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_auth_user_email ON app_auth."user"(email);

-- Session table - stores active user sessions
CREATE TABLE IF NOT EXISTS app_auth."session" (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES app_auth."user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_auth_session_user_id ON app_auth."session"("userId");
CREATE INDEX IF NOT EXISTS idx_app_auth_session_token ON app_auth."session"(token);

-- Account table - stores OAuth provider accounts and password credentials
CREATE TABLE IF NOT EXISTS app_auth."account" (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES app_auth."user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    scope TEXT,
    password TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_auth_account_user_id ON app_auth."account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_auth_account_provider ON app_auth."account"("providerId", "accountId");

-- Verification table - stores email verification tokens
CREATE TABLE IF NOT EXISTS app_auth."verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_auth_verification_identifier ON app_auth."verification"(identifier);

-- Create roles for access control (if they don't exist)
DO $$
BEGIN
    -- Role for BetterAuth/Next.js - full access to app_auth schema
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_service') THEN
        CREATE ROLE auth_service;
    END IF;

    -- Role for Go backend - read-only access to app_auth.user for verification
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend_service') THEN
        CREATE ROLE backend_service;
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA app_auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_auth TO auth_service;

-- Backend can read app_auth.user to verify user exists (optional)
GRANT USAGE ON SCHEMA app_auth TO backend_service;
GRANT SELECT ON app_auth."user" TO backend_service;
