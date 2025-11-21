package financial

import (
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"
)

// ParameterValidator validates tool parameters beyond basic JSON schema
type ParameterValidator struct {
	emailRegex *regexp.Regexp
	phoneRegex *regexp.Regexp
	dateRegex  *regexp.Regexp
}

// NewParameterValidator creates a new parameter validator
func NewParameterValidator() *ParameterValidator {
	return &ParameterValidator{
		emailRegex: regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`),
		phoneRegex: regexp.MustCompile(`^[+]?[(]?[\d\s\-\(\)]{8,15}$`),
		dateRegex:  regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`),
	}
}

// ValidateParameters performs comprehensive parameter validation
func (v *ParameterValidator) ValidateParameters(toolName string, args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	switch toolName {
	case "createAsset":
		errors = append(errors, v.validateAssetParameters(args)...)
	case "updateAsset":
		errors = append(errors, v.validateAssetUpdateParameters(args)...)
	case "createLiability":
		errors = append(errors, v.validateLiabilityParameters(args)...)
	case "updateLiability":
		errors = append(errors, v.validateLiabilityUpdateParameters(args)...)
	case "createPropertyScenario":
		errors = append(errors, v.validatePropertyScenarioParameters(args)...)
	}

	return errors
}

// validateAssetParameters validates asset creation parameters
func (v *ParameterValidator) validateAssetParameters(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	// Validate category
	category := getStringParam(args, "category", "")
	validCategories := []string{
		"property_real_estate",
		"hdb_property", "condo_property", "landed_property",
		"cash_savings", "cpf_account", "stocks_portfolio",
		"bonds_investment", "bank_account", "cryptocurrency", "other_asset",
	}
	if !v.isValidEnum(category, validCategories) {
		errors = append(errors, ValidationError{
			Field:   "category",
			Message: fmt.Sprintf("Invalid category '%s'. Must be one of: %s", category, strings.Join(validCategories, ", ")),
			Code:    "invalid_enum_value",
		})
	}

	// Validate name
	name := getStringParam(args, "name", "")
	if len(name) == 0 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Asset name cannot be empty",
			Code:    "required_field_missing",
		})
	} else if len(name) > 100 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "Asset name cannot exceed 100 characters",
			Code:    "field_too_long",
		})
	}

	// Validate current value
	value := getFloatParam(args, "currentValue", 0)
	if value <= 0 {
		errors = append(errors, ValidationError{
			Field:   "currentValue",
			Message: "Asset value must be greater than 0",
			Code:    "invalid_range",
		})
	} else if value > 100000000 {
		errors = append(errors, ValidationError{
			Field:   "currentValue",
			Message: "Asset value cannot exceed $100M",
			Code:    "invalid_range",
		})
	}

	// Validate growth rate if provided
	if _, exists := args["annualGrowthRate"]; exists {
		rate := getFloatParam(args, "annualGrowthRate", 0)
		if rate < -0.5 || rate > 1.0 {
			errors = append(errors, ValidationError{
				Field:   "annualGrowthRate",
				Message: "Growth rate must be between -50% and 100%",
				Code:    "invalid_range",
			})
		}
	}

	// Business rule validations
	errors = append(errors, v.validateAssetBusinessRules(args)...)

	return errors
}

// validateAssetBusinessRules validates business-specific rules for assets
func (v *ParameterValidator) validateAssetBusinessRules(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	category := getStringParam(args, "category", "")
	value := getFloatParam(args, "currentValue", 0)

	ensurePropertyRange := func(val float64) []ValidationError {
		var errs []ValidationError
		if val > 100000000 {
			errs = append(errs, ValidationError{
				Field:   "currentValue",
				Message: "Property value seems unusually high. Please verify.",
				Code:    "business_rule_warning",
			})
		} else if val < 50000 {
			errs = append(errs, ValidationError{
				Field:   "currentValue",
				Message: "Property value seems unusually low. Please verify the property details.",
				Code:    "business_rule_warning",
			})
		}
		return errs
	}

	switch category {
	case "property_real_estate", "condo_property", "landed_property":
		// Simple guardrails for property pricing
		errors = append(errors, ensurePropertyRange(value)...)

	case "cpf_account":
		// CPF accounts have contribution limits
		if value > 300000 { // Simplified limit check
			errors = append(errors, ValidationError{
				Field:   "currentValue",
				Message: "CPF account value seems unusually high. Please verify.",
				Code:    "business_rule_warning",
			})
		}

	case "cash_savings", "bank_account":
		// Large cash holdings might indicate better investment opportunities
		if value > 100000 {
			errors = append(errors, ValidationError{
				Field:   "currentValue",
				Message: "Large cash holding detected. Consider investment opportunities for better returns.",
				Code:    "business_rule_suggestion",
			})
		}

	case "hdb_property":
		// General property guardrails
		errors = append(errors, ensurePropertyRange(value)...)

		// HDB price ranges (simplified)
		if value > 1500000 {
			errors = append(errors, ValidationError{
				Field:   "currentValue",
				Message: "HDB value seems unusually high. Please verify the property type.",
				Code:    "business_rule_warning",
			})
		} else if value < 200000 {
			errors = append(errors, ValidationError{
				Field:   "currentValue",
				Message: "HDB value seems unusually low. Please verify the property details.",
				Code:    "business_rule_warning",
			})
		}
	}

	return errors
}

