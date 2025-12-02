# Singapore Car Purchase & Ownership Module
# Product Requirements Document

## Executive Summary

The Singapore Car Purchase & Ownership Module enables Assetra users to model the complete financial lifecycle of vehicle ownership in Singapore - from purchase costs (OMV, ARF, COE, financing) through recurring expenses (road tax, insurance, fuel, maintenance) to end-of-life decisions (resale, COE renewal, scrapping). This feature integrates with Assetra's existing timeline and net worth projections, providing users with comprehensive Total Cost of Ownership (TCO) analysis and what-if scenario modeling.

**Key Value Propositions:**
- Accurate Singapore-specific calculations (ARF tiering, LTV caps, PARF rebates)
- Support for new and used vehicles, ICE and electric vehicles
- Multiple vehicle fleet management with aggregate cashflow impact
- Detailed insurance estimation based on driver profile
- Integration with financial timeline and scenario analysis

---

## Problem Statement

Singapore has one of the most complex and expensive car ownership markets globally. Users struggle to:
- Calculate true acquisition costs with Singapore's unique tax structure (OMV, ARF, COE, GST)
- Understand financing constraints (LTV caps, 7-year tenure limits)
- Project total cost of ownership over time including depreciation
- Make informed decisions about COE renewal vs scrapping at year 10
- Model vehicle expenses alongside other financial goals

**Pain Points:**
- Manual calculations required for complex ARF tiering
- No integrated view of car costs with overall financial planning
- Difficulty comparing different vehicle options
- Uncertainty about PARF rebates and optimal disposal timing
- Electric vehicle cost modeling differs significantly from ICE vehicles

---

## Product Vision

Enable Singapore users to confidently plan vehicle purchases and ownership by providing accurate cost calculations, comprehensive TCO projections, and integrated financial planning - helping them make informed decisions about one of the largest purchases after property.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature Adoption | 40% of SG users add at least one vehicle within 3 months | Analytics |
| Calculation Accuracy | <2% variance from official LTA calculations | Manual verification |
| User Engagement | Average 3+ scenario comparisons per vehicle added | Analytics |
| Task Completion | 85% of started vehicle entries completed | Funnel analysis |
| User Satisfaction | NPS ≥ 60 for car module specifically | Survey |

---

## User Stories & Epics

### Epic 1: Vehicle Purchase Cost Calculation
**As a user, I want to calculate the total cost of purchasing a car in Singapore so that I understand my true acquisition cost.**

#### User Stories:
- **US1.1**: As a user, I want to input vehicle details (OMV, COE, engine capacity) so that the system can calculate costs
- **US1.2**: As a user, I want to see a breakdown of all purchase costs (ARF, GST, excise, fees) so that I understand each component
- **US1.3**: As a user, I want to see the total upfront cost so that I can plan my finances
- **US1.4**: As a user, I want to compare costs between different vehicles so that I can make informed choices

### Epic 2: Vehicle Financing
**As a user, I want to model car loan options so that I understand my financing costs and monthly payments.**

#### User Stories:
- **US2.1**: As a user, I want to see the maximum loan amount based on LTV caps so that I know my financing limits
- **US2.2**: As a user, I want to generate an amortisation schedule so that I can see principal vs interest breakdown
- **US2.3**: As a user, I want to compare different loan tenures so that I can optimize my monthly payments
- **US2.4**: As a user, I want to calculate my required downpayment so that I can prepare my cash

### Epic 3: Recurring Cost Tracking
**As a user, I want to track ongoing vehicle ownership costs so that I understand my total cost of ownership.**

#### User Stories:
- **US3.1**: As a user, I want to calculate road tax based on engine capacity so that I know my annual tax
- **US3.2**: As a user, I want to estimate insurance premiums based on my profile so that I can budget accurately
- **US3.3**: As a user, I want to model fuel costs based on my driving habits so that I understand monthly expenses
- **US3.4**: As a user, I want to track maintenance costs so that I can plan for servicing
- **US3.5**: As a user, I want to see my total monthly/annual ownership costs so that I can budget effectively

