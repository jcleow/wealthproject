# E2E Test Data Summary

## Overview
Sample financial data loaded by `useLoadSampleDataMutation` for a 32-year-old Singaporean software engineer planning major life milestones.

**Reference Year:** 2025
**Net Worth:** $251,200 ($260,000 assets - $8,800 liabilities)

---

## Assets (Total: $260,000)

| Name | Category | Value | Growth Rate | Notes |
|------|----------|-------|-------------|-------|
| DBS Multiplier Account | Bank Account | $25,000 | 2.5% | Main savings account with salary crediting |
| CPF Ordinary Account | Retirement | $85,000 | 2.5% | 10 years of contributions, can be used for housing |
| CPF Special Account | Retirement | $45,000 | 4.0% | Cannot touch until 55, higher interest rate |
| CPF Medisave | Retirement | $32,000 | 4.0% | Medical expenses and insurance premiums |
| Syfe Core Growth Portfolio | Investment | $35,000 | 6.0% | Global ETF robo-advisor, monthly DCA $500 |
| Singapore Savings Bonds | Investment | $20,000 | 3.0% | Safe haven, 10-year average yield |
| Emergency Fund | Bank Account | $18,000 | 2.0% | 6 months expenses in high-yield savings |

---

## Liabilities (Total: $8,800)

| Name | Category | Balance | Interest APR | Min Payment | Notes |
|------|----------|---------|--------------|-------------|-------|
| Study Loan (NUS) | Loan | $8,000 | 4.5% | $250 | Remaining balance from university, 3 years left |
| Credit Card | Credit Card | $800 | 26% | $50 | Paid in full monthly, revolving for cashback |

---

## Incomes (Monthly: $8,300 / Yearly: $115,000)

| Source | Category | Amount | Frequency | Growth Rate | Notes |
|--------|----------|--------|-----------|-------------|-------|
| Software Engineer Salary | Employment | $7,500 | monthly | 4.0% | Mid-senior role at tech company, 10 years experience |
| Annual Bonus | Employment | $15,000 | yearly | 3.0% | 2 months bonus, typically paid in March |
| Freelance Development | Freelance | $800 | monthly | 0% | Side projects and consulting, variable income |

**Annual Income Calculation:**
- Monthly: ($7,500 + $800) × 12 = $99,600
- Yearly Bonus: $15,000
- **Total: $114,600/year**

---

## Expenses (Monthly: $4,025 / Yearly: $52,300)

| Payee | Category | Amount | Frequency | Growth Rate | Notes |
|-------|----------|--------|-----------|-------------|-------|
| Parents Allowance | Family | $500 | monthly | 2.0% | Monthly contribution to parents |
| Rent (Room) | Housing | $1,200 | monthly | 3.0% | Master bedroom in shared HDB, Toa Payoh |
| Groceries & Hawker | Food | $600 | monthly | 3.0% | Mix of cooking and hawker center meals |
| Dining & Social | Food | $400 | monthly | 2.0% | Restaurants, dates, gatherings with friends |
| Public Transport | Transport | $120 | monthly | 2.0% | MRT and bus, monthly concession |
| Grab/Taxi | Transport | $100 | monthly | 3.0% | Late nights and rainy days |
| Mobile Plan | Bills | $45 | monthly | 0% | Circles.Life SIM-only plan |
| Subscriptions | Bills | $50 | monthly | 2.0% | Netflix, Spotify, iCloud |
| Term Life Insurance | Insurance | $150 | monthly | 0% | NTUC Income term life, $500k coverage |
| Health Insurance (IP) | Insurance | $80 | monthly | 5.0% | Integrated Shield Plan rider, paid from Medisave + cash |
| Gym Membership | Health | $100 | monthly | 2.0% | ActiveSG + occasional ClassPass |
| Personal Care | Personal | $80 | monthly | 2.0% | Haircut, toiletries, etc |
| Shopping & Entertainment | Personal | $200 | monthly | 2.0% | Clothes, gadgets, movies |
| Investment Contribution | Savings | $500 | monthly | 3.0% | Monthly DCA to Syfe portfolio |
| Annual Travel Fund | Travel | $4,000 | yearly | 3.0% | 1-2 overseas trips per year (Japan, Thailand, etc) |

