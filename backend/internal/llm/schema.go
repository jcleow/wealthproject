package llm

// JSONSchema represents a JSON Schema object for tool parameters
type JSONSchema struct {
	Type                 string                     `json:"type"`
	Properties           map[string]*PropertySchema `json:"properties,omitempty"`
	Required             []string                   `json:"required,omitempty"`
	AdditionalProperties *bool                      `json:"additionalProperties,omitempty"`
}

// PropertySchema represents a single property in the schema
type PropertySchema struct {
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Enum        []string    `json:"enum,omitempty"`
	Minimum     *float64    `json:"minimum,omitempty"`
	Maximum     *float64    `json:"maximum,omitempty"`
	MinLength   *int        `json:"minLength,omitempty"`
	MaxLength   *int        `json:"maxLength,omitempty"`
	Default     any         `json:"default,omitempty"`
	Items       *ItemSchema `json:"items,omitempty"` // For array types
}

// ItemSchema represents items in an array property
type ItemSchema struct {
	Type string `json:"type"`
}

// Helper functions for creating pointers to primitives
func Bool(v bool) *bool        { return &v }
func Float(v float64) *float64 { return &v }
func Int(v int) *int           { return &v }
