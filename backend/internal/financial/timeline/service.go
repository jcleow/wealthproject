package timeline

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
	"financial-chat-system/backend/internal/middleware"
)

const (
	defaultTotalYears = 31 // years 0..30 inclusive (fallback)
	defaultVersion    = "v1"
)

// Service encapsulates timeline logic.
type Service struct {
	store     Store
	scenarios scenarioApplier
}

type scenarioApplier interface {
	Apply(ctx context.Context, req scenario.ApplyRequest) ([]scenario.Row, error)
}

// getUserIDFromContext extracts user ID from context via middleware.
func getUserIDFromContext(ctx context.Context) string {
	return middleware.GetUserContext(ctx).UserID
}

// NewService builds a new Service.
func NewService(store Store) *Service {
	return &Service{store: store}
}

// WithScenarioApplier injects scenario applier for financial data merges.
func NewServiceWithScenario(store Store, sa scenarioApplier) *Service {
	return &Service{store: store, scenarios: sa}
}

// GetTimeline returns the full 0..30 timeline.
func (s *Service) GetTimeline(ctx context.Context) (TimelineResponse, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return TimelineResponse{}, errors.New("user context required")
	}
	return s.buildTimeline(ctx, userID)
}

// GetTimelineWithScenarios optionally merges scenarios for a given user/year selection.
func (s *Service) GetTimelineWithScenarios(ctx context.Context, userID string, include bool, selectedIDs []string) (TimelineResponse, error) {
	if userID == "" {
		userID = getUserIDFromContext(ctx)
	}
	if userID == "" {
		return TimelineResponse{}, errors.New("user context required")
	}
	resp, err := s.buildTimeline(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}
	if !include || s.scenarios == nil {
		return resp, nil
	}

	// Use current calendar year as the base (year 0 in timeline).
	baseYear := time.Now().Year()

	applied := map[string]struct{}{}

	// First pass: apply scenarios to all items
	for i, year := range resp.Years {
		yearRows := make([]scenario.Row, 0, len(year.Assets)+len(year.Liabilities)+len(year.Income)+len(year.Expenses))
		apply := func(items []TimelineItem) []TimelineItem {
			rows := mapItems(items)
			out, err := s.scenarios.Apply(ctx, scenario.ApplyRequest{
				UserID:      userID,
				Year:        year.Year,
				BaseYear:    baseYear,
				Rows:        rows,
				SelectedIDs: selectedIDs,
			})
			if err != nil {
				return items
			}
			yearRows = append(yearRows, out...)
			return annotateItems(items, out)
		}
		resp.Years[i].Assets = apply(year.Assets)
		resp.Years[i].Liabilities = apply(year.Liabilities)
		resp.Years[i].Income = apply(year.Income)
		resp.Years[i].Expenses = apply(year.Expenses)
		resp.Years[i].NetCash = sumAdjusted(resp.Years[i].Income) - sumAdjusted(resp.Years[i].Expenses)
		for _, r := range yearRows {
			for _, imp := range r.EventImpacts {
				applied[imp.EventID] = struct{}{}
			}
		}
	}

	// Second pass: recalculate cash accumulation based on adjusted income/expenses
	// This is critical for scenarios like retirement that stop income
	if len(resp.Years) > 0 {
		// Get the accumulator account and its interest rate from year 0
		var accumulatorID string
		var cashGrowthRate float64
		accumulatedCash := 0.0

		// Find accumulator in year 0 cash accounts
		for _, ca := range resp.Years[0].CashAccounts {
			if ca.IsAccumulator {
				accumulatorID = ca.ItemID
				accumulatedCash = ca.AmountAnnual // Start with year 0 balance
				break
			}
		}
		// Get interest rate from AccumulatedCashEnd calculation (approximation)
		if resp.Years[0].AccumulatedCashEnd > 0 && resp.Years[0].InterestEarned > 0 {
			// Back-calculate interest rate from year 1's interest earned
			if len(resp.Years) > 1 && resp.Years[1].AccumulatedCashStart > 0 {
				cashGrowthRate = (resp.Years[1].InterestEarned / resp.Years[1].AccumulatedCashStart) * 100
			}
		}
		if cashGrowthRate == 0 {
			cashGrowthRate = 1.5 // Default interest rate
		}

		// Recalculate cash for each year based on adjusted net cash
		for i := range resp.Years {
			year := &resp.Years[i]
			cashAtStart := accumulatedCash

			// Calculate adjusted net savings from scenario-modified income/expenses
			adjustedNetSavings := sumAdjusted(year.Income) - sumAdjusted(year.Expenses)

			interestEarned := 0.0
			if i > 0 {
				// Add net savings (can be negative in retirement)
				accumulatedCash += adjustedNetSavings

				// Apply interest
				interestEarned = accumulatedCash * (cashGrowthRate / 100.0)
				accumulatedCash += interestEarned
			}

			// Update cash account balances
			for j := range year.CashAccounts {
				if year.CashAccounts[j].ItemID == accumulatorID || year.CashAccounts[j].IsAccumulator {
					year.CashAccounts[j].AmountAnnual = accumulatedCash
					year.CashAccounts[j].AdjustedAnnual = accumulatedCash
				}
			}

			// Update year fields
			year.AnnualNetSavings = adjustedNetSavings
			year.AccumulatedCashStart = cashAtStart
			year.AccumulatedCashEnd = accumulatedCash
			year.InterestEarned = interestEarned

			// Recalculate net worth with corrected cash
			year.NetWorth = sumAdjusted(year.Assets) + sumCashAccountBalances(year.CashAccounts) - sumAdjusted(year.Liabilities)
		}
	}

	for id := range applied {
		resp.ScenariosApplied = append(resp.ScenariosApplied, id)
	}
	sort.Strings(resp.ScenariosApplied)
	return resp, nil
}

