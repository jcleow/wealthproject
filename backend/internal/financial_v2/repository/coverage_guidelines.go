package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// coverageGuidelinesColumns is the SELECT column list for coverage guideline queries.
const coverageGuidelinesColumns = `
	cg.id, cg.user_id, cg.person_id, COALESCE(p.name, '') as person_name,
	cg.annual_income, cg.max_premium_percentage, cg.preset,
	cg.hosp_requires_isp_upgrade, cg.hosp_preferred_ward_class,
	cg.hosp_recommends_rider, cg.hosp_is_enabled, cg.hosp_notes,
	cg.life_tpd_income_multiplier, cg.life_tpd_is_required, cg.life_tpd_is_enabled, cg.life_tpd_notes,
	cg.ci_income_multiplier, cg.ci_is_required, cg.ci_is_enabled, cg.ci_notes,
	cg.pa_income_multiplier, cg.pa_is_required, cg.pa_is_enabled, cg.pa_notes,
	cg.questionnaire_answers, cg.created_at, cg.updated_at`

// scanCoverageGuidelines scans a row into a CoverageGuidelines struct.
func scanCoverageGuidelines(row pgx.Row) (*CoverageGuidelines, error) {
	var g CoverageGuidelines
	err := row.Scan(
		&g.ID, &g.UserID, &g.PersonID, &g.PersonName,
		&g.AnnualIncome, &g.MaxPremiumPercentage, &g.Preset,
		&g.HospRequiresIspUpgrade, &g.HospPreferredWardClass,
		&g.HospRecommendsRider, &g.HospIsEnabled, &g.HospNotes,
		&g.LifeTpdIncomeMultiplier, &g.LifeTpdIsRequired, &g.LifeTpdIsEnabled, &g.LifeTpdNotes,
		&g.CiIncomeMultiplier, &g.CiIsRequired, &g.CiIsEnabled, &g.CiNotes,
		&g.PaIncomeMultiplier, &g.PaIsRequired, &g.PaIsEnabled, &g.PaNotes,
		&g.QuestionnaireAnswers, &g.CreatedAt, &g.UpdatedAt,
	)
	return &g, err
}

// ListCoverageGuidelines retrieves all coverage guidelines for a user.
func (s *Store) ListCoverageGuidelines(ctx context.Context, userID string) ([]CoverageGuidelines, error) {
	query := `SELECT ` + coverageGuidelinesColumns + `
	FROM coverage_guidelines cg
	LEFT JOIN persons p ON cg.person_id = p.id
	WHERE cg.user_id = $1
	ORDER BY cg.created_at ASC`

	logQuery(query, []any{userID})

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list coverage guidelines: %w", err)
	}
	defer rows.Close()

	var guidelines []CoverageGuidelines
	for rows.Next() {
		var g CoverageGuidelines
		if err := rows.Scan(
			&g.ID, &g.UserID, &g.PersonID, &g.PersonName,
			&g.AnnualIncome, &g.MaxPremiumPercentage, &g.Preset,
			&g.HospRequiresIspUpgrade, &g.HospPreferredWardClass,
			&g.HospRecommendsRider, &g.HospIsEnabled, &g.HospNotes,
			&g.LifeTpdIncomeMultiplier, &g.LifeTpdIsRequired, &g.LifeTpdIsEnabled, &g.LifeTpdNotes,
			&g.CiIncomeMultiplier, &g.CiIsRequired, &g.CiIsEnabled, &g.CiNotes,
			&g.PaIncomeMultiplier, &g.PaIsRequired, &g.PaIsEnabled, &g.PaNotes,
			&g.QuestionnaireAnswers, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan coverage guidelines: %w", err)
		}
		guidelines = append(guidelines, g)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration error: %w", err)
	}

	return guidelines, nil
}

// GetCoverageGuidelines retrieves coverage guidelines for a specific person.
func (s *Store) GetCoverageGuidelines(ctx context.Context, userID, personID string) (*CoverageGuidelines, error) {
	query := `SELECT ` + coverageGuidelinesColumns + `
	FROM coverage_guidelines cg
	LEFT JOIN persons p ON cg.person_id = p.id
	WHERE cg.user_id = $1 AND cg.person_id = $2`

	logQuery(query, []any{userID, personID})

	g, err := scanCoverageGuidelines(s.pool.QueryRow(ctx, query, userID, personID))
	if err == pgx.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get coverage guidelines: %w", err)
	}

	return g, nil
}

