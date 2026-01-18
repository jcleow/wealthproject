package common

import (
	"database/sql"
	"strings"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// IsValidUUID checks if a string is a non-empty, valid UUID format.
// Returns false for nil, empty strings, whitespace-only strings, or invalid formats.
func IsValidUUID(s *string) bool {
	if s == nil {
		return false
	}
	trimmed := strings.TrimSpace(*s)
	if trimmed == "" {
		return false
	}
	// Basic UUID format check: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
	if len(trimmed) != 36 {
		return false
	}
	// Check hyphens are in correct positions
	if trimmed[8] != '-' || trimmed[13] != '-' || trimmed[18] != '-' || trimmed[23] != '-' {
		return false
	}
	return true
}

// MonthsBetween calculates the number of months between two dates (inclusive)
func MonthsBetween(start, end time.Time) int {
	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())
	return years*12 + months + 1
}

// NullStringPtr converts sql.NullString to *string.
func NullStringPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// NullTimePtr converts sql.NullTime to *time.Time.
func NullTimePtr(nt sql.NullTime) *time.Time {
	if nt.Valid {
		return &nt.Time
	}
	return nil
}

// FirstOfMonth returns the first day of the month in UTC for a given date.
func FirstOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}

// SafeDecimalString converts a decimal pointer to string, returning "0" if nil.
// Useful for serializing optional decimal values in API responses.
func SafeDecimalString(d *decimal.Decimal) string {
	if d == nil {
		return "0"
	}
	return d.String()
}
