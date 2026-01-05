# User Testimonials & Product Inspiration

## Sources Analyzed

| # | Source | Date | Link |
|---|--------|------|------|
| 1 | HN - ProjectiFi Launch | April 2021 | https://news.ycombinator.com/item?id=26862841 |
| 2 | HN - ProjectiFi Follow-up | April 2021 | https://news.ycombinator.com/item?id=26969173 |
| 3 | HN - ProjectionLab (rebrand) | July 2021 | https://news.ycombinator.com/item?id=27844194 |
| 4 | HN - ProjectionLab Update | April 2022 | https://news.ycombinator.com/item?id=31083093 |
| 5 | HN - ProjectionLab Show HN | July 2023 | https://news.ycombinator.com/item?id=36849502 |
| 6 | HN - ProjectionLab Self-Host | Dec 2024 | https://news.ycombinator.com/item?id=42450913 |

---

## ProjectionLab (formerly ProjectFi) - HN Testimonial

**Source:** HackerNews (July 24, 2023)
**User:** fishtoaster

> Oh hey, it's you again!
> I discovered projectionlab (formerly projectfi) on HN a while back and have been loving it. Every other "retirement calculator" I found was a dozen text fields and a simple output graph or two - Projection Lab gave me what I really wanted, which was the ability to do much more involved modeling of various scenarios:
>
> - What happens if I buy a house in X years?
> - What happens if my old company IPOs and I get a windfall of $Y in X years?
> - What happens if I change assumptions on investment returns or inflation rates?
> - What happens if I retire at various different ages?
> - What happens if my salary increases by 2, 5, 10, 30% each year?
> - What happens if we do this kind of mortgage or that kind of mortgage?
> - All of the above, but also modeling my wife's finances?
> - All of the above, but with beautiful, interactive graphs instead of my ugly spreadsheet outputs
> - All of the above, but without the several formula typos that I made while building my spreadsheet

---

## Key Insights for Feature Development

### What Users Want (based on this testimonial)

1. **Scenario Modeling** - Not just current state, but "what if" questions
2. **Life Events** - House purchases, windfalls (IPO, inheritance), career changes
3. **Variable Assumptions** - Adjustable rates for returns, inflation, salary growth
4. **Timeline Flexibility** - Different retirement ages, event timing
5. **Multi-Person Support** - Couples/family financial planning
6. **Visual Quality** - Beautiful, interactive graphs (not spreadsheet outputs)
7. **Error-Free Calculations** - Reliability over manual spreadsheet formulas

### Pain Points with Alternatives

- Basic retirement calculators = "a dozen text fields and a simple output graph or two"
- Manual spreadsheets = ugly outputs + formula typos
- Lack of scenario comparison capabilities

---

## HN Thread Deep Dive (July 2023)

**Source:** https://news.ycombinator.com/item?id=36849502

### What Users Love

| User | Feedback |
|------|----------|
| **fishtoaster** | Complex scenario modeling, "what if" questions far superior to typical calculators |
| **javahair** | "Exactly what I was looking for" - multiple plans to explore different decisions |
| **Def_Os** | Sankey charts and polished UI |

### Feature Requests (Priority Ideas)

| Feature | User | Notes |
|---------|------|-------|
| **Auto-increasing 401k limits** | gymbeaux | Contribution caps should auto-adjust for future years |
| **Benchmarked child expenses by country** | mcjiggerlog | Cost-of-living data for family planning |
| **Community tax templates** | matanrubin | GitHub-driven country-specific tax rules |
| **Insurance & risk modeling** | mcho9257 | Deductibles, premiums, event frequency |
| **API access** | tfsh | Automated banking data + RSU vesting schedules |
| **Rental property expenses** | tverbeure | Cash-flow destination controls |

### Pricing Feedback (Important for Monetization)

| Concern | User |
|---------|------|
| Monthly options needed (not just annual) | beret4breakfast, luke_s, Libcat99 |
| $540/year default feels excessive | 999900000999 |
| "Access passes" for infrequent use | luke_s |
| Persistent storage messaging feels ransom-like | beret4breakfast |

### Use Cases Mentioned

- **FIRE planning** (Financial Independence Retire Early)
- **Military pension** retirement scenarios
- **Multi-scenario comparisons** (kids vs no kids, mortgage types)
- **Couple financial planning**
- **House purchase timing**
- **Salary/windfall modeling**

### Competitor Pain Points

| Issue | Context |
|-------|---------|
| Account aggregator sync failures | pc86 - Personal Capital had frequent issues |
| D2C retirement planners struggle | ot1138 - Success typically comes via B2B (banks/advisors) |

---

