package timeline

import (
	"context"
	"errors"
	"sort"
	"strings"

	"financial-chat-system/backend/internal/financial/repository"
)

const (
	totalYears        = 21 // years 0..20 inclusive
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
	store Store
}

// NewService builds a new Service.
func NewService(store Store) *Service {
	return &Service{store: store}
}

// GetTimeline returns the full 0..20 timeline.
func (s *Service) GetTimeline(ctx context.Context) (TimelineResponse, error) {
	return s.buildTimeline(ctx)
}

// UpsertYear stores overrides/new items for a year and returns the refreshed timeline.
func (s *Service) UpsertYear(ctx context.Context, year int, edits []EditRequest) (TimelineResponse, error) {
	if year < 0 || year >= totalYears {
		return TimelineResponse{}, errors.New("year must be between 0 and 20")
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
	if edit.Amount == 0 {
		return errors.New("amount must be non-zero")
	}
	if edit.ItemID == nil && (edit.Name == nil || strings.TrimSpace(*edit.Name) == "") {
		return errors.New("name is required when creating a new item")
	}
	return nil
}

func (s *Service) applyEdit(ctx context.Context, year int, edit EditRequest) error {
	itemID := ""
	name := ""
	category := edit.Category

	if edit.ItemID != nil && *edit.ItemID != "" {
		itemID = *edit.ItemID
		found, err := s.lookupExistingItem(ctx, itemID, edit.ItemType)
		if err != nil {
			return err
		}
		name = found.Name
		if category == "" {
			category = found.Category
		}
	} else {
		created, err := s.store.CreateCustomItem(ctx, repository.CustomItem{
			Name:        strings.TrimSpace(*edit.Name),
			ItemType:    string(edit.ItemType),
			Category:    category,
			Amount:      edit.Amount,
			Frequency:   string(edit.Frequency),
			CreatedYear: year,
		})
		if err != nil {
			return err
		}
		itemID = created.ID
		name = created.Name
	}

	override := repository.FinancialOverride{
		Year:      year,
		ItemID:    itemID,
		ItemType:  string(edit.ItemType),
		Category:  category,
		Name:      name,
		Amount:    edit.Amount,
		Frequency: string(edit.Frequency),
	}
	_, err := s.store.UpsertOverride(ctx, override)
	return err
}

type itemState struct {
	item   TimelineItem
	amount float64
}

func (s *Service) buildTimeline(ctx context.Context) (TimelineResponse, error) {
	growthCfg, err := s.ensureGrowth(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}

	baseItems, err := s.loadBaseItems(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}

	overrides, err := s.store.ListOverrides(ctx)
	if err != nil {
		return TimelineResponse{}, err
	}
	overridesByYear := map[int][]repository.FinancialOverride{}
	for _, ov := range overrides {
		overridesByYear[ov.Year] = append(overridesByYear[ov.Year], ov)
	}

	state := map[string]itemState{}
	for _, it := range baseItems {
		state[it.ItemID] = itemState{item: it, amount: it.AmountAnnual}
	}

	years := make([]TimelineYear, totalYears)
	for year := 0; year < totalYears; year++ {
		if year > 0 {
			for id, st := range state {
				rate := lookupGrowthRate(growthCfg, st.item.Category, st.item.ItemType)
				st.amount = applyGrowth(st.amount, rate)
				state[id] = st
			}
		}

		hasOverride := false
		for _, ov := range overridesByYear[year] {
			annual, err := Annualize(ov.Amount, Frequency(ov.Frequency))
			if err != nil {
				return TimelineResponse{}, err
			}
			if existing, ok := state[ov.ItemID]; ok {
				existing.amount = annual
				existing.item.AmountAnnual = annual
				existing.item.SourceAmount = &ov.Amount
				existing.item.SourceFrequency = ov.Frequency
				if existing.item.CreatedYear > year {
					existing.item.CreatedYear = year
				}
				state[ov.ItemID] = existing
			} else {
				state[ov.ItemID] = itemState{
					item: TimelineItem{
						ItemID:          ov.ItemID,
						Name:            ov.Name,
						Category:        ov.Category,
						AmountAnnual:    annual,
						SourceAmount:    &ov.Amount,
						SourceFrequency: ov.Frequency,
						ItemType:        ItemType(ov.ItemType),
						CreatedYear:     year,
					},
					amount: annual,
				}
			}
			hasOverride = true
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
			GrowthApplied: projectGrowthApplied(growthCfg),
		}
	}

	return TimelineResponse{
		Years:   years,
		Version: defaultVersion,
	}, nil
}

func (s *Service) loadBaseItems(ctx context.Context) ([]TimelineItem, error) {
	items := []TimelineItem{}

	assets, err := s.store.ListAssets(ctx)
	if err != nil {
		return nil, err
	}
	for _, a := range assets {
		items = append(items, TimelineItem{
			ItemID:       a.ID,
			Name:         a.Name,
			Category:     a.Category,
			AmountAnnual: a.CurrentValue,
			ItemType:     ItemTypeAsset,
			CreatedYear:  0,
		})
	}

	liabilities, err := s.store.ListLiabilities(ctx)
	if err != nil {
		return nil, err
	}
	for _, li := range liabilities {
		items = append(items, TimelineItem{
			ItemID:       li.ID,
			Name:         li.Name,
			Category:     li.Category,
			AmountAnnual: li.CurrentBalance,
			ItemType:     ItemTypeLiability,
			CreatedYear:  0,
		})
	}

	incomes, err := s.store.ListIncomes(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range incomes {
		annual, err := Annualize(it.Amount, Frequency(strings.ToLower(it.Frequency)))
		if err != nil {
			return nil, err
		}
		items = append(items, TimelineItem{
			ItemID:          it.ID,
			Name:            it.Source,
			Category:        it.Category,
			AmountAnnual:    annual,
			SourceAmount:    &it.Amount,
			SourceFrequency: strings.ToLower(it.Frequency),
			ItemType:        ItemTypeIncome,
			CreatedYear:     0,
		})
	}

	expenses, err := s.store.ListExpenses(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range expenses {
		annual, err := Annualize(it.Amount, Frequency(strings.ToLower(it.Frequency)))
		if err != nil {
			return nil, err
		}
		items = append(items, TimelineItem{
			ItemID:          it.ID,
			Name:            it.Payee,
			Category:        it.Category,
			AmountAnnual:    annual,
			SourceAmount:    &it.Amount,
			SourceFrequency: strings.ToLower(it.Frequency),
			ItemType:        ItemTypeExpense,
			CreatedYear:     0,
		})
	}

	custom, err := s.store.ListCustomItems(ctx)
	if err != nil {
		return nil, err
	}
	for _, it := range custom {
		annual, err := Annualize(it.Amount, Frequency(strings.ToLower(it.Frequency)))
		if err != nil {
			return nil, err
		}
		items = append(items, TimelineItem{
			ItemID:          it.ID,
			Name:            it.Name,
			Category:        it.Category,
			AmountAnnual:    annual,
			SourceAmount:    &it.Amount,
			SourceFrequency: strings.ToLower(it.Frequency),
			ItemType:        ItemType(it.ItemType),
			CreatedYear:     it.CreatedYear,
		})
	}

	return items, nil
}

func (s *Service) ensureGrowth(ctx context.Context) ([]repository.GrowthConfig, error) {
	current, err := s.store.GetGrowthConfigs(ctx)
	if err != nil {
		return nil, err
	}
	if len(current) == 0 {
		if err := s.store.UpsertGrowthConfigs(ctx, defaultGrowth); err != nil {
			return nil, err
		}
		return defaultGrowth, nil
	}
	return current, nil
}

// GetGrowthConfig returns the current growth configuration (ensuring defaults if empty).
func (s *Service) GetGrowthConfig(ctx context.Context) ([]repository.GrowthConfig, error) {
	return s.ensureGrowth(ctx)
}

// UpdateGrowthConfig updates growth settings and returns the refreshed config.
func (s *Service) UpdateGrowthConfig(ctx context.Context, cfgs []repository.GrowthConfig) ([]repository.GrowthConfig, error) {
	for i, cfg := range cfgs {
		cfgs[i].AnnualRatePct = clamp(cfg.AnnualRatePct, defaultLowerBound, defaultUpperBound)
		if cfgs[i].LowerBoundPct == 0 && cfgs[i].UpperBoundPct == 0 {
			cfgs[i].LowerBoundPct = defaultLowerBound
			cfgs[i].UpperBoundPct = defaultUpperBound
		}
	}
	if err := s.store.UpsertGrowthConfigs(ctx, cfgs); err != nil {
		return nil, err
	}
	return s.ensureGrowth(ctx)
}

func lookupGrowthRate(cfgs []repository.GrowthConfig, category string, itemType ItemType) float64 {
	for _, cfg := range cfgs {
		if cfg.Category == category {
			return clamp(cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct)
		}
	}
	fallbackCategory := ""
	switch itemType {
	case ItemTypeIncome:
		fallbackCategory = "income"
	case ItemTypeExpense:
		fallbackCategory = "expense"
	case ItemTypeLiability:
		fallbackCategory = "liability_debt"
	case ItemTypeAsset:
		fallbackCategory = "asset_cash"
	}
	for _, cfg := range cfgs {
		if cfg.Category == fallbackCategory {
			return clamp(cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct)
		}
	}
	return 0
}

func applyGrowth(amount float64, ratePct float64) float64 {
	return amount * (1 + ratePct/100)
}

type segregated struct {
	Assets      []TimelineItem
	Liabilities []TimelineItem
	Income      []TimelineItem
	Expenses    []TimelineItem
}

func segregateItems(state map[string]itemState, currentYear int) segregated {
	var assets, liabilities, income, expenses []TimelineItem
	for _, st := range state {
		if st.item.CreatedYear > currentYear {
			continue
		}
		itemCopy := st.item
		itemCopy.AmountAnnual = st.amount
		switch st.item.ItemType {
		case ItemTypeAsset:
			assets = append(assets, itemCopy)
		case ItemTypeLiability:
			liabilities = append(liabilities, itemCopy)
		case ItemTypeIncome:
			income = append(income, itemCopy)
		case ItemTypeExpense:
			expenses = append(expenses, itemCopy)
		}
	}
	sort.Slice(assets, func(i, j int) bool { return assets[i].ItemID < assets[j].ItemID })
	sort.Slice(liabilities, func(i, j int) bool { return liabilities[i].ItemID < liabilities[j].ItemID })
	sort.Slice(income, func(i, j int) bool { return income[i].ItemID < income[j].ItemID })
	sort.Slice(expenses, func(i, j int) bool { return expenses[i].ItemID < expenses[j].ItemID })
	return segregated{
		Assets:      assets,
		Liabilities: liabilities,
		Income:      income,
		Expenses:    expenses,
	}
}

func sumAnnual(items []TimelineItem) float64 {
	sum := 0.0
	for _, it := range items {
		sum += it.AmountAnnual
	}
	return sum
}

func projectGrowthApplied(cfgs []repository.GrowthConfig) []GrowthApplied {
	out := make([]GrowthApplied, 0, len(cfgs))
	for _, cfg := range cfgs {
		out = append(out, GrowthApplied{
			Category:      cfg.Category,
			AnnualRatePct: clamp(cfg.AnnualRatePct, cfg.LowerBoundPct, cfg.UpperBoundPct),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Category < out[j].Category })
	return out
}

func clamp(value, lower, upper float64) float64 {
	if value < lower {
		return lower
	}
	if value > upper {
		return upper
	}
	return value
}

type lookupResult struct {
	Name     string
	Category string
}

func (s *Service) lookupExistingItem(ctx context.Context, id string, itemType ItemType) (lookupResult, error) {
	switch itemType {
	case ItemTypeAsset:
		item, err := s.store.GetAsset(ctx, id)
		if err != nil {
			return lookupResult{}, err
		}
		return lookupResult{Name: item.Name, Category: item.Category}, nil
	case ItemTypeLiability:
		item, err := s.store.GetLiability(ctx, id)
		if err != nil {
			return lookupResult{}, err
		}
		return lookupResult{Name: item.Name, Category: item.Category}, nil
	case ItemTypeIncome:
		item, err := s.store.GetIncome(ctx, id)
		if err != nil {
			return lookupResult{}, err
		}
		return lookupResult{Name: item.Source, Category: item.Category}, nil
	case ItemTypeExpense:
		item, err := s.store.GetExpense(ctx, id)
		if err != nil {
			return lookupResult{}, err
		}
		return lookupResult{Name: item.Payee, Category: item.Category}, nil
	default:
		item, err := s.store.GetCustomItem(ctx, id)
		if err != nil {
			return lookupResult{}, err
		}
		return lookupResult{Name: item.Name, Category: item.Category}, nil
	}
}
