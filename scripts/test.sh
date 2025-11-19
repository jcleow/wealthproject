#!/bin/bash

# Financial Chat System Test Runner
# Runs tests for the backend application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Financial Chat System Tests${NC}"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo -e "${RED}❌ go.mod not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Build tests first
echo -e "${BLUE}📦 Building test dependencies...${NC}"
go mod tidy

# Run tests
echo -e "${BLUE}🏃 Running unit tests...${NC}"
cd backend
go test ./... -v -race -coverprofile=coverage.out

# Generate coverage report
echo -e "${BLUE}📊 Generating coverage report...${NC}"
go tool cover -html=coverage.out -o coverage.html

echo -e "${GREEN}✅ Tests completed!${NC}"
echo -e "${BLUE}📋 Coverage report generated: backend/coverage.html${NC}"

# Run linting if available
if command -v golangci-lint > /dev/null 2>&1; then
    echo -e "${BLUE}🔍 Running linter...${NC}"
    golangci-lint run
    echo -e "${GREEN}✅ Linting completed!${NC}"
else
    echo -e "${YELLOW}💡 Install golangci-lint for code linting${NC}"
    echo -e "${YELLOW}   Command: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest${NC}"
fi

# Run security checks if available
if command -v gosec > /dev/null 2>&1; then
    echo -e "${BLUE}🔒 Running security checks...${NC}"
    gosec ./...
    echo -e "${GREEN}✅ Security checks completed!${NC}"
else
    echo -e "${YELLOW}💡 Install gosec for security scanning${NC}"
    echo -e "${YELLOW}   Command: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest${NC}"
fi

cd ..

echo ""
echo -e "${GREEN}🎉 All checks completed successfully!${NC}"