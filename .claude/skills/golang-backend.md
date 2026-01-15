# Go Backend Skill

Load with: base patterns from this repository

## Project Structure

```
backend/
├── cmd/server/                    # Application entry point
│   ├── main.go                    # Server init & dependency injection
│   ├── handlers/                  # HTTP request handlers
│   │   ├── common.go              # Shared utilities (writeJSON, requireUserID, etc.)
│   │   ├── asset_v2.go            # Example: Asset handler
│   │   └── ...
│   ├── routes/                    # Route registration
│   │   ├── v1.go                  # V1 routes (legacy)
│   │   └── v2.go                  # V2 routes (current)
│   └── docs/                      # Swagger documentation
├── internal/                      # Core business logic (private)
│   ├── financial_v2/              # Domain services (CURRENT)
│   │   ├── repository/            # Data persistence (pgx-based)
│   │   │   ├── store.go           # Store initialization
│   │   │   ├── asset.go           # Asset CRUD
│   │   │   ├── expense.go         # Expense CRUD
│   │   │   └── ...
│   │   ├── asset/                 # Asset domain service
│   │   │   └── service.go
│   │   ├── expense/               # Expense domain service
│   │   ├── timeline/              # Timeline computation
│   │   └── ...
│   ├── config/                    # Configuration management
│   ├── database/                  # DB connectivity & migrations
│   ├── middleware/                # HTTP middleware
│   │   ├── auth.go                # JWT authentication
│   │   ├── middleware.go          # CORS, logging, request ID
│   │   └── ratelimit.go           # Rate limiting
│   ├── testutil/                  # Test utilities (e2e tagged)
│   └── decimal/                   # Decimal arithmetic utilities
├── migrations/                    # SQL migration files
└── go.mod
```

**Key Principle**: V2 (`financial_v2/`) is the current standard. V1 (`financial/`) is deprecated.

---

## Handler Pattern

### Structure

```go
// handlers/asset_v2.go
type AssetV2Handler struct {
    store   *repository.Store
    service *asset.Service  // Optional: for complex logic
}

func NewAssetV2Handler(store *repository.Store) *AssetV2Handler {
    return &AssetV2Handler{
        store:   store,
        service: asset.NewService(store),
    }
}

func (h *AssetV2Handler) RegisterRoutes(router *mux.Router) {
    router.HandleFunc("/assets", h.List).Methods("GET")
    router.HandleFunc("/assets", h.Create).Methods("POST")
    router.HandleFunc("/assets/{id}", h.Get).Methods("GET")
    router.HandleFunc("/assets/{id}", h.Update).Methods("PUT")
    router.HandleFunc("/assets/{id}", h.Delete).Methods("DELETE")
}
```

### Handler Method Pattern

```go
func (h *AssetV2Handler) Create(w http.ResponseWriter, r *http.Request) {
    // 1. Extract user ID from context
    userID, ok := requireUserID(w, r)
    if !ok {
        return
    }

    // 2. Parse request body
    var input CreateAssetInput
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        badRequest(w, err)
        return
    }

    // 3. Validate input (if needed)
    if input.Name == "" {
        writeError(w, http.StatusBadRequest, "validation_error", "name is required")
        return
    }

    // 4. Call repository/service
    asset, err := h.store.CreateNonCashAsset(r.Context(), userID, repository.NonCashAsset{
        Name:         input.Name,
        CurrentValue: input.CurrentValue,
        // ...
    })
    if err != nil {
        log.Printf("AssetV2Handler.Create error: %v", err)
        internalError(w, err)
        return
    }

    // 5. Return response
    jsonResponse(w, http.StatusCreated, asset)
}
```

### Common Handler Utilities

Use utilities from `handlers/common.go`:

```go
// Context extraction
userID, ok := requireUserID(w, r)  // Returns false and writes 401 if missing
userID := getUserID(r)              // Returns empty string if missing

// Response writing
writeJSON(w, data)                              // 200 + JSON
jsonResponse(w, http.StatusCreated, data)       // Custom status + JSON
writeError(w, 400, "validation_error", "msg")   // Error response
badRequest(w, err)                              // 400 with error message
internalError(w, err)                           // 500 with generic message

// Query parsing
pagination := parsePaginationV2(r)              // limit, offset from query
date, err := queryDate(r, "startDate")          // Parse date query param
date, err := queryDateOpt(r, "endDate", def)    // Optional date with default
```

