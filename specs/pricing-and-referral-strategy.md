# Pricing & Referral Strategy

## LLM Cost Analysis (Gemini 2.5 Flash)

| Usage Type | Tokens | Cost/Request |
|------------|--------|--------------|
| Simple query (greeting, net worth) | ~7,700-8,000 | ~$0.002 |
| Moderate (1-3 tool calls) | ~8,500-10,000 | ~$0.003 |
| Complex analysis (5+ tools) | ~10,000-14,000 | ~$0.004-0.005 |
| Heavy multi-scenario | ~15,000+ | ~$0.006-0.008 |

**Average cost per chat**: ~$0.003-0.004

---

## Pricing Tiers

### Free Tier
- **5 chats per 48 hours** (~75 chats/month)
- Cost per user: ~$0.22-0.30/month
- Purpose: User acquisition, word of mouth

### Day Pass - $2
- **Unlimited chats for 24 hours** (cap at 50 if needed)
- LLM cost: ~$0.10-0.40 depending on usage
- Infra cost: ~$0.10-0.20
- **Profit margin: ~$1.40-1.80**

### Subscription - $10/month
- **Unlimited chats**
- Typical cost: ~$0.30-0.80/month
- **Profit margin: ~$9.20-9.70**

---

## Day Pass Economics

| Daily Usage | LLM Cost | Infra Buffer | Total Cost | Your Profit |
|-------------|----------|--------------|------------|-------------|
| Light (10 chats) | $0.03 | $0.10 | ~$0.13 | **$1.87** |
| Moderate (30 chats) | $0.10 | $0.10 | ~$0.20 | **$1.80** |
| Heavy (50 chats) | $0.20 | $0.15 | ~$0.35 | **$1.65** |
| Extreme (100 chats) | $0.40 | $0.20 | ~$0.60 | **$1.40** |

---

## Subscription vs Day Pass Comparison

| User Behavior | Subscription Revenue | Day Pass Revenue |
|---------------|---------------------|------------------|
| Uses <5 days/mo | $10 | $4-10 |
| Uses 5+ days/mo | $10 | $10+ |
| Uses 15+ days/mo | $10 | $30+ |

**Insight**: Offer both - users self-select the better option for them, you profit either way.

---

## Annual Cost Projections (Free Tier Only)

Based on 5 chats per 48 hours:

| Active Users | Monthly Cost | Annual Cost |
|--------------|--------------|-------------|
| 100 | $22-30 | $264-360 |
| 500 | $110-150 | $1,320-1,800 |
| 1,000 | $220-300 | $2,640-3,600 |
| 5,000 | $1,100-1,500 | $13,200-18,000 |

Note: Typically ~40% of registered users are actively using the free tier.

---

## Referral Program

### Mechanism
```
User A (free tier) → Refers User B → User B buys $2 day pass
                  → User A gets free day pass as reward
```

### Economics Per Referral

| Event | Revenue | Cost | Net |
|-------|---------|------|-----|
| User B buys day pass | $2.00 | ~$0.40 | +$1.60 |
| User A gets free day pass | $0 | ~$0.40 | -$0.40 |
| **Total** | **$2.00** | **~$0.80** | **+$1.20** |

### Why This Works
1. **User A is motivated** - free day pass is tangible reward
2. **User B gets social proof** - "my friend uses this"
3. **Low risk** - only pay reward after receiving payment
4. **Compounds** - User B can now refer User C, etc.

### Enhancement Ideas

| Enhancement | Benefit |
|-------------|---------|
| Require User B completes 5+ chats | Ensures User B is real/engaged |
| Both users get day pass | More incentive for User B to use referral link |
| Streak bonus: 3 referrals = 1 week free | Encourages multiple referrals |

---

## Recommended Strategy (Early Stage)

1. **Free tier** (5 chats/48hrs) → Build user base, word of mouth
2. **$10/month subscription** → Monetize power users, stable recurring revenue
3. **$2 day pass** → Add once traffic grows, captures casual users
4. **Referral program** → Primary growth engine without paid marketing

### Break-even Math
At $10/month subscription with 1,000 registered users:
- Free tier costs: ~$100-150/month (assuming 40% active)
- Need ~15-20 paying subscribers (1.5-2% conversion) to cover free tier costs

---

## Traffic & Conversion Estimates

| Stage | Daily Visitors | Day Pass Conversions (1-3%) | Monthly Revenue |
|-------|----------------|----------------------------|-----------------|
| Launch | 100 | 1-3 | $60-180 |
| Some traction | 1,000 | 10-30 | $600-1,800 |
| Moderate success | 5,000 | 50-150 | $3,000-9,000 |
| Strong growth | 30,000+ | 300-900 | $18,000-54,000 |

### Seasonal Considerations
Financial planning traffic spikes around:
- New Year (resolutions)
- Tax season
- Major life events (marriage, home buying, career changes)

---

## User Funnel Analysis (Singapore Market)

### Target Market
| Segment | Population |
|---------|------------|
| Singapore residents | ~4,000,000 |
| Adults (18+) | ~3,500,000 |
| Financially active (investing/planning) | ~500,000-1,000,000 |

### Funnel Breakdown

```
Total Addressable Market: 500,000 financially-active adults
                │
                ▼
┌───────────────────────────────────────────────────────┐
│  AWARENESS (hear about app)                           │
│  10-20% of TAM = 50,000 - 100,000 people              │
└───────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│  VISIT SITE                                           │
│  50% of aware = 25,000 - 50,000 visitors              │
└───────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│  SIGN UP (free tier)                                  │
│  10-20% of visitors = 2,500 - 10,000 users            │
└───────────────────────────────────────────────────────┘
                │
                ▼
        ┌───────┴───────┬───────────────┐
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ CHURNED     │ │ CASUAL      │ │ ENGAGED     │
│ (never pay) │ │ (day pass)  │ │ (subscribe) │
│             │ │             │ │             │
│ 70-80%      │ │ 15-20%      │ │ 5-10%       │
└─────────────┘ └─────────────┘ └─────────────┘
```

