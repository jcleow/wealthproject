// https://medium.com/@johnsiilver/go-and-leave-your-java-factories-behind-179067818e9f
package main

import "fmt"

// 1. Define the interface (minimal behavior)
type Strategy interface {
	Calculate() float64
}

// 2. Concrete type
type CompoundMonthlyStrategy struct{}

func (c CompoundMonthlyStrategy) Calculate() float64 {
	return 123
}

// New helper method not in the interface
func (c CompoundMonthlyStrategy) InternalRateHelper() float64 {
	return 0.123
}

// 3. Return concrete type (GOOD)
func NewCompoundMonthly() CompoundMonthlyStrategy {
	return CompoundMonthlyStrategy{}
}

func main() {
	// Caller has full control

	// A. Use concrete type
	c := NewCompoundMonthly()
	fmt.Println("Calculate:", c.Calculate())
	fmt.Println("InternalRateHelper:", c.InternalRateHelper()) // 👍 Works!

	// B. Caller decides to use it as interface
	var s Strategy = c
	fmt.Println("As interface:", s.Calculate())

	// But caller still has access to c as concrete type if needed
}