---

## Repository Pattern

### Store Definition

```go
// internal/financial_v2/repository/store.go
type PgxPool interface {
    Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
    QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
    Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
    Begin(ctx context.Context) (pgx.Tx, error)
}

type Store struct {
    pool PgxPool  // Interface for testability
}

func NewStore(pool PgxPool) *Store {
    return &Store{pool: pool}
}
```

### CRUD Methods

```go
// internal/financial_v2/repository/asset.go

// Get single entity
func (s *Store) GetNonCashAsset(ctx context.Context, userID, id string) (*NonCashAsset, error) {
    query := `SELECT id, name, current_value, ... FROM finance_assets WHERE user_id = $1 AND id = $2`

    row := s.pool.QueryRow(ctx, query, userID, id)

    var asset NonCashAsset
    err := row.Scan(&asset.ID, &asset.Name, &asset.CurrentValue, ...)
    if err == pgx.ErrNoRows {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("get asset: %w", err)
    }
    return &asset, nil
}

// List with pagination
func (s *Store) ListNonCashAssets(ctx context.Context, userID string, params PaginationParams) (*PaginatedResult[NonCashAsset], error) {
    query := `SELECT id, name, ... FROM finance_assets WHERE user_id = $1 ORDER BY created_at DESC`

    if params.Limit != nil {
        query += fmt.Sprintf(" LIMIT %d", *params.Limit)
    }
    if params.Offset != nil {
        query += fmt.Sprintf(" OFFSET %d", *params.Offset)
    }

    rows, err := s.pool.Query(ctx, query, userID)
    if err != nil {
        return nil, fmt.Errorf("list assets: %w", err)
    }
    defer rows.Close()

    var assets []NonCashAsset
    for rows.Next() {
        var asset NonCashAsset
        if err := rows.Scan(&asset.ID, &asset.Name, ...); err != nil {
            return nil, fmt.Errorf("scan asset: %w", err)
        }
        assets = append(assets, asset)
    }

    return &PaginatedResult[NonCashAsset]{
        Data:   assets,
        Count:  len(assets),
        Limit:  params.Limit,
        Offset: params.Offset,
    }, nil
}

// Create
func (s *Store) CreateNonCashAsset(ctx context.Context, userID string, asset NonCashAsset) (*NonCashAsset, error) {
    id := generateUUID()
    query := `
        INSERT INTO finance_assets (id, user_id, name, current_value, ...)
        VALUES ($1, $2, $3, $4, ...)
        RETURNING id, name, current_value, ...`

    row := s.pool.QueryRow(ctx, query, id, userID, asset.Name, asset.CurrentValue, ...)

    var created NonCashAsset
    if err := row.Scan(&created.ID, &created.Name, ...); err != nil {
        return nil, fmt.Errorf("create asset: %w", err)
    }
    return &created, nil
}

// Upsert (for versioning/conflicts)
func (s *Store) UpsertNonCashAsset(ctx context.Context, userID string, asset NonCashAsset) (*NonCashAsset, error) {
    query := `
        INSERT INTO finance_assets (id, user_id, parent_id, name, start_date, ...)
        VALUES ($1, $2, $3, $4, $5, ...)
        ON CONFLICT ON CONSTRAINT finance_assets_parent_start_date_key
        DO UPDATE SET name = EXCLUDED.name, current_value = EXCLUDED.current_value, ...
        RETURNING id, name, ...`
    // ...
}

// Delete
func (s *Store) DeleteNonCashAsset(ctx context.Context, userID, id string) error {
    query := `DELETE FROM finance_assets WHERE user_id = $1 AND id = $2`

    result, err := s.pool.Exec(ctx, query, userID, id)
    if err != nil {
        return fmt.Errorf("delete asset: %w", err)
    }
    if result.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
```

### Sentinel Errors

```go
var (
    ErrNotFound  = errors.New("not found")
    ErrDuplicate = errors.New("duplicate record")
)
```

### Pagination

```go
type PaginationParams struct {
    Limit  *int
    Offset *int
}

type PaginatedResult[T any] struct {
    Data   []T  `json:"data"`
    Count  int  `json:"count"`
    Limit  *int `json:"limit,omitempty"`
    Offset *int `json:"offset,omitempty"`
}
```

---

## Service Layer Pattern

**CRITICAL RULE: Handlers must NEVER contain calculations or business logic.**

