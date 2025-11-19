#!/bin/bash

# Financial Chat System - Stop All Services Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping Financial Chat System...${NC}"
echo "=================================="

# Kill any process on port 3000 (frontend)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${BLUE}Stopping frontend on port 3000...${NC}"
    kill $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null || true
fi

# Kill any process on port 8080 (backend)
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${BLUE}Stopping backend on port 8080...${NC}"
    kill $(lsof -Pi :8080 -sTCP:LISTEN -t) 2>/dev/null || true
fi

# Stop database
if docker ps | grep financial-chat-postgres > /dev/null 2>&1; then
    echo -e "${BLUE}Stopping PostgreSQL database...${NC}"
    docker-compose -f docker/docker-compose.yml down
fi

# Clean up PID file
rm -f /tmp/financial-chat-pids.txt

echo -e "${GREEN}✅ All services stopped${NC}"