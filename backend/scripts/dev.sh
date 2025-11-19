#!/bin/bash
set -e

echo "🚀 Starting Financial Chat System Development Server"
echo "===================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Run ./scripts/setup.sh first"
    exit 1
fi

# Check database
if ! docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat > /dev/null 2>&1; then
    echo "⚠️  Database not running. Starting it now..."
    docker-compose -f docker/docker-compose.yml up -d postgres
    
    echo "⏳ Waiting for database..."
    until docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat 2>/dev/null; do
        sleep 2
    done
fi

echo "✅ Database is ready"

# Build if needed
if [ ! -f bin/server ] || [ backend/cmd/server/main.go -nt bin/server ]; then
    echo "🔨 Building backend server..."
    mkdir -p bin
    cd backend
    go mod tidy
    go build -o ../bin/server ./cmd/server
    cd ..
    echo "✅ Backend built successfully"
fi

# Load environment and start server
export $(grep -v '^#' .env | xargs)
echo "🎯 Starting backend server on http://localhost:${PORT:-8080}"
echo "📊 Available endpoints:"
echo "  • GET  /api/v1/health  - Health check"
echo "  • GET  /api/v1/tools   - List financial tools"
echo ""
echo "💡 Press Ctrl+C to stop the server"
echo "===================================================="

./bin/server