// validateLiabilityParameters validates liability creation parameters
func (v *ParameterValidator) validateLiabilityParameters(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	// Validate category
	category := getStringParam(args, "category", "")
	validCategories := []string{
		"mortgage", "mortgage_home", "personal_loan", "car_loan", "education_loan",
		"credit_card", "business_loan", "overdraft", "other_debt",
	}
	if !v.isValidEnum(category, validCategories) {
		errors = append(errors, ValidationError{
			Field:   "category",
			Message: fmt.Sprintf("Invalid category '%s'. Must be one of: %s", category, strings.Join(validCategories, ", ")),
			Code:    "invalid_enum_value",
		})
	}

	// Validate interest rate
	rate := getFloatParam(args, "interestRate", 0)
	if rate < 0 {
		errors = append(errors, ValidationError{
			Field:   "interestRate",
			Message: "Interest rate cannot be negative",
			Code:    "invalid_range",
		})
	} else if rate > 1.0 {
		errors = append(errors, ValidationError{
			Field:   "interestRate",
			Message: "Interest rate cannot exceed 100%",
			Code:    "invalid_range",
		})
	}

	// Validate current balance
	balance := getFloatParam(args, "currentBalance", 0)
	if balance <= 0 {
		errors = append(errors, ValidationError{
			Field:   "currentBalance",
			Message: "Liability balance must be greater than 0",
			Code:    "invalid_range",
		})
	}

	// Validate maturity date if provided
	if maturityDate, exists := args["maturityDate"]; exists {
		if dateStr, ok := maturityDate.(string); ok {
			if !v.dateRegex.MatchString(dateStr) {
				errors = append(errors, ValidationError{
					Field:   "maturityDate",
					Message: "Maturity date must be in YYYY-MM-DD format",
					Code:    "invalid_format",
				})
			} else {
				// Check if date is in the future
				if date, err := time.Parse("2006-01-02", dateStr); err == nil {
					if date.Before(time.Now()) {
						errors = append(errors, ValidationError{
							Field:   "maturityDate",
							Message: "Maturity date must be in the future",
							Code:    "invalid_date_range",
						})
					}
				}
			}
		}
	}

	// Business rule validations
	errors = append(errors, v.validateLiabilityBusinessRules(args)...)

	return errors
}

// validateLiabilityBusinessRules validates business-specific rules for liabilities
func (v *ParameterValidator) validateLiabilityBusinessRules(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	category := getStringParam(args, "category", "")
	rate := getFloatParam(args, "interestRate", 0)
	_ = getFloatParam(args, "currentBalance", 0)

	// Category-specific interest rate validation
	switch category {
	case "mortgage", "mortgage_home":
		if rate > 0.08 { // 8%
			errors = append(errors, ValidationError{
				Field:   "interestRate",
				Message: "Mortgage rate above 8% is unusually high. Consider refinancing.",
				Code:    "business_rule_suggestion",
			})
		}
	case "credit_card":
		if rate < 0.15 { // 15%
			errors = append(errors, ValidationError{
				Field:   "interestRate",
				Message: "Credit card rate below 15% is unusually low. Please verify.",
				Code:    "business_rule_warning",
			})
		}
	case "personal_loan":
		if rate > 0.20 { // 20%
			errors = append(errors, ValidationError{
				Field:   "interestRate",
				Message: "Personal loan rate above 20% is very high. Explore alternatives.",
				Code:    "business_rule_suggestion",
			})
		}
	}

	return errors
}

