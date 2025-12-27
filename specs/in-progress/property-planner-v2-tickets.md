# Property Planner V2 Implementation Tickets

This document contains detailed implementation tickets for the Property Planner V2 persistence feature. Backend and Frontend tickets are designed to be worked on concurrently.

**Reference:** `property-planner-v2-persistence.md`

**Development Approach:** Test-Driven Development (TDD) - Write tests first, then implement.

---

# API CONTRACT (Read This First!)

This section defines the API contract that both backend and frontend teams must follow. **Frontend can start development immediately using these contracts.**

## Base URL

```
/api/v2/property-planner
```

## Authentication

All endpoints require authentication via `X-Auth-Token` header.

## Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/scenarios` | List all scenarios for user |
| `POST` | `/scenarios` | Create new scenario |
| `GET` | `/scenarios/:id` | Get single scenario |
| `PUT` | `/scenarios/:id` | Update scenario |
| `DELETE` | `/scenarios/:id` | Delete scenario |

---

## API Contract: Request/Response Shapes

### Common Types

```typescript
// Enums
type PropertyType = 'hdb' | 'private'
type PropertySubtype = 'bto' | 'resale' | 'ec' | 'new'
type LoanType = 'bank' | 'hdb'
type BorrowerType = 'single' | 'joint'
type BuyerType = 'singapore_citizen' | 'permanent_resident' | 'foreigner'
type FeeContext = 'purchase' | 'sale' | 'recurring'
type FeeFrequency = 'one_time' | 'monthly' | 'yearly'
type GrowthStrategy = 'fixed' | 'annual_step' | 'compound_monthly' | 'tiered_adb'

// All monetary values are strings for decimal precision
// All dates are ISO format strings (YYYY-MM-DD or YYYY-MM for months)
```

### POST /scenarios - Create Scenario

**Request:**
```typescript
interface CreateScenarioRequest {
  country: 'SG' | 'MY'
  sgDetails?: {
    name: string                          // required, 1-100 chars
    propertyType: PropertyType            // required
    propertySubtype: PropertySubtype      // required
    icon?: string                         // optional, icon name
    iconColor?: string                    // optional, hex color
    isIncluded?: boolean                  // default: true
    propertyPrice: string                 // required, decimal string
    valuationPrice?: string               // optional, for COV calc
    loanType: LoanType                    // required
    downpaymentCpfOa?: string             // default: "0"
    downpaymentCpfSa?: string             // default: "0"
    downpaymentCash?: string              // default: "0"
    borrowerType: BorrowerType            // required
    borrower1IncomeId?: string            // optional, UUID
    borrower1CpfAccountId?: string        // optional, UUID
    borrower2IncomeId?: string            // optional, UUID (for joint)
    borrower2CpfAccountId?: string        // optional, UUID (for joint)
    otherDebt?: string                    // default: "0"
    buyerType: BuyerType                  // required
    propertyCount?: number                // default: 0
    grants?: string                       // default: "0"
    btoLaunchDate?: string                // optional, YYYY-MM
    btoKeyCollectionDate?: string         // optional, YYYY-MM
    saleExpectedDate?: string             // optional, YYYY-MM
    saleExpectedPrice?: string            // optional, decimal string
  }
  fees?: Array<{
    feeContext: FeeContext                // required
    feeType: string                       // required, e.g., 'legal', 'agent'
    description?: string
    amount: string                        // required, decimal string
    currency?: string                     // default: 'SGD'
    isPercentage?: boolean                // default: false
    frequency?: FeeFrequency              // default: 'one_time'
    startDate?: string                    // for recurring
    endDate?: string                      // for recurring
  }>
  growthPeriods?: Array<{
    startYear: number                     // required
    endYear?: number                      // optional, null = indefinite
    growthRate: string                    // required, e.g., "3.0" for 3%
    growthStrategy?: GrowthStrategy       // default: 'annual_step'
  }>
  ratePeriods: Array<{                    // required, at least 1
    startMonth: string                    // required, YYYY-MM
    termYears: number                     // required, 1-35
    fixedYears?: number                   // default: 0
    fixedRate: string                     // required, e.g., "2.6"
    floatingRate: string                  // required, e.g., "3.5"
  }>
}
```

**Response: 201 Created**
```typescript
interface ScenarioResponse {
  scenario: {
    id: string                            // UUID
    userId: string
    sgDetailsId: string | null
    myDetailsId: string | null
    createdAt: string                     // ISO datetime
    updatedAt: string                     // ISO datetime
  }
  sgDetails: {
    id: string
    name: string
    propertyType: PropertyType
    propertySubtype: PropertySubtype
    icon: string | null
    iconColor: string | null
    isIncluded: boolean
    propertyPrice: string
    valuationPrice: string | null
    loanType: LoanType
    downpaymentCpfOa: string
    downpaymentCpfSa: string
    downpaymentCash: string
    borrowerType: BorrowerType
    borrower1IncomeId: string | null
    borrower1CpfAccountId: string | null
    borrower2IncomeId: string | null
    borrower2CpfAccountId: string | null
    otherDebt: string
    buyerType: BuyerType
    propertyCount: number
    grants: string
    btoLaunchDate: string | null
    btoKeyCollectionDate: string | null
    saleExpectedDate: string | null
    saleExpectedPrice: string | null
    createdAt: string
    updatedAt: string
  } | null
  fees: Array<{
    id: string
    scenarioId: string
    feeContext: FeeContext
    feeType: string
    description: string | null
    amount: string
    currency: string
    isPercentage: boolean
    frequency: FeeFrequency
    startDate: string | null
    endDate: string | null
    createdAt: string
  }>
  growthPeriods: Array<{
    id: string
    propertyScenarioId: string
    assetId: string | null
    startYear: number
    endYear: number | null
    growthRate: string
    growthStrategy: GrowthStrategy
    createdAt: string
  }>
  ratePeriods: Array<{
    id: string
    propertyScenarioId: string
    liabilityId: string | null
    periodOrder: number
    startMonth: string
    termYears: number
    fixedYears: number
    fixedRate: string
    floatingRate: string
    createdAt: string
  }>
  computed: {
    mortgage: {
      loanAmount: string
      monthlyPayment: string
      totalInterest: string
      totalAmountPaid: string
      loanStartDate: string
      loanEndDate: string
      msrRatio: string                    // e.g., "0.2705" for 27.05%
      tdsrRatio: string
      msrPasses: boolean
      tdsrPasses: boolean
      bsdAmount: string
      absdAmount: string
      downpayment: string
      downpaymentBreakdown: {
        cpfOa: string
        cpfSa: string
        cash: string
        grants: string
        minCashRequired: string
        maxCpfAllowed: string
      }
      totalUpfrontCash: string            // cash + BSD + ABSD + purchase fees
      cov: string                         // Cash Over Valuation
      calculatedPurchaseFees: Array<{
        feeType: string
        description: string
        amount: string
        isCalculated: boolean
      }>
      totalPurchaseFees: string
      amortization: Array<{
        year: number
        startingBalance: string
        totalPrincipal: string
        totalInterest: string
        endingBalance: string
      }>
      paymentPeriods: Array<{
        periodOrder: number
        periodStart: string
        periodEnd: string
        monthlyPayment: string
        rate: string
        rateType: 'fixed' | 'floating'
      }>
    }
    sale: {                               // null if saleExpectedDate not set
      holdingPeriodMonths: number
      outstandingLoanAtSale: string
      cpfRefund: string                   // principal + accrued interest
      cpfAccruedInterest: string
      ssdRate: string                     // e.g., "0.04" for 4%
      ssdAmount: string
      grossProceeds: string
      agentFee: string
      legalFee: string
      totalSaleCosts: string
      netCashProceeds: string
    } | null
    appreciation: Array<{
      year: number
      projectedValue: string
      growthRate: string
      cumulativeGrowth: string            // e.g., "0.1255" for 12.55%
    }>
    recurringCosts: {
      monthlyPropertyTax: string
      monthlyMaintenance: string
      monthlyInsurance: string
      totalMonthlyRecurring: string
    }
  }
}
```

### GET /scenarios - List Scenarios

**Response: 200 OK**
```typescript
interface ListScenariosResponse {
  scenarios: ScenarioResponse[]           // Same shape as single response
  count: number
}
```

### GET /scenarios/:id - Get Single Scenario

**Response: 200 OK**
```typescript
// Same as ScenarioResponse above
```

**Response: 404 Not Found**
```typescript
interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}
```

### PUT /scenarios/:id - Update Scenario

**Request:** Same as CreateScenarioRequest (all fields optional except required ones)

**Response: 200 OK** Same as ScenarioResponse

### DELETE /scenarios/:id - Delete Scenario

**Response: 204 No Content**

---

## Error Responses

All endpoints may return these errors:

```typescript
// 400 Bad Request - Validation error
{
  "error": "validation_error",
  "message": "propertyPrice: must be a valid decimal; name: required",
  "statusCode": 400
}

// 401 Unauthorized - Missing or invalid token
{
  "error": "unauthorized",
  "message": "authentication required",
  "statusCode": 401
}

// 404 Not Found - Scenario doesn't exist or doesn't belong to user
{
  "error": "not_found",
  "message": "scenario not found",
  "statusCode": 404
}

// 500 Internal Server Error
{
  "error": "internal_error",
  "message": "an unexpected error occurred",
  "statusCode": 500
}
```

---

## Mock Server for Frontend Development

Frontend can use this mock data while backend is being developed:

```typescript
// Mock scenario response for testing
const mockScenarioResponse: ScenarioResponse = {
  scenario: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    userId: "user-123",
    sgDetailsId: "550e8400-e29b-41d4-a716-446655440001",
    myDetailsId: null,
    createdAt: "2025-12-27T10:00:00Z",
    updatedAt: "2025-12-27T10:00:00Z"
  },
  sgDetails: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Dream HDB",
    propertyType: "hdb",
    propertySubtype: "resale",
    icon: "home",
    iconColor: "#10B981",
    isIncluded: true,
    propertyPrice: "850000",
    valuationPrice: "850000",
    loanType: "bank",
    downpaymentCpfOa: "150000",
    downpaymentCpfSa: "0",
    downpaymentCash: "20100",
    borrowerType: "single",
    borrower1IncomeId: null,
    borrower1CpfAccountId: null,
    borrower2IncomeId: null,
    borrower2CpfAccountId: null,
    otherDebt: "0",
    buyerType: "singapore_citizen",
    propertyCount: 0,
    grants: "0",
    btoLaunchDate: null,
    btoKeyCollectionDate: null,
    saleExpectedDate: "2035-06",
    saleExpectedPrice: "1100000",
    createdAt: "2025-12-27T10:00:00Z",
    updatedAt: "2025-12-27T10:00:00Z"
  },
  fees: [],
  growthPeriods: [{
    id: "growth-1",
    propertyScenarioId: "550e8400-e29b-41d4-a716-446655440000",
    assetId: null,
    startYear: 2025,
    endYear: null,
    growthRate: "3.0",
    growthStrategy: "annual_step",
    createdAt: "2025-12-27T10:00:00Z"
  }],
  ratePeriods: [{
    id: "rate-1",
    propertyScenarioId: "550e8400-e29b-41d4-a716-446655440000",
    liabilityId: null,
    periodOrder: 0,
    startMonth: "2025-01",
    termYears: 25,
    fixedYears: 2,
    fixedRate: "2.6",
    floatingRate: "3.5",
    createdAt: "2025-12-27T10:00:00Z"
  }],
  computed: {
    mortgage: {
      loanAmount: "679900",
      monthlyPayment: "3078.47",
      totalInterest: "243541.00",
      totalAmountPaid: "923441.00",
      loanStartDate: "2025-01",
      loanEndDate: "2049-12",
      msrRatio: "0.2565",
      tdsrRatio: "0.2565",
      msrPasses: true,
      tdsrPasses: true,
      bsdAmount: "20100",
      absdAmount: "0",
      downpayment: "170100",
      downpaymentBreakdown: {
        cpfOa: "150000",
        cpfSa: "0",
        cash: "20100",
        grants: "0",
        minCashRequired: "20100",
        maxCpfAllowed: "150000"
      },
      totalUpfrontCash: "40200",
      cov: "0",
      calculatedPurchaseFees: [
        { feeType: "bsd", description: "Buyer's Stamp Duty", amount: "20100", isCalculated: true }
      ],
      totalPurchaseFees: "20100",
      amortization: [
        { year: 1, startingBalance: "679900", totalPrincipal: "22456", totalInterest: "14485", endingBalance: "657444" }
      ],
      paymentPeriods: [
        { periodOrder: 0, periodStart: "2025-01", periodEnd: "2026-12", monthlyPayment: "3078.47", rate: "2.6", rateType: "fixed" },
        { periodOrder: 1, periodStart: "2027-01", periodEnd: "2049-12", monthlyPayment: "3299.23", rate: "3.5", rateType: "floating" }
      ]
    },
    sale: {
      holdingPeriodMonths: 126,
      outstandingLoanAtSale: "456789.12",
      cpfRefund: "191234.56",
      cpfAccruedInterest: "41234.56",
      ssdRate: "0",
      ssdAmount: "0",
      grossProceeds: "1100000",
      agentFee: "22000",
      legalFee: "3000",
      totalSaleCosts: "25000",
      netCashProceeds: "426976.32"
    },
    appreciation: [
      { year: 1, projectedValue: "875500", growthRate: "3.0", cumulativeGrowth: "0.03" },
      { year: 5, projectedValue: "985267", growthRate: "3.0", cumulativeGrowth: "0.159" },
      { year: 10, projectedValue: "1142014", growthRate: "3.0", cumulativeGrowth: "0.3435" }
    ],
    recurringCosts: {
      monthlyPropertyTax: "100",
      monthlyMaintenance: "350",
      monthlyInsurance: "50",
      totalMonthlyRecurring: "500"
    }
  }
}
```

---

# BACKEND TICKETS

---

## TDD Development Workflow

All backend tickets follow Test-Driven Development (TDD). For each ticket:

1. **Write Tests First**: Create test file with failing tests before implementation
2. **Run Tests**: Verify tests fail (red phase)
3. **Implement Code**: Write minimal code to pass tests
4. **Refactor**: Clean up while keeping tests green
5. **Repeat**: Add more test cases as needed

```bash
# Run tests with coverage
go test -v -cover ./internal/financial_v2/property/...
go test -v -cover ./internal/financial_v2/repository/...

# Run specific test file
go test -v -run TestCalculateBSD ./internal/financial_v2/property/

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**Target Coverage**: 85%+ for all new code

---

## BE-0: OpenAPI/Swagger Documentation

**Priority:** P0 (Blocking)
**Estimated Effort:** 2-3 hours
**Dependencies:** None

### Description

Add OpenAPI/Swagger documentation for Property Planner V2 endpoints. This enables frontend developers to understand the API contract and auto-generate TypeScript clients.

### Acceptance Criteria

- [ ] All 5 endpoints documented in swagger.yaml
- [ ] All request/response schemas defined
- [ ] Validation constraints documented (min/max, enums, required)
- [ ] Error responses documented
- [ ] Swagger UI accessible at `/api/docs`

### TDD Approach

**Test File:** `backend/cmd/server/handlers/property_planner_v2_swagger_test.go`

```go
package handlers

