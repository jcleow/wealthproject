package common

import (
	"database/sql"
	"time"
)

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
