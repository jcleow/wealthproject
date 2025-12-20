package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/scenario"

	"github.com/jackc/pgx/v5"
)

// Type aliases for scenario types - allows repository to use scenario types
// while maintaining backward compatibility with existing code using repo.ScenarioEvent etc.
type (
	ScenarioEvent   = scenario.Event
	ScenarioImpact  = scenario.Impact
	ScenarioFilters = scenario.Filters
	ExcludedTargets = scenario.ExcludedTargets
)

// ErrScenarioNotFound is an alias for scenario.ErrNotFound
var ErrScenarioNotFound = scenario.ErrNotFound

// CreateScenarioEvent inserts a scenario event and its impacts using typed FK columns.
func (s *Store) CreateScenarioEventV2(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback(ctx)

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRow(ctx, `
		INSERT INTO scenario_events (user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.UserID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded)

	var created ScenarioEvent
	var tagsBytes []byte
	if err := row.Scan(&created.ID, &created.UserID, &created.Name, &created.Description, &created.OccursOn, &created.DisplayIcon, &created.DisplayColor, &tagsBytes, &created.ScenarioID, &created.IsIncluded, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return ScenarioEvent{}, err
	}
	created.Tags = decodeStringArray(tagsBytes)

	// For 'start' impacts, update the linked financial item's amount and frequency
	for _, imp := range ev.Impacts {
		if imp.ImpactKind == scenario.ImpactKindStart {
			if err := s.updateStartImpactTarget(ctx, tx, &imp); err != nil {
				return ScenarioEvent{}, fmt.Errorf("failed to update start impact target: %w", err)
			}
		}
	}

	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, ev.UserID, created.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}

	if len(ev.Impacts) > 0 {
		created.Impacts, _ = s.ListScenarioImpactsV2(ctx, created.UserID, created.ID)
	}
	return created, nil
}

// GetScenarioEventV2 fetches a scenario by ID for a user with typed FK impacts.
func (s *Store) GetScenarioEventV2(ctx context.Context, userID, eventID string) (ScenarioEvent, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE id = $1 AND user_id = $2`, eventID, userID)
	var ev ScenarioEvent
	var tagsJSON []byte
	if err := row.Scan(&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScenarioEvent{}, ErrScenarioNotFound
		}
		return ScenarioEvent{}, err
	}
	ev.Tags = decodeStringArray(tagsJSON)
	ev.Impacts, _ = s.ListScenarioImpactsV2(ctx, userID, ev.ID)
	return ev, nil
}

