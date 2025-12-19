# TODO

## API Type Safety

### Implement OpenAPI TypeScript Codegen

**Problem:** Backend and frontend types can drift apart, causing runtime errors like `json: cannot unmarshal number into Go struct field X of type string`.

**Solution:** Generate TypeScript types from the existing `swagger.json`.

**Steps:**
1. Install openapi-typescript:
   ```bash
   cd frontend && pnpm add -D openapi-typescript
   ```

2. Add generate script to `frontend/package.json`:
   ```json
   {
     "scripts": {
       "generate:api": "openapi-typescript ../backend/cmd/server/docs/swagger.json -o src/types/api.generated.ts"
     }
   }
   ```

3. Run generation:
   ```bash
   # Regenerate swagger.json from Go annotations
   cd backend && swag init -g cmd/server/main.go -o cmd/server/docs

   # Generate TypeScript types
   cd frontend && pnpm generate:api
   ```

4. Use generated types in API files:
   ```typescript
   import type { components } from '@/types/api.generated'
   type CreateInvestmentBody = components['schemas']['investmentCreateInput']
   ```

**Effort:** ~5 mins setup, 1-2 hours to migrate all API files (optional, can be gradual)

**Benefit:** Type mismatches become compile-time errors instead of runtime errors.

---
