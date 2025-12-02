-- Rollback: Drop LLM usage log table
DROP INDEX IF EXISTS idx_llm_usage_user_date;
DROP INDEX IF EXISTS idx_llm_usage_created_at;
DROP INDEX IF EXISTS idx_llm_usage_session_id;
DROP INDEX IF EXISTS idx_llm_usage_user_id;
DROP TABLE IF EXISTS llm_usage_log;
