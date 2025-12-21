package handlers

import (
	"errors"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"
	"financial-chat-system/backend/internal/financial_v2/scenario"
)

// --- DTO to Model Transformers ---

func toScenarioImpactV2DTO(imp repo.ScenarioImpact) scenarioImpactV2DTO {
	var end *string
	if imp.EndDate != nil {
		val := imp.EndDate.Format(time.DateOnly)
		end = &val
	}
	var name *string
	if strings.TrimSpace(imp.Name) != "" {
		val := imp.Name
		name = &val
	}
	var frequency *string
	if imp.Frequency != "" {
		val := imp.Frequency
		frequency = &val
	}
	var notes *string
	if strings.TrimSpace(imp.Notes) != "" {
		val := imp.Notes
		notes = &val
	}
	// Advanced fields
	var category *string
	if strings.TrimSpace(imp.Category) != "" {
		val := imp.Category
		category = &val
	}
	// Map DB growth strategy values back to frontend values
	// DB: fixed, annual_step, compound_monthly → Frontend: none, annual_step, compound
	var growthStrategy *string
	if strings.TrimSpace(imp.GrowthStrategy) != "" {
		var val string
		switch imp.GrowthStrategy {
		case "fixed":
			val = "none"
		case "compound_monthly":
			val = "compound"
		default:
			val = imp.GrowthStrategy // annual_step stays as is
		}
		if val != "none" { // Only include if not "none"
			growthStrategy = &val
		}
	}
	targetID := imp.TargetID()
	// Convert decimal to string for DTO
	var amountStr *string
	if imp.Amount != nil {
		s := imp.Amount.String()
		amountStr = &s
	}
	return scenarioImpactV2DTO{
		ImpactKind:          imp.ImpactKind,
		Amount:              amountStr,
		Cadence:             imp.Cadence,
		Currency:            imp.Currency,
		StartDate:           imp.StartDate.Format(time.DateOnly),
		EndDate:             end,
		Name:                name,
		Frequency:           frequency,
		Notes:               notes,
		Category:            category,
		GrowthRate:          imp.GrowthRate,
		GrowthStrategy:      growthStrategy,
		InterestRate:        imp.InterestRate,
		MinimumPayment:      imp.MinimumPayment,
		TargetAssetID:       imp.TargetAssetID,
		TargetLiabilityID:   imp.TargetLiabilityID,
		TargetIncomeID:      imp.TargetIncomeID,
		TargetExpenseID:     imp.TargetExpenseID,
		TargetCashAccountID: imp.TargetCashAccountID,
		TargetInvestmentID:  imp.TargetInvestmentID,
		TargetType:          imp.TargetType(),
		TargetID:            targetID,
	}
}

func toScenarioEventV2DTO(ev repo.ScenarioEvent) scenarioEventV2DTO {
	displayColor := ""
	if ev.DisplayColor != nil {
		displayColor = *ev.DisplayColor
	}
	dto := scenarioEventV2DTO{
		ID:           ev.ID,
		Name:         ev.Name,
		Description:  ptrOrNil(ev.Description),
		OccursOn:     ev.OccursOn.Format(time.DateOnly),
		DisplayIcon:  ev.DisplayIcon,
		DisplayColor: displayColor,
		Tags:         ev.Tags,
		ScenarioID:   ev.ScenarioID,
		IsIncluded:   ev.IsIncluded,
	}
	if len(ev.Impacts) > 0 {
		dto.Impacts = make([]scenarioImpactV2DTO, 0, len(ev.Impacts))
		for _, imp := range ev.Impacts {
			dto.Impacts = append(dto.Impacts, toScenarioImpactV2DTO(imp))
		}
	}
	return dto
}

// --- Model Builders from DTO ---

func buildScenarioEventV2(userID string, dto scenarioEventV2DTO) (repo.ScenarioEvent, error) {
	if strings.TrimSpace(dto.Name) == "" || strings.TrimSpace(dto.DisplayIcon) == "" || strings.TrimSpace(dto.OccursOn) == "" {
		return repo.ScenarioEvent{}, errMissingFields("name, occursOn, displayIcon")
	}
	occursOn, err := scenario.ParseDateOrMonth(dto.OccursOn)
	if err != nil {
		return repo.ScenarioEvent{}, errors.New("invalid occursOn; expected YYYY-MM-DD or YYYY-MM")
	}
	impacts, err := buildImpactsV2FromDTO(dto.Impacts)
	if err != nil {
		return repo.ScenarioEvent{}, err
	}
	color := strings.TrimSpace(dto.DisplayColor)
	if color == "" {
		color = "#0ea5e9"
	}
	ev := repo.ScenarioEvent{
		UserID:      userID,
		Name:        strings.TrimSpace(dto.Name),
		Description: strings.TrimSpace(scenario.PtrOrEmpty(dto.Description)),
		OccursOn:    occursOn,
		DisplayIcon: strings.TrimSpace(dto.DisplayIcon),
		DisplayColor: func() *string {
			c := color
			return &c
		}(),
		Tags:       dto.Tags,
		IsIncluded: dto.IsIncluded,
		Impacts:    impacts,
	}
	if dto.ScenarioID != nil && strings.TrimSpace(*dto.ScenarioID) != "" {
		val := strings.TrimSpace(*dto.ScenarioID)
		ev.ScenarioID = &val
	}
	return ev, nil
}

type impactTarget struct {
	targetType string
	targetID   string
}

