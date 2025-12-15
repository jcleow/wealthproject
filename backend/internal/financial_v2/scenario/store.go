package scenario

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

// Store provides scenario event persistence operations
type Store struct {
	db *sql.DB
}

// NewStore creates a new scenario Store
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a scenario event and its impacts using typed FK columns.
func (s *Store) Create(ctx context.Context, ev Event) (Event, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Event{}, err
	}
	defer tx.Rollback()

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRowContext(ctx, `
		INSERT INTO scenario_events (user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, true))
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.UserID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded)

	var created Event
	var tagsBytes []byte
	if err := row.Scan(&created.ID, &created.UserID, &created.Name, &created.Description, &created.OccursOn, &created.DisplayIcon, &created.DisplayColor, &tagsBytes, &created.ScenarioID, &created.IsIncluded, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return Event{}, err
	}
	created.Tags = decodeStringArray(tagsBytes)

	if len(ev.Impacts) > 0 {
		if err := s.insertImpacts(ctx, tx, created.ID, ev.Impacts); err != nil {
			return Event{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Event{}, err
	}

	if len(ev.Impacts) > 0 {
		created.Impacts, _ = s.ListImpacts(ctx, created.ID)
	}
	return created, nil
}

// Get fetches a scenario by ID for a user with typed FK impacts.
func (s *Store) Get(ctx context.Context, userID, eventID string) (Event, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE id = $1 AND user_id = $2`, eventID, userID)
	var ev Event
	var tagsJSON []byte
	if err := row.Scan(&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Event{}, ErrNotFound
		}
		return Event{}, err
	}
	ev.Tags = decodeStringArray(tagsJSON)
	ev.Impacts, _ = s.ListImpacts(ctx, ev.ID)
	return ev, nil
}

