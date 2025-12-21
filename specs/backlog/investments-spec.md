# Investment Tracking & Scenario Analysis Specification

## 🎯 KEY INSIGHT: Focus on Wealth Strategy, Not Risk Metrics

**The real value is answering: "How should my investment strategy evolve to maximize wealth?"**

### Core Questions Users Actually Want Answered:
1. Should I buy growth stocks (QQQ, TQQQ) or dividend stocks (SCHD, VYM) at my age?
2. How will different market scenarios affect my actual wealth accumulation?
3. When should I transition from growth to income focus?
4. How much monthly cashflow will I have at different life stages?
5. What happens to my income during a recession?

### Wealth Strategy Evolution Framework:
- **Growth Phase (20s-30s):** Max growth stocks, minimal dividends
- **Transition Phase (40s):** Building some income streams while still growing
- **Income Phase (50s+):** Higher dividend yield for reliable cashflow

### Key Features That Matter:
1. **Age-Based Strategy Recommendations**
2. **Growth vs Income Portfolio Transitions**
3. **Real Monthly Income Projections**
4. **Recession Impact on Both Wealth AND Income**
5. **FIRE Number Calculations**
6. **Specific ETF/Stock Recommendations**

### Avoid Generic Risk Metrics:
- Don't focus on abstract "Sharpe ratios" or "volatility"
- Focus on real-world impact: "Your income drops to $8.5K/mo during recession"
- Show specific allocations: "50% QQQ/TQQQ, 25% SCHD/VYM"

---

# Investment Tracking & Scenario Analysis Specification

## Overview
The Investment module provides sophisticated scenario planning and portfolio analysis capabilities. It focuses on the 5 core principles that drive investment outcomes: asset allocation, time horizon, volatility management, probability analysis, and contribution optimization.

## Core Investment Planning Principles

### 1. Asset Allocation Drives Outcomes (NOT Stock Picks)
- Primary lever for changing scenarios is asset allocation percentages
- Focus on: % equities, % bonds, % cash, % alternatives
- Asset allocation determines: return expectations, volatility, drawdowns, probability of success

### 2. Time Horizon Determines Risk Capacity
- <2 years → mostly cash/short-term bonds
- 2-7 years → balanced allocation
- 7-20 years → growth-oriented
- 20+ years → aggressive equity allocation

### 3. Volatility/Drawdowns Show Journey Pain
- Must calculate and display potential portfolio drawdowns
- Show recovery timeframes for different scenarios
- Emotional survivability assessment

### 4. Probability of Success > Single-Point Estimates
- Monte Carlo simulations for multiple outcome scenarios
- Display: pessimistic (10th percentile), median (50th), optimistic (90th percentile)
- Goal achievement probability calculations

### 5. Contribution Rate Often Trumps Returns
- Monthly savings amount impact analysis
- Contribution timing and consistency effects
- Income growth and contribution scaling scenarios

## Feature Specifications

### 📊 1. Scenario Planning Engine (Core Feature)

**Input Parameters:**
- Risk Level Slider (1-5 scale)
  - 1: Conservative (20% equity, 70% bonds, 10% cash)
  - 3: Balanced (60% equity, 35% bonds, 5% cash)
  - 5: Aggressive (90% equity, 8% bonds, 2% cash)
- Time Horizon Selector: 5y/10y/15y/20y/Custom
- Monthly Contribution Amount
- Initial Investment Amount
- Goal Target (optional)

**Calculation Engine:**
- Monte Carlo simulation (1000+ iterations)
- Historical return data integration
- Volatility modeling based on asset allocation
- Drawdown and recovery analysis
- Inflation adjustment capabilities

**Output Visualizations:**
- Projection Cone Chart (P10/P50/P90 bands)
- Goal Achievement Probability Badge
- Success/Failure scenario breakdown

### 🎯 2. Risk Assessment Dashboard

**Risk Metrics Display:**
- Risk Rating: Low/Medium/High with visual indicators
- Expected Annual Return Range (e.g., 5.6%-7.2%)
- Volatility Range (typical annual swings)
- Worst-Case Drawdown Scenarios
- Recovery Time Estimates
- Sharpe Ratio and other risk-adjusted metrics

**Risk Visualization:**
- Value-at-Risk (VaR) charts
- Maximum drawdown timeline
- Correlation analysis between asset classes

### 💼 3. Asset Allocation Analysis

**Portfolio Composition:**
- Interactive pie chart with allocation percentages
- Asset class breakdown:
  - Equities (by geography: SG, US, Developed, Emerging)
  - Bonds (Government, Corporate, High-Yield)
  - Cash & Cash Equivalents
  - REITs
  - Alternatives (Commodities, Crypto - optional)
  - CPF/SRS allocation integration

**Allocation Optimization:**
- Efficient Frontier analysis
- Diversification Score calculation
- Concentration risk warnings
- Rebalancing recommendations

### 📈 4. Performance Tracking & Attribution

**Performance Metrics:**
- Time-weighted returns (1Y, 3Y, 5Y, Since Inception)
- Dollar-weighted returns (IRR)
- Benchmark comparison (STI, Global indices)
- Sector/Geography attribution
- Asset class contribution analysis

**Performance Visualization:**
- Interactive performance charts
- Benchmark overlay comparisons
- Rolling return analysis
- Drawdown recovery charts

