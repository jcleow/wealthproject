# CPF Integration Implementation Tickets

**Epic**: Integrate CPF contributions and accounts into main financial planning app
**Status**: Ready for Implementation
**Created**: December 4, 2024

---

## Overview

This epic integrates Singapore CPF (Central Provident Fund) contributions and account tracking into the main financial planning application. When users add employment income, the system will:

1. Classify wages as regular (OW) or irregular (AW) for CPF calculation
2. Calculate and display CPF contributions using prevailing rates
3. Show net take-home pay with detailed breakdown
4. Create a CPF contributions subsection within income cards
5. Reflect CPF account balances (OA/SA/MA/RA) as assets

**User Flow Summary**:
- User completes CPF profile setup (DOB, residency status)
- User adds salary income → system calculates CPF contributions
- Income card shows gross wage and net take-home with tooltip
- Separate CPF subsection shows employee + employer contributions
- CPF accounts appear in Assets section with real-time balances
- RA account only visible after user turns 55

---

## Ticket Structure

Each ticket follows this format:
- **Type**: [Backend | Frontend | Database | Integration | Testing]
- **Priority**: [P0-Critical | P1-High | P2-Medium | P3-Low]
- **Effort**: [Small: 1-2h | Medium: 3-5h | Large: 1-2d | XLarge: 3+d]
- **Dependencies**: Other tickets that must complete first
- **Acceptance Criteria**: Clear definition of done

---

## Phase 1: Database & Backend Foundation

### Ticket 1.1: Extend CPF Configuration for Time-Based Changes

**Type**: Database + Backend
**Priority**: P0-Critical
**Effort**: Medium (3-4h)
**Dependencies**: None

**Description**:
Modify the CPF account system to support time-based residency configurations (e.g., user becomes PR in 2023, becomes citizen in 2025). This requires:
1. Creating a `cpf_account_configs` table for historical configurations
2. Updating the existing `cpf_accounts` table to reference active config
3. Adding Go service methods to retrieve correct config for a given date

**Technical Details**:
```sql
-- New table: cpf_account_configs
CREATE TABLE cpf_account_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    effective_date DATE NOT NULL,
    residency_status TEXT NOT NULL,
    pr_grant_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cpf_configs_residency_check CHECK (
        residency_status IN ('citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus')
    ),
    CONSTRAINT cpf_configs_unique UNIQUE (user_id, effective_date)
);

-- Modify cpf_accounts to add current_config_id reference
ALTER TABLE cpf_accounts ADD COLUMN current_config_id UUID REFERENCES cpf_account_configs(id);
```

**Go Implementation**:
- File: `backend/internal/cpf/account/repository.go`
- Add `CPFAccountConfig` struct
- Add `GetConfigForDate(ctx, userID, date)` method
- Add `CreateConfig(ctx, config)` method
- Add `ListConfigs(ctx, userID)` method

**Acceptance Criteria**:
- [x] Migration creates `cpf_account_configs` table
- [x] `GetConfigForDate()` returns correct config based on effective_date
- [x] Can create multiple configs per user with different effective dates
- [x] Config lookups handle edge cases (before first config, between configs)
- [x] Unit tests cover config selection logic

---

### Ticket 1.2: Update Income Schema to Store CPF Calculation Results

**Type**: Database
**Priority**: P0-Critical
**Effort**: Small (1h)
**Dependencies**: None

**Description**:
Extend the `finance_incomes` table to store calculated CPF contribution amounts and metadata from the contribution calculator. This allows us to display historical CPF data without recalculating.

**Migration**:
```sql
-- File: backend/migrations/20250104001_extend_incomes_cpf_results.up.sql

ALTER TABLE finance_incomes
ADD COLUMN IF NOT EXISTS employee_cpf_contribution DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS employer_cpf_contribution DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cpf_oa_allocation DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cpf_sa_allocation DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cpf_ma_allocation DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS cpf_ra_allocation DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS net_take_home DECIMAL(12,2);

COMMENT ON COLUMN finance_incomes.employee_cpf_contribution IS 'Calculated employee CPF contribution amount';
COMMENT ON COLUMN finance_incomes.employer_cpf_contribution IS 'Calculated employer CPF contribution amount';
COMMENT ON COLUMN finance_incomes.net_take_home IS 'Gross wage minus employee CPF contribution';
```

**Acceptance Criteria**:
- [x] Migration runs successfully on dev/staging/prod
- [x] Columns are nullable (existing records have NULL)
- [x] Down migration removes columns cleanly

---

### Ticket 1.3: Update Income Repository to Include CPF Fields

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Small (2h)
**Dependencies**: Ticket 1.2

**Description**:
Update the `Income` struct and repository methods to include new CPF fields. Update create/update operations to accept and store CPF calculation results.

**Files to Modify**:
- `backend/internal/financial/repository/store.go` - Update `Income` struct
- `backend/internal/financial/repository/income.go` - Update SQL queries
- `backend/internal/financial/types.go` - Update `IncomeParams`

**Go Changes**:
```go
// In repository/store.go
type Income struct {
    ID         string        `json:"id"`
    ParentID   string        `json:"parentId"`
    Source     string        `json:"source"`
    Amount     float64       `json:"amount"`
    Frequency  string        `json:"frequency"`
    // ... existing fields ...

    // CPF fields (added in Ticket 1.2)
    IncomeType              string   `json:"incomeType"`
    WageType                *string  `json:"wageType"`
    CPFApplicable           bool     `json:"cpfApplicable"`
    EmployeeCPFContribution *float64 `json:"employeeCpfContribution"`
    EmployerCPFContribution *float64 `json:"employerCpfContribution"`
    CPFOAAllocation         *float64 `json:"cpfOaAllocation"`
    CPFSAAllocation         *float64 `json:"cpfSaAllocation"`
    CPFMAAllocation         *float64 `json:"cpfMaAllocation"`
    CPFRAAllocation         *float64 `json:"cpfRaAllocation"`
    NetTakeHome             *float64 `json:"netTakeHome"`
}
```

**Acceptance Criteria**:
- [x] Income struct includes all CPF fields
- [x] CreateIncome() stores CPF fields
- [x] UpdateIncome() updates CPF fields
- [x] GetIncome() retrieves CPF fields
- [x] ListIncomes() includes CPF fields in results
- [x] Existing code continues to work (fields are optional)

---

### Ticket 1.4: Create CPF Contribution Service

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Medium (4h)
**Dependencies**: Ticket 1.1, Ticket 1.3

**Description**:
Create a service layer that integrates the existing CPF contribution calculator with income operations. This service will:
1. Fetch user's CPF config for income date
2. Call the contribution calculator
3. Return results for storage in income record

**New File**: `backend/internal/cpf/service/contribution_service.go`

