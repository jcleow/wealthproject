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

// NOTE: The scenario_event_impacts table has been deprecated.
// Impacts are now stored directly in finance_* tables with scenario_event_id FK.
// The queries below use the new architecture.

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

// CreateScenarioEvent inserts a scenario event.
// NEW ARCHITECTURE: Impact creation is done through V2 API which inserts into finance_* tables.
// Note: For full impact management, use the V2 API (CreateScenarioEventV2).
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

	// Note: Impact insertion is not supported in V1 - impacts should be created through V2 API
	// which inserts into finance_* tables with scenario_event_id, impact_kind, and impact_frequency

	if err := tx.Commit(); err != nil {
		return ScenarioEvent{}, err
	}

	// Fetch any existing impacts (in case they were created separately)
	created.Impacts, _ = s.ListScenarioImpacts(ctx, created.UserID, created.ID)
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
	ev.Impacts, _ = s.ListScenarioImpacts(ctx, userID, ev.ID)
	return ev, nil
}

// ListScenarioEvents returns paginated events for a user plus total count.
// NEW ARCHITECTURE: Impacts are now stored in finance_* tables with scenario_event_id FK.
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

	// Fetch events without impacts first (simpler query)
	query := fmt.Sprintf(`
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE %s
		ORDER BY occurs_on ASC, created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, len(args)+1, len(args)+2)

	rows, err := s.db.QueryContext(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []ScenarioEvent
	for rows.Next() {
		var ev ScenarioEvent
		var tagsJSON []byte
		var scenarioID sql.NullString

		if err := rows.Scan(
			&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &scenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}

		ev.Tags = decodeStringArray(tagsJSON)
		if scenarioID.Valid {
			ev.ScenarioID = &scenarioID.String
		}
		ev.Impacts = []ScenarioImpact{} // Will be populated below
		events = append(events, ev)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// Fetch impacts for each event from finance tables
	for i := range events {
		impacts, err := s.ListScenarioImpacts(ctx, userID, events[i].ID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to fetch impacts for event %s: %w", events[i].ID, err)
		}
		events[i].Impacts = impacts
	}

	if events == nil {
		events = []ScenarioEvent{}
	}

	return events, total, nil
}

// UpdateScenarioEvent replaces metadata and impacts.
// NEW ARCHITECTURE: Impacts are managed through finance_* tables.
// Note: For full impact management, use the V2 API (UpdateScenarioEventV2).
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

	// NEW ARCHITECTURE: Delete impacts from finance_* tables for this event
	tables := []string{
		"finance_incomes",
		"finance_expenses",
		"finance_assets",
		"finance_liabilities",
		"finance_investments",
		"finance_cash_accounts",
	}
	for _, table := range tables {
		query := fmt.Sprintf(`DELETE FROM %s WHERE scenario_event_id = $1 AND user_id = $2`, table)
		if _, err := tx.ExecContext(ctx, query, ev.ID, ev.UserID); err != nil {
			return ScenarioEvent{}, fmt.Errorf("failed to delete impacts from %s: %w", table, err)
		}
	}

	// Note: Impact insertion is not supported in V1 - use V2 API for that
	if err := tx.Commit(); err != nil {
		return ScenarioEvent{}, err
	}
	updated.Impacts, _ = s.ListScenarioImpacts(ctx, updated.UserID, updated.ID)
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

// ListScenarioImpacts lists impacts for an event by querying finance tables.
// NEW ARCHITECTURE: Impacts are stored in finance_* tables with scenario_event_id FK.
// Requires userID for defense-in-depth ownership verification.
func (s *Store) ListScenarioImpacts(ctx context.Context, userID, eventID string) ([]ScenarioImpact, error) {
	var impacts []ScenarioImpact

	// Query income impacts
	incomeRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, amount, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_incomes
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query income impacts: %w", err)
	}
	defer incomeRows.Close()
	for incomeRows.Next() {
		var id, parentID, name, notes string
		var amount float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := incomeRows.Scan(&id, &parentID, &name, &amount, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "income",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(amount),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	// Query expense impacts
	expenseRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, amount, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_expenses
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query expense impacts: %w", err)
	}
	defer expenseRows.Close()
	for expenseRows.Next() {
		var id, parentID, name, notes string
		var amount float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := expenseRows.Scan(&id, &parentID, &name, &amount, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "expense",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(amount),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	// Query asset impacts
	assetRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, current_value, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_assets
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query asset impacts: %w", err)
	}
	defer assetRows.Close()
	for assetRows.Next() {
		var id, parentID, name, notes string
		var currentValue float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := assetRows.Scan(&id, &parentID, &name, &currentValue, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "asset",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(currentValue),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	// Query liability impacts
	liabilityRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, current_balance, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_liabilities
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query liability impacts: %w", err)
	}
	defer liabilityRows.Close()
	for liabilityRows.Next() {
		var id, parentID, name, notes string
		var currentBalance float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := liabilityRows.Scan(&id, &parentID, &name, &currentBalance, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "liability",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(currentBalance),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	// Query investment impacts
	investmentRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, current_value, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_investments
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query investment impacts: %w", err)
	}
	defer investmentRows.Close()
	for investmentRows.Next() {
		var id, parentID, name, notes string
		var currentValue float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := investmentRows.Scan(&id, &parentID, &name, &currentValue, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "investment",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(currentValue),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	// Query cash account impacts
	cashRows, err := s.db.QueryContext(ctx, `
		SELECT id, COALESCE(parent_id, id), name, balance, start_date, end_date,
		       COALESCE(notes, ''), impact_kind, COALESCE(impact_frequency, 'monthly'), updated_at
		FROM finance_cash_accounts
		WHERE scenario_event_id = $1 AND user_id = $2`, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query cash account impacts: %w", err)
	}
	defer cashRows.Close()
	for cashRows.Next() {
		var id, parentID, name, notes string
		var balance float64
		var startDate time.Time
		var endDate sql.NullTime
		var impactKind, impactFrequency sql.NullString
		var updatedAt time.Time
		if err := cashRows.Scan(&id, &parentID, &name, &balance, &startDate, &endDate,
			&notes, &impactKind, &impactFrequency, &updatedAt); err != nil {
			return nil, err
		}
		imp := ScenarioImpact{
			ID:         id,
			EventID:    eventID,
			TargetType: "cash_account",
			TargetID:   &parentID,
			ImpactKind: impactKind.String,
			Amount:     int64(balance),
			Currency:   "SGD",
			Cadence:    impactFrequency.String,
			StartDate:  startDate,
			Notes:      notes,
			CreatedAt:  updatedAt,
		}
		if endDate.Valid {
			imp.EndDate = &endDate.Time
		}
		impacts = append(impacts, imp)
	}

	if impacts == nil {
		impacts = []ScenarioImpact{}
	}
	return impacts, nil
}

// NOTE: insertImpacts function has been removed.
// Impact insertion is now done through V2 API which inserts into finance_* tables
// with scenario_event_id, impact_kind, and impact_frequency columns.

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
