package config

import (
	"fmt"
	"time"
)

// configs holds all CPF configurations in memory, keyed by year
var configs map[int]*CPFConfiguration

func init() {
	cfg2024 := Config2024()
	cfg2025 := Config2025()
	cfg2026 := Config2026()
	configs = map[int]*CPFConfiguration{
		2024: &cfg2024,
		2025: &cfg2025,
		2026: &cfg2026,
	}
}

// GetByYear returns the configuration for a specific year
func GetByYear(year int) (*CPFConfiguration, error) {
	cfg, ok := configs[year]
	if !ok {
		return nil, fmt.Errorf("no CPF configuration found for year %d", year)
	}
	return cfg, nil
}

// GetByDate returns the configuration effective for a specific date
func GetByDate(date time.Time) (*CPFConfiguration, error) {
	// Find the config where date falls within effective range
	for _, cfg := range configs {
		if !date.Before(cfg.EffectiveFrom) {
			if cfg.EffectiveTo == nil || date.Before(*cfg.EffectiveTo) {
				return cfg, nil
			}
		}
	}
	return nil, fmt.Errorf("no CPF configuration found for date %s", date.Format("2006-01-02"))
}

// GetCurrentYear returns the configuration for the current year
func GetCurrentYear() (*CPFConfiguration, error) {
	return GetByYear(time.Now().Year())
}

// ListYears returns all available configuration years in descending order
func ListYears() []int {
	years := make([]int, 0, len(configs))
	for year := range configs {
		years = append(years, year)
	}
	// Sort descending
	for i := 0; i < len(years)-1; i++ {
		for j := i + 1; j < len(years); j++ {
			if years[j] > years[i] {
				years[i], years[j] = years[j], years[i]
			}
		}
	}
	return years
}