### Epic 4: Depreciation & Value Tracking
**As a user, I want to understand how my vehicle's value changes over time so that I can plan for resale or disposal.**

#### User Stories:
- **US4.1**: As a user, I want to see my vehicle's depreciation schedule so that I understand value decline
- **US4.2**: As a user, I want to track PARF rebate value over time so that I know my potential rebate
- **US4.3**: As a user, I want to see projected resale value at different years so that I can plan optimal sale timing
- **US4.4**: As a user, I want to compare different ownership durations so that I can minimize depreciation cost

### Epic 5: COE Renewal & Disposal Decisions
**As a user, I want to evaluate end-of-ownership options so that I can make the best financial decision at COE expiry.**

#### User Stories:
- **US5.1**: As a user, I want to compare 5-year vs 10-year COE renewal costs so that I can choose the best option
- **US5.2**: As a user, I want to calculate net disposal value (resale + PARF) so that I understand my return
- **US5.3**: As a user, I want to see a recommendation (renew/sell/scrap) so that I can make informed decisions
- **US5.4**: As a user, I want to model post-renewal costs so that I understand ongoing expenses after renewal

### Epic 6: Multi-Vehicle & Fleet Management
**As a user, I want to manage multiple vehicles so that I can see my household's total automotive costs.**

#### User Stories:
- **US6.1**: As a user, I want to add multiple vehicles to my profile so that I can track my fleet
- **US6.2**: As a user, I want to see aggregate costs across all vehicles so that I understand total impact
- **US6.3**: As a user, I want to compare vehicles side-by-side so that I can evaluate options
- **US6.4**: As a user, I want to see combined timeline impact so that I can plan holistically

### Epic 7: Electric Vehicle Support
**As a user, I want specialized support for electric vehicles so that I can accurately model EV ownership costs.**

#### User Stories:
- **US7.1**: As a user, I want zero road tax applied for EVs so that my costs are accurate
- **US7.2**: As a user, I want to model electricity costs instead of fuel so that I see correct running costs
- **US7.3**: As a user, I want to include EV rebates (EEAI) in my calculations so that I see true costs
- **US7.4**: As a user, I want to model battery replacement as a major expense so that I can plan for it

### Epic 8: Used Vehicle Support
**As a user, I want to model used vehicle purchases so that I can evaluate pre-owned options.**

#### User Stories:
- **US8.1**: As a user, I want to input remaining COE years so that depreciation is calculated correctly
- **US8.2**: As a user, I want to see PARF rebate based on remaining COE so that I understand residual value
- **US8.3**: As a user, I want to skip ARF/GST for used cars so that only relevant costs are shown
- **US8.4**: As a user, I want to model shorter ownership periods so that I can plan for COE expiry

### Epic 9: Financial Integration
**As a user, I want vehicle costs integrated with my overall financial plan so that I can make holistic decisions.**

#### User Stories:
- **US9.1**: As a user, I want my vehicle to appear as an asset in net worth so that my wealth is accurate
- **US9.2**: As a user, I want my car loan to appear as a liability so that my debts are tracked
- **US9.3**: As a user, I want recurring costs in my expense projections so that cashflow is accurate
- **US9.4**: As a user, I want COE renewal as a scenario event so that I can model the decision

---

## User Experience Flows

### Flow 1: New Vehicle Purchase (Primary Flow)
1. User clicks "Add Vehicle" from dashboard or financial workspace
2. Modal opens with vehicle input form
3. User selects "New" vehicle type
4. User enters OMV, selects COE category, enters COE amount
5. System auto-calculates purchase breakdown (ARF, GST, excise, fees)
6. User enters financing details (loan amount, interest rate, tenure)
7. System validates LTV cap and shows downpayment requirement
8. User enters usage assumptions (mileage, fuel efficiency)
9. User enters cost assumptions (insurance, maintenance level, ERP, parking)
10. System shows complete TCO summary
11. User saves vehicle
12. Vehicle appears in timeline with asset value and expenses
13. Dashboard updates with vehicle contribution to net worth

