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

	// Build Required arrays from PropertySchema.Required flags for JSON serialization
	registry.buildRequiredArrays()

	return registry
}

// buildRequiredArrays populates the Required slice on each tool's JSONSchema
// from the PropertySchema.Required flags for proper JSON serialization to LLM APIs
func (r *FinancialToolRegistry) buildRequiredArrays() {
	for name, tool := range r.tools {
		tool.Function.Parameters.BuildRequiredArray()
		r.tools[name] = tool
	}
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
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"category": {
						Type:        "string",
						Description: "Specific type of asset being added",
						Required:    true,
						Enum: []string{
							"property_real_estate",
							"hdb_property", "condo_property", "landed_property",
							"cash_savings", "cpf_account", "stocks_portfolio",
							"bonds_investment", "bank_account", "cryptocurrency", "other_asset",
						},
					},
					"name": {
						Type:        "string",
						Description: "Descriptive name for the asset (e.g., 'Toa Payoh 4-room HDB', 'DBS Savings Account', 'STI ETF Portfolio')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"currentValue": {
						Type:        "number",
						Description: "Current market value of the asset in Singapore Dollars (SGD). Always use full numbers (e.g., 1200000 for 1.2M)",
						Required:    true,
						Minimum:     llm.Float(1),
						Maximum:     llm.Float(100000000),
					},
					"annualGrowthRate": {
						Type:        "number",
						Description: "Expected annual growth rate as decimal. Use 0.03 for 3%, 0.07 for 7%, etc. Default to reasonable rates: property=0.03, stocks=0.07, cash=0.01",
						Minimum:     llm.Float(-0.5),
						Maximum:     llm.Float(1.0),
					},
					"notes": {
						Type:        "string",
						Description: "Any additional context about the asset (location, broker, special features, etc.)",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 2: Update Asset
	r.tools["updateAsset"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateAsset",
			Description: "Update an existing asset using financialClient.assets.update(). Use this when the user mentions changes to existing assets, like value updates or corrections. Prefer matching by asset name; do not ask the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"assetName": {
						Type:        "string",
						Description: "Asset name to match when assetId is unknown. Case-insensitive.",
					},
					"assetId": {
						Type:        "string",
						Description: "ID of the existing asset to update. Must be from session context (lastAssetId) or user specification.",
					},
					"name": {
						Type:        "string",
						Description: "Updated name for the asset",
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"currentValue": {
						Type:        "number",
						Description: "Updated current value in SGD",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(100000000),
					},
					"annualGrowthRate": {
						Type:        "number",
						Description: "Updated annual growth rate as decimal",
						Minimum:     llm.Float(-0.5),
						Maximum:     llm.Float(1.0),
					},
					"notes": {
						Type:        "string",
						Description: "Updated notes about the asset",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 3: Delete Asset
	r.tools["deleteAsset"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "deleteAsset",
			Description: "Delete an existing asset record when the user asks to remove or delete an asset. Prefer name matching; avoid asking the user for IDs. If unsure which asset, ask the user to decide before previewing.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"assetName": {
						Type:        "string",
						Description: "Name of the asset to delete when assetId is unknown.",
					},
					"assetId": {
						Type:        "string",
						Description: "ID of the asset to delete. Use lastAssetId from session if not provided explicitly.",
					},
					"lastAssetId": {
						Type:        "string",
						Description: "Fallback asset ID from prior context.",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 4: Create Liability
	r.tools["createLiability"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createLiability",
			Description: "Create a liability (debt/loan) using financialClient.liabilities.create(). Use this when the user mentions owing money, loans, mortgages, credit card debt, or any financial obligations.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"category": {
						Type:        "string",
						Description: "Type of liability/debt",
						Required:    true,
						Enum: []string{
							"mortgage_home", "mortgage", "personal_loan", "car_loan", "education_loan",
							"credit_card", "business_loan", "overdraft", "other_debt",
						},
					},
					"name": {
						Type:        "string",
						Description: "Descriptive name for the liability (e.g., 'HDB Mortgage', 'Car Loan - Honda Civic', 'OCBC Credit Card')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"currentBalance": {
						Type:        "number",
						Description: "Current outstanding balance in SGD. Use full numbers (e.g., 350000 for 350k)",
						Required:    true,
						Minimum:     llm.Float(1),
						Maximum:     llm.Float(50000000),
					},
					"interestRate": {
						Type:        "number",
						Description: "Annual interest rate as decimal (e.g., 0.025 for 2.5% per year)",
						Required:    true,
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(1),
					},
					"monthlyPayment": {
						Type:        "number",
						Description: "Regular monthly payment amount in SGD",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(100000),
					},
					"maturityDate": {
						Type:        "string",
						Description: "Expected payoff date in YYYY-MM-DD format",
					},
					"notes": {
						Type:        "string",
						Description: "Additional details about the liability (lender, terms, etc.)",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 5: Update Liability
	r.tools["updateLiability"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateLiability",
			Description: "Update an existing liability using financialClient.liabilities.update(). Use this for loan payments, interest rate changes, or balance corrections. Prefer name matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"liabilityName": {
						Type:        "string",
						Description: "Liability name to match when liabilityId is unknown.",
					},
					"liabilityId": {
						Type:        "string",
						Description: "ID of the existing liability to update.",
					},
					"currentBalance": {
						Type:        "number",
						Description: "Updated outstanding balance in SGD",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(50000000),
					},
					"interestRate": {
						Type:        "number",
						Description: "Updated annual interest rate as decimal",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(1),
					},
					"monthlyPayment": {
						Type:        "number",
						Description: "Updated monthly payment amount",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(100000),
					},
					"maturityDate": {
						Type:        "string",
						Description: "Updated payoff date in YYYY-MM-DD format",
					},
					"notes": {
						Type:        "string",
						Description: "Updated notes about the liability",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 6: Delete Liability
	r.tools["deleteLiability"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "deleteLiability",
			Description: "Delete an existing liability record when the user asks to remove or pay off a liability/loan. Prefer name matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"liabilityName": {
						Type:        "string",
						Description: "Liability name to match when liabilityId is unknown.",
					},
					"liabilityId": {
						Type:        "string",
						Description: "ID of the liability to delete.",
					},
					"lastLiabilityId": {
						Type:        "string",
						Description: "Fallback liability ID from prior context.",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 7: Create Income
	r.tools["createIncome"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createIncome",
			Description: "Create a recurring income entry (salary, bonus, rent) using financialClient.incomes.create(). Use when the user mentions earning money.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"source": {
						Type:        "string",
						Description: "Name of the income source (e.g., Salary, Bonus, Rental).",
						Required:    true,
					},
					"amount": {
						Type:        "number",
						Description: "Income amount in SGD per the given frequency.",
						Required:    true,
						Minimum:     llm.Float(1),
					},
					"frequency": {
						Type:        "string",
						Description: "Income frequency (weekly, biweekly, monthly, quarterly, annual).",
						Required:    true,
					},
					"startDate": {
						Type:        "string",
						Description: "Start date in YYYY-MM-DD (optional).",
					},
					"category": {
						Type:        "string",
						Description: "Income category (e.g., job, rental, bonus).",
					},
					"notes": {
						Type:        "string",
						Description: "Additional context about the income.",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 8: Update Income
	r.tools["updateIncome"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateIncome",
			Description: "Update an existing income entry when the user changes salary, bonuses, or rent. Prefer name/source matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"incomeName": {
						Type:        "string",
						Description: "Income name/source to match when incomeId is unknown.",
					},
					"incomeId": {
						Type:        "string",
						Description: "ID of the income to update.",
					},
					"lastIncomeId": {
						Type:        "string",
						Description: "Fallback income ID from prior context.",
					},
					"source": {
						Type:        "string",
						Description: "Updated income source name.",
					},
					"amount": {
						Type:        "number",
						Description: "Updated income amount.",
						Minimum:     llm.Float(0),
					},
					"frequency": {
						Type:        "string",
						Description: "Updated frequency.",
					},
					"startDate": {
						Type:        "string",
						Description: "Updated start date YYYY-MM-DD.",
					},
					"category": {
						Type:        "string",
						Description: "Updated category.",
					},
					"notes": {
						Type:        "string",
						Description: "Updated notes.",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 9: Delete Income
	r.tools["deleteIncome"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "deleteIncome",
			Description: "Delete an existing income record when the user asks to remove an income source. Prefer name/source matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"incomeName": {
						Type:        "string",
						Description: "Income name/source to match when incomeId is unknown.",
					},
					"incomeId": {
						Type:        "string",
						Description: "ID of the income to delete.",
					},
					"lastIncomeId": {
						Type:        "string",
						Description: "Fallback income ID from prior context.",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 10: Create Expense
	r.tools["createExpense"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createExpense",
			Description: "Create an expense entry when the user mentions bills or spending.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"payee": {
						Type:        "string",
						Description: "Who/what the expense is for.",
						Required:    true,
						MinLength:   llm.Int(1),
					},
					"amount": {
						Type:        "number",
						Description: "Expense amount in SGD per the given frequency.",
						Required:    true,
						Minimum:     llm.Float(1),
					},
					"frequency": {
						Type:        "string",
						Description: "Expense frequency (weekly, biweekly, monthly, quarterly, annual).",
						Required:    true,
					},
					"category": {
						Type:        "string",
						Description: "Expense category (e.g., housing_mortgage, rent, groceries).",
						Enum: []string{
							"housing_mortgage", "housing_rent", "utilities", "food_groceries",
							"transport_car", "insurance", "other_expense",
						},
					},
					"notes": {
						Type:        "string",
						Description: "Additional context about the expense.",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 11: Update Expense
	r.tools["updateExpense"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateExpense",
			Description: "Update an existing expense entry when the user changes amount/frequency. Prefer name matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"expenseName": {
						Type:        "string",
						Description: "Expense name/payee to match when expenseId is unknown.",
					},
					"expenseId": {
						Type:        "string",
						Description: "ID of the expense to update.",
					},
					"lastExpenseId": {
						Type:        "string",
						Description: "Fallback expense ID from prior context.",
					},
					"payee": {
						Type:        "string",
						Description: "Updated payee.",
					},
					"amount": {
						Type:        "number",
						Description: "Updated amount.",
						Minimum:     llm.Float(0),
					},
					"frequency": {
						Type:        "string",
						Description: "Updated frequency.",
					},
					"category": {
						Type:        "string",
						Description: "Updated category.",
					},
					"notes": {
						Type:        "string",
						Description: "Updated notes.",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 12: Delete Expense
	r.tools["deleteExpense"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "deleteExpense",
			Description: "Delete an existing expense record when the user asks to remove an expense. Prefer name matching; avoid asking the user for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"expenseName": {
						Type:        "string",
						Description: "Expense name/payee to match when expenseId is unknown.",
					},
					"expenseId": {
						Type:        "string",
						Description: "ID of the expense to delete.",
					},
					"lastExpenseId": {
						Type:        "string",
						Description: "Fallback expense ID from prior context.",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 13: Create Property Scenario
	r.tools["createPropertyScenario"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "createPropertyScenario",
			Description: "Create a property planning scenario with mortgage calculations using financialClient.propertyPlanner.create(). Use this for property purchase analysis, affordability checks, and loan simulations.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"propertyPrice": {
						Type:        "number",
						Description: "Total purchase price of the property in SGD",
						Required:    true,
						Minimum:     llm.Float(100000),
						Maximum:     llm.Float(50000000),
					},
					"downPayment": {
						Type:        "number",
						Description: "Down payment amount in SGD (typically 20-25% of property price)",
						Required:    true,
						Minimum:     llm.Float(10000),
						Maximum:     llm.Float(25000000),
					},
					"loanAmount": {
						Type:        "number",
						Description: "Mortgage loan amount needed in SGD (propertyPrice - downPayment)",
						Required:    true,
						Minimum:     llm.Float(50000),
						Maximum:     llm.Float(40000000),
					},
					"interestRate": {
						Type:        "number",
						Description: "Annual mortgage interest rate as decimal (e.g., 0.025 for 2.5%)",
						Required:    true,
						Minimum:     llm.Float(0.005),
						Maximum:     llm.Float(0.1),
					},
					"loanTenure": {
						Type:        "integer",
						Description: "Loan term in years (typically 25-30 years)",
						Required:    true,
						Minimum:     llm.Float(5),
						Maximum:     llm.Float(35),
					},
					"propertyType": {
						Type:        "string",
						Description: "Type of property being purchased",
						Required:    true,
						Enum: []string{
							"hdb_bto", "hdb_resale", "condo_new", "condo_resale",
							"landed_terrace", "landed_semi_d", "landed_bungalow",
							"commercial", "industrial",
						},
					},
					"name": {
						Type:        "string",
						Description: "Descriptive name for this property scenario",
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"notes": {
						Type:        "string",
						Description: "Additional context about this property scenario (location, purpose, etc.)",
						MaxLength:   llm.Int(500),
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// ============================================
	// SECTION: Analysis Tools (Agent 3)
	// ============================================

	// Tool 14: Get Net Worth Summary
	r.tools["getNetWorthSummary"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "getNetWorthSummary",
			Description: "Get current net worth with breakdown by category. Shows total assets, total liabilities, net worth, monthly income/expenses, and savings rate.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"includeScenarios": {
						Type:        "boolean",
						Description: "Include active scenarios in calculation",
						Default:     false,
					},
					"asOfYear": {
						Type:        "integer",
						Description: "Calculate as of specific year (0 = current)",
						Default:     0,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 15: Analyze Net Worth Trends
	r.tools["analyzeNetWorthTrends"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "analyzeNetWorthTrends",
			Description: "Analyze net worth growth trajectory over the planning horizon. Returns projected values at key years and identifies milestones like when net worth crosses $500k, $1M, etc.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"includeScenarios": {
						Type:        "boolean",
						Description: "Include active scenarios in projection",
						Default:     true,
					},
					"yearsToAnalyze": {
						Type:        "integer",
						Description: "Number of years to project (default 30)",
						Default:     30,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 16: Compare Scenario Impact
	r.tools["compareScenarioImpact"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "compareScenarioImpact",
			Description: "Compare net worth trajectory with and without a specific scenario to understand its financial impact. Returns summary showing difference at target year.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"scenarioId": {
						Type:        "string",
						Description: "ID of scenario to analyze",
					},
					"scenarioName": {
						Type:        "string",
						Description: "Name of scenario (alternative to ID)",
					},
					"yearsToProject": {
						Type:        "integer",
						Description: "Years to project for comparison (default 10)",
						Default:     10,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 17: Project Net Worth At Year
	r.tools["projectNetWorthAtYear"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "projectNetWorthAtYear",
			Description: "Project net worth at a specific year or age in the future.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"targetYear": {
						Type:        "integer",
						Description: "Year number (0-30) to project to",
					},
					"targetAge": {
						Type:        "integer",
						Description: "Age to project to (alternative to targetYear)",
					},
					"includeScenarios": {
						Type:        "boolean",
						Description: "Include active scenarios in projection",
						Default:     true,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 18: Identify Net Worth Levers
	r.tools["identifyNetWorthLevers"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "identifyNetWorthLevers",
			Description: "Identify which assets, liabilities, income, or expenses have the biggest impact on net worth trajectory. Useful for understanding what to focus on for financial improvement.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"topN": {
						Type:        "integer",
						Description: "Number of top levers to return (default 5)",
						Default:     5,
					},
					"category": {
						Type:        "string",
						Description: "Filter by category: all, assets, liabilities, income, expenses",
						Enum:        []string{"all", "assets", "liabilities", "income", "expenses"},
						Default:     "all",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// ============================================
	// SECTION: Scenario CRUD Tools
	// ============================================

	// Tool 19: Create Scenario Event
	r.tools["createScenarioEvent"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name: "createScenarioEvent",
			Description: `Create a new what-if scenario event to model future financial changes.

IMPORTANT RULES:
- For 'stop', 'delta', 'override': You MUST provide targetId from the user's financial data (look up the ID from the context).
- For 'stop' impactType: Do NOT provide impactValue. Use targetId to specify which item to stop.
- For 'delta', 'override': Provide both targetId AND impactValue.
- For 'start': Do NOT provide targetId (creates new item). MUST provide impactValue.

EXAMPLES (assuming user has income with ID "abc-123"):
1. Career break (stop existing income):
   - name: "Career Break 2030", targetYear: 5, targetType: "income", targetId: "abc-123", impactType: "stop"
   - MUST include targetId, do NOT include impactValue

2. Salary increase (modify existing income):
   - name: "Salary Raise", targetYear: 1, targetType: "income", targetId: "abc-123", impactType: "delta", impactValue: 1000
   - MUST include both targetId and impactValue

3. New expense (create new item):
   - name: "New Car Payment", targetYear: 2, targetType: "expense", impactType: "start", impactValue: 800
   - Do NOT include targetId, MUST include impactValue

4. Buy property (create new asset):
   - name: "Buy Condo", targetYear: 3, targetType: "asset", impactType: "start", impactValue: 1500000`,
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"name": {
						Type:        "string",
						Description: "Descriptive name for the scenario (e.g., 'Career Break 2030', 'Salary Promotion', 'Buy Condo')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"description": {
						Type:        "string",
						Description: "Detailed description of what this scenario models",
						MaxLength:   llm.Int(500),
					},
					"targetYear": {
						Type:        "integer",
						Description: "Year offset when this scenario takes effect (0 = current year, 1 = next year, 5 = 5 years from now, etc.)",
						Required:    true,
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(30),
					},
					"targetType": {
						Type:        "string",
						Description: "Type of financial item being affected",
						Required:    true,
						Enum:        []string{"asset", "liability", "income", "expense"},
					},
					"targetId": {
						Type:        "string",
						Description: "ID of existing item to modify. REQUIRED for 'stop', 'delta', 'override' - look up the ID from the user's financial context. Leave empty ONLY for 'start' (new items).",
					},
					"impactType": {
						Type:        "string",
						Description: "How the scenario affects the target: 'stop' (end existing item - requires targetId, no impactValue), 'delta' (add/subtract - requires targetId and impactValue), 'override' (replace value - requires targetId and impactValue), 'start' (create new - requires impactValue, no targetId)",
						Required:    true,
						Enum:        []string{"delta", "override", "start", "stop"},
					},
					"impactValue": {
						Type:        "number",
						Description: "REQUIRED for delta/override/start (must be non-zero). DO NOT provide for 'stop' type. For delta: amount to add (use negative to subtract). For override: the new value. For start: the initial value.",
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Whether to include this scenario in projections by default",
						Default:     true,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 20: Stop Financial Item (simplified version for stopping existing items)
	r.tools["stopFinancialItem"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name: "stopFinancialItem",
			Description: `Stop or end an existing financial item (income, expense, asset, or liability) from a specific year onwards.

Use this tool when the user wants to model what happens if they:
- Stop working (end income)
- Cancel a subscription or payment (end expense)
- Sell/lose an asset
- Pay off a liability early

IMPORTANT: You must provide the targetId of the existing item. Look up the ID from the user's financial data context.

Examples:
- "What if I take a career break at 40?" → Stop primary income at year 5 (assuming user is 35)
- "Model stopping my gym membership" → Stop the gym expense`,
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"name": {
						Type:        "string",
						Description: "Descriptive name for the scenario (e.g., 'Career Break 2030', 'Cancel Gym Membership')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"description": {
						Type:        "string",
						Description: "Additional details about this scenario",
						MaxLength:   llm.Int(500),
					},
					"targetYear": {
						Type:        "integer",
						Description: "Year offset when the item stops (0 = current year, 1 = next year, etc.)",
						Required:    true,
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(30),
					},
					"targetType": {
						Type:        "string",
						Description: "Type of financial item being stopped",
						Required:    true,
						Enum:        []string{"asset", "liability", "income", "expense"},
					},
					"targetId": {
						Type:        "string",
						Description: "ID of the existing item to stop. REQUIRED - look up from the user's financial data.",
						Required:    true,
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Whether to include this scenario in projections by default",
						Default:     true,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 21: Start Financial Item (simplified version for creating new items)
	r.tools["startFinancialItem"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name: "startFinancialItem",
			Description: `Create a new financial item (income, expense, asset, or liability) in a scenario starting from a specific year.

Use this tool when the user wants to model:
- Starting a new income source (new job, side business, rental income)
- Adding a new expense (new car payment, child expenses, new subscription)
- Acquiring a new asset (buying property, investment)
- Taking on new liability (loan, mortgage)

Do NOT use this for modifying existing items - use modifyFinancialItem instead.

Examples:
- "What if I get rental income of $2000/month in 3 years?" → Start new income of $24000/year at year 3
- "Model buying a car for $50000 in 2 years" → Start new asset at year 2`,
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"name": {
						Type:        "string",
						Description: "Descriptive name for the scenario (e.g., 'Start Rental Income', 'Buy Investment Property')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"description": {
						Type:        "string",
						Description: "Additional details about this scenario",
						MaxLength:   llm.Int(500),
					},
					"targetYear": {
						Type:        "integer",
						Description: "Year offset when the new item starts (0 = current year, 1 = next year, etc.)",
						Required:    true,
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(30),
					},
					"targetType": {
						Type:        "string",
						Description: "Type of financial item to create",
						Required:    true,
						Enum:        []string{"asset", "liability", "income", "expense"},
					},
					"impactValue": {
						Type:        "number",
						Description: "The value for the new item. For income/expense: annual amount. For asset/liability: the value.",
						Required:    true,
						Minimum:     llm.Float(1),
					},
					"itemName": {
						Type:        "string",
						Description: "Name for the new financial item being created (e.g., 'Rental Property', 'New Car Payment')",
						MaxLength:   llm.Int(100),
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Whether to include this scenario in projections by default",
						Default:     true,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 22: Modify Financial Item (simplified version for changing existing item values)
	r.tools["modifyFinancialItem"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name: "modifyFinancialItem",
			Description: `Modify the value of an existing financial item from a specific year onwards.

Use this tool when the user wants to model changes to existing items:
- Salary increase/decrease
- Expense changes (inflation, lifestyle changes)
- Asset value changes (property appreciation)
- Liability balance changes

IMPORTANT: You must provide the targetId of the existing item. Look up the ID from the user's financial data context.

Impact types:
- "delta": Add or subtract from current value (use negative for decrease)
- "override": Replace with new value entirely

Examples:
- "What if I get a $10,000 raise next year?" → delta of 10000 on income at year 1
- "Model rent increasing to $3000/month" → override of 36000 on expense at year N`,
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"name": {
						Type:        "string",
						Description: "Descriptive name for the scenario (e.g., 'Salary Raise 2025', 'Rent Increase')",
						Required:    true,
						MinLength:   llm.Int(1),
						MaxLength:   llm.Int(100),
					},
					"description": {
						Type:        "string",
						Description: "Additional details about this scenario",
						MaxLength:   llm.Int(500),
					},
					"targetYear": {
						Type:        "integer",
						Description: "Year offset when the modification takes effect (0 = current year, 1 = next year, etc.)",
						Required:    true,
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(30),
					},
					"targetType": {
						Type:        "string",
						Description: "Type of financial item being modified",
						Required:    true,
						Enum:        []string{"asset", "liability", "income", "expense"},
					},
					"targetId": {
						Type:        "string",
						Description: "ID of the existing item to modify. REQUIRED - look up from the user's financial data.",
						Required:    true,
					},
					"impactType": {
						Type:        "string",
						Description: "How to apply the change: 'delta' (add/subtract from current) or 'override' (replace value)",
						Required:    true,
						Enum:        []string{"delta", "override"},
					},
					"impactValue": {
						Type:        "number",
						Description: "The amount to change by (for delta) or the new value (for override). Use negative for decreases in delta mode.",
						Required:    true,
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Whether to include this scenario in projections by default",
						Default:     true,
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 23: Update Scenario Event
	r.tools["updateScenarioEvent"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "updateScenarioEvent",
			Description: "Update an existing scenario event. Use when the user wants to modify scenario parameters like the year, impact value, or description.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"scenarioId": {
						Type:        "string",
						Description: "ID of the scenario to update",
					},
					"scenarioName": {
						Type:        "string",
						Description: "Name of scenario to match when ID is unknown",
					},
					"name": {
						Type:        "string",
						Description: "Updated scenario name",
						MaxLength:   llm.Int(100),
					},
					"description": {
						Type:        "string",
						Description: "Updated description",
						MaxLength:   llm.Int(500),
					},
					"targetYear": {
						Type:        "integer",
						Description: "Updated target year",
						Minimum:     llm.Float(0),
						Maximum:     llm.Float(30),
					},
					"impactValue": {
						Type:        "number",
						Description: "Updated impact value",
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Updated inclusion status",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 24: Delete Scenario Event
	r.tools["deleteScenarioEvent"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "deleteScenarioEvent",
			Description: "Delete an existing scenario event when the user wants to remove a what-if scenario. Prefer name matching; avoid asking for IDs.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"scenarioId": {
						Type:        "string",
						Description: "ID of the scenario to delete",
					},
					"scenarioName": {
						Type:        "string",
						Description: "Name of scenario to match when ID is unknown",
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 25: List Scenario Events
	r.tools["listScenarioEvents"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "listScenarioEvents",
			Description: "List all scenario events for the user. Use when the user asks to see their scenarios or wants to understand what scenarios exist.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"includeDisabled": {
						Type:        "boolean",
						Description: "Include scenarios that are not currently active",
						Default:     true,
					},
					"targetType": {
						Type:        "string",
						Description: "Filter by target type",
						Enum:        []string{"asset", "liability", "income", "expense", "all"},
					},
				},
				AdditionalProperties: llm.Bool(false),
			},
		},
	}

	// Tool 26: Toggle Scenario Included
	r.tools["toggleScenarioIncluded"] = llm.ToolDefinition{
		Type: "function",
		Function: llm.FunctionSchema{
			Name:        "toggleScenarioIncluded",
			Description: "Toggle whether a scenario is included in projections. Use when the user wants to enable/disable a scenario without deleting it.",
			Parameters: llm.JSONSchema{
				Type: "object",
				Properties: map[string]*llm.PropertySchema{
					"scenarioId": {
						Type:        "string",
						Description: "ID of the scenario to toggle",
					},
					"scenarioName": {
						Type:        "string",
						Description: "Name of scenario to match when ID is unknown",
					},
					"isIncluded": {
						Type:        "boolean",
						Description: "Whether to include the scenario in projections",
						Required:    true,
					},
				},
				AdditionalProperties: llm.Bool(false),
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

	// Validate required fields using PropertySchema.Required flag (O(n) instead of O(n²))
	for fieldName, prop := range tool.Function.Parameters.Properties {
		if prop != nil && prop.Required {
			if _, exists := arguments[fieldName]; !exists {
				missing = append(missing, fieldName)
			}
		}
	}

	// Check for unknown fields
	for argName := range arguments {
		if _, exists := tool.Function.Parameters.Properties[argName]; !exists {
			return nil, &ToolError{
				Type:    "unknown_field",
				Message: "Field '" + argName + "' is not defined for tool '" + toolName + "'",
				Tool:    toolName,
				Field:   argName,
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