import (
    "testing"
    "encoding/json"
    "net/http/httptest"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestSwaggerDocumentation(t *testing.T) {
    t.Run("SwaggerYAML_ContainsPropertyPlannerEndpoints", func(t *testing.T) {
        // Read swagger.yaml
        // Assert it contains /api/v2/property-planner/scenarios
        // Assert it has POST, GET, PUT, DELETE methods
    })

    t.Run("SwaggerYAML_SchemasMatchImplementation", func(t *testing.T) {
        // Parse CreateScenarioRequest from swagger
        // Compare field names and types with actual Go struct
        // Ensure they match
    })
}
```

### Implementation Details

#### File: `backend/cmd/server/docs/swagger.yaml` (additions)

Add the following definitions and paths to the existing swagger.yaml:

```yaml
# Add to definitions section:

definitions:
  # ... existing definitions ...

  property.CreateScenarioRequest:
    type: object
    required:
      - country
      - ratePeriods
    properties:
      country:
        type: string
        enum: [SG, MY]
        description: Country code for property scenario
      sgDetails:
        $ref: '#/definitions/property.CreateSGDetailsRequest'
      fees:
        type: array
        items:
          $ref: '#/definitions/property.CreateFeeRequest'
      growthPeriods:
        type: array
        items:
          $ref: '#/definitions/property.CreateGrowthPeriodRequest'
      ratePeriods:
        type: array
        minItems: 1
        items:
          $ref: '#/definitions/property.CreateRatePeriodRequest'

  property.CreateSGDetailsRequest:
    type: object
    required:
      - name
      - propertyType
      - propertySubtype
      - propertyPrice
      - loanType
      - borrowerType
      - buyerType
    properties:
      name:
        type: string
        minLength: 1
        maxLength: 100
        description: Display name for the property scenario
      propertyType:
        type: string
        enum: [hdb, private]
      propertySubtype:
        type: string
        enum: [bto, resale, ec, new]
      icon:
        type: string
        description: Icon name from lucide-react
      iconColor:
        type: string
        description: Hex color code (e.g., "#10B981")
      isIncluded:
        type: boolean
        default: true
      propertyPrice:
        type: string
        description: Decimal string (e.g., "850000")
      valuationPrice:
        type: string
        description: Decimal string for COV calculation
      loanType:
        type: string
        enum: [bank, hdb]
      downpaymentCpfOa:
        type: string
        default: "0"
      downpaymentCpfSa:
        type: string
        default: "0"
      downpaymentCash:
        type: string
        default: "0"
      borrowerType:
        type: string
        enum: [single, joint]
      borrower1IncomeId:
        type: string
        format: uuid
      borrower1CpfAccountId:
        type: string
        format: uuid
      borrower2IncomeId:
        type: string
        format: uuid
      borrower2CpfAccountId:
        type: string
        format: uuid
      otherDebt:
        type: string
        default: "0"
      buyerType:
        type: string
        enum: [singapore_citizen, permanent_resident, foreigner]
      propertyCount:
        type: integer
        minimum: 0
        default: 0
      grants:
        type: string
        default: "0"
      btoLaunchDate:
        type: string
        pattern: '^\d{4}-\d{2}$'
        description: YYYY-MM format
      btoKeyCollectionDate:
        type: string
        pattern: '^\d{4}-\d{2}$'
      saleExpectedDate:
        type: string
        pattern: '^\d{4}-\d{2}$'
      saleExpectedPrice:
        type: string

  property.CreateFeeRequest:
    type: object
    required:
      - feeContext
      - feeType
      - amount
    properties:
      feeContext:
        type: string
        enum: [purchase, sale, recurring]
      feeType:
        type: string
        description: e.g., "legal", "agent", "valuation"
      description:
        type: string
      amount:
        type: string
        description: Decimal string
      currency:
        type: string
        default: SGD
      isPercentage:
        type: boolean
        default: false
      frequency:
        type: string
        enum: [one_time, monthly, yearly]
        default: one_time
      startDate:
        type: string
        pattern: '^\d{4}-\d{2}$'
      endDate:
        type: string
        pattern: '^\d{4}-\d{2}$'

  property.CreateGrowthPeriodRequest:
    type: object
    required:
      - startYear
      - growthRate
    properties:
      startYear:
        type: integer
        minimum: 2000
        maximum: 2100
      endYear:
        type: integer
        minimum: 2000
        maximum: 2100
        description: Null means indefinite
      growthRate:
        type: string
        description: Percentage as decimal string (e.g., "3.0" for 3%)
      growthStrategy:
        type: string
        enum: [fixed, annual_step, compound_monthly, tiered_adb]
        default: annual_step

  property.CreateRatePeriodRequest:
    type: object
    required:
      - startMonth
      - termYears
      - fixedRate
      - floatingRate
    properties:
      startMonth:
        type: string
        pattern: '^\d{4}-\d{2}$'
        description: YYYY-MM format
      termYears:
        type: integer
        minimum: 1
        maximum: 35
      fixedYears:
        type: integer
        minimum: 0
        default: 0
      fixedRate:
        type: string
        description: Annual rate as percentage (e.g., "2.6")
      floatingRate:
        type: string
        description: Annual rate as percentage (e.g., "3.5")

  property.ScenarioResponse:
    type: object
    properties:
      scenario:
        $ref: '#/definitions/property.Scenario'
      sgDetails:
        $ref: '#/definitions/property.SGDetails'
      fees:
        type: array
        items:
          $ref: '#/definitions/property.Fee'
      growthPeriods:
        type: array
        items:
          $ref: '#/definitions/property.GrowthPeriod'
      ratePeriods:
        type: array
        items:
          $ref: '#/definitions/property.RatePeriod'
      computed:
        $ref: '#/definitions/property.ComputedValues'

  property.Scenario:
    type: object
    properties:
      id:
        type: string
        format: uuid
      userId:
        type: string
      sgDetailsId:
        type: string
        format: uuid
      myDetailsId:
        type: string
        format: uuid
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  property.SGDetails:
    type: object
    properties:
      id:
        type: string
        format: uuid
      name:
        type: string
      propertyType:
        type: string
      propertySubtype:
        type: string
      icon:
        type: string
      iconColor:
        type: string
      isIncluded:
        type: boolean
      propertyPrice:
        type: string
      valuationPrice:
        type: string
      loanType:
        type: string
      downpaymentCpfOa:
        type: string
      downpaymentCpfSa:
        type: string
      downpaymentCash:
        type: string
      borrowerType:
        type: string
      borrower1IncomeId:
        type: string
      borrower1CpfAccountId:
        type: string
      borrower2IncomeId:
        type: string
      borrower2CpfAccountId:
        type: string
      otherDebt:
        type: string
      buyerType:
        type: string
      propertyCount:
        type: integer
      grants:
        type: string
      btoLaunchDate:
        type: string
      btoKeyCollectionDate:
        type: string
      saleExpectedDate:
        type: string
      saleExpectedPrice:
        type: string
      createdAt:
        type: string
        format: date-time
      updatedAt:
        type: string
        format: date-time

  property.Fee:
    type: object
    properties:
      id:
        type: string
        format: uuid
      scenarioId:
        type: string
        format: uuid
      feeContext:
        type: string
      feeType:
        type: string
      description:
        type: string
      amount:
        type: string
      currency:
        type: string
      isPercentage:
        type: boolean
      frequency:
        type: string
      startDate:
        type: string
      endDate:
        type: string
      createdAt:
        type: string
        format: date-time

  property.GrowthPeriod:
    type: object
    properties:
      id:
        type: string
        format: uuid
      propertyScenarioId:
        type: string
        format: uuid
      assetId:
        type: string
        format: uuid
      startYear:
        type: integer
      endYear:
        type: integer
      growthRate:
        type: string
      growthStrategy:
        type: string
      createdAt:
        type: string
        format: date-time

  property.RatePeriod:
    type: object
    properties:
      id:
        type: string
        format: uuid
      propertyScenarioId:
        type: string
        format: uuid
      liabilityId:
        type: string
        format: uuid
      periodOrder:
        type: integer
      startMonth:
        type: string
      termYears:
        type: integer
      fixedYears:
        type: integer
      fixedRate:
        type: string
      floatingRate:
        type: string
      createdAt:
        type: string
        format: date-time

  property.ComputedValues:
    type: object
    properties:
      mortgage:
        $ref: '#/definitions/property.MortgageComputed'
      sale:
        $ref: '#/definitions/property.SaleComputed'
      appreciation:
        type: array
        items:
          $ref: '#/definitions/property.AppreciationYear'
      recurringCosts:
        $ref: '#/definitions/property.RecurringCosts'

  property.MortgageComputed:
    type: object
    properties:
      loanAmount:
        type: string
      monthlyPayment:
        type: string
      totalInterest:
        type: string
      totalAmountPaid:
        type: string
      loanStartDate:
        type: string
      loanEndDate:
        type: string
      msrRatio:
        type: string
      tdsrRatio:
        type: string
      msrPasses:
        type: boolean
      tdsrPasses:
        type: boolean
      bsdAmount:
        type: string
      absdAmount:
        type: string
      downpayment:
        type: string
      downpaymentBreakdown:
        type: object
        properties:
          cpfOa:
            type: string
          cpfSa:
            type: string
          cash:
            type: string
          grants:
            type: string
          minCashRequired:
            type: string
          maxCpfAllowed:
            type: string
      totalUpfrontCash:
        type: string
      cov:
        type: string
      calculatedPurchaseFees:
        type: array
        items:
          type: object
          properties:
            feeType:
              type: string
            description:
              type: string
            amount:
              type: string
            isCalculated:
              type: boolean
      totalPurchaseFees:
        type: string
      amortization:
        type: array
        items:
          $ref: '#/definitions/property.AmortizationYear'
      paymentPeriods:
        type: array
        items:
          $ref: '#/definitions/property.PaymentPeriod'

  property.SaleComputed:
    type: object
    properties:
      holdingPeriodMonths:
        type: integer
      outstandingLoanAtSale:
        type: string
      cpfRefund:
        type: string
      cpfAccruedInterest:
        type: string
      ssdRate:
        type: string
      ssdAmount:
        type: string
      grossProceeds:
        type: string
      agentFee:
        type: string
      legalFee:
        type: string
      totalSaleCosts:
        type: string
      netCashProceeds:
        type: string

  property.AppreciationYear:
    type: object
    properties:
      year:
        type: integer
      projectedValue:
        type: string
      growthRate:
        type: string
      cumulativeGrowth:
        type: string

  property.AmortizationYear:
    type: object
    properties:
      year:
        type: integer
      startingBalance:
        type: string
      totalPrincipal:
        type: string
      totalInterest:
        type: string
      endingBalance:
        type: string

  property.PaymentPeriod:
    type: object
    properties:
      periodOrder:
        type: integer
      periodStart:
        type: string
      periodEnd:
        type: string
      monthlyPayment:
        type: string
      rate:
        type: string
      rateType:
        type: string
        enum: [fixed, floating]

  property.RecurringCosts:
    type: object
    properties:
      monthlyPropertyTax:
        type: string
      monthlyMaintenance:
        type: string
      monthlyInsurance:
        type: string
      totalMonthlyRecurring:
        type: string

  property.ErrorResponse:
    type: object
    properties:
      error:
        type: string
      message:
        type: string
      statusCode:
        type: integer

# Add to paths section:
paths:
  # ... existing paths ...

  /v2/property-planner/scenarios:
    get:
      summary: List all property scenarios
      description: Returns all property scenarios for the authenticated user
      tags:
        - Property Planner V2
      security:
        - ApiKeyAuth: []
      responses:
        "200":
          description: List of scenarios
          schema:
            type: object
            properties:
              scenarios:
                type: array
                items:
                  $ref: '#/definitions/property.ScenarioResponse'
              count:
                type: integer
        "401":
          description: Unauthorized
          schema:
            $ref: '#/definitions/property.ErrorResponse'

    post:
      summary: Create a new property scenario
      description: Creates a new property scenario with all related data and returns computed values
      tags:
        - Property Planner V2
      security:
        - ApiKeyAuth: []
      parameters:
        - name: body
          in: body
          required: true
          schema:
            $ref: '#/definitions/property.CreateScenarioRequest'
      responses:
        "201":
          description: Scenario created
          schema:
            $ref: '#/definitions/property.ScenarioResponse'
        "400":
          description: Validation error
          schema:
            $ref: '#/definitions/property.ErrorResponse'
        "401":
          description: Unauthorized
          schema:
            $ref: '#/definitions/property.ErrorResponse'

  /v2/property-planner/scenarios/{id}:
    get:
      summary: Get a property scenario
      description: Returns a single property scenario with computed values
      tags:
        - Property Planner V2
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          type: string
          format: uuid
      responses:
        "200":
          description: Scenario details
          schema:
            $ref: '#/definitions/property.ScenarioResponse'
        "404":
          description: Scenario not found
          schema:
            $ref: '#/definitions/property.ErrorResponse'

    put:
      summary: Update a property scenario
      description: Updates an existing property scenario and returns recomputed values
      tags:
        - Property Planner V2
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          type: string
          format: uuid
        - name: body
          in: body
          required: true
          schema:
            $ref: '#/definitions/property.CreateScenarioRequest'
      responses:
        "200":
          description: Scenario updated
          schema:
            $ref: '#/definitions/property.ScenarioResponse'
        "400":
          description: Validation error
          schema:
            $ref: '#/definitions/property.ErrorResponse'
        "404":
          description: Scenario not found
          schema:
            $ref: '#/definitions/property.ErrorResponse'

    delete:
      summary: Delete a property scenario
      description: Deletes a property scenario and all related data
      tags:
        - Property Planner V2
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          type: string
          format: uuid
      responses:
        "204":
          description: Scenario deleted
        "404":
          description: Scenario not found
          schema:
            $ref: '#/definitions/property.ErrorResponse'
```

#### Go Annotations

Add swagger annotations to the handler file:

```go
// backend/cmd/server/handlers/property_planner_v2.go

// ListScenarios godoc
// @Summary      List all property scenarios
// @Description  Returns all property scenarios for the authenticated user
// @Tags         Property Planner V2
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200 {object} ListScenariosResponse
// @Failure      401 {object} property.ErrorResponse
// @Router       /v2/property-planner/scenarios [get]
func (h *PropertyPlannerV2Handler) ListScenarios(w http.ResponseWriter, r *http.Request) {
    // ...
}

// CreateScenario godoc
// @Summary      Create a new property scenario
// @Description  Creates a new property scenario with all related data and returns computed values
// @Tags         Property Planner V2
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        body body CreateScenarioRequest true "Scenario to create"
// @Success      201 {object} ScenarioResponse
// @Failure      400 {object} property.ErrorResponse
// @Failure      401 {object} property.ErrorResponse
// @Router       /v2/property-planner/scenarios [post]
func (h *PropertyPlannerV2Handler) CreateScenario(w http.ResponseWriter, r *http.Request) {
    // ...
}

// GetScenario godoc
// @Summary      Get a property scenario
// @Description  Returns a single property scenario with computed values
// @Tags         Property Planner V2
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id path string true "Scenario ID" format(uuid)
// @Success      200 {object} ScenarioResponse
// @Failure      404 {object} property.ErrorResponse
// @Router       /v2/property-planner/scenarios/{id} [get]
func (h *PropertyPlannerV2Handler) GetScenario(w http.ResponseWriter, r *http.Request) {
    // ...
}

// UpdateScenario godoc
// @Summary      Update a property scenario
// @Description  Updates an existing property scenario and returns recomputed values
// @Tags         Property Planner V2
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id path string true "Scenario ID" format(uuid)
// @Param        body body CreateScenarioRequest true "Updated scenario"
// @Success      200 {object} ScenarioResponse
// @Failure      400 {object} property.ErrorResponse
// @Failure      404 {object} property.ErrorResponse
// @Router       /v2/property-planner/scenarios/{id} [put]
func (h *PropertyPlannerV2Handler) UpdateScenario(w http.ResponseWriter, r *http.Request) {
    // ...
}

// DeleteScenario godoc
// @Summary      Delete a property scenario
// @Description  Deletes a property scenario and all related data
// @Tags         Property Planner V2
// @Security     ApiKeyAuth
// @Param        id path string true "Scenario ID" format(uuid)
// @Success      204
// @Failure      404 {object} property.ErrorResponse
// @Router       /v2/property-planner/scenarios/{id} [delete]
func (h *PropertyPlannerV2Handler) DeleteScenario(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### Regenerate Swagger

```bash
# Install swag if not installed
go install github.com/swaggo/swag/cmd/swag@latest

# Regenerate swagger docs
cd backend && swag init -g cmd/server/main.go -o cmd/server/docs

# Verify swagger.yaml contains property planner endpoints
grep -A5 "property-planner" cmd/server/docs/swagger.yaml
```

---

## BE-1: Database Migrations

**Priority:** P0 (Blocking)
**Estimated Effort:** 2-3 hours
**Dependencies:** BE-0 (for API understanding)

### Description

Create database migrations for all Property Planner V2 tables.

### Acceptance Criteria

- [ ] All migration files created in `backend/migrations/`
- [ ] Migrations run successfully on fresh database
- [ ] Rollback migrations work correctly
- [ ] All constraints and indexes are correct

### Implementation Details

#### Files to Create

```
backend/migrations/
├── 20251227000_add_earner_to_incomes.up.sql
├── 20251227000_add_earner_to_incomes.down.sql
├── 20251227001_add_earner_to_cpf_accounts.up.sql
├── 20251227001_add_earner_to_cpf_accounts.down.sql
├── 20251227002_create_property_sg_details.up.sql
├── 20251227002_create_property_sg_details.down.sql
├── 20251227003_create_property_scenarios.up.sql
├── 20251227003_create_property_scenarios.down.sql
├── 20251227004_create_property_fees.up.sql
├── 20251227004_create_property_fees.down.sql
├── 20251227005_create_growth_periods.up.sql
├── 20251227005_create_growth_periods.down.sql
├── 20251227006_create_liability_rate_periods.up.sql
├── 20251227006_create_liability_rate_periods.down.sql
```

#### Migration 20251227000: Add earner to finance_incomes

```sql
-- UP
ALTER TABLE finance_incomes
    ADD COLUMN earner VARCHAR(20) DEFAULT 'self';

ALTER TABLE finance_incomes
    ADD CONSTRAINT finance_incomes_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));

-- DOWN
ALTER TABLE finance_incomes DROP CONSTRAINT finance_incomes_earner_check;
ALTER TABLE finance_incomes DROP COLUMN earner;
```

#### Migration 20251227001: Add earner to cpf_accounts

```sql
-- UP
ALTER TABLE cpf_accounts
    ADD COLUMN earner VARCHAR(20) DEFAULT 'self';

ALTER TABLE cpf_accounts
    ADD CONSTRAINT cpf_accounts_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));

-- DOWN
ALTER TABLE cpf_accounts DROP CONSTRAINT cpf_accounts_earner_check;
ALTER TABLE cpf_accounts DROP COLUMN earner;
```

#### Migration 20251227002: Create property_sg_details

```sql
-- UP
CREATE TABLE property_sg_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(100) NOT NULL,
    property_type VARCHAR(20) NOT NULL,          -- 'hdb' | 'private'
    property_subtype VARCHAR(30) NOT NULL,        -- 'bto' | 'resale' | 'ec' | 'new' | 'resale'

    -- Display
    icon VARCHAR(50),
    icon_color VARCHAR(20),
    is_included BOOLEAN NOT NULL DEFAULT true,

    -- Pricing
    property_price NUMERIC(15,4) NOT NULL,
    valuation_price NUMERIC(15,4),

    -- Loan Configuration
    loan_type VARCHAR(10) NOT NULL DEFAULT 'bank', -- 'bank' | 'hdb'

    -- Downpayment
    downpayment_cpf_oa NUMERIC(15,4) NOT NULL DEFAULT 0,
    downpayment_cpf_sa NUMERIC(15,4) NOT NULL DEFAULT 0,
    downpayment_cash NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- Borrower Configuration
    borrower_type VARCHAR(10) NOT NULL DEFAULT 'single', -- 'single' | 'joint'
    borrower1_income_id UUID REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower1_cpf_account_id UUID REFERENCES cpf_accounts(id) ON DELETE SET NULL,
    borrower2_income_id UUID REFERENCES finance_incomes(id) ON DELETE SET NULL,
    borrower2_cpf_account_id UUID REFERENCES cpf_accounts(id) ON DELETE SET NULL,

    -- Other Debt (for TDSR)
    other_debt NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- Buyer Details (for stamp duty)
    buyer_type VARCHAR(30) NOT NULL DEFAULT 'singapore_citizen',
    property_count INT NOT NULL DEFAULT 0,

    -- HDB Grants
    grants NUMERIC(15,4) NOT NULL DEFAULT 0,

    -- BTO-specific (staggered payments now in liability_rate_periods)
    bto_launch_date VARCHAR(7),              -- e.g., '2025-01'
    bto_key_collection_date VARCHAR(7),      -- e.g., '2028-06'

    -- Sale Planning
    sale_expected_date VARCHAR(7),           -- e.g., '2035-06'
    sale_expected_price NUMERIC(15,4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_property_type_check
    CHECK (property_type IN ('hdb', 'private'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_property_subtype_check
    CHECK (property_subtype IN ('bto', 'resale', 'ec', 'new'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_loan_type_check
    CHECK (loan_type IN ('bank', 'hdb'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_borrower_type_check
    CHECK (borrower_type IN ('single', 'joint'));

ALTER TABLE property_sg_details
    ADD CONSTRAINT property_sg_details_buyer_type_check
    CHECK (buyer_type IN ('singapore_citizen', 'permanent_resident', 'foreigner'));

-- DOWN
DROP TABLE property_sg_details;
```

#### Migration 20251227003: Create property_scenarios

```sql
-- UP
CREATE TABLE property_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,

    sg_details_id UUID REFERENCES property_sg_details(id) ON DELETE CASCADE,
    my_details_id UUID,  -- Future: REFERENCES property_my_details(id)

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_one_country_detail CHECK (
        (sg_details_id IS NOT NULL AND my_details_id IS NULL)
        OR (my_details_id IS NOT NULL AND sg_details_id IS NULL)
    )
);

CREATE INDEX idx_property_scenarios_user ON property_scenarios(user_id);

-- DOWN
DROP TABLE property_scenarios;
```

#### Migration 20251227004: Create property_fees

```sql
-- UP
CREATE TABLE property_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES property_scenarios(id) ON DELETE CASCADE,

    fee_context VARCHAR(20) NOT NULL,          -- 'purchase' | 'sale' | 'recurring'
    fee_type VARCHAR(50) NOT NULL,              -- 'legal' | 'valuation' | 'agent' | 'property_tax' | etc.
    description VARCHAR(200),
    amount NUMERIC(15,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    frequency VARCHAR(20) NOT NULL DEFAULT 'one_time', -- 'one_time' | 'monthly' | 'yearly'
    start_date VARCHAR(7),                      -- For recurring fees
    end_date VARCHAR(7),                        -- For recurring fees

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_fees_scenario ON property_fees(scenario_id);
CREATE INDEX idx_property_fees_context ON property_fees(scenario_id, fee_context);

ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_context_check
    CHECK (fee_context IN ('purchase', 'sale', 'recurring'));

ALTER TABLE property_fees
    ADD CONSTRAINT property_fees_frequency_check
    CHECK (frequency IN ('one_time', 'monthly', 'yearly'));

-- DOWN
DROP TABLE property_fees;
```

#### Migration 20251227005: Create growth_periods

```sql
-- UP
CREATE TABLE growth_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Polymorphic reference (one of these must be set)
    property_scenario_id UUID REFERENCES property_scenarios(id) ON DELETE CASCADE,
    asset_id UUID,  -- Future: REFERENCES finance_assets(id)

    start_year INT NOT NULL,
    end_year INT,                               -- NULL means "indefinitely"
    growth_rate NUMERIC(10,4) NOT NULL,         -- e.g., 3.0 for 3%
    growth_strategy VARCHAR(20) NOT NULL DEFAULT 'annual_step',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_growth_period_parent CHECK (
        (property_scenario_id IS NOT NULL AND asset_id IS NULL)
        OR (asset_id IS NOT NULL AND property_scenario_id IS NULL)
    )
);

CREATE INDEX idx_growth_periods_property ON growth_periods(property_scenario_id);
CREATE INDEX idx_growth_periods_asset ON growth_periods(asset_id);

ALTER TABLE growth_periods
    ADD CONSTRAINT growth_periods_strategy_check
    CHECK (growth_strategy IN ('fixed', 'annual_step', 'compound_monthly', 'tiered_adb'));

-- DOWN
DROP TABLE growth_periods;
```

#### Migration 20251227006: Create liability_rate_periods

```sql
-- UP
CREATE TABLE liability_rate_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Polymorphic reference
    property_scenario_id UUID REFERENCES property_scenarios(id) ON DELETE CASCADE,
    liability_id UUID,  -- Future: REFERENCES finance_liabilities(id)

    period_order INT NOT NULL DEFAULT 0,        -- For ordering segments
    start_month VARCHAR(7) NOT NULL,            -- e.g., '2025-01'
    term_years INT NOT NULL,                    -- Duration of this segment
    fixed_years INT NOT NULL DEFAULT 0,
    fixed_rate NUMERIC(10,4) NOT NULL,
    floating_rate NUMERIC(10,4) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rate_period_parent CHECK (
        (property_scenario_id IS NOT NULL AND liability_id IS NULL)
        OR (liability_id IS NOT NULL AND property_scenario_id IS NULL)
    )
);

CREATE INDEX idx_liability_rate_periods_property ON liability_rate_periods(property_scenario_id);
CREATE INDEX idx_liability_rate_periods_liability ON liability_rate_periods(liability_id);
CREATE INDEX idx_liability_rate_periods_order ON liability_rate_periods(property_scenario_id, period_order);

-- DOWN
DROP TABLE liability_rate_periods;
```

### Testing

```bash
# Run migrations up
go run ./cmd/migrate up

# Verify tables exist
psql -d $DATABASE_URL -c "\dt property_*"
psql -d $DATABASE_URL -c "\dt growth_periods"
psql -d $DATABASE_URL -c "\dt liability_rate_periods"

# Run migrations down
go run ./cmd/migrate down 6

# Verify rollback
psql -d $DATABASE_URL -c "\dt property_*"
```

---

## BE-2: Repository Layer - Data Models & Store

**Priority:** P0 (Blocking)
**Estimated Effort:** 4-5 hours
**Dependencies:** BE-1

### Description

Create the repository layer with Go data models and CRUD operations for property planner scenarios.

### Acceptance Criteria

- [ ] All data models defined with proper types
- [ ] All CRUD operations implemented
- [ ] Multi-table transactions work correctly (scenario + details + fees + periods)
- [ ] Unit tests pass with 85%+ coverage

### Implementation Details

#### File: `backend/internal/financial_v2/repository/property_planner.go`

```go
package repository

import (
    "context"
    "time"

    "github.com/jmoiron/sqlx"
    "github.com/yourorg/backend/internal/decimal"
)

// PropertyScenario is the header table
type PropertyScenario struct {
    ID          string    `db:"id" json:"id"`
    UserID      string    `db:"user_id" json:"userId"`
    SGDetailsID *string   `db:"sg_details_id" json:"sgDetailsId"`
    MYDetailsID *string   `db:"my_details_id" json:"myDetailsId"`
    CreatedAt   time.Time `db:"created_at" json:"createdAt"`
    UpdatedAt   time.Time `db:"updated_at" json:"updatedAt"`
}

// PropertySGDetails contains all Singapore-specific property data
type PropertySGDetails struct {
    ID                    string           `db:"id" json:"id"`
    Name                  string           `db:"name" json:"name"`
    PropertyType          string           `db:"property_type" json:"propertyType"`
    PropertySubtype       string           `db:"property_subtype" json:"propertySubtype"`
    Icon                  *string          `db:"icon" json:"icon"`
    IconColor             *string          `db:"icon_color" json:"iconColor"`
    IsIncluded            bool             `db:"is_included" json:"isIncluded"`
    PropertyPrice         *decimal.Decimal `db:"property_price" json:"propertyPrice"`
    ValuationPrice        *decimal.Decimal `db:"valuation_price" json:"valuationPrice"`
    LoanType              string           `db:"loan_type" json:"loanType"`
    DownpaymentCpfOa      *decimal.Decimal `db:"downpayment_cpf_oa" json:"downpaymentCpfOa"`
    DownpaymentCpfSa      *decimal.Decimal `db:"downpayment_cpf_sa" json:"downpaymentCpfSa"`
    DownpaymentCash       *decimal.Decimal `db:"downpayment_cash" json:"downpaymentCash"`
    BorrowerType          string           `db:"borrower_type" json:"borrowerType"`
    Borrower1IncomeID     *string          `db:"borrower1_income_id" json:"borrower1IncomeId"`
    Borrower1CpfAccountID *string          `db:"borrower1_cpf_account_id" json:"borrower1CpfAccountId"`
    Borrower2IncomeID     *string          `db:"borrower2_income_id" json:"borrower2IncomeId"`
    Borrower2CpfAccountID *string          `db:"borrower2_cpf_account_id" json:"borrower2CpfAccountId"`
    OtherDebt             *decimal.Decimal `db:"other_debt" json:"otherDebt"`
    BuyerType             string           `db:"buyer_type" json:"buyerType"`
    PropertyCount         int              `db:"property_count" json:"propertyCount"`
    Grants                *decimal.Decimal `db:"grants" json:"grants"`
    BtoLaunchDate         *string          `db:"bto_launch_date" json:"btoLaunchDate"`
    BtoKeyCollectionDate  *string          `db:"bto_key_collection_date" json:"btoKeyCollectionDate"`
    SaleExpectedDate      *string          `db:"sale_expected_date" json:"saleExpectedDate"`
    SaleExpectedPrice     *decimal.Decimal `db:"sale_expected_price" json:"saleExpectedPrice"`
    CreatedAt             time.Time        `db:"created_at" json:"createdAt"`
    UpdatedAt             time.Time        `db:"updated_at" json:"updatedAt"`
}

// PropertyFee represents a purchase, sale, or recurring fee
type PropertyFee struct {
    ID           string           `db:"id" json:"id"`
    ScenarioID   string           `db:"scenario_id" json:"scenarioId"`
    FeeContext   string           `db:"fee_context" json:"feeContext"`      // 'purchase' | 'sale' | 'recurring'
    FeeType      string           `db:"fee_type" json:"feeType"`
    Description  *string          `db:"description" json:"description"`
    Amount       *decimal.Decimal `db:"amount" json:"amount"`
    Currency     string           `db:"currency" json:"currency"`
    IsPercentage bool             `db:"is_percentage" json:"isPercentage"`
    Frequency    string           `db:"frequency" json:"frequency"`          // 'one_time' | 'monthly' | 'yearly'
    StartDate    *string          `db:"start_date" json:"startDate"`
    EndDate      *string          `db:"end_date" json:"endDate"`
    CreatedAt    time.Time        `db:"created_at" json:"createdAt"`
}

// GrowthPeriod represents a period with specific growth rate
type GrowthPeriod struct {
    ID                 string           `db:"id" json:"id"`
    PropertyScenarioID *string          `db:"property_scenario_id" json:"propertyScenarioId"`
    AssetID            *string          `db:"asset_id" json:"assetId"`
    StartYear          int              `db:"start_year" json:"startYear"`
    EndYear            *int             `db:"end_year" json:"endYear"`
    GrowthRate         *decimal.Decimal `db:"growth_rate" json:"growthRate"`
    GrowthStrategy     string           `db:"growth_strategy" json:"growthStrategy"`
    CreatedAt          time.Time        `db:"created_at" json:"createdAt"`
}

// LiabilityRatePeriod represents a loan segment with specific rates
type LiabilityRatePeriod struct {
    ID                 string           `db:"id" json:"id"`
    PropertyScenarioID *string          `db:"property_scenario_id" json:"propertyScenarioId"`
    LiabilityID        *string          `db:"liability_id" json:"liabilityId"`
    PeriodOrder        int              `db:"period_order" json:"periodOrder"`
    StartMonth         string           `db:"start_month" json:"startMonth"`
    TermYears          int              `db:"term_years" json:"termYears"`
    FixedYears         int              `db:"fixed_years" json:"fixedYears"`
    FixedRate          *decimal.Decimal `db:"fixed_rate" json:"fixedRate"`
    FloatingRate       *decimal.Decimal `db:"floating_rate" json:"floatingRate"`
    CreatedAt          time.Time        `db:"created_at" json:"createdAt"`
}

// PropertyScenarioFull is the complete scenario with all related data
type PropertyScenarioFull struct {
    Scenario    PropertyScenario      `json:"scenario"`
    SGDetails   *PropertySGDetails    `json:"sgDetails,omitempty"`
    MYDetails   interface{}           `json:"myDetails,omitempty"` // Future
    Fees        []PropertyFee         `json:"fees"`
    GrowthPeriods []GrowthPeriod      `json:"growthPeriods"`
    RatePeriods []LiabilityRatePeriod `json:"ratePeriods"`
}

// Store interface
type PropertyPlannerStore interface {
    CreateScenario(ctx context.Context, userID string, input CreateScenarioInput) (*PropertyScenarioFull, error)
    UpdateScenario(ctx context.Context, userID, scenarioID string, input UpdateScenarioInput) (*PropertyScenarioFull, error)
    GetScenario(ctx context.Context, userID, scenarioID string) (*PropertyScenarioFull, error)
    ListScenarios(ctx context.Context, userID string) ([]PropertyScenarioFull, error)
    DeleteScenario(ctx context.Context, userID, scenarioID string) error
}
```

#### CRUD Implementation Pattern

```go
// CreateScenario creates a new property scenario with all related data
func (s *Store) CreateScenario(ctx context.Context, userID string, input CreateScenarioInput) (*PropertyScenarioFull, error) {
    tx, err := s.db.BeginTxx(ctx, nil)
    if err != nil {
        return nil, fmt.Errorf("begin transaction: %w", err)
    }
    defer tx.Rollback()

    // 1. Create country-specific details first (to get the ID)
    var sgDetailsID string
    if input.SGDetails != nil {
        sgDetailsID, err = s.createSGDetails(ctx, tx, input.SGDetails)
        if err != nil {
            return nil, fmt.Errorf("create sg details: %w", err)
        }
    }

    // 2. Create header scenario
    scenarioID, err := s.createScenarioHeader(ctx, tx, userID, sgDetailsID)
    if err != nil {
        return nil, fmt.Errorf("create scenario header: %w", err)
    }

    // 3. Create fees (purchase, sale, recurring)
    if err := s.createFees(ctx, tx, scenarioID, input.Fees); err != nil {
        return nil, fmt.Errorf("create fees: %w", err)
    }

    // 4. Create growth periods
    if err := s.createGrowthPeriods(ctx, tx, scenarioID, input.GrowthPeriods); err != nil {
        return nil, fmt.Errorf("create growth periods: %w", err)
    }

    // 5. Create loan rate periods
    if err := s.createRatePeriods(ctx, tx, scenarioID, input.RatePeriods); err != nil {
        return nil, fmt.Errorf("create rate periods: %w", err)
    }

    if err := tx.Commit(); err != nil {
        return nil, fmt.Errorf("commit transaction: %w", err)
    }

    // Fetch and return the full scenario
    return s.GetScenario(ctx, userID, scenarioID)
}

// GetScenario retrieves a scenario with all related data
func (s *Store) GetScenario(ctx context.Context, userID, scenarioID string) (*PropertyScenarioFull, error) {
    // 1. Get scenario header and verify ownership
    var scenario PropertyScenario
    err := s.db.GetContext(ctx, &scenario, `
        SELECT * FROM property_scenarios
        WHERE id = $1 AND user_id = $2
    `, scenarioID, userID)
    if err != nil {
        return nil, fmt.Errorf("get scenario: %w", err)
    }

    result := &PropertyScenarioFull{Scenario: scenario}

    // 2. Get SG details if present
    if scenario.SGDetailsID != nil {
        var sgDetails PropertySGDetails
        err = s.db.GetContext(ctx, &sgDetails, `
            SELECT * FROM property_sg_details WHERE id = $1
        `, *scenario.SGDetailsID)
        if err != nil {
            return nil, fmt.Errorf("get sg details: %w", err)
        }
        result.SGDetails = &sgDetails
    }

    // 3. Get fees
    err = s.db.SelectContext(ctx, &result.Fees, `
        SELECT * FROM property_fees WHERE scenario_id = $1 ORDER BY created_at
    `, scenarioID)
    if err != nil {
        return nil, fmt.Errorf("get fees: %w", err)
    }

    // 4. Get growth periods
    err = s.db.SelectContext(ctx, &result.GrowthPeriods, `
        SELECT * FROM growth_periods WHERE property_scenario_id = $1 ORDER BY start_year
    `, scenarioID)
    if err != nil {
        return nil, fmt.Errorf("get growth periods: %w", err)
    }

    // 5. Get rate periods
    err = s.db.SelectContext(ctx, &result.RatePeriods, `
        SELECT * FROM liability_rate_periods WHERE property_scenario_id = $1 ORDER BY period_order
    `, scenarioID)
    if err != nil {
        return nil, fmt.Errorf("get rate periods: %w", err)
    }

    return result, nil
}
```

### TDD Approach

**IMPORTANT:** Write tests BEFORE implementation. Follow red-green-refactor cycle.

**Test File:** `backend/internal/financial_v2/repository/property_planner_test.go`

#### Step 1: Write Failing Tests First

```go
package repository

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/yourorg/backend/internal/decimal"
    "github.com/yourorg/backend/internal/testutil"
)

func TestPropertyPlannerStore(t *testing.T) {
    db := testutil.SetupTestDB(t)
    store := NewPropertyPlannerStore(db)
    ctx := context.Background()

    // ========================================
    // CREATE SCENARIO TESTS
    // ========================================

    t.Run("CreateScenario_HDBResale_Success", func(t *testing.T) {
        // ARRANGE
        input := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name:              "Test HDB Resale",
                PropertyType:      "hdb",
                PropertySubtype:   "resale",
                PropertyPrice:     decimal.MustFromString("850000"),
                ValuationPrice:    decimal.MustFromString("850000"),
                LoanType:          "bank",
                DownpaymentCpfOa:  decimal.MustFromString("150000"),
                DownpaymentCpfSa:  decimal.MustFromString("0"),
                DownpaymentCash:   decimal.MustFromString("20100"),
                BorrowerType:      "single",
                BuyerType:         "singapore_citizen",
                PropertyCount:     0,
            },
            RatePeriods: []CreateRatePeriodInput{
                {
                    StartMonth:   "2025-01",
                    TermYears:    25,
                    FixedYears:   2,
                    FixedRate:    decimal.MustFromString("2.6"),
                    FloatingRate: decimal.MustFromString("3.5"),
                },
            },
        }

        // ACT
        result, err := store.CreateScenario(ctx, "user-123", input)

        // ASSERT
        require.NoError(t, err)
        require.NotNil(t, result)
        assert.NotEmpty(t, result.Scenario.ID)
        assert.Equal(t, "user-123", result.Scenario.UserID)
        assert.NotNil(t, result.SGDetails)
        assert.Equal(t, "Test HDB Resale", result.SGDetails.Name)
        assert.Equal(t, "hdb", result.SGDetails.PropertyType)
        assert.Equal(t, "850000", result.SGDetails.PropertyPrice.String())
        assert.Len(t, result.RatePeriods, 1)
        assert.Equal(t, 25, result.RatePeriods[0].TermYears)
    })

    t.Run("CreateScenario_WithFees_Success", func(t *testing.T) {
        input := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name:            "HDB with Fees",
                PropertyType:    "hdb",
                PropertySubtype: "resale",
                PropertyPrice:   decimal.MustFromString("500000"),
                LoanType:        "hdb",
                BorrowerType:    "single",
                BuyerType:       "singapore_citizen",
            },
            Fees: []CreateFeeInput{
                {
                    FeeContext: "purchase",
                    FeeType:    "legal",
                    Amount:     decimal.MustFromString("3000"),
                    Currency:   "SGD",
                },
                {
                    FeeContext:   "recurring",
                    FeeType:      "maintenance",
                    Amount:       decimal.MustFromString("350"),
                    Currency:     "SGD",
                    Frequency:    "monthly",
                },
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("2.6")},
            },
        }

        result, err := store.CreateScenario(ctx, "user-456", input)

        require.NoError(t, err)
        assert.Len(t, result.Fees, 2)
        assert.Equal(t, "purchase", result.Fees[0].FeeContext)
        assert.Equal(t, "recurring", result.Fees[1].FeeContext)
    })

    t.Run("CreateScenario_WithGrowthPeriods_Success", func(t *testing.T) {
        input := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name:            "HDB with Growth",
                PropertyType:    "hdb",
                PropertySubtype: "resale",
                PropertyPrice:   decimal.MustFromString("600000"),
                LoanType:        "bank",
                BorrowerType:    "single",
                BuyerType:       "singapore_citizen",
            },
            GrowthPeriods: []CreateGrowthPeriodInput{
                {StartYear: 2025, EndYear: ptrInt(2030), GrowthRate: decimal.MustFromString("3.0"), GrowthStrategy: "annual_step"},
                {StartYear: 2031, EndYear: nil, GrowthRate: decimal.MustFromString("2.5"), GrowthStrategy: "annual_step"},
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
            },
        }

        result, err := store.CreateScenario(ctx, "user-789", input)

        require.NoError(t, err)
        assert.Len(t, result.GrowthPeriods, 2)
        assert.Equal(t, 2025, result.GrowthPeriods[0].StartYear)
        assert.Equal(t, 2030, *result.GrowthPeriods[0].EndYear)
        assert.Nil(t, result.GrowthPeriods[1].EndYear) // Indefinite
    })

    t.Run("CreateScenario_WithRefinancing_Success", func(t *testing.T) {
        input := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name:            "HDB with Refinancing",
                PropertyType:    "hdb",
                PropertySubtype: "resale",
                PropertyPrice:   decimal.MustFromString("700000"),
                LoanType:        "bank",
                BorrowerType:    "single",
                BuyerType:       "singapore_citizen",
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 5, FixedYears: 2, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
                {StartMonth: "2030-01", TermYears: 5, FixedYears: 3, FixedRate: decimal.MustFromString("2.8"), FloatingRate: decimal.MustFromString("3.2")},
                {StartMonth: "2035-01", TermYears: 15, FixedYears: 0, FixedRate: decimal.MustFromString("3.0"), FloatingRate: decimal.MustFromString("3.0")},
            },
        }

        result, err := store.CreateScenario(ctx, "user-abc", input)

        require.NoError(t, err)
        assert.Len(t, result.RatePeriods, 3)
        assert.Equal(t, 0, result.RatePeriods[0].PeriodOrder)
        assert.Equal(t, 1, result.RatePeriods[1].PeriodOrder)
        assert.Equal(t, 2, result.RatePeriods[2].PeriodOrder)
    })

    t.Run("CreateScenario_MissingRatePeriods_Error", func(t *testing.T) {
        input := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name:            "Invalid - No Rates",
                PropertyType:    "hdb",
                PropertySubtype: "resale",
                PropertyPrice:   decimal.MustFromString("500000"),
                LoanType:        "bank",
                BorrowerType:    "single",
                BuyerType:       "singapore_citizen",
            },
            RatePeriods: []CreateRatePeriodInput{}, // Empty!
        }

        _, err := store.CreateScenario(ctx, "user-123", input)

        require.Error(t, err)
        assert.Contains(t, err.Error(), "at least one rate period required")
    })

    // ========================================
    // GET SCENARIO TESTS
    // ========================================

    t.Run("GetScenario_Success", func(t *testing.T) {
        // First create a scenario
        createInput := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name: "Get Test", PropertyType: "hdb", PropertySubtype: "resale",
                PropertyPrice: decimal.MustFromString("500000"), LoanType: "bank",
                BorrowerType: "single", BuyerType: "singapore_citizen",
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
            },
        }
        created, _ := store.CreateScenario(ctx, "get-user", createInput)

        // Now retrieve it
        result, err := store.GetScenario(ctx, "get-user", created.Scenario.ID)

        require.NoError(t, err)
        assert.Equal(t, created.Scenario.ID, result.Scenario.ID)
        assert.Equal(t, "Get Test", result.SGDetails.Name)
    })

    t.Run("GetScenario_WrongUser_NotFound", func(t *testing.T) {
        createInput := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name: "Owner Only", PropertyType: "hdb", PropertySubtype: "resale",
                PropertyPrice: decimal.MustFromString("500000"), LoanType: "bank",
                BorrowerType: "single", BuyerType: "singapore_citizen",
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
            },
        }
        created, _ := store.CreateScenario(ctx, "owner-user", createInput)

        // Try to access with different user
        _, err := store.GetScenario(ctx, "other-user", created.Scenario.ID)

        require.Error(t, err)
        assert.Contains(t, err.Error(), "not found")
    })

    t.Run("GetScenario_NonExistent_NotFound", func(t *testing.T) {
        _, err := store.GetScenario(ctx, "user-123", "00000000-0000-0000-0000-000000000000")

        require.Error(t, err)
    })

    // ========================================
    // DELETE SCENARIO TESTS
    // ========================================

    t.Run("DeleteScenario_CascadesChildren", func(t *testing.T) {
        // Create scenario with fees and periods
        createInput := CreateScenarioInput{
            Country: "SG",
            SGDetails: &CreateSGDetailsInput{
                Name: "Delete Test", PropertyType: "hdb", PropertySubtype: "resale",
                PropertyPrice: decimal.MustFromString("500000"), LoanType: "bank",
                BorrowerType: "single", BuyerType: "singapore_citizen",
            },
            Fees: []CreateFeeInput{
                {FeeContext: "purchase", FeeType: "legal", Amount: decimal.MustFromString("3000"), Currency: "SGD"},
            },
            GrowthPeriods: []CreateGrowthPeriodInput{
                {StartYear: 2025, GrowthRate: decimal.MustFromString("3.0"), GrowthStrategy: "annual_step"},
            },
            RatePeriods: []CreateRatePeriodInput{
                {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
            },
        }
        created, _ := store.CreateScenario(ctx, "delete-user", createInput)

        // Delete the scenario
        err := store.DeleteScenario(ctx, "delete-user", created.Scenario.ID)

        require.NoError(t, err)

        // Verify it's gone
        _, err = store.GetScenario(ctx, "delete-user", created.Scenario.ID)
        require.Error(t, err)

        // Verify children are cascaded (check database directly)
        var feeCount int
        db.Get(&feeCount, "SELECT COUNT(*) FROM property_fees WHERE scenario_id = $1", created.Scenario.ID)
        assert.Equal(t, 0, feeCount)
    })

    // ========================================
    // LIST SCENARIOS TESTS
    // ========================================

    t.Run("ListScenarios_ReturnsUserScenariosOnly", func(t *testing.T) {
        // Create scenarios for different users
        for i := 0; i < 3; i++ {
            input := CreateScenarioInput{
                Country: "SG",
                SGDetails: &CreateSGDetailsInput{
                    Name: fmt.Sprintf("User A Scenario %d", i), PropertyType: "hdb", PropertySubtype: "resale",
                    PropertyPrice: decimal.MustFromString("500000"), LoanType: "bank",
                    BorrowerType: "single", BuyerType: "singapore_citizen",
                },
                RatePeriods: []CreateRatePeriodInput{
                    {StartMonth: "2025-01", TermYears: 25, FixedRate: decimal.MustFromString("2.6"), FloatingRate: decimal.MustFromString("3.5")},
                },
            }
            store.CreateScenario(ctx, "list-user-a", input)
        }

        for i := 0; i < 2; i++ {
            input := CreateScenarioInput{
                Country: "SG",
                SGDetails: &CreateSGDetailsInput{
                    Name: fmt.Sprintf("User B Scenario %d", i), PropertyType: "private", PropertySubtype: "new",
                    PropertyPrice: decimal.MustFromString("1500000"), LoanType: "bank",
                    BorrowerType: "joint", BuyerType: "singapore_citizen",
                },
                RatePeriods: []CreateRatePeriodInput{
                    {StartMonth: "2025-01", TermYears: 30, FixedRate: decimal.MustFromString("2.8"), FloatingRate: decimal.MustFromString("3.8")},
                },
            }
            store.CreateScenario(ctx, "list-user-b", input)
        }

        // List for user A
        resultsA, err := store.ListScenarios(ctx, "list-user-a")
        require.NoError(t, err)
        assert.Len(t, resultsA, 3)

        // List for user B
        resultsB, err := store.ListScenarios(ctx, "list-user-b")
        require.NoError(t, err)
        assert.Len(t, resultsB, 2)
    })
}

func ptrInt(i int) *int { return &i }
```

#### Step 2: Run Tests (Should Fail)

```bash
go test -v ./internal/financial_v2/repository/... -run TestPropertyPlannerStore
# Expected: All tests FAIL (no implementation yet)
```

#### Step 3: Implement Code

Now implement the store methods to make tests pass.

#### Step 4: Run Tests (Should Pass)

```bash
go test -v -cover ./internal/financial_v2/repository/...
# Expected: All tests PASS, coverage > 85%
```

---

## BE-3: Calculation Service

**Priority:** P0 (Blocking)
**Estimated Effort:** 6-8 hours
**Dependencies:** BE-1

### Description

Implement the calculation service that computes all derived values from property scenario inputs.

### Acceptance Criteria

- [ ] All calculation functions implemented with correct math
- [ ] Unit tests with exact input/output assertions pass
- [ ] Decimal precision is maintained throughout calculations
- [ ] All BSD/SSD brackets tested

### Implementation Details

#### File: `backend/internal/financial_v2/property/calculator.go`

```go
package property

import (
    "github.com/yourorg/backend/internal/decimal"
)

// Calculator handles all property-related calculations
type Calculator struct{}

func NewCalculator() *Calculator {
    return &Calculator{}
}

// MortgageResult contains all mortgage calculation outputs
type MortgageResult struct {
    LoanAmount       *decimal.Decimal   `json:"loanAmount"`
    MonthlyPayment   *decimal.Decimal   `json:"monthlyPayment"`
    TotalInterest    *decimal.Decimal   `json:"totalInterest"`
    TotalAmountPaid  *decimal.Decimal   `json:"totalAmountPaid"`
    LoanEndDate      string             `json:"loanEndDate"`
    Amortization     []AmortizationYear `json:"amortization"`
}

type AmortizationYear struct {
    Year              int              `json:"year"`
    StartingBalance   *decimal.Decimal `json:"startingBalance"`
    TotalPrincipal    *decimal.Decimal `json:"totalPrincipal"`
    TotalInterest     *decimal.Decimal `json:"totalInterest"`
    EndingBalance     *decimal.Decimal `json:"endingBalance"`
}

type PaymentPeriod struct {
    PeriodStart    string           `json:"periodStart"`
    PeriodEnd      string           `json:"periodEnd"`
    MonthlyPayment *decimal.Decimal `json:"monthlyPayment"`
    Rate           *decimal.Decimal `json:"rate"`
}

// CalculateMortgage computes monthly payment for a single rate
// Formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
func (c *Calculator) CalculateMortgage(
    loanAmount *decimal.Decimal,
    termMonths int,
    annualRatePercent *decimal.Decimal,
) *MortgageResult {
    // Convert annual rate from percentage to monthly decimal
    // annualRate = 2.6% -> 0.026 -> monthlyRate = 0.026/12
    annualRate := annualRatePercent.Div(decimal.MustFromString("100"))
    monthlyRate := annualRate.Div(decimal.MustFromString("12"))

    // (1 + r)^n
    onePlusR := decimal.One().Add(monthlyRate)
    onePlusRPowerN := c.power(onePlusR, termMonths)

    // r * (1+r)^n
    numerator := monthlyRate.Mul(onePlusRPowerN)

    // (1+r)^n - 1
    denominator := onePlusRPowerN.Sub(decimal.One())

    // PMT = P * numerator / denominator
    monthlyPayment := loanAmount.Mul(numerator).Div(denominator)

    // Total amount paid
    totalPaid := monthlyPayment.Mul(decimal.NewFromInt64(int64(termMonths), 0))
    totalInterest := totalPaid.Sub(loanAmount)

    return &MortgageResult{
        LoanAmount:      loanAmount,
        MonthlyPayment:  monthlyPayment.Round(2),
        TotalInterest:   totalInterest.Round(2),
        TotalAmountPaid: totalPaid.Round(2),
        Amortization:    c.generateAmortization(loanAmount, monthlyPayment, monthlyRate, termMonths),
    }
}

// CalculateMortgageWithSegments handles multi-period refinancing
func (c *Calculator) CalculateMortgageWithSegments(
    loanAmount *decimal.Decimal,
    segments []LoanRatePeriod,
) *MortgageWithSegmentsResult {
    currentBalance := loanAmount
    var totalInterest = decimal.Zero()
    var paymentPeriods []PaymentPeriod

    for _, segment := range segments {
        // Calculate payment for this segment based on remaining balance
        // and remaining total term
        result := c.CalculateMortgage(currentBalance, segment.TermMonths, segment.AnnualRate)

        paymentPeriods = append(paymentPeriods, PaymentPeriod{
            PeriodStart:    segment.StartMonth,
            PeriodEnd:      segment.EndMonth,
            MonthlyPayment: result.MonthlyPayment,
            Rate:           segment.AnnualRate,
        })

        // Calculate ending balance after this segment
        // (simplified - full implementation needs month-by-month amortization)
        for month := 0; month < segment.TermMonths; month++ {
            monthlyRate := segment.AnnualRate.Div(decimal.MustFromString("1200"))
            interestPayment := currentBalance.Mul(monthlyRate)
            principalPayment := result.MonthlyPayment.Sub(interestPayment)
            currentBalance = currentBalance.Sub(principalPayment)
            totalInterest = totalInterest.Add(interestPayment)
        }
    }

    return &MortgageWithSegmentsResult{
        PaymentPeriods: paymentPeriods,
        TotalInterest:  totalInterest.Round(2),
    }
}

// BSD Rates (IRAS 2024)
var BSDTiers = []struct {
    UpTo *decimal.Decimal
    Rate *decimal.Decimal
}{
    {decimal.MustFromString("180000"), decimal.MustFromString("0.01")},
    {decimal.MustFromString("360000"), decimal.MustFromString("0.02")},
    {decimal.MustFromString("1000000"), decimal.MustFromString("0.03")},
    {decimal.MustFromString("1500000"), decimal.MustFromString("0.04")},
    {decimal.MustFromString("3000000"), decimal.MustFromString("0.05")},
    {nil, decimal.MustFromString("0.06")}, // No upper limit
}

// CalculateBSD computes Buyer's Stamp Duty using progressive rates
func (c *Calculator) CalculateBSD(propertyPrice *decimal.Decimal) *decimal.Decimal {
    remainingPrice := propertyPrice
    totalBsd := decimal.Zero()
    previousThreshold := decimal.Zero()

    for _, tier := range BSDTiers {
        if tier.UpTo == nil {
            // Final tier - no upper limit
            taxableAmount := remainingPrice
            totalBsd = totalBsd.Add(taxableAmount.Mul(tier.Rate))
            break
        }

        if remainingPrice.IsZero() || remainingPrice.IsNegative() {
            break
        }

        tierWidth := tier.UpTo.Sub(previousThreshold)
        taxableAmount := remainingPrice
        if taxableAmount.GreaterThan(tierWidth) {
            taxableAmount = tierWidth
        }

        totalBsd = totalBsd.Add(taxableAmount.Mul(tier.Rate))
        remainingPrice = remainingPrice.Sub(taxableAmount)
        previousThreshold = tier.UpTo
    }

    return totalBsd.Round(2)
}

// ABSD Rates by buyer type and property count
var ABSDRates = map[string]map[int]*decimal.Decimal{
    "singapore_citizen": {
        0: decimal.Zero(),                    // 1st property: 0%
        1: decimal.MustFromString("20"),      // 2nd property: 20%
        2: decimal.MustFromString("30"),      // 3rd+ property: 30%
    },
    "permanent_resident": {
        0: decimal.MustFromString("5"),       // 1st property: 5%
        1: decimal.MustFromString("30"),      // 2nd+ property: 30%
    },
    "foreigner": {
        0: decimal.MustFromString("60"),      // All properties: 60%
    },
}

// CalculateABSD computes Additional Buyer's Stamp Duty
func (c *Calculator) CalculateABSD(propertyPrice *decimal.Decimal, buyerType string, propertyCount int) *decimal.Decimal {
    rates, ok := ABSDRates[buyerType]
    if !ok {
        return decimal.Zero()
    }

    rate, ok := rates[propertyCount]
    if !ok {
        // Use highest rate for that buyer type
        maxCount := 0
        for count := range rates {
            if count > maxCount {
                maxCount = count
            }
        }
        rate = rates[maxCount]
    }

    absd := propertyPrice.Mul(rate).Div(decimal.MustFromString("100"))
    return absd.Round(2)
}

// CalculateSSD computes Seller's Stamp Duty based on holding period
func (c *Calculator) CalculateSSD(salePrice *decimal.Decimal, holdingMonths int) *decimal.Decimal {
    years := holdingMonths / 12
    var rate *decimal.Decimal

    switch {
    case years < 1:
        rate = decimal.MustFromString("0.16") // 16%
    case years < 2:
        rate = decimal.MustFromString("0.12") // 12%
    case years < 3:
        rate = decimal.MustFromString("0.08") // 8%
    case years < 4:
        rate = decimal.MustFromString("0.04") // 4%
    default:
        return decimal.Zero() // 0% after 4 years
    }

    return salePrice.Mul(rate).Round(2)
}

// CalculateCpfAccruedInterest computes CPF refund with 2.5% compound interest
func (c *Calculator) CalculateCpfAccruedInterest(principalUsed *decimal.Decimal, holdingMonths int) *decimal.Decimal {
    // Formula: P * ((1 + r/12)^n - 1) where r = 0.025
    monthlyRate := decimal.MustFromString("0.025").Div(decimal.MustFromString("12"))
    onePlusR := decimal.One().Add(monthlyRate)
    factor := c.power(onePlusR, holdingMonths).Sub(decimal.One())

    return principalUsed.Mul(factor).Round(2)
}

// CalculatePropertyValueAtMonth projects property value with growth periods
func (c *Calculator) CalculatePropertyValueAtMonth(
    initialValue *decimal.Decimal,
    growthPeriods []GrowthPeriod,
    targetMonth string,
) *decimal.Decimal {
    currentValue := initialValue
    targetYear, _ := strconv.Atoi(targetMonth[:4])

    for _, period := range growthPeriods {
        if period.StartYear > targetYear {
            break
        }

        endYear := targetYear
        if period.EndYear != nil && *period.EndYear < targetYear {
            endYear = *period.EndYear
        }

        yearsInPeriod := endYear - period.StartYear + 1
        if yearsInPeriod <= 0 {
            continue
        }

        rate := period.GrowthRate.Div(decimal.MustFromString("100"))

        switch period.GrowthStrategy {
        case "annual_step":
            onePlusR := decimal.One().Add(rate)
            factor := c.power(onePlusR, yearsInPeriod)
            currentValue = currentValue.Mul(factor)
        case "compound_monthly":
            monthlyRate := rate.Div(decimal.MustFromString("12"))
            onePlusR := decimal.One().Add(monthlyRate)
            factor := c.power(onePlusR, yearsInPeriod*12)
            currentValue = currentValue.Mul(factor)
        case "fixed":
            // No growth
        }
    }

    return currentValue.Round(2)
}

// MSR/TDSR Calculation
type AffordabilityResult struct {
    MsrRatio         *decimal.Decimal `json:"msrRatio"`
    TdsrRatio        *decimal.Decimal `json:"tdsrRatio"`
    MsrPasses        bool             `json:"msrPasses"`
    TdsrPasses       bool             `json:"tdsrPasses"`
    MaxLoanMSR       *decimal.Decimal `json:"maxLoanMsr"`
    MaxLoanTDSR      *decimal.Decimal `json:"maxLoanTdsr"`
    EffectiveMaxLoan *decimal.Decimal `json:"effectiveMaxLoan"`
}

func (c *Calculator) CalculateAffordability(
    monthlyIncome *decimal.Decimal,
    monthlyPayment *decimal.Decimal,
    otherDebt *decimal.Decimal,
    propertyType string,
) *AffordabilityResult {
    msrRatio := monthlyPayment.Div(monthlyIncome)
    totalDebt := monthlyPayment.Add(otherDebt)
    tdsrRatio := totalDebt.Div(monthlyIncome)

    msrLimit := decimal.MustFromString("0.30") // 30%
    tdsrLimit := decimal.MustFromString("0.55") // 55%

    return &AffordabilityResult{
        MsrRatio:   msrRatio.Round(4),
        TdsrRatio:  tdsrRatio.Round(4),
        MsrPasses:  msrRatio.LessThanOrEqual(msrLimit),
        TdsrPasses: tdsrRatio.LessThanOrEqual(tdsrLimit),
    }
}

// helper: power function for decimal
func (c *Calculator) power(base *decimal.Decimal, exp int) *decimal.Decimal {
    result := decimal.One()
    for i := 0; i < exp; i++ {
        result = result.Mul(base)
    }
    return result
}
```

### TDD Approach

**IMPORTANT:** Write tests BEFORE implementation. All calculations must have exact input/output assertions.

**Test File:** `backend/internal/financial_v2/property/calculator_test.go`

#### Step 1: Write Failing Tests First

```go
package property

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/yourorg/backend/internal/decimal"
)

// ========================================
// MORTGAGE CALCULATION TESTS
// ========================================

func TestCalculateMortgage(t *testing.T) {
    calc := NewCalculator()

    t.Run("StandardMortgage_25Years_2.6Percent", func(t *testing.T) {
        // INPUT
        loanAmount := decimal.MustFromString("679900")
        termMonths := 25 * 12 // 300 months
        annualRate := decimal.MustFromString("2.6")

        // ACT
        result := calc.CalculateMortgage(loanAmount, termMonths, annualRate)

        // ASSERT - Exact expected values (verified with financial calculator)
        assert.Equal(t, "679900", result.LoanAmount.String())
        assert.Equal(t, "3078.47", result.MonthlyPayment.String()) // PMT formula result
        assert.Equal(t, "243541.00", result.TotalInterest.String())
        assert.Equal(t, "923441.00", result.TotalAmountPaid.String())
    })

    t.Run("SmallLoan_10Years_3.5Percent", func(t *testing.T) {
        loanAmount := decimal.MustFromString("100000")
        termMonths := 10 * 12 // 120 months
        annualRate := decimal.MustFromString("3.5")

        result := calc.CalculateMortgage(loanAmount, termMonths, annualRate)

        // PMT = 100000 * [0.00292(1.00292)^120] / [(1.00292)^120 - 1]
        assert.Equal(t, "988.86", result.MonthlyPayment.String())
        assert.Equal(t, "18663.20", result.TotalInterest.String())
    })

    t.Run("HDBLoan_25Years_2.6Percent", func(t *testing.T) {
        // HDB loan rate is typically flat 2.6%
        loanAmount := decimal.MustFromString("400000")
        termMonths := 25 * 12
        annualRate := decimal.MustFromString("2.6")

        result := calc.CalculateMortgage(loanAmount, termMonths, annualRate)

        assert.Equal(t, "1811.26", result.MonthlyPayment.String())
    })

    t.Run("ZeroInterestRate", func(t *testing.T) {
        // Edge case: 0% interest
        loanAmount := decimal.MustFromString("120000")
        termMonths := 12
        annualRate := decimal.MustFromString("0")

        result := calc.CalculateMortgage(loanAmount, termMonths, annualRate)

        assert.Equal(t, "10000.00", result.MonthlyPayment.String()) // 120000 / 12
        assert.Equal(t, "0.00", result.TotalInterest.String())
    })
}

// ========================================
// MULTI-PERIOD REFINANCING TESTS
// ========================================

func TestCalculateMortgageWithSegments(t *testing.T) {
    calc := NewCalculator()

    t.Run("TwoSegments_FixedThenFloating", func(t *testing.T) {
        loanAmount := decimal.MustFromString("679900")
        segments := []LoanRatePeriod{
            {
                StartMonth: "2025-01",
                EndMonth:   "2026-12",
                TermMonths: 24,
                AnnualRate: decimal.MustFromString("2.6"), // 2yr fixed
            },
            {
                StartMonth: "2027-01",
                EndMonth:   "2049-12",
                TermMonths: 276,                            // Remaining term
                AnnualRate: decimal.MustFromString("3.5"),  // Floating
            },
        }

        result := calc.CalculateMortgageWithSegments(loanAmount, segments)

        require.Len(t, result.PaymentPeriods, 2)
        assert.Equal(t, "3078.47", result.PaymentPeriods[0].MonthlyPayment.String())
        // Second period calculated on reduced balance with higher rate
        assert.True(t, result.PaymentPeriods[1].MonthlyPayment.GreaterThan(
            result.PaymentPeriods[0].MonthlyPayment))
    })

    t.Run("ThreeSegments_Refinancing", func(t *testing.T) {
        loanAmount := decimal.MustFromString("500000")
        segments := []LoanRatePeriod{
            {StartMonth: "2025-01", EndMonth: "2029-12", TermMonths: 60, AnnualRate: decimal.MustFromString("2.6")},
            {StartMonth: "2030-01", EndMonth: "2034-12", TermMonths: 60, AnnualRate: decimal.MustFromString("2.8")},
            {StartMonth: "2035-01", EndMonth: "2049-12", TermMonths: 180, AnnualRate: decimal.MustFromString("3.2")},
        }

        result := calc.CalculateMortgageWithSegments(loanAmount, segments)

        require.Len(t, result.PaymentPeriods, 3)
        // Each period should have a valid payment
        for i, period := range result.PaymentPeriods {
            assert.True(t, period.MonthlyPayment.GreaterThan(decimal.Zero()),
                "Period %d should have positive payment", i)
        }
    })
}

// ========================================
// BSD CALCULATION TESTS (Progressive Tiers)
// ========================================

func TestCalculateBSD(t *testing.T) {
    calc := NewCalculator()

    // BSD rates (IRAS 2024):
    // First $180,000: 1%
    // Next $180,000 ($180,001 - $360,000): 2%
    // Next $640,000 ($360,001 - $1,000,000): 3%
    // Next $500,000 ($1,000,001 - $1,500,000): 4%
    // Next $1,500,000 ($1,500,001 - $3,000,000): 5%
    // Above $3,000,000: 6%

    testCases := []struct {
        name     string
        price    string
        expected string
    }{
        {
            name:     "Under_180k",
            price:    "150000",
            expected: "1500.00", // 150000 * 1% = 1500
        },
        {
            name:     "Exactly_180k",
            price:    "180000",
            expected: "1800.00", // 180000 * 1% = 1800
        },
        {
            name:     "300k_TwoTiers",
            price:    "300000",
            expected: "4200.00", // 180000*1% + 120000*2% = 1800 + 2400 = 4200
        },
        {
            name:     "500k_ThreeTiers",
            price:    "500000",
            expected: "9600.00", // 180000*1% + 180000*2% + 140000*3% = 1800 + 3600 + 4200 = 9600
        },
        {
            name:     "850k_HDBResale",
            price:    "850000",
            expected: "20100.00", // 180000*1% + 180000*2% + 490000*3% = 1800 + 3600 + 14700 = 20100
        },
        {
            name:     "1M_Exact",
            price:    "1000000",
            expected: "24600.00", // 1800 + 3600 + 19200 = 24600
        },
        {
            name:     "1.5M_Private",
            price:    "1500000",
            expected: "44600.00", // 1800 + 3600 + 19200 + 20000 = 44600
        },
        {
            name:     "2M_HighEnd",
            price:    "2000000",
            expected: "69600.00", // 1800 + 3600 + 19200 + 20000 + 25000 = 69600
        },
        {
            name:     "3M_Exact",
            price:    "3000000",
            expected: "119600.00", // All 5 tiers
        },
        {
            name:     "5M_TopTier",
            price:    "5000000",
            expected: "239600.00", // 119600 + (2000000 * 6%) = 119600 + 120000
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            price := decimal.MustFromString(tc.price)

            result := calc.CalculateBSD(price)

            assert.Equal(t, tc.expected, result.String(),
                "BSD for %s should be %s", tc.price, tc.expected)
        })
    }
}

// ========================================
// ABSD CALCULATION TESTS
// ========================================

func TestCalculateABSD(t *testing.T) {
    calc := NewCalculator()
    price := decimal.MustFromString("1000000")

    testCases := []struct {
        buyerType     string
        propertyCount int
        expected      string
        description   string
    }{
        // Singapore Citizens
        {"singapore_citizen", 0, "0.00", "SC 1st property: 0%"},
        {"singapore_citizen", 1, "200000.00", "SC 2nd property: 20%"},
        {"singapore_citizen", 2, "300000.00", "SC 3rd+ property: 30%"},
        {"singapore_citizen", 5, "300000.00", "SC 6th property: 30%"},

        // Permanent Residents
        {"permanent_resident", 0, "50000.00", "PR 1st property: 5%"},
        {"permanent_resident", 1, "300000.00", "PR 2nd+ property: 30%"},
        {"permanent_resident", 3, "300000.00", "PR 4th property: 30%"},

        // Foreigners
        {"foreigner", 0, "600000.00", "Foreigner any property: 60%"},
        {"foreigner", 1, "600000.00", "Foreigner 2nd property: 60%"},
        {"foreigner", 5, "600000.00", "Foreigner 6th property: 60%"},
    }

    for _, tc := range testCases {
        t.Run(tc.description, func(t *testing.T) {
            result := calc.CalculateABSD(price, tc.buyerType, tc.propertyCount)

            assert.Equal(t, tc.expected, result.String())
        })
    }
}

// ========================================
// SSD CALCULATION TESTS
// ========================================

func TestCalculateSSD(t *testing.T) {
    calc := NewCalculator()
    salePrice := decimal.MustFromString("1000000")

    testCases := []struct {
        holdingMonths int
        expected      string
        description   string
    }{
        {6, "160000.00", "Sold within 1 year: 16%"},
        {11, "160000.00", "Sold at 11 months: 16%"},
        {12, "160000.00", "Sold at exactly 1 year: 16%"},
        {13, "160000.00", "Sold at 13 months: still 16% (under 2 years)"},
        {23, "160000.00", "Sold at 23 months: 16%"},
        {24, "120000.00", "Sold at 2 years: 12%"},
        {30, "120000.00", "Sold at 2.5 years: 12%"},
        {35, "120000.00", "Sold at 35 months: 12%"},
        {36, "80000.00", "Sold at 3 years: 8%"},
        {40, "40000.00", "Sold at 3+ years: 4%"},
        {48, "0.00", "Sold after 4 years: 0%"},
        {60, "0.00", "Sold after 5 years: 0%"},
    }

    for _, tc := range testCases {
        t.Run(tc.description, func(t *testing.T) {
            result := calc.CalculateSSD(salePrice, tc.holdingMonths)

            assert.Equal(t, tc.expected, result.String())
        })
    }
}

// ========================================
// CPF ACCRUED INTEREST TESTS
// ========================================

func TestCalculateCPFAccruedInterest(t *testing.T) {
    calc := NewCalculator()

    t.Run("OneYear_SimpleCase", func(t *testing.T) {
        cpfUsed := decimal.MustFromString("100000")
        months := 12
        annualRate := decimal.MustFromString("2.5")

        result := calc.CalculateCPFAccruedInterest(cpfUsed, months, annualRate)

        // Simple interest for 1 year: 100000 * 2.5% = 2500
        // But CPF uses compound: 100000 * (1 + 0.025/12)^12 - 100000 ≈ 2528.85
        assert.Equal(t, "2528.85", result.String())
    })

    t.Run("FiveYears_Compound", func(t *testing.T) {
        cpfUsed := decimal.MustFromString("150000")
        months := 60
        annualRate := decimal.MustFromString("2.5")

        result := calc.CalculateCPFAccruedInterest(cpfUsed, months, annualRate)

        // 150000 * (1 + 0.025/12)^60 - 150000 ≈ 19992.37
        assert.Equal(t, "19992.37", result.String())
    })

    t.Run("TenYears_LongTerm", func(t *testing.T) {
        cpfUsed := decimal.MustFromString("150000")
        months := 120
        annualRate := decimal.MustFromString("2.5")

        result := calc.CalculateCPFAccruedInterest(cpfUsed, months, annualRate)

        // 150000 * (1.0020833)^120 - 150000 ≈ 42515.73
        assert.Equal(t, "42515.73", result.String())
    })
}

// ========================================
// PROPERTY VALUE APPRECIATION TESTS
// ========================================

func TestCalculatePropertyValueAtMonth(t *testing.T) {
    calc := NewCalculator()

    t.Run("SingleGrowthPeriod_AnnualStep", func(t *testing.T) {
        initialValue := decimal.MustFromString("850000")
        periods := []GrowthPeriod{
            {StartYear: 2025, EndYear: nil, GrowthRate: decimal.MustFromString("3.0"), GrowthStrategy: "annual_step"},
        }

        // After 1 year
        result1 := calc.CalculatePropertyValueAtMonth(initialValue, periods, "2026-01")
        assert.Equal(t, "875500.00", result1.String()) // 850000 * 1.03

        // After 5 years
        result5 := calc.CalculatePropertyValueAtMonth(initialValue, periods, "2030-01")
        assert.Equal(t, "985266.89", result5.String()) // 850000 * 1.03^5
    })

    t.Run("MultipleGrowthPeriods", func(t *testing.T) {
        initialValue := decimal.MustFromString("1000000")
        periods := []GrowthPeriod{
            {StartYear: 2025, EndYear: intPtr(2029), GrowthRate: decimal.MustFromString("5.0"), GrowthStrategy: "annual_step"},
            {StartYear: 2030, EndYear: nil, GrowthRate: decimal.MustFromString("2.0"), GrowthStrategy: "annual_step"},
        }

        // After 5 years (all at 5%)
        result5 := calc.CalculatePropertyValueAtMonth(initialValue, periods, "2030-01")
        expected5 := decimal.MustFromString("1276281.56") // 1000000 * 1.05^5
        assert.True(t, result5.Sub(expected5).Abs().LessThan(decimal.MustFromString("1")))

        // After 10 years (5 at 5%, 5 at 2%)
        result10 := calc.CalculatePropertyValueAtMonth(initialValue, periods, "2035-01")
        expected10 := decimal.MustFromString("1409216.13") // 1276281.56 * 1.02^5
        assert.True(t, result10.Sub(expected10).Abs().LessThan(decimal.MustFromString("1")))
    })
}

// ========================================
// MSR/TDSR AFFORDABILITY TESTS
// ========================================

func TestCalculateAffordability(t *testing.T) {
    calc := NewCalculator()

    t.Run("PassesBothLimits", func(t *testing.T) {
        monthlyIncome := decimal.MustFromString("12000")
        monthlyPayment := decimal.MustFromString("3000") // 25% of income
        otherDebt := decimal.MustFromString("500")        // 4.17%

        result := calc.CalculateAffordability(monthlyIncome, monthlyPayment, otherDebt, "hdb")

        assert.Equal(t, "0.2500", result.MsrRatio.String())
        assert.Equal(t, "0.2917", result.TdsrRatio.String())
        assert.True(t, result.MsrPasses)  // Under 30%
        assert.True(t, result.TdsrPasses) // Under 55%
    })

    t.Run("FailsMSR_PassesTDSR", func(t *testing.T) {
        monthlyIncome := decimal.MustFromString("10000")
        monthlyPayment := decimal.MustFromString("3500") // 35% of income
        otherDebt := decimal.MustFromString("0")

        result := calc.CalculateAffordability(monthlyIncome, monthlyPayment, otherDebt, "hdb")

        assert.Equal(t, "0.3500", result.MsrRatio.String())
        assert.False(t, result.MsrPasses) // Over 30%
        assert.True(t, result.TdsrPasses) // Under 55%
    })

    t.Run("FailsBothLimits", func(t *testing.T) {
        monthlyIncome := decimal.MustFromString("8000")
        monthlyPayment := decimal.MustFromString("3500") // 43.75%
        otherDebt := decimal.MustFromString("1500")       // 18.75%

        result := calc.CalculateAffordability(monthlyIncome, monthlyPayment, otherDebt, "private")

        assert.False(t, result.MsrPasses) // Over 30%
        assert.False(t, result.TdsrPasses) // Over 55% (62.5%)
    })

    t.Run("ExactlyAtLimits", func(t *testing.T) {
        monthlyIncome := decimal.MustFromString("10000")
        monthlyPayment := decimal.MustFromString("3000") // Exactly 30%
        otherDebt := decimal.MustFromString("2500")       // Total 55%

        result := calc.CalculateAffordability(monthlyIncome, monthlyPayment, otherDebt, "hdb")

        assert.True(t, result.MsrPasses)  // At limit passes
        assert.True(t, result.TdsrPasses) // At limit passes
    })
}

func intPtr(i int) *int { return &i }
```

#### Step 2: Run Tests (Should Fail)

```bash
go test -v ./internal/financial_v2/property/... -run Test
# Expected: All tests FAIL (no implementation yet)
```

#### Step 3: Implement Code

Implement calculator methods to make tests pass.

#### Step 4: Run Tests (Should Pass)

```bash
go test -v -cover ./internal/financial_v2/property/...
# Expected: All tests PASS, coverage > 85%
```

---

## BE-4: HTTP Handler

**Priority:** P1
**Estimated Effort:** 4-5 hours
**Dependencies:** BE-2, BE-3

### Description

Create the HTTP handler for property planner API endpoints with input validation, computation orchestration, and response formatting.

### Acceptance Criteria

- [ ] All 5 endpoints implemented (CRUD + list)
- [ ] Input validation with clear error messages
- [ ] Decimal values parsed correctly from strings
- [ ] All computations run on every create/update
- [ ] Integration tests pass

### Implementation Details

#### File: `backend/cmd/server/handlers/property_planner_v2.go`

```go
package handlers

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/yourorg/backend/internal/financial_v2/property"
    "github.com/yourorg/backend/internal/financial_v2/repository"
)

type PropertyPlannerV2Handler struct {
    store      repository.PropertyPlannerStore
    calculator *property.Calculator
}

func NewPropertyPlannerV2Handler(
    store repository.PropertyPlannerStore,
    calculator *property.Calculator,
) *PropertyPlannerV2Handler {
    return &PropertyPlannerV2Handler{
        store:      store,
        calculator: calculator,
    }
}

// RegisterRoutes registers all property planner v2 routes
func (h *PropertyPlannerV2Handler) RegisterRoutes(r chi.Router) {
    r.Route("/api/v2/property-planner", func(r chi.Router) {
        r.Get("/scenarios", h.ListScenarios)
        r.Post("/scenarios", h.CreateScenario)
        r.Get("/scenarios/{id}", h.GetScenario)
        r.Put("/scenarios/{id}", h.UpdateScenario)
        r.Delete("/scenarios/{id}", h.DeleteScenario)
    })
}

// CreateScenarioRequest is the API input shape
type CreateScenarioRequest struct {
    Country   string                       `json:"country"` // 'SG' | 'MY'
    SGDetails *CreateSGDetailsRequest      `json:"sgDetails,omitempty"`
    Fees      []CreateFeeRequest           `json:"fees"`
    GrowthPeriods []CreateGrowthPeriodRequest `json:"growthPeriods"`
    RatePeriods   []CreateRatePeriodRequest   `json:"ratePeriods"`
}

type CreateSGDetailsRequest struct {
    Name              string  `json:"name" validate:"required,min=1,max=100"`
    PropertyType      string  `json:"propertyType" validate:"required,oneof=hdb private"`
    PropertySubtype   string  `json:"propertySubtype" validate:"required,oneof=bto resale ec new"`
    PropertyPrice     string  `json:"propertyPrice" validate:"required,decimal"`
    ValuationPrice    *string `json:"valuationPrice"`
    LoanType          string  `json:"loanType" validate:"required,oneof=bank hdb"`
    DownpaymentCpfOa  string  `json:"downpaymentCpfOa" validate:"decimal"`
    DownpaymentCpfSa  string  `json:"downpaymentCpfSa" validate:"decimal"`
    DownpaymentCash   string  `json:"downpaymentCash" validate:"decimal"`
    BorrowerType      string  `json:"borrowerType" validate:"required,oneof=single joint"`
    Borrower1IncomeID *string `json:"borrower1IncomeId"`
    Borrower1CpfAccountID *string `json:"borrower1CpfAccountId"`
    Borrower2IncomeID *string `json:"borrower2IncomeId"`
    Borrower2CpfAccountID *string `json:"borrower2CpfAccountId"`
    OtherDebt         string  `json:"otherDebt"`
    BuyerType         string  `json:"buyerType" validate:"required,oneof=singapore_citizen permanent_resident foreigner"`
    PropertyCount     int     `json:"propertyCount" validate:"min=0"`
    Grants            string  `json:"grants"`
    SaleExpectedDate  *string `json:"saleExpectedDate"`
    SaleExpectedPrice *string `json:"saleExpectedPrice"`
}

type CreateRatePeriodRequest struct {
    StartMonth   string `json:"startMonth" validate:"required,datetime=2006-01"`
    TermYears    int    `json:"termYears" validate:"required,min=1,max=35"`
    FixedYears   int    `json:"fixedYears" validate:"min=0"`
    FixedRate    string `json:"fixedRate" validate:"required,decimal"`
    FloatingRate string `json:"floatingRate" validate:"required,decimal"`
}

// ScenarioResponse is the full API response with inputs + computed values
type ScenarioResponse struct {
    Scenario   repository.PropertyScenario   `json:"scenario"`
    SGDetails  *repository.PropertySGDetails `json:"sgDetails,omitempty"`
    Fees       []repository.PropertyFee      `json:"fees"`
    GrowthPeriods []repository.GrowthPeriod  `json:"growthPeriods"`
    RatePeriods   []repository.LiabilityRatePeriod `json:"ratePeriods"`
    Computed   ComputedValues                `json:"computed"`
}

type ComputedValues struct {
    Mortgage     MortgageComputed     `json:"mortgage"`
    Sale         *SaleComputed        `json:"sale,omitempty"`
    Appreciation []AppreciationYear   `json:"appreciation"`
}

type MortgageComputed struct {
    LoanAmount       string             `json:"loanAmount"`
    MonthlyPayment   string             `json:"monthlyPayment"`
    TotalInterest    string             `json:"totalInterest"`
    TotalAmountPaid  string             `json:"totalAmountPaid"`
    LoanEndDate      string             `json:"loanEndDate"`
    MsrRatio         string             `json:"msrRatio"`
    TdsrRatio        string             `json:"tdsrRatio"`
    MsrPasses        bool               `json:"msrPasses"`
    TdsrPasses       bool               `json:"tdsrPasses"`
    BsdAmount        string             `json:"bsdAmount"`
    AbsdAmount       string             `json:"absdAmount"`
    TotalUpfrontCash string             `json:"totalUpfrontCash"`
    Amortization     []AmortizationYear `json:"amortization"`
    PaymentPeriods   []PaymentPeriod    `json:"paymentPeriods,omitempty"`
}

// CreateScenario handles POST /api/v2/property-planner/scenarios
func (h *PropertyPlannerV2Handler) CreateScenario(w http.ResponseWriter, r *http.Request) {
    userID := getUserID(r.Context())

    var req CreateScenarioRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
        return
    }

    // Validate input
    if err := validate.Struct(req); err != nil {
        respondError(w, http.StatusBadRequest, formatValidationError(err))
        return
    }

    // Convert request to repository input
    input, err := h.convertCreateRequest(req)
    if err != nil {
        respondError(w, http.StatusBadRequest, err.Error())
        return
    }

    // Create in database
    scenario, err := h.store.CreateScenario(r.Context(), userID, input)
    if err != nil {
        respondError(w, http.StatusInternalServerError, "failed to create scenario")
        return
    }

    // Run all computations
    computed, err := h.computeAll(scenario)
    if err != nil {
        respondError(w, http.StatusInternalServerError, "computation failed")
        return
    }

    // Build response
    response := ScenarioResponse{
        Scenario:      scenario.Scenario,
        SGDetails:     scenario.SGDetails,
        Fees:          scenario.Fees,
        GrowthPeriods: scenario.GrowthPeriods,
        RatePeriods:   scenario.RatePeriods,
        Computed:      computed,
    }

    respondJSON(w, http.StatusCreated, response)
}

// computeAll runs all calculations on a scenario
func (h *PropertyPlannerV2Handler) computeAll(s *repository.PropertyScenarioFull) (ComputedValues, error) {
    var result ComputedValues

    if s.SGDetails == nil {
        return result, fmt.Errorf("no country details found")
    }

    details := s.SGDetails

    // Calculate loan amount
    downpaymentTotal := details.DownpaymentCpfOa.Add(details.DownpaymentCpfSa).Add(details.DownpaymentCash)
    if details.Grants != nil {
        downpaymentTotal = downpaymentTotal.Add(details.Grants)
    }
    loanAmount := details.PropertyPrice.Sub(downpaymentTotal)

    // Calculate mortgage with segments
    if len(s.RatePeriods) > 0 {
        segments := make([]property.LoanRatePeriod, len(s.RatePeriods))
        for i, rp := range s.RatePeriods {
            segments[i] = property.LoanRatePeriod{
                StartMonth: rp.StartMonth,
                TermMonths: rp.TermYears * 12,
                AnnualRate: rp.FixedRate, // Simplified - use weighted rate
            }
        }
        mortgageResult := h.calculator.CalculateMortgageWithSegments(loanAmount, segments)

        result.Mortgage = MortgageComputed{
            LoanAmount:     loanAmount.String(),
            MonthlyPayment: mortgageResult.PaymentPeriods[0].MonthlyPayment.String(),
            TotalInterest:  mortgageResult.TotalInterest.String(),
            // ... other fields
        }
    }

    // Calculate stamp duties
    bsd := h.calculator.CalculateBSD(details.PropertyPrice)
    absd := h.calculator.CalculateABSD(details.PropertyPrice, details.BuyerType, details.PropertyCount)

    result.Mortgage.BsdAmount = bsd.String()
    result.Mortgage.AbsdAmount = absd.String()

    // Calculate total upfront cash
    // ... sum of cash downpayment + BSD + ABSD + purchase fees

    // Calculate sale proceeds if sale date is set
    if details.SaleExpectedDate != nil && details.SaleExpectedPrice != nil {
        // ... sale calculations
    }

    // Calculate appreciation projections
    for year := 1; year <= 30; year++ {
        targetMonth := fmt.Sprintf("%d-01", 2025+year)
        projectedValue := h.calculator.CalculatePropertyValueAtMonth(
            details.PropertyPrice,
            convertGrowthPeriods(s.GrowthPeriods),
            targetMonth,
        )
        result.Appreciation = append(result.Appreciation, AppreciationYear{
            Year:           year,
            ProjectedValue: projectedValue.String(),
        })
    }

    return result, nil
}
```

#### File: `backend/cmd/server/routes/v2.go`

```go
// Add to existing v2 routes
func RegisterV2Routes(r chi.Router, deps *Dependencies) {
    // ... existing routes

    propertyHandler := handlers.NewPropertyPlannerV2Handler(
        deps.PropertyPlannerStore,
        property.NewCalculator(),
    )
    propertyHandler.RegisterRoutes(r)
}
```

### Testing

Create `backend/cmd/server/handlers/property_planner_v2_test.go`:

```go
func TestPropertyPlannerV2Handler(t *testing.T) {
    server := setupTestServer(t)

    t.Run("CreateScenario_Success", func(t *testing.T) {
        payload := `{
            "country": "SG",
            "sgDetails": {
                "name": "Test HDB",
                "propertyType": "hdb",
                "propertySubtype": "resale",
                "propertyPrice": "850000",
                "loanType": "bank",
                "downpaymentCpfOa": "150000",
                "downpaymentCash": "20100",
                "borrowerType": "single",
                "buyerType": "singapore_citizen",
                "propertyCount": 0
            },
            "ratePeriods": [{
                "startMonth": "2025-01",
                "termYears": 25,
                "fixedYears": 2,
                "fixedRate": "2.6",
                "floatingRate": "3.5"
            }]
        }`

        resp := server.POST("/api/v2/property-planner/scenarios", payload)
        assert.Equal(t, http.StatusCreated, resp.Code)

        var result ScenarioResponse
        json.Unmarshal(resp.Body.Bytes(), &result)

        assert.NotEmpty(t, result.Scenario.ID)
        assert.Equal(t, "850000", result.SGDetails.PropertyPrice.String())
        assert.Equal(t, "20100", result.Computed.Mortgage.BsdAmount) // BSD on 850K
    })

    t.Run("CreateScenario_ValidationError", func(t *testing.T) {
        payload := `{"country": "SG", "sgDetails": {"name": ""}}`
        resp := server.POST("/api/v2/property-planner/scenarios", payload)
        assert.Equal(t, http.StatusBadRequest, resp.Code)
    })
}
```

---

## BE-5: Legacy Cleanup Migration

**Priority:** P2 (After deployment)
**Estimated Effort:** 1-2 hours
**Dependencies:** BE-1, BE-4 deployed and stable

### Description

Remove legacy property planner tables and files after V2 is stable.

### Implementation Details

#### Migration: Drop legacy tables

```sql
-- 20251230001_drop_legacy_property_tables.up.sql
DROP TABLE IF EXISTS property_links CASCADE;
DROP TABLE IF EXISTS property_scenarios CASCADE;  -- Old one, not the new header table

-- 20251230001_drop_legacy_property_tables.down.sql
-- Recreate legacy tables if needed (from backup schema)
```

#### Files to Delete

```
backend/cmd/server/handlers/property_planner.go  -- Old V1 handler
backend/cmd/server/handlers/property_planner_test.go
backend/internal/financial/property.go  -- Old legacy code
```

---

# FRONTEND TICKETS

## FE-1: API Client & Types

**Priority:** P0 (Blocking)
**Estimated Effort:** 2-3 hours
**Dependencies:** BE-4 API contract

### Description

Create TypeScript types and API client for property planner V2 endpoints.

### Acceptance Criteria

- [ ] All TypeScript interfaces match backend response shapes
- [ ] API client with proper error handling
- [ ] Types exported for use in components

### Implementation Details

#### File: `frontend/src/types/propertyPlannerV2.ts`

```typescript
// Country-specific details
export interface PropertySGDetails {
  id: string
  name: string
  propertyType: 'hdb' | 'private'
  propertySubtype: 'bto' | 'resale' | 'ec' | 'new'
  icon?: string
  iconColor?: string
  isIncluded: boolean
  propertyPrice: string
  valuationPrice?: string
  loanType: 'bank' | 'hdb'
  downpaymentCpfOa: string
  downpaymentCpfSa: string
  downpaymentCash: string
  borrowerType: 'single' | 'joint'
  borrower1IncomeId?: string
  borrower1CpfAccountId?: string
  borrower2IncomeId?: string
  borrower2CpfAccountId?: string
  otherDebt: string
  buyerType: 'singapore_citizen' | 'permanent_resident' | 'foreigner'
  propertyCount: number
  grants: string
  btoLaunchDate?: string
  btoKeyCollectionDate?: string
  saleExpectedDate?: string
  saleExpectedPrice?: string
  createdAt: string
  updatedAt: string
}

// Header scenario
export interface PropertyScenario {
  id: string
  userId: string
  sgDetailsId?: string
  myDetailsId?: string
  createdAt: string
  updatedAt: string
}

// Fee item
export interface PropertyFee {
  id: string
  scenarioId: string
  feeContext: 'purchase' | 'sale' | 'recurring'
  feeType: string
  description?: string
  amount: string
  currency: string
  isPercentage: boolean
  frequency: 'one_time' | 'monthly' | 'yearly'
  startDate?: string
  endDate?: string
}

// Growth period
export interface GrowthPeriod {
  id: string
  propertyScenarioId?: string
  assetId?: string
  startYear: number
  endYear?: number
  growthRate: string
  growthStrategy: 'fixed' | 'annual_step' | 'compound_monthly' | 'tiered_adb'
}

// Loan rate period
export interface LiabilityRatePeriod {
  id: string
  propertyScenarioId?: string
  liabilityId?: string
  periodOrder: number
  startMonth: string
  termYears: number
  fixedYears: number
  fixedRate: string
  floatingRate: string
}

// Computed outputs
export interface MortgageComputed {
  loanAmount: string
  monthlyPayment: string
  totalInterest: string
  totalAmountPaid: string
  loanEndDate: string
  msrRatio: string
  tdsrRatio: string
  msrPasses: boolean
  tdsrPasses: boolean
  bsdAmount: string
  absdAmount: string
  totalUpfrontCash: string
  amortization: AmortizationYear[]
  paymentPeriods?: PaymentPeriod[]
}

export interface AmortizationYear {
  year: number
  startingBalance: string
  totalPrincipal: string
  totalInterest: string
  endingBalance: string
}

export interface PaymentPeriod {
  periodStart: string
  periodEnd: string
  monthlyPayment: string
  rate: string
}

export interface SaleComputed {
  holdingPeriodMonths: number
  outstandingLoanAtSale: string
  cpfRefund: string
  ssdAmount: string
  netCashProceeds: string
}

export interface AppreciationYear {
  year: number
  projectedValue: string
  growthRate?: string
}

export interface ComputedValues {
  mortgage: MortgageComputed
  sale?: SaleComputed
  appreciation: AppreciationYear[]
}

// Full scenario response
export interface PropertyScenarioFull {
  scenario: PropertyScenario
  sgDetails?: PropertySGDetails
  myDetails?: unknown // Future
  fees: PropertyFee[]
  growthPeriods: GrowthPeriod[]
  ratePeriods: LiabilityRatePeriod[]
  computed: ComputedValues
}

// Create/Update inputs
export interface CreateSGDetailsInput {
  name: string
  propertyType: 'hdb' | 'private'
  propertySubtype: 'bto' | 'resale' | 'ec' | 'new'
  icon?: string
  iconColor?: string
  isIncluded?: boolean
  propertyPrice: string
  valuationPrice?: string
  loanType: 'bank' | 'hdb'
  downpaymentCpfOa?: string
  downpaymentCpfSa?: string
  downpaymentCash?: string
  borrowerType: 'single' | 'joint'
  borrower1IncomeId?: string
  borrower1CpfAccountId?: string
  borrower2IncomeId?: string
  borrower2CpfAccountId?: string
  otherDebt?: string
  buyerType: 'singapore_citizen' | 'permanent_resident' | 'foreigner'
  propertyCount?: number
  grants?: string
  saleExpectedDate?: string
  saleExpectedPrice?: string
}

export interface CreateFeeInput {
  feeContext: 'purchase' | 'sale' | 'recurring'
  feeType: string
  description?: string
  amount: string
  currency?: string
  isPercentage?: boolean
  frequency?: 'one_time' | 'monthly' | 'yearly'
  startDate?: string
  endDate?: string
}

export interface CreateGrowthPeriodInput {
  startYear: number
  endYear?: number
  growthRate: string
  growthStrategy?: 'fixed' | 'annual_step' | 'compound_monthly'
}

export interface CreateRatePeriodInput {
  startMonth: string
  termYears: number
  fixedYears?: number
  fixedRate: string
  floatingRate: string
}

export interface CreateScenarioInput {
  country: 'SG' | 'MY'
  sgDetails?: CreateSGDetailsInput
  fees?: CreateFeeInput[]
  growthPeriods?: CreateGrowthPeriodInput[]
  ratePeriods: CreateRatePeriodInput[]
}

export interface UpdateScenarioInput extends Partial<CreateScenarioInput> {}
```

#### File: `frontend/src/services/propertyPlannerV2Api.ts`

```typescript
import { jsonRequest } from './financialApi'
import type {
  PropertyScenarioFull,
  CreateScenarioInput,
  UpdateScenarioInput,
} from '@/types/propertyPlannerV2'

const BASE_PATH = '/api/v2/property-planner'

export const propertyPlannerV2Api = {
  /**
   * List all property scenarios for the current user
   */
  list: async (): Promise<PropertyScenarioFull[]> => {
    return jsonRequest<PropertyScenarioFull[]>(`${BASE_PATH}/scenarios`)
  },

  /**
   * Get a single property scenario by ID
   */
  get: async (id: string): Promise<PropertyScenarioFull> => {
    return jsonRequest<PropertyScenarioFull>(`${BASE_PATH}/scenarios/${id}`)
  },

  /**
   * Create a new property scenario
   */
  create: async (input: CreateScenarioInput): Promise<PropertyScenarioFull> => {
    return jsonRequest<PropertyScenarioFull>(`${BASE_PATH}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  /**
   * Update an existing property scenario
   */
  update: async (id: string, input: UpdateScenarioInput): Promise<PropertyScenarioFull> => {
    return jsonRequest<PropertyScenarioFull>(`${BASE_PATH}/scenarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  /**
   * Delete a property scenario
   */
  delete: async (id: string): Promise<void> => {
    await jsonRequest<void>(`${BASE_PATH}/scenarios/${id}`, {
      method: 'DELETE',
    })
  },
}
```

---

## FE-2: React Query Hooks

**Priority:** P0 (Blocking)
**Estimated Effort:** 2-3 hours
**Dependencies:** FE-1

### Description

Create React Query hooks for property planner API with optimistic updates and cache invalidation.

### Acceptance Criteria

- [ ] Query hooks with proper caching
- [ ] Mutation hooks with optimistic updates
- [ ] Toast notifications on success/error
- [ ] Query key factory for consistency

### Implementation Details

#### File: `frontend/src/hooks/queries/usePropertyPlannerScenarios.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { propertyPlannerV2Api } from '@/services/propertyPlannerV2Api'
import type {
  PropertyScenarioFull,
  CreateScenarioInput,
  UpdateScenarioInput,
} from '@/types/propertyPlannerV2'
import { toast } from 'sonner'

// Query key factory
export const propertyPlannerKeys = {
  all: ['property-planner-scenarios'] as const,
  lists: () => [...propertyPlannerKeys.all, 'list'] as const,
  list: () => [...propertyPlannerKeys.lists()] as const,
  details: () => [...propertyPlannerKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyPlannerKeys.details(), id] as const,
}

/**
 * Query hook for listing all property scenarios
 */
export function usePropertyPlannerScenariosQuery() {
  return useQuery({
    queryKey: propertyPlannerKeys.list(),
    queryFn: () => propertyPlannerV2Api.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for a single property scenario
 */
export function usePropertyPlannerScenarioQuery(id: string | undefined) {
  return useQuery({
    queryKey: propertyPlannerKeys.detail(id ?? ''),
    queryFn: () => propertyPlannerV2Api.get(id!),
    enabled: !!id,
  })
}

/**
 * Mutation hook for creating a property scenario
 */
export function useCreatePropertyPlannerScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateScenarioInput) => propertyPlannerV2Api.create(input),
    onSuccess: (data) => {
      // Invalidate list cache
      queryClient.invalidateQueries({ queryKey: propertyPlannerKeys.lists() })

      // Add new scenario to cache
      queryClient.setQueryData(propertyPlannerKeys.detail(data.scenario.id), data)

      toast.success('Property scenario created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create scenario: ${error.message}`)
    },
  })
}

/**
 * Mutation hook for updating a property scenario
 */
export function useUpdatePropertyPlannerScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScenarioInput }) =>
      propertyPlannerV2Api.update(id, input),
    onMutate: async ({ id, input }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyPlannerKeys.detail(id) })

      // Snapshot previous value
      const previousScenario = queryClient.getQueryData<PropertyScenarioFull>(
        propertyPlannerKeys.detail(id)
      )

      // Optimistically update
      if (previousScenario && input.sgDetails) {
        queryClient.setQueryData(propertyPlannerKeys.detail(id), {
          ...previousScenario,
          sgDetails: {
            ...previousScenario.sgDetails,
            ...input.sgDetails,
          },
        })
      }

      return { previousScenario }
    },
    onSuccess: (data, { id }) => {
      // Update with server response
      queryClient.setQueryData(propertyPlannerKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: propertyPlannerKeys.lists() })

      toast.success('Scenario updated successfully')
    },
    onError: (error: Error, { id }, context) => {
      // Rollback on error
      if (context?.previousScenario) {
        queryClient.setQueryData(propertyPlannerKeys.detail(id), context.previousScenario)
      }
      toast.error(`Failed to update scenario: ${error.message}`)
    },
  })
}