## Actionable Takeaways for Assetra

### High-Value Features to Consider

1. **Scenario comparison view** - Side-by-side "what if" analysis
2. **Life event templates** - Pre-built events (house, kids, retirement, windfall)
3. **Regional tax support** - Start with SG-specific, extensible design
4. **Sankey/flow visualizations** - Cash flow visualization praised
5. **RSU/equity vesting** - Popular request for tech workers

### Pricing Lessons

- Offer monthly option (even if annual is better value)
- Free tier with reasonable limits (not "ransom-like" messaging)
- Consider usage-based or "access pass" model for occasional users

### Technical Considerations

- API-first design enables future integrations
- Avoid over-reliance on bank sync (fragile, user-reported issues)
- Manual input with smart defaults may be more reliable

---

## Thread #1: ProjectiFi Launch (April 2021)

**Source:** https://news.ycombinator.com/item?id=26862841

### What Users Love

| User | Feedback |
|------|----------|
| **chonk** | Privacy-first (no bank linking), scenario modeling for retirement |
| **olivialau595** | Comprehensive: salary, retirement, major purchases, weddings, 529 plans |
| **mmarki** | "Really cool" detailed simulation interface |

### Key Insight

> **scubakid** (creator): Built this because he couldn't find FI planning tools with sufficient modeling detail

### Concerns Raised

- **awb**: Naming confusion with Google's "Project Fi" cellular service

---

## Thread #2: ProjectiFi Follow-up (April 2021)

**Source:** https://news.ycombinator.com/item?id=26969173

### What Users Love

| User | Feedback |
|------|----------|
| **samtimalsina** | ~$12/year premium beats months of spreadsheet work |
| **matmann2001** | "Fantastic tool" - can try features without account/personal info |
| **cddotdotslash** | Polished UI, prefers hosted over downloadable |

### Feature Requests

| Feature | User | Notes |
|---------|------|-------|
| Fixed dollar 401k contributions | jetpackjoe | Not just percentages |
| Line-item investment entry | jetpackjoe | Not just summed totals |
| Spouse/joint income modeling | evnc | Household != individual |
| Property tax visualization | zwass | + arrow keys for age adjustment |
| Monte Carlo simulations | Dave_Rosenthal | "Essential" to beat spreadsheets |

### Critical Pain Points

| Issue | User | Severity |
|-------|------|----------|
| **Data loss after 20min input** | screye | HIGH - called it "devious" |
| **US-only not disclosed upfront** | 12ian34 | Frustrating discovery |
| **No local-only option** | Frost1x | Privacy concern |
| **Mortgage calc errors** | JeanSebTr, theptip | Unrealistic outputs |
| **Expense inflation bug** | _zfxr | 400→4800 monthly |

---

## Thread #3: ProjectionLab Rebrand (July 2021)

**Source:** https://news.ycombinator.com/item?id=27844194

### What Users Love

| User | Feedback |
|------|----------|
| **dalyons** | Handles "inflation, raises, tax, etc." automatically - saves spreadsheet time |
| **jazzkingrt** | Quick scenario testing (~15 min): "When am I FI?" |
| **trailrunner46** | CFA praised client-side privacy approach |

### Feature Requests

| Feature | User | Notes |
|---------|------|-------|
| **Template/sandbox mode** | mwerd, karanbhangui | Pre-built "married homeowners" scenario |
| **Custom tax brackets** | gjulianm (Spain) | International support |
| **Job loss probability modeling** | gjulianm | Risk scenarios |
| **Variable-rate mortgage** | gjulianm | Tied to economic conditions |
| **RRSP/TFSA dual funding** | jamie_ca (Canada) | Custom investment types |
| **Debt prioritization** | fifthofhisname | Like UndebtIt, auto payment rollover |

### Critical Pain Points

| Issue | User | Quote |
|-------|------|-------|
| **Setup too long** | testing_1_2_3_4 | "I eventually lose interest" |
| **Too many questions** | whydoineedthis | "If I knew the answer, I'd have an accounting degree" |
| **% vs fixed confusion** | esseti, jaclaz | Accidental bankruptcies in simulation |
| **Free tier doesn't save** | neogodless | Friction for occasional users |

### Use Cases

- Rent vs. buy decisions
- Early retirement with expense reduction
- House affordability analysis
- Job transition scenarios
- Estate planning
- International/multi-currency planning

---

## Thread #4: ProjectionLab Update (April 2022)

**Source:** https://news.ycombinator.com/item?id=31083093

### What Users Love

