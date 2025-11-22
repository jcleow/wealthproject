-- Initial database setup for financial chat system
-- This file runs automatically when the PostgreSQL container starts

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Placeholder table for development; real tables are created by migrations
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'healthy',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('Database initialized successfully');

-- Grant necessary permissions (idempotent when rerun)
GRANT ALL PRIVILEGES ON DATABASE financial_chat TO financial_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO financial_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO financial_user;
