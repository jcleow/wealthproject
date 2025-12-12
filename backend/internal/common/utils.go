package common

import "time"

// MonthsBetween calculates the number of months between two dates (inclusive)
func MonthsBetween(start, end time.Time) int {
	years := end.Year() - start.Year()
	months := int(end.Month()) - int(start.Month())
	return years*12 + months + 1
}