### Flow 2: Used Vehicle Purchase
1. User clicks "Add Vehicle" and selects "Used" type
2. User enters purchase price (already depreciated) and vehicle age
3. System calculates remaining COE months
4. System skips ARF/GST (already paid by first owner)
5. System calculates remaining PARF value
6. Rest of flow follows new vehicle pattern
7. Depreciation calculated from purchase price to scrap value over remaining COE

### Flow 3: Electric Vehicle
1. User selects "Electric" as fuel type
2. System sets road tax to $0 (with note about policy changes)
3. User enters battery capacity and efficiency (kWh/100km)
4. User enters electricity rate ($/kWh) and charging mix (home/public)
5. System calculates electricity costs instead of fuel
6. System prompts for EV rebate (EEAI) if applicable
7. System adds battery replacement as optional major expense at year 8-10

### Flow 4: COE Expiry Decision at Year 10
1. System notifies user of upcoming COE expiry
2. User clicks "Evaluate Options" in vehicle detail
3. Modal shows three paths:
   - **Deregister**: Scrap value + PARF rebate ($0 at year 10)
   - **Renew 5 years**: Pay PQP, new depreciation schedule, ongoing costs
   - **Renew 10 years**: Pay PQP, extended depreciation, ongoing costs
4. System calculates net cost for each option
5. System shows recommendation based on vehicle condition and costs
6. User selects preferred option
7. System creates scenario event for the selected path
8. Timeline updates with projected costs

### Flow 5: Multi-Vehicle Management
1. User has multiple vehicles in their profile
2. Dashboard shows "Vehicles" summary card with:
   - Total fleet value
   - Combined monthly costs
   - Number of vehicles
3. User clicks card to see vehicle list
4. Each vehicle shows: name, value, monthly cost, COE expiry
5. User can filter by status (active, pending disposal)
6. Clicking vehicle opens detail view
7. "Add Vehicle" button allows adding more

---

## Technical Architecture

