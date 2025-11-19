#!/bin/bash
set -e

echo "🏦 Financial Chat System - Setup Script"
echo "======================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys before running the server"
fi

# Start PostgreSQL database
echo "🗄️  Starting PostgreSQL database..."
docker-compose -f docker/docker-compose.yml up -d postgres

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 5

until docker exec financial-chat-postgres pg_isready -U financial_user -d financial_chat 2>/dev/null; do
    echo "⏳ Database not ready yet, waiting..."
    sleep 2
done

echo "✅ Database is ready"

# Build Go backend
echo "🔨 Building Go backend..."
cd backend
go mod tidy
go build -o ../bin/server ./cmd/server
cd ..

echo "✅ Backend built successfully"
echo ""
echo "🚀 Setup Complete!"
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run: ./scripts/dev.sh to start development server"
echo "3. Backend will be available at: http://localhost:8080"
