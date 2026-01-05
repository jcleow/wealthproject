-- Rollback Fund Flow Rules table

DROP INDEX IF EXISTS idx_fund_flow_rules_property;
DROP INDEX IF EXISTS idx_fund_flow_rules_liability;
DROP INDEX IF EXISTS idx_fund_flow_rules_income;
DROP INDEX IF EXISTS idx_fund_flow_rules_dates;
DROP INDEX IF EXISTS idx_fund_flow_rules_type;
DROP INDEX IF EXISTS idx_fund_flow_rules_user;

DROP TABLE IF EXISTS fund_flow_rules;