```go
package service

import (
    "context"
    "time"
    "financial-chat-system/backend/internal/cpf/contribution"
    "financial-chat-system/backend/internal/cpf/account"
    "financial-chat-system/backend/internal/cpf/config"
)

type ContributionService struct {
    accountRepo *account.Repository
    configLoader *config.Loader
}

func NewContributionService(accountRepo *account.Repository, configLoader *config.Loader) *ContributionService {
    return &ContributionService{
        accountRepo: accountRepo,
        configLoader: configLoader,
    }
}

// CalculateForIncome calculates CPF contributions for a given income
func (s *ContributionService) CalculateForIncome(
    ctx context.Context,
    userID string,
    grossWage float64,
    wageType contribution.WageType,
    incomeDate time.Time,
) (*contribution.ContributionResult, error) {
    // 1. Get user's CPF config for the income date
    cpfConfig, err := s.accountRepo.GetConfigForDate(ctx, userID, incomeDate)
    if err != nil {
        return nil, err
    }

    // 2. Calculate age at income date
    age := s.calculateAge(cpfConfig.DateOfBirth, incomeDate)

    // 3. Load CPF rates for income year
    ratesConfig, err := s.configLoader.LoadForYear(incomeDate.Year())
    if err != nil {
        return nil, err
    }

    // 4. Create calculator and compute
    calc := contribution.NewCalculator(ratesConfig)

    var result contribution.ContributionResult
    if wageType == contribution.WageTypeOW {
        result = calc.CalculateOW(grossWage, age, cpfConfig.ResidencyStatus)
    } else {
        // For AW, we'd need YTD wages - to be implemented in Phase 2
        result = calc.CalculateAW(grossWage, age, cpfConfig.ResidencyStatus, 0, 0)
    }

    return &result, nil
}

// CalculateAnnualizedForIncome calculates annualized CPF from monthly income
func (s *ContributionService) CalculateAnnualizedForIncome(
    ctx context.Context,
    userID string,
    monthlyGrosswage float64,
    incomeDate time.Time,
) (*contribution.ContributionResult, error) {
    // Similar to above but calls CalculateAnnualFromMonthly
    // ...
}

func (s *ContributionService) calculateAge(dob time.Time, asOf time.Time) int {
    age := asOf.Year() - dob.Year()
    if asOf.YearDay() < dob.YearDay() {
        age--
    }
    return age
}
```

**Acceptance Criteria**:
- [x] Service integrates calculator with config repository
- [x] Correctly calculates age from DOB and income date
- [x] Returns contribution result with all fields populated
- [x] Handles missing CPF config gracefully (returns error)
- [x] Unit tests mock repository and config loader
- [x] Handles multiple residency statuses correctly

---

### Ticket 1.5: Update Financial Tools to Calculate CPF on Income Create/Update

**Type**: Backend
**Priority**: P1-High
**Effort**: Medium (3-4h)
**Dependencies**: Ticket 1.4

**Description**:
Modify the `createIncome` and `updateIncome` tool handlers to:
1. Check if income is CPF-applicable
2. Call ContributionService to calculate CPF
3. Store calculation results in income record
4. Return enriched data to LLM

**Files to Modify**:
- `backend/internal/financial/tools.go` - Update `createIncome` handler
- `backend/cmd/server/handlers/dispatch.go` - Ensure CPF fields returned

**Pseudocode**:
```go
// In tools.go - createIncome handler
func (c *Client) handleCreateIncome(params IncomeParams) (Income, error) {
    // ... existing validation ...

    // NEW: Check if CPF applicable
    if params.CPFApplicable && params.WageType != nil {
        // Calculate CPF contributions
        result, err := c.cpfService.CalculateForIncome(
            ctx,
            params.ParentID, // userID
            params.Amount,
            contribution.WageType(*params.WageType),
            time.Now(), // or params.StartDate
        )
        if err != nil {
            // If CPF calc fails, should we fail the whole operation?
            // For now, log warning and continue without CPF
            log.Warn("CPF calculation failed", "error", err)
        } else {
            // Populate CPF fields from calculation
            params.EmployeeCPFContribution = &result.EmployeeContribution
            params.EmployerCPFContribution = &result.EmployerContribution
            params.CPFOAAllocation = &result.Allocation.OA
            params.CPFSAAllocation = &result.Allocation.SA
            params.CPFMAAllocation = &result.Allocation.MA
            params.CPFRAAllocation = &result.Allocation.RA
            params.NetTakeHome = &result.TakeHomePay
        }
    }

    // Continue with existing create logic
    return c.store.CreateIncome(ctx, params)
}
```

**Acceptance Criteria**:
- [x] Income creation calculates CPF when cpf_applicable=true
- [x] Income creation without CPF continues to work
- [x] Tool response includes CPF fields for LLM context
- [x] Failed CPF calculation doesn't break income creation (graceful degradation)
- [x] Update operation also calculates CPF on changes
- [x] Integration test verifies end-to-end flow

---

## Phase 2: CPF Profile Setup

### Ticket 2.1: Create CPF Profile Setup API Endpoint

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Medium (3h)
**Dependencies**: Ticket 1.1

**Description**:
Create REST endpoints for CPF profile management:
- `POST /api/v1/cpf/profile` - Create initial CPF profile
- `GET /api/v1/cpf/profile` - Get current profile
- `POST /api/v1/cpf/profile/configs` - Add new time-based config
- `GET /api/v1/cpf/profile/configs` - List all configs

**New File**: `backend/cmd/server/handlers/cpf_profile.go`

```go
package handlers

type CPFProfileHandler struct {
    accountRepo *account.Repository
}

type CreateCPFProfileRequest struct {
    DateOfBirth      string `json:"dateOfBirth"`      // YYYY-MM-DD
    ResidencyStatus  string `json:"residencyStatus"`  // citizen, pr_year_1, etc.
    PRGrantDate      *string `json:"prGrantDate"`     // YYYY-MM-DD, optional
}

type CPFProfileResponse struct {
    DateOfBirth      string                     `json:"dateOfBirth"`
    CurrentConfig    account.CPFAccountConfig   `json:"currentConfig"`
    Configs          []account.CPFAccountConfig `json:"configs"`
    AccountBalances  *CPFBalances               `json:"accountBalances"`
}

type CPFBalances struct {
    OA float64 `json:"oa"`
    SA float64 `json:"sa"`
    MA float64 `json:"ma"`
    RA float64 `json:"ra"`
}

func (h *CPFProfileHandler) HandleCreateProfile(w http.ResponseWriter, r *http.Request) {
    // 1. Parse request
    // 2. Validate DOB, residency status
    // 3. Create initial config with effective_date = DOB
    // 4. Create cpf_accounts row with balances = 0
    // 5. Return profile response
}

func (h *CPFProfileHandler) HandleGetProfile(w http.ResponseWriter, r *http.Request) {
    // 1. Get userID from auth
    // 2. Fetch cpf_accounts and all configs
    // 3. Return profile response with current balances
}

func (h *CPFProfileHandler) HandleAddConfig(w http.ResponseWriter, r *http.Request) {
    // 1. Parse new config with effective_date
    // 2. Validate effective_date > last config
    // 3. Insert new config
    // 4. If effective_date <= today, update current_config_id
    // 5. Return updated profile
}
```

**Acceptance Criteria**:
- [x] POST /cpf/profile creates profile and initial config
- [x] GET /cpf/profile returns profile with all configs
- [x] POST /cpf/profile/configs adds time-based config
- [x] Endpoint validates DOB format and residency status
- [x] Endpoint returns 404 if profile doesn't exist
- [x] Endpoint enforces one profile per user
- [x] Integration test covers full flow