| User | Feedback |
|------|----------|
| **sthatipamala** | Monte Carlo simulations + granular account modeling |
| **hammeiam** | Dependent expenses, custom inflation, auto rent-cancellation on home buy |
| **indemnity** | "Cash flow priorities" system - unique income routing |

### Feature Requests

| Feature | User | Notes |
|---------|------|-------|
| **ISO/NSO stock option modeling** | neill | For tech workers |
| **Monte Carlo for life events** | nico401 | Uncertainty around salary, events |
| **Roth conversion calculator** | fsflyer | + ACA subsidy, SS claiming strategies |
| **Live investment tracking** | mchenier | Cost basis + capital gains |
| **CSV import** | tewwill, bronco21016 | Pre-existing income/asset data |
| **Multi-currency** | Smithalicious | International planning |

### Critical Pain Points

| Issue | User | Severity |
|-------|------|----------|
| **Data loss on navigation** | neill | Lost work accidentally |
| **Lost work 3x before upgrading** | rezic | Frustration → conversion |
| **Browser crash = lost model** | nico401 | No auto-save |
| **Simulations don't update** | reactordev | After changing inputs |

### Niche Use Cases

- FIRE planning with early retirement
- **Roth conversion timing** before SS
- **International relocation** tax strategy
- Freelancer/side-business income
- **Business sale proceeds** allocation
- Spousal "plan together" feature

### Notable Criticism

> **0_zymandias**: Some users prefer FIREcalc's simpler approach - "account for taxes in yearly spending rather than granular modeling"

---

## Thread #6: Self-Hosted Version (Dec 2024)

**Source:** https://news.ycombinator.com/item?id=42450913

### What Users Love

| User | Feedback |
|------|----------|
| **emkee** | Transitions qualitative → quantitative financial decisions |
| **dkarp** | "Best tool I've found in this niche" - strong UX, interactive milestone manipulation |
| **gertlex** | "Awesome" for modeling realistic financial scenarios |

### Feature Requests & Pain Points

| Issue | User | Notes |
|-------|------|-------|
| **International tax complexity** | dkarp | US 401k withdrawals as UK resident |
| **$800 lifetime too steep** | afatparakeet | For personal use |
| **Wants ~$100 tier** | Msurrow | Like major version subscription |
| **Manual data entry question** | batmaniam | Unclear if daily entry needed |

### Monetization Insights

- Self-hosting option appeals to privacy-conscious users
- Pricing tiers matter: $800 lifetime seen as "advisor pricing"
- Individual users want ~$100 option

---

## Consolidated Insights Across All Threads

### Most Requested Features (by frequency)

| Feature | Mentions | Priority |
|---------|----------|----------|
| Monte Carlo simulations | 4+ | HIGH |
| International/multi-currency | 4+ | HIGH |
| Spouse/joint planning | 3+ | HIGH |
| Templates/quick-start scenarios | 3+ | MEDIUM |
| CSV/data import | 2+ | MEDIUM |
| Stock options (ISO/NSO/RSU) | 2+ | MEDIUM |
| Debt prioritization | 2+ | MEDIUM |
| Tax optimization (Roth, etc.) | 2+ | MEDIUM |

### Most Reported Pain Points (by frequency)

| Pain Point | Mentions | Severity |
|------------|----------|----------|
| **Data loss / no auto-save** | 5+ | CRITICAL |
| **Setup too long/complex** | 4+ | HIGH |
| **US-only not disclosed** | 3+ | HIGH |
| **Free tier doesn't save** | 3+ | HIGH |
| **% vs fixed value confusion** | 2+ | MEDIUM |
| **Mortgage calculation errors** | 2+ | MEDIUM |

### Key UX Lessons

1. **Auto-save is non-negotiable** - Multiple users lost 20+ min of work
2. **Templates reduce friction** - "Married homeowner" preset highly requested
3. **Disclose limitations upfront** - US-only frustrates international users
4. **Fixed values > percentages** - For 401k, expenses, maintenance
5. **Privacy sells** - No bank linking is a feature, not a limitation

### Pricing Insights

| Tier | User Sentiment |
|------|----------------|
| Free (no save) | "Devious", "ransom-like" |
| ~$12/year | "Beats months of spreadsheet work" |
| ~$100 lifetime | Sweet spot for individuals |
| $540+/year | "Chargeback territory" |
| $800 lifetime | Too steep for personal use |

### Target User Personas (from threads)

1. **FIRE enthusiasts** - Detailed scenario modeling, early retirement
2. **Tech workers** - RSU/ISO/NSO vesting, high income complexity
3. **International users** - Multi-currency, country-specific tax
4. **Couples** - Joint planning, spouse income modeling
5. **Spreadsheet refugees** - Want automation without formula errors
