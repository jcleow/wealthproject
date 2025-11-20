package financial

import (
	"financial-chat-system/backend/internal/llm"
)

// FinancialToolRegistry contains all available financial tools
type FinancialToolRegistry struct {
	tools map[string]llm.ToolDefinition
}

// NewFinancialToolRegistry creates a new tool registry
func NewFinancialToolRegistry() *FinancialToolRegistry {
	registry := &FinancialToolRegistry{
		tools: make(map[string]llm.ToolDefinition),
	}

	// Register all financial tools
	registry.registerTools()
	return registry
}

// GetTools returns all registered tools
func (r *FinancialToolRegistry) GetTools() []llm.ToolDefinition {
	tools := make([]llm.ToolDefinition, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, tool)
	}
	return tools
}

// GetTool returns a specific tool by name
func (r *FinancialToolRegistry) GetTool(name string) (llm.ToolDefinition, bool) {
	tool, exists := r.tools[name]
	return tool, exists
}

// registerTools registers all financial tools matching backend client methods
func (r *FinancialToolRegistry) registerTools() {
	// Tool 1: Create Asset
	r.tools["createAsset"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createAsset",
			Description: "Create a financial asset using financialClient.assets.create(). Use this when the user mentions owning property, cash, investments, CPF, or any valuable item. This creates a new asset record in the user's financial profile.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"category": map[string]interface{}{
						"type":        "string",
						"description": "Specific type of asset being added",
						"enum": []string{
							"hdb_property", "condo_property", "landed_property",
							"cash_savings", "cpf_account", "stocks_portfolio",
							"bonds_investment", "bank_account", "cryptocurrency", "other_asset",
						},
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Descriptive name for the asset (e.g., 'Toa Payoh 4-room HDB', 'DBS Savings Account', 'STI ETF Portfolio')",
						"minLength":   1,
						"maxLength":   100,
					},
					"currentValue": map[string]interface{}{
						"type":        "number",
						"description": "Current market value of the asset in Singapore Dollars (SGD). Always use full numbers (e.g., 1200000 for 1.2M)",
						"minimum":     1,
						"maximum":     100000000,
					},
					"annualGrowthRate": map[string]interface{}{
						"type":        "number",
						"description": "Expected annual growth rate as decimal. Use 0.03 for 3%, 0.07 for 7%, etc. Default to reasonable rates: property=0.03, stocks=0.07, cash=0.01",
						"minimum":     -0.5,
						"maximum":     1.0,
					},
					"notes": map[string]interface{}{
						"type":        "string",
						"description": "Any additional context about the asset (location, broker, special features, etc.)",
						"maxLength":   500,
					},
				},
				"required":             []string{"category", "name", "currentValue"},
				"additionalProperties": false,
			},
		},
	}

	// Tool 2: Update Asset
	r.tools["updateAsset"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateAsset",
			Description: "Update an existing asset using financialClient.assets.update(). Use this when the user mentions changes to existing assets, like value updates or corrections. Requires the asset ID from previous context.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"assetId": map[string]interface{}{
						"type":        "string",
						"description": "ID of the existing asset to update. Must be from session context (lastAssetId) or user specification.",
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Updated name for the asset",
						"minLength":   1,
						"maxLength":   100,
					},
					"currentValue": map[string]interface{}{
						"type":        "number",
						"description": "Updated current value in SGD",
						"minimum":     0,
						"maximum":     100000000,
					},
					"annualGrowthRate": map[string]interface{}{
						"type":        "number",
						"description": "Updated annual growth rate as decimal",
						"minimum":     -0.5,
						"maximum":     1.0,
					},
					"notes": map[string]interface{}{
						"type":        "string",
						"description": "Updated notes about the asset",
						"maxLength":   500,
					},
				},
				"required":             []string{"assetId"},
				"additionalProperties": false,
			},
		},
	}

	// Tool 3: Create Liability
	r.tools["createLiability"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createLiability",
			Description: "Create a liability (debt/loan) using financialClient.liabilities.create(). Use this when the user mentions owing money, loans, mortgages, credit card debt, or any financial obligations.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"category": map[string]interface{}{
						"type":        "string",
						"description": "Type of liability/debt",
						"enum": []string{
							"mortgage", "personal_loan", "car_loan", "education_loan",
							"credit_card", "business_loan", "overdraft", "other_debt",
						},
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Descriptive name for the liability (e.g., 'HDB Mortgage', 'Car Loan - Honda Civic', 'OCBC Credit Card')",
						"minLength":   1,
						"maxLength":   100,
					},
					"currentBalance": map[string]interface{}{
						"type":        "number",
						"description": "Current outstanding balance in SGD. Use full numbers (e.g., 350000 for 350k)",
						"minimum":     1,
						"maximum":     50000000,
					},
					"interestRate": map[string]interface{}{
						"type":        "number",
						"description": "Annual interest rate as decimal (e.g., 0.025 for 2.5% per year)",
						"minimum":     0,
						"maximum":     1,
					},
					"monthlyPayment": map[string]interface{}{
						"type":        "number",
						"description": "Regular monthly payment amount in SGD",
						"minimum":     0,
						"maximum":     100000,
					},
					"maturityDate": map[string]interface{}{
						"type":        "string",
						"description": "Expected payoff date in YYYY-MM-DD format",
						"pattern":     "^\\d{4}-\\d{2}-\\d{2}$",
					},
					"notes": map[string]interface{}{
						"type":        "string",
						"description": "Additional details about the liability (lender, terms, etc.)",
						"maxLength":   500,
					},
				},
				"required":             []string{"category", "name", "currentBalance", "interestRate"},
				"additionalProperties": false,
			},
		},
	}

	// Tool 4: Update Liability
	r.tools["updateLiability"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateLiability",
			Description: "Update an existing liability using financialClient.liabilities.update(). Use this for loan payments, interest rate changes, or balance corrections. Requires liability ID from session context.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"liabilityId": map[string]interface{}{
						"type":        "string",
						"description": "ID of the existing liability to update. Must be from session context (lastLiabilityId) or user specification.",
					},
					"currentBalance": map[string]interface{}{
						"type":        "number",
						"description": "Updated outstanding balance in SGD",
						"minimum":     0,
						"maximum":     50000000,
					},
					"interestRate": map[string]interface{}{
						"type":        "number",
						"description": "Updated annual interest rate as decimal",
						"minimum":     0,
						"maximum":     1,
					},
					"monthlyPayment": map[string]interface{}{
						"type":        "number",
						"description": "Updated monthly payment amount",
						"minimum":     0,
						"maximum":     100000,
					},
					"maturityDate": map[string]interface{}{
						"type":        "string",
						"description": "Updated payoff date in YYYY-MM-DD format",
						"pattern":     "^\\d{4}-\\d{2}-\\d{2}$",
					},
					"notes": map[string]interface{}{
						"type":        "string",
						"description": "Updated notes about the liability",
						"maxLength":   500,
					},
				},
				"required":             []string{"liabilityId"},
				"additionalProperties": false,
			},
		},
	}

	// Tool 5: Create Property Scenario
	r.tools["createPropertyScenario"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createPropertyScenario",
			Description: "Create a property planning scenario with mortgage calculations using financialClient.propertyPlanner.create(). Use this for property purchase analysis, affordability checks, and loan simulations.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"propertyPrice": map[string]interface{}{
						"type":        "number",
						"description": "Total purchase price of the property in SGD",
						"minimum":     100000,
						"maximum":     50000000,
					},
					"downPayment": map[string]interface{}{
						"type":        "number",
						"description": "Down payment amount in SGD (typically 20-25% of property price)",
						"minimum":     10000,
						"maximum":     25000000,
					},
					"loanAmount": map[string]interface{}{
						"type":        "number",
						"description": "Mortgage loan amount needed in SGD (propertyPrice - downPayment)",
						"minimum":     50000,
						"maximum":     40000000,
					},
					"interestRate": map[string]interface{}{
						"type":        "number",
						"description": "Annual mortgage interest rate as decimal (e.g., 0.025 for 2.5%)",
						"minimum":     0.005,
						"maximum":     0.1,
					},
					"loanTenure": map[string]interface{}{
						"type":        "integer",
						"description": "Loan term in years (typically 25-30 years)",
						"minimum":     5,
						"maximum":     35,
					},
					"propertyType": map[string]interface{}{
						"type":        "string",
						"description": "Type of property being purchased",
						"enum": []string{
							"hdb_bto", "hdb_resale", "condo_new", "condo_resale",
							"landed_terrace", "landed_semi_d", "landed_bungalow",
							"commercial", "industrial",
						},
					},
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Descriptive name for this property scenario",
						"minLength":   1,
						"maxLength":   100,
					},
					"notes": map[string]interface{}{
						"type":        "string",
						"description": "Additional context about this property scenario (location, purpose, etc.)",
						"maxLength":   500,
					},
				},
				"required":             []string{"propertyPrice", "downPayment", "loanAmount", "interestRate", "loanTenure", "propertyType"},
				"additionalProperties": false,
			},
		},
	}
}

