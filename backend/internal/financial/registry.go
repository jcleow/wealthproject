package financial

import (
	"fmt"
	"log"

	"financial-chat-system/backend/internal/llm"
)

// GlobalRegistry is the singleton instance of the tool registry
var GlobalRegistry *FinancialToolRegistry

// InitializeRegistry initializes the global tool registry
func InitializeRegistry() error {
	GlobalRegistry = NewFinancialToolRegistry()

	// Validate all tools
	if err := llm.ValidateToolDefinitions(GlobalRegistry.GetTools()); err != nil {
		return fmt.Errorf("tool validation failed: %w", err)
	}

	toolCount := len(GlobalRegistry.GetToolNames())
	log.Printf("Initialized financial tool registry with %d tools: %v",
		toolCount, GlobalRegistry.GetToolNames())

	return nil
}

// GetRegistry returns the global registry instance
func GetRegistry() *FinancialToolRegistry {
	if GlobalRegistry == nil {
		log.Fatal("Financial tool registry not initialized. Call InitializeRegistry() first.")
	}
	return GlobalRegistry
}

// MustGetRegistry returns the global registry or panics if not initialized
func MustGetRegistry() *FinancialToolRegistry {
	if GlobalRegistry == nil {
		panic("Financial tool registry not initialized")
	}
	return GlobalRegistry
}

// RegistryStats returns statistics about the tool registry
type RegistryStats struct {
	TotalTools     int                 `json:"total_tools"`
	ToolNames      []string            `json:"tool_names"`
	CategoryCounts map[string]int      `json:"category_counts"`
	RequiredFields map[string][]string `json:"required_fields"`
	OptionalFields map[string][]string `json:"optional_fields"`
}

// GetStats returns registry statistics
func (r *FinancialToolRegistry) GetStats() RegistryStats {
	stats := RegistryStats{
		TotalTools:     len(r.tools),
		ToolNames:      r.GetToolNames(),
		CategoryCounts: make(map[string]int),
		RequiredFields: make(map[string][]string),
		OptionalFields: make(map[string][]string),
	}

	for name, tool := range r.tools {
		// Categorize tools
		category := categorizeToolByName(name)
		stats.CategoryCounts[category]++

		// Extract required and optional fields
		if parameters, ok := tool.Function.Parameters["properties"].(map[string]interface{}); ok {
			var required []string
			var optional []string

			if requiredList, ok := tool.Function.Parameters["required"].([]string); ok {
				required = requiredList
			}

			for fieldName := range parameters {
				isRequired := false
				for _, req := range required {
					if req == fieldName {
						isRequired = true
						break
					}
				}
				if !isRequired {
					optional = append(optional, fieldName)
				}
			}

			stats.RequiredFields[name] = required
			stats.OptionalFields[name] = optional
		}
	}

	return stats
}

// categorizeToolByName categorizes a tool based on its name
func categorizeToolByName(toolName string) string {
	switch {
	case toolName == "createAsset" || toolName == "updateAsset":
		return "assets"
	case toolName == "createLiability" || toolName == "updateLiability":
		return "liabilities"
	case toolName == "createPropertyScenario":
		return "property_planning"
	default:
		return "other"
	}
}

// HealthCheck verifies the registry is functioning correctly
func (r *FinancialToolRegistry) HealthCheck() error {
	if len(r.tools) == 0 {
		return fmt.Errorf("no tools registered")
	}

	// Validate that all expected tools are present
	expectedTools := []string{
		"createAsset", "updateAsset",
		"createLiability", "updateLiability",
		"createPropertyScenario",
	}

	for _, expected := range expectedTools {
		if _, exists := r.tools[expected]; !exists {
			return fmt.Errorf("expected tool '%s' is not registered", expected)
		}
	}

	// Validate tool definitions
	if err := llm.ValidateToolDefinitions(r.GetTools()); err != nil {
		return fmt.Errorf("tool validation failed: %w", err)
	}

	return nil
}

// GetToolsByCategory returns tools filtered by category
func (r *FinancialToolRegistry) GetToolsByCategory(category string) []llm.ToolDefinition {
	var tools []llm.ToolDefinition

	for name, tool := range r.tools {
		if categorizeToolByName(name) == category {
			tools = append(tools, tool)
		}
	}

	return tools
}

// GetToolsForLLM returns tools formatted for LLM consumption with optional filtering
func (r *FinancialToolRegistry) GetToolsForLLM(categories []string) []llm.ToolDefinition {
	if len(categories) == 0 {
		return r.GetTools()
	}

	var tools []llm.ToolDefinition
	for _, category := range categories {
		tools = append(tools, r.GetToolsByCategory(category)...)
	}

	return tools
}