---

### Ticket 2.2: Create CPF Profile Setup Frontend Component

**Type**: Frontend
**Priority**: P0-Critical
**Effort**: Large (6-8h)
**Dependencies**: Ticket 2.1

**Description**:
Create a multi-step CPF profile setup modal that collects:
1. Date of birth
2. Current residency status (Citizen / PR)
3. If PR: PR grant date
4. Option to add historical config changes

**New File**: `frontend/src/components/modals/CPFProfileSetupModal.tsx`

**Features**:
- Step 1: Date of birth input with validation (user must be 18+)
- Step 2: Residency status selection (Citizen / PR Year 1 / PR Year 2 / PR Year 3+)
- Step 3: If PR, collect PR grant date
- Step 4: Summary and confirmation
- Option to add "historical changes" (e.g., became PR in 2023)

**UI/UX Requirements**:
- Use glassmorphic dark theme consistent with app
- Show helper text explaining each field
- Display example: "If you became PR on Jan 1, 2023, enter that date"
- Disable "Next" until all required fields filled
- Show progress indicator (Step 1 of 4)

**Validation**:
- DOB must be valid date and result in age 18+
- Residency status required
- If PR selected, PR grant date required and must be after DOB
- Historical configs must have effective_date in chronological order

**Acceptance Criteria**:
- [x] Modal renders with 4 steps
- [x] DOB input validates age >= 18
- [x] Residency status selection works
- [x] PR grant date conditionally required
- [x] Submit creates profile via API
- [x] Success closes modal and refreshes data
- [x] Error handling shows user-friendly messages
- [x] Responsive on mobile

---

### Ticket 2.3: Add CPF Profile Check to Income Creation Flow

**Type**: Frontend + Backend
**Priority**: P1-High
**Effort**: Small (2h)
**Dependencies**: Ticket 2.2

**Description**:
Before allowing user to create CPF-applicable income, check if CPF profile exists. If not, prompt user to complete profile setup first.

**Frontend Changes**:
- `frontend/src/components/modals/FinancialFormModal.tsx`
- When user selects income_type="salary" or cpf_applicable=true
- Check if CPF profile exists (query endpoint)
- If no profile, show alert: "Please complete CPF profile setup first" with button to open CPFProfileSetupModal

**Backend Changes**:
- `backend/internal/financial/tools.go` - createIncome handler
- If cpf_applicable=true, verify CPF profile exists
- Return error if missing: "CPF profile required. Please complete profile setup."

**Acceptance Criteria**:
- [x] Creating salary income without profile shows setup prompt
- [x] Creating non-CPF income works without profile
- [x] Backend rejects CPF income without profile
- [x] After completing profile, income creation works
- [x] Profile check cached to avoid repeated API calls

---

## Phase 3: Income UI Enhancements

### Ticket 3.1: Add Net Take-Home Display to Income Cards

**Type**: Frontend
**Priority**: P1-High
**Effort**: Small (2h)
**Dependencies**: Ticket 1.5

**Description**:
Update income display cards to show net take-home pay instead of (or in addition to) gross amount. Add tooltip with breakdown.

**Files to Modify**:
- `frontend/src/components/dashboard/FinancialDataManagement.tsx`
- Update income card rendering to display `netTakeHome` if available
- If `netTakeHome` is null, fallback to showing `amount` (gross)

**UI Design**:
```
┌─────────────────────────────────────┐
│ Software Engineer Salary            │
│ $5,000 /month                       │  ← Shows NET take-home
│ [info icon with tooltip]            │
├─────────────────────────────────────┤
│ Start: 2024 · End: 2040             │
└─────────────────────────────────────┘
```

**Tooltip Content** (shown on hover):
```
Gross Wage: $6,000.00
Employee CPF: -$1,200.00 (20%)
━━━━━━━━━━━━━━━━━━━━━━
Net Take-Home: $5,000.00
```

**Acceptance Criteria**:
- [x] Income cards show netTakeHome if available
- [x] Tooltip displays gross wage and employee CPF
- [x] Tooltip shows CPF percentage
- [x] Non-CPF income shows amount without tooltip
- [x] Formatting consistent with app theme
- [x] Tooltip accessible (keyboard navigation)

---

### Ticket 3.2: Create CPF Contributions Subsection in Income Cards

**Type**: Frontend
**Priority**: P1-High
**Effort**: Medium (4-5h)
**Dependencies**: Ticket 1.5

**Description**:
Add a collapsible "CPF Contributions" subsection within each income card that displays:
- Employee contribution amount
- Employer contribution amount
- Total contribution
- Breakdown by account (OA/SA/MA/RA)

