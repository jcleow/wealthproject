package decimal

import (
	"encoding/json"
	"testing"
)

func TestNewFromInt64(t *testing.T) {
	// Arrange
	expected := MustFromString("100.50")

	// Act
	// Computation: NewFromInt64(mantissa, exponent) = mantissa × 10^exponent
	// 10050 × 10^(-2) = 10050 / 100 = 100.50
	d := NewFromInt64(10050, -2)

	// Assert
	if d.Cmp(expected) != 0 {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestFromCents(t *testing.T) {
	// Act
	// Computation: FromCents converts cents to dollars
	// 10050 cents = 10050 / 100 = $100.50
	d := FromCents(10050)

	// Assert
	if d.String() != "100.50" {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestToCents(t *testing.T) {
	// Arrange
	d := MustFromString("100.50")

	// Act
	// Computation: ToCents converts dollars to cents
	// $100.50 × 100 = 10050 cents
	cents := d.ToCents()

	// Assert
	if cents != 10050 {
		t.Errorf("expected 10050 cents, got %d", cents)
	}
}

func TestFromBasisPoints(t *testing.T) {
	// Act
	// Computation: 1 basis point = 0.01% = 0.0001
	// 300 basis points = 300 × 0.0001 = 0.03 = 3%
	d := FromBasisPoints(300)

	// Assert
	if d.String() != "0.0300" {
		t.Errorf("expected 0.0300, got %s", d.String())
	}
}

func TestToBasisPoints(t *testing.T) {
	// Arrange
	d := MustFromString("0.03")

	// Act
	// Computation: 0.03 = 3% = 3/0.01 = 300 basis points
	// Or: 0.03 / 0.0001 = 300 bps
	bps := d.ToBasisPoints()

	// Assert
	if bps != 300 {
		t.Errorf("expected 300 bps, got %d", bps)
	}
}

func TestAdd(t *testing.T) {
	// Arrange
	a := MustFromString("100.50")
	b := MustFromString("25.25")

	// Act
	// Computation: 100.50 + 25.25 = 125.75
	result := a.Add(b)

	// Assert
	if result.String() != "125.75" {
		t.Errorf("expected 125.75, got %s", result.String())
	}
}

func TestSub(t *testing.T) {
	// Arrange
	a := MustFromString("100.50")
	b := MustFromString("25.25")

	// Act
	// Computation: 100.50 - 25.25 = 75.25
	result := a.Sub(b)

	// Assert
	if result.String() != "75.25" {
		t.Errorf("expected 75.25, got %s", result.String())
	}
}

func TestMul(t *testing.T) {
	// Arrange
	a := MustFromString("100.50")
	b := MustFromString("1.03")

	// Act
	// Computation: 100.50 × 1.03 = 103.515
	// Useful for applying growth rate: balance × (1 + rate) = new balance
	result := a.Mul(b)

	// Assert
	if result.String() != "103.5150" {
		t.Errorf("expected 103.5150, got %s", result.String())
	}
}

func TestDiv(t *testing.T) {
	// Arrange
	a := MustFromString("100.00")
	b := MustFromString("3.00")

	// Act
	// Computation: 100.00 / 3.00 = 33.333... (repeating)
	// Rounded to 2 decimal places: 33.33
	result := a.Div(b)

	// Assert
	if result.Round(2).String() != "33.33" {
		t.Errorf("expected 33.33, got %s", result.Round(2).String())
	}
}

func TestPow(t *testing.T) {
	// Arrange
	base := MustFromString("1.03")
	exponent := MustFromString("0.083333333333") // 1/12
	expected := "1.00247"

	// Act
	// Computation: (1.03)^(1/12) converts annual rate to monthly rate
	// Annual rate of 3% → Monthly multiplier = (1.03)^(1/12) ≈ 1.00247
	// This means ~0.247% growth per month
	result, err := base.Pow(exponent)

	// Assert
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Round(5).String() != expected {
		t.Errorf("expected %s, got %s", expected, result.Round(5).String())
	}
}

func TestCompoundGrowth(t *testing.T) {
	// Arrange - $100 with 3% annual growth over 12 months
	// Computation: Monthly compounding at annual rate
	// Monthly multiplier = (1.03)^(1/12) ≈ 1.00247
	// After 12 months: $100 × (1.00247)^12 = $100 × 1.03 = $103
	principal := MustFromString("100.00")
	onePlusRate := MustFromString("1.03")
	oneOverTwelve := MustFromString("0.083333333333")

	// Act - Calculate monthly rate: (1.03)^(1/12)
	monthlyMultiplier, err := onePlusRate.Pow(oneOverTwelve)
	if err != nil {
		t.Fatalf("failed to calculate monthly rate: %v", err)
	}

	// Act - Apply monthly growth 12 times
	// Simulates: $100 → $100.25 → $100.49 → ... → $103.00
	amount := principal
	for i := 0; i < 12; i++ {
		amount = amount.Mul(monthlyMultiplier)
	}

	// Assert - After 12 months: $100 × 1.03 = $103.00
	if amount.Round(2).String() != "103.00" {
		t.Errorf("expected 103.00, got %s", amount.Round(2).String())
	}
}

func TestJSONMarshal(t *testing.T) {
	// Arrange
	d := MustFromString("100.50")
	// Decimals serialize as quoted strings to preserve precision
	expected := `"100.50"`

	// Act
	data, err := json.Marshal(d)

	// Assert
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestJSONUnmarshal(t *testing.T) {
	// Arrange
	// JSON string format: "100.50" → Decimal(100.50)
	data := []byte(`"100.50"`)
	var d Decimal

	// Act
	err := json.Unmarshal(data, &d)

	// Assert
	if err != nil {
		t.Fatalf("failed to unmarshal string: %v", err)
	}
	if d.String() != "100.50" {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestJSONUnmarshalNumber(t *testing.T) {
	t.Run("unmarshal decimal number", func(t *testing.T) {
		// Arrange
		// JSON number format (unquoted): 100.50 → Decimal(100.5)
		// Note: trailing zero may be dropped in string representation
		data := []byte(`100.50`)
		var d Decimal

		// Act
		err := json.Unmarshal(data, &d)

		// Assert
		if err != nil {
			t.Fatalf("failed to unmarshal number: %v", err)
		}
		if d.String() != "100.5" {
			t.Errorf("expected 100.5, got %s", d.String())
		}
	})

	t.Run("unmarshal integer number", func(t *testing.T) {
		// Arrange
		// JSON integer format: 5000 → Decimal(5000)
		data := []byte(`5000`)
		var d Decimal

		// Act
		err := json.Unmarshal(data, &d)

		// Assert
		if err != nil {
			t.Fatalf("failed to unmarshal integer: %v", err)
		}
		if d.String() != "5000" {
			t.Errorf("expected 5000, got %s", d.String())
		}
	})
}

func TestIsZero(t *testing.T) {
	t.Run("zero is zero", func(t *testing.T) {
		// Arrange
		// Zero() returns a Decimal representing 0
		zero := Zero()

		// Assert - 0 == 0, so IsZero() returns true
		if !zero.IsZero() {
			t.Error("expected Zero() to be zero")
		}
	})

	t.Run("non-zero is not zero", func(t *testing.T) {
		// Arrange
		// 0.01 is not zero (even small values are non-zero)
		nonZero := MustFromString("0.01")

		// Assert - 0.01 ≠ 0, so IsZero() returns false
		if nonZero.IsZero() {
			t.Error("expected 0.01 to not be zero")
		}
	})
}

func TestIsNegative(t *testing.T) {
	t.Run("negative number", func(t *testing.T) {
		// Arrange
		// -100.50 is less than zero
		negative := MustFromString("-100.50")

		// Assert - -100.50 < 0, so IsNegative() returns true
		if !negative.IsNegative() {
			t.Error("expected -100.50 to be negative")
		}
	})

	t.Run("positive number", func(t *testing.T) {
		// Arrange
		// 100.50 is greater than zero
		positive := MustFromString("100.50")

		// Assert - 100.50 > 0, so IsNegative() returns false
		if positive.IsNegative() {
			t.Error("expected 100.50 to not be negative")
		}
	})
}

func TestCmp(t *testing.T) {
	// Arrange
	// Cmp returns: 1 if a > b, -1 if a < b, 0 if a == b
	a := MustFromString("100.50")
	b := MustFromString("50.25")
	c := MustFromString("100.50")

	// Assert - Greater than: 100.50 > 50.25, returns 1
	if a.Cmp(b) != 1 {
		t.Error("expected 100.50 > 50.25")
	}

	// Assert - Less than: 50.25 < 100.50, returns -1
	if b.Cmp(a) != -1 {
		t.Error("expected 50.25 < 100.50")
	}

	// Assert - Equal: 100.50 == 100.50, returns 0
	if a.Cmp(c) != 0 {
		t.Error("expected 100.50 == 100.50")
	}
}

func TestRound(t *testing.T) {
	// Arrange
	// Round(n) rounds to n decimal places using half-up rounding
	d := MustFromString("100.5555")

	// Assert - Round to 2 decimal places
	// 100.5555 → 100.56 (0.5555 rounds up to 0.56)
	if d.Round(2).String() != "100.56" {
		t.Errorf("expected 100.56, got %s", d.Round(2).String())
	}

	// Assert - Round to 1 decimal place
	// 100.5555 → 100.6 (0.5555 rounds up to 0.6)
	if d.Round(1).String() != "100.6" {
		t.Errorf("expected 100.6, got %s", d.Round(1).String())
	}

	// Assert - Round to 0 decimal places
	// 100.5555 → 101 (0.5555 rounds up to 1)
	if d.Round(0).String() != "101" {
		t.Errorf("expected 101, got %s", d.Round(0).String())
	}
}
