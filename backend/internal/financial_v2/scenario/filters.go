package scenario

// Identifiable is an interface for items that have an ID
type Identifiable interface {
	GetID() string
}

// FilterExcluded removes items whose IDs are in the excludedIDs set.
// This is a generic filter function that works with any slice of Identifiable items.
func FilterExcluded[T Identifiable](items []T, excludedIDs map[string]struct{}) []T {
	if len(excludedIDs) == 0 {
		return items
	}
	filtered := make([]T, 0, len(items))
	for _, item := range items {
		if _, excluded := excludedIDs[item.GetID()]; !excluded {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

// FilterExcludedByID removes items whose IDs are in the excludedIDs set.
// This version takes an ID extractor function for flexibility with different types.
func FilterExcludedByID[T any](items []T, excludedIDs map[string]struct{}, getID func(T) string) []T {
	if len(excludedIDs) == 0 {
		return items
	}
	filtered := make([]T, 0, len(items))
	for _, item := range items {
		if _, excluded := excludedIDs[getID(item)]; !excluded {
			filtered = append(filtered, item)
		}
	}
	return filtered
}
