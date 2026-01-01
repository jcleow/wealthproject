package property

import (
	"fmt"
	"testing"

	"financial-chat-system/backend/internal/decimal"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateMortgage(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		name           string
		loanAmount     string
		termMonths     int
		annualRate     string
		wantMonthly    string
		wantInterest   string
		wantTotalPaid  string
	}{
		{
			name:          "standard 25-year HDB loan at 2.6%",
			loanAmount:    "680000",
			termMonths:    300, // 25 years
			annualRate:    "2.6",
			wantMonthly:   "3084.95",
			wantInterest:  "245485.00", // Rounding differences from amortization
			wantTotalPaid: "925485.00",
		},
		{
			name:          "short 10-year loan at 3.5%",
			loanAmount:    "500000",
			termMonths:    120, // 10 years
			annualRate:    "3.5",
			wantMonthly:   "4944.29",
			wantInterest:  "93314.80", // Rounding differences from amortization
			wantTotalPaid: "593314.80",
		},
		{
			name:          "zero interest rate",
			loanAmount:    "120000",
			termMonths:    120,
			annualRate:    "0",
			wantMonthly:   "1000.00",
			wantInterest:  "0",
			wantTotalPaid: "120000",
		},
		{
			name:          "high rate 5%",
			loanAmount:    "1000000",
			termMonths:    360, // 30 years
			annualRate:    "5",
			wantMonthly:   "5368.22",
			wantInterest:  "932559.20", // Rounding differences from amortization
			wantTotalPaid: "1932559.20",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			loanAmount := decimal.MustFromString(tt.loanAmount)
			annualRate := decimal.MustFromString(tt.annualRate)

			result := calc.CalculateMortgage(loanAmount, tt.termMonths, annualRate)

			require.NotNil(t, result)
			assert.Equal(t, tt.wantMonthly, result.MonthlyPayment.String(), "monthly payment mismatch")
			assert.Equal(t, tt.wantInterest, result.TotalInterest.String(), "total interest mismatch")
			assert.Equal(t, tt.wantTotalPaid, result.TotalAmountPaid.String(), "total paid mismatch")
		})
	}
}

func TestCalculateMortgage_Amortization(t *testing.T) {
	calc := NewCalculator()

	loanAmount := decimal.MustFromString("120000")
	annualRate := decimal.MustFromString("3")
	termMonths := 24 // 2 years

	result := calc.CalculateMortgage(loanAmount, termMonths, annualRate)

	require.NotNil(t, result)
	require.Len(t, result.Amortization, 2, "should have 2 years of amortization")

	// Year 1: verify starting balance
	assert.Equal(t, "120000.00", result.Amortization[0].StartingBalance.String())
	assert.Equal(t, 1, result.Amortization[0].Year)

	// Year 2: verify ending balance is close to zero
	assert.Equal(t, 2, result.Amortization[1].Year)
	zero := decimal.Zero()
	assert.True(t, result.Amortization[1].EndingBalance.Cmp(zero) <= 0 ||
		result.Amortization[1].EndingBalance.String() == "0.00",
		"ending balance should be zero or near zero")
}

func TestCalculateBSD(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		propertyPrice string
		expectedBsd   string
	}{
		// First $180K at 1%
		{"180000", "1800.00"},
		// $180K at 1% + $180K at 2%
		{"360000", "5400.00"},
		// $180K@1% + $180K@2% + $490K@3%
		{"850000", "20100.00"},
		// $180K@1% + $180K@2% + $640K@3% + $500K@4%
		{"1500000", "44600.00"},
		// All brackets up to 5%
		{"3000000", "119600.00"},
		// Includes 6% bracket
		{"3500000", "149600.00"},
	}

	for _, tt := range tests {
		t.Run(tt.propertyPrice, func(t *testing.T) {
			price := decimal.MustFromString(tt.propertyPrice)
			result := calc.CalculateBSD(price)
			assert.Equal(t, tt.expectedBsd, result.String())
		})
	}
}

