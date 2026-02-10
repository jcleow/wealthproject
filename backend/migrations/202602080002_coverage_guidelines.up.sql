CREATE TABLE coverage_guidelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id varchar(36) NOT NULL,
    person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    annual_income numeric(15,2) DEFAULT 60000 NOT NULL,
    max_premium_percentage numeric(6,4) DEFAULT 0.10 NOT NULL,
    preset varchar(20) DEFAULT 'standard' NOT NULL
        CHECK (preset IN ('lean','standard','comprehensive','custom')),
    hosp_requires_isp_upgrade boolean DEFAULT true NOT NULL,
    hosp_preferred_ward_class varchar(10) DEFAULT 'B1' NOT NULL
        CHECK (hosp_preferred_ward_class IN ('A','B1','B2_plus','C')),
    hosp_recommends_rider boolean DEFAULT true NOT NULL,
    hosp_is_enabled boolean DEFAULT true NOT NULL,
    hosp_notes text,
    life_tpd_income_multiplier numeric(6,2) DEFAULT 10 NOT NULL,
    life_tpd_is_required boolean DEFAULT true NOT NULL,
    life_tpd_is_enabled boolean DEFAULT true NOT NULL,
    life_tpd_notes text,
    ci_income_multiplier numeric(6,2) DEFAULT 5 NOT NULL,
    ci_is_required boolean DEFAULT true NOT NULL,
    ci_is_enabled boolean DEFAULT true NOT NULL,
    ci_notes text,
    pa_income_multiplier numeric(6,2) DEFAULT 5 NOT NULL,
    pa_is_required boolean DEFAULT true NOT NULL,
    pa_is_enabled boolean DEFAULT true NOT NULL,
    pa_notes text,
    questionnaire_answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, person_id)
);
CREATE INDEX idx_coverage_guidelines_user ON coverage_guidelines(user_id);
CREATE INDEX idx_coverage_guidelines_person ON coverage_guidelines(person_id);
