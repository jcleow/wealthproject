#!/usr/bin/env python3
"""Generate pricing analysis Excel file with formulas."""

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

def create_pricing_excel():
    wb = openpyxl.Workbook()

    # Styles
    header_font = Font(bold=True, size=12)
    title_font = Font(bold=True, size=14)
    currency_format = '"$"#,##0'
    percent_format = '0%'
    number_format = '#,##0'

    # ========== SHEET 1: Assumptions ==========
    ws = wb.active
    ws.title = "Assumptions"

    row = 1
    ws[f"A{row}"] = "PRICING ASSUMPTIONS"
    ws[f"A{row}"].font = title_font

    row = 3
    for col, header in enumerate(["Tier", "Price", "Unit"], 1):
        ws.cell(row=row, column=col, value=header).font = header_font

    row = 4
    ws[f"A{row}"] = "Day Pass"
    ws[f"B{row}"] = 2
    ws[f"C{row}"] = "per day"

    row = 5
    ws[f"A{row}"] = "Monthly Subscription"
    ws[f"B{row}"] = 20
    ws[f"C{row}"] = "per month"

    row = 6
    ws[f"A{row}"] = "Annual Subscription"
    ws[f"B{row}"] = 120
    ws[f"C{row}"] = "per year"

    # LLM Cost assumptions
    row = 8
    ws[f"A{row}"] = "LLM & INFRASTRUCTURE COSTS"
    ws[f"A{row}"].font = title_font

    row = 10
    for col, header in enumerate(["Item", "Value", "Unit"], 1):
        ws.cell(row=row, column=col, value=header).font = header_font

    row = 11
    ws[f"A{row}"] = "LLM Cost per Chat"
    ws[f"B{row}"] = 0.003
    ws[f"C{row}"] = "USD"

    row = 12
    ws[f"A{row}"] = "Avg Chats per Day Pass"
    ws[f"B{row}"] = 20
    ws[f"C{row}"] = "chats"

    row = 13
    ws[f"A{row}"] = "Avg Chats per Subscriber/Month"
    ws[f"B{row}"] = 60
    ws[f"C{row}"] = "chats"

    row = 14
    ws[f"A{row}"] = "Infrastructure Cost/Month (Base)"
    ws[f"B{row}"] = 500
    ws[f"C{row}"] = "USD"

    row = 15
    ws[f"A{row}"] = "Infrastructure Cost per 10k Users"
    ws[f"B{row}"] = 200
    ws[f"C{row}"] = "USD"

    row = 16
    ws[f"A{row}"] = "Payment Processing Fee"
    ws[f"B{row}"] = 0.03
    ws[f"C{row}"] = "% of revenue"
    ws[f"B{row}"].number_format = percent_format

    # Human/Operational costs
    row = 18
    ws[f"A{row}"] = "HUMAN & OPERATIONAL COSTS"
    ws[f"A{row}"].font = title_font

    row = 20
    for col, header in enumerate(["Role", "Monthly Cost (USD)", "Needed From (Users)", "Notes"], 1):
        ws.cell(row=row, column=col, value=header).font = header_font

    human_costs = [
        ("Customer Support (Part-time)", 1500, 5000, "Handle tickets, basic queries"),
        ("Customer Support (Full-time)", 4000, 20000, "Dedicated support staff"),
        ("Content/Marketing (Part-time)", 2000, 10000, "SEO, blog posts, social"),
        ("Content/Marketing (Full-time)", 5000, 30000, "Full marketing ops"),
        ("Developer (Part-time/Contract)", 3000, 10000, "Bug fixes, small features"),
        ("Developer (Full-time)", 8000, 40000, "Full-time dev work"),
        ("Accounting/Admin (Part-time)", 500, 5000, "Invoices, bookkeeping"),
        ("Legal/Compliance (Retainer)", 500, 20000, "TOS, privacy, disputes"),
    ]

    for i, (role, cost, users, notes) in enumerate(human_costs):
        r = 21 + i
        ws[f"A{r}"] = role
        ws[f"B{r}"] = cost
        ws[f"C{r}"] = users
        ws[f"D{r}"] = notes
        ws[f"B{r}"].number_format = currency_format
        ws[f"C{r}"].number_format = number_format

    # Conversion assumptions
    row = 31
    ws[f"A{row}"] = "CONVERSION ASSUMPTIONS"
    ws[f"A{row}"].font = title_font

    row = 33
    for col, header in enumerate(["Metric", "Value"], 1):
        ws.cell(row=row, column=col, value=header).font = header_font

    row = 34
    ws[f"A{row}"] = "Monthly Sub Conversion %"
    ws[f"B{row}"] = 0.015
    ws[f"B{row}"].number_format = percent_format

    row = 35
    ws[f"A{row}"] = "Annual Sub Conversion %"
    ws[f"B{row}"] = 0.035
    ws[f"B{row}"].number_format = percent_format

    row = 36
    ws[f"A{row}"] = "Day Pass Purchase % (of users/month)"
    ws[f"B{row}"] = 0.10
    ws[f"B{row}"].number_format = percent_format

    # Market size assumptions
    row = 38
    ws[f"A{row}"] = "MARKET SIZE (SINGAPORE)"
    ws[f"A{row}"].font = title_font

    row = 40
    for col, header in enumerate(["Segment", "Annual Volume", "Capture Rate", "Captured Users"], 1):
        ws.cell(row=row, column=col, value=header).font = header_font

    markets = [
        ("Car Buyers", 200000, 0.25),
        ("Insurance Buyers", 1000000, 0.05),
        ("BTO Applicants", 100000, 0.15),
        ("General Seasonal", 500000, 0.10),
    ]

    for i, (segment, volume, rate) in enumerate(markets):
        r = 41 + i
        ws[f"A{r}"] = segment
        ws[f"B{r}"] = volume
        ws[f"C{r}"] = rate
        ws[f"D{r}"] = f"=B{r}*C{r}"
        ws[f"B{r}"].number_format = number_format
        ws[f"C{r}"].number_format = percent_format
        ws[f"D{r}"].number_format = number_format

    row = 45
    ws[f"A{row}"] = "TOTAL DAY PASS USERS"
    ws[f"A{row}"].font = header_font
    ws[f"B{row}"] = "=SUM(B41:B44)"
    ws[f"D{row}"] = "=SUM(D41:D44)"
    ws[f"B{row}"].number_format = number_format
    ws[f"D{row}"].number_format = number_format

    # Column widths
    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 30

    # ========== SHEET 2: Year by Year Projection ==========
    ws = wb.create_sheet("Yearly Projection")

    ws["A1"] = "YEAR BY YEAR PROJECTION"
    ws["A1"].font = title_font

    # Headers
    headers = ["Metric", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=3, column=col, value=header).font = header_font

    # Growth multipliers
    ws["A4"] = "Market Penetration %"
    penetration = [0.05, 0.15, 0.35, 0.65, 1.0]
    for col, pct in enumerate(penetration, 2):
        ws.cell(row=4, column=col, value=pct).number_format = percent_format

    # Registered User Base
    ws["A5"] = "Registered User Base"
    user_base = [2000, 8000, 20000, 40000, 60000]
    for col, users in enumerate(user_base, 2):
        ws.cell(row=5, column=col, value=users).number_format = number_format

    # Day Pass Users
    ws["A7"] = "DAY PASS USERS"
    ws["A7"].font = header_font

    segments = ["Car Buyers", "Insurance Buyers", "BTO Applicants", "General Seasonal"]
    for i, segment in enumerate(segments):
        r = 8 + i
        ws[f"A{r}"] = segment
        for col in range(2, 7):
            col_letter = get_column_letter(col)
            ws.cell(row=r, column=col, value=f"=Assumptions!$D${41+i}*{col_letter}$4")
            ws.cell(row=r, column=col).number_format = number_format

    ws["A12"] = "Total Day Pass Users"
    ws["A12"].font = header_font
    for col in range(2, 7):
        col_letter = get_column_letter(col)
        ws.cell(row=12, column=col, value=f"=SUM({col_letter}8:{col_letter}11)")
        ws.cell(row=12, column=col).number_format = number_format

    # Subscribers
    ws["A14"] = "SUBSCRIBERS"
    ws["A14"].font = header_font

    ws["A15"] = "Monthly Subscribers"
    ws["A16"] = "Annual Subscribers"
    ws["A17"] = "Total Subscribers"
    for col in range(2, 7):
        col_letter = get_column_letter(col)
        ws.cell(row=15, column=col, value=f"={col_letter}5*Assumptions!$B$34")
        ws.cell(row=16, column=col, value=f"={col_letter}5*Assumptions!$B$35")
        ws.cell(row=17, column=col, value=f"={col_letter}15+{col_letter}16")
        for r in [15, 16, 17]:
            ws.cell(row=r, column=col).number_format = number_format
    ws["A17"].font = header_font

    # Revenue
    ws["A19"] = "REVENUE"
    ws["A19"].font = header_font

    ws["A20"] = "Day Pass Revenue"
    ws["A21"] = "Monthly Sub Revenue"
    ws["A22"] = "Annual Sub Revenue"
    ws["A23"] = "TOTAL REVENUE"
    ws["A23"].font = header_font

    for col in range(2, 7):
        col_letter = get_column_letter(col)
        ws.cell(row=20, column=col, value=f"={col_letter}12*Assumptions!$B$4")
        ws.cell(row=21, column=col, value=f"={col_letter}15*Assumptions!$B$5*12")
        ws.cell(row=22, column=col, value=f"={col_letter}16*Assumptions!$B$6")
        ws.cell(row=23, column=col, value=f"=SUM({col_letter}20:{col_letter}22)")
        for r in [20, 21, 22, 23]:
            ws.cell(row=r, column=col).number_format = currency_format

    # Costs
    ws["A25"] = "COSTS"
    ws["A25"].font = header_font

    ws["A26"] = "LLM Cost (Day Pass)"
    ws["A27"] = "LLM Cost (Subscribers)"
    ws["A28"] = "Infrastructure Cost"
    ws["A29"] = "Payment Processing (3%)"
    ws["A30"] = "Support (Part-time)"
    ws["A31"] = "Marketing (Part-time)"
    ws["A32"] = "Developer (Part-time)"
    ws["A33"] = "Admin/Accounting"
    ws["A34"] = "TOTAL COSTS"
    ws["A34"].font = header_font

    for col in range(2, 7):
        col_letter = get_column_letter(col)
        # LLM costs
        ws.cell(row=26, column=col, value=f"={col_letter}12*Assumptions!$B$12*Assumptions!$B$11")
        ws.cell(row=27, column=col, value=f"={col_letter}17*Assumptions!$B$13*12*Assumptions!$B$11")
        # Infrastructure
        ws.cell(row=28, column=col, value=f"=(Assumptions!$B$14*12)+({col_letter}5/10000*Assumptions!$B$15*12)")
        # Payment processing
        ws.cell(row=29, column=col, value=f"={col_letter}23*Assumptions!$B$16")
        # Human costs (scale with user base thresholds)
        ws.cell(row=30, column=col, value=f"=IF({col_letter}5>=Assumptions!$C$21,Assumptions!$B$21*12,IF({col_letter}5>=Assumptions!$C$21,Assumptions!$B$21*12,0))")
        ws.cell(row=31, column=col, value=f"=IF({col_letter}5>=Assumptions!$C$22,Assumptions!$B$22*12,0)")
        ws.cell(row=32, column=col, value=f"=IF({col_letter}5>=Assumptions!$C$24,Assumptions!$B$24*12,0)")
        ws.cell(row=33, column=col, value=f"=IF({col_letter}5>=Assumptions!$C$27,Assumptions!$B$27*12,0)")
        # Total
        ws.cell(row=34, column=col, value=f"=SUM({col_letter}26:{col_letter}33)")
        for r in range(26, 35):
            ws.cell(row=r, column=col).number_format = currency_format

    # Profit
    ws["A36"] = "NET PROFIT"
    ws["A36"].font = Font(bold=True, size=14)
    ws["A37"] = "Profit Margin %"

    for col in range(2, 7):
        col_letter = get_column_letter(col)
        ws.cell(row=36, column=col, value=f"={col_letter}23-{col_letter}34")
        ws.cell(row=36, column=col).number_format = currency_format
        ws.cell(row=36, column=col).font = header_font
        ws.cell(row=37, column=col, value=f"=IF({col_letter}23>0,{col_letter}36/{col_letter}23,0)")
        ws.cell(row=37, column=col).number_format = percent_format

    # Column widths
    ws.column_dimensions["A"].width = 25
    for col in ["B", "C", "D", "E", "F"]:
        ws.column_dimensions[col].width = 15

    # ========== SHEET 3: Human Scaling ==========
    ws = wb.create_sheet("Human Scaling")

    ws["A1"] = "HUMAN COST SCALING BY USER BASE"
    ws["A1"].font = title_font

    ws["A3"] = "This sheet shows when you need to hire based on user thresholds"

    headers = ["Users", "Support", "Marketing", "Dev", "Admin", "Legal", "Total Human Cost/Year"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=5, column=col, value=header).font = header_font

    user_thresholds = [1000, 5000, 10000, 20000, 40000, 60000]

    for i, users in enumerate(user_thresholds):
        r = 6 + i
        ws[f"A{r}"] = users
        ws[f"A{r}"].number_format = number_format
        # Support
        ws[f"B{r}"] = f"=IF(A{r}>=Assumptions!$C$21,Assumptions!$B$21,IF(A{r}>=Assumptions!$C$21,Assumptions!$B$21,0))*12"
        # Marketing
        ws[f"C{r}"] = f"=IF(A{r}>=Assumptions!$C$22,Assumptions!$B$22,0)*12"
        # Dev
        ws[f"D{r}"] = f"=IF(A{r}>=Assumptions!$C$24,Assumptions!$B$24,0)*12"
        # Admin
        ws[f"E{r}"] = f"=IF(A{r}>=Assumptions!$C$27,Assumptions!$B$27,0)*12"
        # Legal
        ws[f"F{r}"] = f"=IF(A{r}>=Assumptions!$C$28,Assumptions!$B$28,0)*12"
        # Total
        ws[f"G{r}"] = f"=SUM(B{r}:F{r})"
        for col in ["B", "C", "D", "E", "F", "G"]:
            ws[f"{col}{r}"].number_format = currency_format

    ws.column_dimensions["A"].width = 12
    for col in ["B", "C", "D", "E", "F", "G"]:
        ws.column_dimensions[col].width = 18

    # ========== SHEET 4: Seasonality ==========
    ws = wb.create_sheet("Seasonality")

    ws["A1"] = "MONTHLY SEASONALITY (MATURE YEAR)"
    ws["A1"].font = title_font

    headers = ["Month", "Events", "Traffic Multiplier", "Day Passes", "Revenue"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=3, column=col, value=header).font = header_font

    months = [
        ("Jan", "New Year + 2x COE", 1.15),
        ("Feb", "CNY + BTO + 2x COE", 1.25),
        ("Mar", "Tax Season + Condos + 2x COE", 1.15),
        ("Apr", "Tax Deadline + Condos + 2x COE", 1.05),
        ("May", "BTO + 2x COE", 1.05),
        ("Jun", "Mid-Year + 2x COE", 0.85),
        ("Jul", "School Hols + 2x COE", 0.75),
        ("Aug", "BTO + 2x COE", 1.05),
        ("Sep", "Condos + 2x COE", 0.85),
        ("Oct", "Condos + 2x COE", 0.85),
        ("Nov", "BTO + Bonus + 2x COE", 1.15),
        ("Dec", "Year-End + Bonus + 2x COE", 1.15),
    ]

    ws["G3"] = "Base Monthly (Yr 5)"
    ws["G3"].font = header_font
    ws["G4"] = "='Yearly Projection'!F12/12"
    ws["G4"].number_format = number_format

    for i, (month, events, multiplier) in enumerate(months):
        r = 4 + i
        ws[f"A{r}"] = month
        ws[f"B{r}"] = events
        ws[f"C{r}"] = multiplier
        ws[f"C{r}"].number_format = "0.00"
        ws[f"D{r}"] = f"=$G$4*C{r}"
        ws[f"D{r}"].number_format = number_format
        ws[f"E{r}"] = f"=D{r}*Assumptions!$B$4"
        ws[f"E{r}"].number_format = currency_format

    ws["A16"] = "TOTAL"
    ws["A16"].font = header_font
    ws["D16"] = "=SUM(D4:D15)"
    ws["D16"].number_format = number_format
    ws["E16"] = "=SUM(E4:E15)"
    ws["E16"].number_format = currency_format

    ws.column_dimensions["A"].width = 10
    ws.column_dimensions["B"].width = 35
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["D"].width = 15
    ws.column_dimensions["E"].width = 15
    ws.column_dimensions["G"].width = 18

    # ========== SHEET 5: Scenarios ==========
    ws = wb.create_sheet("Scenarios")

    ws["A1"] = "SCENARIO ANALYSIS (YEAR 5 MATURE)"
    ws["A1"].font = title_font

    headers = ["Scenario", "Market Capture", "Subscriber %", "Day Passes", "Subscribers", "Revenue", "Costs", "Profit"]
    for col, header in enumerate(headers, 1):
        ws.cell(row=3, column=col, value=header).font = header_font

    scenarios = [
        ("Conservative", 0.5, 0.03),
        ("Base Case", 1.0, 0.05),
        ("Optimistic", 1.5, 0.08),
    ]

    infra_costs = [10000, 15000, 20000]

    for i, (name, capture, sub_pct) in enumerate(scenarios):
        r = 4 + i
        ws[f"A{r}"] = name
        ws[f"B{r}"] = capture
        ws[f"C{r}"] = sub_pct
        ws[f"D{r}"] = f"=Assumptions!$D$45*B{r}"
        ws[f"E{r}"] = f"='Yearly Projection'!$F$5*C{r}"
        ws[f"F{r}"] = f"=(D{r}*Assumptions!$B$4)+(E{r}*0.3*Assumptions!$B$5*12)+(E{r}*0.7*Assumptions!$B$6)"
        ws[f"G{r}"] = f"=(D{r}*Assumptions!$B$12*Assumptions!$B$11)+(E{r}*Assumptions!$B$13*12*Assumptions!$B$11)+{infra_costs[i]}+(F{r}*Assumptions!$B$16)"
        ws[f"H{r}"] = f"=F{r}-G{r}"

        ws[f"B{r}"].number_format = percent_format
        ws[f"C{r}"].number_format = percent_format
        ws[f"D{r}"].number_format = number_format
        ws[f"E{r}"].number_format = number_format
        ws[f"F{r}"].number_format = currency_format
        ws[f"G{r}"].number_format = currency_format
        ws[f"H{r}"].number_format = currency_format

    ws.column_dimensions["A"].width = 15
    for col in ["B", "C", "D", "E", "F", "G", "H"]:
        ws.column_dimensions[col].width = 15

    # ========== SHEET 6: Referral ==========
    ws = wb.create_sheet("Referral")

    ws["A1"] = "REFERRAL PROGRAM ECONOMICS"
    ws["A1"].font = title_font

    for col, header in enumerate(["Event", "Revenue", "Cost", "Net"], 1):
        ws.cell(row=3, column=col, value=header).font = header_font

    ws["A4"] = "User B buys day pass"
    ws["B4"] = "=Assumptions!B4"
    ws["C4"] = "=Assumptions!$B$11*Assumptions!$B$12"
    ws["D4"] = "=B4-C4"

    ws["A5"] = "User A gets free day pass"
    ws["B5"] = 0
    ws["C5"] = "=Assumptions!$B$11*Assumptions!$B$12"
    ws["D5"] = "=B5-C5"

    ws["A6"] = "TOTAL PER REFERRAL"
    ws["A6"].font = header_font
    ws["B6"] = "=SUM(B4:B5)"
    ws["C6"] = "=SUM(C4:C5)"
    ws["D6"] = "=SUM(D4:D5)"

    for r in range(4, 7):
        for col in ["B", "C", "D"]:
            ws[f"{col}{r}"].number_format = '"$"#,##0.00'

    ws["A8"] = "REFERRAL IMPACT PROJECTION"
    ws["A8"].font = title_font

    for col, header in enumerate(["Monthly Referrals", "Additional Revenue/Yr", "Additional Profit/Yr"], 1):
        ws.cell(row=10, column=col, value=header).font = header_font

    for i, count in enumerate([100, 500, 1000, 5000, 10000]):
        r = 11 + i
        ws[f"A{r}"] = count
        ws[f"A{r}"].number_format = number_format
        ws[f"B{r}"] = f"=A{r}*$B$6*12"
        ws[f"B{r}"].number_format = currency_format
        ws[f"C{r}"] = f"=A{r}*$D$6*12"
        ws[f"C{r}"].number_format = currency_format

    ws.column_dimensions["A"].width = 20
    ws.column_dimensions["B"].width = 22
    ws.column_dimensions["C"].width = 22
    ws.column_dimensions["D"].width = 15

    # Save
    wb.save("/Users/jitcorn/assetra3/specs/pricing-analysis.xlsx")
    print("Created: specs/pricing-analysis.xlsx")

if __name__ == "__main__":
    create_pricing_excel()