func TestCalculateABSD(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		name          string
		propertyPrice string
		residency     string
		propertyCount int
		expectedAbsd  string
	}{
		// Singapore Citizen
		{"SC 1st property", "1000000", "singapore_citizen", 0, "0.00"},
		{"SC 2nd property", "1000000", "singapore_citizen", 1, "200000.00"},
		{"SC 3rd property", "1000000", "singapore_citizen", 2, "300000.00"},
		{"SC 4th property", "1000000", "singapore_citizen", 3, "300000.00"}, // max rate

		// Permanent Resident
		{"PR 1st property", "1000000", "permanent_resident", 0, "50000.00"},
		{"PR 2nd property", "1000000", "permanent_resident", 1, "300000.00"},
		{"PR 3rd property", "1000000", "permanent_resident", 2, "300000.00"},

		// Foreigner
		{"Foreigner 1st", "1000000", "foreigner", 0, "600000.00"},
		{"Foreigner 2nd", "1000000", "foreigner", 1, "600000.00"},

		// Unknown residency
		{"Unknown residency", "1000000", "unknown", 0, "0"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			price := decimal.MustFromString(tt.propertyPrice)
			result := calc.CalculateABSD(price, tt.residency, tt.propertyCount)
			assert.Equal(t, tt.expectedAbsd, result.String())
		})
	}
}

func TestCalculateSSD(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		holdingMonths int
		salePrice     string
		expectedSsd   string
		description   string
	}{
		{6, "1000000", "160000.00", "< 1 year = 16%"},
		{11, "1000000", "160000.00", "11 months = 16%"},
		{12, "1000000", "120000.00", "1 year = 12%"},
		{18, "1000000", "120000.00", "18 months = 12%"},
		{24, "1000000", "80000.00", "2 years = 8%"},
		{30, "1000000", "80000.00", "30 months = 8%"},
		{36, "1000000", "40000.00", "3 years = 4%"},
		{42, "1000000", "40000.00", "42 months = 4%"},
		{48, "1000000", "0", "4 years = 0%"},
		{60, "1000000", "0", "5 years = 0%"},
		{120, "1000000", "0", "10 years = 0%"},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%d_months", tt.holdingMonths), func(t *testing.T) {
			salePrice := decimal.MustFromString(tt.salePrice)
			result := calc.CalculateSSD(salePrice, tt.holdingMonths)
			assert.Equal(t, tt.expectedSsd, result.String(), tt.description)
		})
	}
}

func TestCalculateCpfAccruedInterest(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		name          string
		principal     string
		months        int
		annualRate    string
		expectedRange []string // min, max for approximate match
	}{
		{
			name:          "1 year at 2.5%",
			principal:     "100000",
			months:        12,
			annualRate:    "2.5",
			expectedRange: []string{"2528", "2530"}, // Compound monthly
		},
		{
			name:          "5 years at 2.5%",
			principal:     "100000",
			months:        60,
			annualRate:    "2.5",
			expectedRange: []string{"13200", "13400"}, // Compound monthly
		},
		{
			name:          "10 years at 2.5%",
			principal:     "284000",
			months:        120,
			annualRate:    "2.5",
			expectedRange: []string{"78000", "81000"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			principal := decimal.MustFromString(tt.principal)
			rate := decimal.MustFromString(tt.annualRate)
			result := calc.CalculateCpfAccruedInterest(principal, tt.months, rate)

			// Parse bounds
			minVal := decimal.MustFromString(tt.expectedRange[0])
			maxVal := decimal.MustFromString(tt.expectedRange[1])

			assert.True(t, result.Cmp(minVal) >= 0, "result %s should be >= %s", result.String(), minVal.String())
			assert.True(t, result.Cmp(maxVal) <= 0, "result %s should be <= %s", result.String(), maxVal.String())
		})
	}
}

