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

	// Convert decimal to string for DTO
	var amountStr *string
	if imp.Amount != nil {
		s := imp.Amount.String()
		amountStr = &s
	}

	// Get parentId from the typed target ID field (for delta/override/stop impacts)
	// For 'start' impacts, parentId will be nil
	parentID := imp.TargetID()

	return scenarioImpactV2DTO{
		ImpactKind:     imp.ImpactKind,
		TargetType:     imp.TargetType(),
		ParentID:       parentID,
		Amount:         amountStr,
		Cadence:        imp.Cadence,
		Currency:       imp.Currency,
		StartDate:      imp.StartDate.Format(time.DateOnly),
		EndDate:        end,
		Name:           name,
		Frequency:      frequency,
		Notes:          notes,
		Category:       category,
		GrowthRate:     imp.GrowthRate,
		GrowthStrategy: growthStrategy,
		InterestRate:   imp.InterestRate,
		MinimumPayment: imp.MinimumPayment,
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

// resolveImpactTarget validates and extracts the target type and parent ID from the DTO.
// - For 'start' impacts: only targetType is required (parentId should be nil/empty)
// - For 'delta'/'override'/'stop' impacts: both targetType and parentId are required
func resolveImpactTarget(in scenarioImpactV2DTO) (targetType string, parentID *string, err error) {
	targetType = strings.ToLower(strings.TrimSpace(in.TargetType))
	if targetType == "" {
		return "", nil, errors.New("targetType is required")
	}
	if !scenario.IsValidTargetType(targetType) {
		return "", nil, scenario.ErrInvalidTargetType
	}

	// Normalize parentId
	if in.ParentID != nil && strings.TrimSpace(*in.ParentID) != "" {
		trimmedParentID := strings.TrimSpace(*in.ParentID)
		parentID = &trimmedParentID
	}

	// Validate based on impact kind
	impactKind := strings.ToLower(strings.TrimSpace(in.ImpactKind))
	if impactKind == scenario.ImpactKindStart {
		// Start impacts should NOT have a parentId (they create new items)
		if parentID != nil {
			return "", nil, errors.New("start impacts should not have parentId (they create new items)")
		}
	} else {
		// Delta/override/stop impacts REQUIRE a parentId (they modify existing items)
		if parentID == nil {
			return "", nil, errors.New("parentId is required for delta/override/stop impacts")
		}
	}

	return targetType, parentID, nil
}

func buildImpactsV2FromDTO(reqs []scenarioImpactV2DTO) ([]repo.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return nil, errors.New("scenario event must have at least one impact")
	}

	// Track parent IDs to enforce one impact per financial item per event
	seenParentIDs := make(map[string]bool)

	impacts := make([]repo.ScenarioImpact, 0, len(reqs))
	for _, in := range reqs {
		impact, err := buildImpactV2(in)
		if err != nil {
			return nil, err
		}

		// Check for duplicate parent IDs within this event (only for non-start impacts)
		parentID := impact.TargetID()
		if parentID != nil && *parentID != "" {
			if seenParentIDs[*parentID] {
				return nil, errors.New("only one impact per financial item is allowed per event")
			}
			seenParentIDs[*parentID] = true
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

	// Resolve target type and parent ID
	targetType, parentID, err := resolveImpactTarget(in)
	if err != nil {
		return repo.ScenarioImpact{}, err
	}

	// Build impact with resolved target info
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

	// Set name and other fields for start impacts
	if in.Name != nil {
		impact.Name = *in.Name
	}
	if in.Frequency != nil {
		impact.Frequency = *in.Frequency
	}
	if in.Notes != nil {
		impact.Notes = *in.Notes
	}

	// Assign target type to the appropriate typed FK field on the impact
	// For start impacts, parentID is nil so target IDs remain nil
	// For delta/override/stop, parentID points to the existing item
	assignTargetToImpact(&impact, targetType, parentID)

	return impact, nil
}

// assignTargetToImpact sets the appropriate typed target ID field on the impact based on targetType.
// For start impacts, parentID is nil, but we still set an empty string pointer so TargetType() works.
// For delta/override/stop, parentID is the ID of the existing item to modify.
func assignTargetToImpact(impact *repo.ScenarioImpact, targetType string, parentID *string) {
	// For start impacts, parentID is nil but we need TargetType() to return the correct type.
	// We use an empty string as a marker that means "create new item of this type".
	effectiveID := parentID
	if effectiveID == nil {
		empty := ""
		effectiveID = &empty
	}

	switch targetType {
	case "asset":
		impact.TargetAssetID = effectiveID
	case "liability":
		impact.TargetLiabilityID = effectiveID
	case "income":
		impact.TargetIncomeID = effectiveID
	case "expense":
		impact.TargetExpenseID = effectiveID
	case "cash":
		impact.TargetCashAccountID = effectiveID
	case "investment":
		impact.TargetInvestmentID = effectiveID
	}
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

