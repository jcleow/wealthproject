-- Revert session-related tables to timestamp without timezone

ALTER TABLE chat_sessions
  ALTER COLUMN created_at TYPE TIMESTAMP USING (created_at AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at TYPE TIMESTAMP USING (updated_at AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE conversation_history
  ALTER COLUMN created_at TYPE TIMESTAMP USING (created_at AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE tool_execution_log
  ALTER COLUMN created_at TYPE TIMESTAMP USING (created_at AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at SET DEFAULT NOW();