// UpsertYear stores edits/new items for a year and returns the refreshed timeline.
func (s *Service) UpsertYear(ctx context.Context, year int, edits []EditRequest) (TimelineResponse, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return TimelineResponse{}, errors.New("user context required")
	}

	// Fetch user settings for planning horizon validation
	userSettings, err := s.store.GetUserSettings(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}
	maxYears := defaultTotalYears
	if userSettings.TerminalAge > userSettings.StartingAge {
		maxYears = userSettings.TerminalAge - userSettings.StartingAge + 1
	}

	if year < 0 || year >= maxYears {
		return TimelineResponse{}, errors.New("year out of planning horizon range")
	}
	for _, edit := range edits {
		if err := validateEdit(edit); err != nil {
			return TimelineResponse{}, err
		}
		if err := s.applyEdit(ctx, userID, year, edit); err != nil {
			return TimelineResponse{}, err
		}
	}
	return s.buildTimeline(ctx, userID)
}

func validateEdit(edit EditRequest) error {
	if edit.ItemType == "" {
		return errors.New("itemType is required")
	}
	if _, ok := freqFactors[edit.Frequency]; !ok {
		return errUnsupportedFrequency
	}
	if edit.Amount < 0 {
		return errors.New("amount must be non-negative")
	}
	if edit.ItemID == nil && (edit.Name == nil || strings.TrimSpace(*edit.Name) == "") {
		return errors.New("name is required when creating a new item")
	}
	return nil
}

