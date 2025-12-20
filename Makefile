.PHONY: help build run test test-e2e clean docker-up docker-down migrate

# Default target
help:
	@echo "Available targets:"
	@echo "  build      - Build the Go backend"
	@echo "  run        - Run the Go backend locally"
	@echo "  test       - Run unit tests"
	@echo "  test-e2e   - Run E2E tests (requires test database)"
	@echo "  clean      - Clean build artifacts"
	@echo "  docker-up  - Start services with Docker Compose"
	@echo "  docker-down - Stop Docker Compose services"
	@echo "  migrate    - Run database migrations"

# Build the Go backend
build:
	@echo "Building Go backend..."
	cd backend && go build -o ../bin/server cmd/server/main.go

# Run the backend locally
run: build
	@echo "Starting backend server..."
	./bin/server

# Run unit tests
test:
	@echo "Running unit tests..."
	cd backend && go test -v ./...

# Run E2E tests (requires test database)
# Start test database with: docker-compose -f docker-compose.test.yml up -d test-db
test-e2e:
	@echo "Starting test database..."
	docker-compose -f docker-compose.test.yml up -d test-db
	@echo "Waiting for database to be ready..."
	@sleep 3
	@echo "Running E2E tests..."
	TEST_DATABASE_URL="postgres://testuser:testpass@localhost:5433/financial_chat_test?sslmode=disable" \
		cd backend && go test -tags=e2e -v ./internal/e2e/... || (docker-compose -f docker-compose.test.yml down && exit 1)
	@echo "Stopping test database..."
	docker-compose -f docker-compose.test.yml down

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/

# Start Docker Compose services
docker-up:
	@echo "Starting services with Docker Compose..."
	docker-compose up -d

# Stop Docker Compose services
docker-down:
	@echo "Stopping Docker Compose services..."
	docker-compose down

# Run database migrations
migrate:
	@echo "Running database migrations..."
	# TODO: Implement proper migration runner
	@echo "Migrations will be run automatically on server start"

# Development setup
dev-setup:
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file from example"; fi
	@echo "Please update .env with your API keys"
	@echo "Run 'make docker-up' to start the services"

# Install Go dependencies
deps:
	@echo "Installing Go dependencies..."
	go mod download
	go mod tidy