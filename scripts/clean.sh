#!/bin/bash

# Financial Chat System Cleanup Script
# Stops containers and cleans up development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Cleaning up Financial Chat System${NC}"
echo "======================================="

# Stop all containers
echo -e "${YELLOW}🛑 Stopping Docker containers...${NC}"
docker-compose -f docker/docker-compose.yml down

# Remove volumes (optional, ask user)
read -p "$(echo -e ${YELLOW}❓ Remove database volumes? This will delete all data. [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️  Removing Docker volumes...${NC}"
    docker-compose -f docker/docker-compose.yml down -v
    docker volume prune -f
    echo -e "${GREEN}✅ Volumes removed${NC}"
fi

# Clean up built binaries
echo -e "${YELLOW}🧹 Cleaning up build artifacts...${NC}"
rm -rf bin/
rm -rf backend/coverage.out
rm -rf backend/coverage.html

# Clean up Go module cache (optional)
read -p "$(echo -e ${YELLOW}❓ Clean Go module cache? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning Go module cache...${NC}"
    go clean -modcache
    echo -e "${GREEN}✅ Go cache cleaned${NC}"
fi

# Show remaining containers and images
echo ""
echo -e "${BLUE}📋 Remaining Docker resources:${NC}"
echo -e "${YELLOW}Containers:${NC}"
docker ps -a --filter name=financial-chat

echo -e "${YELLOW}Images:${NC}"
docker images --filter reference="*financial*"

echo ""
echo -e "${GREEN}✨ Cleanup completed!${NC}"
echo -e "${BLUE}💡 To start fresh, run: ./scripts/setup.sh${NC}"