Handlers are thin wrappers that:
1. Extract user context
2. Parse/validate request input
3. Call service methods
4. Return response

All calculations, transformations, and business logic MUST live in the service layer (`internal/financial_v2/{domain}/service.go`).

❌ **BAD** - Calculation in handler:
```go
func (h *Handler) GetUsage(w http.ResponseWriter, r *http.Request) {
    scenario, _ := h.store.GetScenario(ctx, id)
    // DON'T DO THIS - calculation belongs in service
    totalUsed := scenario.Borrower1CPF + scenario.Borrower2CPF
    interest := totalUsed * 0.025
    // ...
}
```

✅ **GOOD** - Handler delegates to service:
```go
func (h *Handler) GetUsage(w http.ResponseWriter, r *http.Request) {
    usage, err := h.service.ComputeUsage(ctx, userID, scenarioID)
    if err != nil {
        internalError(w, err)
        return
    }
    jsonResponse(w, http.StatusOK, usage)
}
```

Use services for complex business logic beyond simple CRUD:

```go
// internal/financial_v2/asset/service.go
type Service struct {
    store *repository.Store
}

func NewService(store *repository.Store) *Service {
    return &Service{store: store}
}

type UpdateInput struct {
    ID           string
    Name         string
    CurrentValue decimal.Decimal
    UpdateMode   string  // "in_place" or "versioned"
}

func (s *Service) Update(ctx context.Context, userID string, input UpdateInput) (*repository.NonCashAsset, error) {
    switch input.UpdateMode {
    case "versioned":
        return s.versionedUpdate(ctx, userID, input)
    default:
        return s.inPlaceUpdate(ctx, userID, input)
    }
}

func (s *Service) versionedUpdate(ctx context.Context, userID string, input UpdateInput) (*repository.NonCashAsset, error) {
    // 1. Get current version
    current, err := s.store.GetNonCashAsset(ctx, userID, input.ID)
    if err != nil {
        return nil, err
    }

    // 2. End current version
    now := time.Now()
    current.EndDate = &now
    if _, err := s.store.UpdateNonCashAsset(ctx, userID, *current); err != nil {
        return nil, err
    }

    // 3. Create new version
    newVersion := repository.NonCashAsset{
        ParentID:     current.ParentID,
        Name:         input.Name,
        CurrentValue: input.CurrentValue,
        StartDate:    now,
        // ...
    }
    return s.store.CreateNonCashAsset(ctx, userID, newVersion)
}
```

---

## Domain Types

### Financial Entities

Use `decimal.Decimal` for all monetary values:

```go
import "github.com/shopspring/decimal"

type NonCashAsset struct {
    ID               string          `json:"id"`
    ParentID         string          `json:"parentId"`
    Name             string          `json:"name"`
    Category         string          `json:"category"`
    CurrentValue     decimal.Decimal `json:"currentValue"`
    AnnualGrowthRate decimal.Decimal `json:"annualGrowthRate"`
    StartDate        time.Time       `json:"startDate"`
    EndDate          *time.Time      `json:"endDate,omitempty"`
    TerminalValue    *decimal.Decimal `json:"terminalValue,omitempty"`
    GrowthStrategy   string          `json:"growthStrategy"`
    Notes            string          `json:"notes,omitempty"`
    ScenarioEventID  *string         `json:"scenarioEventId,omitempty"`
    ImpactKind       *string         `json:"impactKind,omitempty"`
}

type Expense struct {
    ID                string          `json:"id"`
    ParentID          string          `json:"parentId"`
    Name              string          `json:"name"`
    Amount            decimal.Decimal `json:"amount"`
    Frequency         string          `json:"frequency"`  // "monthly", "annual"
    Category          string          `json:"category"`
    GrowthRate        decimal.Decimal `json:"growthRate"`
    StartDate         time.Time       `json:"startDate"`
    EndDate           *time.Time      `json:"endDate,omitempty"`
    SourceLiabilityID *string         `json:"sourceLiabilityId,omitempty"`
}

type CashAccount struct {
    ID            string          `json:"id"`
    UserID        string          `json:"userId"`
    Name          string          `json:"name"`
    Balance       decimal.Decimal `json:"balance"`
    InterestRate  decimal.Decimal `json:"interestRate"`
    IsAccumulator bool            `json:"isAccumulator"`
    StartYear     int             `json:"startYear"`
}
```

---

## Error Handling

### Error Response Format

