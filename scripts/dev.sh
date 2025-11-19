#!/bin/bash

# Financial Chat System Development Server
# Starts the backend server with hot reload and development settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Financial Chat System Development Server${NC}"
echo "============================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env file with your API keys and restart${NC}"
    exit 1
fi

# Check if database is running
echo -e "${BLUE}🔍 Checking database connection...${NC}"
if ! docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Database not running. Starting it now...${NC}"
    docker-compose -f docker/docker-compose.yml up -d postgres

    # Wait for database to be ready
    echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
    until docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat; do
        sleep 2
    done
fi

echo -e "${GREEN}✅ Database is ready${NC}"

# Build the server if binary doesn't exist or source is newer
if [ ! -f bin/server ] || [ backend/cmd/server/main.go -nt bin/server ]; then
    echo -e "${BLUE}🔨 Building backend server...${NC}"
    mkdir -p bin
    cd backend
    go mod tidy
    go build -o ../bin/server ./cmd/server
    cd ..
    echo -e "${GREEN}✅ Backend built successfully${NC}"
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Start the server
echo -e "${GREEN}🎯 Starting backend server on http://localhost:${PORT:-8080}${NC}"
echo -e "${BLUE}📊 Available endpoints:${NC}"
echo "  • GET  /health           - Health check"
echo "  • GET  /api/v1/tools     - List available financial tools"
echo "  • POST /api/v1/chat      - Chat endpoint (when B6 is implemented)"
echo "  • POST /api/v1/dispatch  - Action dispatch (when B7 is implemented)"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the server${NC}"
echo "============================================================="

# Run the server with automatic restart on file changes in development
if command -v entr > /dev/null 2>&1; then
    echo -e "${BLUE}🔄 File watching enabled with entr${NC}"
    find backend -name "*.go" | entr -r ./bin/server
else
    echo -e "${YELLOW}📝 Install 'entr' for automatic restart on file changes${NC}"
    echo -e "${YELLOW}📝 Command: brew install entr (macOS) or apt install entr (Ubuntu)${NC}"
    ./bin/server
fi