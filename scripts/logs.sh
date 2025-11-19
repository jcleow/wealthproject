#!/bin/bash

# Financial Chat System Logs Viewer
# Shows logs from Docker containers and backend server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Financial Chat System Logs${NC}"
echo "============================="

# Check command line arguments
SERVICE=${1:-"all"}
FOLLOW=${2:-"--follow"}

case $SERVICE in
    "postgres"|"db")
        echo -e "${BLUE}🗄️  PostgreSQL Database Logs:${NC}"
        docker logs financial-chat-postgres $FOLLOW
        ;;
    "redis")
        echo -e "${BLUE}🔴 Redis Logs:${NC}"
        docker logs financial-chat-redis $FOLLOW
        ;;
    "backend"|"server")
        echo -e "${BLUE}⚙️  Backend Server Logs:${NC}"
        if [ -f "logs/server.log" ]; then
            tail -f logs/server.log
        else
            echo -e "${YELLOW}📝 No backend logs found. Server logs will appear here when running.${NC}"
            echo -e "${YELLOW}💡 Start the server with: ./scripts/dev.sh${NC}"
        fi
        ;;
    "all"|*)
        echo -e "${BLUE}📊 All Service Logs:${NC}"
        echo -e "${YELLOW}💡 Press Ctrl+C to stop following logs${NC}"
        echo ""

        # Show logs from all containers
        docker-compose -f docker/docker-compose.yml logs $FOLLOW
        ;;
esac

echo ""
echo -e "${BLUE}💡 Usage examples:${NC}"
echo "  ./scripts/logs.sh postgres     - Show database logs"
echo "  ./scripts/logs.sh redis        - Show Redis logs"
echo "  ./scripts/logs.sh backend      - Show backend server logs"
echo "  ./scripts/logs.sh all          - Show all service logs (default)"
echo "  ./scripts/logs.sh postgres -n  - Show last logs without following"