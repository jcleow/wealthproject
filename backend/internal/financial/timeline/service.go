package timeline

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
	"financial-chat-system/backend/internal/financial/scenario"
)

const (
	totalYears        = 31 // years 0..30 inclusive
	defaultVersion    = "v1"
	defaultLowerBound = -50.0
	defaultUpperBound = 50.0
)

var defaultGrowth = []repository.GrowthConfig{
	{Category: "asset_cash", AnnualRatePct: 1.5, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
	{Category: "asset_equity", AnnualRatePct: 6.0, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
	{Category: "asset_property", AnnualRatePct: 3.0, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
	{Category: "liability_debt", AnnualRatePct: -3.0, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
	{Category: "income", AnnualRatePct: 3.0, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
	{Category: "expense", AnnualRatePct: 2.0, LowerBoundPct: defaultLowerBound, UpperBoundPct: defaultUpperBound},
}

// Service encapsulates timeline logic.
type Service struct {
	store     Store
	scenarios scenarioApplier
}

type scenarioApplier interface {
	Apply(ctx context.Context, req scenario.ApplyRequest) ([]scenario.Row, error)
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
	return s.buildTimeline(ctx)
}

// GetTimelineWithScenarios optionally merges scenarios for a given user/year selection.
func (s *Service) GetTimelineWithScenarios(ctx context.Context, userID string, include bool, selectedIDs []string) (TimelineResponse, error) {
	resp, err := s.buildTimeline(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}
	if !include || s.scenarios == nil || strings.TrimSpace(userID) == "" {
		return resp, nil
	}

	applied := map[string]struct{}{}
	for i, year := range resp.Years {
		yearRows := make([]scenario.Row, 0, len(year.Assets)+len(year.Liabilities)+len(year.Income)+len(year.Expenses))
		apply := func(items []TimelineItem) []TimelineItem {
			rows := mapItems(items)
			out, err := s.scenarios.Apply(ctx, scenario.ApplyRequest{
				UserID:      userID,
				Year:        year.Year,
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
		for _, r := range yearRows {
			for _, imp := range r.EventImpacts {
				applied[imp.EventID] = struct{}{}
			}
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
	if year < 0 || year >= totalYears {
		return TimelineResponse{}, errors.New("year must be between 0 and 30")
	}
	for _, edit := range edits {
		if err := validateEdit(edit); err != nil {
			return TimelineResponse{}, err
		}
		if err := s.applyEdit(ctx, year, edit); err != nil {
			return TimelineResponse{}, err
		}
	}
	return s.buildTimeline(ctx)
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

func (s *Service) applyEdit(ctx context.Context, year int, edit EditRequest) error {
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
		_, err := s.store.CreateAsset(ctx, repository.Asset{
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
		_, err := s.store.CreateLiability(ctx, repository.Liability{
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
		_, err := s.store.CreateIncome(ctx, repository.Income{
			ParentID:  parentID,
			Source:    name,
			Amount:    edit.Amount,
			Frequency: string(edit.Frequency),
			StartDate: &now,
			StartYear: year,
		})
		return err
	case ItemTypeExpense:
		_, err := s.store.CreateExpense(ctx, repository.Expense{
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
	item    TimelineItem
	amount  float64
	endYear *int
}

type effectiveRow struct {
	ParentID  string
	Name      string
	Category  string
	Amount    float64
	Frequency Frequency
	StartYear int
	EndYear   sql.NullInt32
	ItemType  ItemType
}

func (s *Service) buildTimeline(ctx context.Context) (TimelineResponse, error) {
	growthCfg, err := s.ensureGrowth(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}

	rows, err := s.loadEffectiveRows(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}
	rowsByYear := map[int][]effectiveRow{}
	for _, r := range rows {
		rowsByYear[r.StartYear] = append(rowsByYear[r.StartYear], r)
	}

	state := map[string]itemState{}

	years := make([]TimelineYear, totalYears)
	for year := 0; year < totalYears; year++ {
		// expire by end_year
		for id, st := range state {
			if st.endYear != nil && year > *st.endYear {
				delete(state, id)
			}
		}

		if year > 0 {
			for id, st := range state {
				rate := lookupGrowthRate(growthCfg, st.item.Category, st.item.ItemType)
				st.amount = applyGrowth(st.amount, rate)
				st.item.AmountAnnual = st.amount
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
					Name:            r.Name,
					Category:        r.Category,
					AmountAnnual:    annual,
					SourceAmount:    &r.Amount,
					SourceFrequency: string(r.Frequency),
					ItemType:        r.ItemType,
					CreatedYear:     r.StartYear,
				},
				amount:  annual,
				endYear: endYearPtr,
			}
		}

		yearItems := segregateItems(state, year)
		netCash := sumAnnual(yearItems.Income) - sumAnnual(yearItems.Expenses)
		netWorth := sumAnnual(yearItems.Assets) - sumAnnual(yearItems.Liabilities)

		years[year] = TimelineYear{
			Year:          year,
			Assets:        yearItems.Assets,
			Liabilities:   yearItems.Liabilities,
			Income:        yearItems.Income,
			Expenses:      yearItems.Expenses,
			NetCash:       netCash,
			NetWorth:      netWorth,
			HasOverrides:  hasOverride,
			GrowthApplied: toGrowthApplied(growthCfg),
		}
	}

	resp := TimelineResponse{
		Years:   years,
		Version: defaultVersion,
	}
	return resp, nil
}

func (s *Service) loadEffectiveRows(ctx context.Context) ([]effectiveRow, error) {
	rows := []effectiveRow{}

	assets, err := s.store.ListAssets(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range assets {
		rows = append(rows, effectiveRow{
			ParentID:  coalesceString(a.ParentID, a.ID),
			Name:      a.Name,
			Category:  a.Category,
			Amount:    a.CurrentValue,
			Frequency: normalizeFreq(a.Frequency),
			StartYear: a.StartYear,
			EndYear:   a.EndYear,
			ItemType:  ItemTypeAsset,
		})
	}

	liabilities, err := s.store.ListLiabilities(ctx)
	if err != nil {
		return nil, err
	}
	for _, li := range liabilities {
		rows = append(rows, effectiveRow{
			ParentID:  coalesceString(li.ParentID, li.ID),
			Name:      li.Name,
			Category:  li.Category,
			Amount:    li.CurrentBalance,
			Frequency: normalizeFreq(li.Frequency),
			StartYear: li.StartYear,
			EndYear:   li.EndYear,
			ItemType:  ItemTypeLiability,
		})
	}

	incomes, err := s.store.ListIncomes(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range incomes {
		rows = append(rows, effectiveRow{
			ParentID:  coalesceString(it.ParentID, it.ID),
			Name:      it.Source,
			Category:  it.Category,
			Amount:    it.Amount,
			Frequency: normalizeFreq(it.Frequency),
			StartYear: it.StartYear,
			EndYear:   it.EndYear,
			ItemType:  ItemTypeIncome,
		})
	}

	expenses, err := s.store.ListExpenses(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range expenses {
		rows = append(rows, effectiveRow{
			ParentID:  coalesceString(it.ParentID, it.ID),
			Name:      it.Payee,
			Category:  it.Category,
			Amount:    it.Amount,
			Frequency: normalizeFreq(it.Frequency),
			StartYear: it.StartYear,
			EndYear:   it.EndYear,
			ItemType:  ItemTypeExpense,
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
func (s *Service) ensureGrowth(ctx context.Context) ([]repository.GrowthConfig, error) {
	cfgs, err := s.store.GetGrowthConfigs(ctx)
	if err != nil {
		return nil, err
	}
	if len(cfgs) == 0 {
		if err := s.store.UpsertGrowthConfigs(ctx, defaultGrowth); err != nil {
			return nil, err
		}
		return defaultGrowth, nil
	}
	return cfgs, nil
}

// GetGrowthConfig returns the current growth configuration, seeding defaults if missing.
func (s *Service) GetGrowthConfig(ctx context.Context) ([]repository.GrowthConfig, error) {
	return s.ensureGrowth(ctx)
}

// UpdateGrowthConfig validates and persists growth configuration, returning the saved set.
func (s *Service) UpdateGrowthConfig(ctx context.Context, cfgs []repository.GrowthConfig) ([]repository.GrowthConfig, error) {
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
	if err := s.store.UpsertGrowthConfigs(ctx, normalized); err != nil {
		return nil, err
	}
	return normalized, nil
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

	return out
}

func sumAnnual(items []TimelineItem) float64 {
	total := 0.0
	for _, it := range items {
		total += it.AmountAnnual
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
		if r, ok := byID[it.ItemID]; ok {
			it.AmountAnnual = r.AmountAnnual
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
