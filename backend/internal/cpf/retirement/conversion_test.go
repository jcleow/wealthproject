package retirement

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestCalculateConversion(t *testing.T) {
	// 2026 retirement sums
	brs := decimal.NewFromInt64(110200, 0)
	frs := decimal.NewFromInt64(220400, 0)
	ers := decimal.NewFromInt64(440800, 0)
	bhs := decimal.NewFromInt64(79000, 0)

	tests := []struct {
		name            string
		input           ConversionInput
		wantSAToRA      float64
		wantOAToRA      float64
		wantMAOverflow  float64
		wantFinalRA     float64
		wantFinalOA     float64
		wantMeetsTarget bool
		wantCPFLife     bool
		wantErr         bool
	}{
		{
			name: "SA+OA exceeds FRS - transfer SA only",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(100000, 0),
				SABalance:    decimal.NewFromInt64(250000, 0), // SA alone exceeds FRS
				MABalance:    decimal.NewFromInt64(50000, 0),
				TargetScheme: TargetFRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      250000, // All SA transferred
			wantOAToRA:      0,      // No OA needed
			wantFinalRA:     250000, // SA becomes RA
			wantFinalOA:     100000, // OA unchanged
			wantMeetsTarget: true,
			wantCPFLife:     true,
		},
		{
			name: "SA below FRS - transfer SA + partial OA",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(150000, 0),
				SABalance:    decimal.NewFromInt64(100000, 0),
				MABalance:    decimal.NewFromInt64(50000, 0),
				TargetScheme: TargetFRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      100000, // All SA
			wantOAToRA:      120400, // Need 220400 - 100000 = 120400 from OA
			wantFinalRA:     220400, // Exactly FRS
			wantFinalOA:     29600,  // 150000 - 120400
			wantMeetsTarget: true,
			wantCPFLife:     true,
		},
		{
			name: "Insufficient funds - below FRS",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(50000, 0),
				SABalance:    decimal.NewFromInt64(100000, 0),
				MABalance:    decimal.NewFromInt64(30000, 0),
				TargetScheme: TargetFRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      100000, // All SA
			wantOAToRA:      50000,  // All OA
			wantFinalRA:     150000, // Below FRS
			wantFinalOA:     0,      // All OA used
			wantMeetsTarget: false,  // Below FRS
			wantCPFLife:     true,   // Still >= $60k
		},
		{
			name: "BRS target - lower threshold",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(50000, 0),
				SABalance:    decimal.NewFromInt64(80000, 0),
				MABalance:    decimal.NewFromInt64(30000, 0),
				TargetScheme: TargetBRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      80000, // All SA
			wantOAToRA:      30200, // Need 110200 - 80000
			wantFinalRA:     110200,
			wantFinalOA:     19800,
			wantMeetsTarget: true,
			wantCPFLife:     true,
		},
		{
			name: "MA overflow to RA",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(100000, 0),
				SABalance:    decimal.NewFromInt64(250000, 0), // SA exceeds FRS, so no OA needed
				MABalance:    decimal.NewFromInt64(100000, 0), // Exceeds BHS by 21000
				TargetScheme: TargetFRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      250000,
			wantOAToRA:      0,
			wantMAOverflow:  21000,  // 100000 - 79000
			wantFinalRA:     271000, // 250000 + 21000
			wantFinalOA:     100000,
			wantMeetsTarget: true,
			wantCPFLife:     true,
		},
		{
			name: "Property pledge reduces target",
			input: ConversionInput{
				OABalance:            decimal.NewFromInt64(100000, 0),
				SABalance:            decimal.NewFromInt64(100000, 0),
				MABalance:            decimal.NewFromInt64(50000, 0),
				TargetScheme:         TargetFRS,
				BRS:                  brs,
				FRS:                  frs,
				ERS:                  ers,
				BHS:                  bhs,
				PropertyPledgeAmount: decimal.NewFromInt64(55100, 0), // 50% of BRS
			},
			wantSAToRA:      100000,
			wantOAToRA:      65300,  // FRS - pledge - SA = 220400 - 55100 - 100000
			wantFinalRA:     165300, // Reduced target met
			wantFinalOA:     34700,  // 100000 - 65300
			wantMeetsTarget: true,
			wantCPFLife:     true,
		},
		{
			name: "Below CPF LIFE threshold",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(20000, 0),
				SABalance:    decimal.NewFromInt64(30000, 0),
				MABalance:    decimal.NewFromInt64(10000, 0),
				TargetScheme: TargetBRS,
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantSAToRA:      30000, // All SA
			wantOAToRA:      20000, // All OA
			wantFinalRA:     50000, // Below $60k
			wantFinalOA:     0,
			wantMeetsTarget: false,
			wantCPFLife:     false, // Below $60k
		},
		{
			name: "Invalid target scheme",
			input: ConversionInput{
				OABalance:    decimal.NewFromInt64(100000, 0),
				SABalance:    decimal.NewFromInt64(100000, 0),
				MABalance:    decimal.NewFromInt64(50000, 0),
				TargetScheme: "invalid",
				BRS:          brs,
				FRS:          frs,
				ERS:          ers,
				BHS:          bhs,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := CalculateConversion(tt.input)

			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Check SA transfer
			if got := result.SAToRA.ToFloat64(); got != tt.wantSAToRA {
				t.Errorf("SAToRA = %.2f, want %.2f", got, tt.wantSAToRA)
			}

			// Check OA transfer
			if got := result.OAToRA.ToFloat64(); got != tt.wantOAToRA {
				t.Errorf("OAToRA = %.2f, want %.2f", got, tt.wantOAToRA)
			}

			// Check MA overflow
			if tt.wantMAOverflow > 0 {
				if got := result.MAOverflowToRA.ToFloat64(); got != tt.wantMAOverflow {
					t.Errorf("MAOverflowToRA = %.2f, want %.2f", got, tt.wantMAOverflow)
				}
			}

			// Check final RA
			if got := result.FinalRA.ToFloat64(); got != tt.wantFinalRA {
				t.Errorf("FinalRA = %.2f, want %.2f", got, tt.wantFinalRA)
			}

			// Check final OA
			if got := result.FinalOA.ToFloat64(); got != tt.wantFinalOA {
				t.Errorf("FinalOA = %.2f, want %.2f", got, tt.wantFinalOA)
			}

			// Check meets target
			if result.MeetsTarget != tt.wantMeetsTarget {
				t.Errorf("MeetsTarget = %v, want %v", result.MeetsTarget, tt.wantMeetsTarget)
			}

			// Check CPF LIFE eligibility
			if result.CPFLifeEligible != tt.wantCPFLife {
				t.Errorf("CPFLifeEligible = %v, want %v", result.CPFLifeEligible, tt.wantCPFLife)
			}
		})
	}
}