### System Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│  VehicleModal │ VehicleList │ TCODashboard │ DepreciationChart     │
│  InsuranceWizard │ COERenewalTool │ VehicleComparison              │
└────────────────────────────┬────────────────────────────────────────┘
                             │ API Calls
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API Layer (Go Handlers)                         │
├─────────────────────────────────────────────────────────────────────┤
│  /api/v1/vehicles (CRUD)                                            │
│  /api/v1/vehicles/{id}/costs (calculated breakdown)                 │
│  /api/v1/vehicles/{id}/depreciation (schedule)                      │
│  /api/v1/vehicles/{id}/loan/amortisation (schedule)                 │
│  /api/v1/vehicles/{id}/coe-renewal (options analysis)               │
│  /api/v1/sg-car-rules (versioned rules)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Car Module (internal/car)                       │
├─────────────────────────────────────────────────────────────────────┤
│  purchase.go │ loan.go │ recurring/ │ depreciation.go │ resale.go  │
│  rules/arf.go │ rules/gst.go │ rules/roadtax.go │ rules/insurance.go│
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Integration Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│  timeline_integration.go - Inject vehicle data into timeline        │
│  scenario_integration.go - COE renewal/disposal events              │
│  networth_integration.go - Asset/liability contributions            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────────────┤
│  vehicles │ vehicle_cost_breakdowns │ sg_car_rules │ sg_insurance   │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Core vehicle table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL,
    parent_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,

    -- Vehicle type
    is_used_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
    is_electric BOOLEAN NOT NULL DEFAULT FALSE,

    -- Vehicle specs
    omv DOUBLE PRECISION NOT NULL,
    coe_amount DOUBLE PRECISION NOT NULL,
    coe_category VARCHAR(1) NOT NULL CHECK (coe_category IN ('A', 'B', 'C', 'D', 'E')),
    engine_capacity_cc INTEGER,
    fuel_type VARCHAR NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
    vehicle_type VARCHAR CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'mpv', 'sports', 'luxury')),

    -- Purchase info
    purchase_date DATE NOT NULL,
    purchase_price DOUBLE PRECISION NOT NULL,

    -- Used car specific
    original_registration_date DATE,
    coe_start_date DATE,
    vehicle_age_at_purchase INTEGER,

    -- EV specific
    battery_capacity_kwh DOUBLE PRECISION,
    ev_efficiency DOUBLE PRECISION,
    electricity_rate DOUBLE PRECISION,
    ev_arf_rebate_applied DOUBLE PRECISION DEFAULT 0,

    -- Financing
    loan_amount DOUBLE PRECISION,
    loan_interest_rate DOUBLE PRECISION,
    loan_tenure_months INTEGER CHECK (loan_tenure_months <= 84),

    -- Usage assumptions
    annual_mileage_km INTEGER DEFAULT 15000,
    fuel_efficiency DOUBLE PRECISION,
    fuel_price_per_unit DOUBLE PRECISION,

    -- Ownership plan
    planned_ownership_years INTEGER DEFAULT 10,
    coe_renewal_preference VARCHAR DEFAULT 'scrap' CHECK (coe_renewal_preference IN ('5yr', '10yr', 'scrap')),

    -- Cost assumptions
    maintenance_level VARCHAR DEFAULT 'moderate' CHECK (maintenance_level IN ('light', 'moderate', 'heavy')),
    erp_monthly DOUBLE PRECISION DEFAULT 0,
    parking_monthly DOUBLE PRECISION DEFAULT 0,

    -- Insurance profile
    driver_age INTEGER,
    driving_experience_years INTEGER,
    ncd_percentage INTEGER DEFAULT 0 CHECK (ncd_percentage >= 0 AND ncd_percentage <= 50),
    claims_history_3yr INTEGER DEFAULT 0,
    coverage_type VARCHAR DEFAULT 'comprehensive' CHECK (coverage_type IN ('third_party', 'tpft', 'comprehensive')),
    excess_amount DOUBLE PRECISION DEFAULT 500,

    -- Effective dating
    start_year INTEGER NOT NULL DEFAULT 0,
    end_year INTEGER,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_omv CHECK (omv > 0),
    CONSTRAINT valid_coe CHECK (coe_amount >= 0),
    CONSTRAINT valid_purchase_price CHECK (purchase_price > 0)
);

-- Computed cost breakdown (cached)
CREATE TABLE vehicle_cost_breakdowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Purchase breakdown
    excise_duty DOUBLE PRECISION NOT NULL,
    gst DOUBLE PRECISION NOT NULL,
    arf DOUBLE PRECISION NOT NULL,
    registration_fee DOUBLE PRECISION NOT NULL,
    dealer_fee DOUBLE PRECISION DEFAULT 0,
    total_purchase_cost DOUBLE PRECISION NOT NULL,

    -- Financing breakdown
    downpayment DOUBLE PRECISION,
    loan_principal DOUBLE PRECISION,
    total_interest DOUBLE PRECISION,
    monthly_payment DOUBLE PRECISION,

    -- Annual recurring costs
    annual_road_tax DOUBLE PRECISION,
    annual_insurance_estimate DOUBLE PRECISION,
    annual_fuel_estimate DOUBLE PRECISION,
    annual_maintenance_estimate DOUBLE PRECISION,
    annual_erp_parking DOUBLE PRECISION,
    total_annual_recurring DOUBLE PRECISION,

    -- Depreciation
    initial_parf_value DOUBLE PRECISION,

    computed_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(vehicle_id)
);

-- Versioned Singapore car rules
CREATE TABLE sg_car_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    rule_data JSONB NOT NULL,
    source_reference VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Insurance estimation rules
CREATE TABLE sg_insurance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    rule_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_user_start_year ON vehicles(user_id, start_year);
CREATE UNIQUE INDEX idx_vehicles_parent_start_year ON vehicles(parent_id, start_year);
CREATE INDEX idx_sg_car_rules_type_date ON sg_car_rules(rule_type, effective_from);
CREATE INDEX idx_sg_insurance_rules_type_date ON sg_insurance_rules(rule_type, effective_from);
```

### API Contract

#### Vehicle CRUD

**Create Vehicle**
```http
POST /api/v1/vehicles
Content-Type: application/json

