# Monthly Time Resolution Product Requirements Document

## Executive Summary

The Monthly Time Resolution feature enables Assetra users to view and manage their financial projections with monthly granularity, providing more precise tracking of month-to-month financial changes. This feature enhances the existing yearly timeline system with an adaptive zoom-based visualization that maintains performance while offering detailed monthly insights when needed.

**Value Proposition**: Users can now track monthly income variations, expense patterns, and life events with precision, making financial planning more accurate and actionable for real-world scenarios where significant changes happen month-to-month.

---

## Problem Statement

Users struggle to accurately model their financial future when significant changes occur on a monthly basis rather than annually. Current limitations create planning inaccuracies and user frustration.

**Pain Points**:
- **Monthly variation invisible**: Salary bonuses, seasonal income, and monthly expense patterns are averaged into annual figures, hiding important cash flow dynamics
- **Life events imprecise**: Major events (new job starting in March, child born in June) are modeled at year boundaries, not actual occurrence months
- **CPF contributions already monthly**: Backend calculates CPF monthly but aggregates to annual, losing precision in projections
- **Scenario events underutilized**: Scenario impacts support monthly precision (`start_month`/`end_month`) but timeline displays only yearly snapshots
- **Cash flow blind spots**: Users can't see which months may have cash deficits even if the year overall is positive

**User Quote**: "I need to track month-to-month changes because my income varies significantly throughout the year, and major life events happen on specific months, not just at year boundaries."

---

## Product Vision

Enable users to plan with monthly precision through an intelligent, performance-optimized timeline system that adapts to their viewing needs—from high-level yearly overview to detailed monthly analysis—while maintaining the simplicity and speed of the current experience.

**Success Criteria**:
- Users can toggle between yearly and monthly resolution in settings
- Chart displays 35-40 data points regardless of zoom level (performance maintained)
- Financial data cards show month-by-month details when in monthly mode
- Backend calculates monthly projections with compound monthly growth
- No breaking changes to existing yearly timeline functionality

---

## User Stories & Epics

### Epic 1: Backend Monthly Calculation Engine
**As a system, I want to calculate financial projections on a monthly basis so that I can provide precise month-to-month financial data.**

#### User Stories:
- **US1.1**: As the backend, I want to support a `resolution` parameter (`yearly` | `monthly`) so that I can return appropriate granularity
- **US1.2**: As the backend, I want to loop through months (0-420) instead of years (0-35) so that I can calculate monthly snapshots
- **US1.3**: As the backend, I want to apply monthly compound growth rates so that financial projections are mathematically accurate
- **US1.4**: As the backend, I want to convert all frequency inputs to monthly amounts so that calculations are consistent
- **US1.5**: As the backend, I want to return `TimelineMonth[]` with month-level detail so that frontend can display precise data

**Acceptance Criteria**:
- Timeline API accepts `?resolution=monthly` query parameter
- Monthly calculation completes in <3 seconds for 35-year horizon (420 months)
- Monthly compound growth formula: `amount * (1 + Math.pow(1 + annualRate/100, 1/12) - 1)`
- Returns array of 420 `TimelineMonth` objects with all financial items
- Backward compatible: defaults to `yearly` if parameter not provided

### Epic 2: Zoom-Based Chart Visualization
**As a user, I want to zoom in/out on my financial timeline so that I can see yearly overview or monthly details based on my needs.**

#### User Stories:
- **US2.1**: As a user, I want to see a yearly view by default (35 points) so that I get a high-level overview
- **US2.2**: As a user, I want to click "Zoom In" to see quarterly view (140 points over 10 years) so that I see more granular data
- **US2.3**: As a user, I want to zoom to monthly view (36 points over 3 years) so that I see month-by-month projections
- **US2.4**: As a user, I want to pan/scroll through time ranges so that I can explore different periods in detail
- **US2.5**: As a user, I want smooth transitions between zoom levels so that the experience feels fluid and intuitive

**Acceptance Criteria**:
- Chart always renders 35-40 visible points (performance optimized)
- Three zoom levels: Yearly (35 years visible), Quarterly (10 years visible), Monthly (3 years visible)
- Pan controls allow scrolling through time within zoom level
- X-axis labels adapt to zoom level (years → quarters → months)
- Chart performance remains <100ms render time at all zoom levels

### Epic 3: Monthly Financial Data Management
**As a user, I want to view and edit financial data at the month level so that I can precisely manage my finances.**

#### User Stories:
- **US3.1**: As a user, I want to see a month selector (Jan-Dec) when in monthly mode so that I can pick specific months
- **US3.2**: As a user, I want to see financial data cards update for the selected month so that I see month-specific values
- **US3.3**: As a user, I want to add/edit items with month-level start/end dates so that I can specify precise timing
- **US3.4**: As a user, I want to see monthly amounts in cards (not annualized) so that I understand actual monthly impact
- **US3.5**: As a user, I want month-by-month CPF contributions displayed so that I can track precise accumulation

**Acceptance Criteria**:
- Month selector appears below year selector when `timeResolution = 'monthly'`
- All financial cards display monthly data for selected year + month combination
- Item forms include `start_month` and `end_month` fields (1-12)
- Amounts displayed are monthly (not annualized) when in monthly resolution
- CPF contribution cards show monthly breakdown with running totals

### Epic 4: User Settings & Resolution Toggle
**As a user, I want to choose my preferred time resolution so that the system adapts to my planning style.**

#### User Stories:
- **US4.1**: As a user, I want to toggle time resolution in General Settings so that I can switch between yearly and monthly
- **US4.2**: As a user, I want my preference saved so that it persists across sessions
- **US4.3**: As a user, I want the entire app to respect my resolution choice so that the experience is consistent
- **US4.4**: As a user, I want to see a clear indicator of current resolution so that I know what mode I'm in

**Acceptance Criteria**:
- General Settings includes "Time Resolution" toggle (Yearly | Monthly)
- Setting persists in `user_settings` table (`time_resolution` column)
- All components (chart, cards, forms) respect current resolution
- Visual indicator in header/toolbar shows current resolution mode
- Switching resolution triggers data refetch with appropriate resolution parameter

### Epic 5: Database Schema Enhancement
**As a system, I want to store month-level precision for financial items so that I can support monthly calculations.**

#### User Stories:
- **US5.1**: As the database, I want optional `start_month` and `end_month` columns so that I can store month precision
- **US5.2**: As the database, I want backward compatibility with NULL months so that existing data remains valid
- **US5.3**: As the database, I want month validation constraints (1-12) so that data integrity is maintained
- **US5.4**: As the database, I want to store user's time resolution preference so that it persists across sessions

**Acceptance Criteria**:
- All financial tables (`finance_assets`, `finance_liabilities`, `finance_incomes`, `finance_expenses`) have `start_month` and `end_month` columns (SMALLINT, nullable, CHECK 1-12)
- NULL months interpreted as: `start_month=1` (January), `end_month=12` (December)
- `user_settings` table includes `time_resolution VARCHAR(10) DEFAULT 'yearly' CHECK IN ('yearly', 'monthly')`
- No data migration required (all columns nullable with defaults)
- Database queries support filtering by year AND month

---

## User Experience Flows

### Flow 1: User Switches to Monthly Resolution (Primary Flow)

1. **Entry**: User navigates to General Settings
2. **Action**: User clicks "Time Resolution" dropdown
3. **System Response**: Shows options: "Yearly (default)" and "Monthly (detailed)"
4. **User Selection**: User selects "Monthly (detailed)"
5. **System Update**:
   - Saves preference to database (`time_resolution = 'monthly'`)
   - Triggers timeline refetch with `?resolution=monthly`
   - Updates all UI components to monthly mode
6. **UI Changes**:
   - Chart shows monthly data points (zoomed to 3 years visible by default)
   - Month selector appears below year selector
   - Financial cards display monthly amounts
   - Form inputs show month fields for start/end dates
7. **Completion**: User sees "Monthly resolution enabled" toast notification

**Alternative Path 1A**: API call fails
- System shows error toast: "Failed to switch resolution. Please try again."
- Reverts toggle to previous state
- User can retry

**Alternative Path 1B**: User switches back to yearly
- Same flow in reverse
- System removes month selector
- Chart returns to yearly view (35 years visible)
- Amounts show annualized values

### Flow 2: User Explores Timeline with Zoom Controls

1. **Entry**: User is viewing dashboard in monthly resolution mode
2. **Default State**: Chart shows 3 years of monthly data (36 points)
3. **Zoom Out Action**: User clicks "Zoom Out" button
4. **System Response**:
   - Chart aggregates to quarterly view
   - Shows 10 years of data (40 quarterly points)
   - X-axis labels change to "Q1 2024", "Q2 2024", etc.
5. **Further Zoom Out**: User clicks "Zoom Out" again
6. **System Response**:
   - Chart aggregates to yearly view
   - Shows all 35 years (35 points)
   - X-axis labels show years: 2024, 2025, etc.
7. **Pan Action**: User drags range slider to view different time period
8. **System Response**: Chart updates visible window while maintaining zoom level
9. **Zoom In Action**: User clicks "Zoom In" to return to monthly detail
10. **Completion**: User can fluidly explore their financial timeline at any granularity

**Edge Case 2A**: User zooms in beyond available data
- System shows: "End of projection reached"
- Zoom in button becomes disabled
- Pan slider stops at data boundary

**Edge Case 2B**: Performance degradation (chart render >500ms)
- System logs performance warning
- Displays loading skeleton during render
- User sees smooth transition despite delay

### Flow 3: User Adds Financial Item with Month Precision

1. **Entry**: User clicks "Add Income" in monthly resolution mode
2. **System Response**: Opens income form modal with month fields
3. **User Input**:
   - Name: "Freelance Project"
   - Amount: $5,000
   - Frequency: Monthly
   - Start: Year 2 (2026), Month: March (3)
   - End: Year 2 (2026), Month: August (8)
4. **Validation**: System validates:
   - End month >= Start month (within same year or later year)
   - Month values between 1-12
   - Amount > 0