func TestCalculatePropertyValueAtMonth(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		name         string
		initialValue string
		periods      []GrowthPeriod
		targetMonth  string
		expected     string
	}{
		{
			name:         "no growth periods",
			initialValue: "1000000",
			periods:      nil,
			targetMonth:  "2030-01",
			expected:     "1000000.00",
		},
		{
			name:         "fixed growth (no appreciation)",
			initialValue: "1000000",
			periods: []GrowthPeriod{
				{StartYear: 2025, GrowthRate: decimal.Zero(), GrowthStrategy: "fixed"},
			},
			targetMonth: "2030-01",
			expected:    "1000000.00",
		},
		{
			name:         "annual step growth 3% for 5 years",
			initialValue: "1000000",
			periods: []GrowthPeriod{
				{StartYear: 2025, EndYear: intPtr(2029), GrowthRate: decimal.MustFromString("3"), GrowthStrategy: "annual_step"},
			},
			targetMonth: "2029-12",
			expected:    "1159274.07", // 1M * 1.03^5
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			initial := decimal.MustFromString(tt.initialValue)
			result := calc.CalculatePropertyValueAtMonth(initial, tt.periods, tt.targetMonth)
			assert.Equal(t, tt.expected, result.String())
		})
	}
}

func TestCalculateAffordability(t *testing.T) {
	calc := NewCalculator()

	tests := []struct {
		name           string
		monthlyIncome  string
		monthlyPayment string
		otherDebt      string
		propertyType   string
		wantMsrPass    bool
		wantTdsrPass   bool
	}{
		{
			name:           "well within limits",
			monthlyIncome:  "10000",
			monthlyPayment: "2000", // 20% MSR
			otherDebt:      "1000", // 30% TDSR
			propertyType:   "hdb",
			wantMsrPass:    true,
			wantTdsrPass:   true,
		},
		{
			name:           "at MSR limit",
			monthlyIncome:  "10000",
			monthlyPayment: "3000", // 30% MSR exactly
			otherDebt:      "0",
			propertyType:   "hdb",
			wantMsrPass:    true,
			wantTdsrPass:   true,
		},
		{
			name:           "exceeds MSR limit",
			monthlyIncome:  "10000",
			monthlyPayment: "3500", // 35% MSR
			otherDebt:      "0",
			propertyType:   "hdb",
			wantMsrPass:    false,
			wantTdsrPass:   true,
		},
		{
			name:           "exceeds TDSR limit",
			monthlyIncome:  "10000",
			monthlyPayment: "3000",
			otherDebt:      "3000", // 60% TDSR
			propertyType:   "hdb",
			wantMsrPass:    true,
			wantTdsrPass:   false,
		},
		{
			name:           "exceeds both limits",
			monthlyIncome:  "10000",
			monthlyPayment: "4000", // 40% MSR
			otherDebt:      "2000", // 60% TDSR
			propertyType:   "hdb",
			wantMsrPass:    false,
			wantTdsrPass:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			income := decimal.MustFromString(tt.monthlyIncome)
			payment := decimal.MustFromString(tt.monthlyPayment)
			debt := decimal.MustFromString(tt.otherDebt)

			result := calc.CalculateAffordability(income, payment, debt, tt.propertyType)

			assert.Equal(t, tt.wantMsrPass, result.MsrPasses, "MSR pass mismatch")
			assert.Equal(t, tt.wantTdsrPass, result.TdsrPasses, "TDSR pass mismatch")
		})
	}
}

func TestGetBSDTiers(t *testing.T) {
	tiers := GetBSDTiers()

	assert.Len(t, tiers, 6, "should have 6 BSD tiers")

	// Verify first tier
	assert.Equal(t, "180000", tiers[0].UpTo.String())
	assert.Equal(t, "0.01", tiers[0].Rate.String())

	// Verify last tier has no upper limit
	assert.Nil(t, tiers[5].UpTo)
	assert.Equal(t, "0.06", tiers[5].Rate.String())
}

func TestGetABSDRates(t *testing.T) {
	rates := GetABSDRates()

	// Singapore Citizen
	scRates := rates["singapore_citizen"]
	assert.Equal(t, "0", scRates[0].String())  // 1st property
	assert.Equal(t, "20", scRates[1].String()) // 2nd property
	assert.Equal(t, "30", scRates[2].String()) // 3rd+ property

	// Permanent Resident
	prRates := rates["permanent_resident"]
	assert.Equal(t, "5", prRates[0].String())  // 1st property
	assert.Equal(t, "30", prRates[1].String()) // 2nd+ property

	// Foreigner
	fRates := rates["foreigner"]
	assert.Equal(t, "60", fRates[0].String()) // All properties
}

// Helper function
func intPtr(i int) *int {
	return &i
}
