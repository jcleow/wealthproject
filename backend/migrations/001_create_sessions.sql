-- Migration: Create session management tables
-- Version: 001
-- Description: Initial tables for chat sessions and conversation history

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for efficient querying
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at);
CREATE INDEX idx_chat_sessions_expires_at ON chat_sessions(expires_at);

-- Create conversation_history table
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for conversation history
CREATE INDEX idx_conversation_history_session_id ON conversation_history(session_id);
CREATE INDEX idx_conversation_history_created_at ON conversation_history(created_at);

-- Create tool_execution_log table for audit trail
CREATE TABLE IF NOT EXISTS tool_execution_log (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    call_id VARCHAR(255) NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    parameters JSONB,
    result JSONB,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for tool execution log
CREATE INDEX idx_tool_execution_log_session_id ON tool_execution_log(session_id);
CREATE INDEX idx_tool_execution_log_call_id ON tool_execution_log(call_id);
CREATE INDEX idx_tool_execution_log_created_at ON tool_execution_log(created_at);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session state and metadata';
COMMENT ON TABLE conversation_history IS 'Stores the full conversation history for each session';
COMMENT ON TABLE tool_execution_log IS 'Audit log for all tool executions';

COMMENT ON COLUMN chat_sessions.state IS 'JSONB containing session state including pending actions and entity references';
COMMENT ON COLUMN chat_sessions.expires_at IS 'Session expiration time for cleanup';
COMMENT ON COLUMN conversation_history.tool_calls IS 'JSONB array of tool calls made by the assistant';
COMMENT ON COLUMN tool_execution_log.parameters IS 'Input parameters for the tool execution';
COMMENT ON COLUMN tool_execution_log.result IS 'Output or result from the tool execution';