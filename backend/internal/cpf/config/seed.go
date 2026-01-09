package config

import (
	"time"

	"financial-chat-system/backend/internal/decimal"
)

// d is a helper to create decimal from string
func d(s string) decimal.Decimal {
	return *decimal.MustFromString(s)
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
				OA:                       d("0.025"),
				SA:                       d("0.04"),
				MA:                       d("0.04"),
				RA:                       d("0.04"),
				Extra1PctFirst60k:        d("0.01"),
				Extra2PctFirst30kAbove55: d("0.02"),
				Extra1PctNext30kAbove55:  d("0.01"),
			},

			ContributionRates: ContributionRateTable{
				CitizenAndPR3Plus: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.20"), Employer: d("0.17")},
					Above55To60: RatePair{Employee: d("0.15"), Employer: d("0.145")},
					Above60To65: RatePair{Employee: d("0.095"), Employer: d("0.11")},
					Above65To70: RatePair{Employee: d("0.075"), Employer: d("0.09")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.075")},
				},
				PRYear1: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above55To60: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above60To65: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.04")},
				},
				PRYear2: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.15"), Employer: d("0.09")},
					Above55To60: RatePair{Employee: d("0.125"), Employer: d("0.09")},
					Above60To65: RatePair{Employee: d("0.075"), Employer: d("0.085")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.065")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.065")},
				},
			},

			AllocationRates: AllocationRateTable{
				UpTo35:      AllocationRates{OA: d("0.6217"), SA: d("0.1621"), MA: d("0.2162"), RA: d("0")},
				Above35To45: AllocationRates{OA: d("0.5676"), SA: d("0.1892"), MA: d("0.2432"), RA: d("0")},
				Above45To50: AllocationRates{OA: d("0.5135"), SA: d("0.2162"), MA: d("0.2703"), RA: d("0")},
				Above50To55: AllocationRates{OA: d("0.4054"), SA: d("0.3108"), MA: d("0.2838"), RA: d("0")},
				Above55To60: AllocationRates{OA: d("0.4068"), SA: d("0.1186"), MA: d("0.3559"), RA: d("0.1186")},
				Above60To65: AllocationRates{OA: d("0.1707"), SA: d("0.1220"), MA: d("0.5122"), RA: d("0.1951")},
				Above65:     AllocationRates{OA: d("0.0800"), SA: d("0.0800"), MA: d("0.5200"), RA: d("0.3200")},
			},
		},
	}
}

// Config2025 returns the CPF configuration for 2025
// Rates and ceilings sourced from:
// https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func Config2025() CPFConfiguration {
	return CPFConfiguration{
		Year:          2025,
		EffectiveFrom: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		EffectiveTo:   ptr(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)),
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
				OA:                       d("0.025"),
				SA:                       d("0.04"),
				MA:                       d("0.04"),
				RA:                       d("0.04"),
				Extra1PctFirst60k:        d("0.01"),
				Extra2PctFirst30kAbove55: d("0.02"),
				Extra1PctNext30kAbove55:  d("0.01"),
			},

			ContributionRates: ContributionRateTable{
				CitizenAndPR3Plus: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.20"), Employer: d("0.17")},
					Above55To60: RatePair{Employee: d("0.15"), Employer: d("0.145")},
					Above60To65: RatePair{Employee: d("0.095"), Employer: d("0.11")},
					Above65To70: RatePair{Employee: d("0.075"), Employer: d("0.09")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.075")},
				},
				PRYear1: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above55To60: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above60To65: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.04")},
				},
				PRYear2: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.15"), Employer: d("0.09")},
					Above55To60: RatePair{Employee: d("0.125"), Employer: d("0.09")},
					Above60To65: RatePair{Employee: d("0.075"), Employer: d("0.085")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.065")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.065")},
				},
			},

			AllocationRates: AllocationRateTable{
				UpTo35:      AllocationRates{OA: d("0.6217"), SA: d("0.1621"), MA: d("0.2162"), RA: d("0")},
				Above35To45: AllocationRates{OA: d("0.5676"), SA: d("0.1892"), MA: d("0.2432"), RA: d("0")},
				Above45To50: AllocationRates{OA: d("0.5135"), SA: d("0.2162"), MA: d("0.2703"), RA: d("0")},
				Above50To55: AllocationRates{OA: d("0.4054"), SA: d("0.3108"), MA: d("0.2838"), RA: d("0")},
				Above55To60: AllocationRates{OA: d("0.4068"), SA: d("0.1186"), MA: d("0.3559"), RA: d("0.1186")},
				Above60To65: AllocationRates{OA: d("0.1707"), SA: d("0.1220"), MA: d("0.5122"), RA: d("0.1951")},
				Above65:     AllocationRates{OA: d("0.0800"), SA: d("0.0800"), MA: d("0.5200"), RA: d("0.3200")},
			},
		},
	}
}