func (s *Service) applyEdit(ctx context.Context, userID string, year int, edit EditRequest) error {
	parentID := ""
	if edit.ItemID != nil {
		parentID = *edit.ItemID
	}
	name := ""
	if edit.Name != nil {
		name = strings.TrimSpace(*edit.Name)
	}
	category := strings.TrimSpace(edit.Category)
	if category == "" {
		category = "other"
	}

	switch edit.ItemType {
	case ItemTypeAsset:
		_, err := s.store.CreateAsset(ctx, userID, repository.Asset{
			ParentID:         parentID,
			Name:             name,
			Category:         category,
			CurrentValue:     edit.Amount,
			AnnualGrowthRate: 0,
			Frequency:        string(edit.Frequency),
			StartYear:        year,
		})
		return err
	case ItemTypeLiability:
		_, err := s.store.CreateLiability(ctx, userID, repository.Liability{
			ParentID:        parentID,
			Name:            name,
			Category:        category,
			CurrentBalance:  edit.Amount,
			InterestRateAPR: 0,
			MinimumPayment:  0,
			Frequency:       string(edit.Frequency),
			StartYear:       year,
		})
		return err
	case ItemTypeIncome:
		now := time.Now()
		_, err := s.store.CreateIncome(ctx, userID, repository.Income{
			ParentID:  parentID,
			Source:    name,
			Amount:    edit.Amount,
			Frequency: string(edit.Frequency),
			StartDate: &now,
			StartYear: year,
		})
		return err
	case ItemTypeExpense:
		_, err := s.store.CreateExpense(ctx, userID, repository.Expense{
			ParentID:  parentID,
			Payee:     name,
			Amount:    edit.Amount,
			Frequency: string(edit.Frequency),
			StartYear: year,
		})
		return err
	default:
		return errors.New("unsupported item type")
	}
}

type itemState struct {
	item       TimelineItem
	amount     float64
	endYear    *int
	growthRate float64 // Per-item growth rate (percentage)
}

type effectiveRow struct {
	ID         string
	ParentID   string
	Name       string
	Category   string
	Amount     float64
	Frequency  Frequency
	StartYear  int
	EndYear    sql.NullInt32
	ItemType   ItemType
	GrowthRate float64 // Per-item growth rate (percentage)
}

