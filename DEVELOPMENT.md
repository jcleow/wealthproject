# Financial Chat System - Development Guide

## Quick Start

### 1. Setup Development Environment
```bash
# Run the automated setup (starts database, builds backend)
./scripts/setup.sh
```

### 2. Start Development Server
```bash
# Start the backend development server
./scripts/dev.sh
```

### 3. Test the API
The backend will be running at `http://localhost:8080`

**Available Endpoints:**
- `GET /api/v1/health` - Health check with system status
- `GET /api/v1/tools` - List available financial tools
- `GET /api/dev/token` - Generate dev auth token (dev mode only)

**Example requests:**
```bash
# Health check
curl http://localhost:8080/api/v1/health

# List financial tools
curl http://localhost:8080/api/v1/tools
```

### 4. Generating Dev Auth Tokens

Most API endpoints require authentication. In development, use the dev token endpoint:

```bash
# Generate a token for a user (get user_id from your database)
curl "http://localhost:8080/api/dev/token?user_id=<your-user-uuid>"

# Response:
# {
#   "token": "eyJ...",
#   "userId": "...",
#   "expires": "...",
#   "usage": "curl -H \"X-Auth-Token: eyJ...\" http://localhost:8080/api/v2/..."
# }

# Use the token to call authenticated endpoints
TOKEN=$(curl -s "http://localhost:8080/api/dev/token?user_id=<your-user-uuid>" | jq -r .token)
curl -H "X-Auth-Token: $TOKEN" http://localhost:8080/api/v2/investments
```

**Note:** Dev tokens are valid for 24 hours. This endpoint returns 404 in production.

## What's Currently Implemented

### ✅ Backend Foundation (Tickets B0a-B5)
- **Repository Structure**: Go modules, proper project layout
- **API Versioning**: `/api/v1/` endpoints with middleware support
- **LLM Integration**: OpenAI provider with error handling and rate limiting
- **Financial Tools**: 5 complete tools with JSON schemas:
  - `createAsset` - Create financial assets
  - `updateAsset` - Update existing assets
  - `createLiability` - Create liabilities/debts
  - `updateLiability` - Update existing liabilities
  - `createPropertyScenario` - Property planning scenarios
- **Action Preview**: Human-readable descriptions with impact estimates
- **Tool Registry**: Validation, categorization, and health checks

### 🚧 Coming Next (Tickets B6-B8)
- **Chat API Handler** (B6) - LLM conversation endpoint
- **Action Dispatch API** (B7) - Execute approved financial actions
- **Session Management** (B8) - PostgreSQL-backed conversation state

## Development Scripts

- `./scripts/setup.sh` - Initial environment setup
- `./scripts/dev.sh` - Start development server
- `./scripts/test.sh` - Run tests (when implemented)
- `./scripts/clean.sh` - Clean up Docker containers
- `./scripts/logs.sh` - View service logs

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Database settings (defaults work for development)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_chat
```

### Docker Services
- **PostgreSQL**: Runs on localhost:5432 (for session storage)
- **Redis**: Available on localhost:6379 (future use)

## Architecture Overview

```
financial-chat-system/
├── backend/                 # Go backend
│   ├── cmd/server/         # HTTP server entry point
│   ├── internal/           # Private application code
│   │   ├── config/         # Environment configuration
│   │   ├── financial/      # Financial tools & logic
│   │   ├── llm/           # LLM client interfaces
│   │   └── middleware/     # HTTP middleware
│   └── migrations/         # Database migrations
├── docker/                 # Docker Compose setup
├── scripts/               # Development scripts
└── specs/                 # Architecture docs & tickets
```

## Next Steps

1. **Add your OpenAI API key** to `.env` file
2. **Test the current endpoints** to see the financial tools
3. **Ready for B6-B8 implementation** - Chat API, Action Dispatch, Sessions

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose -f docker/docker-compose.yml up -d postgres
```

### Build Issues
```bash
# Clean and rebuild
rm -rf bin/
cd backend && go mod tidy && go build -o ../bin/server ./cmd/server
```

### View Logs
```bash
# Backend server logs (when running)
./scripts/logs.sh backend

# Database logs
./scripts/logs.sh postgres
```

---

🚀 **Ready to build the future of financial planning with AI!**