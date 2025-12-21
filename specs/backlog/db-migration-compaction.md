# Database Migration Compaction

## Background: Why Migrations Accumulate

During active development, database schemas evolve frequently:

```
Day 1: CREATE TABLE assets (id, name, value)
Day 2: ALTER TABLE assets ADD COLUMN category
Day 3: ALTER TABLE assets ALTER COLUMN value TYPE decimal
Day 5: ALTER TABLE assets ADD COLUMN user_id
Day 7: CREATE INDEX idx_assets_user_id
...
```

Each change creates a new migration file. Over time, this leads to:
- 63+ migration files (and growing)
- Slow migration runs on fresh databases
- Hard to understand the "current" schema
- Merge conflicts when multiple developers add migrations

## Current State

```bash
$ ls backend/migrations/*.up.sql | wc -l
63
```

Migration files span from November 2024 to present, with many small incremental changes like:
- `add_column_x.up.sql`
- `alter_constraint_y.up.sql`
- `change_type_z.up.sql`

## Solution: Migration Squashing

Combine multiple migrations into a single "baseline" migration that represents the final schema state.

### Before

```
20241121003_financial_tables.up.sql          -- CREATE TABLE assets
20250101010_change_user_id_to_varchar.up.sql -- ALTER COLUMN user_id
20250101013_drop_growth_configs.up.sql       -- DROP TABLE, ADD COLUMN
20250101019_require_target_id.up.sql         -- ALTER CONSTRAINT
... (20 more migrations touching assets)
```

### After

```
20250101000_baseline_financial_tables.up.sql  -- Final CREATE TABLE with all columns
20251220001_recent_change.up.sql              -- Only migrations after baseline
```

## Implementation Strategy

### Step 1: Identify the Cutoff Point

Choose a date/version where all environments (dev, staging, prod) have applied migrations up to that point. Migrations before this can be squashed.

```
Migrations 001-050: Applied everywhere → Can squash
Migrations 051-063: Only in dev → Keep separate
```

### Step 2: Generate Current Schema

Use `pg_dump` to get the current schema state:

```bash
pg_dump --schema-only --no-owner --no-privileges \
  -h localhost -U postgres financial_db > current_schema.sql
```

### Step 3: Create Baseline Migration

Create a new migration that recreates the entire schema:

```sql
-- 20250101000_baseline.up.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  ...
);

-- Financial tables
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES "user"(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  current_value DECIMAL(20,2),
  ...
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);

-- ... all other tables
```

### Step 4: Create Down Migration

```sql
-- 20250101000_baseline.down.sql
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS liabilities CASCADE;
-- ... all tables in reverse dependency order
```

### Step 5: Update Migration History

For existing databases, insert a record showing the baseline has been "applied":

```sql
-- Run on existing databases
INSERT INTO schema_migrations (version, dirty)
VALUES ('20250101000', false)
ON CONFLICT DO NOTHING;
```

### Step 6: Archive Old Migrations

Move old migrations to an archive folder (don't delete - useful for reference):

```bash
mkdir -p backend/migrations/archive/pre-baseline
mv backend/migrations/2024*.sql backend/migrations/archive/pre-baseline/
mv backend/migrations/20250101001*.sql backend/migrations/archive/pre-baseline/
# ... etc
```

## Table Groups to Consolidate

### 1. Auth Tables
- `user`
- `session`
- `account`
- `verification`

### 2. Financial Core Tables
- `assets`
- `liabilities`
- `incomes`
- `expenses`
- `cash_accounts`
- `investments`

### 3. Scenario Tables
- `scenario_events`
- `scenario_event_impacts`

### 4. Timeline Tables
- `financial_timeline`
- `timeline_overrides`

### 5. Settings & Misc
- `user_settings`
- `growth_configs`
- `llm_usage_log`
- `tool_execution_log`

## Risks & Mitigations

### Risk: Breaking Existing Databases

**Mitigation:**
- Only squash migrations that have been applied to ALL environments
- Test on a copy of production data first
- Keep archived migrations for rollback reference

### Risk: Losing Migration History

**Mitigation:**
- Archive old files, don't delete
- Document the squash in a commit message
- Update `schema_migrations` table appropriately

### Risk: Merge Conflicts During Squash

**Mitigation:**
- Do this during a quiet period (no active feature branches with migrations)
- Communicate with team before starting
- Complete in a single session

## Verification Steps

After squashing:

1. **Fresh database test:**
   ```bash
   dropdb financial_test && createdb financial_test
   migrate -path migrations -database "postgres://..." up
   ```

2. **Compare schemas:**
   ```bash
   pg_dump --schema-only old_db > old_schema.sql
   pg_dump --schema-only new_db > new_schema.sql
   diff old_schema.sql new_schema.sql  # Should be empty
   ```

3. **Run all tests:**
   ```bash
   go test ./...
   ```

## Ongoing Maintenance

After compaction, establish guidelines:

1. **Quarterly compaction:** Squash migrations every 3 months
2. **Logical grouping:** Keep related changes in single migrations
3. **Descriptive names:** `create_investments_table.sql` not `migration_042.sql`
4. **Always include down:** Every `.up.sql` needs a `.down.sql`

## Commands Reference

```bash
# List all migrations
ls backend/migrations/*.up.sql | wc -l

# Show migration status
migrate -path backend/migrations -database $DATABASE_URL version

# Apply all migrations
migrate -path backend/migrations -database $DATABASE_URL up

# Rollback last migration
migrate -path backend/migrations -database $DATABASE_URL down 1

# Force set version (use carefully)
migrate -path backend/migrations -database $DATABASE_URL force VERSION
```

## Timeline

1. **Prep (30 mins):** Identify cutoff, backup databases
2. **Generate baseline (1 hour):** Create consolidated schema
3. **Test (30 mins):** Verify on test database
4. **Apply (30 mins):** Update all environments
5. **Cleanup (30 mins):** Archive old files, update docs
