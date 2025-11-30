# BetterAuth Environment Configuration Guide

## Overview

This guide provides comprehensive environment configuration for BetterAuth integration across development, staging, and production environments.

## Required Environment Variables

### Core BetterAuth Configuration

#### BETTERAUTH_SECRET
**Purpose**: Primary secret for signing sessions, cookies, and tokens
**Format**: 256-bit base64 or hex string (minimum 32 characters)
**Critical**: Must be identical across frontend and backend

```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Or use base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Example: YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw
```

#### BETTERAUTH_URL
**Purpose**: Base URL for BetterAuth callbacks and redirects
**Format**: Full URL with protocol

```bash
# Development
BETTERAUTH_URL="https://verylocal:3000"

# Production
BETTERAUTH_URL="https://yourdomain.com"

# Staging
BETTERAUTH_URL="https://staging.yourdomain.com"
```

#### NEXT_PUBLIC_BETTERAUTH_URL
**Purpose**: Client-side BetterAuth URL (must match BETTERAUTH_URL)
**Format**: Full URL accessible from browser

```bash
# Development
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"

# Production
NEXT_PUBLIC_BETTERAUTH_URL="https://yourdomain.com"
```

### Database Configuration

#### DATABASE_URL
**Purpose**: PostgreSQL connection string for BetterAuth tables
**Format**: PostgreSQL connection URI

```bash
# Development
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"

# Production (with SSL)
DATABASE_URL="postgres://user:password@hostname:5432/database?sslmode=require"

# Staging
DATABASE_URL="postgres://staging_user:staging_pass@staging-db:5432/financial_chat_staging?sslmode=require"
```

### Backend Integration

#### GO_BACKEND_URL
**Purpose**: Internal URL for Next.js to call Go backend
**Format**: HTTP/HTTPS URL (typically internal/localhost)

```bash
# Development
GO_BACKEND_URL="http://verylocal:8080/api/v1"

# Production (internal service)
GO_BACKEND_URL="http://backend:8080/api/v1"

# With load balancer
GO_BACKEND_URL="https://internal-api.yourdomain.com/api/v1"
```

## Environment-Specific Configurations

### Development Environment

#### Frontend `.env.local`
```bash
# BetterAuth Core
BETTERAUTH_SECRET="dev_secret_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
BETTERAUTH_URL="https://verylocal:3000"
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"

# Database
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"

# Backend Integration
GO_BACKEND_URL="http://verylocal:8080/api/v1"

# Development Features
NODE_ENV="development"
HTTPS=true
NEXT_PUBLIC_DEBUG_AUTH=true

# Optional OAuth (for testing)
GOOGLE_CLIENT_ID="your-dev-google-client-id"
GOOGLE_CLIENT_SECRET="your-dev-google-client-secret"
GITHUB_CLIENT_ID="your-dev-github-client-id"
GITHUB_CLIENT_SECRET="your-dev-github-client-secret"

# Debug flags
DEBUG=better-auth:*
NEXT_DEBUG=true
```

#### Backend `.env`
```bash
# BetterAuth Integration
BETTERAUTH_SECRET="dev_secret_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# Database
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"

# Server Configuration
PORT=8080
API_VERSION=v1

# CORS Settings (for development)
CORS_ORIGIN="https://verylocal:3000"
CORS_CREDENTIALS=true

# LLM Configuration (existing)
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
PRIMARY_LLM="openai"

# Debug
DEBUG_AUTH=true
LOG_LEVEL=debug
```

### Production Environment

#### Frontend Environment Variables
```bash
# BetterAuth Core
BETTERAUTH_SECRET="${SECURE_GENERATED_SECRET}"
BETTERAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_BETTERAUTH_URL="https://yourdomain.com"

# Database (use connection pooling)
DATABASE_URL="postgres://prod_user:${DB_PASSWORD}@prod-db.internal:5432/financial_chat_prod?sslmode=require&pool_max_conns=20"

# Backend Integration (internal service)
GO_BACKEND_URL="http://financial-backend:8080/api/v1"

# Production Optimizations
NODE_ENV="production"
HTTPS=true
BETTERAUTH_ADVANCED_COOKIE_SECURITY=true

# OAuth Production Keys
GOOGLE_CLIENT_ID="${GOOGLE_PROD_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_PROD_CLIENT_SECRET}"
GITHUB_CLIENT_ID="${GITHUB_PROD_CLIENT_ID}"
GITHUB_CLIENT_SECRET="${GITHUB_PROD_CLIENT_SECRET}"

# Security Headers
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

#### Backend Environment Variables
```bash
# BetterAuth Integration
BETTERAUTH_SECRET="${SECURE_GENERATED_SECRET}"

