-- Drop app_auth schema and all its objects

-- Revoke permissions first
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_auth FROM auth_service;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_auth FROM auth_service;
REVOKE USAGE ON SCHEMA app_auth FROM auth_service;

REVOKE SELECT ON app_auth."user" FROM backend_service;
REVOKE USAGE ON SCHEMA app_auth FROM backend_service;

-- Drop tables
DROP TABLE IF EXISTS app_auth."verification";
DROP TABLE IF EXISTS app_auth."account";
DROP TABLE IF EXISTS app_auth."session";
DROP TABLE IF EXISTS app_auth."user";

-- Drop schema
DROP SCHEMA IF EXISTS app_auth;

-- Note: Not dropping roles as they may be in use elsewhere
-- DROP ROLE IF EXISTS auth_service;
-- DROP ROLE IF EXISTS backend_service;
