# Product Roadmap

**Last Updated**: December 4, 2024
**Current Status**: Post-CPF Backend Integration

---

## Current Position

**✅ Recently Completed**:
- **CPF Backend Integration** (merged PR #22 to main)
  - CPF contribution calculator with accurate Singapore rates
  - Support for Ordinary Wages (OW) and Additional Wages (AW)
  - Age-based allocation rates (OA/SA/MA/RA)
  - In-memory CPF configuration (2024-2026 rates)
  - Comprehensive unit test coverage

**🚧 In Progress**: None

**📋 Next Up**: Monthly Resolution View

---

## Epic 1: CPF Frontend Integration - Wage Classification
**Status**: 🔜 Upcoming
**Branch**: `feat/cpf-wage-classification`
**Priority**: P0 - Critical
**Estimated Effort**: 3-4 weeks

### Overview
Complete the frontend integration of CPF contributions into the financial planning app. Users will be able to set up their CPF profile, add employment income with automatic CPF calculations, and view CPF account balances as assets.

### Key Features
- **CPF Profile Setup**: Multi-step modal for DOB, residency status, and time-based config changes
- **Income Classification**: Distinguish between regular salary (OW) and irregular bonuses (AW)
- **Net Take-Home Display**: Show net pay with tooltip breakdown (gross - employee CPF)
- **CPF Subsection**: Collapsible section in income cards showing employee/employer contributions
- **CPF as Assets**: Display OA/SA/MA/RA accounts in Assets section with "System Managed" badges
- **RA Visibility**: Only show Retirement Account for users 55+

### Implementation Phases
1. **Phase 1: Profile Setup** (Week 1)
   - CPF profile API endpoints
   - Multi-step profile setup modal
   - Profile validation before income creation

2. **Phase 2: Income UI** (Week 2)
   - Net take-home display with tooltip
   - CPF contributions subsection
   - Income form enhancements (wage type selector)

3. **Phase 3: CPF as Assets** (Week 3)
   - CPF accounts API integration
   - Display in Assets section
   - Auto-update balances on income changes

4. **Phase 4: Testing & Polish** (Week 4)
   - Integration tests
   - Component tests
   - Documentation

### Success Metrics
- 80%+ users complete CPF profile setup
- 90%+ salary income has CPF data populated
- CPF calculations match official CPF calculator 100%

**Specification**: `/specs/cpf/cpf-integration-tickets.md`

---

## Epic 2: Monthly Time Resolution
**Status**: 📋 Planned
**Priority**: P1 - High
**Estimated Effort**: 6-7 weeks (49 complexity points)

### Overview
Add monthly time resolution to financial projections with intelligent zoom-based visualization. Users can toggle between yearly and monthly views, enabling more granular financial planning and better short-term decision making.

### Key Features
- **Resolution Toggle**: Settings UI to switch between yearly/monthly resolution
- **Zoom Levels**: 3-level zoom system for performance optimization
  - Yearly: 35 data points (December each year)
  - Quarterly: 40 data points (Q1-Q4 endpoints)
  - Monthly: 36 data points (3 years at a time)
- **Monthly Calculations**: Backend calculates 420 monthly snapshots with compound growth
- **Smart Aggregation**: Chart adapts display based on zoom level
- **Month Selector**: UI component for precise month-level navigation
- **Scenario Icon Transitions**: Smooth positioning of event markers across zoom levels
- **Financial Data Cards**: Month-by-month detail views

### Technical Highlights
- **Compound Monthly Growth**: Accurate formula converts annual rates to monthly
- **Backward Compatible Schema**: Optional month columns (no migration needed)
- **Performance Optimized**: Always display 35-40 points regardless of resolution
- **Animation Support**: Smooth transitions with reduced motion support

### Implementation Sprints
1. **Sprint 1: Foundation** (Week 1)
   - Database schema migration
   - Monthly calculation engine
   - TypeScript types

2. **Sprint 2: Backend Complete** (Week 2)
   - Timeline API endpoint updates
   - User settings endpoint
   - Backend testing

3. **Sprint 3: Frontend Core** (Weeks 3-4)
   - Zoom controls component
   - Chart with zoom support
   - Scenario marker transitions
   - Month selector

4. **Sprint 4: Integration & Testing** (Weeks 5-7)
   - Form updates (month-level dates)
   - E2E tests
   - Manual QA
   - Performance tuning

### Success Metrics
- Backend calculation: P95 < 3 seconds
- Chart render: < 100ms at all zoom levels
- 30% user adoption within 30 days
- 75% retention after 7 days

**Specifications**:
- PRD: `/specs/monthly-resolution/monthly-resolution-prd.md`
- Summary: `/specs/monthly-resolution/SUMMARY.md`

---

## Epic 3: CPF Full Simulation Engine
**Status**: 🔮 Future (Backlog)
**Priority**: P2 - Medium
**Estimated Effort**: 8-12 weeks

### Overview
Build a comprehensive CPF simulation engine that models 30+ year projections including housing usage, voluntary contributions, retirement planning (CPF LIFE), and tax optimization strategies.

### Key Features
- **Housing Integration**: Track OA usage for property with accrued interest
- **Voluntary Contributions**: Cash top-ups with tax relief calculations
- **Retirement Planning**: CPF LIFE payout estimation (Standard/Basic/Escalating plans)
- **Healthcare Planning**: MediSave adequacy and MediShield Life premiums
- **SRS Integration**: Supplementary Retirement Scheme with tax benefits
- **Interest Simulation**: Monthly interest with extra interest rules (first $60k)
- **Scenario Comparison**: Side-by-side comparison of different life paths

### User Stories
- "As a homeowner, I want to see how using CPF for property affects my retirement"
- "As a 45-year-old, I want to know if I should top up my SA to maximize tax relief"
- "As a 60-year-old, I want to compare CPF LIFE plans and deferral options"

**Specification**: `/specs/cpf/cpf-simulation-prd.md`

---

## Epic 4: Singapore Car Module
**Status**: 🔮 Future (Backlog)
**Priority**: P3 - Low
**Estimated Effort**: 4-6 weeks

### Overview
Add comprehensive Singapore car ownership cost modeling including COE bidding, LTA fees, depreciation, maintenance, insurance, and road tax calculations.

### Key Features
- **COE Calculator**: Bidding scenarios and cost projections
- **Total Cost of Ownership**: 10-year projections with all expenses
- **Depreciation Modeling**: PARF and COE rebates
- **Comparison Tool**: New vs used, different car categories
- **Financing Calculator**: Loan scenarios with down payment optimization

**Specifications**:
- PRD: `/specs/singapore-car-module/singapore-car-prd.md`
- Tickets: `/specs/singapore-car-module/singapore-car-tickets.md`

---

## Epic 5: AI Scenario Execution & Analysis
**Status**: 🔮 Future (Backlog)
**Priority**: P2 - Medium
**Estimated Effort**: 6-8 weeks

### Overview
Enhance the AI financial assistant to autonomously create, execute, and compare financial scenarios. The AI will proactively suggest optimizations and "what-if" analyses.

### Key Features
- **Autonomous Scenario Creation**: AI generates scenarios based on user goals
- **Goal-Oriented Planning**: Multi-step plans with automated execution
- **Proactive Monitoring**: Background checks for goal progress and alerts
- **Learning System**: Adapts to user preferences over time
- **Scenario Comparison**: Automated analysis of trade-offs

**Specification**: `/specs/ai-scenario-execution.md`

---

## Completed Epics

### ✅ Epic: Authentication & User Management
**Completed**: November 2024
- Better Auth integration with OAuth providers
- Row-level security with PostgreSQL
- User session management
- Email verification flow

**Specification**: `/specs/auth/`

### ✅ Epic: Core Financial Planning Platform
**Completed**: November 2024
- Multi-year financial projections
- Assets, liabilities, income, expenses tracking
- Net worth visualization
- Scenario analysis framework
- Property planning module

**Specifications**: `/specs/rewrite-phase-1/`, `/specs/rewrite-phase-2/`

---

## Dependencies & Sequencing

```
Current State: CPF Backend Complete ✅
                     ↓
         ┌───────────┴──────────┐
         ↓                      ↓
    Monthly Resolution    CPF Frontend Integration
    (Independent)         (Builds on CPF Backend)
         ↓                      ↓
         └───────────┬──────────┘
                     ↓
            CPF Full Simulation
         (Requires both above)
                     ↓
         ┌───────────┴──────────┐
         ↓                      ↓
    Car Module          AI Scenario Execution
    (Independent)       (Independent)
```

**Key Decision Points**:
1. **Now**: Start Monthly Resolution OR CPF Frontend?
   - **Recommendation**: Monthly Resolution (independent, high user value)
   - CPF Frontend can follow immediately after

2. **After Both Complete**: Prioritize CPF Full Simulation vs AI features?
   - Depends on user feedback from CPF Frontend integration

---

## Release Strategy

### Q1 2025 Target
- ✅ CPF Backend Integration
- 🎯 Monthly Resolution View
- 🎯 CPF Frontend Integration

### Q2 2025 Target
- CPF Full Simulation (housing, retirement planning)
- AI Scenario Execution enhancements

### Q3 2025 Target
- Singapore Car Module
- Additional localization features

---

## Risk Assessment

| Epic | Risk Level | Key Risks | Mitigation |
|------|-----------|-----------|------------|
| CPF Frontend | Low | User confusion about wage types | Clear UI labels, tooltips, defaults |
| Monthly Resolution | Medium | Performance at scale | Zoom-based display, caching |
| CPF Simulation | Medium | Calculation complexity, rule changes | Version by year, extensive testing |
| Car Module | Low | COE data volatility | Real-time API integration |
| AI Execution | High | Autonomous actions safety | Strict approval workflows, risk categorization |

---

## How to Use This Roadmap

1. **Current Work**: Check "In Progress" section for active development
2. **Next Steps**: "Next Up" shows the immediately upcoming epic
3. **Planning**: Review epic descriptions and specifications before starting
4. **Estimates**: Complexity points provide relative effort (not strict timelines)
5. **Flexibility**: Prioritization may change based on user feedback

---

**Questions or Suggestions?**
- Review detailed specs in `/specs/` folder for each epic
- Consult PRD documents for user stories and acceptance criteria
- Check ticket files for implementation breakdown