func (s *Service) buildTimeline(ctx context.Context, userID string) (TimelineResponse, error) {
	// Fetch user settings for planning horizon
	userSettings, err := s.store.GetUserSettings(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}

	// Calculate total years from user settings
	totalYears := defaultTotalYears
	if userSettings.TerminalAge > userSettings.StartingAge {
		totalYears = userSettings.TerminalAge - userSettings.StartingAge + 1
	}

	growthCfg, err := s.ensureGrowth(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}

	// Ensure accumulator cash account exists
	accumulator, err := s.ensureAccumulatorAccount(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}

	// Load all cash accounts
	cashAccounts, err := s.store.ListCashAccounts(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}

	rows, err := s.loadEffectiveRows(ctx, userID)
	if err != nil {
		return TimelineResponse{}, err
	}
	rowsByYear := map[int][]effectiveRow{}
	for _, r := range rows {
		rowsByYear[r.StartYear] = append(rowsByYear[r.StartYear], r)
	}

	state := map[string]itemState{}

	// Track accumulated cash (starts from accumulator's initial balance)
	accumulatedCash := accumulator.Balance
	cashGrowthRate := accumulator.InterestRate

	years := make([]TimelineYear, totalYears)
	for year := 0; year < totalYears; year++ {
		cashAtStart := accumulatedCash

		// expire by end_year
		for id, st := range state {
			if st.endYear != nil && year > *st.endYear {
				delete(state, id)
			}
		}

		if year > 0 {
			for id, st := range state {
				// Use per-item growth rate if explicitly set, otherwise fallback to category defaults
				// This ensures assets/liabilities without explicit rates still grow appropriately
				rate := st.growthRate
				if rate == 0 && st.item.ItemType != ItemTypeIncome && st.item.ItemType != ItemTypeExpense {
					// For assets/liabilities without explicit rate, use category default
					rate = lookupGrowthRate(growthCfg, st.item.Category, st.item.ItemType)
				}
				st.amount = applyGrowth(st.amount, rate)
				st.item.AmountAnnual = st.amount
				st.item.AdjustedAnnual = st.amount
				state[id] = st
			}
		}

		hasOverride := len(rowsByYear[year]) > 0 && year > 0
		for _, r := range rowsByYear[year] {
			annual, err := Annualize(r.Amount, r.Frequency)
			if err != nil {
				return TimelineResponse{}, err
			}

			if r.Amount == 0 {
				delete(state, r.ParentID)
				hasOverride = true
				continue
			}

			var endYearPtr *int
			if r.EndYear.Valid {
				val := int(r.EndYear.Int32)
				endYearPtr = &val
			}

			state[r.ParentID] = itemState{
				item: TimelineItem{
					ItemID:          r.ParentID,
					RowID:           r.ID,
					ParentID:        r.ParentID,
					Name:            r.Name,
					Category:        r.Category,
					AmountAnnual:    annual,
					AdjustedAnnual:  annual,
					SourceAmount:    &r.Amount,
					SourceFrequency: string(r.Frequency),
					ItemType:        r.ItemType,
					CreatedYear:     r.StartYear,
					GrowthRate:      r.GrowthRate,
				},
				amount:     annual,
				endYear:    endYearPtr,
				growthRate: r.GrowthRate,
			}
		}

		yearItems := segregateItems(state, year)

		// Calculate annual net savings (income - expenses)
		annualNetSavings := sumAnnual(yearItems.Income) - sumAnnual(yearItems.Expenses)

		// Only accumulate starting from year 1 - year 0 is the baseline
		interestEarned := 0.0
		if year > 0 {
			// Accumulate surplus into cash
			accumulatedCash += annualNetSavings

			// Apply interest to accumulated cash
			interestEarned = accumulatedCash * (cashGrowthRate / 100.0)
			accumulatedCash += interestEarned
		}

		// Build cash account items for this year
		cashItems := buildCashItems(cashAccounts, accumulator.ID, accumulatedCash, year)

		// Calculate totals
		totalCash := sumCashAccountBalances(cashItems)
		totalAssets := sumAnnual(yearItems.Assets)
		netWorth := totalAssets + totalCash - sumAnnual(yearItems.Liabilities)

		years[year] = TimelineYear{
			Year:          year,
			Assets:        yearItems.Assets,
			CashAccounts:  cashItems,
			Liabilities:   yearItems.Liabilities,
			Income:        yearItems.Income,
			Expenses:      yearItems.Expenses,
			NetCash:       annualNetSavings,
			NetWorth:      netWorth,
			HasOverrides:  hasOverride,
			GrowthApplied: toGrowthApplied(growthCfg),

			// Cash accumulation fields
			AnnualNetSavings:     annualNetSavings,
			AccumulatedCashStart: cashAtStart,
			AccumulatedCashEnd:   accumulatedCash,
			InterestEarned:       interestEarned,
			AccumulatorAccountID: accumulator.ID,
		}
	}

	resp := TimelineResponse{
		Years:   years,
		Version: defaultVersion,
	}
	return resp, nil
}

// buildCashItems converts cash accounts to timeline items for a given year.
// The accumulator account uses the accumulated balance; others compound with their own rate.
func buildCashItems(accounts []repository.CashAccount, accumulatorID string, accumulatedBalance float64, year int) []TimelineItem {
	items := make([]TimelineItem, 0, len(accounts))
	for _, acc := range accounts {
		// Check if account is active for this year
		if acc.StartYear > year {
			continue
		}
		if acc.EndYear.Valid && int(acc.EndYear.Int32) < year {
			continue
		}

		balance := acc.Balance
		isAccumulator := acc.ID == accumulatorID

		if isAccumulator {
			// Accumulator uses the running accumulated balance
			balance = accumulatedBalance
		} else if year > 0 {
			// Non-accumulator accounts compound with their own interest rate
			balance = acc.Balance * math.Pow(1+acc.InterestRate/100, float64(year))
		}

		items = append(items, TimelineItem{
			ItemID:         acc.ID,
			Name:           acc.Name,
			Category:       "cash",
			AmountAnnual:   balance,
			AdjustedAnnual: balance,
			ItemType:       ItemTypeCashAccount,
			IsAccumulator:  isAccumulator,
		})
	}

	// Sort by balance descending
	sort.Slice(items, func(i, j int) bool {
		return items[i].AmountAnnual > items[j].AmountAnnual
	})

	return items
}

// sumCashAccountBalances sums up all cash account balances.
func sumCashAccountBalances(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AmountAnnual
	}
	return total
}

