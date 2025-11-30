-- Create auth schema for BetterAuth tables
-- This keeps authentication data logically separated from financial data

CREATE SCHEMA IF NOT EXISTS auth;

-- User table - stores user accounts
CREATE TABLE IF NOT EXISTS auth."user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_user_email ON auth."user"(email);

-- Session table - stores active user sessions
CREATE TABLE IF NOT EXISTS auth."session" (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth."session"("userId");
CREATE INDEX IF NOT EXISTS idx_auth_session_token ON auth."session"(token);

-- Account table - stores OAuth provider accounts and password credentials
CREATE TABLE IF NOT EXISTS auth."account" (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_auth_account_user_id ON auth."account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_account_provider ON auth."account"("providerId", "accountId");

-- Verification table - stores email verification tokens
CREATE TABLE IF NOT EXISTS auth."verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_verification_identifier ON auth."verification"(identifier);

-- Create roles for access control (if they don't exist)
DO $$
BEGIN
    -- Role for BetterAuth/Next.js - full access to auth schema
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_service') THEN
        CREATE ROLE auth_service;
    END IF;

    -- Role for Go backend - read-only access to auth.user for verification
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backend_service') THEN
        CREATE ROLE backend_service;
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO auth_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO auth_service;

-- Backend can read auth.user to verify user exists (optional)
GRANT USAGE ON SCHEMA auth TO backend_service;
GRANT SELECT ON auth."user" TO backend_service;
