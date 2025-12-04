package account

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
)

func TestCPFAccount_Age(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name        string
		dateOfBirth time.Time
		expectedAge int
	}{
		{
			name:        "30 years old - birthday earlier this year",
			dateOfBirth: time.Date(now.Year()-30, 1, 1, 0, 0, 0, 0, time.UTC),
			expectedAge: 30,
		},
		{
			name:        "55 years old - birthday earlier this year",
			dateOfBirth: time.Date(now.Year()-55, 1, 1, 0, 0, 0, 0, time.UTC),
			expectedAge: 55,
		},
		{
			name:        "65 years old - birthday earlier this year",
			dateOfBirth: time.Date(now.Year()-65, 1, 1, 0, 0, 0, 0, time.UTC),
			expectedAge: 65,
		},
		{
			name:        "Birthday not yet this year",
			dateOfBirth: time.Date(now.Year()-30, 12, 31, 0, 0, 0, 0, time.UTC), // Birthday is Dec 31
			expectedAge: 29,
		},
		{
			name:        "Birthday was Jan 1",
			dateOfBirth: time.Date(now.Year()-30, 1, 1, 0, 0, 0, 0, time.UTC),
			expectedAge: 30,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			acc := &CPFAccount{
				DateOfBirth: tt.dateOfBirth,
			}
			age := acc.Age()
			if age != tt.expectedAge {
				t.Errorf("Expected age %d, got %d", tt.expectedAge, age)
			}
		})
	}
}

func TestCPFAccount_AgeAtDate(t *testing.T) {
	// Person born on Jan 15, 1990
	dob := time.Date(1990, 1, 15, 0, 0, 0, 0, time.UTC)
	acc := &CPFAccount{DateOfBirth: dob}

	tests := []struct {
		name        string
		date        time.Time
		expectedAge int
	}{
		{
			name:        "On 35th birthday",
			date:        time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
			expectedAge: 35,
		},
		{
			name:        "Day before 35th birthday",
			date:        time.Date(2025, 1, 14, 0, 0, 0, 0, time.UTC),
			expectedAge: 34,
		},
		{
			name:        "Day after 35th birthday",
			date:        time.Date(2025, 1, 16, 0, 0, 0, 0, time.UTC),
			expectedAge: 35,
		},
		{
			name:        "December 2024 (before 35th birthday)",
			date:        time.Date(2024, 12, 31, 0, 0, 0, 0, time.UTC),
			expectedAge: 34,
		},
		{
			name:        "February 2025 (after 35th birthday)",
			date:        time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC),
			expectedAge: 35,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			age := acc.AgeAtDate(tt.date)
			if age != tt.expectedAge {
				t.Errorf("Expected age %d at %s, got %d", tt.expectedAge, tt.date.Format("2006-01-02"), age)
			}
		})
	}
}

func TestCPFAccount_TotalBalance(t *testing.T) {
	tests := []struct {
		name     string
		oa       int64
		sa       int64
		ma       int64
		ra       int64
		expected int64
	}{
		{
			name:     "All accounts have balance",
			oa:       10000000, // $100,000 in cents
			sa:       5000000,  // $50,000
			ma:       3000000,  // $30,000
			ra:       2000000,  // $20,000
			expected: 20000000, // $200,000
		},
		{
			name:     "Only OA and SA (under 55)",
			oa:       5000000,
			sa:       2000000,
			ma:       1000000,
			ra:       0,
			expected: 8000000,
		},
		{
			name:     "Zero balances",
			oa:       0,
			sa:       0,
			ma:       0,
			ra:       0,
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			acc := &CPFAccount{
				OABalance: tt.oa,
				SABalance: tt.sa,
				MABalance: tt.ma,
				RABalance: tt.ra,
			}
			total := acc.TotalBalance()
			if total != tt.expected {
				t.Errorf("Expected total balance %d, got %d", tt.expected, total)
			}
		})
	}
}

func TestCPFAccount_ResidencyStatus(t *testing.T) {
	tests := []struct {
		name     string
		status   config.ResidencyStatus
		expected string
	}{
		{"Citizen", config.ResidencyCitizen, "citizen"},
		{"PR Year 1", config.ResidencyPRYear1, "pr_year_1"},
		{"PR Year 2", config.ResidencyPRYear2, "pr_year_2"},
		{"PR Year 3+", config.ResidencyPRYear3Plus, "pr_year_3_plus"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			acc := &CPFAccount{ResidencyStatus: tt.status}
			if string(acc.ResidencyStatus) != tt.expected {
				t.Errorf("Expected residency status '%s', got '%s'", tt.expected, acc.ResidencyStatus)
			}
		})
	}
}

func TestCPFAccount_AgeAtPaymentDate(t *testing.T) {
	// This test verifies the age calculation logic that's crucial for CPF rate determination
	// Age is determined by the age on the date of payment, not calendar year

	// Person born on July 15, 1969 (turning 55 in 2024)
	dob := time.Date(1969, 7, 15, 0, 0, 0, 0, time.UTC)
	acc := &CPFAccount{DateOfBirth: dob}

	// Payment in January 2024 - before 55th birthday
	jan2024 := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
	if acc.AgeAtDate(jan2024) != 54 {
		t.Errorf("Expected age 54 in Jan 2024, got %d", acc.AgeAtDate(jan2024))
	}

	// Payment on 55th birthday
	birthday55 := time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC)
	if acc.AgeAtDate(birthday55) != 55 {
		t.Errorf("Expected age 55 on birthday, got %d", acc.AgeAtDate(birthday55))
	}

	// Payment in August 2024 - after 55th birthday
	aug2024 := time.Date(2024, 8, 15, 0, 0, 0, 0, time.UTC)
	if acc.AgeAtDate(aug2024) != 55 {
		t.Errorf("Expected age 55 in Aug 2024, got %d", acc.AgeAtDate(aug2024))
	}

	// This matters for CPF rates:
	// - Before July 15, 2024: Uses "up to 55" rates (20%/17%)
	// - From July 15, 2024 onwards: Uses "above 55 to 60" rates (15%/14.5%)
}

func TestCPFAccount_PRGrantDate(t *testing.T) {
	prDate := time.Date(2023, 6, 1, 0, 0, 0, 0, time.UTC)
	acc := &CPFAccount{
		ResidencyStatus: config.ResidencyPRYear2,
		PRGrantDate:     &prDate,
	}

	if acc.PRGrantDate == nil {
		t.Fatal("Expected PR grant date to be set")
	}
	if *acc.PRGrantDate != prDate {
		t.Errorf("Expected PR grant date %v, got %v", prDate, *acc.PRGrantDate)
	}
}

func TestCPFAccount_HousingTracking(t *testing.T) {
	housingStart := time.Date(2020, 3, 1, 0, 0, 0, 0, time.UTC)
	acc := &CPFAccount{
		OABalance:        5000000, // $50,000
		OAUsedForHousing: 3000000, // $30,000 used for housing
		HousingStartDate: &housingStart,
	}

	if acc.OAUsedForHousing != 3000000 {
		t.Errorf("Expected $30,000 used for housing, got %d cents", acc.OAUsedForHousing)
	}
	if acc.HousingStartDate == nil {
		t.Fatal("Expected housing start date to be set")
	}
}

func TestErrNotFound(t *testing.T) {
	if ErrNotFound == nil {
		t.Fatal("ErrNotFound should not be nil")
	}
	if ErrNotFound.Error() != "cpf account not found" {
		t.Errorf("Unexpected error message: %s", ErrNotFound.Error())
	}
}
