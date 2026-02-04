-- Add relationship column to persons table for household role identification
-- Used by insurance coverage guidelines to determine spouse vs dependent vs self

ALTER TABLE persons
ADD COLUMN relationship VARCHAR(20) DEFAULT 'self' NOT NULL
CHECK (relationship IN ('self', 'spouse', 'child', 'parent', 'sibling', 'other'));

COMMENT ON COLUMN persons.relationship IS 'Relationship to primary household member (self/spouse/child/parent/sibling/other)';
