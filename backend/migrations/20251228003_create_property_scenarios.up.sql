-- Create property_scenarios header table (one per user scenario)
CREATE TABLE property_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,

    sg_details_id UUID REFERENCES property_sg_details(id) ON DELETE CASCADE,
    my_details_id UUID,  -- Future: REFERENCES property_my_details(id)

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_one_country_detail CHECK (
        (sg_details_id IS NOT NULL AND my_details_id IS NULL)
        OR (my_details_id IS NOT NULL AND sg_details_id IS NULL)
    )
);

CREATE INDEX idx_property_scenarios_user ON property_scenarios(user_id);