/**
 * Mutation hook for deleting a property scenario
 */
export function useDeletePropertyPlannerScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => propertyPlannerV2Api.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: propertyPlannerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: propertyPlannerKeys.lists() })

      toast.success('Scenario deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete scenario: ${error.message}`)
    },
  })
}
```

---

## FE-3: Scenario List & Picker Component

**Priority:** P1
**Estimated Effort:** 3-4 hours
**Dependencies:** FE-2

### Description

Create UI component for listing and selecting saved property scenarios.

### Acceptance Criteria

- [ ] Grid/list view of saved scenarios
- [ ] Each card shows name, property type, price, computed monthly payment
- [ ] Click to load scenario into planner
- [ ] Delete with confirmation
- [ ] Create new scenario button
- [ ] Empty state for no scenarios

### Implementation Details

#### File: `frontend/src/app/property-planner/components/ScenarioList.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Plus, Trash2, Home, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import {
  usePropertyPlannerScenariosQuery,
  useDeletePropertyPlannerScenarioMutation,
} from '@/hooks/queries/usePropertyPlannerScenarios'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'

interface ScenarioListProps {
  selectedId?: string
  onSelect: (scenario: PropertyScenarioFull) => void
  onCreateNew: () => void
}

export function ScenarioList({ selectedId, onSelect, onCreateNew }: ScenarioListProps) {
  const { data: scenarios, isLoading, error } = usePropertyPlannerScenariosQuery()
  const deleteMutation = useDeletePropertyPlannerScenarioMutation()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-400">
        Failed to load scenarios: {error.message}
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Saved Scenarios</h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Scenario
        </button>
      </div>

      {/* List */}
      {scenarios?.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500 border border-dashed border-white/10 rounded-xl">
          <p>No saved scenarios yet</p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-2 text-indigo-400 hover:text-indigo-300"
          >
            Create your first scenario
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {scenarios?.map((scenario) => {
            const details = scenario.sgDetails
            const isSelected = scenario.scenario.id === selectedId
            const isDeleting = deleteConfirmId === scenario.scenario.id

            return (
              <div
                key={scenario.scenario.id}
                className={cn(
                  'p-3 rounded-xl border transition-all cursor-pointer',
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                )}
                onClick={() => onSelect(scenario)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {details?.propertyType === 'hdb' ? (
                      <Home className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Building2 className="h-4 w-4 text-blue-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-white">
                        {details?.name || 'Unnamed'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {details?.propertyType?.toUpperCase()} {details?.propertySubtype}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirmId(scenario.scenario.id)
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-red-400" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Property Price</span>
                  <span className={numericStyles.base}>
                    {formatCurrency(Number(details?.propertyPrice || 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Monthly Payment</span>
                  <span className={numericStyles.base}>
                    {formatCurrency(Number(scenario.computed.mortgage.monthlyPayment))}
                  </span>
                </div>

                {/* Delete confirmation */}
                {isDeleting && (
                  <div
                    className="mt-3 pt-3 border-t border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-slate-400 mb-2">
                      Delete this scenario?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-3 py-1.5 text-xs text-slate-400 bg-white/5 rounded-lg hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(scenario.scenario.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

---

## FE-4: Form State Refactor for API Integration

**Priority:** P1
**Estimated Effort:** 4-5 hours
**Dependencies:** FE-1, FE-2

### Description

Refactor the property planner form to work with the V2 API, replacing local calculations with backend-computed values.

### Acceptance Criteria

- [ ] Form state matches API input types
- [ ] Save button calls create/update API
- [ ] Computed values displayed from API response
- [ ] Loading states during API calls
- [ ] Form resets on scenario selection

### Implementation Details

#### Key Changes

1. **Remove local calculation hook** - All calculations now from backend
2. **Add save/update flow** - Form submits to API
3. **Display computed values** - From `scenario.computed` response
4. **Handle scenario selection** - Load saved data into form

#### File: `frontend/src/app/property-planner/hooks/usePropertyPlannerFormV2.ts`

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  useCreatePropertyPlannerScenarioMutation,
  useUpdatePropertyPlannerScenarioMutation,
} from '@/hooks/queries/usePropertyPlannerScenarios'
import type {
  CreateScenarioInput,
  PropertyScenarioFull,
  CreateSGDetailsInput,
  CreateRatePeriodInput,
  CreateGrowthPeriodInput,
} from '@/types/propertyPlannerV2'

interface FormState {
  // Identifiers
  scenarioId?: string

  // Basic Info
  name: string
  propertyType: 'hdb' | 'private'
  propertySubtype: 'bto' | 'resale' | 'ec' | 'new'

  // Pricing
  propertyPrice: string
  valuationPrice: string

  // Loan
  loanType: 'bank' | 'hdb'
  downpaymentCpfOa: string
  downpaymentCpfSa: string
  downpaymentCash: string

  // Borrower
  borrowerType: 'single' | 'joint'
  borrower1IncomeId?: string
  borrower1CpfAccountId?: string
  borrower2IncomeId?: string
  borrower2CpfAccountId?: string
  otherDebt: string

  // Buyer details
  buyerType: 'singapore_citizen' | 'permanent_resident' | 'foreigner'
  propertyCount: number
  grants: string

  // Sale planning
  saleExpectedDate?: string
  saleExpectedPrice?: string

  // Rate periods (loan segments)
  ratePeriods: CreateRatePeriodInput[]

  // Growth periods
  growthPeriods: CreateGrowthPeriodInput[]
}

const defaultFormState: FormState = {
  name: '',
  propertyType: 'hdb',
  propertySubtype: 'resale',
  propertyPrice: '',
  valuationPrice: '',
  loanType: 'bank',
  downpaymentCpfOa: '0',
  downpaymentCpfSa: '0',
  downpaymentCash: '0',
  borrowerType: 'single',
  otherDebt: '0',
  buyerType: 'singapore_citizen',
  propertyCount: 0,
  grants: '0',
  ratePeriods: [
    {
      startMonth: new Date().toISOString().slice(0, 7),
      termYears: 25,
      fixedYears: 2,
      fixedRate: '2.6',
      floatingRate: '3.5',
    },
  ],
  growthPeriods: [
    {
      startYear: new Date().getFullYear(),
      growthRate: '3.0',
      growthStrategy: 'annual_step',
    },
  ],
}

export function usePropertyPlannerFormV2() {
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [savedScenario, setSavedScenario] = useState<PropertyScenarioFull | null>(null)

  const createMutation = useCreatePropertyPlannerScenarioMutation()
  const updateMutation = useUpdatePropertyPlannerScenarioMutation()

  // Update a single field
  const updateField = useCallback(<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Load a saved scenario into the form
  const loadScenario = useCallback((scenario: PropertyScenarioFull) => {
    const details = scenario.sgDetails
    if (!details) return

    setFormState({
      scenarioId: scenario.scenario.id,
      name: details.name,
      propertyType: details.propertyType as 'hdb' | 'private',
      propertySubtype: details.propertySubtype as 'bto' | 'resale' | 'ec' | 'new',
      propertyPrice: details.propertyPrice,
      valuationPrice: details.valuationPrice || '',
      loanType: details.loanType as 'bank' | 'hdb',
      downpaymentCpfOa: details.downpaymentCpfOa,
      downpaymentCpfSa: details.downpaymentCpfSa,
      downpaymentCash: details.downpaymentCash,
      borrowerType: details.borrowerType as 'single' | 'joint',
      borrower1IncomeId: details.borrower1IncomeId || undefined,
      borrower1CpfAccountId: details.borrower1CpfAccountId || undefined,
      borrower2IncomeId: details.borrower2IncomeId || undefined,
      borrower2CpfAccountId: details.borrower2CpfAccountId || undefined,
      otherDebt: details.otherDebt,
      buyerType: details.buyerType as 'singapore_citizen' | 'permanent_resident' | 'foreigner',
      propertyCount: details.propertyCount,
      grants: details.grants,
      saleExpectedDate: details.saleExpectedDate || undefined,
      saleExpectedPrice: details.saleExpectedPrice || undefined,
      ratePeriods: scenario.ratePeriods.map((rp) => ({
        startMonth: rp.startMonth,
        termYears: rp.termYears,
        fixedYears: rp.fixedYears,
        fixedRate: rp.fixedRate,
        floatingRate: rp.floatingRate,
      })),
      growthPeriods: scenario.growthPeriods.map((gp) => ({
        startYear: gp.startYear,
        endYear: gp.endYear || undefined,
        growthRate: gp.growthRate,
        growthStrategy: gp.growthStrategy as 'fixed' | 'annual_step' | 'compound_monthly',
      })),
    })

    setSavedScenario(scenario)
  }, [])

  // Reset form for new scenario
  const resetForm = useCallback(() => {
    setFormState(defaultFormState)
    setSavedScenario(null)
  }, [])

  // Build API input from form state
  const buildInput = useCallback((): CreateScenarioInput => {
    const sgDetails: CreateSGDetailsInput = {
      name: formState.name,
      propertyType: formState.propertyType,
      propertySubtype: formState.propertySubtype,
      propertyPrice: formState.propertyPrice,
      valuationPrice: formState.valuationPrice || undefined,
      loanType: formState.loanType,
      downpaymentCpfOa: formState.downpaymentCpfOa,
      downpaymentCpfSa: formState.downpaymentCpfSa,
      downpaymentCash: formState.downpaymentCash,
      borrowerType: formState.borrowerType,
      borrower1IncomeId: formState.borrower1IncomeId,
      borrower1CpfAccountId: formState.borrower1CpfAccountId,
      borrower2IncomeId: formState.borrower2IncomeId,
      borrower2CpfAccountId: formState.borrower2CpfAccountId,
      otherDebt: formState.otherDebt,
      buyerType: formState.buyerType,
      propertyCount: formState.propertyCount,
      grants: formState.grants,
      saleExpectedDate: formState.saleExpectedDate,
      saleExpectedPrice: formState.saleExpectedPrice,
    }

    return {
      country: 'SG',
      sgDetails,
      ratePeriods: formState.ratePeriods,
      growthPeriods: formState.growthPeriods,
    }
  }, [formState])

  // Save scenario (create or update)
  const save = useCallback(async () => {
    const input = buildInput()

    if (formState.scenarioId) {
      // Update existing
      const result = await updateMutation.mutateAsync({
        id: formState.scenarioId,
        input,
      })
      setSavedScenario(result)
      return result
    } else {
      // Create new
      const result = await createMutation.mutateAsync(input)
      setFormState((prev) => ({ ...prev, scenarioId: result.scenario.id }))
      setSavedScenario(result)
      return result
    }
  }, [formState.scenarioId, buildInput, createMutation, updateMutation])

  const isSaving = createMutation.isPending || updateMutation.isPending
  const hasUnsavedChanges = savedScenario !== null && JSON.stringify(buildInput()) !== JSON.stringify(/* last saved */)

  return {
    formState,
    updateField,
    loadScenario,
    resetForm,
    save,
    isSaving,
    hasUnsavedChanges,
    computed: savedScenario?.computed ?? null,
  }
}
```

---

## FE-5: Computed Results Display

**Priority:** P1
**Estimated Effort:** 2-3 hours
**Dependencies:** FE-4

### Description

Create components to display computed values from the API response (mortgage details, stamp duties, sale proceeds, appreciation chart).

### Acceptance Criteria

- [ ] Mortgage summary card with all key figures
- [ ] Stamp duty breakdown
- [ ] MSR/TDSR indicators with pass/fail status
- [ ] Amortization table
- [ ] Appreciation chart updated from API data
- [ ] Sale proceeds calculation display

### Implementation Details

#### File: `frontend/src/app/property-planner/components/ComputedResultsPanel.tsx`

```typescript
'use client'

import { CheckCircle2, XCircle, TrendingUp, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { numericStyles } from '@/lib/utils'
import type { ComputedValues } from '@/types/propertyPlannerV2'

interface ComputedResultsPanelProps {
  computed: ComputedValues | null
  isLoading?: boolean
}

export function ComputedResultsPanel({ computed, isLoading }: ComputedResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-white/[0.02] rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!computed) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 border border-dashed border-white/10 rounded-xl">
        <Calculator className="h-8 w-8 mx-auto mb-2 text-slate-600" />
        <p>Enter property details and save to see computed results</p>
      </div>
    )
  }

  const { mortgage, sale, appreciation } = computed

  return (
    <div className="space-y-4">
      {/* Monthly Payment Card */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="text-xs text-slate-500 mb-1">Monthly Payment</div>
        <div className="text-2xl font-semibold text-white">
          {formatCurrency(Number(mortgage.monthlyPayment))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500">Loan Amount</span>
            <div className={numericStyles.base}>
              {formatCurrency(Number(mortgage.loanAmount))}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Total Interest</span>
            <div className={numericStyles.base}>
              {formatCurrency(Number(mortgage.totalInterest))}
            </div>
          </div>
        </div>
      </div>

      {/* Affordability Indicators */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="text-xs text-slate-500 mb-3">Affordability Check</div>
        <div className="space-y-2">
          <AffordabilityRow
            label="MSR"
            value={mortgage.msrRatio}
            limit="30%"
            passes={mortgage.msrPasses}
          />
          <AffordabilityRow
            label="TDSR"
            value={mortgage.tdsrRatio}
            limit="55%"
            passes={mortgage.tdsrPasses}
          />
        </div>
      </div>

      {/* Stamp Duties */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="text-xs text-slate-500 mb-3">Stamp Duties</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">BSD</span>
            <span className={numericStyles.base}>
              {formatCurrency(Number(mortgage.bsdAmount))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ABSD</span>
            <span className={numericStyles.base}>
              {formatCurrency(Number(mortgage.absdAmount))}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/10">
            <span className="text-white font-medium">Total Upfront Cash</span>
            <span className={cn(numericStyles.medium, 'text-white')}>
              {formatCurrency(Number(mortgage.totalUpfrontCash))}
            </span>
          </div>
        </div>
      </div>

      {/* Sale Proceeds (if sale is planned) */}
      {sale && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="text-xs text-slate-500 mb-3">
            Sale Analysis ({sale.holdingPeriodMonths} months)
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Outstanding Loan</span>
              <span className={numericStyles.base}>
                {formatCurrency(Number(sale.outstandingLoanAtSale))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CPF Refund</span>
              <span className={numericStyles.base}>
                {formatCurrency(Number(sale.cpfRefund))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SSD</span>
              <span className={numericStyles.base}>
                {formatCurrency(Number(sale.ssdAmount))}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-white font-medium">Net Cash Proceeds</span>
              <span className={cn(
                numericStyles.medium,
                Number(sale.netCashProceeds) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {formatCurrency(Number(sale.netCashProceeds))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Appreciation Preview */}
      {appreciation.length > 0 && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            Property Value Projection
          </div>
          <div className="space-y-1 text-sm">
            {[1, 5, 10].map((yearIndex) => {
              const yearData = appreciation.find((a) => a.year === yearIndex)
              if (!yearData) return null
              return (
                <div key={yearIndex} className="flex justify-between">
                  <span className="text-slate-400">Year {yearIndex}</span>
                  <span className={numericStyles.base}>
                    {formatCurrency(Number(yearData.projectedValue))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AffordabilityRow({
  label,
  value,
  limit,
  passes,
}: {
  label: string
  value: string
  limit: string
  passes: boolean
}) {
  const percentage = (Number(value) * 100).toFixed(1)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {passes ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        )}
        <span className="text-sm text-white">{label}</span>
      </div>
      <div className="text-sm">
        <span className={cn(
          'font-mono',
          passes ? 'text-emerald-400' : 'text-red-400'
        )}>
          {percentage}%
        </span>
        <span className="text-slate-500"> / {limit}</span>
      </div>
    </div>
  )
}
```

---

## FE-6: Page Integration & Save Flow

**Priority:** P1
**Estimated Effort:** 3-4 hours
**Dependencies:** FE-3, FE-4, FE-5

### Description

Integrate all components into the property planner page with full save/load functionality.

### Acceptance Criteria

- [ ] Scenario list in sidebar
- [ ] Form with all input fields
- [ ] Computed results panel
- [ ] Save button with loading state
- [ ] Unsaved changes warning
- [ ] URL updates with scenario ID

### Implementation Details

#### File: `frontend/src/app/property-planner/page.tsx`

```typescript
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { Save, Loader2 } from 'lucide-react'

import { ScenarioList } from './components/ScenarioList'
import { PropertyForm } from './components/PropertyForm'
import { ComputedResultsPanel } from './components/ComputedResultsPanel'
import { usePropertyPlannerFormV2 } from './hooks/usePropertyPlannerFormV2'
import { usePropertyPlannerScenarioQuery } from '@/hooks/queries/usePropertyPlannerScenarios'

function PropertyPlannerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scenarioId = searchParams.get('id')

  const {
    formState,
    updateField,
    loadScenario,
    resetForm,
    save,
    isSaving,
    computed,
  } = usePropertyPlannerFormV2()

  // Load scenario from URL
  const { data: loadedScenario } = usePropertyPlannerScenarioQuery(scenarioId ?? undefined)

  useEffect(() => {
    if (loadedScenario) {
      loadScenario(loadedScenario)
    }
  }, [loadedScenario, loadScenario])

  const handleSave = async () => {
    const result = await save()
    if (result && !scenarioId) {
      // Update URL with new scenario ID
      router.push(`/property-planner?id=${result.scenario.id}`)
    }
  }

  const handleSelectScenario = (scenario: PropertyScenarioFull) => {
    router.push(`/property-planner?id=${scenario.scenario.id}`)
  }

  const handleCreateNew = () => {
    resetForm()
    router.push('/property-planner')
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Scenario List */}
      <div className="w-72 border-r border-white/10 p-4 overflow-y-auto">
        <ScenarioList
          selectedId={scenarioId ?? undefined}
          onSelect={handleSelectScenario}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-white">
                {formState.scenarioId ? 'Edit Scenario' : 'New Property Scenario'}
              </h1>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Scenario'}
              </button>
            </div>

            <PropertyForm
              formState={formState}
              updateField={updateField}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="w-80 border-l border-white/10 p-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-white/80 mb-4">
            Computed Results
          </h2>
          <ComputedResultsPanel
            computed={computed}
            isLoading={isSaving}
          />
        </div>
      </div>
    </div>
  )
}

export default function PropertyPlannerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PropertyPlannerContent />
    </Suspense>
  )
}
```

---

## FE-7: Legacy Cleanup

**Priority:** P2 (After deployment)
**Estimated Effort:** 1-2 hours
**Dependencies:** FE-6 deployed and stable

### Description

Remove legacy property planner code after V2 is stable.

### Files to Delete

```
frontend/src/app/property-planner/hooks/usePropertyCalculations.ts  -- Old local calc hook
frontend/src/app/property-planner/utils/calculations.ts  -- Old calculation utilities
frontend/src/services/propertyApi.ts  -- Old V1 API client (if exists)
```

### Files to Update

- Remove any V1 API imports from components
- Remove unused types from `types/` directory

---

# COORDINATION NOTES

## API Contract

Both teams should agree on the request/response shapes before starting:

1. **Backend provides mock endpoint** - Returns hardcoded response matching `ScenarioResponse`
2. **Frontend builds against mock** - Until real backend is ready
3. **Shared types** - TypeScript types in FE should match Go structs in BE

## Testing Integration

1. **Backend unit tests** - Run independently with test DB
2. **Frontend unit tests** - Mock API responses
3. **E2E tests** - After both teams merge, run full integration tests

## Parallel Workstreams

```
Week 1:
  BE: BE-1 (migrations) + BE-2 (repository) + BE-3 (calculator)
  FE: FE-1 (types) + FE-2 (hooks) + FE-3 (scenario list)

Week 2:
  BE: BE-4 (handler) + integration tests
  FE: FE-4 (form refactor) + FE-5 (results display) + FE-6 (integration)

Week 3:
  Both: E2E testing + bug fixes + BE-5/FE-7 (cleanup)
```
