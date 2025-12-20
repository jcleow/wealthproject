package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// listScenarioEventsWithImpactsQuery returns paginated events and their impacts in one round-trip.
// Ordering: events by occurs_on ASC, created_at DESC; impacts by start_date ASC NULLS LAST, created_at ASC.
const listScenarioEventsWithImpactsQuery = `
WITH filtered_events AS (
	SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
	FROM scenario_events
	WHERE %s
	ORDER BY occurs_on ASC, created_at DESC
	LIMIT $%d OFFSET $%d
)
SELECT fe.id, fe.user_id, fe.name, fe.description, fe.occurs_on, fe.display_icon, fe.display_color, fe.tags, fe.scenario_id, fe.is_included, fe.created_at, fe.updated_at,
       imp.id, imp.event_id,
       CASE
         WHEN imp.target_asset_id IS NOT NULL THEN 'asset'
         WHEN imp.target_liability_id IS NOT NULL THEN 'liability'
         WHEN imp.target_income_id IS NOT NULL THEN 'income'
         WHEN imp.target_expense_id IS NOT NULL THEN 'expense'
         WHEN imp.target_cash_account_id IS NOT NULL THEN 'cash_account'
         WHEN imp.target_investment_id IS NOT NULL THEN 'investment'
         ELSE ''
       END as target_type,
       COALESCE(imp.target_asset_id, imp.target_liability_id, imp.target_income_id, imp.target_expense_id, imp.target_cash_account_id, imp.target_investment_id) as target_id,
       imp.impact_kind, imp.amount, 'SGD' as currency, imp.cadence,
       COALESCE(a.start_date, l.start_date, inc.start_date, exp.start_date, ca.start_date, inv.start_date) as start_date,
       COALESCE(a.end_date, l.end_date, inc.end_date, exp.end_date, ca.end_date, inv.end_date) as end_date,
       COALESCE(a.notes, l.notes, inc.notes, exp.notes, ca.notes, inv.notes, '') as notes,
       imp.created_at
FROM filtered_events fe
LEFT JOIN scenario_event_impacts imp ON imp.event_id = fe.id
LEFT JOIN finance_assets a ON imp.target_asset_id = a.id
LEFT JOIN finance_liabilities l ON imp.target_liability_id = l.id
LEFT JOIN finance_incomes inc ON imp.target_income_id = inc.id
LEFT JOIN finance_expenses exp ON imp.target_expense_id = exp.id
LEFT JOIN finance_cash_accounts ca ON imp.target_cash_account_id = ca.id
LEFT JOIN finance_investments inv ON imp.target_investment_id = inv.id
ORDER BY fe.occurs_on ASC, fe.created_at DESC, imp.created_at ASC`

// ScenarioEvent represents a scenario event with impacts.
type ScenarioEvent struct {
	ID           string
	UserID       string
	Name         string
	Description  string
	OccursOn     time.Time
	DisplayIcon  string
	DisplayColor *string
	Tags         []string
	ScenarioID   *string
	IsIncluded   bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Impacts      []ScenarioImpact
}

// ScenarioImpact represents a financial impact tied to a scenario event.
type ScenarioImpact struct {
	ID         string
	EventID    string
	TargetType string
	TargetID   *string
	ImpactKind string
	Amount     int64
	Currency   string
	Cadence    string
	StartDate time.Time
	EndDate   *time.Time
	Notes      string
	CreatedAt  time.Time
}

// ScenarioFilters controls list queries.
type ScenarioFilters struct {
	IncludedOnly *bool
	Tags         []string
	Year         *int
	Search       string
	Limit        int
	Offset       int
}

// CreateScenarioEvent inserts a scenario event and its impacts.
func (s *Store) CreateScenarioEvent(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback()

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRowContext(ctx, `
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
		if err := insertImpacts(ctx, tx, created.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return ScenarioEvent{}, err
	}

	if len(ev.Impacts) > 0 {
		created.Impacts, _ = s.ListScenarioImpacts(ctx, created.ID)
	}
	return created, nil
}

// GetScenarioEvent fetches a scenario by ID for a user.
func (s *Store) GetScenarioEvent(ctx context.Context, userID, eventID string) (ScenarioEvent, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE id = $1 AND user_id = $2`, eventID, userID)
	var ev ScenarioEvent
	var tagsJSON []byte
	if err := row.Scan(&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ScenarioEvent{}, ErrNotFound
		}
		return ScenarioEvent{}, err
	}
	ev.Tags = decodeStringArray(tagsJSON)
	ev.Impacts, _ = s.ListScenarioImpacts(ctx, ev.ID)
	return ev, nil
}