**Design**:
```
┌─────────────────────────────────────────────────────────┐
│ Software Engineer Salary                                │
│ $5,000 /month (net)                      [Edit] [Delete]│
├─────────────────────────────────────────────────────────┤
│ ▼ CPF Contributions                                     │ ← Collapsible
│   ┌───────────────────────────────────────────────────┐ │
│   │ Employee:  $1,200.00 (20%)                        │ │
│   │ Employer:  $1,020.00 (17%)                        │ │
│   │ ───────────────────────────                       │ │
│   │ Total:     $2,220.00 /month                       │ │
│   │                                                    │ │
│   │ Account Allocation (monthly):                     │ │
│   │ • OA (Ordinary):  $1,442.00 (65%)                 │ │
│   │ • SA (Special):   $444.00 (20%)                   │ │
│   │ • MA (MediSave):  $334.00 (15%)                   │ │
│   └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:
- Use Radix UI Collapsible component
- Show only if income has CPF data
- Default state: collapsed (show chevron to indicate expandable)
- Display monthly amounts (convert if frequency != monthly)
- Color-code accounts (OA: emerald, SA: blue, MA: amber)

**Acceptance Criteria**:
- [x] CPF subsection appears only for CPF-applicable income
- [x] Collapsible works (click to expand/collapse)
- [x] Shows employee, employer, and total contributions
- [x] Shows account allocation with percentages
- [x] Amounts formatted as currency
- [x] Responsive on mobile (stacks vertically)
- [x] Matches glassmorphic theme

---

### Ticket 3.3: Add CPF Fields to Income Form Modal

**Type**: Frontend
**Priority**: P1-High
**Effort**: Medium (3-4h)
**Dependencies**: Ticket 2.3

**Description**:
Update the income creation/edit form to include CPF-related fields:
- Income type selector (Salary, Bonus, Commission, Rental, Dividend, Other)
- CPF applicable checkbox (auto-checked for Salary/Bonus/Commission)
- Wage type selector (Regular/Irregular) - only shown if CPF applicable

**Files to Modify**:
- `frontend/src/components/modals/FinancialFormModal.tsx`

**Form Layout**:
```
┌─────────────────────────────────────────────┐
│ Add Income                                  │
├─────────────────────────────────────────────┤
│ Income Source                               │
│ [Software Engineer Salary            ]      │
│                                             │
│ Income Type                                 │
│ [Salary ▼]  ← Dropdown                     │
│                                             │
│ ☑ Subject to CPF contributions             │
│   (auto-checked for employment income)      │
│                                             │
│ Wage Classification                         │
│ ◉ Regular (Ordinary Wages)                 │  ← Radio buttons
│ ○ Irregular (Bonus/Commission)             │
│                                             │
│ Monthly Amount                              │
│ [$6,000.00                        ]         │
│                                             │
│ Live Preview:                               │
│ ┌─────────────────────────────────────────┐│
│ │ Employee CPF: $1,200.00                 ││
│ │ Net Take-Home: $4,800.00                ││
│ └─────────────────────────────────────────┘│
│                                             │
│ [Cancel]                  [Save Income]    │
└─────────────────────────────────────────────┘
```

**Live Preview**:
- As user types amount, show real-time CPF calculation
- Debounce API calls (500ms)
- Call backend preview endpoint (to be created in Ticket 3.4)

**Acceptance Criteria**:
- [x] Income type dropdown with all options
- [x] CPF checkbox auto-checks for employment types
- [x] Wage classification shows only when CPF applicable
- [x] Live preview updates on amount change
- [x] Form submits income_type, wage_type, cpf_applicable
- [x] Edit mode pre-fills all CPF fields
- [x] Validation prevents non-employment income from having CPF

---

### Ticket 3.4: Create CPF Preview API Endpoint

**Type**: Backend
**Priority**: P2-Medium
**Effort**: Small (2h)
**Dependencies**: Ticket 1.4

**Description**:
Create a lightweight endpoint for previewing CPF calculations without creating an income record. Used by frontend live preview.

**Endpoint**: `POST /api/v1/cpf/preview`

**Request**:
```json
{
  "grossWage": 6000.00,
  "wageType": "ow",
  "incomeDate": "2025-01-15"
}
```

**Response**:
```json
{
  "employeeContribution": 1200.00,
  "employerContribution": 1020.00,
  "totalContribution": 2220.00,
  "netTakeHome": 4800.00,
  "allocation": {
    "oa": 1442.00,
    "sa": 444.00,
    "ma": 334.00,
    "ra": 0
  },
  "ratesApplied": {
    "employee": 0.20,
    "employer": 0.17,
    "ageGroup": "55 and below",
    "residencyStatus": "citizen"
  }
}
```

**Implementation**:
- Reuse ContributionService from Ticket 1.4
- Return 400 if CPF profile doesn't exist
- Cache results for 5 minutes (same user, same inputs)

**Acceptance Criteria**:
- [x] Endpoint returns CPF calculation preview
- [x] Returns 400 if no CPF profile
- [x] Handles different wage types (OW/AW)
- [x] Performance < 100ms (with caching)
- [x] Integration test verifies accuracy

---

## Phase 4: CPF Accounts as Assets

### Ticket 4.1: Create API to Fetch CPF Accounts as Assets

**Type**: Backend
**Priority**: P1-High
**Effort**: Medium (3h)
**Dependencies**: Ticket 2.1

**Description**:
Create endpoint to retrieve user's CPF account balances formatted as asset objects for display in Assets section.

**Endpoint**: `GET /api/v1/cpf/accounts/assets`

**Response**:
```json
{
  "accounts": [
    {
      "id": "cpf-oa",
      "name": "CPF Ordinary Account (OA)",
      "category": "cpf",
      "currentValue": 45000.00,
      "annualGrowthRate": 0.025,
      "frequency": "monthly",
      "notes": "2.5% base interest + extra interest on first $20k",
      "isSystemManaged": true,
      "metadata": {
        "accountType": "oa",
        "extraInterest": 125.00,
        "effectiveRate": 0.0317
      }
    },
    {
      "id": "cpf-sa",
      "name": "CPF Special Account (SA)",
      "category": "cpf",
      "currentValue": 25000.00,
      "annualGrowthRate": 0.04,
      "frequency": "monthly",
      "notes": "4% base interest + extra interest on first $60k (combined OA+SA)",
      "isSystemManaged": true,
      "metadata": {
        "accountType": "sa",
        "extraInterest": 200.00,
        "effectiveRate": 0.048
      }
    },
    {
      "id": "cpf-ma",
      "name": "CPF MediSave Account (MA)",
      "category": "cpf",
      "currentValue": 15000.00,
      "annualGrowthRate": 0.04,
      "frequency": "monthly",
      "notes": "4% base interest + extra interest",
      "isSystemManaged": true,
      "metadata": {
        "accountType": "ma",
        "basicHealthcareSum": 68500.00,
        "remainingToFull": 53500.00
      }
    }
    // RA only included if user age >= 55
  ]
}
```

**Business Rules**:
- RA (Retirement Account) only returned if user's current age >= 55
- Calculate extra interest based on current balances
- Set `isSystemManaged=true` to prevent direct editing
- Use actual balances from `cpf_accounts` table

**New File**: `backend/cmd/server/handlers/cpf_assets.go`

**Acceptance Criteria**:
- [x] Endpoint returns 3-4 CPF accounts based on age
- [x] RA only included for users 55+
- [x] Balances match cpf_accounts table
- [x] Extra interest calculated correctly
- [x] Returns 404 if no CPF profile
- [x] Integration test verifies business rules

---

### Ticket 4.2: Display CPF Accounts in Assets Section

**Type**: Frontend
**Priority**: P1-High
**Effort**: Medium (4h)
**Dependencies**: Ticket 4.1

**Description**:
Integrate CPF accounts into the Assets section of FinancialDataManagement. Display CPF accounts with special styling to indicate they're system-managed.

**Files to Modify**:
- `frontend/src/components/dashboard/FinancialDataManagement.tsx`
- Fetch CPF accounts via new endpoint
- Merge with regular assets
- Display with distinctive styling

**Design**:
```
Assets Section
┌──────────────────────────────────────────────────────┐
│ CPF Accounts                              [View All] │ ← New subsection
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐│
│ │ 🏦 CPF Ordinary Account (OA)                     ││
│ │ $45,000.00                      [System Managed] ││ ← Badge
│ │ 3.17% effective rate (includes extra interest)   ││
│ └──────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────┐│
│ │ 🏦 CPF Special Account (SA)                      ││
│ │ $25,000.00                      [System Managed] ││
│ │ 4.8% effective rate (includes extra interest)    ││
│ └──────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────┐│
│ │ 🏦 CPF MediSave Account (MA)                     ││
│ │ $15,000.00                      [System Managed] ││
│ │ $53,500 to Basic Healthcare Sum                  ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘

Other Assets                                 [+ Add New]
┌──────────────────────────────────────────────────────┐
│ ... regular assets ...                                │
└──────────────────────────────────────────────────────┘
```

**Features**:
- CPF accounts grouped in separate subsection at top
- "System Managed" badge (non-editable, non-deletable)
- Click opens read-only detail modal (no edit button)
- Show effective interest rate with tooltip explaining extra interest
- Distinctive icon (bank/shield icon)

**Acceptance Criteria**:
- [x] CPF accounts section appears at top of Assets
- [x] Shows 3-4 accounts based on user age
- [x] System Managed badge prevents editing
- [x] Click opens read-only modal
- [x] Effective rate shown with tooltip
- [x] Responsive layout on mobile
- [x] Gracefully handles missing CPF profile (don't show section)

---

### Ticket 4.3: Update CPF Account Balances When Income is Added

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Medium (4h)
**Dependencies**: Ticket 1.5, Ticket 4.1

**Description**:
When CPF-applicable income is created, update the corresponding CPF account balances in `cpf_accounts` table. This creates a feedback loop where:
1. User adds salary → CPF calculated → Income stored
2. Backend updates cpf_accounts.oa_balance, sa_balance, ma_balance, ra_balance
3. Frontend refreshes and shows updated CPF asset balances

**Implementation Strategy**:
We need to handle two scenarios:
- **Scenario planning mode**: Income is for future projection, don't update actual balances
- **Current income mode**: Income represents real current income, update balances

For now, implement simple approach:
- Only update balances if income.startYear <= currentYear
- Use allocation amounts from contribution calculation

**Files to Modify**:
- `backend/internal/financial/tools.go` - createIncome handler
- `backend/internal/cpf/account/repository.go` - Add UpdateBalances method

**Pseudocode**:
```go
// After creating income with CPF data
if income.StartYear <= time.Now().Year() && income.CPFApplicable {
    // Update CPF account balances
    err := c.cpfAccountRepo.UpdateBalances(ctx, income.ParentID, UpdateBalancesParams{
        OAIncrement: *income.CPFOAAllocation,
        SAIncrement: *income.CPFSAAllocation,
        MAIncrement: *income.CPFMAAllocation,
        RAIncrement: *income.CPFRAAllocation,
    })
    if err != nil {
        log.Error("Failed to update CPF balances", "error", err)
        // Don't fail income creation, just log
    }
}
```

**Database Method**:
```go
// In cpf/account/repository.go
type UpdateBalancesParams struct {
    OAIncrement float64
    SAIncrement float64
    MAIncrement float64
    RAIncrement float64
}

func (r *Repository) UpdateBalances(ctx context.Context, userID string, params UpdateBalancesParams) error {
    query := `
        UPDATE cpf_accounts
        SET
            oa_balance = oa_balance + $1,
            sa_balance = sa_balance + $2,
            ma_balance = ma_balance + $3,
            ra_balance = ra_balance + $4,
            updated_at = NOW()
        WHERE user_id = $5
    `
    _, err := r.db.ExecContext(ctx, query,
        int64(params.OAIncrement*100), // Convert to cents
        int64(params.SAIncrement*100),
        int64(params.MAIncrement*100),
        int64(params.RAIncrement*100),
        userID,
    )
    return err
}
```

**Acceptance Criteria**:
- [x] Creating CPF income updates account balances
- [x] Future income (startYear > currentYear) doesn't update balances
- [x] Balances converted correctly (dollars to cents)
- [x] Update failure doesn't break income creation
- [x] Deleting income decrements balances (reverse operation)
- [x] Updating income adjusts balances (delete old, add new)
- [x] Integration test verifies balance updates

---

## Phase 5: Additional Features & Polish

### Ticket 5.1: Add CPF Profile Management UI

**Type**: Frontend
**Priority**: P2-Medium
**Effort**: Medium (4h)
**Dependencies**: Ticket 2.2

**Description**:
Create a settings/profile page where users can:
- View their CPF profile
- Edit date of birth (with warning about recalculations)
- Add new time-based residency configs
- View configuration history

**New File**: `frontend/src/components/settings/CPFProfileSettings.tsx`

**Features**:
- Display current profile (DOB, current residency)
- List all historical configs with effective dates
- "Add Configuration Change" button → opens mini-modal
- Edit DOB with warning: "Changing DOB will recalculate all CPF contributions"

**Acceptance Criteria**:
- [x] Settings page accessible from user menu
- [x] Shows current CPF profile
- [x] Can add new config with effective date
- [x] Configs displayed in chronological order
- [x] Warning shown before changing DOB
- [x] Changes trigger recalculation (if applicable)

---

### Ticket 5.2: Implement CPF Contribution Aggregation View

**Type**: Frontend + Backend
**Priority**: P2-Medium
**Effort**: Large (6h)
**Dependencies**: Ticket 3.2

**Description**:
Create a dedicated view that aggregates all CPF contributions across all income sources, showing:
- Monthly/annual totals
- Breakdown by account
- Year-over-year trends
- Employer vs employee split

**New Component**: `frontend/src/components/dashboard/CPFContributionsSummary.tsx`

**Backend Endpoint**: `GET /api/v1/cpf/contributions/summary?year=2025`

**Response**:
```json
{
  "year": 2025,
  "monthly": [
    {
      "month": "2025-01",
      "employeeTotal": 1200.00,
      "employerTotal": 1020.00,
      "totalContribution": 2220.00,
      "allocation": {
        "oa": 1442.00,
        "sa": 444.00,
        "ma": 334.00,
        "ra": 0
      }
    }
    // ... 11 more months
  ],
  "annualTotal": {
    "employeeTotal": 14400.00,
    "employerTotal": 12240.00,
    "totalContribution": 26640.00
  }
}
```

**UI Features**:
- Bar chart showing monthly contributions
- Stacked bars (employee vs employer)
- Table with month-by-month breakdown
- Export to CSV button

**Acceptance Criteria**:
- [x] Summary view accessible from dashboard
- [x] Chart displays monthly contributions
- [x] Table shows detailed breakdown
- [x] Year selector to view historical data
- [x] Export to CSV works
- [x] Handles months with no income gracefully

---

### Ticket 5.3: Add CPF Interest Calculation and Projection

**Type**: Backend
**Priority**: P3-Low
**Effort**: XLarge (2-3d)
**Dependencies**: Ticket 4.3

**Description**:
Implement monthly CPF interest calculation based on official CPF interest rules:
- OA: 2.5% base + extra interest on first $20k
- SA: 4% base + extra interest on first $60k (combined OA+SA)
- MA: 4% base + extra interest on first $60k (combined)
- RA: 4% base + extra interest

Create a background job that:
1. Runs monthly (or triggered manually)
2. Calculates interest for all users
3. Updates account balances
4. Logs interest transactions

**New Package**: `backend/internal/cpf/interest/`

**Reference**:
- https://www.cpf.gov.sg/member/infohub/educational-resources/cpf-interest-rates-explained
- Extra interest: Additional 1% on first $60k across OA+SA+MA (capped at $20k for OA)

**Implementation**:
```go
// interest/calculator.go
type InterestCalculator struct {
    config *config.ConfigData
}

func (ic *InterestCalculator) CalculateMonthlyInterest(balances AccountBalances) InterestResult {
    // Implement CPF interest logic with extra interest rules
    // ...
}

// interest/service.go
type InterestService struct {
    accountRepo *account.Repository
    calculator  *InterestCalculator
}

