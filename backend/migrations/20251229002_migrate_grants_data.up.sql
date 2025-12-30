-- Migrate existing grants data to new property_sg_grants table
-- For each property with grants > 0, create a grant row with name "HDB Grant"
INSERT INTO property_sg_grants (sg_details_id, name, amount, created_at)
SELECT id, 'HDB Grant', grants, NOW()
FROM property_sg_details
WHERE grants > 0;

-- Drop the old grants column from property_sg_details
ALTER TABLE property_sg_details DROP COLUMN grants;