func (s *Service) loadEffectiveRows(ctx context.Context, userID string) ([]effectiveRow, error) {
	rows := []effectiveRow{}

	assets, err := s.store.ListAllAssets(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, a := range assets {
		rows = append(rows, effectiveRow{
			ID:         a.ID,
			ParentID:   coalesceString(a.ParentID, a.ID),
			Name:       a.Name,
			Category:   a.Category,
			Amount:     a.CurrentValue,
			Frequency:  normalizeFreq(a.Frequency),
			StartYear:  a.StartYear,
			EndYear:    a.EndYear,
			ItemType:   ItemTypeAsset,
			GrowthRate: a.AnnualGrowthRate,
		})
	}

	liabilities, err := s.store.ListAllLiabilities(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, li := range liabilities {
		rows = append(rows, effectiveRow{
			ID:         li.ID,
			ParentID:   coalesceString(li.ParentID, li.ID),
			Name:       li.Name,
			Category:   li.Category,
			Amount:     li.CurrentBalance,
			Frequency:  normalizeFreq(li.Frequency),
			StartYear:  li.StartYear,
			EndYear:    li.EndYear,
			ItemType:   ItemTypeLiability,
			GrowthRate: 0, // Use category default (-3%) - liabilities decrease as you pay them down
		})
	}

	incomes, err := s.store.ListAllIncomes(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, it := range incomes {
		rows = append(rows, effectiveRow{
			ID:         it.ID,
			ParentID:   coalesceString(it.ParentID, it.ID),
			Name:       it.Source,
			Category:   it.Category,
			Amount:     it.Amount,
			Frequency:  normalizeFreq(it.Frequency),
			StartYear:  it.StartYear,
			EndYear:    it.EndYear,
			ItemType:   ItemTypeIncome,
			GrowthRate: it.GrowthRate,
		})
	}

	expenses, err := s.store.ListAllExpenses(ctx, userID)
	if err != nil {
		return nil, err
	}
	for _, it := range expenses {
		rows = append(rows, effectiveRow{
			ID:         it.ID,
			ParentID:   coalesceString(it.ParentID, it.ID),
			Name:       it.Payee,
			Category:   it.Category,
			Amount:     it.Amount,
			Frequency:  normalizeFreq(it.Frequency),
			StartYear:  it.StartYear,
			EndYear:    it.EndYear,
			ItemType:   ItemTypeExpense,
			GrowthRate: it.GrowthRate,
		})
	}

	sort.Slice(rows, func(i, j int) bool {
		if rows[i].ParentID == rows[j].ParentID {
			return rows[i].StartYear < rows[j].StartYear
		}
		return rows[i].ParentID < rows[j].ParentID
	})

	return rows, nil
}

// ensureGrowth returns configured growth or seeds defaults.
func (s *Service) ensureGrowth(ctx context.Context, userID string) ([]repository.GrowthConfig, error) {
	cfgs, err := s.store.GetGrowthConfigs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(cfgs) == 0 {
		if err := s.store.UpsertGrowthConfigs(ctx, userID, repository.DefaultGrowthConfigs); err != nil {
			return nil, err
		}
		return repository.DefaultGrowthConfigs, nil
	}
	return cfgs, nil
}

// ensureAccumulatorAccount ensures user has an accumulator cash account.
// Creates a default "Cash Savings" account if none exists.
func (s *Service) ensureAccumulatorAccount(ctx context.Context, userID string) (repository.CashAccount, error) {
	// 1. Try to get existing accumulator
	acc, err := s.store.GetAccumulatorAccount(ctx, userID)
	if err == nil {
		return acc, nil
	}
	if !errors.Is(err, repository.ErrNotFound) {
		return repository.CashAccount{}, err
	}

	// 2. No accumulator - check if any cash account exists
	accounts, err := s.store.ListCashAccounts(ctx, userID)
	if err != nil {
		return repository.CashAccount{}, err
	}

	if len(accounts) > 0 {
		// Mark first cash account as accumulator
		if err := s.store.SetAccumulatorAccount(ctx, userID, accounts[0].ID); err != nil {
			return repository.CashAccount{}, err
		}
		accounts[0].IsAccumulator = true
		return accounts[0], nil
	}

	// 3. No cash accounts exist - create default "Cash"
	defaultAccount, err := s.store.CreateCashAccount(ctx, repository.CashAccount{
		UserID:        userID,
		Name:          "Cash",
		Balance:       0,
		InterestRate:  1.5, // Default interest rate
		IsAccumulator: true,
		StartYear:     0,
	})
	if err != nil {
		return repository.CashAccount{}, err
	}

	return defaultAccount, nil
}

// GetGrowthConfig returns the current growth configuration, seeding defaults if missing.
func (s *Service) GetGrowthConfig(ctx context.Context) ([]repository.GrowthConfig, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user context required")
	}
	return s.ensureGrowth(ctx, userID)
}

// UpdateGrowthConfig validates and persists growth configuration, returning the saved set.
func (s *Service) UpdateGrowthConfig(ctx context.Context, cfgs []repository.GrowthConfig) ([]repository.GrowthConfig, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user context required")
	}
	if len(cfgs) == 0 {
		return nil, errors.New("growth configs required")
	}
	normalized := make([]repository.GrowthConfig, 0, len(cfgs))
	for _, c := range cfgs {
		c.Category = strings.ToLower(strings.TrimSpace(c.Category))
		if c.Category == "" {
			return nil, errors.New("category is required")
		}
		normalized = append(normalized, c)
	}
	if err := s.store.UpsertGrowthConfigs(ctx, userID, normalized); err != nil {
		return nil, err
	}
	return normalized, nil
}

// GetUserSettings returns the current user settings.
func (s *Service) GetUserSettings(ctx context.Context) (repository.UserSettings, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return repository.UserSettings{}, errors.New("user context required")
	}
	return s.store.GetUserSettings(ctx, userID)
}