// validatePropertyScenarioParameters validates property scenario parameters
func (v *ParameterValidator) validatePropertyScenarioParameters(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	propertyPrice := getFloatParam(args, "propertyPrice", 0)
	downPayment := getFloatParam(args, "downPayment", 0)
	loanAmount := getFloatParam(args, "loanAmount", 0)
	rate := getFloatParam(args, "interestRate", 0)
	tenure := getIntParam(args, "loanTenure", 0)

	// Basic validations
	if propertyPrice <= 0 {
		errors = append(errors, ValidationError{
			Field:   "propertyPrice",
			Message: "Property price must be greater than 0",
			Code:    "invalid_range",
		})
	}

	if downPayment < 0 {
		errors = append(errors, ValidationError{
			Field:   "downPayment",
			Message: "Down payment cannot be negative",
			Code:    "invalid_range",
		})
	}

	if loanAmount < 0 {
		errors = append(errors, ValidationError{
			Field:   "loanAmount",
			Message: "Loan amount cannot be negative",
			Code:    "invalid_range",
		})
	}

	if rate <= 0 {
		errors = append(errors, ValidationError{
			Field:   "interestRate",
			Message: "Interest rate must be greater than 0",
			Code:    "invalid_range",
		})
	}

	if tenure <= 0 {
		errors = append(errors, ValidationError{
			Field:   "loanTenure",
			Message: "Loan tenure must be greater than 0",
			Code:    "invalid_range",
		})
	}

	// Consistency checks
	if propertyPrice > 0 && downPayment > 0 && loanAmount > 0 {
		expectedLoan := propertyPrice - downPayment
		if math.Abs(loanAmount-expectedLoan) > 1000 { // Allow $1000 variance for fees
			errors = append(errors, ValidationError{
				Field:   "loanAmount",
				Message: fmt.Sprintf("Loan amount (%.0f) doesn't match property price (%.0f) minus down payment (%.0f)", loanAmount, propertyPrice, downPayment),
				Code:    "inconsistent_values",
			})
		}
	}

	// Property type validation
	propertyType := getStringParam(args, "propertyType", "")
	validTypes := []string{
		"hdb_bto", "hdb_resale", "condo_new", "condo_resale",
		"landed_terrace", "landed_semi_d", "landed_bungalow",
		"commercial", "industrial",
	}
	if !v.isValidEnum(propertyType, validTypes) {
		errors = append(errors, ValidationError{
			Field:   "propertyType",
			Message: fmt.Sprintf("Invalid property type '%s'", propertyType),
			Code:    "invalid_enum_value",
		})
	}

	return errors
}

// validateAssetUpdateParameters validates asset update parameters
func (v *ParameterValidator) validateAssetUpdateParameters(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	// Asset ID is required for updates
	assetID := getStringParam(args, "assetId", "")
	if assetID == "" {
		errors = append(errors, ValidationError{
			Field:   "assetId",
			Message: "Asset ID is required for updates",
			Code:    "required_field_missing",
		})
	}

	// Validate other fields if present (similar to create validation)
	if _, exists := args["currentValue"]; exists {
		if val := getFloatParam(args, "currentValue", 0); val <= 0 {
			errors = append(errors, ValidationError{
				Field:   "currentValue",
				Message: "Asset value must be greater than 0",
				Code:    "invalid_range",
			})
		}
	}

	return errors
}

// validateLiabilityUpdateParameters validates liability update parameters
func (v *ParameterValidator) validateLiabilityUpdateParameters(args map[string]interface{}) []ValidationError {
	var errors []ValidationError

	// Liability ID is required for updates
	liabilityID := getStringParam(args, "liabilityId", "")
	if liabilityID == "" {
		errors = append(errors, ValidationError{
			Field:   "liabilityId",
			Message: "Liability ID is required for updates",
			Code:    "required_field_missing",
		})
	}

	return errors
}

// Helper function to check valid enum values
func (v *ParameterValidator) isValidEnum(value string, validValues []string) bool {
	for _, valid := range validValues {
		if value == valid {
			return true
		}
	}
	return false
}

// ValidationError represents a parameter validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}