// ListScenarioEvents returns paginated events for a user plus total count.
func (s *Store) ListScenarioEvents(ctx context.Context, userID string, filters ScenarioFilters) ([]ScenarioEvent, int, error) {
	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	where := []string{"user_id = $1"}
	args := []interface{}{userID}

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
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	cte := fmt.Sprintf(listScenarioEventsWithImpactsQuery, whereClause, len(args)+1, len(args)+2)

	rows, err := s.db.QueryContext(ctx, cte, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []ScenarioEvent
	eventMap := map[string]*ScenarioEvent{}

	for rows.Next() {
		var ev ScenarioEvent
		var tagsJSON []byte
		var scenarioID sql.NullString

		// All impact fields must be nullable since LEFT JOIN can return NULLs
		var impID sql.NullString
		var impEventID sql.NullString
		var impTargetType sql.NullString
		var impTargetID sql.NullString
		var impImpactKind sql.NullString
		var impAmount sql.NullInt64
		var impCurrency sql.NullString
		var impCadence sql.NullString
		var impStartDate sql.NullTime
		var impEndDate sql.NullTime
		var impNotes sql.NullString
		var impCreatedAt sql.NullTime

		if err := rows.Scan(
			&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &scenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt,
			&impID, &impEventID, &impTargetType, &impTargetID, &impImpactKind, &impAmount, &impCurrency, &impCadence, &impStartDate, &impEndDate, &impNotes, &impCreatedAt,
		); err != nil {
			return nil, 0, err
		}

		ev.Tags = decodeStringArray(tagsJSON)
		if scenarioID.Valid {
			ev.ScenarioID = &scenarioID.String
		}

		current, exists := eventMap[ev.ID]
		if !exists {
			events = append(events, ev)
			current = &events[len(events)-1]
			eventMap[ev.ID] = current
		}

		if impID.Valid {
			// StartMonth is required by database schema (NOT NULL constraint)
			if !impStartDate.Valid {
				return nil, 0, fmt.Errorf("impact %s has NULL start_date (database constraint violation)", impID.String)
			}

			imp := ScenarioImpact{
				ID:         impID.String,
				EventID:    ev.ID,
				TargetType: impTargetType.String,
				ImpactKind: impImpactKind.String,
				Amount:     impAmount.Int64,
				Currency:   impCurrency.String,
				Cadence:    impCadence.String,
				StartDate:  impStartDate.Time, // Safe to access since we checked Valid above
				Notes:      impNotes.String,
			}
			if impTargetID.Valid {
				imp.TargetID = &impTargetID.String
			}
			if impEventID.Valid {
				imp.EventID = impEventID.String
			}
			if impEndDate.Valid {
				imp.EndDate = &impEndDate.Time
			}
			if impCreatedAt.Valid {
				imp.CreatedAt = impCreatedAt.Time
			}
			current.Impacts = append(current.Impacts, imp)
		}
	}
	if events == nil {
		events = []ScenarioEvent{}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

// UpdateScenarioEvent replaces metadata and impacts.
func (s *Store) UpdateScenarioEvent(ctx context.Context, ev ScenarioEvent) (ScenarioEvent, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return ScenarioEvent{}, err
	}
	defer tx.Rollback()

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRowContext(ctx, `
		UPDATE scenario_events
		SET name=$2, description=$3, occurs_on=$4, display_icon=$5, display_color=$6, tags=$7, scenario_id=$8, is_included=$9, updated_at=NOW()
		WHERE id=$1 AND user_id=$10
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.ID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded, ev.UserID)
	var updated ScenarioEvent
	var tagsBytes []byte
	if err := row.Scan(&updated.ID, &updated.UserID, &updated.Name, &updated.Description, &updated.OccursOn, &updated.DisplayIcon, &updated.DisplayColor, &tagsBytes, &updated.ScenarioID, &updated.IsIncluded, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ScenarioEvent{}, ErrNotFound
		}
		return ScenarioEvent{}, err
	}
	updated.Tags = decodeStringArray(tagsBytes)

	if _, err := tx.ExecContext(ctx, `DELETE FROM scenario_event_impacts WHERE event_id=$1`, ev.ID); err != nil {
		return ScenarioEvent{}, err
	}
	if len(ev.Impacts) > 0 {
		if err := insertImpacts(ctx, tx, ev.ID, ev.Impacts); err != nil {
			return ScenarioEvent{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return ScenarioEvent{}, err
	}
	updated.Impacts, _ = s.ListScenarioImpacts(ctx, updated.ID)
	return updated, nil
}

// DeleteScenarioEvent removes an event for a user.
func (s *Store) DeleteScenarioEvent(ctx context.Context, userID, eventID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM scenario_events WHERE id=$1 AND user_id=$2`, eventID, userID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ToggleScenarioIncluded updates inclusion flag.
func (s *Store) ToggleScenarioIncluded(ctx context.Context, userID, eventID string, included bool) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE scenario_events
		SET is_included=$3, updated_at=NOW()
		WHERE id=$1 AND user_id=$2`, eventID, userID, included)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil || affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ListScenarioImpacts lists impacts for an event.
func (s *Store) ListScenarioImpacts(ctx context.Context, eventID string) ([]ScenarioImpact, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT imp.id, imp.event_id,
		       CASE
		         WHEN imp.target_asset_id IS NOT NULL THEN 'asset'
		         WHEN imp.target_liability_id IS NOT NULL THEN 'liability'
		         WHEN imp.target_income_id IS NOT NULL THEN 'income'
		         WHEN imp.target_expense_id IS NOT NULL THEN 'expense'
		         WHEN imp.target_cash_account_id IS NOT NULL THEN 'cash_account'
		         WHEN imp.target_investment_id IS NOT NULL THEN 'investment'
		         ELSE ''
		       END as target_type,
		       COALESCE(imp.target_asset_id, imp.target_liability_id, imp.target_income_id, imp.target_expense_id, imp.target_cash_account_id, imp.target_investment_id) as target_id,
		       imp.impact_kind, imp.amount, 'SGD' as currency, imp.cadence,
		       COALESCE(a.start_date, l.start_date, inc.start_date, exp.start_date, ca.start_date, inv.start_date) as start_date,
		       COALESCE(a.end_date, l.end_date, inc.end_date, exp.end_date, ca.end_date, inv.end_date) as end_date,
		       COALESCE(a.notes, l.notes, inc.notes, exp.notes, ca.notes, inv.notes, '') as notes,
		       imp.created_at
		FROM scenario_event_impacts imp
		LEFT JOIN finance_assets a ON imp.target_asset_id = a.id
		LEFT JOIN finance_liabilities l ON imp.target_liability_id = l.id
		LEFT JOIN finance_incomes inc ON imp.target_income_id = inc.id
		LEFT JOIN finance_expenses exp ON imp.target_expense_id = exp.id
		LEFT JOIN finance_cash_accounts ca ON imp.target_cash_account_id = ca.id
		LEFT JOIN finance_investments inv ON imp.target_investment_id = inv.id
		WHERE imp.event_id = $1
		ORDER BY imp.created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var impacts []ScenarioImpact
	for rows.Next() {
		var imp ScenarioImpact
		var startMonth sql.NullTime
		var endMonth sql.NullTime
		var targetID sql.NullString
		if err := rows.Scan(&imp.ID, &imp.EventID, &imp.TargetType, &targetID, &imp.ImpactKind, &imp.Amount, &imp.Currency, &imp.Cadence, &startMonth, &endMonth, &imp.Notes, &imp.CreatedAt); err != nil {
			return nil, err
		}

		// StartMonth is required by database schema (NOT NULL constraint)
		if !startMonth.Valid {
			return nil, fmt.Errorf("impact %s has NULL start_date (database constraint violation)", imp.ID)
		}
		imp.StartDate = startMonth.Time

		if targetID.Valid {
			imp.TargetID = &targetID.String
		}
		if endMonth.Valid {
			imp.EndDate = &endMonth.Time
		}
		impacts = append(impacts, imp)
	}
	if impacts == nil {
		impacts = []ScenarioImpact{}
	}
	return impacts, rows.Err()
}

func insertImpacts(ctx context.Context, tx *sql.Tx, eventID string, impacts []ScenarioImpact) error {
	for _, imp := range impacts {
		// Map target_type + target_id to typed FK columns
		var targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID interface{}
		switch imp.TargetType {
		case "asset":
			targetAssetID = imp.TargetID
		case "liability":
			targetLiabilityID = imp.TargetID
		case "income":
			targetIncomeID = imp.TargetID
		case "expense":
			targetExpenseID = imp.TargetID
		case "cash_account":
			targetCashAccountID = imp.TargetID
		case "investment":
			targetInvestmentID = imp.TargetID
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO scenario_event_impacts
			(event_id, impact_kind, amount, cadence,
			 target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			eventID, imp.ImpactKind, imp.Amount, imp.Cadence,
			targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID); err != nil {
			return err
		}
	}
	return nil
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
