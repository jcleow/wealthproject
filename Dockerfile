# Multi-stage build for Go backend
# Use Go 1.24 to match go.mod requirement
FROM golang:1.24-alpine AS backend-builder

# Install git for dependency resolution
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY backend/ ./backend/

# Build the application
RUN go build -o main backend/cmd/server/main.go

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=backend-builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
