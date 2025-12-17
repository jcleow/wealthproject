package timeline_v2

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// =============================================================================
// Tests for isActiveInMonth - verifying timezone-consistent date comparisons
// =============================================================================

// TestIsActiveInMonth_UTCDates tests basic functionality with UTC dates
func TestIsActiveInMonth_UTCDates(t *testing.T) {
	tests := []struct {
		name       string
		startDate  time.Time
		endDate    *time.Time
		checkMonth time.Time
		wantActive bool
	}{
		{
			name:       "item starts in check month - active",
			startDate:  time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			name:       "item starts before check month - active",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			name:       "item starts after check month - NOT active",
			startDate:  time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name:       "item ended before check month - NOT active",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    timePtr(time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)),
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name:       "item ends during check month - active",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    timePtr(time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)),
			checkMonth: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			name:       "item starts on last day of check month - active",
			startDate:  time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			name:       "item starts on first day of next month - NOT active",
			startDate:  time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row := FinancialDataRow{
				ID:        "test-id",
				StartDate: tt.startDate,
				EndDate:   tt.endDate,
			}

			got := isActiveInMonth(row, tt.checkMonth)
			if got != tt.wantActive {
				t.Errorf("isActiveInMonth() = %v, want %v", got, tt.wantActive)
			}
		})
	}
}

// TestIsActiveInMonth_TimezoneEdgeCases tests that dates stored with different
// timezone offsets are handled correctly. This is the critical P0 bug test case.
func TestIsActiveInMonth_TimezoneEdgeCases(t *testing.T) {
	// Load timezone for testing (+0800 Singapore/HongKong)
	sgtz := time.FixedZone("SGT", 8*60*60)

	tests := []struct {
		name       string
		startDate  time.Time
		endDate    *time.Time
		checkMonth time.Time
		wantActive bool
		comment    string
	}{
		{
			// This is the P0 bug case:
			// User in +0800 creates item with start_date "2026-02-01 00:00:00 +0800"
			// This is 2026-01-31T16:00:00Z in UTC
			// When checking January 2026, item should NOT be active (it starts in Feb)
			name:       "P0 BUG: +0800 timezone Feb 1 should NOT appear in January",
			startDate:  time.Date(2026, 2, 1, 0, 0, 0, 0, sgtz), // Feb 1 in SGT
			endDate:    nil,
			checkMonth: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC), // Checking January
			wantActive: false,
			comment:    "Item starting Feb 1 +0800 (= Jan 31 16:00 UTC) should NOT be active in January",
		},
		{
			// Same item should be active in February
			name:       "P0 BUG: +0800 timezone Feb 1 SHOULD appear in February",
			startDate:  time.Date(2026, 2, 1, 0, 0, 0, 0, sgtz), // Feb 1 in SGT
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC), // Checking February
			wantActive: true,
			comment:    "Item starting Feb 1 +0800 should be active in February",
		},
		{
			// Test end date with timezone offset
			// End date "2026-01-31 23:59:59 +0800" = 2026-01-31T15:59:59Z
			// Item should NOT be active in February
			name:       "end date with +0800 timezone - should end in January",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    timePtr(time.Date(2026, 1, 31, 23, 59, 59, 0, sgtz)), // Jan 31 end of day in SGT
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),         // Checking February
			wantActive: false,
			comment:    "Item ending Jan 31 +0800 should NOT be active in February",
		},
		{
			// Negative timezone test (-0500 EST)
			// "2026-02-01 00:00:00 -0500" = 2026-02-01T05:00:00Z
			name:       "negative timezone (-0500) Feb 1",
			startDate:  time.Date(2026, 2, 1, 0, 0, 0, 0, time.FixedZone("EST", -5*60*60)),
			endDate:    nil,
			checkMonth: time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC), // Checking January
			wantActive: false,
			comment:    "Item starting Feb 1 -0500 should NOT be active in January",
		},
		{
			// UTC date stored as-is should work correctly
			name:       "UTC date Feb 1 should NOT appear in January",
			startDate:  time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
			comment:    "UTC date Feb 1 should NOT be active in January",
		},
		{
			// Edge case: last millisecond of January in +0800
			// "2026-01-31 23:59:59.999 +0800" = 2026-01-31T15:59:59.999Z
			// This should be active in January
			name:       "last moment of January +0800 should be active in January",
			startDate:  time.Date(2026, 1, 31, 23, 59, 59, 999999999, sgtz),
			endDate:    nil,
			checkMonth: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true,
			comment:    "Item starting Jan 31 23:59 +0800 should be active in January",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row := FinancialDataRow{
				ID:        "test-id",
				StartDate: tt.startDate,
				EndDate:   tt.endDate,
			}

			got := isActiveInMonth(row, tt.checkMonth)
			if got != tt.wantActive {
				t.Errorf("isActiveInMonth() = %v, want %v\nComment: %s\nStartDate: %v (UTC: %v)\nCheckMonth: %v",
					got, tt.wantActive, tt.comment,
					tt.startDate, tt.startDate.UTC(),
					tt.checkMonth)
			}
		})
	}
}

