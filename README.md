# Financial Chat System

A modern financial planning chat application with LLM-native tool calling architecture.

## Architecture

- **Backend:** Go with REST APIs for LLM integration and financial tool execution
- **Frontend:** React 18 + TypeScript with custom chat implementation (no AI SDK)
- **Database:** PostgreSQL for session and conversation management
- **LLM Integration:** OpenAI GPT-4 and Anthropic Claude support

## Features

- **LLM-Native Tool Calling:** Replace complex intent parsing with OpenAI function calling
- **Manual Action Review:** Users preview and approve AI-generated financial actions
- **Session Management:** Persistent conversation context and state
- **Financial Tools:** Create/update assets, liabilities, and property scenarios
- **API Versioning:** Future-proof REST API with semantic versioning

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd financial-chat-system
   make dev-setup
   ```

2. **Configure environment:**
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Add your API keys to .env
   vim .env
   ```

3. **Start services:**
   ```bash
   # Start with Docker Compose (recommended)
   make docker-up

   # Or run locally
   make run
   ```

4. **Access the application:**
   - Backend API: http://localhost:8080
   - Frontend: http://localhost:3000
   - Health check: http://localhost:8080/api/v1/health

## Development

### Backend Development

```bash
# Install dependencies
make deps

# Build backend
make build

# Run tests
make test

# Run locally
make run
```

### Project Structure

```
financial-chat-system/
├── backend/
│   ├── cmd/server/          # Application entrypoint
│   ├── internal/
│   │   ├── llm/            # LLM provider abstractions
│   │   ├── financial/      # Financial tools and logic
│   │   ├── middleware/     # HTTP middleware
│   │   └── database/       # Database connections
│   └── migrations/         # Database migrations
├── frontend/
│   └── src/
│       ├── components/     # React components
│       ├── hooks/          # Custom React hooks
│       └── services/       # API client
├── docker-compose.yml      # Development environment
└── Makefile               # Build automation
```

## API Documentation

### Endpoints

- `POST /api/v1/chat` - Send messages and receive action previews
- `POST /api/v1/financial/actions/dispatch` - Execute approved actions
- `GET /api/v1/health` - Service health check

### Example Chat Flow

1. **User message:**
   ```json
   POST /api/v1/chat
   {
     "message": "I have a house worth 500k and a mortgage of 300k",
     "chat_id": "chat_123",
     "session_id": "session_456"
   }
   ```

2. **AI response with actions:**
   ```json
   {
     "content": "I'll help you add these to your financial profile.",
     "proposed_actions": [
       {
         "call_id": "action_1",
         "tool_name": "create_asset",
         "friendly_description": "Create house asset worth $500,000",
         "parameters": {"name": "House", "currentValue": 500000},
         "estimated_impact": {"net_worth_change": 500000}
       }
     ],
     "requires_approval": true
   }
   ```

3. **User approves actions:**
   ```json
   POST /api/v1/financial/actions/dispatch
   {
     "selected_actions": [
       {"call_id": "action_1", "approved": true}
     ],
     "session_id": "session_456"
   }
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://...` |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `JWT_SECRET` | JWT signing secret | Required |

## Contributing

1. Follow the ticket-based development approach
2. Backend tickets: See `specs/rewrite-phase-1/backend-tickets.txt`
3. Frontend tickets: See `specs/rewrite-phase-1/frontend-tickets.txt`
4. Maintain API contract compatibility

## License

[License TBD]