# Database with connection pooling
DATABASE_URL="postgres://prod_user:${DB_PASSWORD}@prod-db.internal:5432/financial_chat_prod?sslmode=require&pool_max_conns=50"

# Server Configuration
PORT=8080
API_VERSION=v1
REQUEST_TIMEOUT=30

# Security
CORS_ORIGIN="https://yourdomain.com"
CORS_CREDENTIALS=true
JWT_SECRET="${JWT_PROD_SECRET}"

# Session Management
SESSION_TTL_HOURS=168  # 7 days
SESSION_CLEANUP_INTERVAL_MINUTES=60

# LLM Configuration
OPENAI_API_KEY="${OPENAI_PROD_KEY}"
ANTHROPIC_API_KEY="${ANTHROPIC_PROD_KEY}"
OPENAI_MAX_TOKENS=4000
ANTHROPIC_MAX_TOKENS=4000

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
SENTRY_DSN="${SENTRY_DSN}"

# Performance
MAX_REQUEST_SIZE=10485760  # 10MB
ENABLE_COMPRESSION=true
```

### Staging Environment

#### Staging Configuration
```bash
# BetterAuth Core
BETTERAUTH_SECRET="staging_secret_different_from_prod_and_dev"
BETTERAUTH_URL="https://staging.yourdomain.com"
NEXT_PUBLIC_BETTERAUTH_URL="https://staging.yourdomain.com"

# Database
DATABASE_URL="postgres://staging_user:${STAGING_DB_PASSWORD}@staging-db:5432/financial_chat_staging?sslmode=require"

# Backend Integration
GO_BACKEND_URL="http://staging-backend:8080/api/v1"

# Staging-specific features
NODE_ENV="production"
STAGING=true
ENABLE_DEBUG_LOGS=true

# OAuth Staging Keys
GOOGLE_CLIENT_ID="${GOOGLE_STAGING_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_STAGING_CLIENT_SECRET}"

# Testing flags
ALLOW_TEST_USERS=true
MOCK_PAYMENTS=true
```

## Docker Configuration

### Development Docker Compose

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - BETTERAUTH_SECRET=dev_secret_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
      - BETTERAUTH_URL=https://verylocal:3000
      - NEXT_PUBLIC_BETTERAUTH_URL=https://verylocal:3000
      - DATABASE_URL=postgres://financial_user:financial_pass_dev_2024@postgres:5432/financial_chat?sslmode=disable
      - GO_BACKEND_URL=http://backend:8080/api/v1
      - HTTPS=true
    volumes:
      - ./frontend:/app
    depends_on:
      - postgres
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    environment:
      - BETTERAUTH_SECRET=dev_secret_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
      - DATABASE_URL=postgres://financial_user:financial_pass_dev_2024@postgres:5432/financial_chat?sslmode=disable
      - PORT=8080
      - DEBUG_AUTH=true
    volumes:
      - ./backend:/app
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=financial_user
      - POSTGRES_PASSWORD=financial_pass_dev_2024
      - POSTGRES_DB=financial_chat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Docker Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    image: financial-chat-frontend:${VERSION}
    environment:
      - BETTERAUTH_SECRET=${BETTERAUTH_SECRET}
      - BETTERAUTH_URL=${BETTERAUTH_URL}
      - NEXT_PUBLIC_BETTERAUTH_URL=${BETTERAUTH_URL}
      - DATABASE_URL=${DATABASE_URL}
      - GO_BACKEND_URL=http://backend:8080/api/v1
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  backend:
    image: financial-chat-backend:${VERSION}
    environment:
      - BETTERAUTH_SECRET=${BETTERAUTH_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - PORT=8080
      - LOG_LEVEL=info
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
```

## Security Configuration

### Cookie Settings

#### Development
```typescript
// BetterAuth cookie config for development
{
  httpOnly: true,
  secure: true,           // Required even in development with HTTPS
  sameSite: 'lax',       // More permissive for development
  domain: 'verylocal',   // Match your development domain
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
}
```

#### Production
```typescript
// BetterAuth cookie config for production
{
  httpOnly: true,
  secure: true,
  sameSite: 'strict',    // Strict for production security
  domain: '.yourdomain.com', // Allow subdomains if needed
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
}
```

### HTTPS Configuration

#### Development HTTPS Setup

