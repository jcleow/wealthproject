package decimal

import (
	"encoding/json"
	"testing"
)

func TestNewFromInt64(t *testing.T) {
	// $100.50 = 10050 cents = 10050 * 10^-2
	d := NewFromInt64(10050, -2)
	expected := MustFromString("100.50")
	if d.Cmp(expected) != 0 {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestFromCents(t *testing.T) {
	d := FromCents(10050)
	if d.String() != "100.50" {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestToCents(t *testing.T) {
	d := MustFromString("100.50")
	cents := d.ToCents()
	if cents != 10050 {
		t.Errorf("expected 10050 cents, got %d", cents)
	}
}

func TestFromBasisPoints(t *testing.T) {
	// 300 basis points = 3% = 0.03
	d := FromBasisPoints(300)
	if d.String() != "0.0300" {
		t.Errorf("expected 0.0300, got %s", d.String())
	}
}

func TestToBasisPoints(t *testing.T) {
	d := MustFromString("0.03")
	bps := d.ToBasisPoints()
	if bps != 300 {
		t.Errorf("expected 300 bps, got %d", bps)
	}
}

func TestAdd(t *testing.T) {
	a := MustFromString("100.50")
	b := MustFromString("25.25")
	result := a.Add(b)
	if result.String() != "125.75" {
		t.Errorf("expected 125.75, got %s", result.String())
	}
}

func TestSub(t *testing.T) {
	a := MustFromString("100.50")
	b := MustFromString("25.25")
	result := a.Sub(b)
	if result.String() != "75.25" {
		t.Errorf("expected 75.25, got %s", result.String())
	}
}

func TestMul(t *testing.T) {
	a := MustFromString("100.50")
	b := MustFromString("1.03")
	result := a.Mul(b)
	// 100.50 * 1.03 = 103.515
	if result.String() != "103.5150" {
		t.Errorf("expected 103.5150, got %s", result.String())
	}
}

func TestDiv(t *testing.T) {
	a := MustFromString("100.00")
	b := MustFromString("3.00")
	result := a.Div(b)
	// Should give us 33.333... with proper precision
	if result.Round(2).String() != "33.33" {
		t.Errorf("expected 33.33, got %s", result.Round(2).String())
	}
}

func TestPow(t *testing.T) {
	// Test (1.03)^(1/12) for monthly compound rate
	base := MustFromString("1.03")
	exponent := MustFromString("0.083333333333") // 1/12
	result, err := base.Pow(exponent)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// (1.03)^(1/12) ≈ 1.00247 (rounded to 5 decimal places)
	expected := "1.00247"
	if result.Round(5).String() != expected {
		t.Errorf("expected %s, got %s", expected, result.Round(5).String())
	}
}

func TestCompoundGrowth(t *testing.T) {
	// Test compound monthly growth over 12 months
	// $100 with 3% annual growth
	principal := MustFromString("100.00")

	// Calculate monthly rate: (1.03)^(1/12)
	onePlusRate := MustFromString("1.03")
	oneOverTwelve := MustFromString("0.083333333333")
	monthlyMultiplier, err := onePlusRate.Pow(oneOverTwelve)
	if err != nil {
		t.Fatalf("failed to calculate monthly rate: %v", err)
	}

	// Apply monthly growth 12 times
	amount := principal
	for i := 0; i < 12; i++ {
		amount = amount.Mul(monthlyMultiplier)
	}

	// After 12 months, should be close to $103
	if amount.Round(2).String() != "103.00" {
		t.Errorf("expected 103.00, got %s", amount.Round(2).String())
	}
}

func TestJSONMarshal(t *testing.T) {
	d := MustFromString("100.50")
	data, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	expected := `"100.50"`
	if string(data) != expected {
		t.Errorf("expected %s, got %s", expected, string(data))
	}
}

func TestJSONUnmarshal(t *testing.T) {
	// Test string format
	data := []byte(`"100.50"`)
	var d Decimal
	err := json.Unmarshal(data, &d)
	if err != nil {
		t.Fatalf("failed to unmarshal string: %v", err)
	}

	if d.String() != "100.50" {
		t.Errorf("expected 100.50, got %s", d.String())
	}
}

func TestJSONUnmarshalNumber(t *testing.T) {
	// Test number format (from frontend)
	data := []byte(`100.50`)
	var d Decimal
	err := json.Unmarshal(data, &d)
	if err != nil {
		t.Fatalf("failed to unmarshal number: %v", err)
	}

	if d.String() != "100.5" {
		t.Errorf("expected 100.5, got %s", d.String())
	}

	// Test integer number
	data2 := []byte(`5000`)
	var d2 Decimal
	err = json.Unmarshal(data2, &d2)
	if err != nil {
		t.Fatalf("failed to unmarshal integer: %v", err)
	}

	if d2.String() != "5000" {
		t.Errorf("expected 5000, got %s", d2.String())
	}
}

func TestIsZero(t *testing.T) {
	zero := Zero()
	if !zero.IsZero() {
		t.Error("expected Zero() to be zero")
	}

	nonZero := MustFromString("0.01")
	if nonZero.IsZero() {
		t.Error("expected 0.01 to not be zero")
	}
}

func TestIsNegative(t *testing.T) {
	negative := MustFromString("-100.50")
	if !negative.IsNegative() {
		t.Error("expected -100.50 to be negative")
	}

	positive := MustFromString("100.50")
	if positive.IsNegative() {
		t.Error("expected 100.50 to not be negative")
	}
}

func TestCmp(t *testing.T) {
	a := MustFromString("100.50")
	b := MustFromString("50.25")
	c := MustFromString("100.50")

	if a.Cmp(b) != 1 {
		t.Error("expected 100.50 > 50.25")
	}

	if b.Cmp(a) != -1 {
		t.Error("expected 50.25 < 100.50")
	}

	if a.Cmp(c) != 0 {
		t.Error("expected 100.50 == 100.50")
	}
}

func TestRound(t *testing.T) {
	d := MustFromString("100.5555")

	if d.Round(2).String() != "100.56" {
		t.Errorf("expected 100.56, got %s", d.Round(2).String())
	}

	if d.Round(1).String() != "100.6" {
		t.Errorf("expected 100.6, got %s", d.Round(1).String())
	}

	if d.Round(0).String() != "101" {
		t.Errorf("expected 101, got %s", d.Round(0).String())
	}
}