// UpdateUserSettings validates and persists user settings.
func (s *Service) UpdateUserSettings(ctx context.Context, settings repository.UserSettings) (repository.UserSettings, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return repository.UserSettings{}, errors.New("user context required")
	}
	if settings.StartingAge < 0 || settings.StartingAge > 120 {
		return repository.UserSettings{}, errors.New("starting age must be between 0 and 120")
	}
	return s.store.UpsertUserSettings(ctx, userID, settings)
}

func lookupGrowthRate(cfgs []repository.GrowthConfig, category string, itemType ItemType) float64 {
	key := normalizeCategoryForGrowth(itemType, category)
	for _, cfg := range cfgs {
		if cfg.Category == key {
			return clamp(cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct)
		}
	}
	return 0
}

func applyGrowth(amount float64, ratePct float64) float64 {
	return amount * (1 + ratePct/100.0)
}

func clamp(val, lo, hi float64) float64 {
	if val < lo {
		return lo
	}
	if val > hi {
		return hi
	}
	return val
}

// segregate items by type for the current year view.
func segregateItems(state map[string]itemState, year int) struct {
	Assets      []TimelineItem
	Liabilities []TimelineItem
	Income      []TimelineItem
	Expenses    []TimelineItem
} {
	out := struct {
		Assets      []TimelineItem
		Liabilities []TimelineItem
		Income      []TimelineItem
		Expenses    []TimelineItem
	}{}

	for _, st := range state {
		item := st.item
		if item.CreatedYear > year {
			continue
		}
		switch item.ItemType {
		case ItemTypeAsset:
			out.Assets = append(out.Assets, item)
		case ItemTypeLiability:
			out.Liabilities = append(out.Liabilities, item)
		case ItemTypeIncome:
			out.Income = append(out.Income, item)
		case ItemTypeExpense:
			out.Expenses = append(out.Expenses, item)
		}
	}

	// Sort descending by annual amount so API consumers receive deterministic, high-to-low ordering.
	sort.Slice(out.Assets, func(i, j int) bool { return out.Assets[i].AmountAnnual > out.Assets[j].AmountAnnual })
	sort.Slice(out.Liabilities, func(i, j int) bool { return out.Liabilities[i].AmountAnnual > out.Liabilities[j].AmountAnnual })
	sort.Slice(out.Income, func(i, j int) bool { return out.Income[i].AmountAnnual > out.Income[j].AmountAnnual })
	sort.Slice(out.Expenses, func(i, j int) bool { return out.Expenses[i].AmountAnnual > out.Expenses[j].AmountAnnual })

	return out
}