// ListScenarioEventsV2 returns paginated events for a user with typed FK impacts.
// Uses a single JOIN query to fetch events and impacts together (eliminates N+1).
func (s *Store) ListScenarioEventsV2(ctx context.Context, userID string, filters ScenarioFilters) ([]ScenarioEvent, int, error) {
	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	where := []string{"user_id = $1"}
	args := []any{userID}

	if filters.IncludedOnly != nil {
		where = append(where, fmt.Sprintf("is_included = $%d", len(args)+1))
		args = append(args, *filters.IncludedOnly)
	}
	if filters.Year != nil {
		where = append(where, fmt.Sprintf("EXTRACT(YEAR FROM occurs_on) = $%d", len(args)+1))
		args = append(args, *filters.Year)
	}
	if len(filters.Tags) > 0 {
		where = append(where, fmt.Sprintf("tags ?| $%d", len(args)+1))
		args = append(args, filters.Tags)
	}
	if strings.TrimSpace(filters.Search) != "" {
		where = append(where, fmt.Sprintf("to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('simple', $%d)", len(args)+1))
		args = append(args, strings.TrimSpace(filters.Search))
	}

	whereClause := strings.Join(where, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM scenario_events WHERE %s`, whereClause)
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Single JOIN query using CTE: paginate events first, then join impacts and target tables for derived values
	query := fmt.Sprintf(`
		WITH paginated_events AS (
			SELECT * FROM scenario_events
			WHERE %s
			ORDER BY occurs_on ASC, created_at DESC
			LIMIT $%d OFFSET $%d
		)
		SELECT
			e.id, e.user_id, e.name, e.description, e.occurs_on, e.display_icon, e.display_color, e.tags, e.scenario_id, e.is_included, e.created_at, e.updated_at,
			i.id, i.impact_kind, i.amount, i.cadence, i.created_at,
			i.target_asset_id, i.target_liability_id, i.target_income_id, i.target_expense_id, i.target_cash_account_id, i.target_investment_id,
			-- Derived from financial item
			COALESCE(a.name, l.name, inc.name, exp.name, ca.name, inv.name, '') as target_name,
			'SGD' as target_currency,
			COALESCE(inc.frequency, exp.frequency, '') as target_frequency,
			COALESCE(a.start_date, l.start_date, inc.start_date, exp.start_date, ca.start_date, inv.start_date) as target_start_date,
			COALESCE(a.end_date, l.end_date, inc.end_date, exp.end_date, ca.end_date, inv.end_date) as target_end_date,
			COALESCE(a.notes, l.notes, inc.notes, exp.notes, ca.notes, inv.notes, '') as target_notes,
			-- Advanced fields from financial item (ca uses account_type instead of category)
			COALESCE(a.category, l.category, inc.category, exp.category, ca.account_type, inv.category, '') as target_category,
			COALESCE(a.growth_rate, inv.growth_rate, inc.growth_rate, exp.growth_rate) as target_growth_rate,
			COALESCE(inc.growth_strategy, exp.growth_strategy, '') as target_growth_strategy
		FROM paginated_events e
		LEFT JOIN scenario_event_impacts i ON i.event_id = e.id
		LEFT JOIN finance_assets a ON i.target_asset_id = a.id
		LEFT JOIN finance_liabilities l ON i.target_liability_id = l.id
		LEFT JOIN finance_incomes inc ON i.target_income_id = inc.id
		LEFT JOIN finance_expenses exp ON i.target_expense_id = exp.id
		LEFT JOIN finance_cash_accounts ca ON i.target_cash_account_id = ca.id
		LEFT JOIN finance_investments inv ON i.target_investment_id = inv.id
		ORDER BY e.occurs_on ASC, e.created_at DESC, i.created_at ASC`,
		whereClause, len(args)+1, len(args)+2)

	rows, err := s.pool.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	// Group results by event ID preserving order
	eventMap := make(map[string]*ScenarioEvent)
	var eventOrder []string

	for rows.Next() {
		var ev ScenarioEvent
		var tagsJSON []byte

		// Impact fields (nullable due to LEFT JOIN)
		var impID, impKind, impCadence *string
		var impAmount *int64
		var impCreatedAt, targetStartDate, targetEndDate *time.Time
		var targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID *string
		var targetName, targetCurrency, targetFrequency, targetNotes *string // Derived from joined target tables
		var targetCategory, targetGrowthStrategy *string
		var targetGrowthRate *float64

		if err := rows.Scan(
			&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt,
			&impID, &impKind, &impAmount, &impCadence, &impCreatedAt,
			&targetAssetID, &targetLiabilityID, &targetIncomeID, &targetExpenseID, &targetCashAccountID, &targetInvestmentID,
			&targetName, &targetCurrency, &targetFrequency, &targetStartDate, &targetEndDate, &targetNotes,
			&targetCategory, &targetGrowthRate, &targetGrowthStrategy,
		); err != nil {
			return nil, 0, err
		}

		// Get or create event entry
		existing, seen := eventMap[ev.ID]
		if !seen {
			ev.Tags = decodeStringArray(tagsJSON)
			ev.Impacts = []ScenarioImpact{}
			eventMap[ev.ID] = &ev
			eventOrder = append(eventOrder, ev.ID)
			existing = &ev
		}

		// Add impact if present (LEFT JOIN may produce NULL impact rows)
		if impID != nil {
			existing.Impacts = append(existing.Impacts, scanImpactPgx(
				ev.ID, impID, impKind, impAmount, impCadence, impCreatedAt,
				targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID,
				targetName, targetCurrency, targetFrequency, targetStartDate, targetEndDate, targetNotes,
				targetCategory, targetGrowthRate, targetGrowthStrategy,
			))
		}
	}

	// Build result slice preserving order
	events := make([]ScenarioEvent, 0, len(eventOrder))
	for _, id := range eventOrder {
		events = append(events, *eventMap[id])
	}

	return events, total, nil
}

// UpdateScenarioEventV2 replaces metadata and impacts using typed FK columns.
// For 'start' impacts, also updates the linked financial item's amount and frequency.
func (s *Store) UpdateScenarioEventV2(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback(ctx)

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRow(ctx, `
		UPDATE scenario_events
		SET name=$2, description=$3, occurs_on=$4, display_icon=$5, display_color=$6, tags=$7, scenario_id=$8, is_included=$9, updated_at=NOW()
		WHERE id=$1 AND user_id=$10
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.ID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded, ev.UserID)
	var updated ScenarioEvent
	var tagsBytes []byte
	if err := row.Scan(&updated.ID, &updated.UserID, &updated.Name, &updated.Description, &updated.OccursOn, &updated.DisplayIcon, &updated.DisplayColor, &tagsBytes, &updated.ScenarioID, &updated.IsIncluded, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ScenarioEvent{}, ErrScenarioNotFound
		}
		return ScenarioEvent{}, err
	}
	updated.Tags = decodeStringArray(tagsBytes)

	// For 'start' impacts, update the linked financial item's amount and frequency
	for _, imp := range ev.Impacts {
		if imp.ImpactKind == scenario.ImpactKindStart {
			if err := s.updateStartImpactTarget(ctx, tx, &imp); err != nil {
				return ScenarioEvent{}, fmt.Errorf("failed to update start impact target: %w", err)
			}
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM scenario_event_impacts WHERE event_id=$1`, ev.ID); err != nil {
		return ScenarioEvent{}, err
	}
	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, ev.UserID, ev.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}
	updated.Impacts, _ = s.ListScenarioImpactsV2(ctx, updated.UserID, updated.ID)
	return updated, nil
}

// updateStartImpactTarget updates the linked financial item for a 'start' impact.
// This syncs the amount, frequency, category, growth_rate, and growth_strategy
// from the impact to the actual financial record.
func (s *Store) updateStartImpactTarget(ctx context.Context, tx pgx.Tx, imp *ScenarioImpact) error {
	// Determine frequency string for income/expense tables
	freq := string(imp.Cadence)
	if freq == "" {
		freq = "monthly"
	}

	// Get category (use empty string if not set)
	category := imp.Category

	// Get growth strategy - map frontend values to DB values
	// Frontend: none, annual_step, compound → DB: fixed, annual_step, compound_monthly
	growthStrategy := imp.GrowthStrategy
	switch growthStrategy {
	case "none", "":
		growthStrategy = "fixed"
	case "compound":
		growthStrategy = "compound_monthly"
	// annual_step stays as is
	}

	// Debug log
	fmt.Printf("[updateStartImpactTarget] Amount=%d Cadence=%q freq=%q category=%q growthRate=%v growthStrategy=%q\n",
		imp.Amount, imp.Cadence, freq, category, imp.GrowthRate, growthStrategy)

	if imp.TargetAssetID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_assets SET current_value = $1, category = COALESCE(NULLIF($2, ''), category), growth_rate = COALESCE($3, growth_rate), updated_at = NOW() WHERE id = $4`,
			imp.Amount, category, imp.GrowthRate, *imp.TargetAssetID)
		return err
	}
	if imp.TargetLiabilityID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_liabilities SET
				current_balance = $1,
				category = COALESCE(NULLIF($2, ''), category),
				interest_rate_apr = COALESCE($3, interest_rate_apr),
				minimum_payment = COALESCE($4, minimum_payment),
				updated_at = NOW()
			WHERE id = $5`,
			imp.Amount, category, imp.InterestRate, imp.MinimumPayment, *imp.TargetLiabilityID)
		return err
	}
	if imp.TargetIncomeID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_incomes SET amount = $1, frequency = $2, category = COALESCE(NULLIF($3, ''), category), growth_rate = COALESCE($4, growth_rate), growth_strategy = COALESCE(NULLIF($5, ''), growth_strategy), updated_at = NOW() WHERE id = $6`,
			imp.Amount, freq, category, imp.GrowthRate, growthStrategy, *imp.TargetIncomeID)
		return err
	}
	if imp.TargetExpenseID != nil {
		_, err := tx.Exec(ctx, `
			UPDATE finance_expenses SET amount = $1, frequency = $2, category = COALESCE(NULLIF($3, ''), category), growth_rate = COALESCE($4, growth_rate), growth_strategy = COALESCE(NULLIF($5, ''), growth_strategy), updated_at = NOW() WHERE id = $6`,
			imp.Amount, freq, category, imp.GrowthRate, growthStrategy, *imp.TargetExpenseID)
		return err
	}
	if imp.TargetCashAccountID != nil {
		// Cash accounts use account_type instead of category
		_, err := tx.Exec(ctx, `
			UPDATE finance_cash_accounts SET balance = $1, account_type = COALESCE(NULLIF($2, ''), account_type), updated_at = NOW() WHERE id = $3`,
			imp.Amount, category, *imp.TargetCashAccountID)
		return err
	}
	if imp.TargetInvestmentID != nil {
		// Investments use growth_rate (not annual_growth_rate)
		_, err := tx.Exec(ctx, `
			UPDATE finance_investments SET current_value = $1, category = COALESCE(NULLIF($2, ''), category), growth_rate = COALESCE($3, growth_rate), updated_at = NOW() WHERE id = $4`,
			imp.Amount, category, imp.GrowthRate, *imp.TargetInvestmentID)
		return err
	}
	return nil
}

