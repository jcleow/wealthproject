# Wealthproject

A comprehensive financial planning web application with Singapore-specific modules for CPF, insurance, property, vehicle, and tax planning. Features interactive net worth projections, AI-powered chat assistance, and scenario modeling.

## Features

### Dashboard & Net Worth Projections
- Interactive 35-year financial timeline with zoom/pan (Chart.js)
- Consolidated view of assets, liabilities, income, expenses, investments, and cash accounts
- Scenario planning with "what-if" timeline events (job change, property purchase, etc.)
- Multi-person support for family financial planning

### CPF Planner
- Contribution calculator with accurate OW/AW wage classification
- Account projections across OA, SA, MA, and RA
- Age 55 conversion simulator and CPF LIFE payout estimator
- Housing usage tracking with accrued interest
- Top-up tax relief calculator

### Insurance Planner
- Coverage gap analysis (Life, Critical Illness, Health, Disability)
- Government schemes integration (MediShield Life, CareShield Life, DPS)
- Policy management dashboard with protection score
- Milestone-based alerts and net worth integration

### Property Planner
- HDB (BTO/Resale), Private, and EC property modeling
- Interactive Gantt-style timeline with CPF OA usage tracking
- Mortgage calculator with MSR/TDSR compliance
- Grant eligibility and stamp duty calculations

### Vehicle Planner
- Singapore car ownership cost modeling with COE calculator
- Depreciation with PARF rebates
- Total cost of ownership projections

### Tax Planner
- Singapore income tax projections with multi-year planning
- Tax relief optimization

### AI Chat Assistant
- LLM-powered financial assistant with tool calling
- Multi-provider support (OpenAI, Anthropic, Gemini)
- Manual action review — users preview and approve AI-generated financial changes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (Turbopack), React 18, TypeScript |
| Styling | Tailwind CSS, Framer Motion, GSAP |
| State | TanStack Query (server), Zustand (client) |
| Forms | React Hook Form + Zod |
| UI Primitives | Radix UI, React Aria Components, Lucide icons |
| Charts | Chart.js + react-chartjs-2, Recharts |
| Backend | Go 1.24, Gorilla Mux |
| Database | PostgreSQL 15 (Supabase) |
| Auth | Better Auth with OAuth |
| Testing | Vitest (unit), Playwright (E2E), Storybook |
| Infrastructure | Docker Compose, Caddy (reverse proxy) |

## Quick Start

### Prerequisites

- Go 1.24+
- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Clone and configure environment

```bash
git clone <repository-url>
cd wealthproject
cp .env.dev.example .env
```

Edit `.env` and fill in the required values:

```bash
# Required
DATABASE_URL=postgres://...        # Supabase or local PostgreSQL
JWT_SECRET=your-jwt-secret
BACKEND_SHARED_SECRET=your-shared-secret

# Optional — AI chat features
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
PRIMARY_LLM=openai                 # openai | anthropic | gemini
```

### 2. Start with Docker Compose (recommended)

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts the backend, frontend, database, and Caddy reverse proxy.

### 3. Or run services individually

**Backend:**
```bash
make run
# Runs on http://localhost:8080
# Swagger docs: http://localhost:8080/swagger/index.html
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

### 4. Access the app

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Swagger docs:** http://localhost:8080/swagger/index.html

## Development

### Makefile Commands

```bash
make build          # Build Go backend
make run            # Build and run backend
make test           # Run Go unit tests
make test-e2e       # Run E2E tests (starts test database)
make docker-up      # Start Docker Compose services
make docker-down    # Stop Docker Compose services
make swagger        # Regenerate Swagger docs
make clean          # Remove build artifacts
```

### Frontend Scripts

```bash
pnpm dev            # Start dev server (Turbopack)
pnpm build          # Production build
pnpm type-check     # TypeScript validation
pnpm lint           # ESLint
pnpm test           # Vitest unit tests
pnpm storybook      # Component explorer on :6006
```

### E2E Tests (Playwright)

```bash
cd frontend
npx playwright test
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development setup, auth token generation, and troubleshooting.

## Project Structure

```
wealthproject/
├── backend/                  # Go backend
│   ├── cmd/server/          # HTTP server, routes, handlers, Swagger docs
│   ├── internal/            # Config, database, financial logic, CPF engine,
│   │                        # LLM providers, middleware, sessions
│   └── migrations/          # SQL migration files
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages & API routes
│   │   ├── components/      # React components (ui, dashboard, cpf,
│   │   │                    # insurance, vehicle-planner, modals, chat, etc.)
│   │   ├── hooks/           # Custom hooks & TanStack Query hooks
│   │   ├── services/        # API client layer
│   │   ├── lib/             # Utilities, formatting, CPF/vehicle helpers
│   │   └── types/           # TypeScript definitions
│   └── e2e/                 # Playwright E2E tests
├── specs/                    # Feature specifications & backlog
├── design/                   # Design files (.pen)
├── scripts/                  # Dev scripts (setup, dev, clean, logs)
├── docker-compose.dev.yml    # Development environment
├── docker-compose.prod.yml   # Production environment
├── Makefile                  # Build automation
└── DEVELOPMENT.md            # Detailed dev guide
```

## License

[License TBD]
