# TODO

### Compact Database Migrations

**Problem:** We have 63+ migration files that have accumulated over time. Many are small incremental changes (add column, alter constraint, etc.) that could be consolidated into clean base schemas.

**Solution:** Squash migrations into a single baseline migration per major table group, keeping only recent migrations that haven't been applied to production.

**Effort:** ~2-3 hours

**Spec:** [db-migration-compaction.md](./db-migration-compaction.md)

---

### Migrate Auth State from React Context to Zustand Store

**Problem:** Current auth uses `useSession()` hook which can re-fetch on remounts and only works inside React components.

**Solution:** Follow Rybbit's pattern - fetch session once at module load and store in Zustand.

**Effort:** ~1-2 hours

**Spec:** [auth-zustand-migration.md](./auth-zustand-migration.md)

---

### Implement OpenAPI TypeScript Codegen

**Problem:** Backend and frontend types can drift apart, causing runtime errors like `json: cannot unmarshal number into Go struct field X of type string`.

**Solution:** Generate TypeScript types from the existing `swagger.json`.

**Effort:** ~5 mins setup, 1-2 hours to migrate all API files (optional, can be gradual)

**Spec:** [api-openapi-codegen.md](./api-openapi-codegen.md)

---
