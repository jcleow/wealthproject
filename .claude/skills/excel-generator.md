# Excel Generator Skill

Generate Excel files (.xlsx) with formulas using Python and openpyxl.

## Setup

The project has a virtual environment at `specs/.venv` with openpyxl installed.

## How to Generate Excel Files

1. Create a Python script that uses openpyxl
2. Run it using the virtual environment:

```bash
cd /Users/jitcorn/assetra3/specs && source .venv/bin/activate && python3 <script_name>.py
```

## Example: Pricing Analysis Excel

The script `specs/generate_pricing_excel.py` creates `specs/pricing-analysis.xlsx` with:

- **Assumptions sheet**: All configurable inputs (pricing, costs, conversion rates, market sizes)
- **Yearly Projection sheet**: Year 1-5 revenue, costs, profit linked to assumptions
- **Seasonality sheet**: Monthly breakdown with traffic multipliers
- **Scenarios sheet**: Conservative/Base/Optimistic analysis
- **Referral sheet**: Referral program economics

### Key Patterns for Formula-Based Excel

```python
import openpyxl
from openpyxl.styles import Font

wb = openpyxl.Workbook()
ws = wb.active

# Reference other cells with formulas
ws["A1"] = 100  # Input value
ws["B1"] = "=A1*2"  # Formula referencing A1

# Reference other sheets
ws["C1"] = "=Assumptions!$B$4"  # Cross-sheet reference

# Use $ for absolute references when copying formulas
ws["D1"] = "=$A$1*B1"  # A1 is fixed, B1 is relative

# Number formatting
ws["E1"].number_format = '"$"#,##0'  # Currency
ws["F1"].number_format = '0%'  # Percentage
ws["G1"].number_format = '#,##0'  # Number with commas

wb.save("output.xlsx")
```

## Best Practices

1. **Avoid hardcoding** - Put all inputs in an Assumptions sheet
2. **Use named ranges** - Makes formulas more readable
3. **Use absolute references ($)** - For values that shouldn't change when copying
4. **Format numbers** - Currency, percentage, number formats for clarity
5. **Add headers with styling** - Bold fonts, colors for readability

## Running the Pricing Generator

```bash
cd /Users/jitcorn/assetra3/specs && source .venv/bin/activate && python3 generate_pricing_excel.py
```

Output: `specs/pricing-analysis.xlsx`
