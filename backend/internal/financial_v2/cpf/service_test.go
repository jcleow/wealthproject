package cpf

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
	repo "financial-chat-system/backend/internal/financial_v2/repository"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestComputeUsageFromScenario_BorrowerPersonNames verifies that
// pre-fetched borrower names from the PropertySG struct are used correctly.
func TestComputeUsageFromScenario_BorrowerPersonNames(t *testing.T) {
	service := &Service{}

	b1CpfAccountID := "cpf-account-1"
	b2CpfAccountID := "cpf-account-2"

	scenarioFull := &repo.PropertyScenarioFull{
		Scenario: repo.PropertyScenario{
			ID:     "scenario-123",
			UserID: "user-1",
		},
		PropertySG: &repo.PropertySG{
			ID:                        "property-sg-1",
			Name:                      "Test Property",
			PropertyType:              "hdb",
			PropertySubtype:           "resale",
			PropertyPrice:             *decimal.MustFromString("500000"),
			BorrowerType:              "joint",
			Borrower1CpfAccountID:     &b1CpfAccountID,
			Borrower2CpfAccountID:     &b2CpfAccountID,
			Borrower1PersonID:         "person-1",
			Borrower1PersonName:       "Alice Tan",
			Borrower2PersonID:         "person-2",
			Borrower2PersonName:       "Bob Tan",
			Borrower1DownpaymentCpfOa: *decimal.MustFromString("50000"),
			Borrower2DownpaymentCpfOa: *decimal.MustFromString("50000"),
			Borrower1MonthlyCpfOa:     *decimal.MustFromString("1000"),
			Borrower2MonthlyCpfOa:     *decimal.MustFromString("1000"),
			CreatedAt:                 time.Now().AddDate(-1, 0, 0), // 1 year ago
		},
		Grants: []repo.PropertySGGrant{},
	}

	result := service.computeUsageFromScenario(scenarioFull)

	require.NotNil(t, result, "Result should not be nil")

	// Verify borrower 1 uses pre-fetched person name
	require.NotNil(t, result.Borrower1, "Borrower1 should not be nil")
	assert.Equal(t, "person-1", result.Borrower1.PersonID)
	assert.Equal(t, "Alice Tan", result.Borrower1.PersonName)

	// Verify borrower 2 uses pre-fetched person name
	require.NotNil(t, result.Borrower2, "Borrower2 should not be nil for joint ownership")
	assert.Equal(t, "person-2", result.Borrower2.PersonID)
	assert.Equal(t, "Bob Tan", result.Borrower2.PersonName)
}

func TestComputeUsageFromScenario_SingleBorrower_NoBorrower2(t *testing.T) {
	service := &Service{}

	b1CpfAccountID := "cpf-account-1"

	scenarioFull := &repo.PropertyScenarioFull{
		Scenario: repo.PropertyScenario{
			ID:     "scenario-456",
			UserID: "user-1",
		},
		PropertySG: &repo.PropertySG{
			ID:                        "property-sg-2",
			Name:                      "Single Borrower Property",
			PropertyType:              "private",
			PropertySubtype:           "condo",
			PropertyPrice:             *decimal.MustFromString("1000000"),
			BorrowerType:              "single",
			Borrower1CpfAccountID:     &b1CpfAccountID,
			Borrower1PersonID:         "person-1",
			Borrower1PersonName:       "Charlie Lee",
			Borrower1DownpaymentCpfOa: *decimal.MustFromString("100000"),
			Borrower1MonthlyCpfOa:     *decimal.MustFromString("2000"),
			CreatedAt:                 time.Now().AddDate(-2, 0, 0), // 2 years ago
		},
		Grants: []repo.PropertySGGrant{},
	}

	result := service.computeUsageFromScenario(scenarioFull)

	require.NotNil(t, result, "Result should not be nil")

	// Verify borrower 1 data
	require.NotNil(t, result.Borrower1, "Borrower1 should not be nil")
	assert.Equal(t, "Charlie Lee", result.Borrower1.PersonName)

	// Borrower 2 should be nil for single ownership
	assert.Nil(t, result.Borrower2, "Borrower2 should be nil for single ownership")
}

