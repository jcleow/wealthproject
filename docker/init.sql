-- Initial database setup for financial chat system
-- This file runs automatically when the PostgreSQL container starts

-- Ensure database exists
CREATE DATABASE financial_chat;

-- Connect to the financial_chat database
\c financial_chat;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic tables for session management (B8 ticket)
-- These will be properly created by migrations later

-- Placeholder table for development
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'healthy',
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('Database initialized successfully');

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE financial_chat TO financial_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO financial_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO financial_user;