5. **System Save**:
   - Creates income record with `start_year=2`, `start_month=3`, `end_year=2`, `end_month=8`
   - Recalculates timeline with monthly precision
   - Updates chart and financial cards
6. **Visual Feedback**:
   - Chart shows income appearing in March 2026
   - Financial card for March 2026 includes "Freelance Project: $5,000/mo"
   - Net worth projection updates to reflect 6 months of income ($30,000 total)
7. **Completion**: User sees accurate monthly projection with item visible only in specified months

**Error Path 3A**: Invalid month range (end before start)
- System shows validation error: "End month must be after start month"
- Form field highlights in red
- User corrects input before saving allowed

**Edge Case 3B**: User in yearly mode adds item without months
- Form shows only year fields (no month selectors)
- System defaults: `start_month=1`, `end_month=12`
- Item spans full year in calculations

### Flow 4: User Views Scenario Event with Monthly Impact

1. **Entry**: User has scenario event "New Baby" occurring in June 2026
2. **User Action**: User selects Year 2 (2026), Month: June in timeline
3. **System Response**:
   - Highlights scenario marker on chart at June 2026 position
   - Financial cards show scenario badge: "New Baby scenario active"
4. **User Click**: User clicks scenario marker on chart
5. **Modal Display**: Shows scenario impacts with monthly detail:
   - Childcare expense: $1,800/month starting June 2026
   - Life insurance expense: $150/month starting June 2026
   - Healthcare expense increase: +$200/month starting June 2026
   - **Total monthly impact**: -$2,150/month
6. **Chart Update**: Net worth line shows impact starting precisely in June (not averaged over year)
7. **Month Navigation**: User scrolls month selector from June → July → August
8. **Card Updates**: Each month shows cumulative impact:
   - June: -$2,150 (first month)
   - July: -$4,300 (two months cumulative)
   - August: -$6,450 (three months cumulative)
9. **Completion**: User understands precise monthly timing and cumulative effect of scenario

**Alternative Path 4A**: Scenario spans multiple years
- User pans chart to view impact across year boundaries
- Impact continues seamlessly from Dec 2026 → Jan 2027
- Running totals persist across year transitions

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │   Chart with    │  │  Financial Data  │  │  User Settings │ │
│  │  Zoom Controls  │  │  with Month      │  │  Resolution    │ │
│  │                 │  │  Selector        │  │  Toggle        │ │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬───────┘ │
└───────────┼────────────────────┼──────────────────────┼─────────┘
            │                    │                      │
            ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND DATA LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           useTimeline Hook (TanStack Query)              │  │
│  │  - Fetches timeline with resolution parameter            │  │
│  │  - Handles data aggregation based on zoom level          │  │
│  │  - Manages visible data window (35-40 points)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼ GET /api/v1/financial/timeline?resolution=monthly
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Timeline HTTP Handler                         │  │
│  │  - Parses resolution parameter (yearly|monthly)          │  │
│  │  - Routes to appropriate calculation method              │  │
│  │  - Returns TimelineResponse with correct resolution      │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TIMELINE CALCULATION ENGINE                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          buildTimelineMonthly(ctx, userID)               │  │
│  │                                                           │  │
│  │  for monthIdx := 0; monthIdx < totalMonths; monthIdx++ { │  │
│  │    year := monthIdx / 12                                 │  │
│  │    month := (monthIdx % 12) + 1                          │  │
│  │                                                           │  │
│  │    1. Expire items past end_year/end_month               │  │
│  │    2. Apply monthly compound growth                      │  │
│  │    3. Add new items starting this month                  │  │
│  │    4. Calculate monthly net savings                      │  │
│  │    5. Accumulate cash with monthly interest              │  │
│  │    6. Build TimelineMonth object                         │  │
│  │  }                                                        │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  finance_assets              finance_liabilities                │
│  ├─ start_year (INT)         ├─ start_year (INT)                │
│  ├─ start_month (SMALLINT)   ├─ start_month (SMALLINT)          │
│  ├─ end_year (INT)           ├─ end_year (INT)                  │
│  ├─ end_month (SMALLINT)     ├─ end_month (SMALLINT)            │
│                                                                  │
│  finance_incomes             finance_expenses                   │
│  ├─ start_year (INT)         ├─ start_year (INT)                │
│  ├─ start_month (SMALLINT)   ├─ start_month (SMALLINT)          │
│  ├─ end_year (INT)           ├─ end_year (INT)                  │
│  ├─ end_month (SMALLINT)     ├─ end_month (SMALLINT)            │
│                                                                  │
│  user_settings                                                   │
│  └─ time_resolution VARCHAR(10) DEFAULT 'yearly'                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagrams

#### Monthly Timeline Calculation Flow

```
User Settings (time_resolution='monthly')
         │
         ▼
┌─────────────────────────┐
│ Timeline API Request    │
│ ?resolution=monthly     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ Load All Financial Items from DB            │
│ - Assets, Liabilities, Incomes, Expenses    │
│ - With start_year/start_month fields        │
│ - With end_year/end_month fields            │
└───────────┬─────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ Initialize Monthly Loop (0-419 months)      │
│ - totalMonths = (terminalAge - startingAge) │
│                 * 12                         │
│ - state = empty map                          │
│ - accumulatedCash = initialBalance           │
└───────────┬─────────────────────────────────┘
            │
            ▼
      ┌─────────────────────┐
      │  For Each Month M    │
      └──────────┬───────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌─────────────┐      ┌──────────────┐
│ Expire      │      │ Apply Growth │
│ Items       │      │ (Monthly)    │
│ past        │      │              │
│ end_month   │      │ monthlyRate= │
└──────┬──────┘      │ pow(1+annual │
       │             │ /100,1/12)-1 │
       │             └──────┬───────┘
       │                    │
       └──────────┬─────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Add New Items   │
         │ starting this   │
         │ year/month      │
         └────────┬────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Convert to       │
         │ Monthly Amounts  │
         │ - annual/12      │
         │ - monthly*1      │
         │ - weekly*52/12   │
         └────────┬─────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Calculate       │
         │ Monthly Net     │
         │ Savings         │
         │ income-expenses │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Accumulate Cash │
         │ + Apply Monthly │
         │ Interest        │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Build           │
         │ TimelineMonth   │
         │ Object          │
         └────────┬────────┘
                  │
                  └──────────► Continue to next month

After all months:
         │
         ▼
┌──────────────────────────┐
│ Return                   │
│ TimelineResponse{        │
│   resolution: "monthly", │
│   months: [420 objects]  │
│ }                        │
└──────────────────────────┘
```

#### Frontend Zoom-Based Display Flow

```
Timeline API Returns 420 Months
         │
         ▼
┌─────────────────────────────────────────────┐
│ useTimeline Hook Receives Data             │
│ - months: TimelineMonth[] (420 items)      │
│ - resolution: "monthly"                     │
└───────────┬─────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────┐
│ User Selects Zoom Level                     │
│ - zoomLevel state: 'yearly'|'quarterly'|    │
│   'monthly'                                  │
│ - visibleRange state: {start: 0, end: 35}  │
└───────────┬─────────────────────────────────┘
            │
            ├───────────────┬───────────────┬───────────────┐
            │               │               │               │
            ▼               ▼               ▼               ▼
    ┌───────────────┐ ┌────────────┐ ┌─────────────┐ ┌──────────┐
    │ Yearly Zoom   │ │ Quarterly  │ │ Monthly     │ │  Pan     │
    │               │ │ Zoom       │ │ Zoom        │ │  Action  │
    └───────┬───────┘ └──────┬─────┘ └──────┬──────┘ └────┬─────┘
            │                │               │             │
            ▼                ▼               ▼             ▼
    ┌────────────────────────────────────────────────────────────┐
    │          Aggregate/Filter Data Based on Zoom               │
    ├────────────────────────────────────────────────────────────┤
    │ switch (zoomLevel) {                                       │
    │   case 'yearly':                                           │
    │     // Take month 12 of each year                          │
    │     return months.filter(m => m.month === 12)              │
    │            .slice(visibleRange.start, visibleRange.end)    │
    │     // Result: 35 points                                   │
    │                                                             │
    │   case 'quarterly':                                        │
    │     // Take months 3, 6, 9, 12 (end of each quarter)      │
    │     return months.filter(m => m.month % 3 === 0)           │
    │            .slice(visibleRange.start*4, visibleRange.end*4)│
    │     // Result: 40 points (10 years visible)                │
    │                                                             │
    │   case 'monthly':                                          │
    │     // Show all months in visible range                    │
    │     return months.slice(visibleRange.start*12,             │
    │                        visibleRange.end*12)                │
    │     // Result: 36 points (3 years visible)                 │
    │ }                                                           │
    └────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Update Chart Data   │
                  │ (35-40 points)      │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Recharts Renders    │
                  │ <100ms performance  │
                  └─────────────────────┘
```

### API Design

#### GET /api/v1/financial/timeline

**Purpose**: Fetch financial timeline with configurable resolution

**Query Parameters**:
```typescript
interface GetTimelineQuery {
  resolution?: 'yearly' | 'monthly'  // Default: 'yearly'
  includeScenarios?: boolean         // Default: false
  scenarioIds?: string[]             // Optional list of scenario IDs
}
```

**Response Schema (Monthly)**:
```typescript
interface TimelineResponse {
  resolution: 'monthly'
  version: string
  months: TimelineMonth[]
  scenariosApplied?: string[]
}

interface TimelineMonth {
  year: number               // Calendar year (2025, 2026...)
  month: number              // 1-12
  yearIndex: number          // 0-based year index (0-34)
  monthIndex: number         // 0-based global month index (0-419)
  assets: TimelineItem[]
  cashAccounts: TimelineItem[]
  liabilities: TimelineItem[]
  income: TimelineItem[]
  expenses: TimelineItem[]
  netCash: number            // Monthly net savings
  netWorth: number
  hasOverrides: boolean
  growthApplied: GrowthApplied[]

  // Monthly cash accumulation
  monthlyNetSavings: number
  accumulatedCashStart: number
  accumulatedCashEnd: number
  interestEarned: number
  accumulatorAccountId?: string
}

interface TimelineItem {
  itemId: string
  rowId?: string
  parentId?: string
  name: string
  category: string
  amountMonthly: number      // Monthly amount (not annualized)
  adjMonthlyAmt: number      // Adjusted monthly amount after growth
  eventImpacts?: EventImpactSummary[]
  sourceAmount?: number
  sourceFrequency?: string
  itemType: 'asset' | 'liability' | 'income' | 'expense' | 'cash_account'
  createdYear: number
  createdMonth?: number
  growthRate?: number
  isAccumulator?: boolean
}
```

