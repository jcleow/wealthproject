## Data Model (Effective-Dated Values, no separate items table)

```mermaid
erDiagram
  USERS ||--o{ ASSETS : owns
  USERS ||--o{ LIABILITIES : owns
  USERS ||--o{ INCOME : owns
  USERS ||--o{ EXPENSES : owns
  USERS ||--o{ GROWTH_CONFIGS : owns

  ASSETS {
    uuid id PK
    string name
    string category
    int start_year
    int end_year
    decimal amount
    string frequency
    string updated_at
  }

  LIABILITIES {
    uuid id PK
    string name
    string category
    int start_year
    int end_year
    decimal amount
    string frequency
    string updated_at
  }

  INCOME {
    uuid id PK
    string source
    string category
    int start_year
    int end_year
    decimal amount
    string frequency
    string updated_at
  }

  EXPENSES {
    uuid id PK
    string payee
    string category
    int start_year
    int end_year
    decimal amount
    string frequency
    string updated_at
  }

  GROWTH_CONFIGS {
    string category PK
    decimal annual_rate_pct
    decimal lower_bound_pct
    decimal upper_bound_pct
    string updated_at
  }
```

_Notes_: Baseline rows have `start_year=0`; overrides/new rows use `start_year > 0`; `end_year` optional; `amount=0` at `start_year=N` = delete from N forward. Uniqueness on `(user_id, id, start_year)` per table.

## Projection Flow

```mermaid
flowchart TD
  A[Load baseline rows start_year zero] --> B[Load override rows start_year greater than zero]
  B --> C[Load growth config]
  C --> D[Loop years 0..30]
  D --> E[Apply growth clamped]
  E --> F[Pick latest row with start_year not after year]
  F --> G{Delete marker amount zero?}
  G -->|Yes| H[Drop item from state]
  G -->|No| I[Apply override or new item]
  H --> J[Compute assets liabilities income expenses, net_cash, net_worth]
  I --> J
  J --> K[Mark has_overrides]
  K --> L[Pass state to next year]
  L --> D
  J --> M[Build timeline response]
```
