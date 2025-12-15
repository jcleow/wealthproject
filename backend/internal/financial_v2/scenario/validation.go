package scenario

import (
	"errors"
	"strings"
	"time"

	"financial-chat-system/backend/internal/common"
)

// Validation errors
var (
	ErrMissingRequiredFields = errors.New("missing required fields")
	ErrInvalidImpactKind     = errors.New("invalid impactKind; must be delta, override, start, or stop")
	ErrInvalidCadence        = errors.New("invalid cadence; must be one_time, weekly, bi_weekly, monthly, quarterly, semi_annual, or annual")
	ErrInvalidDate           = errors.New("invalid date format; expected YYYY-MM-DD or YYYY-MM")
	ErrInvalidStartDate      = errors.New("invalid startDate; expected YYYY-MM or month-start date")
	ErrInvalidEndDate        = errors.New("invalid endDate; expected YYYY-MM or month-start date")
	ErrMissingStartDate      = errors.New("startDate is required for impact")
	ErrInvalidTargetCount    = errors.New("exactly one target ID must be set per impact")
)

// ValidCadences lists all valid cadence values (derived from common.AllFrequencies)
var ValidCadences = frequenciesToStrings(common.AllFrequencies)

// ValidImpactKinds lists all valid impact kind values
var ValidImpactKinds = []string{ImpactKindDelta, ImpactKindOverride, ImpactKindStart, ImpactKindStop}

// IsValidImpactKind checks if the impact kind is valid
func IsValidImpactKind(kind string) bool {
	return inSet(strings.ToLower(strings.TrimSpace(kind)), ValidImpactKinds)
}

// IsValidCadence checks if the cadence is valid
func IsValidCadence(cadence string) bool {
	return inSet(strings.ToLower(strings.TrimSpace(cadence)), ValidCadences)
}

// ParseDateOrMonth parses a date string in YYYY-MM-DD or YYYY-MM format
func ParseDateOrMonth(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		return time.Time{}, ErrInvalidDate
	}
	// Try YYYY-MM-DD first
	if t, err := time.Parse(time.DateOnly, val); err == nil {
		return t, nil
	}
	// Try YYYY-MM
	if t, err := time.Parse("2006-01", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, ErrInvalidDate
}

// ParseMonthStart parses a date to the first of the month.
// Accepts YYYY-MM format or any date (using first of that month).
func ParseMonthStart(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		return time.Time{}, ErrInvalidStartDate
	}
	// Try YYYY-MM first
	if t, err := time.Parse("2006-01", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	// Try full date format
	if t, err := time.Parse(time.DateOnly, val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	// Try RFC3339
	if t, err := time.Parse(time.RFC3339, val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, ErrInvalidStartDate
}

// NormalizeImpactKind normalizes and validates an impact kind string
func NormalizeImpactKind(kind string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(kind))
	if !inSet(normalized, ValidImpactKinds) {
		return "", ErrInvalidImpactKind
	}
	return normalized, nil
}

// normalizeFrequency lowercases and trims a Frequency value
func normalizeFrequency(f common.Frequency) common.Frequency {
	return common.Frequency(strings.ToLower(strings.TrimSpace(string(f))))
}

// NormalizeCadence normalizes and validates a cadence value
func NormalizeCadence(cadence common.Frequency) (common.Frequency, error) {
	normalized := normalizeFrequency(cadence)
	if !inSet(string(normalized), ValidCadences) {
		return "", ErrInvalidCadence
	}
	return normalized, nil
}

// NonEmptyPtr returns nil if the string pointer is nil or empty, otherwise returns the pointer
func NonEmptyPtr(s *string) *string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	return s
}

// PtrOrEmpty returns empty string if pointer is nil, otherwise the value
func PtrOrEmpty(val *string) string {
	if val == nil {
		return ""
	}
	return *val
}

// PtrOrNil returns nil if string is empty, otherwise a pointer to the value
func PtrOrNil(val string) *string {
	if strings.TrimSpace(val) == "" {
		return nil
	}
	return &val
}

func inSet(value string, allowed []string) bool {
	for _, a := range allowed {
		if value == a {
			return true
		}
	}
	return false
}

func frequenciesToStrings(freqs []common.Frequency) []string {
	result := make([]string, len(freqs))
	for i, f := range freqs {
		result[i] = string(f)
	}
	return result
}