{
  "name": "Toyota Camry 2.5",
  "isUsedVehicle": false,
  "isElectric": false,
  "omv": 32000,
  "coeAmount": 95000,
  "coeCategory": "B",
  "engineCapacityCc": 2494,
  "fuelType": "petrol",
  "vehicleType": "sedan",
  "purchaseDate": "2025-03-01",
  "purchasePrice": 175000,
  "loanAmount": 105000,
  "loanInterestRate": 2.88,
  "loanTenureMonths": 84,
  "annualMileageKm": 15000,
  "fuelEfficiency": 12.5,
  "fuelPricePerUnit": 2.85,
  "plannedOwnershipYears": 10,
  "coeRenewalPreference": "scrap",
  "maintenanceLevel": "moderate",
  "erpMonthly": 50,
  "parkingMonthly": 150,
  "driverAge": 35,
  "drivingExperienceYears": 10,
  "ncdPercentage": 50,
  "claimsHistory3yr": 0,
  "coverageType": "comprehensive",
  "excessAmount": 1000
}

Response: 201 Created
{
  "id": "uuid",
  "name": "Toyota Camry 2.5",
  ... // all fields echoed back
  "costBreakdown": {
    "exciseDuty": 6400,
    "gst": 3456,
    "arf": 57600,
    "registrationFee": 220,
    "totalPurchaseCost": 194676,
    "downpayment": 70000,
    "loanPrincipal": 105000,
    "totalInterest": 10584,
    "monthlyPayment": 1376,
    "annualRoadTax": 1632,
    "annualInsuranceEstimate": 1850,
    "annualFuelEstimate": 3420,
    "annualMaintenanceEstimate": 1200,
    "annualErpParking": 2400,
    "totalAnnualRecurring": 10502,
    "initialParf": 32000
  },
  "createdAt": "2025-03-01T00:00:00Z"
}
```

**List Vehicles**
```http
GET /api/v1/vehicles?limit=20&offset=0

