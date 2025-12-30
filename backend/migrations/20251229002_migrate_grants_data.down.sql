-- Add back the grants column
ALTER TABLE property_sg_details ADD COLUMN grants NUMERIC(15,4) NOT NULL DEFAULT 0;

-- Migrate back: sum all grants for each sg_details_id
UPDATE property_sg_details sd
SET grants = (
    SELECT COALESCE(SUM(amount), 0)
    FROM property_sg_grants g
    WHERE g.sg_details_id = sd.id
);

-- Delete all rows from property_sg_grants (they'll be re-created from the column on up)
DELETE FROM property_sg_grants;
