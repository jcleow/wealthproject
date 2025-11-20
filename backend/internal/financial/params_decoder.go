package financial

import (
	"encoding/json"
	"fmt"
)

// DecodeParams converts a dynamic parameter map into a strongly typed struct.
func DecodeParams[T any](params map[string]interface{}) (T, error) {
	var target T
	if params == nil {
		return target, fmt.Errorf("parameters cannot be nil")
	}

	raw, err := json.Marshal(params)
	if err != nil {
		return target, fmt.Errorf("marshal parameters: %w", err)
	}

	if err := json.Unmarshal(raw, &target); err != nil {
		return target, fmt.Errorf("decode parameters: %w", err)
	}

	return target, nil
}