// GetToolNames returns names of all registered tools
func (r *FinancialToolRegistry) GetToolNames() []string {
	names := make([]string, 0, len(r.tools))
	for name := range r.tools {
		names = append(names, name)
	}
	return names
}

// ValidateToolCall validates if a tool call is valid
func (r *FinancialToolRegistry) ValidateToolCall(toolName string, arguments map[string]interface{}) ([]string, error) {
	tool, exists := r.tools[toolName]
	if !exists {
		return nil, &ToolError{
			Type:    "tool_not_found",
			Message: "Tool '" + toolName + "' is not registered",
			Tool:    toolName,
		}
	}

	missing := []string{}

	// Basic validation - in a real implementation, you'd validate against the JSON schema
	if parameters, ok := tool.Function.Parameters["properties"].(map[string]interface{}); ok {
		switch required := tool.Function.Parameters["required"].(type) {
		case []string:
			for _, requiredField := range required {
				if _, exists := arguments[requiredField]; !exists {
					missing = append(missing, requiredField)
				}
			}
		case []interface{}:
			for _, rf := range required {
				if field, ok := rf.(string); ok {
					if _, exists := arguments[field]; !exists {
						missing = append(missing, field)
					}
				}
			}
		}

		// Check for unknown fields
		for argName := range arguments {
			if _, exists := parameters[argName]; !exists {
				return nil, &ToolError{
					Type:    "unknown_field",
					Message: "Field '" + argName + "' is not defined for tool '" + toolName + "'",
					Tool:    toolName,
					Field:   argName,
				}
			}
		}
	}

	return missing, nil
}

// ToolError represents a tool-specific error
type ToolError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Tool    string `json:"tool"`
	Field   string `json:"field,omitempty"`
}

func (e *ToolError) Error() string {
	return e.Message
}