```go
type ErrorResponse struct {
    Error      string `json:"error"`
    Message    string `json:"message"`
    StatusCode int    `json:"status_code"`
}
```

### Handler Error Utilities

```go
func writeError(w http.ResponseWriter, statusCode int, errorCode string, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(ErrorResponse{
        Error:      errorCode,
        Message:    message,
        StatusCode: statusCode,
    })
}

func badRequest(w http.ResponseWriter, err error) {
    writeError(w, http.StatusBadRequest, "bad_request", err.Error())
}

func internalError(w http.ResponseWriter, err error) {
    log.Printf("internal error: %v", err)
    writeError(w, http.StatusInternalServerError, "internal_error", "internal server error")
}
```

### Error Wrapping

```go
// Always wrap errors with context
if err != nil {
    return nil, fmt.Errorf("create asset: %w", err)
}

// Check sentinel errors
if errors.Is(err, repository.ErrNotFound) {
    writeError(w, http.StatusNotFound, "not_found", "asset not found")
    return
}
```

---

## Middleware

### Middleware Chain Order

```go
// In routes setup
router.Use(middleware.CORS)
router.Use(middleware.RateLimit(rateLimiter))
router.Use(middleware.RequestID)
router.Use(middleware.Logging)
router.Use(middleware.Authenticate)
router.Use(middleware.RequireAuth)
```

### User Context

```go
type UserContext struct {
    UserID     string
    Token      string
    IsVerified bool
}

// Extract in handlers
func getUserID(r *http.Request) string {
    ctx := middleware.GetUserContext(r.Context())
    return ctx.UserID
}

func requireUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
    userID := getUserID(r)
    if userID == "" {
        writeError(w, http.StatusUnauthorized, "unauthorized", "authentication required")
        return "", false
    }
    return userID, true
}
```

---

## Dependency Injection

### Composition Root (main.go)

```go
func main() {
    // 1. Load configuration
    cfg := config.New()

    // 2. Initialize database
    pool, err := database.ConnectPgx(ctx, cfg.DatabaseURL)
    if err != nil {
        log.Fatal(err)
    }
    defer pool.Close()

    // 3. Initialize repositories
    store := repository.NewStore(pool)

    // 4. Initialize services
    assetService := asset.NewService(store)
    timelineService := timeline.NewService(store)

    // 5. Create handlers
    assetHandler := handlers.NewAssetV2Handler(store)
    timelineHandler := handlers.NewTimelineV2Handler(timelineService)

    // 6. Setup routes
    router := mux.NewRouter()
    routes.SetupV2Router(router, routes.V2Dependencies{
        FinStore:        store,
        TimelineService: timelineService,
    })

    // 7. Start server
    log.Printf("Server starting on port %s", cfg.Port)
    log.Fatal(http.ListenAndServe(":"+cfg.Port, router))
}
```

### Dependencies Struct

```go
// routes/v2.go
type V2Dependencies struct {
    FinStore        *repository.Store
    TimelineService *timeline.Service
}

func SetupV2Router(parent *mux.Router, deps V2Dependencies) {
    v2 := parent.PathPrefix("/api/v2").Subrouter()

    assetHandler := handlers.NewAssetV2Handler(deps.FinStore)
    assetHandler.RegisterRoutes(v2)

    // ...
}
```

---

## Testing

### E2E Test Pattern

```go
//go:build e2e
// +build e2e

package handlers_test

func TestAssetCreate(t *testing.T) {
    ts := testutil.NewTestServer(t)
    defer ts.Cleanup()

    input := map[string]interface{}{
        "name":         "Test Asset",
        "currentValue": "10000",
        "category":     "investment",
    }

    resp := ts.Request("POST", "/api/v2/assets").
        WithBody(input).
        Send()

    assert.Equal(t, http.StatusCreated, resp.StatusCode)

    var asset repository.NonCashAsset
    json.Unmarshal(resp.Body, &asset)
    assert.Equal(t, "Test Asset", asset.Name)
}
```

### Unit Test with Mock

```go
func TestAssetService_Update(t *testing.T) {
    mockStore := &mockStore{
        assets: map[string]*repository.NonCashAsset{
            "asset-1": {ID: "asset-1", Name: "Original"},
        },
    }

    service := asset.NewService(mockStore)

    result, err := service.Update(ctx, "user-1", asset.UpdateInput{
        ID:         "asset-1",
        Name:       "Updated",
        UpdateMode: "in_place",
    })

    assert.NoError(t, err)
    assert.Equal(t, "Updated", result.Name)
}
```

