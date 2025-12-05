https://medium.com/@johnsiilver/go-and-leave-your-java-factories-behind-179067818e9f
package main

import "fmt"

// Same interface
type Strategy interface {
	Calculate() float64
}

type CompoundMonthlyStrategy struct{}

func (c CompoundMonthlyStrategy) Calculate() float64 {
	return 123
}

// New helper method not in the interface
func (c CompoundMonthlyStrategy) InternalRateHelper() float64 {
	return 0.123
}

// ❌ BAD: returning interface instead of concrete
func NewCompoundMonthly() Strategy {
	return CompoundMonthlyStrategy{}
}

func main() {
	s := NewCompoundMonthly() // Type = Strategy

	fmt.Println("Calculate:", s.Calculate())

	// ❌ COMPILE ERROR
	// s.InternalRateHelper()
	//
	// error:
	// s.InternalRateHelper undefined (type Strategy has no method InternalRateHelper)
}