### 🔄 5. Scenario Comparison Tool

**Multiple Scenario Analysis:**
- Side-by-side comparison of up to 3 scenarios
- What-if analysis for different allocations
- Sensitivity analysis for key variables
- Goal achievement probability comparison

**Dynamic Scenario Modeling:**
- Real-time updates as parameters change
- Economic scenario stress testing
- Black swan event modeling
- Inflation scenario analysis

### 💡 6. Investment Insights & Recommendations

**AI-Powered Recommendations:**
- Allocation optimization suggestions
- Contribution amount recommendations
- Rebalancing alerts and timing
- Tax-loss harvesting opportunities
- Dollar-cost averaging vs lump-sum analysis

**Educational Insights:**
- Risk-return trade-off explanations
- Market timing vs time-in-market analysis
- Cost impact analysis (fees, taxes)
- Behavioral coaching prompts

## Integration with Existing Modules

### CPF Integration
- CPFIS investment scenario modeling
- CPF vs external investment comparisons
- OA investment allocation optimization
- SA shielding strategy impact on investments

### Goal-Based Planning
- Specific goal scenario planning (property, education, retirement)
- Goal priority and timeline optimization
- Multiple goal funding strategies
- Trade-off analysis between competing goals

## Technical Implementation

### 📊 MVP Phase 1: Basic Scenario Planning

**Core Features:**
- Simple risk slider (3 preset allocations)
- Basic time horizon selector (5Y, 10Y, 20Y)
- Monthly contribution input
- Simple projection chart with P10/P50/P90 bands
- Goal achievement probability

**Simplified Calculations:**
- Static return assumptions by asset class
- Basic volatility modeling
- Simple Monte Carlo (500 iterations)
- Linear goal target comparison

**UI Components:**
- Risk level selector cards
- Basic projection cone chart
- Success probability badge
- Simple asset allocation pie chart

### 📈 MVP Phase 2: Enhanced Analytics

**Additional Features:**
- Detailed risk metrics dashboard
- Historical performance comparison
- Multi-scenario comparison (up to 3)
- Basic recommendation engine

**Enhanced Calculations:**
- Historical data integration
- Correlation modeling
- Drawdown analysis
- Risk-adjusted returns

### 🚀 Phase 3: Advanced Features

**Professional Features:**
- Real-time market data integration
- Advanced optimization algorithms
- Tax-aware scenario planning
- Institutional-grade risk analytics
- API integrations with brokerages

## User Experience Design

### Scenario Planner Page Layout

**Section 1: Scenario Control Bar (120px height)**
- Risk Level Slider (1-5 discrete steps)
- Time Horizon Selector (segmented buttons)
- Monthly Contribution Input (with stepper)

**Section 2: Projection Cone Chart (400-450px height)**
- Main projection visualization
- Goal achievement probability badge
- Interactive timeline scrubbing

**Section 3: Risk Summary Card (180px height)**
- Risk rating and metrics
- Expected return range
- Volatility and drawdown estimates
- Recovery time projections

**Section 4: Asset Allocation Breakdown (260px height)**
- Interactive pie chart
- Allocation legend and metrics
- Diversification score
- Concentration warnings

**Section 5: Performance Summary (200px height)**
- Historical performance cards
- Benchmark comparisons
- Key performance metrics

**Section 6: Recommendation Banner**
- AI-generated insights
- Optimization suggestions
- Action items

### Design Specifications

**Typography:**
- Headers: Inter 24-32px semibold
- Section titles: 18-20px semibold
- Body text: 14-16px regular
- Labels: 12-14px medium

**Color Palette:**
- Primary Blue: #3A7AFE
- Success Green: #00A779
- Warning Yellow: #FFB800
- Danger Red: #E35656
- Light Gray Background: #F7F9FC

**Component Standards:**
- Border radius: 12-16px for all containers
- Shadow: 0px 2px 16px rgba(0,0,0,0.05)
- Grid: 12-column responsive (80px margins, 24px gutters)

## Data Requirements

### Market Data Sources
- Historical return data (10+ years minimum)
- Real-time price feeds (for advanced features)
- Volatility and correlation matrices
- Economic indicator integration

### User Data Integration
- Portfolio holdings import/sync
- Bank account integration (optional)
- Goal and preference storage
- Performance history tracking

## Success Metrics

### User Engagement
- Scenario planning session completion rate
- Time spent in analysis tools
- Return visits to update scenarios
- Goal achievement tracking adoption

### Business Value
- User portfolio value growth correlation
- Feature usage analytics
- Premium feature conversion rates
- User retention and engagement scores

## Implementation Priorities

### Phase 1 (MVP): Core Scenario Engine
1. Basic risk/return modeling
2. Simple projection visualization
3. Goal probability calculation
4. Asset allocation display

### Phase 2: Enhanced Analytics
1. Historical performance integration
2. Multi-scenario comparison
3. Risk metrics dashboard
4. Basic recommendations

### Phase 3: Advanced Features
1. Real-time data integration
2. Advanced optimization
3. Tax-aware planning
4. Professional-grade analytics

This specification provides a comprehensive framework for building investment scenario planning capabilities that focus on the core drivers of investment success while maintaining user-friendly interfaces for complex financial calculations.