func (s *InterestService) ApplyMonthlyInterest(ctx context.Context) error {
    // 1. Fetch all CPF accounts
    // 2. Calculate interest for each
    // 3. Update balances
    // 4. Log transaction
}
```

**Acceptance Criteria**:
- [x] Interest calculation matches CPF official calculator
- [x] Extra interest correctly applied on first $20k OA, $60k combined
- [x] Monthly job updates balances
- [x] Interest transactions logged
- [x] Unit tests verify calculation accuracy
- [x] Integration test runs full monthly cycle

---

### Ticket 5.4: Create CPF Projection Tool

**Type**: Frontend + Backend
**Priority**: P3-Low
**Effort**: XLarge (3-4d)
**Dependencies**: Ticket 5.3

**Description**:
Build a projection tool that forecasts CPF balances over 5/10/20/30 years based on:
- Current balances
- Expected salary growth
- Planned voluntary contributions
- Housing usage plans
- Retirement milestone targets (BRS/FRS/ERS)

This is a mini-version of the full CPF simulation from the PRD.

**New Component**: `frontend/src/components/cpf/CPFProjectionTool.tsx`

**Backend Endpoint**: `POST /api/v1/cpf/projection`

**Features**:
- Input: salary growth rate, voluntary top-ups, housing withdrawal plans
- Output: Year-by-year balance projections
- Milestone markers: When you hit FRS, ERS, etc.
- Interactive chart with scenario comparison
- Export projection to PDF

**Acceptance Criteria**:
- [x] Projection calculates future balances accurately
- [x] Handles salary growth and contributions
- [x] Shows retirement milestones
- [x] Chart displays multi-year projection
- [x] Can compare multiple scenarios
- [x] Export to PDF works

---

## Testing & Quality Assurance

### Ticket 6.1: End-to-End Integration Tests

**Type**: Testing
**Priority**: P1-High
**Effort**: Large (6h)
**Dependencies**: All Phase 1-4 tickets

**Test Scenarios**:
1. **Profile Setup → Income Creation → Balance Update**
   - Create CPF profile
   - Add salary income
   - Verify CPF calculated correctly
   - Verify account balances updated
   - Verify UI shows correct amounts

2. **Multiple Income Sources**
   - Add OW (salary) and AW (bonus)
   - Verify wage ceiling logic
   - Verify total contributions correct

3. **Residency Status Changes**
   - Create profile as PR Year 1
   - Add income
   - Change to Citizen with effective date
   - Verify old income uses PR rates, new income uses citizen rates

4. **Age-Based Allocation**
   - Mock user with age 56
   - Verify RA account appears
   - Verify allocation percentages correct for age group

**Test File**: `backend/integration_tests/cpf_integration_test.go`

**Acceptance Criteria**:
- [x] All 4 test scenarios pass
- [x] Tests run in CI/CD pipeline
- [x] Database cleaned up after tests
- [x] Tests use realistic data
- [x] Code coverage > 80% for CPF packages

---

### Ticket 6.2: Frontend Component Tests

**Type**: Testing
**Priority**: P2-Medium
**Effort**: Medium (4h)
**Dependencies**: All Phase 3 tickets

**Test Files**:
- `frontend/src/components/modals/CPFProfileSetupModal.test.tsx`
- `frontend/src/components/dashboard/CPFContributionsSummary.test.tsx`
- `frontend/src/components/cpf/CPFAccountsDisplay.test.tsx`

**Test Coverage**:
- CPF profile setup form validation
- Income form CPF fields interaction
- CPF subsection expand/collapse
- Live preview debouncing
- Error handling (missing profile, API errors)

**Acceptance Criteria**:
- [x] All critical user flows tested
- [x] Tests use React Testing Library
- [x] Mock API responses
- [x] Tests run in CI
- [x] Coverage > 70% for CPF components

---

### Ticket 6.3: Data Migration Script for Existing Users

**Type**: Backend + Database
**Priority**: P2-Medium
**Effort**: Medium (4h)
**Dependencies**: Ticket 1.2

**Description**:
Create a migration script to handle existing users who may have income records created before CPF integration. This script will:
1. Identify income records with null CPF fields
2. Prompt admin to backfill or mark as non-CPF
3. Optionally recalculate CPF for existing salary income

**New File**: `backend/scripts/migrate_existing_income_cpf.go`

**Script Features**:
- Dry-run mode (preview changes without applying)
- Interactive mode (ask before each change)
- Batch mode (apply to all matching records)
- Rollback capability

**Acceptance Criteria**:
- [x] Script identifies existing income records
- [x] Dry-run shows what would change
- [x] Can backfill CPF data for historical records
- [x] Logs all changes
- [x] Rollback works if errors occur
- [x] Documentation explains how to run

---

## Documentation

### Ticket 7.1: Update API Documentation

**Type**: Documentation
**Priority**: P2-Medium
**Effort**: Small (2h)
**Dependencies**: All backend tickets

**Files to Update**:
- `docs/api/cpf-endpoints.md` (new file)
- Update OpenAPI spec with CPF endpoints
- Add request/response examples

**Sections**:
- CPF Profile Management
- CPF Contributions
- CPF Accounts as Assets
- CPF Projections

**Acceptance Criteria**:
- [x] All new endpoints documented
- [x] Request/response schemas complete
- [x] Examples provided for each endpoint
- [x] Error codes documented
- [x] Authentication requirements specified

---

### Ticket 7.2: User Guide for CPF Features

**Type**: Documentation
**Priority**: P3-Low
**Effort**: Small (2h)
**Dependencies**: All frontend tickets

**New File**: `docs/user-guide/cpf-features.md`

**Sections**:
1. Setting up your CPF profile
2. Adding CPF-applicable income
3. Understanding your CPF contributions
4. Viewing CPF account balances
5. CPF projections and planning
6. Frequently asked questions

**Acceptance Criteria**:
- [x] Step-by-step guides with screenshots
- [x] Common questions answered
- [x] Tips for optimizing CPF contributions
- [x] Links to official CPF resources

---

## Implementation Order & Dependencies

### Sprint 1 (Week 1): Foundation
- Ticket 1.1: Time-based configs ✓
- Ticket 1.2: Income schema ✓
- Ticket 1.3: Income repository ✓
- Ticket 1.4: Contribution service ✓
- Ticket 1.5: Tool integration ✓

### Sprint 2 (Week 2): Profile Setup
- Ticket 2.1: Profile API ✓
- Ticket 2.2: Profile UI ✓
- Ticket 2.3: Profile check ✓

### Sprint 3 (Week 3): Income UI
- Ticket 3.1: Net take-home display ✓
- Ticket 3.2: CPF subsection ✓
- Ticket 3.3: Income form fields ✓
- Ticket 3.4: Preview endpoint ✓

### Sprint 4 (Week 4): CPF as Assets
- Ticket 4.1: CPF accounts API ✓
- Ticket 4.2: Assets display ✓
- Ticket 4.3: Balance updates ✓

### Sprint 5 (Week 5+): Polish & Testing
- Ticket 5.1: Profile management ✓
- Ticket 5.2: Aggregation view ✓
- Ticket 6.1: Integration tests ✓
- Ticket 6.2: Component tests ✓
- Ticket 6.3: Data migration ✓
- Ticket 7.1: API docs ✓
- Ticket 7.2: User guide ✓

### Future (Backlog):
- Ticket 5.3: Interest calculation (P3)
- Ticket 5.4: Projection tool (P3)

---

## Success Metrics

After full implementation, we should achieve:
1. **Accuracy**: CPF calculations match CPF official calculator 100%
2. **Adoption**: 80%+ of users complete CPF profile setup
3. **Engagement**: Users check CPF balances at least monthly
4. **Data Quality**: 90%+ of salary income has CPF data populated
5. **Performance**: CPF calculations complete in < 200ms

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CPF rules change | Medium | High | Version configs by year, easy to update |
| User confusion about OW/AW | High | Medium | Clear UI labels, tooltips, auto-detect when possible |
| Balance sync issues | Medium | Medium | Audit logs, reconciliation scripts |
| Performance (many users) | Low | Medium | Caching, batch processing |
| Incorrect calculations | Low | High | Extensive testing, comparison with official calculator |

---

## Phase 6: Timeline Integration with Dynamic CPF Calculation

### Overview

Integrate CPF contributions into the timeline service (`financial_v2/timeline`) with dynamic calculation. Rather than pre-calculating and storing CPF results on income records, this approach calculates CPF contributions on-the-fly during timeline computation. This allows for:

1. **Dynamic calculation** - CPF calculated at runtime based on current rates and user age at each month
2. **YTD wage tracking** - Accurate AW ceiling calculations across multiple income sources
3. **Accumulated balances** - CPF accounts (OA/SA/MA/RA) grow month-by-month in timeline
4. **Gross with deduction display** - Income cards show gross amount minus employee CPF

### Data Flow

```
Income (cpfApplicable=true)
    │
    ▼