### Test Fixtures

```go
// internal/testutil/fixtures.go
func CreateAssetFixture(t *testing.T, pool *pgxpool.Pool, userID, name string) string {
    id := uuid.New().String()
    _, err := pool.Exec(context.Background(), `
        INSERT INTO finance_assets (id, user_id, name, current_value)
        VALUES ($1, $2, $3, $4)
    `, id, userID, name, decimal.NewFromInt(10000))
    require.NoError(t, err)
    return id
}
```

---

## Go Anti-Patterns to Avoid

❌ **Using float64 for money** - use `decimal.Decimal`
❌ **Ignoring errors** - always handle or wrap
❌ **SQL string concatenation** - use parameterized queries
❌ **Missing context propagation** - pass context through all layers
❌ **Concrete types for dependencies** - use interfaces for testability
❌ **Logging secrets** - never log tokens, passwords, or PII
❌ **Unbounded queries** - always paginate list endpoints
❌ **Missing request timeouts** - use context with deadline
❌ **Blocking main goroutine** - use separate goroutines for cleanup tasks
❌ **Naked returns in complex functions** - use named returns only when helpful
❌ **Magic numbers** - define named constants with clear meaning

### Magic Numbers

Never use unexplained numeric literals in code. Define constants with descriptive names:

```go
// ❌ BAD - magic numbers
interestRate := totalAmount.Mul(decimal.MustFromString("0.025"))
if monthsSinceStart > 360 {
    monthsSinceStart = 360
}
outstandingLoan := price.Mul(decimal.MustFromString("0.56"))

// ✅ GOOD - named constants
const (
    CPFAccruedInterestRate = "0.025" // 2.5% p.a. per CPF Board regulations
    MaxLoanTermMonths      = 360     // 30 years maximum loan term
    EstimatedLoanRemaining = "0.56"  // ~80% LTV * 70% remaining principal
)

interestRate := totalAmount.Mul(decimal.MustFromString(CPFAccruedInterestRate))
if monthsSinceStart > MaxLoanTermMonths {
    monthsSinceStart = MaxLoanTermMonths
}
outstandingLoan := price.Mul(decimal.MustFromString(EstimatedLoanRemaining))
```

Constants should be defined at:
- **Package level** for domain-specific values (rates, limits, thresholds)
- **Function level** for local loop bounds or array sizes
- Include comments explaining the source or reasoning for the value

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Handler | `{entity}_v2.go` | `asset_v2.go` |
| Repository | `{entity}.go` | `asset.go` |
| Service | `service.go` in domain folder | `asset/service.go` |
| Tests | `{file}_test.go` | `asset_test.go` |
| E2E Tests | `{feature}_e2e_test.go` | `asset_e2e_test.go` |
| Middleware | Descriptive name | `auth.go`, `ratelimit.go` |

---

## Swagger Documentation

**IMPORTANT**: After adding or modifying API endpoints, ALWAYS regenerate swagger documentation.

### Regenerate Swagger

```bash
cd backend && /Users/jitcorn/go/bin/swag init -g cmd/server/main.go -o cmd/server/docs --parseDependency --parseInternal
```

Or use the make target:
```bash
make swagger
```

### When to Regenerate

Regenerate swagger when you:
- Add new API endpoints
- Modify request/response structs
- Change swagger annotations (`@Summary`, `@Param`, etc.)
- Add or remove handler methods

### Swagger Annotations

Document endpoints in handlers using swaggo annotations:

```go
// ListAssets godoc
// @Summary List all assets
// @Description Get paginated list of non-cash assets for the authenticated user
// @Tags Assets
// @Accept json
// @Produce json
// @Param limit query int false "Max results" default(50)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {object} repository.PaginatedResult[repository.NonCashAsset]
// @Failure 401 {object} ErrorResponse
// @Router /api/v2/assets [get]
func (h *AssetV2Handler) List(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

---

## Quick Reference

```go
// Import paths
import (
    "github.com/gorilla/mux"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/shopspring/decimal"
)

// Common operations
id := uuid.New().String()                    // Generate UUID
dec := decimal.NewFromString("100.50")       // Parse decimal
now := time.Now().UTC()                      // Current time (always UTC)
vars := mux.Vars(r)                          // Get URL params
id := vars["id"]                             // Extract param
```
