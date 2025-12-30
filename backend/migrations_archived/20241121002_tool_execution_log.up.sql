-- Migration: Create tool execution log
CREATE TABLE IF NOT EXISTS tool_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_tool_execution_log_session_id ON tool_execution_log(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_execution_log_call_id ON tool_execution_log(call_id);
CREATE INDEX IF NOT EXISTS idx_tool_execution_log_created_at ON tool_execution_log(created_at);