┌─────────────────────────────────────┐
│ CPF Processor                       │
│ - Get age from DOB at current date  │
│ - Get residency status              │
│ - Call calculator.CalculateOW()     │
│ - Track YTD wages for ceiling       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Result                              │
│ - Employee contribution → deduct    │
│ - Employer contribution             │
│ - Allocation (OA/SA/MA/RA)         │
└─────────────────────────────────────┘
    │
    ├──► Employee CPF deducted from NetCashFlow
    │
    └──► Total allocation added to CPF balances
```

---

### Ticket 6.1: Create CPF Processor Module

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Medium (4h)
**Dependencies**: Existing CPF calculator (internal/cpf/contribution)
**Status**: ✅ COMPLETED

**Description**:
Create a dedicated processor module that wraps the existing CPF contribution calculator and tracks state across timeline months. This module handles:
- YTD wage tracking for AW ceiling calculations
- Age calculation at each month
- State accumulation (OA/SA/MA/RA balances)

**Files Created**:
- `backend/internal/cpf/processor/processor.go`
- `backend/internal/cpf/processor/processor_test.go`

**Module Structure**:
```go
package processor

// Processor handles CPF contribution calculations for timeline processing.
type Processor struct {
    cpfAccount *account.CPFAccount
    configs    map[int]*config.CPFConfiguration // Config by year
}

// State tracks year-to-date wages and accumulated CPF balances across months.
type State struct {
    YTDOrdinaryWages *decimal.Decimal // Year-to-date capped OW
    YTDAWSWages      *decimal.Decimal // Year-to-date AW received
    AccumulatedOA    *decimal.Decimal // Running OA balance
    AccumulatedSA    *decimal.Decimal // Running SA balance
    AccumulatedMA    *decimal.Decimal // Running MA balance
    AccumulatedRA    *decimal.Decimal // Running RA balance
}

// ContributionResult contains the CPF calculation result for a single income.
type ContributionResult struct {
    GrossAmount          *decimal.Decimal
    CappedAmount         *decimal.Decimal // After wage ceiling applied
    EmployeeContribution *decimal.Decimal
    EmployerContribution *decimal.Decimal
    TotalContribution    *decimal.Decimal
    NetTakeHomePay       *decimal.Decimal
    AllocationOA         *decimal.Decimal
    AllocationSA         *decimal.Decimal
    AllocationMA         *decimal.Decimal
    AllocationRA         *decimal.Decimal
    WageType             WageType // "ow" or "aw"
}

// Key functions:
func NewProcessor(cpfAccount *account.CPFAccount) (*Processor, error)
func (p *Processor) ProcessOrdinaryWage(gross *decimal.Decimal, state *State, date time.Time) (*ContributionResult, error)
func (p *Processor) ProcessAdditionalWage(gross *decimal.Decimal, state *State, date time.Time) (*ContributionResult, error)
func (p *Processor) ResetYTDState(state *State) // Call at year boundary
func (p *Processor) AddContributionToState(result *ContributionResult, state *State)
func NewState(cpfAccount *account.CPFAccount) *State
func (s *State) TotalBalance() *decimal.Decimal
```

**Acceptance Criteria**:
- [x] Processor wraps existing calculator
- [x] YTD wage tracking works correctly
- [x] Handles OW and AW wage types
- [x] Year boundary reset clears YTD state
- [x] State accumulation tracks CPF balances
- [x] Unit tests pass (9 test cases)

---

### Ticket 6.2: Add CPF Fields to Income Struct in Repository

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Small (1h)
**Dependencies**: Ticket 6.1
**Status**: 🔲 TODO

**Description**:
Update the Income struct in `financial_v2/repository/store.go` to include CPF-related fields:

```go
type Income struct {
    // ... existing fields ...
    CPFApplicable bool   `json:"cpfApplicable"` // Subject to CPF deductions
    CPFWageType   string `json:"cpfWageType"`   // "ow" or "aw"
}
```

**Files to Modify**:
- `backend/internal/financial_v2/repository/store.go` - Add fields to Income struct
- `backend/internal/financial_v2/repository/store.go` - Update SQL queries in ListIncomes

**Acceptance Criteria**:
- [ ] Income struct includes CPFApplicable and CPFWageType fields
- [ ] ListIncomes query includes new columns
- [ ] Existing tests continue to pass

---

### Ticket 6.3: Integrate CPF Processor into Timeline Service

**Type**: Backend
**Priority**: P0-Critical
**Effort**: Large (6-8h)
**Dependencies**: Ticket 6.1, Ticket 6.2
**Status**: 🔲 TODO

**Description**:
Modify the timeline service (`ComputeFinancialSnapshot`) to:
1. Initialize CPF processor if user has CPF account
2. Process CPF for applicable incomes each month
3. Deduct employee CPF from net cash flow
4. Accumulate CPF balances in state
5. Include CPF data in month detail response

**Files to Modify**:
- `backend/internal/financial_v2/timeline/service.go`

**Implementation Changes**:

**a) Add CPF fields to FinancialDataRow:**
```go
type FinancialDataRow struct {
    // ... existing fields ...
    CPFApplicable bool
    CPFWageType   string
}
```

**b) Update loadEffectiveRows to fetch CPF account:**
```go
func (s *Service) loadEffectiveRows(...) (EffectiveRows, *account.CPFAccount, error)
```

**c) Modify ComputeFinancialSnapshot main loop:**
```go
// Initialize CPF processor if account exists
var cpfProcessor *processor.Processor
var cpfState *processor.State
if cpfAccount != nil {
    cpfProcessor, _ = processor.NewProcessor(cpfAccount)
    cpfState = processor.NewState(cpfAccount)
}

