package config

import (
	"context"
	"fmt"
	"time"
)

// SeedConfigurations seeds the database with CPF configurations for known years.
// Rates and ceilings are sourced from:
// https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func SeedConfigurations(ctx context.Context, loader *Loader) error {
	configs := []CPFConfiguration{
		Config2024(),
		Config2025(),
	}

	for _, cfg := range configs {
		if err := loader.Upsert(ctx, &cfg); err != nil {
			return fmt.Errorf("failed to seed CPF config for %d: %w", cfg.Year, err)
		}
	}

	return nil
}

// Config2024 returns the CPF configuration for 2024
func Config2024() CPFConfiguration {
	return CPFConfiguration{
		Year:          2024,
		EffectiveFrom: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		EffectiveTo:   ptr(time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)),
		Config: ConfigData{
			OWCeiling:      6800, // $6,800 per month
			AnnualCeiling:  102000,
			CPFAnnualLimit: 37740,

			RetirementSums: RetirementSums{
				BRS: 102900,
				FRS: 205800,
				ERS: 308700,
			},

			BHS: 68500,

			InterestRates: InterestRates{
				OA:                   0.025,
				SA:                   0.04,
				MA:                   0.04,
				RA:                   0.04,
				Extra1PctFirst60k:        0.01,
				Extra2PctFirst30kAbove55: 0.02,
				Extra1PctNext30kAbove55:  0.01,
			},

			ContributionRates: ContributionRateTable{
				CitizenAndPR3Plus: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.20, Employer: 0.17},
					Above55To60: RatePair{Employee: 0.15, Employer: 0.145},
					Above60To65: RatePair{Employee: 0.095, Employer: 0.11},
					Above65To70: RatePair{Employee: 0.075, Employer: 0.09},
					Above70:     RatePair{Employee: 0.05, Employer: 0.075},
				},
				PRYear1: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.05, Employer: 0.04},
					Above55To60: RatePair{Employee: 0.05, Employer: 0.04},
					Above60To65: RatePair{Employee: 0.05, Employer: 0.04},
					Above65To70: RatePair{Employee: 0.05, Employer: 0.04},
					Above70:     RatePair{Employee: 0.05, Employer: 0.04},
				},
				PRYear2: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.15, Employer: 0.09},
					Above55To60: RatePair{Employee: 0.125, Employer: 0.09},
					Above60To65: RatePair{Employee: 0.075, Employer: 0.085},
					Above65To70: RatePair{Employee: 0.05, Employer: 0.065},
					Above70:     RatePair{Employee: 0.05, Employer: 0.065},
				},
			},

			AllocationRates: AllocationRateTable{
				UpTo35:      AllocationRates{OA: 0.6217, SA: 0.1621, MA: 0.2162},
				Above35To45: AllocationRates{OA: 0.5676, SA: 0.1892, MA: 0.2432},
				Above45To50: AllocationRates{OA: 0.5135, SA: 0.2162, MA: 0.2703},
				Above50To55: AllocationRates{OA: 0.4054, SA: 0.3108, MA: 0.2838},
				Above55To60: AllocationRates{OA: 0.4068, SA: 0.1186, MA: 0.3559, RA: 0.1186},
				Above60To65: AllocationRates{OA: 0.1707, SA: 0.1220, MA: 0.5122, RA: 0.1951},
				Above65:     AllocationRates{OA: 0.0800, SA: 0.0800, MA: 0.5200, RA: 0.3200},
			},
		},
	}
}

// Config2025 returns the CPF configuration for 2025
func Config2025() CPFConfiguration {
	return CPFConfiguration{
		Year:          2025,
		EffectiveFrom: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		EffectiveTo:   nil, // Current/latest
		Config: ConfigData{
			OWCeiling:      7400, // Increased to $7,400 per month in 2025
			AnnualCeiling:  102000,
			CPFAnnualLimit: 37740,

			RetirementSums: RetirementSums{
				BRS: 106500, // Updated for 2025
				FRS: 213000,
				ERS: 426000,
			},

			BHS: 71500, // Updated for 2025

			InterestRates: InterestRates{
				OA:                   0.025,
				SA:                   0.04,
				MA:                   0.04,
				RA:                   0.04,
				Extra1PctFirst60k:        0.01,
				Extra2PctFirst30kAbove55: 0.02,
				Extra1PctNext30kAbove55:  0.01,
			},

			ContributionRates: ContributionRateTable{
				CitizenAndPR3Plus: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.20, Employer: 0.17},
					Above55To60: RatePair{Employee: 0.15, Employer: 0.145},
					Above60To65: RatePair{Employee: 0.095, Employer: 0.11},
					Above65To70: RatePair{Employee: 0.075, Employer: 0.09},
					Above70:     RatePair{Employee: 0.05, Employer: 0.075},
				},
				PRYear1: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.05, Employer: 0.04},
					Above55To60: RatePair{Employee: 0.05, Employer: 0.04},
					Above60To65: RatePair{Employee: 0.05, Employer: 0.04},
					Above65To70: RatePair{Employee: 0.05, Employer: 0.04},
					Above70:     RatePair{Employee: 0.05, Employer: 0.04},
				},
				PRYear2: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: 0.15, Employer: 0.09},
					Above55To60: RatePair{Employee: 0.125, Employer: 0.09},
					Above60To65: RatePair{Employee: 0.075, Employer: 0.085},
					Above65To70: RatePair{Employee: 0.05, Employer: 0.065},
					Above70:     RatePair{Employee: 0.05, Employer: 0.065},
				},
			},

			AllocationRates: AllocationRateTable{
				UpTo35:      AllocationRates{OA: 0.6217, SA: 0.1621, MA: 0.2162},
				Above35To45: AllocationRates{OA: 0.5676, SA: 0.1892, MA: 0.2432},
				Above45To50: AllocationRates{OA: 0.5135, SA: 0.2162, MA: 0.2703},
				Above50To55: AllocationRates{OA: 0.4054, SA: 0.3108, MA: 0.2838},
				Above55To60: AllocationRates{OA: 0.4068, SA: 0.1186, MA: 0.3559, RA: 0.1186},
				Above60To65: AllocationRates{OA: 0.1707, SA: 0.1220, MA: 0.5122, RA: 0.1951},
				Above65:     AllocationRates{OA: 0.0800, SA: 0.0800, MA: 0.5200, RA: 0.3200},
			},
		},
	}
}

func ptr(t time.Time) *time.Time {
	return &t
}
