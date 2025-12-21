# API Type Safety: OpenAPI TypeScript Codegen

## Background: The Type Drift Problem

In a full-stack application with separate frontend (TypeScript) and backend (Go) codebases, types are defined independently in both places. Over time, these definitions can drift apart:

```
Backend (Go)                    Frontend (TypeScript)
─────────────────               ─────────────────────
type Asset struct {             interface Asset {
  Value decimal.Decimal           value: number  // ❌ Should be string!
}                               }
```

This causes runtime errors like:
```
json: cannot unmarshal number into Go struct field X of type string
```

These errors are frustrating because:
1. They only appear at runtime (not during development)
2. They're often discovered in production
3. They require manual investigation to find the mismatch

## Solution: Generate Types from OpenAPI Spec

Instead of manually maintaining types in both places, we can:

1. Backend defines the "source of truth" via Swagger/OpenAPI annotations
2. Generate TypeScript types automatically from the spec
3. Frontend imports generated types - guaranteed to match backend

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Go Handlers    │ ──→  │  swagger.json    │ ──→  │  api.generated.ts│
│  (annotations)  │      │  (OpenAPI spec)  │      │  (TypeScript)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
      Backend                  Shared                   Frontend
```

## Benefits

| Before (Manual) | After (Generated) |
|-----------------|-------------------|
| Runtime type errors | Compile-time type errors |
| Manual sync between codebases | Automatic sync via generation |
| "I think this field is a string" | "I know this field is a string" |
| Find bugs in production | Find bugs during development |

## How OpenAPI Codegen Works

### 1. Backend Swagger Annotations

Go handlers are annotated with Swagger comments:

```go
// CreateAsset creates a new asset
// @Summary Create asset
// @Tags assets
// @Accept json
// @Produce json
// @Param body body AssetCreateInput true "Asset data"
// @Success 201 {object} Asset
// @Router /assets [post]
func (h *Handler) CreateAsset(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### 2. Generate swagger.json

The `swag` CLI reads annotations and generates OpenAPI spec:

```bash
cd backend && swag init -g cmd/server/main.go -o cmd/server/docs
```

This creates `swagger.json` with all API types:

```json
{
  "components": {
    "schemas": {
      "Asset": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "value": { "type": "string" },  // decimal as string
          "name": { "type": "string" }
        }
      }
    }
  }
}
```

### 3. Generate TypeScript Types

The `openapi-typescript` package reads the spec and generates TypeScript:

```bash
cd frontend && pnpm generate:api
```

This creates `api.generated.ts`:

```typescript
export interface components {
  schemas: {
    Asset: {
      id: string
      value: string  // Correctly typed as string!
      name: string
    }
  }
}
```

### 4. Use in Frontend Code

```typescript
import type { components } from '@/types/api.generated'

type Asset = components['schemas']['Asset']

// Now TypeScript knows value is a string, not a number
function formatAssetValue(asset: Asset) {
  return parseFloat(asset.value).toFixed(2)  // ✅ Correct
}
```

## Implementation Steps

### 1. Install openapi-typescript

```bash
cd frontend && pnpm add -D openapi-typescript
```

### 2. Add generate script to package.json

```json
{
  "scripts": {
    "generate:api": "openapi-typescript ../backend/cmd/server/docs/swagger.json -o src/types/api.generated.ts"
  }
}
```

### 3. Run generation

```bash
# Step 1: Regenerate swagger.json from Go annotations
cd backend && swag init -g cmd/server/main.go -o cmd/server/docs

# Step 2: Generate TypeScript types
cd frontend && pnpm generate:api
```

### 4. Use generated types in API files

```typescript
import type { components } from '@/types/api.generated'

type CreateAssetBody = components['schemas']['AssetCreateInput']
type AssetResponse = components['schemas']['Asset']

export async function createAsset(body: CreateAssetBody): Promise<AssetResponse> {
  return apiClient.post('/assets', body)
}
```

## Workflow Integration

### Development Workflow

```
1. Modify Go handler or types
2. Run `swag init` to update swagger.json
3. Run `pnpm generate:api` to update TypeScript
4. TypeScript compiler catches any breaking changes
```

### CI/CD Integration (Optional)

Add to CI pipeline to catch drift:

```yaml
# .github/workflows/type-check.yml
- name: Generate API types
  run: |
    cd backend && swag init -g cmd/server/main.go -o cmd/server/docs
    cd frontend && pnpm generate:api

- name: Check for uncommitted changes
  run: git diff --exit-code frontend/src/types/api.generated.ts
```

## Migration Strategy

You don't need to migrate all API files at once. Gradual adoption:

### Phase 1: Setup (5 mins)
- Install package
- Add script
- Generate types

### Phase 2: New Code
- Use generated types for all new API endpoints
- Old code continues to work

### Phase 3: Gradual Migration (optional)
- When touching old API files, switch to generated types
- No rush - both approaches work side by side

## Common Patterns

### Request Bodies

```typescript
type CreateAssetBody = components['schemas']['AssetCreateInput']

export async function createAsset(body: CreateAssetBody) {
  return apiClient.post<Asset>('/assets', body)
}
```

### Response Types

```typescript
type AssetListResponse = components['schemas']['PaginatedAssetResponse']

export async function listAssets(): Promise<AssetListResponse> {
  return apiClient.get('/assets')
}
```

### Extracting Nested Types

```typescript
// If the schema has nested objects
type Impact = components['schemas']['ScenarioEvent']['impacts'][number]
```

## Gotchas

### 1. Decimal Types

Go's `decimal.Decimal` serializes as string. Make sure annotations reflect this:

```go
// In Go struct
Value decimal.Decimal `json:"value"` // Serializes as "123.45" (string)
```

The generated TypeScript will correctly show `value: string`.

### 2. Optional Fields

OpenAPI distinguishes required vs optional. Check your Go struct tags:

```go
type Asset struct {
  Name  string  `json:"name"`            // Required
  Notes *string `json:"notes,omitempty"` // Optional
}
```

### 3. Enums

Define enums in Go, they'll be generated as union types:

```go
// @Description Asset category
// @Enum property,vehicle,investment
type Category string
```

Generates:
```typescript
type Category = 'property' | 'vehicle' | 'investment'
```

## References

- [openapi-typescript docs](https://github.com/drwpow/openapi-typescript)
- [Swag (Go Swagger generator)](https://github.com/swaggo/swag)
- [OpenAPI Specification](https://swagger.io/specification/)
