# CPF Multi-Earner Display

## Status: COMPLETED (2025-12-30)

## Overview
Display CPF accounts grouped by earner in the dashboard when multiple earners exist. Each person's CPF accounts are displayed separately with their own collapsible section.

## Result
```
CPF - Alex ($162,000)
├── CPF Ordinary Account    $85,000
├── CPF Special Account     $45,000
└── CPF MediSave Account    $32,000

CPF - Jordan ($125,000)
├── CPF Ordinary Account    $65,000
├── CPF Special Account     $35,000
└── CPF MediSave Account    $25,000
```

## Changes Made

### Backend

**`backend/internal/financial_v2/timeline/types.go`**
- Added `Earner` field to `CPFAssetResponse` struct

**`backend/internal/financial_v2/timeline/service.go`**
- Changed from `GetCPFAccount()` to `ListCPFAccounts()` to fetch all CPF accounts
- Added `NewCPFContexts()` function to create map of earner → CPFContext
- Added `buildAllCPFAssetResponses()` to aggregate responses for all earners
- Each CPF account ID now includes earner suffix (e.g., `cpf-oa-alex`)

**`backend/migrations/202512301520_cpf_accounts_multi_earner.up.sql`**
- Updated database constraint to allow multiple CPF accounts per user (one per earner)
- Constraint now includes `COALESCE(earner, '') WITH =` in the exclusion

### Frontend

**`frontend/src/types/timeline.ts`**
- Added `earner` field to `CPFAssetResponseV2` interface

**`frontend/src/components/dashboard/FinancialDataManagement/converters.ts`**
- Updated `cpfAssetV2ToTimelineItem()` to map earner field

**`frontend/src/components/dashboard/FinancialDataManagement/components/CategoryCard/CPFAssetsSection.tsx`**
- Groups CPF assets by earner using `useMemo`
- Renders separate `CollapsibleSection` for each earner
- Always shows earner name in title (e.g., "CPF - Alex")

## Database Migration

```sql
-- Allow multiple CPF accounts per user (one per earner)
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;

ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap
EXCLUDE USING gist (
  user_id WITH =,
  COALESCE(earner, '') WITH =,
  tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);
```

## Testing
- Verified with sample data containing Alex and Jordan CPF accounts
- Dashboard correctly displays grouped CPF accounts
- Total assets correctly include both earners' balances