func sumAnnual(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AmountAnnual
	}
	return total
}

func sumAdjusted(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AdjustedAnnual
	}
	return total
}

func toGrowthApplied(cfg []repository.GrowthConfig) []GrowthApplied {
	out := make([]GrowthApplied, 0, len(cfg))
	for _, c := range cfg {
		out = append(out, GrowthApplied{Category: c.Category, AnnualRatePct: c.AnnualRatePct})
	}
	return out
}

func coalesceString(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return b
}

func normalizeFreq(freq string) Frequency {
	f := Frequency(strings.ToLower(strings.TrimSpace(freq)))
	if _, ok := freqFactors[f]; ok {
		return f
	}
	return FrequencyAnnual
}

func normalizeCategoryForGrowth(itemType ItemType, category string) string {
	cat := strings.ToLower(strings.TrimSpace(category))
	switch itemType {
	case ItemTypeAsset:
		switch cat {
		case "cash":
			return "asset_cash"
		case "investment", "equity", "stock", "stocks", "brokerage":
			return "asset_equity"
		case "property", "real_estate", "real-estate", "real estate":
			return "asset_property"
		}
		return "asset_cash"
	case ItemTypeLiability:
		switch cat {
		case "short-term", "short term", "credit", "credit-card", "credit card", "card", "debt", "loan":
			return "liability_debt"
		case "property", "mortgage", "home_loan", "home-loan", "home loan":
			return "liability_debt"
		}
		return "liability_debt"
	case ItemTypeIncome:
		switch cat {
		case "employment", "job", "salary", "side-income", "side income":
			return "income"
		}
		return "income"
	case ItemTypeExpense:
		switch cat {
		case "housing", "living", "transport", "travel", "food":
			return "expense"
		}
		return "expense"
	default:
		return cat
	}
}

func mapItems(items []TimelineItem) []scenario.Row {
	out := make([]scenario.Row, 0, len(items))
	for _, it := range items {
		out = append(out, scenario.Row{
			ID:           it.ItemID,
			Type:         string(it.ItemType),
			AmountAnnual: it.AmountAnnual,
		})
	}
	return out
}

func annotateItems(items []TimelineItem, rows []scenario.Row) []TimelineItem {
	byID := make(map[string]scenario.Row, len(rows))
	for _, r := range rows {
		byID[r.ID] = r
	}
	out := make([]TimelineItem, 0, len(items))
	for _, it := range items {
		it.AdjustedAnnual = it.AmountAnnual
		if r, ok := byID[it.ItemID]; ok {
			it.AdjustedAnnual = r.AmountAnnual
			it.EventImpacts = toImpactSummaries(r.EventImpacts)
		}
		out = append(out, it)
	}
	return out
}

func toImpactSummaries(imps []repository.ScenarioImpact) []EventImpactSummary {
	if len(imps) == 0 {
		return nil
	}
	out := make([]EventImpactSummary, 0, len(imps))
	for _, imp := range imps {
		out = append(out, EventImpactSummary{
			EventID:      imp.EventID,
			ImpactKind:   imp.ImpactKind,
			AmountAnnual: annualizeImpact(imp),
			Cadence:      imp.Cadence,
			Notes:        imp.Notes,
		})
	}
	return out
}

func annualizeImpact(imp repository.ScenarioImpact) float64 {
	switch strings.ToLower(imp.Cadence) {
	case "monthly":
		return float64(imp.Amount) * 12
	default:
		return float64(imp.Amount)
	}
}
