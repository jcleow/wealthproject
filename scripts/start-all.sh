#!/bin/bash

# Financial Chat System - Complete Stack Startup Script
# Starts: Database → Backend → Frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# PID file for cleanup
PIDS_FILE="/tmp/financial-chat-pids.txt"
rm -f $PIDS_FILE

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all services...${NC}"

    # Kill frontend
    if [ -n "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${BLUE}   Stopping frontend (PID: $FRONTEND_PID)${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Kill backend
    if [ -n "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${BLUE}   Stopping backend (PID: $BACKEND_PID)${NC}"
        kill $BACKEND_PID 2>/dev/null || true
    fi

    # Stop database
    echo -e "${BLUE}   Stopping database...${NC}"
    docker-compose -f docker/docker-compose.yml down

    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and other signals
trap cleanup INT TERM EXIT

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     🏦 Financial Chat System - Complete Stack 🏦      ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${CYAN}[1/4] Checking prerequisites...${NC}"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker is running${NC}"

# Check Node/npm
if ! command -v npm > /dev/null 2>&1; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ npm is installed${NC}"

# Check Go
if ! command -v go > /dev/null 2>&1; then
    echo -e "${RED}❌ Go is not installed. Please install Go first.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Go is installed${NC}"

# Check .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env file with your API keys and restart${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ .env file exists${NC}"

# Step 2: Start Database
echo ""
echo -e "${CYAN}[2/4] Starting PostgreSQL database...${NC}"
docker-compose -f docker/docker-compose.yml up -d postgres

# Wait for database to be ready
echo -e "${YELLOW}  ⏳ Waiting for database...${NC}"
until docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat > /dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}  ✓ Database ready on port 5432${NC}"

# Step 3: Build and Start Backend
echo ""
echo -e "${CYAN}[3/4] Starting Backend Server...${NC}"

# Build backend fresh on every start to pick up code changes
echo -e "${YELLOW}  🔨 Building backend...${NC}"
mkdir -p bin
cd backend
go mod tidy > /dev/null 2>&1
go build -o ../bin/server ./cmd/server
cd ..
echo -e "${GREEN}  ✓ Backend built${NC}"

# Load environment variables (exclude comments and empty lines)
set -a
source <(grep -v '^#' .env | grep -v '^$' | sed 's/#.*//')
set +a

# Start backend
MIGRATIONS_DIR=${MIGRATIONS_DIR:-"backend/migrations"} ./bin/server > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> $PIDS_FILE

# Wait for backend to be ready
echo -e "${YELLOW}  ⏳ Waiting for backend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:${PORT:-8080}/api/v1/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

if curl -s http://localhost:${PORT:-8080}/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Backend ready on port ${PORT:-8080}${NC}"
else
    echo -e "${RED}  ❌ Backend failed to start. Check /tmp/backend.log${NC}"
    exit 1
fi

# Step 4: Install dependencies and Start Frontend
echo ""
echo -e "${CYAN}[4/4] Starting Frontend...${NC}"

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo -e "${YELLOW}  📦 Installing frontend dependencies...${NC}"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
fi

# Start frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> $PIDS_FILE
cd ..

# Wait for frontend to be ready
echo -e "${YELLOW}  ⏳ Waiting for frontend...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Frontend ready on port 3000${NC}"
else
    echo -e "${YELLOW}  ⚠️  Frontend might still be starting up...${NC}"
fi

# Success message
echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║            🎉 All Services Running! 🎉                ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "  ${GREEN}●${NC} Database:  ${GREEN}http://localhost:5432${NC}"
echo -e "  ${GREEN}●${NC} Backend:   ${GREEN}http://localhost:${PORT:-8080}${NC}"
echo -e "  ${GREEN}●${NC} Frontend:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}📚 Available Backend Endpoints:${NC}"
echo -e "  • GET  /api/v1/health  - Health check"
echo -e "  • GET  /api/v1/tools   - List financial tools"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "  • Backend:  tail -f /tmp/backend.log"
echo -e "  • Frontend: tail -f /tmp/frontend.log"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and show logs
tail -f /tmp/backend.log /tmp/frontend.log