func resolveImpactTarget(in scenarioImpactV2DTO) (impactTarget, error) {
	typedTargets := make([]impactTarget, 0, 1)

	addTypedTarget := func(val *string, targetType string) {
		if t := scenario.NonEmptyPtr(val); t != nil {
			typedTargets = append(typedTargets, impactTarget{
				targetType: targetType,
				targetID:   strings.TrimSpace(*t),
			})
		}
	}

	addTypedTarget(in.TargetAssetID, "asset")
	addTypedTarget(in.TargetLiabilityID, "liability")
	addTypedTarget(in.TargetIncomeID, "income")
	addTypedTarget(in.TargetExpenseID, "expense")
	addTypedTarget(in.TargetCashAccountID, "cash")
	addTypedTarget(in.TargetInvestmentID, "investment")

	if len(typedTargets) > 1 {
		return impactTarget{}, scenario.ErrInvalidTargetCount
	}
	if len(typedTargets) == 1 {
		if !scenario.IsValidTargetType(typedTargets[0].targetType) {
			return impactTarget{}, scenario.ErrInvalidTargetType
		}
		return typedTargets[0], nil
	}

	targetID := scenario.NonEmptyPtr(in.TargetID)
	targetType := strings.ToLower(strings.TrimSpace(in.TargetType))
	if targetID == nil || targetType == "" {
		return impactTarget{}, scenario.ErrInvalidTargetCount
	}
	if !scenario.IsValidTargetType(targetType) {
		return impactTarget{}, scenario.ErrInvalidTargetType
	}

	return impactTarget{
		targetType: targetType,
		targetID:   strings.TrimSpace(*targetID),
	}, nil
}

func buildImpactsV2FromDTO(reqs []scenarioImpactV2DTO) ([]repo.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return nil, errors.New("scenario event must have at least one impact")
	}

	// Track target IDs to enforce one impact per financial item per event
	seenTargets := make(map[string]bool)

	impacts := make([]repo.ScenarioImpact, 0, len(reqs))
	for _, in := range reqs {
		impact, err := buildImpactV2(in)
		if err != nil {
			return nil, err
		}

		// Check for duplicate targets within this event
		targetID := impact.TargetID()
		if targetID != nil && *targetID != "" {
			if seenTargets[*targetID] {
				return nil, errors.New("only one impact per financial item is allowed per event")
			}
			seenTargets[*targetID] = true
		}

		impacts = append(impacts, impact)
	}

	return impacts, nil
}

func buildImpactV2(in scenarioImpactV2DTO) (repo.ScenarioImpact, error) {
	ik, cad, err := normalizeImpactKindAndCadence(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	// Parse start date (required for DB constraint)
	startDate, err := scenario.ParseDateOrMonth(in.StartDate)
	if err != nil {
		return repo.ScenarioImpact{}, errors.New("invalid startDate; expected YYYY-MM-DD or YYYY-MM")
	}

	// Parse optional end date
	var endDate *time.Time
	if in.EndDate != nil && strings.TrimSpace(*in.EndDate) != "" {
		ed, err := scenario.ParseDateOrMonth(*in.EndDate)
		if err != nil {
			return repo.ScenarioImpact{}, errors.New("invalid endDate; expected YYYY-MM-DD or YYYY-MM")
		}
		endDate = &ed
	}

	// Convert string amount to decimal
	var amountDecimal *decimal.Decimal
	if in.Amount != nil && *in.Amount != "" {
		d, err := decimal.NewFromString(*in.Amount)
		if err != nil {
			return repo.ScenarioImpact{}, errors.New("invalid amount; expected numeric string")
		}
		amountDecimal = d
	}

	// Impact table stores: impact_kind, amount, cadence, start_date, end_date, and target FK columns.
	// Advanced fields (category, growth_rate, growth_strategy) are passed through
	// to updateStartImpactTarget for syncing to the financial item.
	impact := repo.ScenarioImpact{
		ImpactKind: ik,
		Amount:     amountDecimal,
		Cadence:    cad,
		StartDate:  startDate,
		EndDate:    endDate,
		GrowthRate: in.GrowthRate,
	}
	// Set category if provided
	if in.Category != nil {
		impact.Category = *in.Category
	}
	// Set growth strategy if provided
	if in.GrowthStrategy != nil {
		impact.GrowthStrategy = *in.GrowthStrategy
	}
	// Set liability-specific fields if provided
	impact.InterestRate = in.InterestRate
	impact.MinimumPayment = in.MinimumPayment

	// All impacts (including start) must have a pre-existing target - resolve from DTO
	target, err := resolveImpactTarget(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	return impactWithTarget(impact, target)
}

func normalizeImpactKindAndCadence(in scenarioImpactV2DTO) (string, common.Frequency, error) {
	ik, err := scenario.NormalizeImpactKind(in.ImpactKind)
	if err != nil {
		return "", "", err
	}
	cad, err := scenario.NormalizeCadence(in.Cadence)
	if err != nil {
		return "", "", err
	}
	// Validate cadence is appropriate for the impact kind
	// Delta impacts require monthly/annual (recurring), others are implicitly one-time
	if err := scenario.ValidateCadenceForImpactKind(ik, cad); err != nil {
		return "", "", err
	}
	return ik, cad, nil
}

func assignImpactTarget(impact *repo.ScenarioImpact, target impactTarget) error {
	id := target.targetID

	switch target.targetType {
	case "asset":
		impact.TargetAssetID = &id
	case "liability":
		impact.TargetLiabilityID = &id
	case "income":
		impact.TargetIncomeID = &id
	case "expense":
		impact.TargetExpenseID = &id
	case "cash":
		impact.TargetCashAccountID = &id
	case "investment":
		impact.TargetInvestmentID = &id
	default:
		return scenario.ErrInvalidTargetType
	}

	return nil
}

func impactWithTarget(impact repo.ScenarioImpact, target impactTarget) (repo.ScenarioImpact, error) {
	if err := assignImpactTarget(&impact, target); err != nil {
		return repo.ScenarioImpact{}, err
	}
	return impact, nil
}