// List returns paginated events for a user with typed FK impacts.
func (s *Store) List(ctx context.Context, userID string, filters Filters) ([]Event, int, error) {
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

	query := fmt.Sprintf(`
		SELECT id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at
		FROM scenario_events
		WHERE %s
		ORDER BY occurs_on ASC, created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, len(args)+1, len(args)+2)

	rows, err := s.db.QueryContext(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var ev Event
		var tagsJSON []byte
		if err := rows.Scan(&ev.ID, &ev.UserID, &ev.Name, &ev.Description, &ev.OccursOn, &ev.DisplayIcon, &ev.DisplayColor, &tagsJSON, &ev.ScenarioID, &ev.IsIncluded, &ev.CreatedAt, &ev.UpdatedAt); err != nil {
			return nil, 0, err
		}
		ev.Tags = decodeStringArray(tagsJSON)
		ev.Impacts, _ = s.ListImpacts(ctx, ev.ID)
		events = append(events, ev)
	}

	if events == nil {
		events = []Event{}
	}
	return events, total, nil
}

// Update replaces metadata and impacts using typed FK columns.
func (s *Store) Update(ctx context.Context, ev Event) (Event, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Event{}, err
	}
	defer tx.Rollback()

	tagsJSON, _ := json.Marshal(ev.Tags)

	row := tx.QueryRowContext(ctx, `
		UPDATE scenario_events
		SET name=$2, description=$3, occurs_on=$4, display_icon=$5, display_color=$6, tags=$7, scenario_id=$8, is_included=$9, updated_at=NOW()
		WHERE id=$1 AND user_id=$10
		RETURNING id, user_id, name, description, occurs_on, display_icon, display_color, tags, scenario_id, is_included, created_at, updated_at`,
		ev.ID, ev.Name, ev.Description, ev.OccursOn, ev.DisplayIcon, ev.DisplayColor, tagsJSON, ev.ScenarioID, ev.IsIncluded, ev.UserID)
	var updated Event
	var tagsBytes []byte
	if err := row.Scan(&updated.ID, &updated.UserID, &updated.Name, &updated.Description, &updated.OccursOn, &updated.DisplayIcon, &updated.DisplayColor, &tagsBytes, &updated.ScenarioID, &updated.IsIncluded, &updated.CreatedAt, &updated.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Event{}, ErrNotFound
		}
		return Event{}, err
	}
	updated.Tags = decodeStringArray(tagsBytes)

	if _, err := tx.ExecContext(ctx, `DELETE FROM scenario_event_impacts WHERE event_id=$1`, ev.ID); err != nil {
		return Event{}, err
	}
	if len(ev.Impacts) > 0 {
		if err := s.insertImpacts(ctx, tx, ev.ID, ev.Impacts); err != nil {
			return Event{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return Event{}, err
	}
	updated.Impacts, _ = s.ListImpacts(ctx, updated.ID)
	return updated, nil
}

// Delete removes an event for a user.
func (s *Store) Delete(ctx context.Context, userID, eventID string) error {
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

// ToggleIncluded updates inclusion flag.
func (s *Store) ToggleIncluded(ctx context.Context, userID, eventID string, included bool) error {
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

// ListImpacts lists impacts for an event using typed FK columns.
func (s *Store) ListImpacts(ctx context.Context, eventID string) ([]Impact, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, event_id, impact_kind, amount, currency, cadence, start_month, end_month, notes, created_at,
		       target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id
		FROM scenario_event_impacts
		WHERE event_id = $1
		ORDER BY start_month ASC NULLS LAST, created_at ASC`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var impacts []Impact
	for rows.Next() {
		var imp Impact
		var startMonth sql.NullTime
		var endMonth sql.NullTime
		var targetAssetID, targetLiabilityID, targetIncomeID, targetExpenseID, targetCashAccountID, targetInvestmentID sql.NullString

		if err := rows.Scan(
			&imp.ID, &imp.EventID, &imp.ImpactKind, &imp.Amount, &imp.Currency, &imp.Cadence,
			&startMonth, &endMonth, &imp.Notes, &imp.CreatedAt,
			&targetAssetID, &targetLiabilityID, &targetIncomeID, &targetExpenseID, &targetCashAccountID, &targetInvestmentID,
		); err != nil {
			return nil, err
		}

		if !startMonth.Valid {
			return nil, fmt.Errorf("impact %s has NULL start_month (database constraint violation)", imp.ID)
		}
		imp.StartMonth = startMonth.Time

		if endMonth.Valid {
			imp.EndMonth = &endMonth.Time
		}
		if targetAssetID.Valid {
			imp.TargetAssetID = &targetAssetID.String
		}
		if targetLiabilityID.Valid {
			imp.TargetLiabilityID = &targetLiabilityID.String
		}
		if targetIncomeID.Valid {
			imp.TargetIncomeID = &targetIncomeID.String
		}
		if targetExpenseID.Valid {
			imp.TargetExpenseID = &targetExpenseID.String
		}
		if targetCashAccountID.Valid {
			imp.TargetCashAccountID = &targetCashAccountID.String
		}
		if targetInvestmentID.Valid {
			imp.TargetInvestmentID = &targetInvestmentID.String
		}

		impacts = append(impacts, imp)
	}
	if impacts == nil {
		impacts = []Impact{}
	}
	return impacts, rows.Err()
}

// insertImpacts inserts impacts using typed FK columns.
func (s *Store) insertImpacts(ctx context.Context, tx *sql.Tx, eventID string, impacts []Impact) error {
	for _, imp := range impacts {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO scenario_event_impacts
			(event_id, impact_kind, amount, currency, cadence, start_month, end_month, notes,
			 target_asset_id, target_liability_id, target_income_id, target_expense_id, target_cash_account_id, target_investment_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
			eventID, imp.ImpactKind, imp.Amount, imp.Currency, imp.Cadence, imp.StartMonth, imp.EndMonth, imp.Notes,
			imp.TargetAssetID, imp.TargetLiabilityID, imp.TargetIncomeID, imp.TargetExpenseID, imp.TargetCashAccountID, imp.TargetInvestmentID,
		); err != nil {
			return err
		}
	}
	return nil
}

// GetExcludedTargetIDs returns IDs of financial items created by excluded scenarios.
// These should be filtered out from timeline queries.
func (s *Store) GetExcludedTargetIDs(ctx context.Context, userID string) (ExcludedTargets, error) {
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

	rows, err := s.db.QueryContext(ctx, query, userID)
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
		var assetID, liabilityID, incomeID, expenseID, cashAccountID, investmentID sql.NullString
		if err := rows.Scan(&assetID, &liabilityID, &incomeID, &expenseID, &cashAccountID, &investmentID); err != nil {
			return ExcludedTargets{}, err
		}
		if assetID.Valid {
			result.AssetIDs[assetID.String] = struct{}{}
		}
		if liabilityID.Valid {
			result.LiabilityIDs[liabilityID.String] = struct{}{}
		}
		if incomeID.Valid {
			result.IncomeIDs[incomeID.String] = struct{}{}
		}
		if expenseID.Valid {
			result.ExpenseIDs[expenseID.String] = struct{}{}
		}
		if cashAccountID.Valid {
			result.CashAccountIDs[cashAccountID.String] = struct{}{}
		}
		if investmentID.Valid {
			result.InvestmentIDs[investmentID.String] = struct{}{}
		}
	}

	return result, rows.Err()
}

// ListIncludedEvents returns all included (is_included=true) scenario events
// with their impacts for the given user. Used by timeline service for impact application.
func (s *Store) ListIncludedEvents(ctx context.Context, userID string) ([]Event, error) {
	included := true
	events, _, err := s.List(ctx, userID, Filters{
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
