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
	Required    bool        `json:"-"`               // Internal flag, not serialized (Required array is built from this)
}

// ItemSchema represents items in an array property
type ItemSchema struct {
	Type string `json:"type"`
}

// Helper functions for creating pointers to primitives
func Bool(v bool) *bool        { return &v }
func Float(v float64) *float64 { return &v }
func Int(v int) *int           { return &v }

// BuildRequiredArray populates the Required slice from PropertySchema.Required flags.
// Call this after setting up Properties to ensure the Required array is in sync.
func (s *JSONSchema) BuildRequiredArray() {
	s.Required = nil
	for name, prop := range s.Properties {
		if prop != nil && prop.Required {
			s.Required = append(s.Required, name)
		}
	}
}

// GetRequiredFields returns the names of all required fields
func (s *JSONSchema) GetRequiredFields() []string {
	var required []string
	for name, prop := range s.Properties {
		if prop != nil && prop.Required {
			required = append(required, name)
		}
	}
	return required
}

// GetOptionalFields returns the names of all optional fields
func (s *JSONSchema) GetOptionalFields() []string {
	var optional []string
	for name, prop := range s.Properties {
		if prop != nil && !prop.Required {
			optional = append(optional, name)
		}
	}
	return optional
}
