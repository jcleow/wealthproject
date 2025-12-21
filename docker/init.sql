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

