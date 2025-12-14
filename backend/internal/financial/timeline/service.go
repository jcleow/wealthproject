package timeline

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"time"

	"golang.org/x/sync/errgroup"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial/repayment"
	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
	"financial-chat-system/backend/internal/middleware"
)

const (
	defaultTotalYears             = 31 // years 0..30 inclusive (fallback)
	defaultVersion                = "v1"
	defaultCashInterestRateAnnual = 1.5 // Default annual interest rate for cash accounts (%)
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

// InitializeUserFinancialData creates default financial data for a new user.
// This should be called during user registration/onboarding to set up:
// - Default user settings (age, terminal age, resolution)
// - Default growth configs (per-category growth rates)
// - Default cash accumulator account
//
// This function should be called ONCE per user during registration.
// After initialization, the timeline service will only perform READ operations.
func (s *Service) InitializeUserFinancialData(ctx context.Context, userID string) error {
	// 1. Create default user settings
	_, err := s.store.UpsertUserSettings(ctx, userID, repository.UserSettings{
		StartingAge:       30,
		TerminalAge:       65,
		TimeResolution:    "yearly",
		YearDisplayFormat: "age", // Show age by default (more intuitive than year numbers)
		AutoExecuteTools:  false,
	})
	if err != nil {
		return fmt.Errorf("failed to create user settings: %w", err)
	}

	// 2. Create default growth configs
	err = s.store.UpsertGrowthConfigs(ctx, userID, repository.DefaultGrowthConfigs)
	if err != nil {
		return fmt.Errorf("failed to create growth configs: %w", err)
	}

	// 3. Create default cash account as accumulator
	_, err = s.store.CreateCashAccount(ctx, repository.CashAccount{
		UserID:        userID,
		Name:          "Cash",
		Balance:       0,
		InterestRate:  1.5, // Default interest rate
		IsAccumulator: true,
		StartYear:     time.Now().Year(),
	})
	if err != nil {
		return fmt.Errorf("failed to create default cash account: %w", err)
	}

	return nil
}

// GetTimeline returns the full timeline with optional resolution override and scenario application.
// This is the unified API for fetching timelines.
//
// Use TimelineOptions to configure:
// - Resolution: override user's preference ("yearly", "monthly", or "" for user default)
// - IncludeScenarios: apply scenario impacts if true
// - SelectedIDs: limit scenarios to specific IDs (empty = all scenarios)
//
// Example usage:
//
//	// Basic timeline with user's preferred resolution
//	resp, err := service.GetTimeline(ctx, TimelineOptions{})
//
//	// Monthly timeline
//	resp, err := service.GetTimeline(ctx, TimelineOptions{Resolution: "monthly"})
//
//	// Timeline with scenarios
//	resp, err := service.GetTimeline(ctx, TimelineOptions{IncludeScenarios: true})
//
//	// Monthly timeline with specific scenarios
//	resp, err := service.GetTimeline(ctx, TimelineOptions{
//	    Resolution: "monthly",
//	    IncludeScenarios: true,
//	    SelectedIDs: []string{"retirement-scenario-1"},
//	})
func (s *Service) GetTimeline(ctx context.Context, opts TimelineOptions) (TimelineResponse, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return TimelineResponse{}, errors.New("user context required")
	}

	// Determine resolution (user preference or override)
	resolution := opts.Resolution
	if resolution == "" {
		// Fetch user settings to get preferred resolution
		settings, err := s.store.GetUserSettings(ctx, userID)
		if err != nil {
			// If no settings found, default to yearly
			resolution = "yearly"
		} else {
			resolution = settings.TimeResolution
			if resolution == "" {
				resolution = "yearly"
			}
		}
	}

	// Build timeline using unified engine (always computes monthly, transforms if needed)
	resp, err := s.buildTimeline(ctx, userID, resolution)
	if err != nil {
		return TimelineResponse{}, err
	}

	// Apply scenarios if requested
	if opts.IncludeScenarios {
		resp, err = s.applyScenarios(ctx, userID, resp, opts.SelectedIDs)
		if err != nil {
			return TimelineResponse{}, err
		}
	}

	return resp, nil
}

