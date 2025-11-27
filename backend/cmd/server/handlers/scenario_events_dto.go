package handlers

import (
	"errors"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial/repository"
)

// API DTOs (camelCase JSON)
type scenarioImpactDTO struct {
	TargetType string  `json:"targetType"`
	TargetID   *string `json:"targetId,omitempty"`
	ImpactKind string  `json:"impactKind"`
	Amount     int64   `json:"amount"`
	Currency   string  `json:"currency"`
	Cadence    string  `json:"cadence"`
	StartMonth string  `json:"startMonth"`
	EndMonth   *string `json:"endMonth,omitempty"`
	Notes      *string `json:"notes,omitempty"`
}

type scenarioEventDTO struct {
	ID           string             `json:"id,omitempty"`
	Name         string             `json:"name"`
	Description  *string            `json:"description,omitempty"`
	OccursOn     string             `json:"occursOn"`
	DisplayIcon  string             `json:"displayIcon"`
	DisplayColor string             `json:"displayColor"`
	Tags         []string           `json:"tags"`
	ScenarioID   *string            `json:"scenarioId,omitempty"`
	IsIncluded   bool               `json:"isIncluded"`
	Impacts      []scenarioImpactDTO `json:"impacts"`
}

func toScenarioImpactDTO(imp repository.ScenarioImpact) scenarioImpactDTO {
	var end *string
	if imp.EndMonth != nil {
		val := imp.EndMonth.Format(time.DateOnly)
		end = &val
	}
	var targetID *string
	if imp.TargetID != nil {
		targetID = imp.TargetID
	}
	var notes *string
	if strings.TrimSpace(imp.Notes) != "" {
		val := imp.Notes
		notes = &val
	}
	return scenarioImpactDTO{
		TargetType: imp.TargetType,
		TargetID:   targetID,
		ImpactKind: imp.ImpactKind,
		Amount:     imp.Amount,
		Currency:   imp.Currency,
		Cadence:    imp.Cadence,
		StartMonth: imp.StartMonth.Format(time.DateOnly),
		EndMonth:   end,
		Notes:      notes,
	}
}

func toScenarioEventDTO(ev repository.ScenarioEvent) scenarioEventDTO {
	displayColor := ""
	if ev.DisplayColor != nil {
		displayColor = *ev.DisplayColor
	}
	dto := scenarioEventDTO{
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
		dto.Impacts = make([]scenarioImpactDTO, 0, len(ev.Impacts))
		for _, imp := range ev.Impacts {
			dto.Impacts = append(dto.Impacts, toScenarioImpactDTO(imp))
		}
	}
	return dto
}

// buildScenarioEvent constructs repository model from camelCase DTO.
func buildScenarioEvent(userID string, dto scenarioEventDTO) (repository.ScenarioEvent, error) {
	if strings.TrimSpace(dto.Name) == "" || strings.TrimSpace(dto.DisplayIcon) == "" || strings.TrimSpace(dto.OccursOn) == "" {
		return repository.ScenarioEvent{}, errMissingFields("name, occursOn, displayIcon")
	}
	occursOn, err := parseDateOrMonth(dto.OccursOn)
	if err != nil {
		return repository.ScenarioEvent{}, errors.New("invalid occursOn; expected YYYY-MM-DD or YYYY-MM")
	}
	isIncluded := dto.IsIncluded
	impacts, err := buildImpactsFromDTO(dto.Impacts)
	if err != nil {
		return repository.ScenarioEvent{}, err
	}
	color := strings.TrimSpace(dto.DisplayColor)
	if color == "" {
		color = "#0ea5e9"
	}
	ev := repository.ScenarioEvent{
		UserID:      userID,
		Name:        strings.TrimSpace(dto.Name),
		Description: strings.TrimSpace(ptrOrEmpty(dto.Description)),
		OccursOn:    occursOn,
		DisplayIcon: strings.TrimSpace(dto.DisplayIcon),
		DisplayColor: func() *string {
			c := color
			return &c
		}(),
		Tags:       dto.Tags,
		IsIncluded: isIncluded,
		Impacts:    impacts,
	}
	if dto.ScenarioID != nil && strings.TrimSpace(*dto.ScenarioID) != "" {
		val := strings.TrimSpace(*dto.ScenarioID)
		ev.ScenarioID = &val
	}
	return ev, nil
}

func buildImpactsFromDTO(reqs []scenarioImpactDTO) ([]repository.ScenarioImpact, error) {
	if len(reqs) == 0 {
		return []repository.ScenarioImpact{}, nil
	}
	var impacts []repository.ScenarioImpact
	startStopWindows := map[string][]window{}
	overrideWindows := map[string][]window{}

	for _, in := range reqs {
		tt := strings.ToLower(strings.TrimSpace(in.TargetType))
		if !inSet(tt, []string{"asset", "liability", "income", "expense"}) {
			return nil, errors.New("invalid targetType")
		}
		ik := strings.ToLower(strings.TrimSpace(in.ImpactKind))
		if !inSet(ik, []string{"delta", "override", "start", "stop"}) {
			return nil, errors.New("invalid impactKind")
		}
		cad := strings.ToLower(strings.TrimSpace(in.Cadence))
		if !inSet(cad, []string{"one_time", "monthly", "annual"}) {
			return nil, errors.New("invalid cadence")
		}
		start, err := parseMonthStart(in.StartMonth)
		if err != nil {
			return nil, errors.New("invalid startMonth; expected YYYY-MM or month-start timestamp")
		}
		var end *time.Time
		if strings.TrimSpace(ptrOrEmpty(in.EndMonth)) != "" {
			val, err := parseMonthStart(ptrOrEmpty(in.EndMonth))
			if err != nil {
				return nil, errors.New("invalid endMonth; expected YYYY-MM or month-start timestamp")
			}
			end = &val
		}
		targetID := ptrOrNil(ptrOrEmpty(in.TargetID))
		impact := repository.ScenarioImpact{
			TargetType: tt,
			TargetID:   targetID,
			ImpactKind: ik,
			Amount:     in.Amount,
			Currency:   strings.ToUpper(strings.TrimSpace(in.Currency)),
			Cadence:    cad,
			StartMonth: start,
			EndMonth:   end,
			Notes:      strings.TrimSpace(ptrOrEmpty(in.Notes)),
		}

		// Validate start/stop windows
		if ik == "start" || ik == "stop" {
			key := tt + ":" + ptrOrEmpty(in.TargetID)
			startStopWindows[key] = append(startStopWindows[key], window{start: start, end: end})
		}
		if ik == "override" {
			key := tt + ":" + ptrOrEmpty(in.TargetID)
			overrideWindows[key] = append(overrideWindows[key], window{start: start, end: end})
		}

		impacts = append(impacts, impact)
	}

	if err := validateNonOverlapping(startStopWindows); err != nil {
		return nil, err
	}
	if err := validateNonOverlapping(overrideWindows); err != nil {
		return nil, err
	}

	return impacts, nil
}

func validateNonOverlapping(groups map[string][]window) error {
	for key, list := range groups {
		for i, w := range list {
			if overlapsExisting(list[:i], w) {
				return errors.New("overlapping windows for target " + key)
			}
		}
	}
	return nil
}

func ptrOrEmpty(val *string) string {
	if val == nil {
		return ""
	}
	return *val
}

func ptrOrNil(val string) *string {
	if strings.TrimSpace(val) == "" {
		return nil
	}
	v := val
	return &v
}
