package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
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

	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, created.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}

	if len(ev.Impacts) > 0 {
		created.Impacts, _ = s.ListScenarioImpactsV2(ctx, created.ID)
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
	ev.Impacts, _ = s.ListScenarioImpactsV2(ctx, ev.ID)
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

	// Single JOIN query using CTE: paginate events first, then join impacts
	query := fmt.Sprintf(`
		WITH paginated_events AS (
			SELECT * FROM scenario_events
			WHERE %s
			ORDER BY occurs_on ASC, created_at DESC
			LIMIT $%d OFFSET $%d
		)
		SELECT
			e.id, e.user_id, e.name, e.description, e.occurs_on, e.display_icon, e.display_color, e.tags, e.scenario_id, e.is_included, e.created_at, e.updated_at,
			i.id, i.impact_kind, i.amount, i.currency, i.cadence, i.start_date, i.end_date, i.notes, i.created_at,
			i.target_asset_id, i.target_liability_id, i.target_income_id, i.target_expense_id, i.target_cash_account_id, i.target_investment_id
		FROM paginated_events e
		LEFT JOIN scenario_event_impacts i ON i.event_id = e.id
		ORDER BY e.occurs_on ASC, e.created_at DESC, i.start_date ASC NULLS LAST, i.created_at ASC`,
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
		var impID, impKind, impCurrency, impCadence, impNotes *string
		var impAmount *int64
		var impStartDate, impEndDate, impCreatedAt *time.Time
		var targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID *string

		if err := rows.Scan(
			&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt,
			&impID, &impKind, &impAmount, &impCurrency, &impCadence, &impStartDate, &impEndDate, &impNotes, &impCreatedAt,
			&targetAssetID, &targetLiabilityID, &targetIncomeID, &targetExpenseID, &targetCashAccountID, &targetInvestmentID,
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
				ev.ID, impID, impKind, impAmount, impCurrency, impCadence,
				impStartDate, impEndDate, impNotes, impCreatedAt,
				targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID,
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

	if _, err := tx.Exec(ctx, `DELETE FROM scenario_event_impacts WHERE event_id=$1`, ev.ID); err != nil {
		return ScenarioEvent{}, err
	}
	if len(ev.Impacts) > 0 {
		if err := s.insertImpactsV2(ctx, tx, ev.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return ScenarioEvent{}, err
	}
	updated.Impacts, _ = s.ListScenarioImpactsV2(ctx, updated.ID)
	return updated, nil
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
func (s *Store) ListScenarioImpactsV2(ctx context.Context, eventID string) ([]ScenarioImpact, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, event_id, impact_kind, amount, currency, cadence, start_date, end_date, notes, created_at,
		       target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id
		FROM scenario_event_impacts
		WHERE event_id = $1
		ORDER BY start_date ASC NULLS LAST, created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var impacts []ScenarioImpact
	for rows.Next() {
		var imp ScenarioImpact
		// pgx scans NULL directly into pointer fields
		if err := rows.Scan(
			&imp.ID, &imp.EventID, &imp.ImpactKind, &imp.Amount, &imp.Currency, &imp.Cadence,
			&imp.StartDate, &imp.EndDate, &imp.Notes, &imp.CreatedAt,
			&imp.TargetAssetID, &imp.TargetLiabilityID, &imp.TargetIncomeID, &imp.TargetExpenseID, &imp.TargetCashAccountID, &imp.TargetInvestmentID,
		); err != nil {
			return nil, err
		}

		impacts = append(impacts, imp)
	}
	if impacts == nil {
		impacts = []ScenarioImpact{}
	}
	return impacts, rows.Err()
}

// insertImpactsV2 inserts impacts using typed FK columns.
func (s *Store) insertImpactsV2(ctx context.Context, tx pgx.Tx, eventID string, impacts []ScenarioImpact) error {
	for i, imp := range impacts {
		targetID := imp.TargetID()
		targetType := imp.TargetType()
		if targetID == nil || strings.TrimSpace(*targetID) == "" || !scenario.IsValidTargetType(targetType) {
			return scenario.ErrInvalidTargetCount
		}

		// Debug log: show exactly what we're inserting
		fmt.Printf("insertImpactsV2[%d]: eventID=%s targetType=%s targetID=%s targetIncomeID=%v targetAssetID=%v targetExpenseID=%v\n",
			i, eventID, targetType, *targetID, imp.TargetIncomeID, imp.TargetAssetID, imp.TargetExpenseID)

		if _, err := tx.Exec(ctx, `
			INSERT INTO scenario_event_impacts
			(event_id, impact_kind, amount, currency, cadence, start_date, end_date, notes,
			 target_type, target_id,
			 target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
			eventID, imp.ImpactKind, imp.Amount, imp.Currency, imp.Cadence, imp.StartDate, imp.EndDate, imp.Notes,
			targetType, *targetID,
			imp.TargetAssetID, imp.TargetLiabilityID, imp.TargetIncomeID, imp.TargetExpenseID, imp.TargetCashAccountID, imp.TargetInvestmentID,
		); err != nil {
			fmt.Printf("insertImpactsV2[%d] FAILED: %v\n", i, err)
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
func scanImpactPgx(
	eventID string,
	impID, impKind *string,
	impAmount *int64,
	impCurrency, impCadence *string,
	impStartDate, impEndDate *time.Time,
	impNotes *string,
	impCreatedAt *time.Time,
	targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID *string,
) ScenarioImpact {
	imp := ScenarioImpact{
		EventID:             eventID,
		EndDate:             impEndDate,
		TargetAssetID:       targetAssetID,
		TargetLiabilityID:   targetLiabilityID,
		TargetIncomeID:      targetIncomeID,
		TargetExpenseID:     targetExpenseID,
		TargetCashAccountID: targetCashAccountID,
		TargetInvestmentID:  targetInvestmentID,
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
	if impCurrency != nil {
		imp.Currency = *impCurrency
	}
	if impCadence != nil {
		imp.Cadence = common.Frequency(*impCadence)
	}
	if impNotes != nil {
		imp.Notes = *impNotes
	}
	if impStartDate != nil {
		imp.StartDate = *impStartDate
	}
	if impCreatedAt != nil {
		imp.CreatedAt = *impCreatedAt
	}
	return imp
}