// applyScenarios applies scenario impacts to an existing timeline response.
// Works with both yearly and monthly resolutions.
//
// Design: Scenarios are applied to the final timeline data (after computation and optional transformation).
// - For monthly resolution: applies to each month's items
// - For yearly resolution: applies to aggregated yearly items
//
// The scenario engine expects relative year indices (0 = current year, 1 = next year, etc.)
// and converts them to absolute dates using BaseYear internally.
//
// Returns the updated timeline response with scenarios applied.
func (s *Service) applyScenarios(ctx context.Context, userID string, resp TimelineResponse, selectedIDs []string) (TimelineResponse, error) {
	if s.scenarios == nil {
		return resp, nil
	}

	baseYear := time.Now().Year()
	applied := map[string]struct{}{}

	// First pass: apply scenarios to all items
	switch resp.Resolution {
	case "yearly":
		for i, year := range resp.Years {
			yearRows := make([]scenario.Row, 0, len(year.Assets)+len(year.Liabilities)+len(year.Income)+len(year.Expenses))
			apply := func(items []TimelineItem) []TimelineItem {
				rows := mapItems(items)
				// Convert absolute year to relative year index for scenario application
				relativeYear := year.Year - baseYear
				out, err := s.scenarios.Apply(ctx, scenario.ApplyRequest{
					UserID:      userID,
					Year:        relativeYear, // Use relative year (0, 1, 2...) not absolute (2025, 2026...)
					BaseYear:    baseYear,
					Rows:        rows,
					SelectedIDs: selectedIDs,
				})
				if err != nil {
					log.Printf("Warning: Failed to apply scenarios for year %d (relative %d): %v", year.Year, relativeYear, err)
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
		if len(resp.Years) > 0 {
			var accumulatorID string
			var cashGrowthRate float64
			accumulatedCash := 0.0

			// Find accumulator in year 0 cash accounts
			for _, ca := range resp.Years[0].CashAccounts {
				if ca.IsAccumulator {
					accumulatorID = ca.ItemID
					accumulatedCash = ca.AmountAnnual
					break
				}
			}
			// Get interest rate from year 0
			if resp.Years[0].AccumulatedCashEnd > 0 && resp.Years[0].InterestEarned > 0 {
				if len(resp.Years) > 1 && resp.Years[1].AccumulatedCashStart > 0 {
					cashGrowthRate = (resp.Years[1].InterestEarned / resp.Years[1].AccumulatedCashStart) * 100
				}
			}
			if cashGrowthRate == 0 {
				cashGrowthRate = defaultCashInterestRateAnnual
			}

			// Recalculate cash for each year
			for i := range resp.Years {
				year := &resp.Years[i]
				cashAtStart := accumulatedCash
				adjustedNetSavings := sumAdjusted(year.Income) - sumAdjusted(year.Expenses)

				interestEarned := 0.0
				if i > 0 {
					accumulatedCash += adjustedNetSavings
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

				year.AnnualNetSavings = adjustedNetSavings
				year.AccumulatedCashStart = cashAtStart
				year.AccumulatedCashEnd = accumulatedCash
				year.InterestEarned = interestEarned
				year.NetWorth = sumAdjusted(year.Assets) + sumCashAccountBalances(year.CashAccounts) - sumAdjusted(year.Liabilities)
			}
		}

	case "monthly":
		for i, month := range resp.Months {
			monthRows := make([]scenario.Row, 0, len(month.Assets)+len(month.Liabilities)+len(month.Income)+len(month.Expenses))
			apply := func(items []TimelineItem) []TimelineItem {
				rows := mapItems(items)
				out, err := s.scenarios.Apply(ctx, scenario.ApplyRequest{
					UserID:      userID,
					Year:        month.YearIndex,
					BaseYear:    baseYear,
					Rows:        rows,
					SelectedIDs: selectedIDs,
				})
				if err != nil {
					log.Printf("Warning: Failed to apply scenarios for month %d-%02d: %v", month.Year, month.Month, err)
					return items
				}
				monthRows = append(monthRows, out...)
				return annotateItems(items, out)
			}
			resp.Months[i].Assets = apply(month.Assets)
			resp.Months[i].Liabilities = apply(month.Liabilities)
			resp.Months[i].Income = apply(month.Income)
			resp.Months[i].Expenses = apply(month.Expenses)
			resp.Months[i].NetCash = sumAdjusted(resp.Months[i].Income) - sumAdjusted(resp.Months[i].Expenses)
			for _, r := range monthRows {
				for _, imp := range r.EventImpacts {
					applied[imp.EventID] = struct{}{}
				}
			}
		}

		// Second pass: recalculate cash accumulation for monthly resolution
		if len(resp.Months) > 0 {
			var accumulatorID string
			var cashGrowthRate float64
			accumulatedCash := 0.0

			// Find accumulator in first month cash accounts
			for _, ca := range resp.Months[0].CashAccounts {
				if ca.IsAccumulator {
					accumulatorID = ca.ItemID
					accumulatedCash = ca.AmountMonthly
					break
				}
			}
			// Get monthly interest rate from first month
			if resp.Months[0].AccumulatedCashEnd > 0 && resp.Months[0].InterestEarned > 0 {
				if len(resp.Months) > 1 && resp.Months[1].AccumulatedCashStart > 0 {
					cashGrowthRate = (resp.Months[1].InterestEarned / resp.Months[1].AccumulatedCashStart) * 100
				}
			}
			if cashGrowthRate == 0 {
				// Default to 1.5% annual = ~0.125% monthly
				cashGrowthRate = defaultCashInterestRateAnnual / 12.0
			}

			// Recalculate cash for each month
			for i := range resp.Months {
				month := &resp.Months[i]
				cashAtStart := accumulatedCash
				// Use monthly amounts for monthly resolution
				adjustedNetSavings := sumAdjustedMonthly(month.Income) - sumAdjustedMonthly(month.Expenses)

				interestEarned := 0.0
				// Only accumulate starting from month 12 (year 1) - year 0 is baseline
				if month.MonthIndex >= 12 {
					accumulatedCash += adjustedNetSavings
					interestEarned = accumulatedCash * (cashGrowthRate / 100.0)
					accumulatedCash += interestEarned
				}

				// Update cash account balances
				for j := range month.CashAccounts {
					if month.CashAccounts[j].ItemID == accumulatorID || month.CashAccounts[j].IsAccumulator {
						month.CashAccounts[j].AmountAnnual = accumulatedCash
						month.CashAccounts[j].AmountMonthly = accumulatedCash
						month.CashAccounts[j].AdjustedAnnual = accumulatedCash
						month.CashAccounts[j].AdjustedMonthly = accumulatedCash
					}
				}

				month.MonthlyNetSavings = adjustedNetSavings
				month.AccumulatedCashStart = cashAtStart
				month.AccumulatedCashEnd = accumulatedCash
				month.InterestEarned = interestEarned
				month.NetWorth = sumAdjustedMonthly(month.Assets) + sumCashAccountBalances(month.CashAccounts) - sumAdjustedMonthly(month.Liabilities)
			}
		}
	}

	// Collect applied scenario IDs
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
		log.Printf("[UpsertYear] Processing edit: ItemID=%v, ItemType=%s, Amount=%.2f, Name=%v",
			edit.ItemID, edit.ItemType, edit.Amount, edit.Name)
		if err := validateEdit(edit); err != nil {
			return TimelineResponse{}, err
		}
		if err := s.applyEdit(ctx, userID, year, edit); err != nil {
			return TimelineResponse{}, err
		}
	}
	// Use user's preferred resolution for the rebuilt timeline
	resolution := userSettings.TimeResolution
	if resolution == "" {
		resolution = "yearly"
	}
	return s.buildTimeline(ctx, userID, resolution)
}

func validateEdit(edit EditRequest) error {
	if edit.ItemType == "" {
		return errors.New("itemType is required")
	}
	if _, ok := freqFactors[edit.Frequency]; !ok {
		return errUnsupportedFrequency
	}
	// Allow amount of 0 for deletions, but not negative amounts
	if edit.Amount < 0 {
		return errors.New("amount cannot be negative")
	}
	// For non-zero amounts (creates/updates), validate name is provided for new items
	if edit.Amount > 0 && edit.ItemID == nil && (edit.Name == nil || strings.TrimSpace(*edit.Name) == "") {
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

	// Convert relative year to absolute year for storage
	// Database expects absolute years (2025, 2026, etc.)
	// year parameter is relative (0, 1, 2, etc.)
	baseYear := time.Now().Year()
	absoluteStartYear := baseYear + year

	// Otherwise, create or update the item
	switch edit.ItemType {
	case ItemTypeAsset:
		_, err := s.store.CreateAsset(ctx, userID, repository.Asset{
			ParentID:         parentID,
			Name:             name,
			Category:         category,
			CurrentValue:     edit.Amount,
			AnnualGrowthRate: 0,
			StartDate:        time.Date(absoluteStartYear, 1, 1, 0, 0, 0, 0, time.UTC),
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
			StartDate:       time.Date(absoluteStartYear, 1, 1, 0, 0, 0, 0, time.UTC),
		})
		return err
	case ItemTypeIncome:
		_, err := s.store.CreateIncome(ctx, userID, repository.Income{
			ParentID:  parentID,
			Source:    name,
			Amount:    edit.Amount,
			Frequency: string(edit.Frequency),
			StartDate: time.Date(absoluteStartYear, 1, 1, 0, 0, 0, 0, time.UTC),
		})
		return err
	case ItemTypeExpense:
		_, err := s.store.CreateExpense(ctx, userID, repository.Expense{
			ParentID:  parentID,
			Payee:     name,
			Amount:    edit.Amount,
			Frequency: string(edit.Frequency),
			StartDate: time.Date(absoluteStartYear, 1, 1, 0, 0, 0, 0, time.UTC),
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
	growthRate float64   // Per-item growth rate (percentage)
	frequency  Frequency // Track frequency for one_time handling
	startMonth int       // Month when item was created (for one_time expiry)
	startYear  int       // Year when item was created (relative, for one_time expiry)
}

type FinancialDataRow struct {
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

func (s *Service) buildTimeline(ctx context.Context, userID string, resolution string) (TimelineResponse, error) {
	// Parallel data fetching using errgroup for 5x speedup
	g, gctx := errgroup.WithContext(ctx)

	var (
		userSettings repository.UserSettings
		growthCfg    []repository.GrowthConfig
		accumulator  repository.CashAccount
		cashAccounts []repository.CashAccount
		rows         []FinancialDataRow
	)

	// Launch 5 goroutines in parallel - all are pure reads with no dependencies
	g.Go(func() error {
		var err error
		userSettings, err = s.store.GetUserSettings(gctx, userID)
		return err
	})

	g.Go(func() error {
		var err error
		growthCfg, err = s.store.GetGrowthConfigs(gctx, userID)
		// If empty, use defaults (in-memory only, don't persist during GET)
		if err == nil && len(growthCfg) == 0 {
			growthCfg = repository.DefaultGrowthConfigs
		}
		return err
	})

	g.Go(func() error {
		var err error
		accumulator, err = s.store.GetAccumulatorAccount(gctx, userID)
		if err != nil {
			return fmt.Errorf("no accumulator account found: %w", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		cashAccounts, err = s.store.ListCashAccounts(gctx, userID, repository.DateRangeOptions{})
		return err
	})

	g.Go(func() error {
		var err error
		rows, err = s.loadEffectiveRows(gctx, userID)
		return err
	})

	// Wait for all parallel fetches to complete (fail-fast on first error)
	if err := g.Wait(); err != nil {
		return TimelineResponse{}, err
	}

	// NEW UNIFIED APPROACH: Always compute monthly, then transform if needed
	monthlyResp, err := s.computeMonthlyTimeline(userSettings, growthCfg, accumulator, cashAccounts, rows)
	if err != nil {
		return TimelineResponse{}, err
	}

	// If resolution is monthly, return as-is
	if resolution == "monthly" {
		return monthlyResp, nil
	}

	// Otherwise, aggregate months into years for yearly resolution
	return s.transformMonthsToYears(monthlyResp, userSettings), nil
}

// computeMonthlyTimeline is the unified computation engine that always computes at monthly resolution.
// This is the single source of truth for all timeline calculations.
func (s *Service) computeMonthlyTimeline(
	userSettings repository.UserSettings,
	growthCfg []repository.GrowthConfig,
	accumulator repository.CashAccount,
	cashAccounts []repository.CashAccount,
	rows []FinancialDataRow,
) (TimelineResponse, error) {
	// Calculate total months from user settings
	totalYears := defaultTotalYears
	if userSettings.TerminalAge > userSettings.StartingAge {
		totalYears = userSettings.TerminalAge - userSettings.StartingAge + 1
	}
	totalMonths := totalYears * 12

	// Determine compounding frequency (monthly or annual)
	useMonthlyCompounding := userSettings.CompoundingFrequency == "monthly" || userSettings.CompoundingFrequency == ""

	baseYear := time.Now().Year()

	// Group rows by start year and month for efficient lookup
	rowsByYearMonth := map[string][]FinancialDataRow{}
	for _, r := range rows {
		relativeYear := r.StartYear - baseYear
		startMonth := 1 // Default to January if not specified
		key := formatYearMonth(relativeYear, startMonth)
		rowsByYearMonth[key] = append(rowsByYearMonth[key], r)
	}

	state := map[string]itemState{}

	// Track accumulated cash (starts from accumulator's initial balance)
	accumulatedCash := accumulator.Balance
	cashGrowthRate := accumulator.InterestRate
	monthlyInterestRate := math.Pow(1+cashGrowthRate/100, 1.0/12.0) - 1

	months := make([]TimelineMonth, totalMonths)
	for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
		year := monthIdx / 12
		month := (monthIdx % 12) + 1
		cashAtStart := accumulatedCash

		// Expire items by end_year (convert absolute end year to relative)
		for id, st := range state {
			if st.endYear != nil {
				relativeEndYear := *st.endYear - baseYear
				if year > relativeEndYear {
					delete(state, id)
				}
			}
		}

		// Expire one-time items after their start month (they only occur once)
		// This is a second layer of protection - endDate should also prevent recurrence
		for id, st := range state {
			if st.frequency == FrequencyOneTime {
				// One-time items only appear in their start month
				// Remove them after that month is processed
				if year > st.startYear || (year == st.startYear && month > st.startMonth) {
					delete(state, id)
				}
			}
		}

		// Apply growth (only after first full year - month 12 onwards)
		if monthIdx >= 12 {
			for id, st := range state {
				// Use per-item growth rate if explicitly set, otherwise fallback to category defaults
				rate := st.growthRate
				if rate == 0 && st.item.ItemType != ItemTypeIncome && st.item.ItemType != ItemTypeExpense {
					// For assets/liabilities without explicit rate, use category default
					rate = lookupGrowthRate(growthCfg, st.item.Category, st.item.ItemType)
				}

				// Apply growth based on compounding frequency
				if useMonthlyCompounding {
					// Monthly compound growth
					monthlyRate := math.Pow(1+rate/100, 1.0/12.0) - 1
					st.amount = st.amount * (1 + monthlyRate)
				} else {
					// Annual step growth (only on January of each year)
					if month == 1 {
						st.amount = applyGrowth(st.amount, rate)
					}
				}

				// For snapshots (assets/liabilities), both monthly and annual show the same balance
				// For flows (income/expenses), annual = monthly * 12
				if st.item.ItemType == ItemTypeAsset || st.item.ItemType == ItemTypeLiability {
					st.item.AmountAnnual = st.amount
					st.item.AmountMonthly = st.amount
					st.item.AdjustedAnnual = st.amount
					st.item.AdjustedMonthly = st.amount
				} else {
					st.item.AmountAnnual = st.amount * 12
					st.item.AmountMonthly = st.amount
					st.item.AdjustedAnnual = st.item.AmountAnnual
					st.item.AdjustedMonthly = st.amount
				}
				state[id] = st
			}
		}

		// Add new items starting this month
		hasOverride := false
		key := formatYearMonth(year, month)
		for _, r := range rowsByYearMonth[key] {
			var monthly, annual float64

			// For assets and liabilities, Amount is a point-in-time balance (snapshot)
			// For income and expenses, Amount is a recurring amount that needs frequency conversion
			if r.ItemType == ItemTypeAsset || r.ItemType == ItemTypeLiability {
				monthly = r.Amount
				annual = r.Amount
			} else {
				var err error
				monthly, err = ConvertToMonthly(r.Amount, r.Frequency)
				if err != nil {
					return TimelineResponse{}, err
				}
				annual = monthly * 12
			}

			if r.Amount == 0 {
				delete(state, r.ParentID)
				hasOverride = true
				continue
			}

			// Store end year as absolute year (not relative)
			var endYearPtr *int
			if r.EndYear.Valid {
				val := int(r.EndYear.Int32)
				endYearPtr = &val
			}

			// Convert absolute StartYear to relative year for StartYear
			relativeStartYear := r.StartYear - baseYear

			state[r.ParentID] = itemState{
				item: TimelineItem{
					ItemID:          r.ParentID,
					RowID:           r.ID,
					ParentID:        r.ParentID,
					Name:            r.Name,
					Category:        r.Category,
					AmountAnnual:    annual,
					AmountMonthly:   monthly,
					AdjustedAnnual:  annual,
					AdjustedMonthly: monthly,
					SourceAmount:    &r.Amount,
					SourceFrequency: string(r.Frequency),
					ItemType:        r.ItemType,
					StartYear:       relativeStartYear,
					StartMonth:      month,
					GrowthRate:      r.GrowthRate,
				},
				amount:     monthly, // Store monthly amount for growth calculations
				endYear:    endYearPtr,
				growthRate: r.GrowthRate,
				frequency:  r.Frequency,
				startMonth: month,
				startYear:  year,
			}
		}

		monthItems := segregateItemsMonthly(state, year, month)

		// Calculate monthly net savings (income - expenses)
		monthlyNetSavings := sumMonthly(monthItems.Income) - sumMonthly(monthItems.Expenses)

		// Only accumulate starting from month 12 (year 1) - year 0 is baseline
		interestEarned := 0.0
		if monthIdx >= 12 {
			// Accumulate surplus into cash
			accumulatedCash += monthlyNetSavings

			// Apply monthly interest to accumulated cash
			interestEarned = accumulatedCash * monthlyInterestRate
			accumulatedCash += interestEarned
		}

		// Build cash account items for this month
		cashItems := buildCashItemsMonthly(cashAccounts, accumulator.ID, accumulatedCash, year, monthIdx)

		// Calculate totals
		totalCash := sumCashAccountBalances(cashItems)
		totalAssets := sumMonthly(monthItems.Assets)
		netWorth := totalAssets + totalCash - sumMonthly(monthItems.Liabilities)

		months[monthIdx] = TimelineMonth{
			Year:          baseYear + year,
			Month:         month,
			YearIndex:     year,
			MonthIndex:    monthIdx,
			Assets:        monthItems.Assets,
			CashAccounts:  cashItems,
			Liabilities:   monthItems.Liabilities,
			Income:        monthItems.Income,
			Expenses:      monthItems.Expenses,
			NetCash:       monthlyNetSavings,
			NetWorth:      netWorth,
			HasOverrides:  hasOverride,
			GrowthApplied: toGrowthApplied(growthCfg),

			// Monthly cash accumulation fields
			MonthlyNetSavings:    monthlyNetSavings,
			AccumulatedCashStart: cashAtStart,
			AccumulatedCashEnd:   accumulatedCash,
			InterestEarned:       interestEarned,
			AccumulatorAccountID: accumulator.ID,
		}
	}

	return TimelineResponse{
		Resolution: "monthly",
		Months:     months,
		Version:    defaultVersion,
	}, nil
}

// transformMonthsToYears aggregates monthly timeline data into yearly bars.
// Takes December snapshot for assets/liabilities, sums income/expenses over 12 months.
func (s *Service) transformMonthsToYears(monthlyResp TimelineResponse, userSettings repository.UserSettings) TimelineResponse {
	if len(monthlyResp.Months) == 0 {
		return TimelineResponse{Resolution: "yearly", Version: defaultVersion, Years: []TimelineYear{}}
	}

	totalYears := len(monthlyResp.Months) / 12
	years := make([]TimelineYear, 0, totalYears)

	for yearIdx := 0; yearIdx < totalYears; yearIdx++ {
		// December month (end of year) - use as snapshot for assets/liabilities/cash
		decemberIdx := (yearIdx * 12) + 11
		if decemberIdx >= len(monthlyResp.Months) {
			break
		}
		december := monthlyResp.Months[decemberIdx]

		// Aggregate income and expenses over all 12 months
		var yearIncome, yearExpenses []TimelineItem
		annualNetSavings := 0.0

		// Collect all unique items from the 12 months
		incomeByID := make(map[string]TimelineItem)
		expenseByID := make(map[string]TimelineItem)

		for monthOffset := 0; monthOffset < 12; monthOffset++ {
			monthIdx := yearIdx*12 + monthOffset
			if monthIdx >= len(monthlyResp.Months) {
				break
			}
			month := monthlyResp.Months[monthIdx]

			// Sum up monthly net savings to get annual
			annualNetSavings += month.MonthlyNetSavings

			// Track income items (sum their monthly amounts)
			for _, item := range month.Income {
				if existing, ok := incomeByID[item.ItemID]; ok {
					existing.AmountAnnual += item.AmountMonthly
					existing.AdjustedAnnual += item.AdjustedMonthly
					incomeByID[item.ItemID] = existing
				} else {
					// First occurrence - start with this month's value
					newItem := item
					newItem.AmountAnnual = item.AmountMonthly
					newItem.AdjustedAnnual = item.AdjustedMonthly
					incomeByID[item.ItemID] = newItem
				}
			}

			// Track expense items (sum their monthly amounts)
			for _, item := range month.Expenses {
				if existing, ok := expenseByID[item.ItemID]; ok {
					existing.AmountAnnual += item.AmountMonthly
					existing.AdjustedAnnual += item.AdjustedMonthly
					expenseByID[item.ItemID] = existing
				} else {
					newItem := item
					newItem.AmountAnnual = item.AmountMonthly
					newItem.AdjustedAnnual = item.AdjustedMonthly
					expenseByID[item.ItemID] = newItem
				}
			}
		}

		// Convert maps to slices
		for _, item := range incomeByID {
			yearIncome = append(yearIncome, item)
		}
		for _, item := range expenseByID {
			yearExpenses = append(yearExpenses, item)
		}

		// Sort by amount descending
		sort.Slice(yearIncome, func(i, j int) bool { return yearIncome[i].AmountAnnual > yearIncome[j].AmountAnnual })
		sort.Slice(yearExpenses, func(i, j int) bool { return yearExpenses[i].AmountAnnual > yearExpenses[j].AmountAnnual })

		// Use December's assets, liabilities, and cash (point-in-time snapshots)
		years = append(years, TimelineYear{
			Year:                 december.Year,
			Assets:               december.Assets,
			CashAccounts:         december.CashAccounts,
			Liabilities:          december.Liabilities,
			Income:               yearIncome,
			Expenses:             yearExpenses,
			NetCash:              annualNetSavings,
			NetWorth:             december.NetWorth,
			HasOverrides:         december.HasOverrides,
			GrowthApplied:        december.GrowthApplied,
			AnnualNetSavings:     annualNetSavings,
			AccumulatedCashStart: monthlyResp.Months[yearIdx*12].AccumulatedCashStart,
			AccumulatedCashEnd:   december.AccumulatedCashEnd,
			InterestEarned:       sumInterestForYear(monthlyResp.Months, yearIdx),
			AccumulatorAccountID: december.AccumulatorAccountID,
		})
	}

	return TimelineResponse{
		Resolution:       "yearly",
		Years:            years,
		Version:          defaultVersion,
		ScenariosApplied: monthlyResp.ScenariosApplied,
	}
}

// sumInterestForYear sums up all monthly interest earned in a given year.
func sumInterestForYear(months []TimelineMonth, yearIdx int) float64 {
	total := 0.0
	for monthOffset := 0; monthOffset < 12; monthOffset++ {
		monthIdx := yearIdx*12 + monthOffset
		if monthIdx >= len(months) {
			break
		}
		total += months[monthIdx].InterestEarned
	}
	return total
}

// formatYearMonth creates a lookup key for year-month combinations.
func formatYearMonth(year, month int) string {
	return fmt.Sprintf("%d:%d", year, month)
}

// segregateItemsMonthly segregates items by type for the current month view.
func segregateItemsMonthly(state map[string]itemState, year, month int) struct {
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
		// Check if item has started
		if item.StartYear > year {
			continue
		}
		if item.StartYear == year && item.StartMonth > month {
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

	// Sort descending by monthly amount
	sort.Slice(out.Assets, func(i, j int) bool { return out.Assets[i].AmountMonthly > out.Assets[j].AmountMonthly })
	sort.Slice(out.Liabilities, func(i, j int) bool { return out.Liabilities[i].AmountMonthly > out.Liabilities[j].AmountMonthly })
	sort.Slice(out.Income, func(i, j int) bool { return out.Income[i].AmountMonthly > out.Income[j].AmountMonthly })
	sort.Slice(out.Expenses, func(i, j int) bool { return out.Expenses[i].AmountMonthly > out.Expenses[j].AmountMonthly })

	return out
}

// sumMonthly sums monthly amounts from timeline items.
func sumMonthly(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AmountMonthly
	}
	return total
}

// buildCashItemsMonthly converts cash accounts to timeline items for a given month.
func buildCashItemsMonthly(accounts []repository.CashAccount, accumulatorID string, accumulatedBalance float64, year, monthIdx int) []TimelineItem {
	items := make([]TimelineItem, 0, len(accounts))
	baseYear := time.Now().Year()

	for _, acc := range accounts {
		// Convert absolute years to relative for comparison
		relativeStartYear := acc.StartYear - baseYear

		// Check if account is active for this year
		if relativeStartYear > year {
			continue
		}
		if acc.EndYear.Valid {
			relativeEndYear := int(acc.EndYear.Int32) - baseYear
			if relativeEndYear < year {
				continue
			}
		}

		balance := acc.Balance
		isAccumulator := acc.ID == accumulatorID

		if isAccumulator {
			// Accumulator uses the running accumulated balance
			balance = accumulatedBalance
		} else if monthIdx > 0 {
			// Non-accumulator accounts compound monthly with their own interest rate
			monthlyRate := math.Pow(1+acc.InterestRate/100, 1.0/12.0) - 1
			balance = acc.Balance * math.Pow(1+monthlyRate, float64(monthIdx))
		}

		items = append(items, TimelineItem{
			ItemID:          acc.ID,
			Name:            acc.Name,
			Category:        "cash",
			AmountAnnual:    balance, // Cash balances are not annualized (not recurring)
			AmountMonthly:   balance,
			AdjustedAnnual:  balance,
			AdjustedMonthly: balance,
			ItemType:        ItemTypeCashAccount,
			IsAccumulator:   isAccumulator,
		})
	}

	// Sort by balance descending
	sort.Slice(items, func(i, j int) bool {
		return items[i].AmountMonthly > items[j].AmountMonthly
	})

	return items
}

// buildCashItems converts cash accounts to timeline items for a given year.
// The accumulator account uses the accumulated balance; others compound with their own rate.
func buildCashItems(accounts []repository.CashAccount, accumulatorID string, accumulatedBalance float64, year int) []TimelineItem {
	items := make([]TimelineItem, 0, len(accounts))
	baseYear := time.Now().Year()

	for _, acc := range accounts {
		// Convert absolute years to relative for comparison
		relativeStartYear := acc.StartYear - baseYear

		// Check if account is active for this year
		if relativeStartYear > year {
			continue
		}
		if acc.EndYear.Valid {
			relativeEndYear := int(acc.EndYear.Int32) - baseYear
			if relativeEndYear < year {
				continue
			}
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

func (s *Service) loadEffectiveRows(ctx context.Context, userID string) ([]FinancialDataRow, error) {
	rows := []FinancialDataRow{}
	baseYear := time.Now().Year()

	expenses, err := s.store.ListAllExpenses(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, err
	}
	expenseByLiability := map[string]struct{}{}
	for _, exp := range expenses {
		if exp.SourceLiabilityID != nil {
			expenseByLiability[*exp.SourceLiabilityID] = struct{}{}
		}
	}

	assets, err := s.store.ListAllAssets(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, err
	}
	for _, a := range assets {
		// Convert StartDate to year, default to baseYear if not set
		startYear := a.StartDate.Year()
		if startYear == 0 || a.StartDate.IsZero() {
			startYear = baseYear
		}
		// Convert EndDate to NullInt32
		var endYear sql.NullInt32
		if a.EndDate != nil {
			endYear = sql.NullInt32{Int32: int32(a.EndDate.Year()), Valid: true}
		}
		rows = append(rows, FinancialDataRow{
			ID:         a.ID,
			ParentID:   coalesceString(a.ParentID, a.ID),
			Name:       a.Name,
			Category:   a.Category,
			Amount:     a.CurrentValue,
			Frequency:  FrequencyAnnual, // Assets are point-in-time balances, no frequency concept
			StartYear:  startYear,
			EndYear:    endYear,
			ItemType:   ItemTypeAsset,
			GrowthRate: a.AnnualGrowthRate,
		})
	}

	liabilities, err := s.store.ListAllLiabilities(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, err
	}
	for _, li := range liabilities {
		// Convert StartDate to year, default to baseYear if not set
		startYear := li.StartDate.Year()
		if startYear == 0 || li.StartDate.IsZero() {
			startYear = baseYear
		}
		// Convert EndDate to NullInt32
		var endYear sql.NullInt32
		if li.EndDate != nil {
			endYear = sql.NullInt32{Int32: int32(li.EndDate.Year()), Valid: true}
		}
		rows = append(rows, FinancialDataRow{
			ID:         li.ID,
			ParentID:   coalesceString(li.ParentID, li.ID),
			Name:       li.Name,
			Category:   li.Category,
			Amount:     li.CurrentBalance,
			Frequency:  FrequencyAnnual, // Liabilities are point-in-time balances, no frequency concept
			StartYear:  startYear,
			EndYear:    endYear,
			ItemType:   ItemTypeLiability,
			GrowthRate: 0, // Use category default (-3%) - liabilities decrease as you pay them down
		})

		// Generate computed repayment expense for liabilities with end_date
		if li.EndDate != nil && li.CurrentBalance > 0 {
			if _, hasLinkedExpense := expenseByLiability[li.ID]; hasLinkedExpense {
				continue
			}
			repaymentRow := s.generateRepaymentExpense(li, startYear, endYear)
			if repaymentRow != nil {
				rows = append(rows, *repaymentRow)
			}
		}
	}

	incomes, err := s.store.ListAllIncomes(ctx, userID, repository.DateRangeOptions{})
	if err != nil {
		return nil, err
	}
	for _, it := range incomes {
		// Convert StartDate to year, default to baseYear if not set
		startYear := it.StartDate.Year()
		if startYear == 0 || it.StartDate.IsZero() {
			startYear = baseYear
		}
		// Convert EndDate to NullInt32
		var endYear sql.NullInt32
		if it.EndDate != nil {
			endYear = sql.NullInt32{Int32: int32(it.EndDate.Year()), Valid: true}
		}
		rows = append(rows, FinancialDataRow{
			ID:         it.ID,
			ParentID:   coalesceString(it.ParentID, it.ID),
			Name:       it.Source,
			Category:   it.Category,
			Amount:     it.Amount,
			Frequency:  normalizeFreq(it.Frequency),
			StartYear:  startYear,
			EndYear:    endYear,
			ItemType:   ItemTypeIncome,
			GrowthRate: it.GrowthRate,
		})
	}

	for _, it := range expenses {
		// Convert StartDate to year, default to baseYear if not set
		startYear := it.StartDate.Year()
		if startYear == 0 || it.StartDate.IsZero() {
			startYear = baseYear
		}
		// Convert EndDate to NullInt32
		var endYear sql.NullInt32
		if it.EndDate != nil {
			endYear = sql.NullInt32{Int32: int32(it.EndDate.Year()), Valid: true}
		}
		rows = append(rows, FinancialDataRow{
			ID:         it.ID,
			ParentID:   coalesceString(it.ParentID, it.ID),
			Name:       it.Payee,
			Category:   it.Category,
			Amount:     it.Amount,
			Frequency:  normalizeFreq(it.Frequency),
			StartYear:  startYear,
			EndYear:    endYear,
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

// generateRepaymentExpense creates a synthetic expense row for a liability's monthly payment.
// This is computed on-the-fly using the repayment module (no stored expense record).
func (s *Service) generateRepaymentExpense(li repository.Liability, startYear int, endYear sql.NullInt32) *FinancialDataRow {
	if li.EndDate == nil || li.CurrentBalance <= 0 {
		return nil
	}

	// Calculate total months between start and end
	months := int(li.EndDate.Sub(li.StartDate).Hours() / 24 / 30)
	if months <= 0 {
		return nil
	}

	// Get repayment strategy
	strategyType := repayment.StrategyType(li.RepaymentStrategy)
	if li.RepaymentStrategy == "" {
		strategyType = repayment.StandardAmortization
	}
	strategy := repayment.GetStrategy(strategyType)

	// Calculate monthly payment using the repayment module
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(li.CurrentBalance),
		InterestRateAPR: decimal.MustFromFloat64(li.InterestRateAPR),
		MinimumPayment:  decimal.MustFromFloat64(li.MinimumPayment),
		PeriodIndex:     0,
		TotalPeriods:    months,
	})
	if err != nil || result.MonthlyPayment.IsZero() {
		return nil
	}

	monthlyPayment := result.MonthlyPayment.ToFloat64()
	if monthlyPayment <= 0 {
		return nil
	}

	return &FinancialDataRow{
		ID:         li.ID + "-payment",
		ParentID:   li.ID + "-payment",
		Name:       li.Name + " Payment",
		Category:   "loan_repayment",
		Amount:     monthlyPayment,
		Frequency:  FrequencyMonthly,
		StartYear:  startYear,
		EndYear:    endYear,
		ItemType:   ItemTypeExpense,
		GrowthRate: 0, // Loan payments don't grow (fixed strategy)
	}
}

// GetGrowthConfig returns the current growth configuration.
// Returns default growth configs in-memory if none are persisted.
func (s *Service) GetGrowthConfig(ctx context.Context) ([]repository.GrowthConfig, error) {
	userID := getUserIDFromContext(ctx)
	if userID == "" {
		return nil, errors.New("user context required")
	}
	cfgs, err := s.store.GetGrowthConfigs(ctx, userID)
	if err != nil {
		return nil, err
	}
	// Return defaults if none persisted (but don't persist them during GET)
	if len(cfgs) == 0 {
		return repository.DefaultGrowthConfigs, nil
	}
	return cfgs, nil
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
		if item.StartYear > year {
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

func sumAdjustedMonthly(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AdjustedMonthly
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
	// Handle common variations
	switch f {
	case "onetime", "one-time", "once":
		return FrequencyOneTime
	case "yearly":
		return FrequencyAnnual
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
