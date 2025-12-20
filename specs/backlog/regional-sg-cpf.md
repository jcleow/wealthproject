# CPF Module Product Features Specification

## Overview
The CPF module provides comprehensive financial planning capabilities focused on Singapore's Central Provident Fund system. This module enables users to simulate cashflows, optimize strategies, and make informed decisions about their CPF planning.

## Core Components

### 🧩 1. CPF Profile Management

**Account Balance Tracking**
- Real-time OA/SA/MA/RA balance display
- Historical balance trends and projections
- Integration with CPF API for automated updates

**Contribution Flow Management**
- Monthly contribution calculator (age band + income based)
- Employer/employee contribution split tracking
- Self-employed MediSave calculation
- Voluntary contribution tracking (VC3A, RSTU)

**Investment Portfolio Tracking**
- CPFIS investment performance monitoring
- Asset allocation across OA/SA investments
- Risk assessment and recommendations

**Property & Pledges Module**
- HDB/private property purchase tracking
- CPF usage for downpayment and mortgage
- Accrued interest calculation engine
- Pledge vs refund scenarios at age 55

### 🛠️ 2. Customer Goals Configuration

**Housing Goals Module**
- Property type selector (BTO/Resale/Private)
- Downpayment calculator with CPF OA usage options
- OA replenishment timeline projections
- Accrued interest impact analysis

**Retirement Planning Module**
- BRS/FRS/ERS selection interface
- RA projection at age 55 (OA+SA transfer)
- CPF LIFE payout calculator (age 65+)
- Retirement income gap analysis

**Healthcare Planning Module**
- MA usage tracking for medical expenses
- MediShield/Integrated Shield plan premium calculator
- MediSave BHS projection tool
- Healthcare cost planning scenarios

**Investment Goals Module**
- CPFIS investment strategy builder
- SA shielding strategy planner
- Risk tolerance assessment
- Goal-based investment allocation

### 📈 3. CPF Cashflow Simulation Engine (TOP PRIORITY)

**Core Simulation Features**

**Interest Rate Engine**
- OA: 2.5% base rate
- SA/MA: 4% base + extra 1% on first $60k
- Dynamic rate updates and historical tracking

**Contribution Calculator**
- Age-based contribution rates (varying bands)
- Wage ceiling limits (PWC, AW, MW)
- Self-employed contribution calculations
- Bonus and irregular income handling

**Property Payment Scheduler**
- HDB loan payment tracking
- Bank loan vs CPF usage optimization
- Accrued interest compound calculation
- Early repayment scenario modeling

**Life Event Modeling**
- SA-to-RA transfer at age 55
- CPF LIFE annuity conversion at 65
- Career breaks and income changes
- Medical expense withdrawals

**Projection Timeline**
- Year-by-year balance forecasting
- Monte Carlo simulation for market volatility
- Sensitivity analysis for key variables
- Multiple scenario comparison

### 🧮 4. Strategy Optimization Framework (TOP PRIORITY)

**Housing Strategy Optimizer**
- Cash vs CPF OA usage calculator
- Early mortgage repayment vs investment analysis
- Accrued interest minimization strategies
- Property upgrade/downgrade scenario modeling

**Retirement Strategy Optimizer**
- Early SA top-up benefit calculator (20s-30s)
- Age 55 RA top-up recommendations (BRS/FRS/ERS)
- SA shielding timeline optimization
- CPF LIFE vs alternative retirement income comparison

**Tax Optimization Engine**
- RSTU tax relief calculator ($8k personal + $8k parent)
- VC3A optimization up to annual limits
- MA top-up tax benefit analysis
- Life insurance premium deduction planning

**Investment Strategy Optimizer**
- CPFIS vs external investment comparison
- Asset allocation optimization across accounts
- Risk-adjusted return projections
- Rebalancing recommendations

**Scenario Comparison Tool**
- A/B/C strategy comparison dashboard
- Impact analysis for each optimization
- Cost-benefit analysis with projections
- Personalized recommendation engine

### 📊 5. Reporting & Visualization Features

