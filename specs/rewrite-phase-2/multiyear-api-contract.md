# API Contract - Multiyear Financial Timeline (v1)

**Base URL:** `/api/v1`
**Scope:** Financial timeline (0–20 years), overrides/upserts, growth config

---

## Financial Timeline API

**Endpoints:**  
`GET /api/v1/financial/timeline`  
`PUT /api/v1/financial/timeline/{year}`

**Purpose:**  
Serve 0–20 year annualized timeline; allow year-specific edits/upserts (including new items); return refreshed timeline with override markers.

### GET /api/v1/financial/timeline

**Response**
```typescript
interface TimelineResponse {
  years: TimelineYear[]; // ordered 0..20
  version: string;       // e.g., "v1"
}

interface TimelineYear {
  year: number;
  assets: TimelineItem[];
  liabilities: TimelineItem[];
  income: TimelineItem[];
  expenses: TimelineItem[];
  net_cash: number;
  net_worth: number;
  has_overrides: boolean;
  growth_applied: GrowthApplied[]; // category + rate used
}

interface TimelineItem {
  item_id: string;
  name: string;
  category: string;
  amount_annual: number;        // annualized value used in projection
  source_amount?: number;       // original amount if not annual
  source_frequency?: Frequency; // "annual" | "monthly" | "weekly" | "biweekly" | "quarterly" | "semiannual"
  item_type: "asset" | "liability" | "income" | "expense";
  created_year: number;         // first year the item exists
}

interface GrowthApplied {
  category: string;
  annual_rate_pct: number;
}
```

**Example Response (truncated)**
```json
{
  "years": [
    {
      "year": 0,
      "assets": [
        {
          "item_id": "asset_1",
          "name": "Savings",
          "category": "asset_cash",
          "amount_annual": 12000,
          "source_amount": 1000,
          "source_frequency": "monthly",
          "item_type": "asset",
          "created_year": 0
        }
      ],
      "liabilities": [],
      "income": [],
      "expenses": [],
      "net_cash": 12000,
      "net_worth": 12000,
      "has_overrides": false,
      "growth_applied": [
        { "category": "asset_cash", "annual_rate_pct": 1.5 }
      ]
    }
  ],
  "version": "v1"
}
```

### PUT /api/v1/financial/timeline/{year}

**Request**
```typescript
type Frequency = "annual" | "monthly" | "weekly" | "biweekly" | "quarterly" | "semiannual";

interface TimelineEditRequest {
  year: number; // matches path param
  edits: TimelineEdit[];
  note?: string;
}

interface TimelineEdit {
  itemId?: string;              // existing item; omit to create new
  name?: string;                // required when creating new
  itemType: "asset" | "liability" | "income" | "expense";
  category: string;
  amount: number;               // expressed in source frequency units
  frequency: Frequency;
}
```

**Response**
```typescript
type TimelinePutResponse = TimelineResponse; // refreshed 0..20 timeline
```

**Behavior / Validation**
- Upsert semantics: if `itemId` provided, override that item for the given year; otherwise create a new item (server assigns `item_id`, `created_year = {year}`) and project it forward.
- Annualization rules: annual x1, monthly x12, weekly x52, biweekly x26, quarterly x4, semiannual x2. Returned timeline always includes `amount_annual` plus `source_amount/frequency` when applicable.
- Overrides are latest-wins per item/year; has_overrides reflects applied edits.
- Validation errors on missing `itemType`, invalid frequency, or out-of-bounds growth/frequency values.

**Example Request**
```json
{
  "year": 3,
  "edits": [
    {
      "itemId": "asset_1",
      "itemType": "asset",
      "category": "asset_cash",
      "amount": 2000,
      "frequency": "monthly"
    },
    {
      "name": "Side Hustle Beta",
      "itemType": "income",
      "category": "income_other",
      "amount": 500,
      "frequency": "monthly"
    }
  ]
}
```

**Example Response (truncated)**
```json
{
  "years": [
    {
      "year": 3,
      "assets": [
        {
          "item_id": "asset_1",
          "name": "Savings",
          "category": "asset_cash",
          "amount_annual": 24000,
          "source_amount": 2000,
          "source_frequency": "monthly",
          "item_type": "asset",
          "created_year": 0
        }
      ],
      "income": [
        {
          "item_id": "income_new_1",
          "name": "Side Hustle Beta",
          "category": "income_other",
          "amount_annual": 6000,
          "source_amount": 500,
          "source_frequency": "monthly",
          "item_type": "income",
          "created_year": 3
        }
      ],
      "has_overrides": true
    }
  ],
  "version": "v1"
}
```

**Error Responses**
```json
{ "error": "validation_error", "message": "frequency must be one of: annual, monthly, weekly, biweekly, quarterly, semiannual" }
{ "error": "not_found", "message": "itemId not found for year", "details": { "itemId": "asset_missing", "year": 3 } }
```

---

## Growth Config API

**Endpoints:**  
`GET /api/v1/financial/growth`  
`PUT /api/v1/financial/growth`

**Purpose:**  
Read/update bounded annual growth assumptions per category used by the projection engine.

**Request/Response Types**
```typescript
interface GrowthConfigEntry {
  category: "asset_cash" | "asset_equity" | "asset_property" | "liability_debt" | "income" | "expense";
  annual_rate_pct: number;    // e.g., 6.0 means +6%
  lower_bound_pct: number;    // e.g., -50
  upper_bound_pct: number;    // e.g., 50
  updated_at: string;
}

interface GrowthConfigResponse {
  growth: GrowthConfigEntry[];
  version: string;
}

interface GrowthConfigRequest {
  growth: Array<Pick<GrowthConfigEntry, "category" | "annual_rate_pct">>;
}
```

**Defaults (seeded)**
- asset_cash: +1.5%
- asset_equity: +6.0%
- asset_property: +3.0%
- liability_debt: -3.0%
- income: +3.0%
- expense: +2.0%
- Bounds: clamp/reject outside -50%..+50%.

**Error Responses**
```json
{ "error": "validation_error", "message": "annual_rate_pct must be between -50 and 50" }
{ "error": "unknown_category", "message": "category must be one of asset_cash, asset_equity, asset_property, liability_debt, income, expense" }
```