**Response Schema (Yearly)** - Existing format maintained for backward compatibility

**Error Responses**:
```json
{
  "error": "invalid_resolution",
  "message": "Resolution must be 'yearly' or 'monthly'",
  "statusCode": 400
}
```

#### Database Schema Changes

**Migration File**: `backend/migrations/20250106000_add_monthly_precision.up.sql`

```sql
-- Add optional month precision to financial tables
ALTER TABLE finance_assets
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

ALTER TABLE finance_liabilities
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

ALTER TABLE finance_incomes
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

ALTER TABLE finance_expenses
  ADD COLUMN start_month SMALLINT NULL CHECK (start_month BETWEEN 1 AND 12),
  ADD COLUMN end_month SMALLINT NULL CHECK (end_month BETWEEN 1 AND 12);

-- Add time resolution preference to user settings
ALTER TABLE user_settings
  ADD COLUMN time_resolution VARCHAR(10) NOT NULL DEFAULT 'yearly'
      CHECK (time_resolution IN ('yearly', 'monthly'));

COMMENT ON COLUMN finance_assets.start_month IS 'Optional month (1-12) when item starts. NULL defaults to January (1).';
COMMENT ON COLUMN finance_assets.end_month IS 'Optional month (1-12) when item ends. NULL defaults to December (12).';
```

**Migration File**: `backend/migrations/20250106000_add_monthly_precision.down.sql`

```sql
ALTER TABLE finance_assets DROP COLUMN IF EXISTS start_month;
ALTER TABLE finance_assets DROP COLUMN IF EXISTS end_month;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS start_month;
ALTER TABLE finance_liabilities DROP COLUMN IF EXISTS end_month;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS start_month;
ALTER TABLE finance_incomes DROP COLUMN IF EXISTS end_month;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS start_month;
ALTER TABLE finance_expenses DROP COLUMN IF EXISTS end_month;
ALTER TABLE user_settings DROP COLUMN IF EXISTS time_resolution;
```

### Integration Points

1. **Existing Timeline System**: Extends without breaking changes
2. **Scenario Events**: Leverages existing monthly precision (`start_month`/`end_month`)
3. **CPF Calculator**: Uses existing monthly calculations without aggregation
4. **Growth Configs**: Converts annual rates to monthly equivalent
5. **Cash Accumulation**: Tracks monthly snapshots instead of annual
6. **User Settings**: Stores and retrieves resolution preference

### Performance Considerations

1. **Backend Calculation**:
   - 420 iterations vs 35 (12× more)
   - Target: <3 seconds for full monthly calculation
   - Optimization: Consider caching calculated timelines per user

2. **Frontend Rendering**:
   - Chart always renders 35-40 points (zoom-based filtering)
   - TanStack Query caching prevents unnecessary refetches
   - Memoization for aggregation calculations

3. **Database Queries**:
   - No N+1 queries (bulk fetch all financial items)
   - Indexes on `start_year`, `start_month` for filtering
   - Consider pagination for very long time horizons (future)

---

## Success Metrics

### User Engagement Metrics
- **Adoption Rate**: % of users who enable monthly resolution within 30 days of feature launch
  - Target: 30% of active users
- **Retention**: % of users who remain in monthly mode after 7 days
  - Target: 75% retention (indicates value)
- **Zoom Usage**: Average number of zoom level changes per session
  - Target: 3+ zoom actions per session (indicates exploration)

### Technical Performance Metrics
- **API Response Time**: GET /api/v1/financial/timeline?resolution=monthly
  - Target: P95 < 3 seconds
  - Target: P50 < 2 seconds
- **Chart Render Time**: Time from data received to chart visible
  - Target: <100ms at all zoom levels
- **Error Rate**: Failed timeline calculations
  - Target: <0.5% error rate

### Business Impact Measurements
- **Feature Usage**: % of timeline views using monthly resolution
  - Target: 20% of all timeline views
- **Data Precision**: % of financial items with month-level start/end dates
  - Target: 40% of new items after 60 days
- **User Satisfaction**: NPS score change for users who enable monthly resolution
  - Target: +10 point increase vs baseline

---

## Implementation Tickets

### Summary

**Backend Development**: 4 tickets, 12 complexity points (~2 weeks)
- B-MTH-1: Database schema migration (2 pts)
- B-MTH-2: Monthly calculation engine (5 pts)
- B-MTH-3: Timeline API endpoint updates (3 pts)
- B-MTH-4: User settings endpoint (2 pts)

**Frontend Development**: 10 tickets, 28 complexity points (~4-5 weeks)
- F-MTH-1: TypeScript types (2 pts)
- F-MTH-2: API service updates (2 pts)
- F-MTH-3: useTimeline hook (3 pts)
- F-MTH-4: Zoom controls component (3 pts)
- F-MTH-5: Chart with zoom support (5 pts)
- F-MTH-6: Scenario marker positioning & icon transitions (3 pts) ⭐ **New**
- F-MTH-7: Month selector component (2 pts)
- F-MTH-8: Financial data cards (3 pts)
- F-MTH-9: Settings UI (2 pts)
- F-MTH-10: Form updates (3 pts)

**Testing**: 4 tickets, 9 complexity points (~1.5 weeks) ✅
- B-MTH-TEST-1: Backend unit & integration tests (3 pts)
- F-MTH-TEST-1: Frontend unit tests (2 pts)
- F-MTH-TEST-2: Integration & E2E tests (3 pts)
- TEST-MTH-MANUAL: Manual QA checklist (1 pt)

**Total**: 18 tickets, 49 complexity points (~6-7 weeks solo developer)

---

### Backend Tickets

#### B-MTH-1: Database Schema Migration for Monthly Precision
**Priority**: P0 | **Complexity**: 2 points | **Sprint**: 1

**Objective**: Add optional month-level precision columns to all financial tables and user settings table.

**Requirements**:
- Add `start_month` and `end_month` columns (SMALLINT, nullable, CHECK 1-12) to:
  - `finance_assets`
  - `finance_liabilities`
  - `finance_incomes`
  - `finance_expenses`
- Add `time_resolution` column (VARCHAR(10), DEFAULT 'yearly', CHECK IN ('yearly', 'monthly')) to `user_settings`
- Create migration files: `20250106000_add_monthly_precision.up.sql` and `.down.sql`
- Add appropriate column comments for documentation

**Acceptance Criteria**:
- [ ] Migration runs successfully on dev/staging/production databases
- [ ] All existing data remains valid (NULL months allowed)
- [ ] Constraints enforce month values 1-12 when non-NULL
- [ ] Default resolution is 'yearly' for all existing users
- [ ] Migration is reversible (down migration works correctly)
- [ ] No breaking changes to existing queries

**Testing**:
- Unit tests: Constraint validation (reject month=0, month=13)
- Integration tests: Insert/update records with month values
- Rollback test: Down migration removes columns cleanly

---

#### B-MTH-2: Monthly Timeline Calculation Engine
**Priority**: P0 | **Complexity**: 5 points | **Sprint**: 1-2

**Objective**: Implement monthly timeline calculation loop that computes 420 monthly snapshots with compound monthly growth.

**Requirements**:
- Create `buildTimelineMonthly(ctx context.Context, userID string) (TimelineResponse, error)` function in `backend/internal/financial/timeline/service.go`
- Implement monthly loop: `for monthIdx := 0; monthIdx < totalMonths; monthIdx++`
- Calculate month and year from monthIdx: `year := monthIdx / 12`, `month := (monthIdx % 12) + 1`
- Convert annual growth rates to monthly: `monthlyRate := math.Pow(1 + annualRate/100, 1.0/12.0) - 1`
- Implement `convertToMonthly(amount float64, freq Frequency) float64` helper function to convert all frequencies to monthly amounts:
  ```go
  FrequencyAnnual:     amount / 12
  FrequencyMonthly:    amount
  FrequencyWeekly:     amount * 52 / 12
  FrequencyBiweekly:   amount * 26 / 12
  FrequencyQuarterly:  amount * 4 / 12
  FrequencySemiannual: amount * 2 / 12
  ```
- Expire items when `monthIdx > (endYear * 12 + endMonth)`
- Track monthly cash accumulation with monthly interest: `interest = accumulatedCash * monthlyInterestRate`
- Return `TimelineResponse{ Resolution: "monthly", Months: []TimelineMonth, Version: "v1" }`

**Database Schema Changes**: Depends on B-MTH-1

**API Contract**: Returns `TimelineMonth[]` with structure defined in Technical Architecture section

**Acceptance Criteria**:
- [ ] Calculates 420 months for 35-year horizon (age 30-65)
- [ ] Monthly compound growth formula correctly applied: tests verify 6% annual = ~0.487% monthly compounded
- [ ] All frequency conversions accurate (e.g., weekly $100 = $433.33 monthly)
- [ ] Cash accumulation compounds monthly (not annual)
- [ ] Performance: Completes calculation in <3 seconds for 420 months
- [ ] Respects `start_month` and `end_month` from database (items start/stop at correct months)
- [ ] Returns correct `TimelineMonth` structure with all required fields

**Testing**:
- Unit tests:
  - Test monthly growth calculation: $10,000 at 6% annual for 12 months = $10,616.78
  - Test frequency conversion: monthly $1,000 * 12 = annual $12,000
  - Test item expiration: item ending month 6 disappears in month 7
- Integration tests:
  - Full timeline calculation with real user data
  - Performance benchmark: measure time for 420 month calculation
