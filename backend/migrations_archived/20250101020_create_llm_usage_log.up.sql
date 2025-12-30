-- Migration: Create LLM usage log for token tracking and cost estimation
CREATE TABLE IF NOT EXISTS llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE SET NULL,
    request_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,

    -- Token counts (from Gemini UsageMetadata)
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    thoughts_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    -- Cost tracking (USD)
    input_cost_usd DECIMAL(12, 10) DEFAULT 0,
    output_cost_usd DECIMAL(12, 10) DEFAULT 0,
    total_cost_usd DECIMAL(12, 10) DEFAULT 0,

    -- Metadata
    processing_time_ms INTEGER,
    tool_calls_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON llm_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_session_id ON llm_usage_log(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON llm_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_date ON llm_usage_log(user_id, created_at);
