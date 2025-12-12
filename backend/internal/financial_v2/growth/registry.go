package growth

import "fmt"

// Registry manages available growth strategies.
// Strategies are registered at initialization time and retrieved by name.
type Registry struct {
	strategies map[string]Strategy
}

// NewRegistry creates a new strategy registry with built-in strategies pre-registered.
func NewRegistry() *Registry {
	r := &Registry{
		strategies: make(map[string]Strategy),
	}

	// Register built-in strategies
	r.Register(&MonthlyCompoundStrategy{})
	r.Register(&AnnualStepStrategy{})
	r.Register(&LinearGrowthStrategy{})

	return r
}

// Register adds a strategy to the registry.
// If a strategy with the same name already exists, it will be replaced.
func (r *Registry) Register(s Strategy) {
	r.strategies[s.Name()] = s
}

// Get retrieves a strategy by name.
// Returns an error if the strategy is not found.
func (r *Registry) Get(name string) (Strategy, error) {
	s, ok := r.strategies[name]
	if !ok {
		return nil, fmt.Errorf("growth strategy %q not found", name)
	}
	return s, nil
}

// List returns the names of all registered strategies.
func (r *Registry) List() []string {
	names := make([]string, 0, len(r.strategies))
	for name := range r.strategies {
		names = append(names, name)
	}
	return names
}