- Edge cases:
  - Zero growth rate (amount stays constant)
  - Negative growth (liability decay)
  - Items with NULL months (default to 1 and 12)

---

#### B-MTH-3: Timeline API Endpoint Updates
**Priority**: P0 | **Complexity**: 3 points | **Sprint**: 2

**Objective**: Update GET /api/v1/financial/timeline endpoint to accept resolution parameter and route to appropriate calculation method.

**Requirements**:
- Add `resolution` query parameter to `GetTimelineRequest` struct in `backend/cmd/server/handlers/timeline.go`:
  ```go
  type GetTimelineRequest struct {
      Resolution      string   `query:"resolution"`       // "yearly" | "monthly"
      IncludeScenarios bool    `query:"include_scenarios"`
      ScenarioIDs     []string `query:"scenario_ids"`
  }
  ```
- Default `resolution` to "yearly" if not provided (backward compatibility)
- Validate `resolution` is either "yearly" or "monthly", return 400 error if invalid
- Route to `buildTimelineMonthly()` when resolution="monthly", else `buildTimeline()` for yearly
- Update `TimelineResponse` struct to include `Resolution` field
- Apply scenario impacts correctly for both yearly and monthly modes

**API Contract Example**:
```
GET /api/v1/financial/timeline?resolution=monthly&includeScenarios=true

Response 200:
{
  "resolution": "monthly",
  "version": "v1",
  "months": [
    {
      "year": 2024,
      "month": 1,
      "yearIndex": 0,
      "monthIndex": 0,
      "assets": [...],
      "income": [...],
      "expenses": [...],
      "netCash": 2500.00,
      "netWorth": 125000.00,
      ...
    },
    // ... 419 more months
  ],
  "scenariosApplied": ["scenario-uuid-1"]
}

Response 400 (invalid resolution):
{
  "error": "invalid_resolution",
  "message": "Resolution must be 'yearly' or 'monthly'",
  "statusCode": 400
}
```

**Acceptance Criteria**:
- [ ] GET /api/v1/financial/timeline?resolution=monthly returns monthly data
- [ ] GET /api/v1/financial/timeline (no parameter) returns yearly data (backward compatible)
- [ ] GET /api/v1/financial/timeline?resolution=yearly explicitly returns yearly data
- [ ] Invalid resolution values return 400 error with clear message
- [ ] Response includes `resolution` field matching request
- [ ] Scenario impacts apply correctly in both modes
- [ ] Response time: P95 < 3 seconds, P50 < 2 seconds

**Testing**:
- Unit tests:
  - Test resolution parameter parsing and validation
  - Test routing logic (yearly vs monthly)
- Integration tests:
  - GET with resolution=monthly returns TimelineMonth[]
  - GET with resolution=yearly returns TimelineYear[]
  - GET without parameter returns TimelineYear[] (default)
  - GET with resolution=invalid returns 400 error
- Performance tests:
  - Measure P50, P95, P99 response times for monthly timeline

**Dependencies**: Requires B-MTH-2 (monthly calculation engine)

---

#### B-MTH-4: User Settings Time Resolution Endpoint
**Priority**: P1 | **Complexity**: 2 points | **Sprint**: 2

**Objective**: Add API endpoints to get and update user's time resolution preference.

**Requirements**:
- Update `UserSettings` struct in `backend/internal/financial/repository/store.go` to include `TimeResolution string` field (maps to `time_resolution` column)
- Update `GET /api/v1/settings/user` to return `timeResolution` field (convert snake_case to camelCase)
- Update `PUT /api/v1/settings/user` to accept `timeResolution` field and validate it's "yearly" or "monthly"
- Default to "yearly" if not specified in request
- Ensure setting persists to database correctly

**API Contract Example**:
```
GET /api/v1/settings/user

Response 200:
{
  "startingAge": 30,
  "terminalAge": 65,
  "yearDisplayFormat": "actual_year",
  "timeResolution": "monthly"
}

PUT /api/v1/settings/user
Body:
{
  "timeResolution": "monthly"
}

Response 200:
{
  "startingAge": 30,
  "terminalAge": 65,
  "yearDisplayFormat": "actual_year",
  "timeResolution": "monthly",
  "updatedAt": "2025-01-06T10:30:00Z"
}
```

**Acceptance Criteria**:
- [ ] GET /api/v1/settings/user returns `timeResolution` field
- [ ] PUT /api/v1/settings/user accepts and validates `timeResolution`
- [ ] Invalid values ("daily", "weekly", etc.) return 400 error
- [ ] Setting persists correctly to database
- [ ] Field naming uses camelCase in JSON (not snake_case)
- [ ] Defaults to "yearly" for users without setting

**Testing**:
- Unit tests: Validation logic for timeResolution values
- Integration tests:
  - GET returns correct resolution
  - PUT updates resolution successfully
  - PUT with invalid value returns 400 error
  - Database persists value correctly

**Dependencies**: Requires B-MTH-1 (schema migration)

---

### Frontend Tickets

#### F-MTH-1: Update TypeScript Types for Monthly Resolution
**Priority**: P0 | **Complexity**: 2 points | **Sprint**: 1

**Objective**: Add TypeScript interfaces for monthly timeline data structures and update existing types.

**Requirements**:
- Add `TimelineMonth` interface in `frontend/src/types/timeline.ts`:
  ```typescript
  export interface TimelineMonth {
    year: number
    month: number           // 1-12
    yearIndex: number       // 0-based
    monthIndex: number      // 0-based global index
    assets: TimelineItem[]
    cashAccounts: TimelineItem[]
    liabilities: TimelineItem[]
    income: TimelineItem[]
    expenses: TimelineItem[]
    netCash: number
    netWorth: number
    hasOverrides: boolean
    growthApplied: GrowthApplied[]
    monthlyNetSavings: number
    accumulatedCashStart: number
    accumulatedCashEnd: number
    interestEarned: number
    accumulatorAccountId?: string
  }
  ```
- Update `TimelineResponse` to include `resolution` and `months`:
  ```typescript
  export interface TimelineResponse {
    resolution: 'yearly' | 'monthly'
    version: string
    years?: TimelineYear[]
    months?: TimelineMonth[]
    scenariosApplied?: string[]
  }
  ```
- Update `TimelineItem` to include `amountMonthly` and `adjMonthlyAmt` fields (in addition to existing annual fields)
- Add `TimeResolution` type and update `UserSettings`:
  ```typescript
  export type TimeResolution = 'yearly' | 'monthly'

  export interface UserSettings {
    startingAge: number
    terminalAge: number
    yearDisplayFormat: YearDisplayFormat
    timeResolution: TimeResolution
  }
  ```

**Acceptance Criteria**:
- [ ] All new interfaces match backend API contract exactly
- [ ] No TypeScript compilation errors
- [ ] Existing code using `TimelineYear` continues to work
- [ ] New types properly exported from `types/timeline.ts`
- [ ] JSDoc comments added for new interfaces

**Testing**:
- Type checking: `npm run type-check` passes
- No `any` types used
- All fields properly typed (no optional where required)

---

#### F-MTH-2: Timeline API Service Updates
**Priority**: P0 | **Complexity**: 2 points | **Sprint**: 1

**Objective**: Update timeline API service to support resolution parameter and handle monthly responses.

**Requirements**:
- Update `getTimeline()` function in `frontend/src/services/timelineApi.ts` to accept `resolution` parameter:
  ```typescript
  export async function getTimeline(params?: {
    resolution?: 'yearly' | 'monthly'
    includeScenarios?: boolean
    scenarioIds?: string[]
  }): Promise<TimelineResponse> {
    const searchParams = new URLSearchParams()
    if (params?.resolution) {
      searchParams.append('resolution', params.resolution)
    }
    // ... rest of implementation
  }
  ```
- Handle both `TimelineYear[]` and `TimelineMonth[]` responses correctly
- Add error handling for invalid resolution responses
- Update QUERY_KEYS to include resolution in cache key

**Acceptance Criteria**:
- [ ] API call includes `?resolution=monthly` when specified
- [ ] Defaults to yearly when resolution not provided
- [ ] Correctly parses `TimelineResponse` with `months` field
- [ ] TanStack Query cache keys differentiate between yearly and monthly data
- [ ] Type safety maintained (no `any` types)

**Testing**:
- Unit tests: Mock API responses for both resolutions
- Integration tests: Call API with different resolution parameters

**Dependencies**: Requires F-MTH-1 (TypeScript types)

---

#### F-MTH-3: useTimeline Hook Enhancement
**Priority**: P0 | **Complexity**: 3 points | **Sprint**: 2

**Objective**: Update useTimeline hook to fetch data based on user's resolution preference and provide consistent interface to components.

**Requirements**:
- Fetch user settings to get `timeResolution` preference
- Pass resolution to timeline API query
- Provide unified interface that works for both yearly and monthly:
  ```typescript
  export function useTimeline() {
    const { data: userSettings } = useQuery({
      queryKey: QUERY_KEYS.settings.user,
      queryFn: () => financialApi.getUserSettings(),
    })

    const resolution = userSettings?.timeResolution ?? 'yearly'

    const timelineQuery = useQuery({
      queryKey: ['timeline', resolution, /* scenarios */],
      queryFn: () => financialApi.getTimeline({
        resolution,
        includeScenarios: true
      }),
      staleTime: 30_000,
      enabled: !!userSettings, // Wait for settings
    })

    // Return normalized interface
    return {
      resolution,
      dataPoints: resolution === 'monthly'
        ? timelineQuery.data?.months
        : timelineQuery.data?.years,
      isLoading: timelineQuery.isLoading,
      error: timelineQuery.error,
      // ... other fields
    }
  }
  ```
- Normalize data access so components don't need to check resolution type
- Invalidate timeline query when resolution changes

**Acceptance Criteria**:
- [ ] Hook automatically uses resolution from user settings
- [ ] Returns monthly data when resolution is 'monthly'
- [ ] Returns yearly data when resolution is 'yearly'
- [ ] Loading states handled correctly (waits for user settings)
- [ ] Query refetches when resolution changes
- [ ] No breaking changes to existing consumers of useTimeline