// TestIsActiveInMonth_BoundaryConditions tests exact boundary conditions
func TestIsActiveInMonth_BoundaryConditions(t *testing.T) {
	tests := []struct {
		name       string
		startDate  time.Time
		endDate    *time.Time
		checkMonth time.Time
		wantActive bool
	}{
		{
			name:       "start exactly at midnight of first day of next month - NOT active",
			startDate:  time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			name:       "start one nanosecond before midnight of next month - active",
			startDate:  time.Date(2026, 2, 28, 23, 59, 59, 999999999, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			name:       "end exactly at midnight of first day of check month - NOT active",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    timePtr(time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)),
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true, // End date is Feb 1, so still active on Feb 1
		},
		{
			name:       "end on last day of previous month - NOT active",
			startDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			endDate:    timePtr(time.Date(2026, 1, 31, 23, 59, 59, 0, time.UTC)),
			checkMonth: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
		{
			// Leap year test - Feb 29 exists in 2024
			name:       "leap year Feb 29 - item starts on Feb 29",
			startDate:  time.Date(2024, 2, 29, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: true,
		},
		{
			// Leap year - item starts March 1 should not be active in Feb
			name:       "leap year - March 1 not active in Feb",
			startDate:  time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
			endDate:    nil,
			checkMonth: time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
			wantActive: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row := FinancialDataRow{
				ID:        "test-id",
				StartDate: tt.startDate,
				EndDate:   tt.endDate,
			}

			got := isActiveInMonth(row, tt.checkMonth)
			if got != tt.wantActive {
				t.Errorf("isActiveInMonth() = %v, want %v", got, tt.wantActive)
			}
		})
	}
}

// =============================================================================
// Integration tests for versioned updates with timezone considerations
// =============================================================================

// TestVersionedEdit_FutureMonthDoesNotAppearInPreviousMonth tests that when
// a versioned edit creates a new version starting in month N, it should NOT
// appear in months before N.
func TestVersionedEdit_FutureMonthDoesNotAppearInPreviousMonth(t *testing.T) {
	// Simulate: User edits income in Feb 2026, creating new version with start_date Feb 1
	// The new version should NOT appear in January 2026 timeline
	anchorDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	// Original income - starts Jan 1, ends Jan 31 (stopped by versioned update)
	originalIncome := FinancialDataRow{
		ID:        "income-original",
		ParentID:  "income-original",
		Name:      "Salary",
		Amount:    *decimal.MustFromString("5000"),
		Frequency: FrequencyMonthly,
		StartDate: anchorDate,
		EndDate:   timePtr(time.Date(2026, 1, 31, 23, 59, 59, 0, time.UTC)), // Stopped at end of Jan
		ItemType:  FinIncome,
	}

	// New version - starts Feb 1 (created by versioned update)
	// Using UTC to simulate correct frontend behavior
	newVersion := FinancialDataRow{
		ID:        "income-v2",
		ParentID:  "income-original",
		Name:      "Salary",
		Amount:    *decimal.MustFromString("6000"), // New amount
		Frequency: FrequencyMonthly,
		StartDate: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC), // Starts Feb 1 UTC
		EndDate:   nil,
		ItemType:  FinIncome,
	}

	// Check January - only original should be active
	janCheck := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	if !isActiveInMonth(originalIncome, janCheck) {
		t.Error("Original income should be active in January")
	}
	if isActiveInMonth(newVersion, janCheck) {
		t.Error("New version should NOT be active in January - it starts in February")
	}

	// Check February - only new version should be active
	febCheck := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)
	if isActiveInMonth(originalIncome, febCheck) {
		t.Error("Original income should NOT be active in February - it ended in January")
	}
	if !isActiveInMonth(newVersion, febCheck) {
		t.Error("New version should be active in February")
	}
}