1. **Using mkcert (recommended)**:
```bash
# Install mkcert
brew install mkcert  # macOS
# or apt-get install mkcert  # Linux

# Create local CA
mkcert -install

# Generate certificate for verylocal
mkcert verylocal localhost 127.0.0.1

# Move certificates
mkdir -p frontend/certs/
mv verylocal+2.pem frontend/certs/cert.pem
mv verylocal+2-key.pem frontend/certs/key.pem
```

2. **Update Next.js for HTTPS**:

Create `frontend/next.config.js`:
```javascript
const fs = require('fs')
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],

  // HTTPS configuration for development
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      https: {
        key: fs.readFileSync(path.join(__dirname, 'certs/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
      },
    },
  }),

  async rewrites() {
    const backendBase = process.env.GO_BACKEND_URL || 'http://verylocal:8080/api/v1'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendBase}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
```

#### Production HTTPS

Use Let's Encrypt or your SSL provider:

```bash
# Example nginx SSL config
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Environment Variables for Observability

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
LOG_FORMAT=json                   # json, text
LOG_OUTPUT=stdout                 # stdout, file

# Metrics
ENABLE_PROMETHEUS=true
METRICS_PORT=9090

# Tracing
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
TRACE_SAMPLING_RATE=0.1          # 10% sampling

# Health Checks
HEALTH_CHECK_INTERVAL=30         # seconds
DATABASE_HEALTH_TIMEOUT=5        # seconds

# Performance
REQUEST_TIMEOUT=30               # seconds
DATABASE_CONNECTION_TIMEOUT=10   # seconds
DATABASE_IDLE_TIMEOUT=300       # seconds
```

## Environment Validation

### Validation Script

Create `scripts/validate-env.js`:

```javascript
#!/usr/bin/env node

const requiredVars = {
  development: [
    'BETTERAUTH_SECRET',
    'BETTERAUTH_URL',
    'NEXT_PUBLIC_BETTERAUTH_URL',
    'DATABASE_URL',
    'GO_BACKEND_URL',
  ],
  production: [
    'BETTERAUTH_SECRET',
    'BETTERAUTH_URL',
    'NEXT_PUBLIC_BETTERAUTH_URL',
    'DATABASE_URL',
    'GO_BACKEND_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ],
}

const environment = process.env.NODE_ENV || 'development'
const required = requiredVars[environment] || requiredVars.development

const missing = required.filter(varName => !process.env[varName])

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:')
  missing.forEach(varName => console.error(`   ${varName}`))
  process.exit(1)
}

// Validate formats
const validations = [
  {
    name: 'BETTERAUTH_SECRET',
    validate: (value) => value.length >= 32,
    error: 'BETTERAUTH_SECRET must be at least 32 characters',
  },
  {
    name: 'BETTERAUTH_URL',
    validate: (value) => /^https?:\/\//.test(value),
    error: 'BETTERAUTH_URL must be a valid URL',
  },
  {
    name: 'DATABASE_URL',
    validate: (value) => /^postgres:\/\//.test(value),
    error: 'DATABASE_URL must be a valid PostgreSQL connection string',
  },
]

const validationErrors = validations
  .filter(({ name }) => process.env[name])
  .filter(({ name, validate }) => !validate(process.env[name]))

if (validationErrors.length > 0) {
  console.error('❌ Environment variable validation errors:')
  validationErrors.forEach(({ name, error }) => console.error(`   ${name}: ${error}`))
  process.exit(1)
}

console.log('✅ All environment variables are valid!')
```

### Usage

Add to `package.json`:

```json
{
  "scripts": {
    "validate-env": "node scripts/validate-env.js",
    "dev": "npm run validate-env && next dev",
    "build": "npm run validate-env && next build",
    "start": "npm run validate-env && next start"
  }
}
```

## Environment-Specific Setup Instructions

### Quick Setup for Development

1. **Copy environment template**:
```bash
cp .env.example .env.local
```

2. **Generate secrets**:
```bash
# Generate BetterAuth secret
echo "BETTERAUTH_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')" >> .env.local
```

3. **Configure database**:
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Verify database connection
psql postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat -c "SELECT 1"
```

4. **Validate configuration**:
```bash
npm run validate-env
```

### Quick Setup for Production

1. **Set secrets in your deployment platform**:
```bash
# Using Docker Swarm secrets
echo "your-production-secret" | docker secret create betterauth_secret -

# Using Kubernetes secrets
kubectl create secret generic betterauth-secret \
  --from-literal=BETTERAUTH_SECRET="your-production-secret"
```

2. **Deploy with environment validation**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

This comprehensive environment configuration ensures secure, scalable BetterAuth deployment across all environments while maintaining consistency and security best practices.