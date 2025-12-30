-- Create property_sg_grants table for multiple HDB grants per property
CREATE TABLE property_sg_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sg_details_id UUID NOT NULL REFERENCES property_sg_details(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,        -- Free text: "EHG", "Family Grant", "PHG", etc.
    amount NUMERIC(15,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_sg_grants_sg_details ON property_sg_grants(sg_details_id);
