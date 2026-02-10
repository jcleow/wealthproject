CREATE TABLE insurance_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id varchar(36) NOT NULL,
    person_id uuid REFERENCES persons(id) ON DELETE SET NULL,
    name varchar(200) NOT NULL,
    category varchar(30) NOT NULL
        CHECK (category IN ('life','critical_illness','hospitalization','disability','accident','custom')),
    subcategory varchar(50),
    government_scheme varchar(30)
        CHECK (government_scheme IN ('medishield_life','careshield_life','eldershield','dps')),
    coverage_amount numeric(15,2) DEFAULT 0 NOT NULL,
    death_benefit numeric(15,2),
    critical_illness_benefit numeric(15,2),
    tpd_benefit numeric(15,2),
    daily_hospital_cash numeric(15,2),
    payout_amount numeric(15,2),
    payout_frequency varchar(20)
        CHECK (payout_frequency IN ('monthly','quarterly','annually','lump_sum')),
    premium_amount numeric(15,2) DEFAULT 0 NOT NULL,
    premium_frequency varchar(20) DEFAULT 'annually' NOT NULL
        CHECK (premium_frequency IN ('monthly','quarterly','annually')),
    start_date date NOT NULL,
    end_date date,
    renewal_date date,
    insurer_name varchar(200),
    policy_number varchar(100),
    linked_expense_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX idx_insurance_policies_user ON insurance_policies(user_id);
CREATE INDEX idx_insurance_policies_person ON insurance_policies(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX idx_insurance_policies_category ON insurance_policies(user_id, category);