**Testing**:
- Unit tests: Mock different resolution preferences
- Integration tests: Verify correct API calls for each resolution
- Test resolution change triggers refetch

**Dependencies**: Requires F-MTH-1, F-MTH-2, B-MTH-3, B-MTH-4

---

#### F-MTH-4: Zoom Controls Component
**Priority**: P1 | **Complexity**: 3 points | **Sprint**: 2

**Objective**: Create zoom controls UI that allows users to switch between yearly, quarterly, and monthly views with pan/scroll functionality.

**Requirements**:
- Create `ZoomControls` component with three zoom levels:
  - Yearly: Shows all years (35 points)
  - Quarterly: Shows 10 years in quarters (40 points)
  - Monthly: Shows 3 years in months (36 points)
- Implement pan/scroll slider to navigate through time within zoom level
- Add zoom in/out buttons (disabled at boundaries)
- Visual feedback for current zoom level
- Smooth transitions between zoom levels
- Accessible keyboard navigation (arrow keys, +/- for zoom)

**Component API**:
```typescript
interface ZoomControlsProps {
  zoomLevel: 'yearly' | 'quarterly' | 'monthly'
  onZoomChange: (level: ZoomLevel) => void
  visibleRange: { start: number; end: number }
  onRangeChange: (range: { start: number; end: number }) => void
  totalYears: number
}
```

**Acceptance Criteria**:
- [ ] Three zoom buttons clearly labeled and styled
- [ ] Current zoom level visually indicated
- [ ] Pan slider allows smooth scrolling through time
- [ ] Zoom in/out buttons disabled at min/max zoom
- [ ] Keyboard shortcuts work: +/- for zoom, arrow keys for pan
- [ ] Responsive design works on mobile (touch-friendly)
- [ ] Matches existing glassmorphic design system

**Testing**:
- Unit tests: Zoom level state changes
- Visual tests: Component renders at all zoom levels
- Accessibility tests: Keyboard navigation works

---

#### F-MTH-5: NetWorthProjection Chart with Zoom Support
**Priority**: P1 | **Complexity**: 5 points | **Sprint**: 2-3

**Objective**: Update NetWorthProjection chart to display zoom-based aggregated data while maintaining performance.

**Requirements**:
- Integrate `ZoomControls` component into chart header
- Implement data aggregation based on zoom level:
  ```typescript
  const chartData = useMemo(() => {
    if (!timelineMonths) return []

    switch (zoomLevel) {
      case 'yearly':
        // Take month 12 (December) of each year
        return timelineMonths
          .filter(m => m.month === 12)
          .slice(visibleRange.start, visibleRange.end)

      case 'quarterly':
        // Take months 3, 6, 9, 12 (quarter ends)
        return timelineMonths
          .filter(m => m.month % 3 === 0)
          .slice(visibleRange.start * 4, visibleRange.end * 4)

      case 'monthly':
        // Show all months in visible range
        return timelineMonths
          .slice(visibleRange.start * 12, visibleRange.end * 12)
    }
  }, [timelineMonths, zoomLevel, visibleRange])
  ```
- Update X-axis labels based on zoom level:
  - Yearly: "2024", "2025", etc.
  - Quarterly: "Q1 2024", "Q2 2024", etc.
  - Monthly: "Jan 2024", "Feb 2024", etc.
- Update tooltip to show appropriate granularity
- Ensure chart always renders 35-40 points (performance target: <100ms)
- Scenario markers position correctly at all zoom levels

**Acceptance Criteria**:
- [ ] Chart displays correct data at each zoom level
- [ ] Always renders 35-40 visible points (no more, no less)
- [ ] X-axis labels adapt to zoom level
- [ ] Tooltip shows month/quarter/year based on zoom
- [ ] Render time <100ms at all zoom levels
- [ ] Smooth transitions between zoom levels (animation)
- [ ] Scenario markers positioned correctly
- [ ] Pan slider updates chart in real-time

**Testing**:
- Unit tests: Data aggregation logic for each zoom level
- Visual tests: Chart renders correctly at all zoom levels
- Performance tests: Measure render time (<100ms requirement)
- Integration tests: Zoom and pan interactions work correctly

**Dependencies**: Requires F-MTH-3, F-MTH-4

---

#### F-MTH-6: Scenario Marker Positioning & Icon Transitions
**Priority**: P1 | **Complexity**: 3 points | **Sprint**: 3

**Objective**: Ensure scenario event icons (markers) position correctly and transition smoothly when switching between resolutions and zoom levels.

**Requirements**:
- Update scenario marker positioning logic to work with monthly resolution:
  ```typescript
  const scenarioMarkers = useMemo(() => {
    if (!scenarioEvents || scenarioEvents.length === 0) return []

    // Parse scenario event date to get year and month
    const parseEventDate = (occursOn: string) => {
      const date = new Date(occursOn)
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12
        yearIndex: /* calculate from baseYear */,
        monthIndex: /* calculate global month index */
      }
    }

    // Map scenarios to appropriate data points based on zoom level
    scenarioEvents.forEach((event) => {
      const eventDate = parseEventDate(event.occursOn)

      switch (zoomLevel) {
        case 'yearly':
          // Position at year-end (December)
          dataPoint = displayData.find(d =>
            d.year === eventDate.year && d.month === 12
          )
          break

        case 'quarterly':
          // Position at quarter-end containing event
          const quarterEndMonth = Math.ceil(eventDate.month / 3) * 3
          dataPoint = displayData.find(d =>
            d.year === eventDate.year && d.month === quarterEndMonth
          )
          break

        case 'monthly':
          // Position at exact month
          dataPoint = displayData.find(d =>
            d.year === eventDate.year && d.month === eventDate.month
          )
          break
      }
      // ... add to markers with netWorth for y-position
    })
  }, [scenarioEvents, displayData, zoomLevel])
  ```

- Implement smooth icon transitions when zoom level changes:
  - Use existing ScenarioMarker `animate` prop
  - Coordinate transitions with chart zoom animation
  - Prevent icon flicker during zoom transitions
  - Maintain icon visibility state during transitions

- Handle multiple scenarios in same month/quarter/year:
  - Stack icons vertically (existing behavior)
  - Adjust spacing based on zoom level (closer in yearly view)
  - Ensure tooltips work for all stacked icons

- Update icon opacity transitions:
  - Fade out when zooming out (monthly → quarterly → yearly)
  - Fade in when zooming in (yearly → quarterly → monthly)
  - Synchronize with chart area animation timing
  - Respect `prefersReducedMotion` setting

