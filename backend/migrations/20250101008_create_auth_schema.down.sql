-- Drop auth schema and all its objects

-- Revoke permissions first
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth FROM auth_service;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth FROM auth_service;
REVOKE USAGE ON SCHEMA auth FROM auth_service;

REVOKE SELECT ON auth."user" FROM backend_service;
REVOKE USAGE ON SCHEMA auth FROM backend_service;

-- Drop tables
DROP TABLE IF EXISTS auth."verification";
DROP TABLE IF EXISTS auth."account";
DROP TABLE IF EXISTS auth."session";
DROP TABLE IF EXISTS auth."user";

-- Drop schema
DROP SCHEMA IF EXISTS auth;

-- Note: Not dropping roles as they may be in use elsewhere
-- DROP ROLE IF EXISTS auth_service;
-- DROP ROLE IF EXISTS backend_service;