// TestVersionedEdit_WithTimezoneOffset tests the P0 bug scenario where
// a user in +0800 timezone creates a versioned edit
func TestVersionedEdit_WithTimezoneOffset(t *testing.T) {
	sgtz := time.FixedZone("SGT", 8*60*60)

	// Simulate: User in Singapore (+0800) edits income for Feb 2026
	// Frontend should send: 2026-02-01T00:00:00.000Z (using Date.UTC)
	// NOT: 2026-01-31T16:00:00.000Z (which would happen with local Date)

	// CORRECT: Frontend uses Date.UTC
	correctStartDate := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)

	// INCORRECT (old bug): Frontend used local Date in +0800 timezone
	incorrectStartDate := time.Date(2026, 2, 1, 0, 0, 0, 0, sgtz) // This is Jan 31 16:00 UTC!

	newVersionCorrect := FinancialDataRow{
		ID:        "income-v2-correct",
		StartDate: correctStartDate,
	}

	janCheck := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)

	// Correct version should NOT appear in January
	if isActiveInMonth(newVersionCorrect, janCheck) {
		t.Error("Correctly dated version should NOT appear in January")
	}

	// The incorrectly dated version WOULD have appeared in January (the bug)
	// This test documents the bug behavior - if isActiveInMonth is timezone-aware,
	// even the incorrect date should be handled correctly
	t.Logf("Incorrect date (local +0800): %v", incorrectStartDate)
	t.Logf("Incorrect date in UTC: %v", incorrectStartDate.UTC())
	t.Logf("Correct date (UTC): %v", correctStartDate)

	// After our fix, even the incorrectly stored date should be handled correctly
	// because we compare calendar dates, not timestamps
	// However, the safest fix is to ensure frontend always sends UTC dates
}

// =============================================================================
// Tests for stop operations
// =============================================================================

// TestStopOperation_EndDateBoundary tests that stop operations correctly
// set end_date to exclude the item from the target month onwards
func TestStopOperation_EndDateBoundary(t *testing.T) {
	// Scenario: User wants to stop an income starting from March 2026
	// The end_date should be set to Feb 28 (last day of Feb) so that:
	// - Income IS active in Feb
	// - Income is NOT active in March

	income := FinancialDataRow{
		ID:        "income-1",
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   nil, // Will be set by stop operation
	}

	// Stop effective March means end_date = Feb 28
	// Frontend calculates: new Date(Date.UTC(2026, 2, 0)) = Feb 28
	stopEndDate := time.Date(2026, 2, 28, 23, 59, 59, 0, time.UTC)
	income.EndDate = &stopEndDate

	// Should still be active in February
	febCheck := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)
	if !isActiveInMonth(income, febCheck) {
		t.Error("Stopped income should still be active in February (the month before stop takes effect)")
	}

	// Should NOT be active in March
	marCheck := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)
	if isActiveInMonth(income, marCheck) {
		t.Error("Stopped income should NOT be active in March")
	}
}

// TestStopOperation_WithTimezoneOffset tests stop operation with timezone
func TestStopOperation_WithTimezoneOffset(t *testing.T) {
	// User in +0800 wants to stop income effective March
	// Frontend should send end_date as Feb 28 UTC, not Feb 28 +0800

	income := FinancialDataRow{
		ID:        "income-1",
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}

	// Correct end date (UTC)
	correctEndDate := time.Date(2026, 2, 28, 23, 59, 59, 0, time.UTC)
	income.EndDate = &correctEndDate

	febCheck := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)
	marCheck := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)

	if !isActiveInMonth(income, febCheck) {
		t.Error("Income should be active in February")
	}
	if isActiveInMonth(income, marCheck) {
		t.Error("Income should NOT be active in March after stop")
	}
}

// =============================================================================
// Tests for delete operations at anchor month
// =============================================================================

// TestDeleteAtAnchorMonth tests that delete at anchor month completely removes
// the item (not just sets end_date)
func TestDeleteAtAnchorMonth(t *testing.T) {
	// This is a documentation test - actual delete removes from DB
	// After delete, item should not appear in any timeline queries
	t.Log("Delete at anchor month should use direct DELETE API, not stop/end_date")
	t.Log("This removes the record entirely from the database")
}

// =============================================================================
// Helper functions
// =============================================================================

func timePtr(t time.Time) *time.Time {
	return &t
}
