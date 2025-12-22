package decimal

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"math/big"

	"github.com/cockroachdb/apd/v3"
	"github.com/jackc/pgx/v5/pgtype"
)

// Common precision contexts for different use cases
var (
	// MoneyContext is used for monetary calculations (2 decimal places, rounding half up)
	MoneyContext = apd.Context{
		Precision:   34,                  // Standard precision for financial calculations
		MaxExponent: apd.MaxExponent,
		MinExponent: apd.MinExponent,
		Traps:       apd.DefaultTraps,
		Rounding:    apd.RoundHalfUp,
	}

	// PercentageContext is used for percentage/rate calculations (up to 6 decimal places)
	PercentageContext = apd.Context{
		Precision:   34,
		MaxExponent: apd.MaxExponent,
		MinExponent: apd.MinExponent,
		Traps:       apd.DefaultTraps,
		Rounding:    apd.RoundHalfUp,
	}

	// GrowthContext is used for growth calculations (high precision for compounding)
	GrowthContext = apd.Context{
		Precision:   34,
		MaxExponent: apd.MaxExponent,
		MinExponent: apd.MinExponent,
		Traps:       apd.DefaultTraps,
		Rounding:    apd.RoundHalfUp,
	}
)

// Decimal wraps apd.Decimal with JSON marshaling support
type Decimal struct {
	apd.Decimal
}

// NewFromInt64 creates a new Decimal from an int64 (useful for cents -> dollars)
func NewFromInt64(value int64, scale int32) *Decimal {
	return &Decimal{
		Decimal: *apd.New(value, scale),
	}
}

// NewFromFloat64 creates a new Decimal from a float64 (use sparingly!)
func NewFromFloat64(value float64) (*Decimal, error) {
	d := &Decimal{}
	_, err := d.SetFloat64(value)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// MustFromFloat64 creates a new Decimal from float64 or panics
func MustFromFloat64(value float64) *Decimal {
	d, err := NewFromFloat64(value)
	if err != nil {
		panic(fmt.Sprintf("failed to create decimal from float64: %v", err))
	}
	return d
}

// NewFromString creates a new Decimal from a string
func NewFromString(value string) (*Decimal, error) {
	d := &Decimal{}
	_, _, err := d.SetString(value)
	if err != nil {
		return nil, err
	}
	return d, nil
}

// MustFromString creates a new Decimal from string or panics
func MustFromString(value string) *Decimal {
	d, err := NewFromString(value)
	if err != nil {
		panic(fmt.Sprintf("failed to create decimal from string: %v", err))
	}
	return d
}

// Zero returns a Decimal representing 0
func Zero() *Decimal {
	return &Decimal{Decimal: *apd.New(0, 0)}
}

// One returns a Decimal representing 1
func One() *Decimal {
	return &Decimal{Decimal: *apd.New(1, 0)}
}

// Add performs addition with the MoneyContext.
// Errors are only possible for extreme overflow values that won't occur in financial calculations.
func (d *Decimal) Add(other *Decimal) *Decimal {
	result := &Decimal{}
	MoneyContext.Add(&result.Decimal, &d.Decimal, &other.Decimal)
	return result
}

// Sub performs subtraction with the MoneyContext.
// Errors are only possible for extreme overflow values that won't occur in financial calculations.
func (d *Decimal) Sub(other *Decimal) *Decimal {
	result := &Decimal{}
	MoneyContext.Sub(&result.Decimal, &d.Decimal, &other.Decimal)
	return result
}

// Mul performs multiplication with the MoneyContext.
// Errors are only possible for extreme overflow values that won't occur in financial calculations.
func (d *Decimal) Mul(other *Decimal) *Decimal {
	result := &Decimal{}
	MoneyContext.Mul(&result.Decimal, &d.Decimal, &other.Decimal)
	return result
}

// Div performs division with the MoneyContext.
// Panics on division by zero. Other errors are only possible for extreme values.
func (d *Decimal) Div(other *Decimal) *Decimal {
	if other.IsZero() {
		panic("decimal: division by zero")
	}
	result := &Decimal{}
	MoneyContext.Quo(&result.Decimal, &d.Decimal, &other.Decimal)
	return result
}

// Pow performs exponentiation (supports fractional exponents)
func (d *Decimal) Pow(exponent *Decimal) (*Decimal, error) {
	result := &Decimal{}
	_, err := GrowthContext.Pow(&result.Decimal, &d.Decimal, &exponent.Decimal)
	return result, err
}

// Round rounds to the specified decimal places
func (d *Decimal) Round(places int32) *Decimal {
	result := &Decimal{}
	MoneyContext.Quantize(&result.Decimal, &d.Decimal, -places)
	return result
}

// IsZero returns true if the decimal is zero
func (d *Decimal) IsZero() bool {
	return d.Decimal.IsZero()
}

// IsNegative returns true if the decimal is negative
func (d *Decimal) IsNegative() bool {
	return d.Decimal.Negative
}

// Cmp compares two decimals (-1 if d < other, 0 if equal, 1 if d > other)
func (d *Decimal) Cmp(other *Decimal) int {
	return d.Decimal.Cmp(&other.Decimal)
}

// Abs returns the absolute value of the decimal
func (d *Decimal) Abs() *Decimal {
	result := &Decimal{}
	result.Decimal.Abs(&d.Decimal)
	return result
}

// String returns the string representation
func (d *Decimal) String() string {
	return d.Decimal.Text('f')
}

// MarshalJSON implements json.Marshaler
func (d Decimal) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

// UnmarshalJSON implements json.Unmarshaler
// Accepts both string ("123.45") and number (123.45) JSON values
func (d *Decimal) UnmarshalJSON(data []byte) error {
	// Try string first
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		_, _, err := d.SetString(s)
		return err
	}

	// Try number (float64)
	var f float64
	if err := json.Unmarshal(data, &f); err != nil {
		return err
	}
	_, err := d.SetFloat64(f)
	return err
}

