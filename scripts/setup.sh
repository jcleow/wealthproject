#!/bin/bash

# Financial Chat System Setup Script
# Sets up development environment with database and backend server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 Financial Chat System - Setup Script${NC}"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your API keys before running the server${NC}"
fi

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Start PostgreSQL database
echo -e "${BLUE}🗄️  Starting PostgreSQL database...${NC}"
docker-compose -f docker/docker-compose.yml up -d postgres

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# Check if database is accessible
until docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat; do
    echo -e "${YELLOW}⏳ Database not ready yet, waiting...${NC}"
    sleep 2
done

echo -e "${GREEN}✅ Database is ready${NC}"

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
if [ -d "backend/migrations" ] && [ "$(ls -A backend/migrations)" ]; then
    # TODO: Add migration runner when we implement B8
    echo -e "${YELLOW}📝 Migrations will be implemented in ticket B8${NC}"
else
    echo -e "${YELLOW}📝 No migrations found yet${NC}"
fi

# Build Go backend
echo -e "${BLUE}🔨 Building Go backend...${NC}"
cd backend
go mod tidy
go build -o ../bin/server ./cmd/server
cd ..

echo -e "${GREEN}✅ Backend built successfully${NC}"

# Show next steps
echo ""
echo -e "${GREEN}🚀 Setup Complete!${NC}"
echo "=================================================="
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit .env file with your API keys"
echo "2. Run: ${GREEN}./scripts/dev.sh${NC} to start development server"
echo "3. Backend will be available at: ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo "- ${GREEN}./scripts/dev.sh${NC}     - Start development server"
echo "- ${GREEN}./scripts/test.sh${NC}    - Run tests"
echo "- ${GREEN}./scripts/clean.sh${NC}   - Clean up containers"
echo "- ${GREEN}./scripts/logs.sh${NC}    - View logs"
echo ""
echo -e "${YELLOW}📋 Database Info:${NC}"
echo "- Host: localhost:5432"
echo "- Database: financial_chat"
echo "- User: financial_user"
echo "- Password: (check .env file)"