// Config2026 returns the CPF configuration for 2026
// Key changes from 2025:
// - OW ceiling increases from $7,400 to $8,000/month
// - Retirement sums increase ~3.5%
// Sourced from: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func Config2026() CPFConfiguration {
	return CPFConfiguration{
		Year:          2026,
		EffectiveFrom: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EffectiveTo:   nil, // Current/latest
		Config: ConfigData{
			OWCeiling:      8000, // Increased to $8,000 per month in 2026
			AnnualCeiling:  102000,
			CPFAnnualLimit: 37740,

			RetirementSums: RetirementSums{
				BRS: 110200, // Updated for 2026
				FRS: 220400,
				ERS: 440800,
			},

			BHS: 75500, // Updated for 2026 (estimated ~$4k increase)

			InterestRates: InterestRates{
				OA:                       d("0.025"),
				SA:                       d("0.04"),
				MA:                       d("0.04"),
				RA:                       d("0.04"),
				Extra1PctFirst60k:        d("0.01"),
				Extra2PctFirst30kAbove55: d("0.02"),
				Extra1PctNext30kAbove55:  d("0.01"),
			},

			// Contribution rates unchanged from 2025
			ContributionRates: ContributionRateTable{
				CitizenAndPR3Plus: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.20"), Employer: d("0.17")},
					Above55To60: RatePair{Employee: d("0.15"), Employer: d("0.145")},
					Above60To65: RatePair{Employee: d("0.095"), Employer: d("0.11")},
					Above65To70: RatePair{Employee: d("0.075"), Employer: d("0.09")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.075")},
				},
				PRYear1: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above55To60: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above60To65: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.04")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.04")},
				},
				PRYear2: AgeBasedContributionRates{
					UpTo55:      RatePair{Employee: d("0.15"), Employer: d("0.09")},
					Above55To60: RatePair{Employee: d("0.125"), Employer: d("0.09")},
					Above60To65: RatePair{Employee: d("0.075"), Employer: d("0.085")},
					Above65To70: RatePair{Employee: d("0.05"), Employer: d("0.065")},
					Above70:     RatePair{Employee: d("0.05"), Employer: d("0.065")},
				},
			},

			// Allocation rates unchanged from 2025
			AllocationRates: AllocationRateTable{
				UpTo35:      AllocationRates{OA: d("0.6217"), SA: d("0.1621"), MA: d("0.2162"), RA: d("0")},
				Above35To45: AllocationRates{OA: d("0.5676"), SA: d("0.1892"), MA: d("0.2432"), RA: d("0")},
				Above45To50: AllocationRates{OA: d("0.5135"), SA: d("0.2162"), MA: d("0.2703"), RA: d("0")},
				Above50To55: AllocationRates{OA: d("0.4054"), SA: d("0.3108"), MA: d("0.2838"), RA: d("0")},
				Above55To60: AllocationRates{OA: d("0.4068"), SA: d("0.1186"), MA: d("0.3559"), RA: d("0.1186")},
				Above60To65: AllocationRates{OA: d("0.1707"), SA: d("0.1220"), MA: d("0.5122"), RA: d("0.1951")},
				Above65:     AllocationRates{OA: d("0.0800"), SA: d("0.0800"), MA: d("0.5200"), RA: d("0.3200")},
			},
		},
	}
}

func ptr(t time.Time) *time.Time {
	return &t
}