// Scan implements sql.Scanner for database/sql
func (d *Decimal) Scan(value interface{}) error {
	if value == nil {
		d.Decimal = *apd.New(0, 0)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		_, _, err := d.SetString(string(v))
		return err
	case string:
		_, _, err := d.SetString(v)
		return err
	case int64:
		d.Decimal = *apd.New(v, 0)
		return nil
	case float64:
		_, err := d.SetFloat64(v)
		return err
	default:
		return fmt.Errorf("cannot scan type %T into Decimal", value)
	}
}

// Value implements driver.Valuer for database/sql
func (d Decimal) Value() (driver.Value, error) {
	return d.String(), nil
}

// Helper functions for common operations

// FromCents converts cents (int64) to a Decimal dollar amount
func FromCents(cents int64) *Decimal {
	return NewFromInt64(cents, -2) // -2 scale means divide by 100
}

// ToCents converts a Decimal to cents (int64)
func (d *Decimal) ToCents() int64 {
	// Multiply by 100 and round
	hundred := apd.New(100, 0)
	result := &apd.Decimal{}
	MoneyContext.Mul(result, &d.Decimal, hundred)
	MoneyContext.RoundToIntegralValue(result, result)

	cents, err := result.Int64()
	if err != nil {
		// Handle overflow - shouldn't happen with reasonable money amounts
		return 0
	}
	return cents
}

// FromBasisPoints converts basis points (int64) to a decimal rate
// Example: 300 basis points = 0.03 (3%)
func FromBasisPoints(bps int64) *Decimal {
	return NewFromInt64(bps, -4) // -4 scale means divide by 10000
}

// ToBasisPoints converts a decimal rate to basis points
func (d *Decimal) ToBasisPoints() int64 {
	tenThousand := apd.New(10000, 0)
	result := &apd.Decimal{}
	MoneyContext.Mul(result, &d.Decimal, tenThousand)
	MoneyContext.RoundToIntegralValue(result, result)

	bps, err := result.Int64()
	if err != nil {
		return 0
	}
	return bps
}

// ToFloat64 converts the decimal to a float64 (may lose precision for very large values)
func (d *Decimal) ToFloat64() float64 {
	f, _ := d.Decimal.Float64()
	return f
}

// NumericValue implements pgtype.NumericValuer for pgx v5.
// This allows Decimal to be used directly in pgx queries without type casting.
func (d Decimal) NumericValue() (pgtype.Numeric, error) {
	// Convert apd.Decimal coefficient to big.Int
	coeff := d.Decimal.Coeff.MathBigInt()
	if d.Decimal.Negative {
		coeff = new(big.Int).Neg(coeff)
	}

	// apd uses positive exponent for scale (e.g., 123.45 = 12345 * 10^-2, exp=-2)
	// pgtype.Numeric expects exponent in the same format
	return pgtype.Numeric{
		Int:   coeff,
		Exp:   d.Decimal.Exponent,
		Valid: true,
	}, nil
}

// ScanNumeric implements pgtype.NumericScanner for pgx v5.
// This allows Decimal to be scanned directly from pgx query results.
func (d *Decimal) ScanNumeric(n pgtype.Numeric) error {
	if !n.Valid {
		d.Decimal = *apd.New(0, 0)
		return nil
	}

	if n.Int == nil {
		d.Decimal = *apd.New(0, 0)
		return nil
	}

	// Handle NaN and Inf
	if n.NaN {
		return fmt.Errorf("cannot convert NaN to Decimal")
	}
	if n.InfinityModifier != pgtype.Finite {
		return fmt.Errorf("cannot convert Infinity to Decimal")
	}

	// Convert big.Int to apd.BigInt
	var coeff apd.BigInt
	coeff.SetMathBigInt(n.Int)

	// Handle negative numbers - big.Int stores sign, apd stores it separately
	negative := n.Int.Sign() < 0
	if negative {
		coeff.Abs(&coeff)
	}

	d.Decimal = apd.Decimal{
		Form:     apd.Finite,
		Negative: negative,
		Exponent: n.Exp,
		Coeff:    coeff,
	}

	return nil
}