for monthIdx := 0; monthIdx < totalMonths; monthIdx++ {
    // Reset YTD at January
    if currentDate.Month() == 1 && cpfProcessor != nil {
        cpfProcessor.ResetYTDState(cpfState)
    }

    // Apply growth (existing)
    applyGrowth(...)

    // NEW: Process CPF for applicable incomes
    var totalEmployeeCPF *decimal.Decimal
    cpfContributions := make([]processor.ContributionResult, 0)

    for _, income := range activeIncomes {
        if income.CPFApplicable {
            var result *processor.ContributionResult
            if income.CPFWageType == "ow" {
                result, _ = cpfProcessor.ProcessOrdinaryWage(income.Amount, cpfState, currentDate)
            } else {
                result, _ = cpfProcessor.ProcessAdditionalWage(income.Amount, cpfState, currentDate)
            }
            cpfContributions = append(cpfContributions, *result)
            cpfProcessor.AddContributionToState(result, cpfState)
            totalEmployeeCPF, _ = totalEmployeeCPF.Add(result.EmployeeContribution)
        }
    }

    // Modify net cash flow to deduct employee CPF
    netCashFlow, _ = netCashFlow.Sub(totalEmployeeCPF)
}
```

**d) Update calculateNetCashFlow to accept CPF deductions:**
```go
func calculateNetCashFlow(data, state, date, cpfDeductions *decimal.Decimal) *decimal.Decimal
```

**e) Update buildMonthDetailResponse to include CPF data:**
```go
func buildMonthDetailResponse(..., cpfContributions []processor.ContributionResult, cpfBalances *processor.State) MonthDetailResponse
```

**Acceptance Criteria**:
- [ ] CPF processor initialized when CPF account exists
- [ ] YTD resets at year boundaries
- [ ] Employee CPF deducted from net cash flow
- [ ] CPF balances accumulate correctly
- [ ] CPF data included in response
- [ ] Integration tests verify full flow

---

### Ticket 6.4: Update Response Types for Income Cards

**Type**: Backend
**Priority**: P1-High
**Effort**: Small (2h)
**Dependencies**: Ticket 6.3
**Status**: 🔲 TODO

**Description**:
Update the timeline response types to include CPF breakdown on income cards.

**Files to Modify**:
- `backend/internal/financial_v2/timeline/types.go`

**Enhanced IncomeResponse:**
```go
type IncomeResponse struct {
    // ... existing fields ...
    CPFApplicable bool             `json:"cpfApplicable"`
    GrossAmount   *decimal.Decimal `json:"grossAmount,omitempty"`
    EmployeeCPF   *decimal.Decimal `json:"employeeCpf,omitempty"`
    EmployerCPF   *decimal.Decimal `json:"employerCpf,omitempty"`
    NetTakeHome   *decimal.Decimal `json:"netTakeHome,omitempty"`
}
```

**Enhanced CPFContributionResponse:**
```go
type CPFContributionResponse struct {
    IncomeID             string          `json:"incomeId"`
    IncomeName           string          `json:"incomeName"`
    GrossWage            decimal.Decimal `json:"grossWage"`
    EmployeeContribution decimal.Decimal `json:"employeeContribution"`
    EmployerContribution decimal.Decimal `json:"employerContribution"`
    TotalContribution    decimal.Decimal `json:"totalContribution"`
    WageType             string          `json:"wageType"`
    AllocationOA         decimal.Decimal `json:"allocationOa"`
    AllocationSA         decimal.Decimal `json:"allocationSa"`
    AllocationMA         decimal.Decimal `json:"allocationMa"`
    AllocationRA         decimal.Decimal `json:"allocationRa"`
}
```

**Enhanced CPFAssetResponse:**
```go
type CPFAssetResponse struct {
    AccountType string          `json:"accountType"` // "OA", "SA", "MA", "RA"
    Balance     decimal.Decimal `json:"balance"`
}
```

**Response Example:**
```json
{
  "incomes": [{
    "id": "inc-123",
    "name": "Monthly Salary",
    "amount": 8000,
    "cpfApplicable": true,
    "grossAmount": 8000,
    "employeeCpf": 1480,
    "employerCpf": 1258,
    "netTakeHome": 6520
  }],
  "cpfContributions": [{
    "incomeId": "inc-123",
    "incomeName": "Monthly Salary",
    "grossWage": 8000,
    "employeeContribution": 1480,
    "employerContribution": 1258,
    "totalContribution": 2738,
    "wageType": "ow",
    "allocationOa": 1700.5,
    "allocationSa": 443.7,
    "allocationMa": 593.8,
    "allocationRa": 0
  }],
  "cpfAssets": [
    {"accountType": "OA", "balance": 51700.50},
    {"accountType": "SA", "balance": 20443.70},
    {"accountType": "MA", "balance": 15593.80},
    {"accountType": "RA", "balance": 0}
  ]
}
```

**Acceptance Criteria**:
- [ ] IncomeResponse includes CPF fields
- [ ] CPFContributionResponse captures full breakdown
- [ ] CPFAssetResponse shows accumulated balances
- [ ] JSON serialization works correctly
- [ ] Frontend can consume new response format

---

### Test Scenarios for Timeline CPF Integration

| Test | Description |
|------|-------------|
| `TestCPF_TimelineIntegration_Under55_Citizen` | Standard rates, verify deductions over 12 months |
| `TestCPF_TimelineIntegration_AtCeiling` | Income at $7,400 OW ceiling |
| `TestCPF_TimelineIntegration_AboveCeiling` | Income capped at ceiling |
| `TestCPF_TimelineIntegration_YTDReset` | YTD resets in January across year boundary |
| `TestCPF_TimelineIntegration_MixedIncomes` | Some incomes with CPF, some without |
| `TestCPF_TimelineIntegration_Accumulation` | CPF balances grow correctly over months |
| `TestCPF_TimelineIntegration_NoCPFAccount` | Graceful handling if no CPF account |
| `TestCPF_TimelineIntegration_NetCashFlow` | Employee CPF deducted from cash flow |
| `TestCPF_TimelineIntegration_BonusAW` | Additional wages use AW ceiling calculation |

---

## Future Enhancements (Post-MVP)

1. **Housing Integration**
   - Track CPF usage for property purchase
   - Calculate accrued interest on property sale
   - Optimize OA usage vs cash payments

2. **Voluntary Contributions**
   - Cash top-ups with tax relief calculation
   - RSTU (Retirement Sum Top-Up) optimization
   - SA shielding strategies

3. **Retirement Planning**
   - CPF LIFE payout estimation
   - Plan comparison (Standard/Basic/Escalating)
   - Deferral analysis (age 65 vs 70)

4. **AI-Powered Insights**
   - "You're on track to meet FRS by age 55"
   - "Consider topping up $X to maximize tax relief"
   - "You can afford to use CPF for housing without impacting retirement"

---

## Appendix: Glossary

- **OA**: Ordinary Account - for housing, insurance, investment
- **SA**: Special Account - for retirement
- **MA**: MediSave Account - for healthcare
- **RA**: Retirement Account - created at age 55 from OA+SA
- **OW**: Ordinary Wages - regular monthly salary
- **AW**: Additional Wages - bonuses, commissions, irregular payments
- **BRS**: Basic Retirement Sum - minimum CPF balance at 55
- **FRS**: Full Retirement Sum - recommended balance
- **ERS**: Enhanced Retirement Sum - for higher payouts
- **BHS**: Basic Healthcare Sum - MediSave target balance

---

**End of CPF Integration Implementation Tickets**