**Annual Expense Calculation:**
- Monthly: $4,025 × 12 = $48,300
- Yearly: $4,000
- **Total: $52,300/year**

---

## Cashflow Summary

**Annual Cashflow:**
- Income: $114,600
- Expenses: $52,300
- **Net Annual Savings: $62,300**
- **Monthly Savings: ~$5,192**

---

## Growth Configurations

### Asset Growth Rates
- **Bank Accounts:** 2.0% - 2.5%
- **CPF Accounts:** 2.5% - 4.0%
- **Investments:** 3.0% - 6.0%

### Liability Interest Rates
- **Study Loan:** 4.5% APR
- **Credit Card:** 26% APR

### Income Growth Rates
- **Salary:** 4.0% annual
- **Bonus:** 3.0% annual
- **Freelance:** 0% (variable)

### Expense Growth Rates
- **Housing/Food:** 3.0% annual
- **General Living:** 2.0% annual
- **Insurance (Health):** 5.0% annual
- **Fixed Bills:** 0% (no inflation)

---

## Files Generated

1. **sample_data_assets.csv** - Assets data
2. **sample_data_liabilities.csv** - Liabilities data
3. **sample_data_incomes.csv** - Incomes data
4. **sample_data_expenses.csv** - Expenses data
5. **sample_data_growth_configs.csv** - Growth configurations
6. **sample_data_for_e2e_testing.html** - Excel-compatible HTML with all data

---

## E2E Testing Scenarios

### Scenario 1: Initial State Verification
- Verify total assets = $260,000
- Verify total liabilities = $8,800
- Verify net worth = $251,200
- Verify annual income = $114,600
- Verify annual expenses = $52,300

### Scenario 2: Growth Rate Application (Year 1)
Test that growth rates are correctly applied:

**Expected Asset Values (End of Year 1):**
- DBS Multiplier: $25,000 × 1.025 = $25,625
- CPF OA: $85,000 × 1.025 = $87,125
- CPF SA: $45,000 × 1.04 = $46,800
- CPF Medisave: $32,000 × 1.04 = $33,280
- Syfe Portfolio: $35,000 × 1.06 = $37,100
- SSB: $20,000 × 1.03 = $20,600
- Emergency Fund: $18,000 × 1.02 = $18,360
- **Total Assets: $268,890**

**Expected Income (Year 1):**
- Salary: $7,500 × 1.04 = $7,800/month
- Bonus: $15,000 × 1.03 = $15,450
- Freelance: $800 (no growth)
- **Total Income: $119,850**

**Expected Expenses (Year 1):**
Calculate each expense with its growth rate applied.

### Scenario 3: Multi-Year Projection
Test 5-year, 10-year, and 28-year projections with compound growth.

### Scenario 4: Scenario Events
Test that scenario events create proper impacts (Wedding, BTO, Car, etc.)

---

## Usage Instructions

1. **Load Sample Data:**
   ```typescript
   const { mutate: loadSampleData } = useLoadSampleDataMutation()
   loadSampleData()
   ```

2. **Verify Data in Database:**
   - Check assets table: 7 records
   - Check liabilities table: 2 records
   - Check incomes table: 3 records
   - Check expenses table: 15 records

3. **For Excel/Spreadsheet Testing:**
   - Open `sample_data_for_e2e_testing.html` in Excel
   - Or import CSV files into your preferred tool

4. **For Manual Calculation Verification:**
   - Use the growth rates from this document
   - Apply compound growth: `value × (1 + rate)^years`
   - Compare with timeline API results

---

## Key Test Assertions

```typescript
// Initial state
expect(totalAssets).toBe(260000)
expect(totalLiabilities).toBe(8800)
expect(netWorth).toBe(251200)

// Annual figures
expect(annualIncome).toBe(114600)
expect(annualExpenses).toBe(52300)
expect(annualSavings).toBe(62300)

// Growth rates exist
expect(assets.every(a => a.annualGrowthRate >= 0)).toBe(true)
expect(incomes.every(i => i.growthRate >= 0)).toBe(true)
expect(expenses.every(e => e.growthRate >= 0)).toBe(true)
```

---

Generated on: 2025-12-05
Data Source: `/frontend/src/hooks/queries/useLoadSampleDataMutation.ts`