### User Segments After Sign-up

| Segment | % of Sign-ups | Behavior | Annual Revenue/User |
|---------|---------------|----------|---------------------|
| **Churned** | 70-80% | Try free tier, leave | $0 |
| **Occasional** | 10-15% | 2-4 day passes/year | $4-8 |
| **Seasonal** | 5-10% | 6-12 day passes/year | $12-24 |
| **Subscribers** | 3-7% | $10/month | $120 |

---

## Revenue Model: 5,000 Registered Users

### User Distribution
| Segment | % | Users | Behavior |
|---------|---|-------|----------|
| Churned | 75% | 3,750 | Gone after free trial |
| Occasional | 12% | 600 | ~3 day passes/year |
| Seasonal | 8% | 400 | ~8 day passes/year |
| Subscribers | 5% | 250 | $10/month |

### Annual Revenue Calculation

| Segment | Users | Revenue/User/Year | Total Revenue |
|---------|-------|-------------------|---------------|
| Churned | 3,750 | $0 | $0 |
| Occasional | 600 | $6 (3 × $2) | $3,600 |
| Seasonal | 400 | $16 (8 × $2) | $6,400 |
| Subscribers | 250 | $120 | $30,000 |
| **Total** | **5,000** | | **$40,000** |

### Annual Cost Calculation

| Segment | Users | Active % | Chats/Year | Cost |
|---------|-------|----------|------------|------|
| Churned | 3,750 | 10% (free trial) | ~5 each | ~$56 |
| Occasional | 600 | 100% (day pass days) | ~90 total | ~$270 |
| Seasonal | 400 | 100% (day pass days) | ~320 total | ~$960 |
| Subscribers | 250 | 60% regular use | ~18,000 total | ~$5,400 |
| Free tier active | ~500 | ongoing | ~9,000/year | ~$2,700 |
| **Total** | | | | **~$9,400** |

### Annual Profit: ~$30,600

---

## Monthly Projection (Year 1 Growth)

Assuming gradual user acquisition:

| Month | Total Users | New Users | Subscribers | Day Pass Sales | Monthly Revenue | Monthly Cost | Profit |
|-------|-------------|-----------|-------------|----------------|-----------------|--------------|--------|
| 1 | 100 | 100 | 5 | 10 | $70 | $30 | $40 |
| 2 | 250 | 150 | 12 | 25 | $170 | $60 | $110 |
| 3 | 500 | 250 | 25 | 50 | $350 | $100 | $250 |
| 4 | 850 | 350 | 42 | 85 | $590 | $160 | $430 |
| 5 | 1,300 | 450 | 65 | 130 | $910 | $230 | $680 |
| 6 | 1,800 | 500 | 90 | 180 | $1,260 | $310 | $950 |
| 7 | 2,400 | 600 | 120 | 240 | $1,680 | $400 | $1,280 |
| 8 | 3,000 | 600 | 150 | 300 | $2,100 | $480 | $1,620 |
| 9 | 3,600 | 600 | 180 | 360 | $2,520 | $560 | $1,960 |
| 10 | 4,200 | 600 | 210 | 420 | $2,940 | $640 | $2,300 |
| 11 | 4,800 | 600 | 240 | 480 | $3,360 | $720 | $2,640 |
| 12 | 5,400 | 600 | 270 | 540 | $3,780 | $800 | $2,980 |
| **Year 1** | | | | | **$19,730** | **$4,490** | **$15,240** |

### Assumptions
- 5% of users convert to subscribers over time
- 10% buy day passes each month
- Subscriber retention: 90%/month
- Growth slows after month 6 (organic plateau)

---

## Year 2+ Projection (Steady State)

With 5,000 active users maintained:

| Metric | Monthly | Annual |
|--------|---------|--------|
| Subscriber revenue (250 × $10) | $2,500 | $30,000 |
| Day pass revenue (~100/month) | $200 | $2,400 |
| **Total Revenue** | **$2,700** | **$32,400** |
| LLM + Infra costs | ~$800 | ~$9,600 |
| **Net Profit** | **$1,900** | **$22,800** |

---

## Scenario Analysis

### Conservative (3% subscribe, low engagement)
| Users | Subscribers | Day Pass/Year | Revenue | Cost | Profit |
|-------|-------------|---------------|---------|------|--------|
| 5,000 | 150 | 600 | $19,200 | $6,000 | **$13,200** |

### Base Case (5% subscribe, moderate engagement)
| Users | Subscribers | Day Pass/Year | Revenue | Cost | Profit |
|-------|-------------|---------------|---------|------|--------|
| 5,000 | 250 | 1,000 | $32,000 | $9,400 | **$22,600** |

### Optimistic (8% subscribe, high engagement)
| Users | Subscribers | Day Pass/Year | Revenue | Cost | Profit |
|-------|-------------|---------------|---------|------|--------|
| 5,000 | 400 | 1,500 | $51,000 | $14,000 | **$37,000** |

---

## Key Insights

1. **Subscribers are the money maker** - 5% of users generate 75%+ of revenue
2. **Day passes are bonus income** - Nice to have, not core business
3. **Free tier is marketing cost** - ~$2,700/year for 5,000 users is cheap acquisition
4. **Break-even is low** - Only need ~50-100 subscribers to cover all costs
5. **Churn is expected** - 75% churn is normal for freemium; focus on the 25% who stay