func TestComputeUsageFromScenario_EmptyPersonName_UsesEmptyString(t *testing.T) {
	service := &Service{}

	b1CpfAccountID := "cpf-account-1"

	scenarioFull := &repo.PropertyScenarioFull{
		Scenario: repo.PropertyScenario{
			ID:     "scenario-789",
			UserID: "user-1",
		},
		PropertySG: &repo.PropertySG{
			ID:                        "property-sg-3",
			Name:                      "Property with missing person",
			PropertyType:              "hdb",
			PropertySubtype:           "bto",
			PropertyPrice:             *decimal.MustFromString("400000"),
			BorrowerType:              "single",
			Borrower1CpfAccountID:     &b1CpfAccountID,
			Borrower1PersonID:         "", // Empty - person record may be missing
			Borrower1PersonName:       "", // Empty - COALESCE fallback not tested here
			Borrower1DownpaymentCpfOa: *decimal.MustFromString("50000"),
			Borrower1MonthlyCpfOa:     *decimal.MustFromString("1000"),
			CreatedAt:                 time.Now(),
		},
		Grants: []repo.PropertySGGrant{},
	}

	result := service.computeUsageFromScenario(scenarioFull)

	require.NotNil(t, result, "Result should not be nil")
	require.NotNil(t, result.Borrower1, "Borrower1 should not be nil")

	// Empty person name is passed through (COALESCE is in SQL, not in Go)
	assert.Equal(t, "", result.Borrower1.PersonName)
	assert.Equal(t, "", result.Borrower1.PersonID)
}

func TestComputeUsageFromScenario_CalculatesProportionalInterest(t *testing.T) {
	service := &Service{}

	b1CpfAccountID := "cpf-account-1"
	b2CpfAccountID := "cpf-account-2"

	scenarioFull := &repo.PropertyScenarioFull{
		Scenario: repo.PropertyScenario{
			ID:     "scenario-interest",
			UserID: "user-1",
		},
		PropertySG: &repo.PropertySG{
			ID:                        "property-sg-interest",
			Name:                      "Interest Test Property",
			PropertyType:              "hdb",
			PropertySubtype:           "resale",
			PropertyPrice:             *decimal.MustFromString("600000"),
			BorrowerType:              "joint",
			Borrower1CpfAccountID:     &b1CpfAccountID,
			Borrower2CpfAccountID:     &b2CpfAccountID,
			Borrower1PersonID:         "person-1",
			Borrower1PersonName:       "Person One",
			Borrower2PersonID:         "person-2",
			Borrower2PersonName:       "Person Two",
			Borrower1DownpaymentCpfOa: *decimal.MustFromString("60000"), // 60% of OA used
			Borrower2DownpaymentCpfOa: *decimal.MustFromString("40000"), // 40% of OA used
			Borrower1MonthlyCpfOa:     *decimal.MustFromString("0"),
			Borrower2MonthlyCpfOa:     *decimal.MustFromString("0"),
			CreatedAt:                 time.Now().AddDate(-1, 0, 0), // 1 year ago
		},
		Grants: []repo.PropertySGGrant{},
	}

	result := service.computeUsageFromScenario(scenarioFull)

	require.NotNil(t, result, "Result should not be nil")
	require.NotNil(t, result.Borrower1, "Borrower1 should not be nil")
	require.NotNil(t, result.Borrower2, "Borrower2 should not be nil")

	// Verify person names are set
	assert.Equal(t, "Person One", result.Borrower1.PersonName)
	assert.Equal(t, "Person Two", result.Borrower2.PersonName)

	// Verify proportional interest allocation
	// Borrower 1 contributed 60%, Borrower 2 contributed 40%
	// So interest should be split proportionally
	b1Interest := result.Borrower1.AccruedInterest
	b2Interest := result.Borrower2.AccruedInterest

	require.NotNil(t, b1Interest, "Borrower1 interest should not be nil")
	require.NotNil(t, b2Interest, "Borrower2 interest should not be nil")

	// Borrower 1's interest should be greater than Borrower 2's (60% vs 40%)
	// Cmp returns 1 if b1Interest > b2Interest
	assert.Equal(t, 1, b1Interest.Cmp(b2Interest),
		"Borrower 1 should have more interest (60%% contribution) than Borrower 2 (40%%)")
}