// DeleteScenarioEventV2 removes an event for a user.
func (s *Store) DeleteScenarioEventV2(ctx context.Context, userID, eventID string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM scenario_events WHERE id=$1 AND user_id=$2`, eventID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrScenarioNotFound
	}
	return nil
}

// ToggleScenarioIncludedV2 updates inclusion flag.
func (s *Store) ToggleScenarioIncludedV2(ctx context.Context, userID, eventID string, included bool) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE scenario_events
		SET is_included=$3, updated_at=NOW()
		WHERE id=$1 AND user_id=$2`, eventID, userID, included)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrScenarioNotFound
	}
	return nil
}

// ListScenarioImpactsV2 lists impacts for an event using typed FK columns.
// Joins with target tables to derive name, currency, frequency, dates, and notes from the linked financial item.
// Requires userID for defense-in-depth ownership verification.
func (s *Store) ListScenarioImpactsV2(ctx context.Context, userID, eventID string) ([]ScenarioImpact, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT
			sei.id, sei.event_id, sei.impact_kind, sei.amount, sei.cadence, sei.created_at,
			sei.target_asset_id, sei.target_liability_id, sei.target_income_id,
			sei.target_expense_id, sei.target_cash_account_id, sei.target_investment_id,
			-- Derived from financial item
			COALESCE(a.name, l.name, inc.name, exp.name, ca.name, inv.name, '') as target_name,
			'SGD' as target_currency,
			COALESCE(inc.frequency, exp.frequency, '') as target_frequency,
			COALESCE(a.start_date, l.start_date, inc.start_date, exp.start_date, ca.start_date, inv.start_date) as target_start_date,
			COALESCE(a.end_date, l.end_date, inc.end_date, exp.end_date, ca.end_date, inv.end_date) as target_end_date,
			COALESCE(a.notes, l.notes, inc.notes, exp.notes, ca.notes, inv.notes, '') as target_notes,
			-- Advanced fields from financial item (ca uses account_type instead of category)
			COALESCE(a.category, l.category, inc.category, exp.category, ca.account_type, inv.category, '') as target_category,
			COALESCE(a.growth_rate, inv.growth_rate, inc.growth_rate, exp.growth_rate) as target_growth_rate,
			COALESCE(inc.growth_strategy, exp.growth_strategy, '') as target_growth_strategy,
			-- Liability-specific fields
			l.interest_rate_apr as target_interest_rate,
			l.minimum_payment as target_min_payment
		FROM scenario_event_impacts sei
		JOIN scenario_events ev ON sei.event_id = ev.id
		LEFT JOIN finance_assets a ON sei.target_asset_id = a.id
		LEFT JOIN finance_liabilities l ON sei.target_liability_id = l.id
		LEFT JOIN finance_incomes inc ON sei.target_income_id = inc.id
		LEFT JOIN finance_expenses exp ON sei.target_expense_id = exp.id
		LEFT JOIN finance_cash_accounts ca ON sei.target_cash_account_id = ca.id
		LEFT JOIN finance_investments inv ON sei.target_investment_id = inv.id
		WHERE sei.event_id = $1 AND ev.user_id = $2
		ORDER BY sei.created_at ASC`, eventID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var impacts []ScenarioImpact
	for rows.Next() {
		var imp ScenarioImpact
		// Temporary variables for decimal scan
		var interestRateAPR, minPayment *decimal.Decimal
		// pgx scans NULL directly into pointer fields
		if err := rows.Scan(
			&imp.ID, &imp.EventID, &imp.ImpactKind, &imp.Amount, &imp.Cadence, &imp.CreatedAt,
			&imp.TargetAssetID, &imp.TargetLiabilityID, &imp.TargetIncomeID, &imp.TargetExpenseID, &imp.TargetCashAccountID, &imp.TargetInvestmentID,
			&imp.Name, &imp.Currency, &imp.Frequency, &imp.StartDate, &imp.EndDate, &imp.Notes,
			&imp.Category, &imp.GrowthRate, &imp.GrowthStrategy,
			&interestRateAPR, &minPayment,
		); err != nil {
			return nil, err
		}
		// Convert decimal to float64/int64
		if interestRateAPR != nil {
			val := interestRateAPR.ToFloat64()
			imp.InterestRate = &val
		}
		if minPayment != nil {
			// minimum_payment is stored as decimal, convert to int64
			val := int64(minPayment.ToFloat64())
			imp.MinimumPayment = &val
		}

		impacts = append(impacts, imp)
	}
	if impacts == nil {
		impacts = []ScenarioImpact{}
	}
	return impacts, rows.Err()
}

// insertImpactsV2 inserts impacts using typed FK columns.
// All impacts (including start) must have a pre-existing targetId - no auto-creation.
// Stores: event_id, impact_kind, amount, cadence, and target FK columns.
// Other values (name, currency, frequency, dates, notes) are derived from the linked financial item.
func (s *Store) insertImpactsV2(ctx context.Context, tx pgx.Tx, _ string, eventID string, impacts []ScenarioImpact) error {
	for i := range impacts {
		imp := &impacts[i]

		targetID := imp.TargetID()
		targetType := imp.TargetType()

		// All impacts must have a valid target (pre-created by frontend)
		if targetID == nil || strings.TrimSpace(*targetID) == "" || !scenario.IsValidTargetType(targetType) {
			return scenario.ErrInvalidTargetCount
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO scenario_event_impacts
			(event_id, impact_kind, amount, cadence,
			 target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			eventID, imp.ImpactKind, imp.Amount, imp.Cadence,
			imp.TargetAssetID, imp.TargetLiabilityID, imp.TargetIncomeID, imp.TargetExpenseID, imp.TargetCashAccountID, imp.TargetInvestmentID,
		); err != nil {
			return err
		}
	}
	return nil
}

// GetExcludedScenarioTargetIDs returns IDs of financial items created by excluded scenarios.
// These should be filtered out from timeline queries.
func (s *Store) GetExcludedScenarioTargetIDs(ctx context.Context, userID string) (ExcludedTargets, error) {
	query := `
		SELECT
			sei.target_asset_id,
			sei.target_liability_id,
			sei.target_income_id,
			sei.target_expense_id,
			sei.target_cash_account_id,
			sei.target_investment_id
		FROM scenario_event_impacts sei
		JOIN scenario_events se ON se.id = sei.event_id
		WHERE se.user_id = $1
		  AND se.is_included = false
		  AND sei.impact_kind = 'start'`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return ExcludedTargets{}, err
	}
	defer rows.Close()

	result := ExcludedTargets{
		AssetIDs:       make(map[string]struct{}),
		LiabilityIDs:   make(map[string]struct{}),
		IncomeIDs:      make(map[string]struct{}),
		ExpenseIDs:     make(map[string]struct{}),
		CashAccountIDs: make(map[string]struct{}),
		InvestmentIDs:  make(map[string]struct{}),
	}

	for rows.Next() {
		// pgx scans NULL directly into *string
		var assetID, liabilityID, incomeID, expenseID, cashAccountID, investmentID *string
		if err := rows.Scan(&assetID, &liabilityID, &incomeID, &expenseID, &cashAccountID, &investmentID); err != nil {
			return ExcludedTargets{}, err
		}
		if assetID != nil {
			result.AssetIDs[*assetID] = struct{}{}
		}
		if liabilityID != nil {
			result.LiabilityIDs[*liabilityID] = struct{}{}
		}
		if incomeID != nil {
			result.IncomeIDs[*incomeID] = struct{}{}
		}
		if expenseID != nil {
			result.ExpenseIDs[*expenseID] = struct{}{}
		}
		if cashAccountID != nil {
			result.CashAccountIDs[*cashAccountID] = struct{}{}
		}
		if investmentID != nil {
			result.InvestmentIDs[*investmentID] = struct{}{}
		}
	}

	return result, rows.Err()
}

// ListIncludedScenarioEvents returns all included (is_included=true) scenario events
// with their impacts for the given user. Used by timeline service for impact application.
func (s *Store) ListIncludedScenarioEvents(ctx context.Context, userID string) ([]ScenarioEvent, error) {
	included := true
	events, _, err := s.ListScenarioEventsV2(ctx, userID, ScenarioFilters{
		IncludedOnly: &included,
		Limit:        1000, // High limit to get all included scenarios
	})
	return events, err
}

func decodeStringArray(b []byte) []string {
	if len(b) == 0 {
		return []string{}
	}
	var arr []string
	_ = json.Unmarshal(b, &arr)
	if arr == nil {
		arr = []string{}
	}
	return arr
}

// scanImpactPgx constructs a ScenarioImpact from nullable pointer scan results (pgx style).
// Impact table stores: id, event_id, impact_kind, amount, cadence, created_at, and target FK columns.
// Other fields (name, currency, frequency, dates, notes, category, growth_rate, growth_strategy)
// are derived from the joined financial item tables.
func scanImpactPgx(
	eventID string,
	impID, impKind *string,
	impAmount *int64,
	impCadence *string,
	impCreatedAt *time.Time,
	targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID *string,
	// Derived from financial item
	targetName, targetCurrency, targetFrequency *string,
	targetStartDate, targetEndDate *time.Time, targetNotes *string,
	// Advanced fields from financial item
	targetCategory *string, targetGrowthRate *float64, targetGrowthStrategy *string,
) ScenarioImpact {
	imp := ScenarioImpact{
		EventID:             eventID,
		TargetAssetID:       targetAssetID,
		TargetLiabilityID:   targetLiabilityID,
		TargetIncomeID:      targetIncomeID,
		TargetExpenseID:     targetExpenseID,
		TargetCashAccountID: targetCashAccountID,
		TargetInvestmentID:  targetInvestmentID,
		EndDate:             targetEndDate,
		GrowthRate:          targetGrowthRate,
	}
	if impID != nil {
		imp.ID = *impID
	}
	if impKind != nil {
		imp.ImpactKind = *impKind
	}
	if impAmount != nil {
		imp.Amount = *impAmount
	}
	if impCadence != nil {
		imp.Cadence = common.Frequency(*impCadence)
	}
	if impCreatedAt != nil {
		imp.CreatedAt = *impCreatedAt
	}
	// Derived fields from financial item
	if targetName != nil {
		imp.Name = *targetName
	}
	if targetCurrency != nil {
		imp.Currency = *targetCurrency
	}
	if targetFrequency != nil {
		imp.Frequency = *targetFrequency
	}
	if targetStartDate != nil {
		imp.StartDate = *targetStartDate
	}
	if targetNotes != nil {
		imp.Notes = *targetNotes
	}
	// Advanced fields from financial item
	if targetCategory != nil {
		imp.Category = *targetCategory
	}
	if targetGrowthStrategy != nil {
		imp.GrowthStrategy = *targetGrowthStrategy
	}
	return imp
}
