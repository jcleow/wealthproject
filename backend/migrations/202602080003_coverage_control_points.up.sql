CREATE TABLE coverage_control_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id varchar(36) NOT NULL,
    person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    age integer NOT NULL CHECK (age >= 0 AND age <= 120),
    life_tpd numeric(15,2),
    critical_illness numeric(15,2),
    personal_accident numeric(15,2),
    reason text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, person_id, age)
);
CREATE INDEX idx_coverage_control_points_user ON coverage_control_points(user_id);
CREATE INDEX idx_coverage_control_points_person ON coverage_control_points(person_id);