Response: 200 OK
{
  "data": [...vehicles],
  "total": 3,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

**Get Vehicle with Full Details**
```http
GET /api/v1/vehicles/{id}

Response: 200 OK
{
  ...vehicle,
  "costBreakdown": {...},
  "depreciationSchedule": [
    { "year": 1, "bookValue": 157500, "parfValue": 28800, "depreciation": 17500 },
    { "year": 2, "bookValue": 141750, "parfValue": 25600, "depreciation": 15750 },
    ...
  ],
  "loanAmortisation": [
    { "month": 1, "payment": 1376, "principal": 1124, "interest": 252, "balance": 103876 },
    ...
  ]
}
```

**Get Depreciation Schedule**
```http
GET /api/v1/vehicles/{id}/depreciation

Response: 200 OK
{
  "vehicleId": "uuid",
  "purchasePrice": 175000,
  "schedule": [
    {
      "year": 0,
      "bookValue": 175000,
      "parfValue": 32000,
      "totalValue": 207000,
      "depreciationAmount": 0,
      "cumulativeDepreciation": 0
    },
    {
      "year": 1,
      "bookValue": 148750,
      "parfValue": 28800,
      "totalValue": 177550,
      "depreciationAmount": 26250,
      "cumulativeDepreciation": 26250
    },
    ...
  ]
}
```

**Get COE Renewal Analysis**
```http
GET /api/v1/vehicles/{id}/coe-renewal

Response: 200 OK
{
  "vehicleId": "uuid",
  "coeExpiryDate": "2035-03-01",
  "options": {
    "deregister": {
      "scrapValue": 5000,
      "parfRebate": 0,
      "netReturn": 5000,
      "recommendation": false
    },
    "renew5yr": {
      "pqpCost": 45000,
      "projectedCosts": {
        "roadTax": 8160,
        "insurance": 12500,
        "maintenance": 10000,
        "fuel": 17100
      },
      "totalCost": 92760,
      "recommendation": false
    },
    "renew10yr": {
      "pqpCost": 90000,
      "projectedCosts": {
        "roadTax": 16320,
        "insurance": 25000,
        "maintenance": 25000,
        "fuel": 34200
      },
      "totalCost": 190520,
      "recommendation": false
    }
  },
  "recommendation": "deregister",
  "reasoning": "Vehicle will be 10 years old with $0 PARF. Renewal costs exceed expected value."
}
```

---

## Implementation Tickets

See `singapore-car-tickets.md` for detailed backend and frontend implementation tickets.

---

## Testing Strategy

### Unit Tests
- ARF tier calculations with boundary values
- LTV cap enforcement at OMV thresholds
- Road tax calculations for different engine capacities
- Insurance estimation with various driver profiles
- Depreciation curve accuracy
- PARF rebate calculations

### Integration Tests
- 10-year ownership simulation end-to-end
- Multi-vehicle aggregate calculations
- Timeline integration with vehicle data
- Scenario event generation for COE decisions

### Golden Scenarios
| Scenario | OMV | COE | Engine | Fuel | Loan |
|----------|-----|-----|--------|------|------|
| Budget Sedan | $18k | $60k | 1.5L | Petrol | 7yr |
| Mid-Range SUV | $35k | $90k | 2.0L | Hybrid | 5yr |
| Luxury Car | $80k | $100k | 3.0L | Petrol | Cash |
| Electric Vehicle | $50k | $80k | N/A | Electric | 5yr |
| Used Car (5yr old) | $20k (original) | $50k | 1.6L | Petrol | 5yr |

### Performance Tests
- 10+ vehicles per user
- 20-year projection calculation time
- Concurrent API calls

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Regulatory changes (ARF, COE rules) | High | Medium | Versioned rule tables with effective dates |
| Inaccurate calculations damage trust | High | Low | Comprehensive golden scenario testing |
| Complex UI overwhelms users | Medium | Medium | Progressive disclosure, smart defaults |
| Insurance estimates too inaccurate | Medium | Medium | Clear disclaimers, manual override option |
| EV rules change frequently | Medium | High | Separate EV rule version tracking |

---

## Future Enhancements

1. **AI Chat Integration**: "What if I buy a Tesla Model 3?" creates vehicle scenario
2. **Market Data Integration**: Live COE bidding data and market prices
3. **Dealer Comparison**: Compare quotes from multiple dealers
4. **Insurance Quotes**: Integration with insurance providers for actual quotes
5. **Maintenance Reminders**: Scheduled servicing notifications
6. **Resale Marketplace**: Used car valuation and listing suggestions

---

## Appendix: Singapore Car Rules Reference

### ARF Tiers (2024)
| OMV Range | ARF Rate |
|-----------|----------|
| First $20,000 | 100% |
| Next $30,000 ($20k-$50k) | 140% |
| Above $50,000 | 180% |

### Road Tax by Engine Capacity
| Engine Capacity | 6-Monthly Tax |
|----------------|---------------|
| 600cc and below | $200 × 0.782 |
| 601-1000cc | $200 + $0.25 per cc above 600 |
| 1001-1600cc | $300 + $0.75 per cc above 1000 |
| 1601-3000cc | $750 + $1.50 per cc above 1600 |
| Above 3000cc | $2850 + $2.00 per cc above 3000 |

### Road Tax Age Surcharges
| Vehicle Age | Surcharge |
|-------------|-----------|
| Years 1-10 | 0% |
| Year 11 | 10% |
| Year 12 | 20% |
| Year 13 | 30% |
| Year 14+ | 50% |

### LTV Caps
| OMV | Max LTV |
|-----|---------|
| ≤ $20,000 | 70% |
| > $20,000 | 60% |

### Maximum Loan Tenure
- 7 years (84 months)

### GST Rate
- 9% (as of 2024)

### Excise Duty
- 20% of OMV