- Handle edge cases:
  - Scenario event occurs outside visible range (don't show icon)
  - Event date doesn't match any data point (snap to nearest)
  - Multiple events on same date (stack properly)

**Existing ScenarioMarker Component Integration**:
The `ScenarioMarker` component (frontend/src/components/dashboard/ScenarioMarker.tsx) already supports:
- `visible` prop for show/hide control
- `animate` prop for transition enabling
- Opacity transitions with configurable timing
- Stacking multiple events

New requirements build on this foundation.

**Acceptance Criteria**:
- [ ] Scenario icons position correctly at exact month in monthly zoom
- [ ] Icons position at quarter-end in quarterly zoom
- [ ] Icons position at year-end (December) in yearly zoom
- [ ] Icons transition smoothly when zoom level changes (no jump/flicker)
- [ ] Icons fade out/in with timing coordinated with chart animation
- [ ] Multiple scenarios in same period stack properly at all zoom levels
- [ ] Icon click handlers work correctly in all zoom modes
- [ ] Tooltip shows correct date format based on zoom (month/quarter/year)
- [ ] Icons outside visible range are not rendered (performance)
- [ ] Reduced motion preference respected (no animations)

**Testing**:
- Unit tests:
  - Scenario date parsing for year/month extraction
  - Marker positioning logic for each zoom level
  - Stacking logic for multiple events
- Visual tests:
  - Icons render at correct positions
  - Transitions appear smooth
  - No visual glitches during zoom
- Integration tests:
  - Click scenario icon opens modal with correct event
  - Tooltip shows appropriate detail level
- Performance tests:
  - 50+ scenario icons render without lag

**Dependencies**: Requires F-MTH-5 (chart with zoom)

---

#### F-MTH-7: Month Selector Component
**Priority**: P1 | **Complexity**: 2 points | **Sprint**: 3

**Objective**: Create month selector UI that appears when user is in monthly resolution mode.

**Requirements**:
- Create `MonthSelector` component that displays 12 month buttons
- Highlight currently selected month
- Only visible when `timeResolution === 'monthly'`
- Position below year selector in FinancialDataManagement
- Responsive design (horizontal scroll on mobile)
- Keyboard navigation support

**Component API**:
```typescript
interface MonthSelectorProps {
  selectedMonth: number        // 0-11 (Jan = 0)
  onSelectMonth: (month: number) => void
  className?: string
}
```

**Acceptance Criteria**:
- [ ] Displays 12 month buttons (Jan-Dec)
- [ ] Currently selected month has distinct styling
- [ ] Click/tap changes selected month
- [ ] Only visible in monthly resolution mode
- [ ] Responsive: horizontal scroll on mobile
- [ ] Keyboard: arrow keys navigate months
- [ ] Matches glassmorphic design system

**Testing**:
- Unit tests: Month selection changes state
- Visual tests: Component renders at all states
- Accessibility tests: Keyboard navigation works

---

#### F-MTH-8: Financial Data Cards Monthly Display
**Priority**: P1 | **Complexity**: 3 points | **Sprint**: 3

**Objective**: Update financial data cards (Assets, Liabilities, Income, Expenses) to display monthly data when in monthly resolution mode.

**Requirements**:
- Update cards to show data for selected year + month combination when in monthly mode
- Display monthly amounts (not annualized) in cards
- Update data fetching logic:
  ```typescript
  const currentData = useMemo(() => {
    if (resolution === 'monthly') {
      return dataPoints?.find(m =>
        m.yearIndex === selectedYear &&
        m.month === selectedMonth + 1
      )
    }
    return dataPoints?.find(y => y.year === selectedYear)
  }, [resolution, selectedYear, selectedMonth, dataPoints])
  ```
- Show "Month" or "Year" label based on resolution
- Update empty states: "No income this month" vs "No income this year"
- Display amount labels: "$5,000/month" vs "$60,000/year"

**Acceptance Criteria**:
- [ ] Cards display monthly data when resolution is 'monthly'
- [ ] Cards display yearly data when resolution is 'yearly'
- [ ] Amounts labeled correctly (/month vs /year)
- [ ] Selected month changes data displayed in cards
- [ ] Empty states show appropriate messaging
- [ ] Loading states display while data fetching
- [ ] No visual glitches during resolution switches

**Testing**:
- Unit tests: Data filtering logic for monthly selection
- Visual tests: Cards render correctly in both modes
- Integration tests: Month selection updates cards

**Dependencies**: Requires F-MTH-3, F-MTH-7

---

#### F-MTH-9: Settings UI for Time Resolution Toggle
**Priority**: P1 | **Complexity**: 2 points | **Sprint**: 3

**Objective**: Add time resolution toggle to General Settings page.

**Requirements**:
- Add "Time Resolution" section to Settings page
- Implement toggle/dropdown with two options:
  - "Yearly (default)" - Show annual overview
  - "Monthly (detailed)" - Show month-by-month detail
- Use TanStack Query mutation to save preference:
  ```typescript
  const updateResolution = useMutation({
    mutationFn: (resolution: TimeResolution) =>
      financialApi.updateUserSettings({ timeResolution: resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEYS.settings.user)
      queryClient.invalidateQueries(['timeline'])
      toast.success('Time resolution updated')
    }
  })
  ```
- Show loading state while saving
- Display success/error toasts
- Include help text explaining the difference

**Acceptance Criteria**:
- [ ] Settings page includes "Time Resolution" section
- [ ] Toggle clearly labeled with descriptions
- [ ] Current preference correctly displayed
- [ ] Changing preference triggers API call
- [ ] Success toast appears after save
- [ ] Error toast appears on failure
- [ ] Timeline refetches with new resolution
- [ ] Preference persists across sessions

**Testing**:
- Unit tests: Mutation logic
- Integration tests: Settings save successfully
- E2E tests: Change preference, verify timeline updates

**Dependencies**: Requires F-MTH-1, F-MTH-2, B-MTH-4

---

#### F-MTH-10: Form Updates for Month-Level Dates
**Priority**: P2 | **Complexity**: 3 points | **Sprint**: 4

**Objective**: Update financial item forms (Add/Edit Asset, Liability, Income, Expense) to support month-level start and end dates when in monthly resolution mode.

**Requirements**:
- Add month dropdowns next to year inputs when `timeResolution === 'monthly'`
- Show only year when in yearly mode
- Validate end month >= start month (when in same year)
- Update form schemas to include `startMonth` and `endMonth` fields (optional, 1-12)
- Default to NULL when not in monthly mode (or default to 1 and 12)
- Update API calls to include month fields

**Form Field Example**:
```typescript
// In monthly mode
<div>
  <label>Start Date</label>
  <div className="flex gap-2">
    <select name="startYear">...</select>
    <select name="startMonth">
      <option value="1">January</option>
      <option value="2">February</option>
      ...
    </select>
  </div>
</div>

// In yearly mode (no month selector)
<div>
  <label>Start Year</label>
  <select name="startYear">...</select>
</div>
```

**Acceptance Criteria**:
- [ ] Forms show month selectors only in monthly mode
- [ ] Month validation works (1-12)
- [ ] End month >= start month validation (same year)
- [ ] API calls include startMonth/endMonth when in monthly mode
- [ ] API calls exclude month fields when in yearly mode
- [ ] Form submissions save correctly to database
- [ ] Edit forms pre-populate month values correctly

**Testing**:
- Unit tests: Form validation logic
- Integration tests: Form submission includes correct fields
- E2E tests: Create item with month dates, verify in timeline

**Dependencies**: Requires F-MTH-1, F-MTH-2, F-MTH-9, B-MTH-1

---

### Testing Tickets

#### B-MTH-TEST-1: Backend Unit & Integration Tests
**Priority**: P0 | **Complexity**: 3 points | **Sprint**: 2

**Objective**: Comprehensive test coverage for backend monthly calculation engine and API endpoints.

**Requirements**:

**Unit Tests** (backend/internal/financial/timeline/):
- Monthly growth calculation accuracy:
  ```go
  func TestMonthlyGrowthCalculation(t *testing.T) {
    // Test: $10,000 at 6% annual for 12 months = $10,616.78
    // Test: 12% annual = 1% monthly exactly
    // Test: Zero growth rate (amount stays constant)
    // Test: Negative growth (liability decay)
  }
  ```
- Frequency to monthly conversion:
  ```go
  func TestConvertToMonthly(t *testing.T) {
    // Test all 6 frequencies: annual, monthly, weekly, biweekly, quarterly, semiannual
    // Test: $12,000 annual = $1,000 monthly
    // Test: $100 weekly = $433.33 monthly
  }
  ```
- Item expiration logic:
  ```go
  func TestItemExpiration(t *testing.T) {
    // Test: Item ending year 2, month 6 disappears in year 2, month 7
    // Test: Items with NULL end_month expire at year-end
    // Test: End year/month validation
  }
  ```
- Cash accumulation with monthly compounding:
  ```go
  func TestCashAccumulation(t *testing.T) {
    // Test: Monthly interest compounds correctly
    // Test: Accumulator account tracks running balance
    // Test: Non-accumulator accounts compound independently
  }
  ```
- Resolution parameter validation:
  ```go
  func TestResolutionValidation(t *testing.T) {
    // Test: "yearly" accepted
    // Test: "monthly" accepted
    // Test: "invalid" returns 400 error
    // Test: Empty/nil defaults to "yearly"
  }
  ```

**Integration Tests** (backend/cmd/server/handlers/):
- Full timeline calculation with real user data:
  ```go
  func TestMonthlyTimelineCalculation(t *testing.T) {
    // Setup: Create user with assets, liabilities, income, expenses
    // Test: GET /api/v1/financial/timeline?resolution=monthly
    // Assert: Returns 420 TimelineMonth objects
    // Assert: Net worth calculations correct at each month
    // Assert: Growth applied correctly month-over-month
  }
  ```
- Scenario events apply correctly in monthly mode:
  ```go
  func TestScenarioEventsMonthly(t *testing.T) {
    // Setup: Create scenario event occurring in month 6 of year 2
    // Test: Event impacts appear starting month 6
    // Test: Event impacts continue in subsequent months
    // Test: Event with end_month stops at correct month
  }
  ```
- Database queries with month filtering:
  ```go
  func TestMonthFiltering(t *testing.T) {
    // Test: Items with start_month=3 don't appear in months 1-2
    // Test: Items with end_month=8 disappear in month 9
    // Test: NULL months default to 1 and 12
  }
  ```
- User settings save and retrieve resolution:
  ```go
  func TestUserSettingsResolution(t *testing.T) {
    // Test: PUT /api/v1/settings/user with timeResolution="monthly"
    // Test: GET returns saved resolution
    // Test: Invalid resolution values rejected
  }
  ```

**Performance Tests**:
- Benchmark monthly calculation time:
  ```go
  func BenchmarkMonthlyTimeline(b *testing.B) {
    // Measure: Time to calculate 420 months
    // Target: <3 seconds for P95
    // Test with varying data sizes (10, 50, 100 financial items)
  }
  ```

**Acceptance Criteria**:
- [ ] All unit tests pass with >90% code coverage for timeline package
- [ ] Monthly calculation accuracy within $0.01 for all test cases
- [ ] Frequency conversions accurate to 2 decimal places
- [ ] Integration tests cover all API endpoints
- [ ] Performance benchmark: P95 < 3 seconds for 420 months
- [ ] Database queries optimized (no N+1 queries)
- [ ] Error cases properly tested (invalid input, missing data)

**Testing**:
- Run: `go test ./internal/financial/timeline/... -v -cover`
- Run: `go test ./cmd/server/handlers/... -v -cover`
- Run: `go test -bench=. ./internal/financial/timeline/...`

**Dependencies**: Requires B-MTH-2, B-MTH-3, B-MTH-4

---

#### F-MTH-TEST-1: Frontend Unit Tests
**Priority**: P0 | **Complexity**: 2 points | **Sprint**: 3

**Objective**: Unit test coverage for frontend data aggregation, zoom logic, and component behavior.

**Requirements**:

**Data Aggregation Tests** (src/hooks/useTimeline.test.ts):
```typescript
describe('useTimeline - Monthly Resolution', () => {
  test('aggregates monthly data to yearly view', () => {
    // Given: 420 monthly data points
    // When: zoomLevel = 'yearly'
    // Then: Returns 35 data points (December of each year)
  })

  test('aggregates monthly data to quarterly view', () => {
    // Given: 420 monthly data points
    // When: zoomLevel = 'quarterly'
    // Then: Returns 40 data points for 10 years (Mar, Jun, Sep, Dec)
  })

  test('filters monthly data based on visible range', () => {
    // Given: 420 monthly data points, visibleRange = {start: 0, end: 3}
    // When: zoomLevel = 'monthly'
    // Then: Returns 36 data points (3 years × 12 months)
  })
})
```

**Zoom Logic Tests** (src/components/dashboard/NetWorthProjection.test.tsx):
```typescript
describe('Zoom Controls', () => {
  test('zoom in transitions: yearly → quarterly → monthly', () => {
    // Test: Each zoom level displays correct number of points
    // Assert: No intermediate states or flicker
  })

  test('zoom out handles boundaries correctly', () => {
    // Test: Zoom out disabled at yearly level
    // Test: Zoom in disabled when no more detail available
  })

  test('pan slider updates visible range', () => {
    // Test: Dragging slider changes data displayed
    // Test: Slider respects boundaries (can't pan beyond data)
  })
})
```

**Scenario Marker Tests** (src/components/dashboard/NetWorthProjection.test.tsx):
```typescript
describe('Scenario Marker Positioning', () => {
  test('positions at exact month in monthly zoom', () => {
    // Given: Scenario occurs on 2025-06-15
    // When: zoomLevel = 'monthly'
    // Then: Icon positioned at June 2025 data point
  })

  test('positions at quarter-end in quarterly zoom', () => {
    // Given: Scenario occurs on 2025-06-15
    // When: zoomLevel = 'quarterly'
    // Then: Icon positioned at Q2 end (June 30) data point
  })

  test('positions at year-end in yearly zoom', () => {
    // Given: Scenario occurs on 2025-06-15
    // When: zoomLevel = 'yearly'
    // Then: Icon positioned at Dec 31, 2025 data point
  })

  test('handles events outside visible range', () => {
    // Given: Event in 2030, visible range 2024-2027
    // Then: Icon not rendered (performance)
  })
})
```

**Month Selector Tests** (src/components/dashboard/MonthSelector.test.tsx):
```typescript
describe('MonthSelector', () => {
  test('renders 12 month buttons', () => {
    // Assert: Jan through Dec buttons present
  })

  test('clicking month updates selection', () => {
    // Test: Click February → selectedMonth = 1
    // Assert: Callback invoked with correct value
  })

  test('keyboard navigation works', () => {
    // Test: Arrow right moves to next month
    // Test: Arrow left moves to previous month
  })
})
```

**Form Validation Tests** (src/components/financial/IncomeForm.test.tsx):
```typescript
describe('Month-Level Date Validation', () => {
  test('validates end month >= start month', () => {
    // Given: startYear=2, startMonth=6, endYear=2, endMonth=4
    // Then: Validation error "End month must be after start month"
  })

  test('allows end month before start month if later year', () => {
    // Given: startYear=2, startMonth=10, endYear=3, endMonth=2
    // Then: Valid (Oct 2026 → Feb 2027)
  })

  test('month fields only visible in monthly mode', () => {
    // When: resolution = 'yearly'
    // Then: Month selectors not rendered
  })
})
```

**Acceptance Criteria**:
- [ ] All unit tests pass with >85% code coverage
- [ ] Data aggregation logic tested for all zoom levels
- [ ] Scenario marker positioning tested for all zoom levels
- [ ] Form validation covers all edge cases
- [ ] Component tests cover user interactions (click, keyboard)
- [ ] Mock API responses properly for all test scenarios

**Testing**:
- Run: `npm run test` (Vitest)
- Run: `npm run test:coverage`
- Target: >85% coverage for new components

**Dependencies**: Requires F-MTH-3, F-MTH-4, F-MTH-5, F-MTH-6, F-MTH-7

---

#### F-MTH-TEST-2: Integration & E2E Tests
**Priority**: P1 | **Complexity**: 3 points | **Sprint**: 4

**Objective**: End-to-end testing of complete user workflows across monthly resolution feature.

**Requirements**:

**Integration Tests** (API Interaction):
```typescript
describe('Timeline API Integration', () => {
  test('fetches monthly timeline successfully', async () => {
    // Given: User with timeResolution='monthly'
    // When: useTimeline hook loads
    // Then: API called with ?resolution=monthly
    // Then: 420 months returned and cached
  })

  test('switches resolution and refetches', async () => {
    // Given: User in yearly mode
    // When: User switches to monthly in settings
    // Then: Timeline query invalidated
    // Then: New API call with resolution=monthly
    // Then: Chart updates with monthly data
  })

  test('handles API errors gracefully', async () => {
    // Given: API returns 500 error
    // Then: Error state displayed to user
    // Then: Retry button available
  })
})
```

**End-to-End Tests** (Playwright/Cypress):
```typescript
describe('Monthly Resolution - Complete Flow', () => {
  test('user enables monthly resolution', async () => {
    // 1. Navigate to Settings
    // 2. Click "Time Resolution" dropdown
    // 3. Select "Monthly (detailed)"
    // 4. Verify toast: "Time resolution updated"
    // 5. Navigate to Dashboard
    // 6. Verify chart shows monthly data
    // 7. Verify month selector visible
  })

  test('user zooms through timeline', async () => {
    // Given: User in monthly mode
    // 1. Verify chart shows 36 monthly points (3 years)
    // 2. Click "Zoom Out" button
    // 3. Verify chart shows 40 quarterly points (10 years)
    // 4. Click "Zoom Out" again
    // 5. Verify chart shows 35 yearly points
    // 6. Verify all transitions smooth (no flicker)
  })

  test('user adds income with month-level dates', async () => {
    // Given: User in monthly mode
    // 1. Click "Add Income"
    // 2. Fill: Name="Freelance", Amount=5000, Frequency=Monthly
    // 3. Select: Start Year=2, Start Month=March (3)
    // 4. Select: End Year=2, End Month=August (8)
    // 5. Click "Save"
    // 6. Verify income appears in chart starting March
    // 7. Select different months (Jan, Feb, Mar, Apr)
    // 8. Verify income visible only Mar-Aug
  })

  test('scenario icons transition correctly', async () => {
    // Given: Scenario event "New Baby" on 2025-06-15
    // 1. Verify icon at June 2025 in monthly zoom
    // 2. Click "Zoom Out" to quarterly
    // 3. Verify icon moves to Q2 end (smooth transition)
    // 4. Click "Zoom Out" to yearly
    // 5. Verify icon moves to Dec 2025 (smooth transition)
    // 6. Click icon at any zoom level
    // 7. Verify modal opens with correct scenario details
  })

  test('month selector updates financial cards', async () => {
    // Given: User in monthly mode, viewing Year 2
    // 1. Verify month selector shows Jan-Dec
    // 2. Click "June"
    // 3. Verify all cards update to show June 2026 data
    // 4. Verify amounts labeled "/month"
    // 5. Click "December"
    // 6. Verify cards update to December 2026 data
  })

  test('user switches back to yearly mode', async () => {
    // Given: User in monthly mode
    // 1. Navigate to Settings
    // 2. Select "Yearly (default)"
    // 3. Navigate to Dashboard
    // 4. Verify chart shows yearly view (35 points)
    // 5. Verify month selector hidden
    // 6. Verify amounts labeled "/year"
  })
})
```

**Visual Regression Tests**:
```typescript
describe('Visual Regression - Monthly Resolution', () => {
  test('chart renders correctly at all zoom levels', async () => {
    // Capture screenshots at: yearly, quarterly, monthly zoom
    // Compare with baseline images
    // Fail if visual differences detected
  })

  test('scenario icons transition smoothly', async () => {
    // Record video of zoom in/out transitions
    // Verify no flicker or jumping
    // Verify opacity fades synchronized
  })

  test('responsive design on mobile', async () => {
    // Test on viewport sizes: 375px, 768px, 1024px, 1920px
    // Verify month selector scrolls horizontally on mobile
    // Verify zoom controls accessible on all sizes
  })
})
```

**Performance Tests**:
```typescript
describe('Performance - Monthly Resolution', () => {
  test('chart render time under 100ms', async () => {
    // Measure: Time from data received to chart visible
    // Assert: All zoom levels render in <100ms
  })

  test('zoom transition performance', async () => {
    // Measure: Time to complete zoom in/out animation
    // Assert: <500ms for smooth UX
  })

  test('large dataset handling', async () => {
    // Given: User with 100+ financial items
    // When: Switch to monthly resolution
    // Then: No browser freeze or lag
    // Then: Chart still renders in <100ms
  })
})
```

**Acceptance Criteria**:
- [ ] All user workflows tested end-to-end
- [ ] API integration tests cover success and error paths
- [ ] Visual regression tests pass (no unexpected UI changes)
- [ ] Performance tests meet targets (<100ms chart render)
- [ ] Tests pass on Chrome, Firefox, Safari
- [ ] Tests pass on mobile viewports (iOS Safari, Chrome Android)
- [ ] Accessibility tests pass (keyboard nav, screen readers)

**Testing**:
- Run: `npm run test:e2e` (Playwright or Cypress)
- Run: `npm run test:visual` (Percy or Chromatic)
- Run: `npm run test:perf`

**Dependencies**: Requires all backend and frontend tickets complete

---

#### TEST-MTH-MANUAL: Manual Testing Checklist
**Priority**: P1 | **Complexity**: 1 point | **Sprint**: 4

**Objective**: Manual QA checklist for critical user paths and edge cases not covered by automated tests.

**Manual Test Cases**:

**1. Settings Persistence**
- [ ] Enable monthly resolution, close browser, reopen → Still in monthly mode
- [ ] Switch to yearly, refresh page → Still in yearly mode
- [ ] Test with multiple browser tabs → Settings sync correctly

**2. Data Accuracy Verification**
- [ ] Create income $1,200/month for full year → Verify annual total = $14,400
- [ ] Apply 6% annual growth → Verify month 12 amount ≈ 1.005% higher than month 11
- [ ] Compare yearly mode total with sum of 12 months in monthly mode → Should match

**3. Scenario Event Precision**
- [ ] Create scenario occurring 2025-06-15
- [ ] In monthly zoom, verify icon at June 2025 (not May or July)
- [ ] In quarterly zoom, verify icon at end of Q2
- [ ] In yearly zoom, verify icon at end of 2025
- [ ] Click icon at each zoom level → Modal shows correct date "June 15, 2025"

**4. Edge Cases**
- [ ] Item starts month 12, ends month 1 next year → Verify appears in both months
- [ ] Item with NULL start_month → Verify appears starting January
- [ ] Item with NULL end_month → Verify continues through December
- [ ] Zoom during chart animation → Verify no visual glitches
- [ ] Pan to data boundary → Verify slider stops correctly

**5. Mobile Testing**
- [ ] iPhone SE (375px width) → Month selector scrolls horizontally
- [ ] iPad (768px) → Zoom controls accessible
- [ ] Android tablet (1024px) → All features functional
- [ ] Touch gestures work (tap icons, swipe month selector)

**6. Browser Compatibility**
- [ ] Chrome (latest) → All features work
- [ ] Firefox (latest) → All features work
- [ ] Safari (latest) → All features work
- [ ] Edge (latest) → All features work

**7. Accessibility**
- [ ] Tab key navigates through all controls
- [ ] Enter/Space activates zoom buttons
- [ ] Arrow keys navigate month selector
- [ ] Screen reader announces zoom level changes
- [ ] High contrast mode renders clearly

**8. Performance - Real World**
- [ ] User with 50+ financial items → No lag
- [ ] 20+ scenario events → Icons render without delay
- [ ] Rapid zoom in/out 10 times → No browser freeze
- [ ] Switch resolution 5 times → No memory leak

**Acceptance Criteria**:
- [ ] All manual test cases pass
- [ ] No critical bugs found
- [ ] Edge cases handled gracefully
- [ ] Mobile experience smooth and intuitive
- [ ] Accessibility requirements met (WCAG AA)

**Testing Tools**:
- Browser DevTools (Performance tab)
- Lighthouse (Accessibility audit)
- Real devices (iOS, Android)
- Screen reader (VoiceOver, NVDA)

**Dependencies**: Requires all development and automated testing complete

---

## Dependencies & Rollout Plan

### Ticket Dependencies

```
Sprint 1:
  B-MTH-1 (Schema Migration)
    └─→ B-MTH-2 (Calculation Engine)
  F-MTH-1 (TypeScript Types)
    └─→ F-MTH-2 (API Service)

Sprint 2:
  B-MTH-2 → B-MTH-3 (API Endpoint) → B-MTH-4 (Settings Endpoint)
  B-MTH-4 → B-MTH-TEST-1 (Backend Tests) ✅
  F-MTH-2 → F-MTH-3 (useTimeline Hook)
  F-MTH-4 (Zoom Controls) ← independent

Sprint 3:
  B-MTH-4 → F-MTH-9 (Settings UI)
  F-MTH-3 + F-MTH-4 → F-MTH-5 (Chart with Zoom)
  F-MTH-5 → F-MTH-6 (Scenario Marker Positioning & Icon Transitions)
  F-MTH-6 → F-MTH-TEST-1 (Frontend Unit Tests) ✅
  F-MTH-7 (Month Selector) → F-MTH-8 (Cards Monthly Display)

Sprint 4:
  F-MTH-10 (Form Updates) - requires all previous frontend tickets
  All dev tickets → F-MTH-TEST-2 (Integration & E2E Tests) ✅
  F-MTH-TEST-2 → TEST-MTH-MANUAL (Manual QA Checklist) ✅
```

### Rollout Strategy

**Phase 1: Foundation (Week 1)**
- Deploy B-MTH-1 (schema) to production
- Deploy F-MTH-1, F-MTH-2 (types and API service)
- No user-visible changes

**Phase 2: Backend API (Week 2)**
- Deploy B-MTH-2, B-MTH-3, B-MTH-4
- API available but not exposed in UI
- Internal testing of monthly calculations

**Phase 3: Beta Launch (Week 3)**
- Deploy F-MTH-3 through F-MTH-9
- Enable for 10% of users (feature flag)
- Monitor performance and gather feedback

**Phase 4: General Availability (Week 4)**
- Deploy F-MTH-10
- Roll out to 100% of users
- Marketing announcement

**Rollback Plan**:
- Feature flag can disable monthly resolution UI immediately
- Backend API remains backward compatible (yearly is default)
- Database schema change is additive (no data loss on rollback)

---

## Risk Mitigation

### Technical Risks

1. **Performance Degradation**
   - **Risk**: Monthly calculation takes >5 seconds, causing timeouts
   - **Mitigation**:
     - Implement caching layer for calculated timelines
     - Add pagination if needed (fetch months on demand)
     - Performance testing in staging before prod rollout
   - **Fallback**: Disable monthly resolution feature flag if P95 latency >5s

2. **Chart Rendering Issues**
   - **Risk**: Recharts struggles with 420 data points
   - **Mitigation**:
     - Always filter to 35-40 visible points before rendering
     - Test on low-end devices
     - Consider alternative charting library if performance poor
   - **Fallback**: Limit monthly mode to 1-year visible range initially

3. **Database Migration Failure**
   - **Risk**: Schema change fails on production due to large table size
   - **Mitigation**:
     - Test migration on production-sized dataset in staging
     - Schedule during low-traffic window
     - Add columns with NULLABLE (no table rewrite)
   - **Fallback**: Revert migration immediately if fails

### User Experience Risks

1. **Confusion with Two Modes**
   - **Risk**: Users don't understand difference between yearly and monthly
   - **Mitigation**:
     - Clear labels and help text in settings
     - Tooltips explaining each mode
     - Default to yearly (familiar mode)
   - **Monitoring**: Track % of users switching back to yearly within 24 hours

2. **Overwhelming Detail**
   - **Risk**: 420 months of data overwhelms users
   - **Mitigation**:
     - Default zoom to 3 years visible (36 months)
     - Clear navigation controls
     - Option to quickly switch back to yearly
   - **Monitoring**: Track avg session time in monthly mode vs yearly

### Business Risks

1. **Low Adoption**
   - **Risk**: <10% of users enable monthly resolution
   - **Mitigation**:
     - Survey users pre-launch about need for monthly detail
     - A/B test different default resolutions
     - Educate users about benefits (e.g., CPF precision)
   - **Decision Point**: If <5% adoption after 60 days, consider deprecating

2. **Increased Support Burden**
   - **Risk**: Users confused by monthly mode require more support
   - **Mitigation**:
     - Comprehensive help documentation
     - In-app tooltips and onboarding
     - Monitor support ticket volume
   - **Monitoring**: Track support tickets mentioning "monthly" or "resolution"

---

## Testing Strategy

### Unit Tests

**Backend**:
- [ ] Monthly growth rate calculation accuracy
- [ ] Frequency to monthly conversion (all 6 frequencies)
- [ ] Item expiration logic (year and month)
- [ ] Cash accumulation with monthly compounding
- [ ] Resolution parameter validation

**Frontend**:
- [ ] Data aggregation logic for each zoom level
- [ ] Month selector state management
- [ ] Form validation for month fields
- [ ] Type guards for TimelineMonth vs TimelineYear

### Integration Tests

**Backend**:
- [ ] Full timeline calculation with real user data (monthly mode)
- [ ] Scenario events apply correctly in monthly calculations
- [ ] Database queries with month filtering
- [ ] User settings save and retrieve resolution preference

**Frontend**:
- [ ] Timeline API calls with resolution parameter
- [ ] Chart updates when zoom level changes
- [ ] Cards update when month selection changes
- [ ] Settings page saves resolution preference

### End-to-End Tests

- [ ] User enables monthly resolution in settings
- [ ] Timeline refetches with monthly data
- [ ] User zooms in/out on chart
- [ ] User selects different months in data cards
- [ ] User adds item with month-level dates
- [ ] Item appears in correct months on timeline
- [ ] User switches back to yearly resolution

### Performance Tests

- [ ] Monthly calculation completes in <3 seconds (P95)
- [ ] Chart renders in <100ms at all zoom levels
- [ ] API response time <2 seconds (P50)
- [ ] Database query time for month filtering
- [ ] Frontend memory usage (no leaks after zoom/pan)

### Accessibility Tests

- [ ] Zoom controls keyboard navigable
- [ ] Month selector accessible via keyboard
- [ ] Screen reader announces zoom level changes
- [ ] Focus management during resolution switches
- [ ] Color contrast meets WCAG AA standards

---

## Open Questions

1. **Should monthly resolution be available to all users or premium only?**
   - Consideration: Feature adds significant backend compute cost
   - Recommendation: Launch for all users, monitor costs, consider premium later

2. **Should we support sub-monthly granularity (weekly, daily) in future?**
   - Consideration: Dramatically increases data points (1825 days for 5 years)
   - Recommendation: Gather feedback from monthly users first

3. **Should we auto-aggregate scenario events when zoomed to yearly view?**
   - Consideration: Scenario with multiple monthly impacts might show as single yearly event
   - Recommendation: Yes, aggregate impacts for visual clarity, show details on click

4. **Should we show financial data for multiple months at once (e.g., Q1 view)?**
   - Consideration: Users might want to see "all of January, February, March" in cards
   - Recommendation: Phase 2 enhancement, start with single month selection

5. **Should month selector persist across page refreshes?**
   - Consideration: UX continuity vs URL complexity
   - Recommendation: No, reset to current month on refresh (simpler initial version)

---

## Future Enhancements

### Phase 2 (After Initial Launch)

1. **Quarterly View in Financial Cards**
   - Allow users to select "Q1 2024" and see all 3 months' data aggregated

2. **Month Range Selection**
   - Select "Jan - Mar 2024" to see cumulative data for a period

3. **Export Monthly Data**
   - Download CSV/Excel with month-by-month projections

4. **Monthly Scenario Impact Analysis**
   - Show month-by-month breakdown of scenario impacts in modal

### Phase 3 (Long-term)

1. **Weekly Resolution (Advanced Users)**
   - Super detailed view for users with weekly income/expense patterns

2. **Custom Date Ranges**
   - User defines arbitrary start/end dates (not bound to month boundaries)

3. **Animated Timeline Playback**
   - "Play" button that animates through months/years showing net worth changes

4. **AI Insights for Monthly Patterns**
   - "Your expenses spike every March due to..."

---

## Appendix

### Glossary

- **Resolution**: The time granularity of financial projections (yearly or monthly)
- **Zoom Level**: Visual aggregation level in chart (yearly, quarterly, monthly)
- **Visible Range**: The subset of time period currently displayed in chart
- **Compound Growth**: Interest/growth calculated on accumulated amount (not simple interest)
- **Monthly Annualization**: Converting monthly amounts to equivalent annual (multiply by 12)

### References

- Existing multiyear timeline PRD: `/specs/rewrite-phase-2/multiyear-docs/prd.txt`
- Scenario analysis PRD: `/specs/scenario-analysis/scenario-analysis-prd.md`
- API contract: `/specs/rewrite-phase-1/api-contract.md`
- AGENTS.md conventions: `/AGENTS.md`
