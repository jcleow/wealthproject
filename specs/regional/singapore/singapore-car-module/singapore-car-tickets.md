# Singapore Car Module Implementation Tickets

**Repository:** `assetra3`
**Scope:** Singapore Car Purchase & Ownership Module
**Total Backend Points:** 34 points (10 tickets)
**Total Frontend Points:** 32 points (9 tickets)
**Total Testing/Docs Points:** 8 points (3 tickets)
**Grand Total:** 74 points (22 tickets)

---

## Backend Implementation Tickets

### B13: Database Schema & Migrations for Vehicles
**Status:** todo
**Priority:** P0
**Complexity:** 3 points
**Blocks:** B14, B15, B16, B17, B18, B19, B20
**Dependencies:** None

**Objective:** Create database schema for vehicles, cost breakdowns, and versioned Singapore car rules.

**Background:**
The Singapore car module requires persistent storage for vehicle data, computed cost breakdowns (cached for performance), and versioned regulatory rules (ARF tiers, GST rates, road tax formulas) that can change over time.

**Requirements:**

1. **Create `vehicles` table** with all fields from PRD schema:
   - Vehicle identification: id, user_id, parent_id, name
   - Type flags: is_used_vehicle, is_electric
   - Specs: omv, coe_amount, coe_category, engine_capacity_cc, fuel_type, vehicle_type
   - Purchase: purchase_date, purchase_price
   - Used car fields: original_registration_date, coe_start_date, vehicle_age_at_purchase
   - EV fields: battery_capacity_kwh, ev_efficiency, electricity_rate, ev_arf_rebate_applied
   - Financing: loan_amount, loan_interest_rate, loan_tenure_months
   - Usage: annual_mileage_km, fuel_efficiency, fuel_price_per_unit
   - Ownership: planned_ownership_years, coe_renewal_preference
   - Costs: maintenance_level, erp_monthly, parking_monthly
   - Insurance: driver_age, driving_experience_years, ncd_percentage, claims_history_3yr, coverage_type, excess_amount
   - Effective dating: start_year, end_year
   - Meta: notes, created_at, updated_at

2. **Create `vehicle_cost_breakdowns` table** for cached calculations:
   - Purchase breakdown: excise_duty, gst, arf, registration_fee, dealer_fee, total_purchase_cost
   - Financing: downpayment, loan_principal, total_interest, monthly_payment
   - Annual recurring: road_tax, insurance, fuel, maintenance, erp_parking, total_annual_recurring
   - Depreciation: initial_parf_value
   - computed_at timestamp

3. **Create `sg_car_rules` table** for versioned rules:
   - rule_type (arf_tier, gst_rate, road_tax, ltv_cap, excise_duty)
   - effective_from, effective_to (nullable = current)
   - rule_data (JSONB)
   - source_reference (e.g., "LTA Circular 2024/01")

4. **Create `sg_insurance_rules` table** for insurance estimation:
   - rule_type (base_rate, age_factor, ncd_discount, excess_factor)
   - effective_from, effective_to
   - rule_data (JSONB)

5. **Seed initial rules** with current 2024 values:
   - ARF tiers: 100%/$20k, 140%/$30k, 180%/above
   - GST: 9%
   - Excise duty: 20%
   - LTV caps: 70%/≤$20k OMV, 60%/>$20k OMV
   - Road tax formulas by engine capacity
   - Insurance base rates and factors

**Database Migration Files:**
- `20250301001_create_vehicles.up.sql`
- `20250301001_create_vehicles.down.sql`
- `20250301002_create_vehicle_cost_breakdowns.up.sql`
- `20250301002_create_vehicle_cost_breakdowns.down.sql`
- `20250301003_create_sg_car_rules.up.sql`
- `20250301003_create_sg_car_rules.down.sql`
- `20250301004_create_sg_insurance_rules.up.sql`
- `20250301004_create_sg_insurance_rules.down.sql`
- `20250301005_seed_sg_car_rules.up.sql`
- `20250301005_seed_sg_car_rules.down.sql`

**Acceptance Criteria:**
- [ ] All migrations run successfully (up and down)
- [ ] Constraints enforce valid enum values (coe_category, fuel_type, etc.)
- [ ] Check constraints validate business rules (loan_tenure ≤ 84, ncd 0-50, etc.)
- [ ] Indexes created for user_id, parent_id, rule lookups
- [ ] Seed data loads with current 2024 Singapore rules
- [ ] Foreign key cascades work correctly (delete vehicle → delete breakdown)

**Tests (write first):**
- Migration up/down idempotency
- Constraint violation tests (invalid enum, out-of-range values)
- Seed data verification
- Index existence verification

---

### B14: Vehicle Repository Layer
**Status:** todo
**Priority:** P0
**Complexity:** 3 points
**Blocks:** B15, B20
**Dependencies:** B13

**Objective:** Implement repository layer for vehicle CRUD operations with proper user scoping.

**Background:**
Following Assetra's existing patterns (see `financial/repository/store.go`), create repository methods for vehicle operations with consistent error handling and user isolation.

**Requirements:**

1. **Vehicle Repository Methods:**
```go
type VehicleRepository interface {
    CreateVehicle(ctx context.Context, userID string, vehicle Vehicle) (Vehicle, error)
    GetVehicle(ctx context.Context, userID string, vehicleID string) (*Vehicle, error)
    ListVehicles(ctx context.Context, userID string, params PaginationParams) (*PaginatedResult[Vehicle], error)
    UpdateVehicle(ctx context.Context, userID string, vehicle Vehicle) (Vehicle, error)
    DeleteVehicle(ctx context.Context, userID string, vehicleID string) error
}
```

2. **Cost Breakdown Repository:**
```go
type CostBreakdownRepository interface {
    UpsertCostBreakdown(ctx context.Context, breakdown VehicleCostBreakdown) error
    GetCostBreakdown(ctx context.Context, vehicleID string) (*VehicleCostBreakdown, error)
}
```

3. **Rules Repository:**
```go
type CarRulesRepository interface {
    GetARFTiers(ctx context.Context, asOfDate time.Time) ([]ARFTier, error)
    GetGSTRate(ctx context.Context, asOfDate time.Time) (float64, error)
    GetLTVCaps(ctx context.Context, asOfDate time.Time) ([]LTVCap, error)
    GetRoadTaxRates(ctx context.Context, asOfDate time.Time) ([]RoadTaxRate, error)
    GetInsuranceFactors(ctx context.Context, asOfDate time.Time) (InsuranceFactors, error)
}
```

4. **Type Definitions:**
```go
type Vehicle struct {
    ID                     string    `json:"id"`
    UserID                 string    `json:"userId"`
    ParentID               string    `json:"parentId"`
    Name                   string    `json:"name"`
    IsUsedVehicle          bool      `json:"isUsedVehicle"`
    IsElectric             bool      `json:"isElectric"`
    OMV                    float64   `json:"omv"`
    COEAmount              float64   `json:"coeAmount"`
    COECategory            string    `json:"coeCategory"`
    EngineCapacityCc       *int      `json:"engineCapacityCc,omitempty"`
    FuelType               string    `json:"fuelType"`
    VehicleType            *string   `json:"vehicleType,omitempty"`
    PurchaseDate           time.Time `json:"purchaseDate"`
    PurchasePrice          float64   `json:"purchasePrice"`
    // ... all other fields
    CreatedAt              time.Time `json:"createdAt"`
    UpdatedAt              time.Time `json:"updatedAt"`
}

type VehicleCostBreakdown struct {
    ID                     string    `json:"id"`
    VehicleID              string    `json:"vehicleId"`
    ExciseDuty             float64   `json:"exciseDuty"`
    GST                    float64   `json:"gst"`
    ARF                    float64   `json:"arf"`
    RegistrationFee        float64   `json:"registrationFee"`
    DealerFee              float64   `json:"dealerFee"`
    TotalPurchaseCost      float64   `json:"totalPurchaseCost"`
    Downpayment            *float64  `json:"downpayment,omitempty"`
    LoanPrincipal          *float64  `json:"loanPrincipal,omitempty"`
    TotalInterest          *float64  `json:"totalInterest,omitempty"`
    MonthlyPayment         *float64  `json:"monthlyPayment,omitempty"`
    AnnualRoadTax          float64   `json:"annualRoadTax"`
    AnnualInsuranceEstimate float64  `json:"annualInsuranceEstimate"`
    AnnualFuelEstimate     float64   `json:"annualFuelEstimate"`
    AnnualMaintenanceEstimate float64 `json:"annualMaintenanceEstimate"`
    AnnualErpParking       float64   `json:"annualErpParking"`
    TotalAnnualRecurring   float64   `json:"totalAnnualRecurring"`
    InitialPARF            float64   `json:"initialParf"`
    ComputedAt             time.Time `json:"computedAt"`
}
```

**File Structure:**
- `backend/internal/car/repository/vehicle.go`
- `backend/internal/car/repository/rules.go`
- `backend/internal/car/types.go`

**Acceptance Criteria:**
- [ ] All repository methods implemented with proper error handling
- [ ] User scoping enforced (userID in all queries)
- [ ] Pagination follows existing PaginatedResult pattern
- [ ] Proper handling of nullable fields (sql.NullString, etc.)
- [ ] ErrNotFound returned for missing vehicles
- [ ] Unit tests for all repository methods with mocked database

