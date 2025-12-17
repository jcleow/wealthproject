# Sample Data for E2E Testing

This directory contains sample financial data extracted from `useLoadSampleDataMutation` for E2E testing purposes.

## 📁 Generated Files

### Excel/Spreadsheet Files
1. **sample_data_for_e2e_testing.tsv** (RECOMMENDED)
   - Tab-separated values file
   - Can be opened directly in Excel, Google Sheets, or Numbers
   - Contains all data in a single file with clear sections
   - Best for quick reference and manual testing

2. **sample_data_for_e2e_testing.html**
   - HTML file with styled tables
   - Can be opened in Excel or Google Sheets
   - Best for viewing in browser with formatting

### Individual CSV Files
3. **sample_data_assets.csv** - 7 assets totaling $260,000
4. **sample_data_liabilities.csv** - 2 liabilities totaling $8,800
5. **sample_data_incomes.csv** - 3 income sources
6. **sample_data_expenses.csv** - 15 expense items
7. **sample_data_growth_configs.csv** - All growth/interest rates

### Documentation
8. **E2E_TEST_DATA_SUMMARY.md**
   - Comprehensive documentation
   - Includes test scenarios and assertions
   - Growth rate calculations
   - Expected values for verification

## 🎯 Quick Start

### For Excel/Spreadsheet Users
```bash
# Option 1: Open TSV file (RECOMMENDED)
open sample_data_for_e2e_testing.tsv

# Option 2: Open HTML file
open sample_data_for_e2e_testing.html
```

### For Automated Testing
```typescript
// Load sample data via mutation
const { mutate: loadSampleData } = useLoadSampleDataMutation()
loadSampleData()

// Verify against expected values
expect(totalAssets).toBe(260000)
expect(totalLiabilities).toBe(8800)
expect(netWorth).toBe(251200)
```

## 📊 Data Summary

**Profile:** 32-year-old Singaporean software engineer
**Current Year:** 2025

| Category | Count | Total Amount |
|----------|-------|--------------|
| Assets | 7 items | $260,000 |
| Liabilities | 2 items | $8,800 |
| Incomes | 3 sources | $114,600/year |
| Expenses | 15 items | $52,300/year |
| **Net Worth** | - | **$251,200** |
| **Annual Savings** | - | **$62,300** |

## 🔍 Data Breakdown

### Assets by Category
- **Bank Accounts:** $43,000 (DBS Multiplier + Emergency Fund)
- **CPF Accounts:** $162,000 (OA + SA + Medisave)
- **Investments:** $55,000 (Syfe + SSB)

### Growth Rates
- Bank accounts: 2.0% - 2.5%
- CPF accounts: 2.5% - 4.0%
- Investments: 3.0% - 6.0%
- Income: 0% - 4.0%
- Expenses: 0% - 5.0%

### Monthly Cashflow
- **Income:** $8,300/month + $15,000 annual bonus
- **Expenses:** $4,025/month + $4,000 annual travel
- **Net Savings:** ~$5,192/month

## 🧪 E2E Test Scenarios

### 1. Initial State Verification
Test that data loads correctly:
```typescript
const assets = await financialApi.listAssets()
expect(assets).toHaveLength(7)
expect(assets.reduce((sum, a) => sum + a.currentValue, 0)).toBe(260000)
```

### 2. Growth Rate Application
Test Year 1 growth:
```typescript
// DBS Multiplier: $25,000 × 1.025 = $25,625
// CPF OA: $85,000 × 1.025 = $87,125
// Total Expected: $268,890
```

### 3. Timeline Projection
Test 5-year, 10-year, 28-year projections with compound growth.

### 4. Cashflow Calculation
```typescript
const timeline = await financialApi.getTimeline({ startYear: 2025, endYear: 2025 })
expect(timeline[0].totalIncome).toBe(114600)
expect(timeline[0].totalExpenses).toBe(52300)
expect(timeline[0].netSavings).toBe(62300)
```

## 📝 Notes

- All amounts in SGD
- Growth rates are annual percentages
- Start year is 2025 for all items
- No end dates (ongoing items)
- Scenario events are defined but create additional items dynamically

## 🔧 Regenerating Files

To regenerate all files:
```bash
# Generate CSV files
python3 generate_sample_data_csv.py

# Generate HTML file
node generate_excel.js
```

## 📖 Related Files

- Source: `/frontend/src/hooks/queries/useLoadSampleDataMutation.ts`
- API: `/frontend/src/services/financialApi.ts`
- Types: `/frontend/src/types/financial.ts`

## 💡 Tips for Testing

1. **Use TSV file** for quick reference in Excel
2. **Use CSV files** for programmatic imports
3. **Use E2E_TEST_DATA_SUMMARY.md** for detailed calculations
4. **Compare API results** against the expected values
5. **Test growth calculations** using the growth rates provided

## 🎯 Key Test Assertions

```typescript
// Initial totals
expect(totalAssets).toBe(260000)
expect(totalLiabilities).toBe(8800)
expect(netWorth).toBe(251200)

// Annual figures
expect(annualIncome).toBe(114600)
expect(annualExpenses).toBe(52300)
expect(annualSavings).toBe(62300)

// Item counts
expect(assets).toHaveLength(7)
expect(liabilities).toHaveLength(2)
expect(incomes).toHaveLength(3)
expect(expenses).toHaveLength(15)

// Growth rates validation
expect(assets.every(a => a.annualGrowthRate >= 0)).toBe(true)
```

---

Generated: 2025-12-05
For questions or issues, refer to `E2E_TEST_DATA_SUMMARY.md`