**Interactive Dashboards**
- Real-time CPF portfolio overview
- Goal progress tracking with visual indicators
- Cashflow timeline with interactive projections
- Strategy comparison charts

**Professional Reports**
- Comprehensive CPF analysis reports
- Goal-specific recommendation summaries
- Tax optimization opportunity reports
- Annual CPF health check reports

**Client Communication Tools**
- Shareable projection reports
- What-if scenario presentations
- Educational content integration
- Action item tracking and reminders

**Analytics & Insights**
- Performance benchmarking
- Goal achievement probability scoring
- Risk assessment dashboards
- Market impact analysis on CPF strategies

## MVP Implementation Plan

### 📈 MVP Feature 1: CPF Cashflow Simulation

**Core Input Interface**
- Basic profile form: age, monthly income, current CPF balances (OA/SA/MA)
- Property info: purchase price, loan amount, tenure (if applicable)
- Simple goal: target retirement age

**Essential Calculations**
- Monthly contribution projections (employer + employee)
- Interest compounding (2.5% OA, 4% SA/MA + extra 1%)
- Property accrued interest calculation
- Basic SA→RA transfer at age 55

**MVP Output**
- Simple projection table (5-year intervals until retirement)
- Key milestone alerts: "BRS achieved at age X", "Property fully paid at age Y"
- Single chart showing balance growth over time

### 🧮 MVP Feature 2: Strategy Optimization

**3 Key Strategies Only**

**A) Property Payment Strategy**
- Compare: "Pay mortgage with cash" vs "Use more CPF OA"
- Show accrued interest impact and OA replenishment timeline
- Simple recommendation: "Save $X in interest by using more cash"

**B) Retirement Top-up Strategy**
- Compare: Current path vs "Top up SA by $X annually"
- Show difference in RA at age 55 and retirement income
- Tax benefit calculation for RSTU contributions

**C) Basic vs Enhanced Retirement**
- Compare: BRS vs FRS impact on CPF LIFE payouts
- Show monthly income difference at age 65
- Required top-up amounts to achieve each level

**MVP Interface**
- "Strategy Cards" - 3 cards showing current vs optimized scenarios
- Simple toggle switches: "Apply this strategy? Yes/No"
- Combined impact summary: "Total additional retirement income: $X/month"

### 🔄 MVP User Flow

**Step 1: Quick Setup (2 minutes)**
- "Let's build your CPF plan" onboarding
- Essential inputs: age, income, CPF balances, property details
- "Skip for now" options for non-essential fields

**Step 2: Your Current Trajectory**
- Show baseline projection without any optimization
- Key insight: "At your current pace, you'll reach BRS at age X"
- "But we found 3 ways to improve this..."

**Step 3: Strategy Recommendations**
- Present 3 strategy cards side-by-side
- Each card shows: current vs optimized outcome
- Toggle to "accept" each strategy

**Step 4: Your Optimized Plan**
- Combined projection showing impact of selected strategies
- Simple action items: "Top up SA by $500/month starting next year"
- "Download your plan" as PDF summary

### ⚡ Technical MVP Priorities

**Phase 1: Core Engine**
- CPF calculation library (contribution rates, interest, transfers)
- Basic projection algorithm (10-20 year timeline)
- Property accrued interest calculator

**Phase 2: Strategy Logic**
- 3 strategy comparison algorithms
- Tax benefit calculators
- Simple recommendation engine

**Phase 3: User Interface**
- Input form with validation
- Projection visualization (simple line chart)
- Strategy cards with toggle functionality
- PDF report generation

### Success Metrics
- User completes full flow in <5 minutes
- Generates actionable recommendation
- Shows clear financial impact ($X savings or $Y additional retirement income)

## Implementation Notes

The MVP focuses on delivering immediate value with the simplest possible implementation while proving the core concept works. The two priority features (Cashflow Simulation and Strategy Optimization) provide the analytical power and strategic insights that justify the platform's value proposition.

These features replicate the sophisticated analysis that professional financial planners provide, making complex CPF optimization accessible through the platform.