**Tests (write first):**
- CRUD operations success paths
- User isolation (cannot access other user's vehicles)
- Pagination edge cases (empty, full, boundary)
- Not found error handling
- Constraint violation handling

---

### B15: Purchase Cost Engine
**Status:** todo
**Priority:** P0
**Complexity:** 5 points
**Blocks:** B20
**Dependencies:** B13, B14

**Objective:** Implement Singapore-specific purchase cost calculations (ARF, GST, excise duty, fees).

**Background:**
Singapore has a unique car purchase cost structure with tiered ARF based on OMV, excise duty, GST, and various fees. This engine must accurately calculate all components using versioned rules.

**Requirements:**

1. **ARF Calculator** (Additional Registration Fee):
```go
// ARF Tiers (2024):
// First $20,000 of OMV: 100%
// Next $30,000 ($20k-$50k): 140%
// Above $50,000: 180%

func CalculateARF(omv float64, tiers []ARFTier) float64 {
    // Apply tiered calculation
    // Example: OMV $60,000
    // = ($20,000 × 100%) + ($30,000 × 140%) + ($10,000 × 180%)
    // = $20,000 + $42,000 + $18,000 = $80,000
}
```

2. **Excise Duty Calculator**:
```go
// Excise Duty = 20% of OMV
func CalculateExciseDuty(omv float64, rate float64) float64 {
    return omv * rate
}
```

3. **GST Calculator**:
```go
// GST = 9% of (OMV + Excise Duty)
func CalculateGST(omv float64, exciseDuty float64, gstRate float64) float64 {
    return (omv + exciseDuty) * gstRate
}
```

4. **Registration Fee Calculator**:
```go
// Fixed fee: $220 (2024)
func CalculateRegistrationFee() float64 {
    return 220.0
}
```

5. **Total Purchase Cost**:
```go
func CalculateTotalPurchaseCost(params PurchaseCostParams) PurchaseCostBreakdown {
    // For NEW cars:
    // Total = OMV + Excise Duty + GST + ARF + COE + Registration Fee + Dealer Fee

    // For USED cars:
    // Total = Purchase Price (already includes depreciated value)
    // Skip ARF, GST, Excise (already paid by first owner)
}
```

6. **EV Rebate Handling**:
```go
// EV Early Adoption Incentive (EEAI) rebate
// Apply rebate to ARF for eligible electric vehicles
func ApplyEVRebate(arf float64, rebateAmount float64) float64 {
    return max(0, arf - rebateAmount)
}
```

**File Structure:**
- `backend/internal/car/purchase/calculator.go`
- `backend/internal/car/purchase/arf.go`
- `backend/internal/car/purchase/gst.go`
- `backend/internal/car/rules/loader.go`

**API Contract:**
```go
type PurchaseCostParams struct {
    OMV              float64
    COEAmount        float64
    IsUsedVehicle    bool
    PurchasePrice    float64  // For used cars
    DealerFee        float64
    EVRebateAmount   float64  // For EVs
    AsOfDate         time.Time
}

type PurchaseCostBreakdown struct {
    OMV              float64 `json:"omv"`
    ExciseDuty       float64 `json:"exciseDuty"`
    GST              float64 `json:"gst"`
    ARF              float64 `json:"arf"`
    COE              float64 `json:"coe"`
    RegistrationFee  float64 `json:"registrationFee"`
    DealerFee        float64 `json:"dealerFee"`
    TotalCost        float64 `json:"totalCost"`
}
```

**Acceptance Criteria:**
- [ ] ARF calculation matches LTA tiered rates exactly
- [ ] GST correctly applied at configured rate (9%)
- [ ] Excise duty correctly calculated (20% of OMV)
- [ ] Used cars skip ARF/GST/Excise calculations
- [ ] EV rebates reduce ARF correctly
- [ ] Total cost sums all components accurately
- [ ] Rules loaded from versioned database (not hardcoded)
- [ ] Edge cases handled: zero OMV, boundary tier values

**Tests (write first):**
```go
func TestARFCalculation(t *testing.T) {
    tests := []struct {
        name     string
        omv      float64
        expected float64
    }{
        {"Below $20k", 18000, 18000},      // 100%
        {"At $20k boundary", 20000, 20000}, // 100%
        {"$35k OMV", 35000, 41000},         // $20k×100% + $15k×140%
        {"$50k boundary", 50000, 62000},    // $20k×100% + $30k×140%
        {"$80k OMV", 80000, 116000},        // $20k×100% + $30k×140% + $30k×180%
    }
    // ...
}
```

---

### B16: Loan Engine
**Status:** todo
**Priority:** P0
**Complexity:** 3 points
**Blocks:** B20
**Dependencies:** B13, B14

**Objective:** Implement car loan calculations with Singapore LTV caps and amortisation schedule generation.

**Background:**
Singapore has specific LTV (Loan-to-Value) caps for car loans and a maximum tenure of 7 years. This engine must enforce these rules and generate accurate amortisation schedules.

**Requirements:**

1. **LTV Cap Enforcement**:
```go
// LTV Caps (based on OMV):
// OMV ≤ $20,000: Max LTV 70%
// OMV > $20,000: Max LTV 60%

func CalculateMaxLoan(omv float64, purchasePrice float64) MaxLoanResult {
    var ltvCap float64
    if omv <= 20000 {
        ltvCap = 0.70
    } else {
        ltvCap = 0.60
    }
    maxLoan := purchasePrice * ltvCap
    minDownpayment := purchasePrice - maxLoan
    return MaxLoanResult{
        LTVCap:         ltvCap,
        MaxLoanAmount:  maxLoan,
        MinDownpayment: minDownpayment,
    }
}
```

2. **Tenure Validation**:
```go
// Max tenure: 7 years (84 months)
func ValidateTenure(tenureMonths int) error {
    if tenureMonths < 1 || tenureMonths > 84 {
        return ErrInvalidTenure
    }
    return nil
}
```

3. **Amortisation Schedule Generator**:
```go
func GenerateAmortisationSchedule(params LoanParams) AmortisationSchedule {
    // Monthly payment = P × [r(1+r)^n] / [(1+r)^n - 1]
    // Where:
    //   P = Principal
    //   r = Monthly interest rate (APR / 12)
    //   n = Number of months

    // Generate month-by-month breakdown:
    // - Payment amount (constant)
    // - Principal portion (increasing)
    // - Interest portion (decreasing)
    // - Remaining balance
}
```

4. **Loan Summary**:
```go
type LoanSummary struct {
    Principal         float64            `json:"principal"`
    InterestRate      float64            `json:"interestRate"`
    TenureMonths      int                `json:"tenureMonths"`
    MonthlyPayment    float64            `json:"monthlyPayment"`
    TotalInterest     float64            `json:"totalInterest"`
    TotalRepayment    float64            `json:"totalRepayment"`
    Schedule          []AmortisationRow  `json:"schedule,omitempty"`
}

type AmortisationRow struct {
    Month            int     `json:"month"`
    Payment          float64 `json:"payment"`
    Principal        float64 `json:"principal"`
    Interest         float64 `json:"interest"`
    RemainingBalance float64 `json:"remainingBalance"`
}
```

**File Structure:**
- `backend/internal/car/loan/calculator.go`
- `backend/internal/car/loan/amortisation.go`
- `backend/internal/car/loan/ltv.go`

**Acceptance Criteria:**
- [ ] LTV caps correctly applied based on OMV threshold ($20k)
- [ ] Maximum tenure enforced (84 months)
- [ ] Monthly payment calculation accurate (verify with financial calculator)
- [ ] Amortisation schedule sums to principal + total interest
- [ ] Remaining balance reaches $0 at final month
- [ ] Interest/principal split accurate throughout schedule

**Tests (write first):**
```go
func TestAmortisationSchedule(t *testing.T) {
    params := LoanParams{
        Principal:    100000,
        AnnualRate:   0.0288, // 2.88%
        TenureMonths: 84,
    }
    schedule := GenerateAmortisationSchedule(params)

    // Verify total interest
    assert.InDelta(t, 10584, schedule.TotalInterest, 1) // Allow $1 rounding

    // Verify monthly payment consistency
    for _, row := range schedule.Schedule {
        assert.InDelta(t, 1316, row.Payment, 1)
    }

    // Verify final balance is 0
    lastRow := schedule.Schedule[len(schedule.Schedule)-1]
    assert.InDelta(t, 0, lastRow.RemainingBalance, 0.01)
}
```

---

### B17: Recurring Cost Engine
**Status:** todo
**Priority:** P0
**Complexity:** 5 points
**Blocks:** B20
**Dependencies:** B13, B14

**Objective:** Implement calculations for ongoing vehicle ownership costs (road tax, insurance, fuel, maintenance, ERP/parking).

**Background:**
Vehicle ownership in Singapore involves multiple recurring costs that vary by vehicle specs, driver profile, and usage patterns. This engine must calculate each component accurately.

**Requirements:**

1. **Road Tax Calculator**:
```go
// Road tax based on engine capacity (6-monthly, doubled for annual):
// ≤600cc: $200 × 0.782
// 601-1000cc: $200 + $0.25 × (cc - 600)
// 1001-1600cc: $300 + $0.75 × (cc - 1000)
// 1601-3000cc: $750 + $1.50 × (cc - 1600)
// >3000cc: $2850 + $2.00 × (cc - 3000)

// Age surcharges (applied after year 10):
// Year 11: +10%
// Year 12: +20%
// Year 13: +30%
// Year 14+: +50%

// Electric vehicles: $0 road tax (until policy changes)

func CalculateAnnualRoadTax(params RoadTaxParams) RoadTaxResult {
    if params.IsElectric {
        return RoadTaxResult{AnnualAmount: 0, Note: "EVs exempt until further notice"}
    }

    baseTax := calculateBaseTax(params.EngineCapacityCc)
    ageSurcharge := calculateAgeSurcharge(params.VehicleAge)
    annualTax := baseTax * 2 * (1 + ageSurcharge)

    return RoadTaxResult{
        SixMonthlyBase:  baseTax,
        AnnualBase:      baseTax * 2,
        AgeSurcharge:    ageSurcharge,
        AnnualAmount:    annualTax,
    }
}
```

2. **Insurance Estimator**:
```go
// Multi-factor insurance estimation
// Base Premium = Vehicle Value × Base Rate (by vehicle type)
// Adjustments:
//   × Age Factor (younger drivers = higher)
//   × Experience Factor
//   × NCD Factor (0-50% discount)
//   × Claims Factor (+20% per claim)
//   × Coverage Factor (TPO=0.3, TPFT=0.5, Comprehensive=1.0)
//   × Excess Factor (higher excess = lower premium)

func EstimateAnnualInsurance(params InsuranceParams) InsuranceEstimate {
    basePremium := params.VehicleValue * getBaseRate(params.VehicleType)

    adjustedPremium := basePremium *
        getAgeFactor(params.DriverAge) *
        getExperienceFactor(params.DrivingExperienceYears) *
        getNCDFactor(params.NCDPercentage) *
        getClaimsFactor(params.ClaimsHistory3yr) *
        getCoverageFactor(params.CoverageType) *
        getExcessFactor(params.ExcessAmount)

    return InsuranceEstimate{
        BasePremium:      basePremium,
        AdjustedPremium:  adjustedPremium,
        Breakdown:        breakdown,
        Disclaimer:       "Estimate only. Actual premium may vary.",
    }
}
```

3. **Fuel Cost Calculator**:
```go
// ICE vehicles: Annual fuel = (Annual km / Fuel efficiency) × Fuel price
// Electric vehicles: Annual electricity = (Annual km / 100) × Efficiency × Rate

func CalculateAnnualFuelCost(params FuelParams) FuelCostResult {
    if params.IsElectric {
        // kWh/100km efficiency
        annualKwh := (params.AnnualMileageKm / 100) * params.EVEfficiency
        annualCost := annualKwh * params.ElectricityRate
        return FuelCostResult{
            AnnualConsumption: annualKwh,
            Unit:              "kWh",
            AnnualCost:        annualCost,
        }
    }

    // km/L efficiency
    annualLiters := params.AnnualMileageKm / params.FuelEfficiency
    annualCost := annualLiters * params.FuelPricePerLiter
    return FuelCostResult{
        AnnualConsumption: annualLiters,
        Unit:              "liters",
        AnnualCost:        annualCost,
    }
}
```

4. **Maintenance Cost Estimator**:
```go
// Maintenance levels:
// Light: ~$800/year (basic servicing only)
// Moderate: ~$1,200/year (regular servicing + minor repairs)
// Heavy: ~$2,000/year (frequent servicing + wear items)

// Age adjustment: +10% per year after year 5

func EstimateAnnualMaintenance(params MaintenanceParams) MaintenanceEstimate {
    baseCost := getBaseCost(params.MaintenanceLevel)
    ageAdjustment := calculateAgeAdjustment(params.VehicleAge)

    return MaintenanceEstimate{
        BaseCost:       baseCost,
        AgeAdjustment:  ageAdjustment,
        AnnualEstimate: baseCost * (1 + ageAdjustment),
    }
}
```

5. **ERP/Parking Aggregator**:
```go
// Simple aggregation of user-provided monthly costs
func CalculateAnnualErpParking(erpMonthly, parkingMonthly float64) float64 {
    return (erpMonthly + parkingMonthly) * 12
}
```

**File Structure:**
- `backend/internal/car/recurring/roadtax.go`
- `backend/internal/car/recurring/insurance.go`
- `backend/internal/car/recurring/fuel.go`
- `backend/internal/car/recurring/maintenance.go`

**Acceptance Criteria:**
- [ ] Road tax matches LTA engine capacity rates exactly
- [ ] Age surcharges applied correctly (10%, 20%, 30%, 50%)
- [ ] Electric vehicles have $0 road tax
- [ ] Insurance estimation produces reasonable estimates (±20% of market)
- [ ] Fuel cost calculation correct for both ICE and EV
- [ ] Maintenance estimates scale appropriately with age
- [ ] Total annual recurring cost sums all components

**Tests (write first):**
```go
func TestRoadTaxCalculation(t *testing.T) {
    tests := []struct {
        name       string
        cc         int
        age        int
        expected   float64
    }{
        {"1600cc new car", 1600, 0, 1200},   // ($300 + $450) × 2
        {"1600cc year 11", 1600, 11, 1320},  // × 1.10
        {"2000cc new car", 2000, 0, 2100},   // ($750 + $600) × 2
        {"Electric", 0, 0, 0},               // EV exempt
    }
    // ...
}
```

---

### B18: Depreciation & PARF Engine
**Status:** todo
**Priority:** P0
**Complexity:** 4 points
**Blocks:** B19, B20
**Dependencies:** B13, B14

**Objective:** Implement vehicle depreciation calculation and PARF (Preferential Additional Registration Fee) rebate tracking.

**Background:**
Singapore vehicles depreciate uniquely due to the COE system. The PARF rebate (equal to ARF paid) declines linearly to $0 at year 10. This engine must track both market depreciation and PARF value.

**Requirements:**

1. **Depreciation Curve**:
```go
// Singapore typical depreciation pattern (for new cars):
// Year 1: 15% of purchase price
// Year 2-3: 10% per year
// Year 4-5: 8% per year
// Year 6-10: 5% per year
// After year 10: 3% per year (if renewed)

// Note: Actual depreciation = (Purchase Price - Scrap Value) / COE Years
// For more accurate linear depreciation

func CalculateDepreciationSchedule(params DepreciationParams) []DepreciationYear {
    schedule := make([]DepreciationYear, params.Years+1)
    bookValue := params.PurchasePrice

    for year := 0; year <= params.Years; year++ {
        depreciationRate := getDepreciationRate(year)
        depreciation := bookValue * depreciationRate
        bookValue -= depreciation

        schedule[year] = DepreciationYear{
            Year:                 year,
            BookValue:            bookValue,
            DepreciationAmount:   depreciation,
            CumulativeDepreciation: params.PurchasePrice - bookValue,
        }
    }
    return schedule
}
```

2. **PARF Rebate Tracker**:
```go
// PARF = ARF paid at registration
// PARF declines linearly to $0 at year 10
// PARF at year N = ARF × (10 - N) / 10

// For used cars: PARF = Original ARF × (remaining COE months / 120)

func CalculatePARFSchedule(params PARFParams) []PARFYear {
    schedule := make([]PARFYear, 11) // Years 0-10
    initialPARF := params.ARF

    for year := 0; year <= 10; year++ {
        parfValue := initialPARF * float64(10-year) / 10
        schedule[year] = PARFYear{
            Year:      year,
            PARFValue: parfValue,
        }
    }
    return schedule
}
```

3. **Book Value Calculator**:
```go
// Total vehicle value = Book Value + PARF Rebate (if deregistered)
func CalculateVehicleValue(year int, depreciationSchedule []DepreciationYear, parfSchedule []PARFYear) VehicleValue {
    bookValue := depreciationSchedule[year].BookValue
    parfValue := 0.0
    if year < len(parfSchedule) {
        parfValue = parfSchedule[year].PARFValue
    }

    return VehicleValue{
        Year:       year,
        BookValue:  bookValue,
        PARFValue:  parfValue,
        TotalValue: bookValue + parfValue, // If deregistered
    }
}
```

4. **Used Car Depreciation**:
```go
// For used cars:
// - Start from purchase price (already depreciated)
// - Calculate remaining COE months
// - Depreciate to scrap value over remaining COE

func CalculateUsedCarDepreciation(params UsedCarParams) []DepreciationYear {
    remainingMonths := 120 - (params.VehicleAgeMonths)
    remainingYears := remainingMonths / 12

    // Linear depreciation to scrap value
    annualDepreciation := (params.PurchasePrice - params.ScrapValue) / float64(remainingYears)

    // ... generate schedule
}
```

**File Structure:**
- `backend/internal/car/depreciation/calculator.go`
- `backend/internal/car/depreciation/parf.go`
- `backend/internal/car/depreciation/used_car.go`

**Type Definitions:**
```go
type DepreciationYear struct {
    Year                   int     `json:"year"`
    BookValue              float64 `json:"bookValue"`
    DepreciationAmount     float64 `json:"depreciationAmount"`
    CumulativeDepreciation float64 `json:"cumulativeDepreciation"`
    DepreciationRate       float64 `json:"depreciationRate"`
}

type PARFYear struct {
    Year      int     `json:"year"`
    PARFValue float64 `json:"parfValue"`
}

type DepreciationSchedule struct {
    VehicleID     string            `json:"vehicleId"`
    PurchasePrice float64           `json:"purchasePrice"`
    InitialPARF   float64           `json:"initialParf"`
    Schedule      []DepreciationYear `json:"schedule"`
    PARFSchedule  []PARFYear        `json:"parfSchedule"`
}
```

**Acceptance Criteria:**
- [ ] Depreciation follows Singapore market patterns
- [ ] PARF declines linearly to $0 at year 10
- [ ] Used car depreciation starts from purchase price
- [ ] Book value never goes below scrap value
- [ ] Total value (book + PARF) calculated correctly
- [ ] Year 10 PARF is exactly $0

**Tests (write first):**
```go
func TestPARFDecline(t *testing.T) {
    arf := 50000.0

    tests := []struct {
        year     int
        expected float64
    }{
        {0, 50000},  // Full PARF
        {5, 25000},  // Half PARF
        {9, 5000},   // 10% PARF
        {10, 0},     // No PARF
    }
    // ...
}
```

---

### B19: Resale & COE Renewal Engine
**Status:** todo
**Priority:** P1
**Complexity:** 4 points
**Blocks:** B20
**Dependencies:** B18

**Objective:** Implement resale value estimation and COE renewal decision analysis.

**Background:**
At COE expiry (year 10), owners must decide between deregistration (scrap + PARF rebate), 5-year COE renewal, or 10-year renewal. This engine must analyze all options and provide recommendations.

**Requirements:**

1. **Resale Value Estimator**:
```go
// Market value based on:
// - Book value (from depreciation schedule)
// - Market demand factors
// - Vehicle condition adjustment

func EstimateResaleValue(params ResaleParams) ResaleEstimate {
    bookValue := params.DepreciationSchedule[params.Year].BookValue

    // Apply market adjustments
    marketAdjustment := getMarketAdjustment(params.VehicleType, params.Year)
    conditionAdjustment := getConditionAdjustment(params.Condition)

    estimatedValue := bookValue * marketAdjustment * conditionAdjustment

    return ResaleEstimate{
        BookValue:      bookValue,
        MarketValue:    estimatedValue,
        ConfidenceRange: getConfidenceRange(estimatedValue),
    }
}
```

2. **Scrap Value Calculator**:
```go
// Scrap value is typically $5,000-$10,000 depending on vehicle size
const (
    ScrapValueSmall  = 5000
    ScrapValueMedium = 7000
    ScrapValueLarge  = 10000
)

func CalculateScrapValue(vehicleType string) float64 {
    switch vehicleType {
    case "sedan", "hatchback":
        return ScrapValueMedium
    case "suv", "mpv":
        return ScrapValueLarge
    default:
        return ScrapValueSmall
    }
}
```

3. **COE Renewal Analyzer**:
```go
// COE Renewal Options at Year 10:
// 1. Deregister: Get scrap value + PARF ($0 at year 10)
// 2. Renew 5 years: Pay PQP (Prevailing Quota Premium), continue using
// 3. Renew 10 years: Pay PQP, longer continued use

// PQP = Average of last 3 months' COE prices

func AnalyzeCOERenewalOptions(params COERenewalParams) COERenewalAnalysis {
    deregisterOption := calculateDeregisterOption(params)
    renew5Option := calculateRenew5Option(params)
    renew10Option := calculateRenew10Option(params)

    recommendation := determineRecommendation(
        deregisterOption, renew5Option, renew10Option, params.VehicleCondition)

    return COERenewalAnalysis{
        COEExpiryDate: params.COEExpiryDate,
        Options: COERenewalOptions{
            Deregister: deregisterOption,
            Renew5yr:   renew5Option,
            Renew10yr:  renew10Option,
        },
        Recommendation: recommendation,
        Reasoning:      generateReasoning(recommendation, params),
    }
}
```

4. **Post-Renewal Depreciation**:
```go
// After COE renewal:
// - PARF = $0 (forfeited)
// - Vehicle depreciates to $0 over renewal period
// - Scrap value remains

func CalculatePostRenewalDepreciation(params PostRenewalParams) []DepreciationYear {
    // Linear depreciation from current value to $0 over renewal period
    annualDepreciation := params.CurrentValue / float64(params.RenewalYears)
    // ...
}
```

**File Structure:**
- `backend/internal/car/resale/estimator.go`
- `backend/internal/car/resale/coe_renewal.go`
- `backend/internal/car/resale/disposal.go`

**Type Definitions:**
```go
type COERenewalAnalysis struct {
    VehicleID       string            `json:"vehicleId"`
    COEExpiryDate   time.Time         `json:"coeExpiryDate"`
    Options         COERenewalOptions `json:"options"`
    Recommendation  string            `json:"recommendation"` // deregister, renew5yr, renew10yr
    Reasoning       string            `json:"reasoning"`
}

type COERenewalOptions struct {
    Deregister DeregisterOption `json:"deregister"`
    Renew5yr   RenewalOption    `json:"renew5yr"`
    Renew10yr  RenewalOption    `json:"renew10yr"`
}

type DeregisterOption struct {
    ScrapValue    float64 `json:"scrapValue"`
    PARFRebate    float64 `json:"parfRebate"`
    NetReturn     float64 `json:"netReturn"`
}

type RenewalOption struct {
    PQPCost           float64 `json:"pqpCost"`
    ProjectedCosts    RenewalProjectedCosts `json:"projectedCosts"`
    TotalCost         float64 `json:"totalCost"`
    CostPerYear       float64 `json:"costPerYear"`
}
```

**Acceptance Criteria:**
- [ ] Resale value estimation within reasonable range of market
- [ ] Scrap value appropriate for vehicle type
- [ ] COE renewal analysis compares all three options
- [ ] Projected costs include all recurring costs over renewal period
- [ ] Recommendation logic is sound and explainable
- [ ] Post-renewal depreciation calculated correctly (to $0)

**Tests (write first):**
- COE renewal comparison with known inputs
- Deregister option calculation
- Recommendation logic for various scenarios
- Post-renewal depreciation to $0

---

### B20: Vehicle API Handlers
**Status:** todo
**Priority:** P0
**Complexity:** 4 points
**Blocks:** F14, F15, F16
**Dependencies:** B14, B15, B16, B17, B18, B19

**Objective:** Implement REST API handlers for vehicle CRUD and derived calculations.

**Background:**
Following Assetra's existing handler patterns (see `handlers/expenses.go`), create HTTP handlers for vehicle operations with proper validation, user authorization, and error handling.

**Requirements:**

1. **Vehicle CRUD Endpoints:**
```go
// POST /api/v1/vehicles - Create vehicle
// GET /api/v1/vehicles - List vehicles (paginated)
// GET /api/v1/vehicles/{id} - Get vehicle with cost breakdown
// PUT /api/v1/vehicles/{id} - Update vehicle
// DELETE /api/v1/vehicles/{id} - Delete vehicle
```

2. **Derived Calculation Endpoints:**
```go
// GET /api/v1/vehicles/{id}/depreciation - Get depreciation schedule
// GET /api/v1/vehicles/{id}/loan/amortisation - Get loan amortisation
// GET /api/v1/vehicles/{id}/coe-renewal - Get COE renewal analysis
```

3. **Rules Endpoint:**
```go
// GET /api/v1/sg-car-rules?type={type}&date={date} - Get versioned rules
```

4. **Handler Implementation:**
```go
type VehicleHandler struct {
    repo          *repository.VehicleRepository
    rulesRepo     *repository.CarRulesRepository
    purchaseCalc  *purchase.Calculator
    loanCalc      *loan.Calculator
    recurringCalc *recurring.Calculator
    depCalc       *depreciation.Calculator
    resaleCalc    *resale.Calculator
}

func (h *VehicleHandler) RegisterRoutes(router *http.ServeMux) {
    router.HandleFunc("GET /api/v1/vehicles", h.handleList)
    router.HandleFunc("POST /api/v1/vehicles", h.handleCreate)
    router.HandleFunc("GET /api/v1/vehicles/{id}", h.handleGet)
    router.HandleFunc("PUT /api/v1/vehicles/{id}", h.handleUpdate)
    router.HandleFunc("DELETE /api/v1/vehicles/{id}", h.handleDelete)
    router.HandleFunc("GET /api/v1/vehicles/{id}/depreciation", h.handleDepreciation)
    router.HandleFunc("GET /api/v1/vehicles/{id}/loan/amortisation", h.handleAmortisation)
    router.HandleFunc("GET /api/v1/vehicles/{id}/coe-renewal", h.handleCOERenewal)
    router.HandleFunc("GET /api/v1/sg-car-rules", h.handleRules)
}
```

5. **Request/Response Validation:**
```go
type CreateVehicleRequest struct {
    Name               string  `json:"name" validate:"required,min=1,max=100"`
    IsUsedVehicle      bool    `json:"isUsedVehicle"`
    IsElectric         bool    `json:"isElectric"`
    OMV                float64 `json:"omv" validate:"required,gt=0"`
    COEAmount          float64 `json:"coeAmount" validate:"gte=0"`
    COECategory        string  `json:"coeCategory" validate:"required,oneof=A B C D E"`
    EngineCapacityCc   *int    `json:"engineCapacityCc" validate:"omitempty,gt=0"`
    FuelType           string  `json:"fuelType" validate:"required,oneof=petrol diesel hybrid electric"`
    // ... all other fields with validation
}
```

6. **On Create/Update Flow:**
```go
func (h *VehicleHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
    // 1. Parse and validate request
    // 2. Create vehicle in database
    // 3. Calculate cost breakdown
    // 4. Store cost breakdown
    // 5. Return vehicle with breakdown
}
```

**File Structure:**
- `backend/cmd/server/handlers/vehicles.go`
- `backend/cmd/server/handlers/vehicles_test.go`

**Registration in main.go:**
```go
vehicleHandler := handlers.NewVehicleHandler(vehicleRepo, rulesRepo, calculators)
vehicleHandler.RegisterRoutes(v1Router)
```

**Acceptance Criteria:**
- [ ] All CRUD endpoints implemented with proper HTTP status codes
- [ ] Request validation catches invalid inputs
- [ ] User authorization enforced (only access own vehicles)
- [ ] Cost breakdown computed and cached on create/update
- [ ] Depreciation schedule returns full 10+ year projection
- [ ] Amortisation returns full loan schedule
- [ ] COE renewal analysis returns all options with recommendation
- [ ] Proper error responses with consistent format
- [ ] Integration tests for all endpoints

**Tests (write first):**
- CRUD operation success paths
- Validation error responses (400)
- Not found responses (404)
- User authorization (403 for other user's vehicles)
- Cost breakdown computation on create
- Depreciation schedule response format
- COE renewal analysis response

---

### B21: Timeline Integration
**Status:** todo
**Priority:** P1
**Complexity:** 3 points
**Blocks:** F17
**Dependencies:** B20

**Objective:** Integrate vehicle data into the existing financial timeline projection system.

**Background:**
Vehicles should appear as depreciating assets in the timeline, car loans as liabilities, and recurring costs as expenses. This integration connects the car module to Assetra's core timeline service.

**Requirements:**

1. **Vehicle as Asset:**
```go
// Inject vehicle book value as depreciating asset
// Use negative growth rate based on depreciation curve

func (s *TimelineService) injectVehicleAssets(ctx context.Context, userID string, timeline *Timeline) error {
    vehicles, err := s.vehicleRepo.ListVehicles(ctx, userID, PaginationParams{Limit: -1})
    if err != nil {
        return err
    }

    for _, vehicle := range vehicles.Data {
        depSchedule := s.depCalc.CalculateDepreciationSchedule(vehicle)

        for yearIdx, year := range timeline.Years {
            if yearIdx < len(depSchedule) {
                timeline.Years[yearIdx].Assets = append(
                    timeline.Years[yearIdx].Assets,
                    TimelineItem{
                        ItemID:       vehicle.ID,
                        Name:         vehicle.Name,
                        Category:     "vehicle",
                        AmountAnnual: depSchedule[yearIdx].BookValue,
                        ItemType:     ItemTypeAsset,
                    },
                )
            }
        }
    }
    return nil
}
```

2. **Car Loan as Liability:**
```go
// Inject outstanding loan balance as liability
// Balance decreases per amortisation schedule

func (s *TimelineService) injectVehicleLiabilities(ctx context.Context, userID string, timeline *Timeline) error {
    // For each vehicle with loan, inject remaining balance per year
    // Balance reaches 0 after loan tenure
}
```

3. **Recurring Costs as Expenses:**
```go
// Inject road tax, insurance, fuel, maintenance, ERP/parking as expenses
// Apply age-based adjustments for road tax surcharges

func (s *TimelineService) injectVehicleExpenses(ctx context.Context, userID string, timeline *Timeline) error {
    // For each vehicle:
    // - Road tax (annual, increasing with age surcharges)
    // - Insurance (annual)
    // - Fuel (monthly → annualized)
    // - Maintenance (annual, increasing with age)
    // - ERP/Parking (monthly → annualized)
    // - Loan payment (monthly → annualized, if financed)
}
```

4. **Net Worth Integration:**
```go
// Net Worth contribution = Vehicle Book Value - Outstanding Loan
```

**File Structure:**
- `backend/internal/car/timeline_integration.go`
- Extend `backend/internal/financial/timeline/service.go`

**Acceptance Criteria:**
- [ ] Vehicles appear as assets in timeline with correct book values
- [ ] Car loans appear as liabilities with decreasing balance
- [ ] All recurring costs appear as expenses
- [ ] Age-based adjustments (road tax surcharges) applied correctly
- [ ] Net worth reflects vehicle equity
- [ ] Multiple vehicles aggregate correctly
- [ ] Integration doesn't break existing timeline functionality

**Tests (write first):**
- Single vehicle timeline integration
- Multiple vehicle aggregation
- Loan payoff reflected in timeline
- Depreciation over 10 years
- Net worth calculation with vehicle

---

### B22: Scenario Integration for COE Events
**Status:** todo
**Priority:** P2
**Complexity:** 2 points
**Blocks:** None
**Dependencies:** B19, B21

**Objective:** Create scenario events for COE renewal/disposal decisions to enable what-if analysis.

**Background:**
COE expiry is a significant financial event. Users should be able to model different decisions (renew vs scrap) as scenario events that impact their financial projections.

**Requirements:**

1. **Auto-generate COE Expiry Event:**
```go
// When vehicle is created, generate a scenario event for COE expiry
// Event occurs at year 10 (or remaining COE for used cars)

func CreateCOEExpiryEvent(vehicle Vehicle) ScenarioEvent {
    expiryDate := vehicle.PurchaseDate.AddDate(10, 0, 0)
    if vehicle.IsUsedVehicle && vehicle.OriginalRegistrationDate != nil {
        expiryDate = vehicle.OriginalRegistrationDate.AddDate(10, 0, 0)
    }

    return ScenarioEvent{
        Name:        fmt.Sprintf("COE Expiry: %s", vehicle.Name),
        Description: "Vehicle COE expires - decide to renew, sell, or scrap",
        OccursOn:    expiryDate,
        DisplayIcon: "car",
        Tags:        []string{"vehicle", "coe"},
        IsIncluded:  true,
        Impacts:     generateCOEExpiryImpacts(vehicle),
    }
}
```

2. **COE Decision Impacts:**
```go
// Different impacts based on user's chosen path:
// - Deregister: One-time income (scrap + PARF), remove vehicle asset
// - Renew 5yr: One-time expense (PQP), continue costs for 5 years
// - Renew 10yr: One-time expense (PQP), continue costs for 10 years
```

**Acceptance Criteria:**
- [ ] COE expiry event auto-generated on vehicle creation
- [ ] Event impacts reflect chosen renewal preference
- [ ] Scenario can be toggled (included/excluded)
- [ ] Timeline updates when scenario is toggled

---

## Frontend Implementation Tickets

### F14: Vehicle Types & API Client
**Status:** todo
**Priority:** P0
**Complexity:** 2 points
**Blocks:** F15, F16, F17, F18, F19
**Dependencies:** B20

**Objective:** Create TypeScript types and API client methods for vehicle operations.

**Requirements:**

1. **TypeScript Types:**
```typescript
// types/vehicle.ts
export interface Vehicle {
  id: string;
  userId: string;
  parentId: string;
  name: string;
  isUsedVehicle: boolean;
  isElectric: boolean;
  omv: number;
  coeAmount: number;
  coeCategory: 'A' | 'B' | 'C' | 'D' | 'E';
  engineCapacityCc?: number;
  fuelType: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  vehicleType?: 'sedan' | 'suv' | 'hatchback' | 'mpv' | 'sports' | 'luxury';
  purchaseDate: string;
  purchasePrice: number;

  // Used car
  originalRegistrationDate?: string;
  coeStartDate?: string;
  vehicleAgeAtPurchase?: number;

  // EV
  batteryCapacityKwh?: number;
  evEfficiency?: number;
  electricityRate?: number;
  evArfRebateApplied?: number;

  // Financing
  loanAmount?: number;
  loanInterestRate?: number;
  loanTenureMonths?: number;

  // Usage
  annualMileageKm: number;
  fuelEfficiency?: number;
  fuelPricePerUnit?: number;

  // Ownership
  plannedOwnershipYears: number;
  coeRenewalPreference: '5yr' | '10yr' | 'scrap';

  // Costs
  maintenanceLevel: 'light' | 'moderate' | 'heavy';
  erpMonthly: number;
  parkingMonthly: number;

  // Insurance
  driverAge?: number;
  drivingExperienceYears?: number;
  ncdPercentage: number;
  claimsHistory3yr: number;
  coverageType: 'third_party' | 'tpft' | 'comprehensive';
  excessAmount: number;

  // Meta
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Computed (returned from API)
  costBreakdown?: VehicleCostBreakdown;
}

export interface VehicleCostBreakdown {
  exciseDuty: number;
  gst: number;
  arf: number;
  registrationFee: number;
  dealerFee: number;
  totalPurchaseCost: number;
  downpayment?: number;
  loanPrincipal?: number;
  totalInterest?: number;
  monthlyPayment?: number;
  annualRoadTax: number;
  annualInsuranceEstimate: number;
  annualFuelEstimate: number;
  annualMaintenanceEstimate: number;
  annualErpParking: number;
  totalAnnualRecurring: number;
  initialParf: number;
  computedAt: string;
}

export interface DepreciationSchedule {
  vehicleId: string;
  purchasePrice: number;
  schedule: DepreciationYear[];
  parfSchedule: PARFYear[];
}

export interface DepreciationYear {
  year: number;
  bookValue: number;
  depreciationAmount: number;
  cumulativeDepreciation: number;
}

export interface PARFYear {
  year: number;
  parfValue: number;
}

export interface AmortisationSchedule {
  principal: number;
  interestRate: number;
  tenureMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: AmortisationRow[];
}

export interface AmortisationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface COERenewalAnalysis {
  vehicleId: string;
  coeExpiryDate: string;
  options: {
    deregister: {
      scrapValue: number;
      parfRebate: number;
      netReturn: number;
    };
    renew5yr: {
      pqpCost: number;
      projectedCosts: {
        roadTax: number;
        insurance: number;
        maintenance: number;
        fuel: number;
      };
      totalCost: number;
    };
    renew10yr: {
      pqpCost: number;
      projectedCosts: {
        roadTax: number;
        insurance: number;
        maintenance: number;
        fuel: number;
      };
      totalCost: number;
    };
  };
  recommendation: 'deregister' | 'renew5yr' | 'renew10yr';
  reasoning: string;
}
```

2. **API Client Methods:**
```typescript
// services/vehicleApi.ts
export const vehicleApi = {
  createVehicle: (data: CreateVehicleRequest) =>
    jsonRequest<Vehicle>('/api/v1/vehicles', { method: 'POST', body: data }),

  listVehicles: (params?: { limit?: number; offset?: number }) =>
    jsonRequest<PaginatedResult<Vehicle>>('/api/v1/vehicles', { params }),

  getVehicle: (id: string) =>
    jsonRequest<Vehicle>(`/api/v1/vehicles/${id}`),

  updateVehicle: (id: string, data: UpdateVehicleRequest) =>
    jsonRequest<Vehicle>(`/api/v1/vehicles/${id}`, { method: 'PUT', body: data }),

  deleteVehicle: (id: string) =>
    jsonRequest<void>(`/api/v1/vehicles/${id}`, { method: 'DELETE' }),

  getDepreciationSchedule: (id: string) =>
    jsonRequest<DepreciationSchedule>(`/api/v1/vehicles/${id}/depreciation`),

  getAmortisationSchedule: (id: string) =>
    jsonRequest<AmortisationSchedule>(`/api/v1/vehicles/${id}/loan/amortisation`),

  getCOERenewalAnalysis: (id: string) =>
    jsonRequest<COERenewalAnalysis>(`/api/v1/vehicles/${id}/coe-renewal`),
};
```

3. **Zod Schemas:**
```typescript
// schemas/vehicle.ts
export const vehicleSchema = z.object({
  name: z.string().min(1).max(100),
  isUsedVehicle: z.boolean().default(false),
  isElectric: z.boolean().default(false),
  omv: z.number().positive(),
  coeAmount: z.number().nonnegative(),
  coeCategory: z.enum(['A', 'B', 'C', 'D', 'E']),
  // ... all fields with validation
});

export type CreateVehicleRequest = z.infer<typeof vehicleSchema>;
```

4. **React Query Hooks:**
```typescript
// hooks/queries/useVehicle.ts
export const VEHICLE_QUERY_KEYS = {
  all: ['vehicles'] as const,
  list: () => [...VEHICLE_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...VEHICLE_QUERY_KEYS.all, id] as const,
  depreciation: (id: string) => [...VEHICLE_QUERY_KEYS.detail(id), 'depreciation'] as const,
  amortisation: (id: string) => [...VEHICLE_QUERY_KEYS.detail(id), 'amortisation'] as const,
  coeRenewal: (id: string) => [...VEHICLE_QUERY_KEYS.detail(id), 'coeRenewal'] as const,
};

export function useVehicles() {
  return useQuery({
    queryKey: VEHICLE_QUERY_KEYS.list(),
    queryFn: () => vehicleApi.listVehicles({ limit: -1 }),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: VEHICLE_QUERY_KEYS.detail(id),
    queryFn: () => vehicleApi.getVehicle(id),
    enabled: !!id,
  });
}

export function useCreateVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth });
    },
  });
}
// ... other mutation hooks
```

**File Structure:**
- `frontend/src/types/vehicle.ts`
- `frontend/src/services/vehicleApi.ts`
- `frontend/src/schemas/vehicle.ts`
- `frontend/src/hooks/queries/useVehicle.ts`

**Acceptance Criteria:**
- [ ] TypeScript types match backend API contract exactly
- [ ] API client methods with proper error handling
- [ ] Zod schemas for request validation
- [ ] React Query hooks with proper cache invalidation
- [ ] Query key namespace follows existing patterns

---

### F15: Vehicle Modal - Basic Info & Purchase
**Status:** todo
**Priority:** P0
**Complexity:** 5 points
**Blocks:** F18
**Dependencies:** F14

**Objective:** Create vehicle input modal with sections for basic info, vehicle specs, and purchase cost display.

**Requirements:**

1. **Modal Structure:**
```tsx
<VehicleModal isOpen={isOpen} onClose={onClose} vehicleId={vehicleId}>
  <ModalHeader>Add New Vehicle / Edit Vehicle</ModalHeader>
  <ModalTabs>
    <Tab name="Basic Info" />
    <Tab name="Financing" />
    <Tab name="Usage & Costs" />
    <Tab name="Insurance" />
  </ModalTabs>
  <ModalContent>
    {/* Tab content */}
  </ModalContent>
  <ModalFooter>
    <CancelButton />
    <SaveButton />
  </ModalFooter>
</VehicleModal>
```

2. **Basic Info Tab:**
- Vehicle name (text input)
- New/Used toggle
- Electric/ICE toggle (with conditional fields)
- OMV input (currency)
- COE Category selector (A/B/C/D/E)
- COE Amount input (currency)
- Engine capacity (number, hidden for EV)
- Fuel type selector (petrol/diesel/hybrid/electric)
- Vehicle type selector (sedan/SUV/hatchback/etc)
- Purchase date picker
- Purchase price (currency, auto-calculated for new cars)

3. **Used Car Fields (conditional):**
- Original registration date
- Vehicle age at purchase

4. **EV Fields (conditional):**
- Battery capacity (kWh)
- Efficiency (kWh/100km)
- Electricity rate ($/kWh)
- EV ARF rebate amount

5. **Purchase Cost Display:**
```tsx
<PurchaseCostBreakdown>
  <Row label="OMV" value={omv} />
  <Row label="Excise Duty (20%)" value={exciseDuty} />
  <Row label="GST (9%)" value={gst} />
  <Row label="ARF" value={arf} tiers={arfTiers} />
  <Row label="COE" value={coe} />
  <Row label="Registration Fee" value={220} />
  <Row label="Dealer Fee" value={dealerFee} />
  <Divider />
  <Row label="Total Purchase Cost" value={total} bold />
</PurchaseCostBreakdown>
```

**Component Structure:**
```tsx
interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId?: string; // undefined = create mode
}

export function VehicleModal({ isOpen, onClose, vehicleId }: VehicleModalProps) {
  const { data: vehicle, isLoading } = useVehicle(vehicleId ?? '');
  const createMutation = useCreateVehicleMutation();
  const updateMutation = useUpdateVehicleMutation();

  const form = useForm<CreateVehicleRequest>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicleId ? vehicle : defaultValues,
  });

  // ...
}
```

**Acceptance Criteria:**
- [ ] Modal opens for create and edit modes
- [ ] All basic info fields with proper validation
- [ ] Conditional fields for used cars and EVs
- [ ] Real-time purchase cost calculation as inputs change
- [ ] ARF breakdown shows tiered calculation
- [ ] Form state persists between tabs
- [ ] Save creates/updates vehicle
- [ ] Proper loading and error states
- [ ] Accessible keyboard navigation

---

### F16: Vehicle Modal - Financing & Usage
**Status:** todo
**Priority:** P0
**Complexity:** 4 points
**Blocks:** F18
**Dependencies:** F15

**Objective:** Add financing and usage/costs tabs to the vehicle modal.

**Requirements:**

1. **Financing Tab:**
- Loan amount input with LTV cap indicator
- Interest rate input (APR %)
- Loan tenure selector (12-84 months slider or dropdown)
- Auto-calculated fields:
  - Minimum downpayment (based on LTV)
  - Monthly payment
  - Total interest
  - Total repayment

```tsx
<FinancingSection>
  <LoanAmountInput
    value={loanAmount}
    onChange={setLoanAmount}
    maxLoan={maxLoanFromLTV}
    ltvCap={omv <= 20000 ? 0.70 : 0.60}
  />
  <InterestRateInput value={interestRate} onChange={setInterestRate} />
  <TenureSlider value={tenure} onChange={setTenure} min={12} max={84} />

  <CalculatedValues>
    <Value label="Minimum Downpayment" value={minDownpayment} />
    <Value label="Your Downpayment" value={purchasePrice - loanAmount} />
    <Value label="Monthly Payment" value={monthlyPayment} />
    <Value label="Total Interest" value={totalInterest} />
    <Value label="Total Repayment" value={totalRepayment} />
  </CalculatedValues>
</FinancingSection>
```

2. **Usage & Costs Tab:**
- Annual mileage input (km)
- Fuel efficiency (km/L or kWh/100km for EV)
- Fuel price ($/L or $/kWh)
- Maintenance level selector (light/moderate/heavy)
- ERP monthly input
- Parking monthly input
- Planned ownership years
- COE renewal preference (5yr/10yr/scrap)

```tsx
<UsageCostsSection>
  <Heading>Driving Habits</Heading>
  <AnnualMileageInput value={mileage} onChange={setMileage} />
  <FuelEfficiencyInput
    value={efficiency}
    onChange={setEfficiency}
    isElectric={isElectric}
  />
  <FuelPriceInput
    value={fuelPrice}
    onChange={setFuelPrice}
    isElectric={isElectric}
  />

  <Heading>Ownership Costs</Heading>
  <MaintenanceLevelSelector value={level} onChange={setLevel} />
  <ERPInput value={erp} onChange={setErp} />
  <ParkingInput value={parking} onChange={setParking} />

  <Heading>Ownership Plan</Heading>
  <OwnershipYearsSlider value={years} onChange={setYears} />
  <COERenewalPreference value={pref} onChange={setPref} />

  <RecurringCostsSummary>
    <Row label="Annual Road Tax" value={roadTax} />
    <Row label="Annual Insurance (est.)" value={insurance} />
    <Row label="Annual Fuel" value={fuelCost} />
    <Row label="Annual Maintenance" value={maintenance} />
    <Row label="Annual ERP/Parking" value={erpParking} />
    <Divider />
    <Row label="Total Annual Cost" value={totalAnnual} bold />
    <Row label="Monthly Average" value={totalAnnual / 12} />
  </RecurringCostsSummary>
</UsageCostsSection>
```

**Acceptance Criteria:**
- [ ] LTV cap enforced with clear indicator
- [ ] Monthly payment updates in real-time
- [ ] Tenure capped at 84 months
- [ ] Usage fields appropriate for ICE vs EV
- [ ] Recurring costs calculate in real-time
- [ ] All inputs validated with helpful error messages

---

### F17: Vehicle Modal - Insurance Estimator
**Status:** todo
**Priority:** P1
**Complexity:** 4 points
**Blocks:** F18
**Dependencies:** F15

**Objective:** Add detailed insurance estimation tab with multi-factor calculation display.

**Requirements:**

1. **Insurance Profile Inputs:**
```tsx
<InsuranceSection>
  <Heading>Driver Profile</Heading>
  <DriverAgeInput value={driverAge} onChange={setDriverAge} />
  <DrivingExperienceInput value={experience} onChange={setExperience} />
  <NCDSelector value={ncd} onChange={setNcd} /> {/* 0%, 10%, 20%, 30%, 40%, 50% */}
  <ClaimsHistoryInput value={claims} onChange={setClaims} />

  <Heading>Coverage Options</Heading>
  <CoverageTypeSelector
    value={coverage}
    onChange={setCoverage}
    options={['third_party', 'tpft', 'comprehensive']}
  />
  <ExcessSelector
    value={excess}
    onChange={setExcess}
    options={[500, 1000, 1500, 2000, 3000]}
  />
</InsuranceSection>
```

2. **Insurance Estimate Display:**
```tsx
<InsuranceEstimateBreakdown>
  <BaseCalculation>
    <Row label="Vehicle Value" value={vehicleValue} />
    <Row label="Base Rate (sedan)" value="2.5%" />
    <Row label="Base Premium" value={basePremium} />
  </BaseCalculation>

  <Adjustments>
    <Row label="Age Factor" value={ageFactor} multiplier />
    <Row label="Experience Factor" value={expFactor} multiplier />
    <Row label="NCD Discount" value={ncdFactor} discount />
    <Row label="Claims Loading" value={claimsFactor} multiplier />
    <Row label="Coverage Factor" value={coverageFactor} multiplier />
    <Row label="Excess Discount" value={excessFactor} discount />
  </Adjustments>

  <Divider />
  <FinalEstimate>
    <Row label="Estimated Annual Premium" value={finalPremium} bold />
    <Disclaimer>
      This is an estimate only. Actual premiums may vary based on insurer
      assessment and market conditions.
    </Disclaimer>
  </FinalEstimate>

  <CoverageComparison>
    <ComparisonCard type="Third Party" premium={tpPremium} />
    <ComparisonCard type="TPFT" premium={tpftPremium} />
    <ComparisonCard type="Comprehensive" premium={compPremium} selected={coverage === 'comprehensive'} />
  </CoverageComparison>
</InsuranceEstimateBreakdown>
```

**Acceptance Criteria:**
- [ ] All driver profile factors collected
- [ ] Insurance estimate updates in real-time
- [ ] Clear breakdown of all adjustment factors
- [ ] Coverage type comparison displayed
- [ ] Disclaimer about estimate nature
- [ ] NCD buildup projection shown (optional)

---

### F18: Vehicle List & Summary Card
**Status:** todo
**Priority:** P0
**Complexity:** 3 points
**Blocks:** F19
**Dependencies:** F14, F15, F16

**Objective:** Create vehicle list view and dashboard summary card for multi-vehicle management.

**Requirements:**

1. **Dashboard Summary Card:**
```tsx
<VehicleSummaryCard>
  <CardHeader>
    <Icon name="car" />
    <Title>Vehicles</Title>
    <AddButton onClick={openVehicleModal}>+ Add</AddButton>
  </CardHeader>
  <CardBody>
    {vehicles.length === 0 ? (
      <EmptyState>
        <Text>No vehicles added</Text>
        <Button onClick={openVehicleModal}>Add Your First Vehicle</Button>
      </EmptyState>
    ) : (
      <>
        <SummaryRow label="Total Fleet Value" value={totalValue} />
        <SummaryRow label="Monthly Costs" value={totalMonthlyCost} />
        <SummaryRow label="Annual Costs" value={totalAnnualCost} />
        <VehicleCount>{vehicles.length} vehicle(s)</VehicleCount>
        <ViewAllLink onClick={openVehicleList}>View All →</ViewAllLink>
      </>
    )}
  </CardBody>
</VehicleSummaryCard>
```

2. **Vehicle List View:**
```tsx
<VehicleListModal isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <Title>My Vehicles</Title>
    <AddButton onClick={openCreateModal}>+ Add Vehicle</AddButton>
  </ModalHeader>

  <VehicleList>
    {vehicles.map(vehicle => (
      <VehicleListItem key={vehicle.id} vehicle={vehicle}>
        <VehicleIcon type={vehicle.fuelType} />
        <VehicleDetails>
          <Name>{vehicle.name}</Name>
          <Subtitle>{vehicle.vehicleType} • {vehicle.fuelType}</Subtitle>
          <COEExpiry>COE expires {formatDate(coeExpiryDate)}</COEExpiry>
        </VehicleDetails>
        <VehicleValues>
          <Value label="Value" value={vehicle.costBreakdown.bookValue} />
          <Value label="Monthly" value={monthlyTotalCost} />
        </VehicleValues>
        <ActionMenu>
          <MenuItem onClick={() => openEditModal(vehicle.id)}>Edit</MenuItem>
          <MenuItem onClick={() => openDepreciationView(vehicle.id)}>Depreciation</MenuItem>
          <MenuItem onClick={() => openCOERenewal(vehicle.id)}>COE Options</MenuItem>
          <MenuItem onClick={() => confirmDelete(vehicle.id)} destructive>Delete</MenuItem>
        </ActionMenu>
      </VehicleListItem>
    ))}
  </VehicleList>

  <ListFooter>
    <TotalRow label="Total Fleet Value" value={totalFleetValue} />
    <TotalRow label="Total Monthly Costs" value={totalMonthlyCost} />
  </ListFooter>
</VehicleListModal>
```

**Acceptance Criteria:**
- [ ] Summary card shows aggregate metrics
- [ ] Empty state with call to action
- [ ] Vehicle list shows all user vehicles
- [ ] Each item shows key metrics
- [ ] Action menu with edit/delete/details
- [ ] Delete confirmation dialog
- [ ] Loading and error states handled

---

### F19: Depreciation & TCO Charts
**Status:** todo
**Priority:** P1
**Complexity:** 4 points
**Blocks:** None
**Dependencies:** F14, F18

**Objective:** Create visualization components for depreciation schedule and total cost of ownership analysis.

**Requirements:**

1. **Depreciation Chart:**
```tsx
<DepreciationChart vehicleId={vehicleId}>
  <ChartHeader>
    <Title>Vehicle Value Over Time</Title>
    <Subtitle>{vehicle.name}</Subtitle>
  </ChartHeader>

  <AreaChart data={depreciationData}>
    <Area
      dataKey="bookValue"
      name="Book Value"
      fill="#3b82f6"
      stroke="#2563eb"
    />
    <Area
      dataKey="parfValue"
      name="PARF Rebate"
      fill="#22c55e"
      stroke="#16a34a"
    />
    <XAxis dataKey="year" label="Year" />
    <YAxis label="Value ($)" />
    <Tooltip content={<DepreciationTooltip />} />
    <Legend />

    {/* COE expiry marker at year 10 */}
    <ReferenceLine x={10} label="COE Expiry" stroke="#ef4444" />
  </AreaChart>

  <ChartSummary>
    <SummaryItem label="Purchase Price" value={purchasePrice} />
    <SummaryItem label="Year 5 Value" value={year5Value} />
    <SummaryItem label="Year 10 Value" value={year10Value} />
    <SummaryItem label="Total Depreciation" value={totalDepreciation} />
  </ChartSummary>
</DepreciationChart>
```

2. **TCO Analysis Chart:**
```tsx
<TCOChart vehicleId={vehicleId} years={10}>
  <ChartHeader>
    <Title>Total Cost of Ownership</Title>
    <YearSelector value={years} onChange={setYears} options={[5, 7, 10]} />
  </ChartHeader>

  <StackedBarChart data={tcoData}>
    <Bar dataKey="depreciation" name="Depreciation" fill="#94a3b8" />
    <Bar dataKey="loanInterest" name="Loan Interest" fill="#f97316" />
    <Bar dataKey="roadTax" name="Road Tax" fill="#eab308" />
    <Bar dataKey="insurance" name="Insurance" fill="#22c55e" />
    <Bar dataKey="fuel" name="Fuel" fill="#3b82f6" />
    <Bar dataKey="maintenance" name="Maintenance" fill="#8b5cf6" />
    <Bar dataKey="erpParking" name="ERP/Parking" fill="#ec4899" />
    <XAxis dataKey="year" />
    <YAxis />
    <Tooltip content={<TCOTooltip />} />
    <Legend />
  </StackedBarChart>

  <TCOSummary>
    <SummaryRow label="Total {years}-Year TCO" value={totalTCO} highlight />
    <SummaryRow label="Average Cost/Year" value={totalTCO / years} />
    <SummaryRow label="Average Cost/Month" value={totalTCO / years / 12} />

    <CostBreakdown>
      <BreakdownItem label="Depreciation" value={totalDepreciation} percent={depPercent} />
      <BreakdownItem label="Running Costs" value={totalRunning} percent={runningPercent} />
      <BreakdownItem label="Interest" value={totalInterest} percent={interestPercent} />
    </CostBreakdown>
  </TCOSummary>
</TCOChart>
```

3. **Loan Amortisation Chart:**
```tsx
<AmortisationChart vehicleId={vehicleId}>
  <ChartHeader>
    <Title>Loan Repayment Schedule</Title>
    <Subtitle>Principal vs Interest</Subtitle>
  </ChartHeader>

  <AreaChart data={amortisationData}>
    <Area dataKey="remainingBalance" name="Balance" fill="#3b82f6" />
    <Line dataKey="cumulativeInterest" name="Cumulative Interest" stroke="#ef4444" />
    <XAxis dataKey="month" label="Month" />
    <YAxis />
    <Tooltip content={<AmortisationTooltip />} />
  </AreaChart>

  <LoanSummary>
    <SummaryItem label="Monthly Payment" value={monthlyPayment} />
    <SummaryItem label="Total Interest" value={totalInterest} />
    <SummaryItem label="Payoff Date" value={payoffDate} />
  </LoanSummary>
</AmortisationChart>
```

**Acceptance Criteria:**
- [ ] Depreciation chart shows book value + PARF over time
- [ ] COE expiry marked clearly at year 10
- [ ] TCO breakdown by category (stacked bar or pie)
- [ ] Selectable time periods (5/7/10 years)
- [ ] Amortisation chart shows balance declining
- [ ] All charts responsive and accessible
- [ ] Tooltips with detailed information
- [ ] Summary statistics below charts

---

### F20: COE Renewal Decision Tool
**Status:** todo
**Priority:** P1
**Complexity:** 4 points
**Blocks:** None
**Dependencies:** F14

**Objective:** Create interactive tool for comparing COE renewal options at year 10.

**Requirements:**

1. **COE Decision Modal:**
```tsx
<COERenewalModal vehicleId={vehicleId} isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <Title>COE Expiry Decision</Title>
    <Subtitle>{vehicle.name} - COE expires {formatDate(expiryDate)}</Subtitle>
  </ModalHeader>

  <OptionCards>
    <OptionCard
      selected={selected === 'deregister'}
      onClick={() => setSelected('deregister')}
      recommended={analysis.recommendation === 'deregister'}
    >
      <OptionHeader>
        <Icon name="trash" />
        <Title>Deregister</Title>
        {analysis.recommendation === 'deregister' && <Badge>Recommended</Badge>}
      </OptionHeader>
      <OptionBody>
        <Row label="Scrap Value" value={analysis.options.deregister.scrapValue} />
        <Row label="PARF Rebate" value={analysis.options.deregister.parfRebate} />
        <Divider />
        <Row label="Net Return" value={analysis.options.deregister.netReturn} bold />
      </OptionBody>
      <OptionFooter>
        <Text>End vehicle ownership and receive scrap value</Text>
      </OptionFooter>
    </OptionCard>

    <OptionCard
      selected={selected === 'renew5yr'}
      onClick={() => setSelected('renew5yr')}
      recommended={analysis.recommendation === 'renew5yr'}
    >
      <OptionHeader>
        <Icon name="refresh" />
        <Title>Renew 5 Years</Title>
      </OptionHeader>
      <OptionBody>
        <Row label="PQP Cost" value={analysis.options.renew5yr.pqpCost} negative />
        <Row label="5-Year Road Tax" value={analysis.options.renew5yr.projectedCosts.roadTax} negative />
        <Row label="5-Year Insurance" value={analysis.options.renew5yr.projectedCosts.insurance} negative />
        <Row label="5-Year Maintenance" value={analysis.options.renew5yr.projectedCosts.maintenance} negative />
        <Row label="5-Year Fuel" value={analysis.options.renew5yr.projectedCosts.fuel} negative />
        <Divider />
        <Row label="Total 5-Year Cost" value={analysis.options.renew5yr.totalCost} bold negative />
        <Row label="Cost per Year" value={analysis.options.renew5yr.totalCost / 5} />
      </OptionBody>
      <OptionFooter>
        <Text>Continue using vehicle for 5 more years</Text>
      </OptionFooter>
    </OptionCard>

    <OptionCard
      selected={selected === 'renew10yr'}
      onClick={() => setSelected('renew10yr')}
      recommended={analysis.recommendation === 'renew10yr'}
    >
      {/* Similar structure for 10-year renewal */}
    </OptionCard>
  </OptionCards>

  <RecommendationSection>
    <RecommendationHeader>
      <Icon name="lightbulb" />
      <Title>Our Analysis</Title>
    </RecommendationHeader>
    <RecommendationText>{analysis.reasoning}</RecommendationText>
  </RecommendationSection>

  <ComparisonChart>
    {/* Visual comparison of total costs over time */}
  </ComparisonChart>

  <ModalFooter>
    <CancelButton onClick={onClose}>Close</CancelButton>
    <ApplyButton onClick={() => applyDecision(selected)}>
      Apply Decision to Projections
    </ApplyButton>
  </ModalFooter>
</COERenewalModal>
```

**Acceptance Criteria:**
- [ ] Three options displayed as cards
- [ ] Recommended option highlighted
- [ ] All costs broken down clearly
- [ ] Cost per year calculated
- [ ] Reasoning explanation displayed
- [ ] Visual comparison chart
- [ ] Apply decision creates/updates scenario event
- [ ] Mobile responsive layout

---

### F21: Timeline Integration Display
**Status:** todo
**Priority:** P1
**Complexity:** 3 points
**Blocks:** None
**Dependencies:** F14, B21

**Objective:** Display vehicle data integrated into the financial timeline and net worth projections.

**Requirements:**

1. **Vehicle Asset in Timeline:**
```tsx
// In TimelineYear assets section, show vehicle with depreciation
<TimelineAssetItem
  item={{
    itemId: vehicle.id,
    name: vehicle.name,
    category: 'vehicle',
    amountAnnual: yearlyBookValue,
    icon: 'car',
    growthRate: -0.15, // Negative for depreciation
  }}
  eventImpacts={coeExpiryImpacts}
/>
```

2. **Vehicle Expense Categories:**
```tsx
// Group vehicle expenses in timeline
<TimelineExpenseGroup category="Vehicle Expenses">
  <TimelineExpenseItem name="Road Tax" amount={roadTax} frequency="annual" />
  <TimelineExpenseItem name="Insurance" amount={insurance} frequency="annual" />
  <TimelineExpenseItem name="Fuel" amount={fuelMonthly * 12} frequency="annual" source="monthly" />
  <TimelineExpenseItem name="Maintenance" amount={maintenance} frequency="annual" />
  <TimelineExpenseItem name="ERP/Parking" amount={erpParking * 12} frequency="annual" source="monthly" />
  {hasLoan && (
    <TimelineExpenseItem name="Loan Payment" amount={monthlyPayment * 12} frequency="annual" source="monthly" />
  )}
</TimelineExpenseGroup>
```

3. **Vehicle Loan in Liabilities:**
```tsx
// Show car loan with declining balance
<TimelineLiabilityItem
  item={{
    itemId: `loan-${vehicle.id}`,
    name: `Car Loan: ${vehicle.name}`,
    category: 'vehicle_loan',
    amountAnnual: remainingBalance,
  }}
  tenure={remainingMonths}
/>
```

4. **COE Event Marker:**
```tsx
// Show COE expiry as event marker on timeline graph
<ScenarioMarker
  event={{
    name: `COE Expiry: ${vehicle.name}`,
    occursOn: coeExpiryDate,
    displayIcon: 'car',
    displayColor: '#ef4444',
  }}
  onClick={() => openCOERenewalModal(vehicle.id)}
/>
```

**Acceptance Criteria:**
- [ ] Vehicles appear in assets with correct values per year
- [ ] Vehicle expenses grouped and labeled correctly
- [ ] Car loans show in liabilities with declining balance
- [ ] COE expiry markers appear on timeline graph
- [ ] Net worth reflects vehicle equity (value - loan)
- [ ] Multiple vehicles aggregate correctly

---

### F22: Vehicle Comparison Tool
**Status:** todo
**Priority:** P2
**Complexity:** 3 points
**Blocks:** None
**Dependencies:** F14, F19

**Objective:** Enable side-by-side comparison of multiple vehicles for purchase decisions.

**Requirements:**

1. **Comparison View:**
```tsx
<VehicleComparisonModal isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <Title>Compare Vehicles</Title>
    <VehicleSelector
      selected={selectedVehicles}
      onChange={setSelectedVehicles}
      max={3}
    />
  </ModalHeader>

  <ComparisonTable>
    <thead>
      <tr>
        <th>Metric</th>
        {selectedVehicles.map(v => <th key={v.id}>{v.name}</th>)}
      </tr>
    </thead>
    <tbody>
      <ComparisonSection title="Purchase">
        <ComparisonRow label="OMV" values={vehicles.map(v => v.omv)} />
        <ComparisonRow label="COE" values={vehicles.map(v => v.coeAmount)} />
        <ComparisonRow label="Total Cost" values={vehicles.map(v => v.costBreakdown.totalPurchaseCost)} highlight />
      </ComparisonSection>

      <ComparisonSection title="Financing">
        <ComparisonRow label="Downpayment" values={vehicles.map(v => v.costBreakdown.downpayment)} />
        <ComparisonRow label="Monthly Payment" values={vehicles.map(v => v.costBreakdown.monthlyPayment)} />
        <ComparisonRow label="Total Interest" values={vehicles.map(v => v.costBreakdown.totalInterest)} />
      </ComparisonSection>

      <ComparisonSection title="Annual Costs">
        <ComparisonRow label="Road Tax" values={vehicles.map(v => v.costBreakdown.annualRoadTax)} />
        <ComparisonRow label="Insurance" values={vehicles.map(v => v.costBreakdown.annualInsuranceEstimate)} />
        <ComparisonRow label="Fuel" values={vehicles.map(v => v.costBreakdown.annualFuelEstimate)} />
        <ComparisonRow label="Total Annual" values={vehicles.map(v => v.costBreakdown.totalAnnualRecurring)} highlight />
      </ComparisonSection>

      <ComparisonSection title="10-Year TCO">
        <ComparisonRow label="Total Depreciation" values={depreciations} />
        <ComparisonRow label="Total Running Costs" values={runningCosts} />
        <ComparisonRow label="Total Interest" values={interests} />
        <ComparisonRow label="10-Year TCO" values={tcos} highlight winner />
      </ComparisonSection>
    </tbody>
  </ComparisonTable>

  <ComparisonCharts>
    <TCOComparisonChart vehicles={selectedVehicles} />
    <DepreciationComparisonChart vehicles={selectedVehicles} />
  </ComparisonCharts>
</VehicleComparisonModal>
```

**Acceptance Criteria:**
- [ ] Select up to 3 vehicles to compare
- [ ] All key metrics displayed side-by-side
- [ ] Lowest cost highlighted as "winner"
- [ ] TCO comparison chart
- [ ] Depreciation comparison chart
- [ ] Responsive for mobile (card view)

---

## Testing & Documentation Tickets

### T2: Singapore Car Module Unit Tests
**Status:** todo
**Priority:** P0
**Complexity:** 4 points
**Dependencies:** B15, B16, B17, B18, B19

**Objective:** Comprehensive unit test coverage for all calculation engines.

**Requirements:**

1. **Purchase Cost Tests:**
- ARF tier boundary values ($20k, $50k)
- GST and excise duty calculations
- Used car (skip ARF/GST)
- EV rebate application

2. **Loan Tests:**
- LTV cap at $20k OMV boundary
- Tenure limit enforcement
- Amortisation schedule accuracy
- Final balance = $0

3. **Recurring Cost Tests:**
- Road tax for each engine capacity band
- Age surcharges (years 11-14+)
- EV road tax exemption
- Insurance factor calculations
- Fuel cost for ICE vs EV

4. **Depreciation Tests:**
- PARF decline to $0 at year 10
- Used car depreciation from purchase price
- Book value never below scrap

5. **Resale/Renewal Tests:**
- COE renewal cost comparison
- Recommendation logic

**Test Files:**
- `backend/internal/car/purchase/calculator_test.go`
- `backend/internal/car/loan/calculator_test.go`
- `backend/internal/car/recurring/roadtax_test.go`
- `backend/internal/car/recurring/insurance_test.go`
- `backend/internal/car/depreciation/calculator_test.go`
- `backend/internal/car/resale/coe_renewal_test.go`

**Acceptance Criteria:**
- [ ] >90% code coverage for calculation engines
- [ ] All boundary cases covered
- [ ] Golden scenario tests pass
- [ ] Table-driven tests for all variations

---

### T3: Singapore Car Module Integration Tests
**Status:** todo
**Priority:** P1
**Complexity:** 2 points
**Dependencies:** B20, B21

**Objective:** End-to-end integration tests for vehicle API and timeline integration.

**Requirements:**

1. **API Integration Tests:**
- Full vehicle CRUD flow
- Cost breakdown computed on create
- Depreciation schedule endpoint
- COE renewal analysis endpoint

2. **Timeline Integration Tests:**
- Vehicle appears as asset in timeline
- Loan appears as liability
- Expenses injected correctly
- Net worth calculation accurate

3. **Golden Scenarios:**
- Budget sedan 7-year ownership
- Luxury car cash purchase
- EV with no road tax
- Used car with 5-year remaining COE

**Test Files:**
- `backend/cmd/server/handlers/vehicles_test.go`
- `backend/internal/car/timeline_integration_test.go`

**Acceptance Criteria:**
- [ ] API endpoints return correct responses
- [ ] Timeline shows vehicle data correctly
- [ ] Golden scenarios produce expected results
- [ ] Performance acceptable (<500ms for calculations)

---

### D2: Singapore Car Module Documentation
**Status:** todo
**Priority:** P2
**Complexity:** 2 points
**Dependencies:** T2, T3

**Objective:** Create user guide and technical documentation.

**Requirements:**

1. **User Guide:**
- How to add a vehicle
- Understanding purchase cost breakdown
- Interpreting TCO analysis
- Using COE renewal tool
- Managing multiple vehicles

2. **Technical Documentation:**
- API reference with examples
- Calculation formulas and sources
- Rule versioning guide
- Integration architecture

3. **Singapore Reference:**
- Current ARF tiers
- Road tax rates
- LTV caps and tenure limits
- COE categories

**Deliverables:**
- `specs/regional/singapore/singapore-car-module/user-guide.md`
- `specs/regional/singapore/singapore-car-module/api-reference.md`
- `specs/regional/singapore/singapore-car-module/rule-versioning.md`
- `specs/regional/singapore/singapore-car-module/sg-car-reference.md`

**Acceptance Criteria:**
- [ ] User guide covers all features
- [ ] API reference complete with examples
- [ ] Formulas documented with LTA sources
- [ ] Rule versioning process documented

---

## Summary

### Backend Tickets (34 points)
| Ticket | Name | Points | Dependencies |
|--------|------|--------|--------------|
| B13 | Database Schema & Migrations | 3 | None |
| B14 | Vehicle Repository Layer | 3 | B13 |
| B15 | Purchase Cost Engine | 5 | B13, B14 |
| B16 | Loan Engine | 3 | B13, B14 |
| B17 | Recurring Cost Engine | 5 | B13, B14 |
| B18 | Depreciation & PARF Engine | 4 | B13, B14 |
| B19 | Resale & COE Renewal Engine | 4 | B18 |
| B20 | Vehicle API Handlers | 4 | B14-B19 |
| B21 | Timeline Integration | 3 | B20 |
| B22 | Scenario Integration | 2 | B19, B21 |

### Frontend Tickets (32 points)
| Ticket | Name | Points | Dependencies |
|--------|------|--------|--------------|
| F14 | Vehicle Types & API Client | 2 | B20 |
| F15 | Vehicle Modal - Basic Info | 5 | F14 |
| F16 | Vehicle Modal - Financing & Usage | 4 | F15 |
| F17 | Vehicle Modal - Insurance | 4 | F15 |
| F18 | Vehicle List & Summary Card | 3 | F14-F16 |
| F19 | Depreciation & TCO Charts | 4 | F14, F18 |
| F20 | COE Renewal Decision Tool | 4 | F14 |
| F21 | Timeline Integration Display | 3 | F14, B21 |
| F22 | Vehicle Comparison Tool | 3 | F14, F19 |

### Testing & Documentation (8 points)
| Ticket | Name | Points | Dependencies |
|--------|------|--------|--------------|
| T2 | Unit Tests | 4 | B15-B19 |
| T3 | Integration Tests | 2 | B20, B21 |
| D2 | Documentation | 2 | T2, T3 |

---

## Critical Path

```
Phase 1: Backend Foundation (B13 → B14)
    ↓
Phase 2: Calculation Engines (B15, B16, B17, B18 in parallel)
    ↓
Phase 3: Resale Engine (B19, depends on B18)
    ↓
Phase 4: API & Integration (B20 → B21 → B22)
    ↓
Phase 5: Frontend Foundation (F14)
    ↓
Phase 6: Vehicle Modal (F15 → F16, F17 in parallel)
    ↓
Phase 7: Frontend Features (F18, F19, F20, F21, F22)
    ↓
Phase 8: Testing & Documentation (T2, T3, D2)
```

---

## Dependencies Diagram

```
B13 (Schema)
 ├─> B14 (Repository)
 │    ├─> B15 (Purchase)
 │    ├─> B16 (Loan)
 │    ├─> B17 (Recurring)
 │    └─> B18 (Depreciation)
 │         └─> B19 (Resale)
 │              └─> B20 (API)
 │                   ├─> B21 (Timeline)
 │                   │    └─> B22 (Scenarios)
 │                   └─> F14 (Types/API)
 │                        ├─> F15 (Modal Basic)
 │                        │    ├─> F16 (Modal Finance)
 │                        │    └─> F17 (Modal Insurance)
 │                        │         └─> F18 (List/Card)
 │                        │              └─> F19 (Charts)
 │                        │                   └─> F22 (Comparison)
 │                        ├─> F20 (COE Tool)
 │                        └─> F21 (Timeline Display)
```