// UpsertCoverageGuidelines creates or updates coverage guidelines for a person.
func (s *Store) UpsertCoverageGuidelines(ctx context.Context, userID string, g CoverageGuidelines) (*CoverageGuidelines, error) {
	query := `
	INSERT INTO coverage_guidelines (
		user_id, person_id, annual_income, max_premium_percentage, preset,
		hosp_requires_isp_upgrade, hosp_preferred_ward_class, hosp_recommends_rider,
		hosp_is_enabled, hosp_notes,
		life_tpd_income_multiplier, life_tpd_is_required, life_tpd_is_enabled, life_tpd_notes,
		ci_income_multiplier, ci_is_required, ci_is_enabled, ci_notes,
		pa_income_multiplier, pa_is_required, pa_is_enabled, pa_notes,
		questionnaire_answers
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
	ON CONFLICT (user_id, person_id) DO UPDATE SET
		annual_income = EXCLUDED.annual_income,
		max_premium_percentage = EXCLUDED.max_premium_percentage,
		preset = EXCLUDED.preset,
		hosp_requires_isp_upgrade = EXCLUDED.hosp_requires_isp_upgrade,
		hosp_preferred_ward_class = EXCLUDED.hosp_preferred_ward_class,
		hosp_recommends_rider = EXCLUDED.hosp_recommends_rider,
		hosp_is_enabled = EXCLUDED.hosp_is_enabled,
		hosp_notes = EXCLUDED.hosp_notes,
		life_tpd_income_multiplier = EXCLUDED.life_tpd_income_multiplier,
		life_tpd_is_required = EXCLUDED.life_tpd_is_required,
		life_tpd_is_enabled = EXCLUDED.life_tpd_is_enabled,
		life_tpd_notes = EXCLUDED.life_tpd_notes,
		ci_income_multiplier = EXCLUDED.ci_income_multiplier,
		ci_is_required = EXCLUDED.ci_is_required,
		ci_is_enabled = EXCLUDED.ci_is_enabled,
		ci_notes = EXCLUDED.ci_notes,
		pa_income_multiplier = EXCLUDED.pa_income_multiplier,
		pa_is_required = EXCLUDED.pa_is_required,
		pa_is_enabled = EXCLUDED.pa_is_enabled,
		pa_notes = EXCLUDED.pa_notes,
		questionnaire_answers = EXCLUDED.questionnaire_answers,
		updated_at = NOW()
	RETURNING ` + `id, user_id, person_id, '',
		annual_income, max_premium_percentage, preset,
		hosp_requires_isp_upgrade, hosp_preferred_ward_class,
		hosp_recommends_rider, hosp_is_enabled, hosp_notes,
		life_tpd_income_multiplier, life_tpd_is_required, life_tpd_is_enabled, life_tpd_notes,
		ci_income_multiplier, ci_is_required, ci_is_enabled, ci_notes,
		pa_income_multiplier, pa_is_required, pa_is_enabled, pa_notes,
		questionnaire_answers, created_at, updated_at`

	// Default questionnaire_answers to empty JSON if nil
	questionnaireAnswers := g.QuestionnaireAnswers
	if questionnaireAnswers == nil {
		questionnaireAnswers = []byte("{}")
	}

	args := []any{
		userID, g.PersonID, g.AnnualIncome, g.MaxPremiumPercentage, g.Preset,
		g.HospRequiresIspUpgrade, g.HospPreferredWardClass, g.HospRecommendsRider,
		g.HospIsEnabled, g.HospNotes,
		g.LifeTpdIncomeMultiplier, g.LifeTpdIsRequired, g.LifeTpdIsEnabled, g.LifeTpdNotes,
		g.CiIncomeMultiplier, g.CiIsRequired, g.CiIsEnabled, g.CiNotes,
		g.PaIncomeMultiplier, g.PaIsRequired, g.PaIsEnabled, g.PaNotes,
		questionnaireAnswers,
	}

	logQuery(query, args)

	result, err := scanCoverageGuidelines(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		return nil, fmt.Errorf("failed to upsert coverage guidelines: %w", err)
	}

	return result, nil
}

// DeleteCoverageGuidelines deletes coverage guidelines for a specific person.
func (s *Store) DeleteCoverageGuidelines(ctx context.Context, userID, personID string) error {
	query := `DELETE FROM coverage_guidelines WHERE user_id = $1 AND person_id = $2`
	logQuery(query, []any{userID, personID})

	result, err := s.pool.Exec(ctx, query, userID, personID)
	if err != nil {
		return fmt.Errorf("failed to delete coverage guidelines: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
