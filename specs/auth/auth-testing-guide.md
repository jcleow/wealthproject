# BetterAuth Testing Guide

This document provides comprehensive testing procedures for validating the BetterAuth implementation in the financial chat system.

## 🎯 Testing Objectives

1. **Authentication Flow**: Verify complete login/signup functionality
2. **Security**: Validate token security and user data isolation
3. **Integration**: Test BetterAuth with Go backend integration
4. **Session Management**: Verify session persistence and cleanup
5. **User Migration**: Test anonymous-to-authenticated data migration
6. **Performance**: Ensure auth doesn't impact system performance

## 🏗️ Test Environment Setup

### Prerequisites

```bash
# Ensure services are running
docker-compose up -d postgres
cd frontend && npm run dev -- --experimental-https
cd backend && go run cmd/server/main.go
```

### Required Environment Variables

```bash
# Frontend .env.local
BETTERAUTH_SECRET="test_secret_change_in_production"
BETTERAUTH_URL="https://verylocal:3000"
NEXT_PUBLIC_BETTERAUTH_URL="https://verylocal:3000"
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"
HTTPS=true

# Backend .env
BETTERAUTH_SECRET="test_secret_change_in_production"
DATABASE_URL="postgres://financial_user:financial_pass_dev_2024@localhost:5432/financial_chat?sslmode=disable"
PORT=8080
```

### Test Data Setup

```sql
-- Create test BetterAuth users
INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
VALUES
    ('test-user-1', 'test1@example.com', 'Test User 1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('test-user-2', 'test2@example.com', 'Test User 2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create test financial data
INSERT INTO finance_assets (id, user_id, name, category, current_value)
VALUES
    (gen_random_uuid(), 'test-user-1', 'Test House', 'Real Estate', 500000),
    (gen_random_uuid(), 'test-user-1', 'Savings Account', 'Cash', 25000),
    (gen_random_uuid(), 'test-user-2', 'Investment Portfolio', 'Stocks', 100000);

INSERT INTO finance_liabilities (id, user_id, name, category, current_balance, interest_rate_apr)
VALUES
    (gen_random_uuid(), 'test-user-1', 'Mortgage', 'Home Loan', 300000, 3.5),
    (gen_random_uuid(), 'test-user-2', 'Credit Card', 'Credit', 5000, 18.99);
```

## ✅ Authentication Flow Testing

### 1. User Registration Testing

#### Test Case: Valid Registration

```javascript
// Frontend test
describe('User Registration', () => {
  test('should register new user successfully', async () => {
    const response = await fetch('https://verylocal:3000/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User'
      }),
      credentials: 'include'
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.user.email).toBe('newuser@example.com')
    expect(data.user.name).toBe('New User')
  })
})
```

#### Manual Test Steps:
1. Visit `https://verylocal:3000/auth/signup`
2. Fill form with valid data:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "SecurePass123!"
   - Confirm Password: "SecurePass123!"
3. Click "Create Account"
4. **Expected**: Success message, redirect to dashboard
5. **Verify**: User created in database, session cookie set

#### Test Case: Invalid Registration

```javascript
test('should reject weak password', async () => {
  const response = await fetch('https://verylocal:3000/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: '123',
      name: 'Test User'
    }),
    credentials: 'include'
  })

  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error).toContain('Password must be at least 8 characters')
})
```

### 2. User Login Testing

#### Test Case: Valid Login

```bash
# Manual test with curl
curl -X POST https://verylocal:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response**:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User"
  },
  "session": {
    "id": "session-uuid",
    "expiresAt": "2024-12-02T..."
  }
}
```

**Verify Cookie**:
```bash
# Check that secure cookie is set
grep "better-auth-session" cookies.txt
# Should show HttpOnly, Secure flags
```

#### Test Case: Invalid Login

```javascript
test('should reject invalid credentials', async () => {
  const response = await fetch('https://verylocal:3000/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'wrongpassword'
    }),
    credentials: 'include'
  })

  expect(response.status).toBe(401)
  const data = await response.json()
  expect(data.error).toContain('Invalid credentials')
})
```

### 3. Session Persistence Testing

#### Test Session Persistence Across Page Refreshes

```javascript
test('should maintain session across page refreshes', async () => {
  // 1. Login
  const loginResponse = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'SecurePass123!'
    }),
    credentials: 'include'
  })

  expect(loginResponse.status).toBe(200)

  // 2. Check session without login
  const sessionResponse = await fetch('/api/auth/session', {
    credentials: 'include'
  })

  expect(sessionResponse.status).toBe(200)
  const sessionData = await sessionResponse.json()
  expect(sessionData.user.email).toBe('test@example.com')
})
```

## 🔒 Security Testing

### 1. Cookie Security Validation

#### Test HttpOnly Cookie Attributes

```javascript
test('should set secure cookie attributes', async () => {
  const page = await browser.newPage()

  await page.goto('https://verylocal:3000/auth/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'SecurePass123!')
  await page.click('button[type="submit"]')

  const cookies = await page.context().cookies()
  const sessionCookie = cookies.find(c => c.name.includes('better-auth-session'))

  expect(sessionCookie.httpOnly).toBe(true)
  expect(sessionCookie.secure).toBe(true)
  expect(sessionCookie.sameSite).toBe('Strict')
  expect(sessionCookie.domain).toBe('verylocal')
})
```

#### Test XSS Prevention

```javascript
test('should prevent XSS in login form', async () => {
  const response = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '<script>alert("xss")</script>',
      password: 'password'
    }),
    credentials: 'include'
  })

  expect(response.status).toBe(400)

  // Ensure script is not executed
  const page = await browser.newPage()
  let dialogTriggered = false
  page.on('dialog', () => { dialogTriggered = true })

  await page.goto('https://verylocal:3000/auth/login')
  await page.fill('[name="email"]', '<script>alert("xss")</script>')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  expect(dialogTriggered).toBe(false)
})
```

### 2. User Data Isolation Testing

#### Test Cross-User Data Access Prevention

```sql
-- Manual SQL test
-- As test-user-1, should not see test-user-2's data
SELECT COUNT(*) FROM finance_assets WHERE user_id = 'test-user-2';
-- Should return 0 when accessed through user-1's session
```

#### API Test for Data Isolation

```javascript
test('should prevent cross-user data access', async () => {
  // Login as user 1
  const user1Token = await loginAndGetToken('test1@example.com', 'password')

  // Login as user 2
  const user2Token = await loginAndGetToken('test2@example.com', 'password')

  // User 1 tries to access their assets
  const user1Assets = await fetch('/api/v1/assets', {
    headers: { 'Authorization': `Bearer ${user1Token}` }
  })
  const user1Data = await user1Assets.json()

  // User 2 tries to access their assets
  const user2Assets = await fetch('/api/v1/assets', {
    headers: { 'Authorization': `Bearer ${user2Token}` }
  })
  const user2Data = await user2Assets.json()

  // Verify data isolation
  expect(user1Data.assets).not.toEqual(user2Data.assets)
  expect(user1Data.assets.every(asset =>
    !user2Data.assets.some(otherAsset => otherAsset.id === asset.id)
  )).toBe(true)
})
```

### 3. Token Verification Testing

#### Test BetterAuth Token Verification in Go Backend

```bash
# Test valid token
curl -X GET http://verylocal:8080/api/v1/assets \
  -H "X-Session-Token: valid-jwt-token" \
  -H "X-User-ID: test-user-1" \
  -v

# Expected: 200 OK with user's assets

# Test invalid token
curl -X GET http://verylocal:8080/api/v1/assets \
  -H "X-Session-Token: invalid-token" \
  -H "X-User-ID: test-user-1" \
  -v

# Expected: 401 Unauthorized

# Test expired token
curl -X GET http://verylocal:8080/api/v1/assets \
  -H "X-Session-Token: expired-jwt-token" \
  -H "X-User-ID: test-user-1" \
  -v

# Expected: 401 Unauthorized
```

## 🔄 BFF Integration Testing

### 1. Next.js to Go Backend Communication

#### Test BFF Token Generation and Verification

```javascript
test('should generate valid token for Go backend', async () => {
  // Login to get BetterAuth session
  await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'SecurePass123!'
    }),
    credentials: 'include'
  })

  // Make API call through BFF
  const response = await fetch('/api/v1/assets', {
    credentials: 'include'
  })

  expect(response.status).toBe(200)
  const data = await response.json()
  expect(Array.isArray(data.assets)).toBe(true)
})
```

### 2. End-to-End Chat Flow Testing

#### Test Complete Chat Flow with Authentication

```javascript
test('should handle authenticated chat flow', async () => {
  // 1. Login
  await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'SecurePass123!'
    }),
    credentials: 'include'
  })

  // 2. Send chat message
  const chatResponse = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'I have a house worth $500,000',
      session_id: 'test-session-uuid',
      chat_id: 'test-chat-uuid'
    }),
    credentials: 'include'
  })

  expect(chatResponse.status).toBe(200)
  const chatData = await chatResponse.json()

  // 3. Verify response has actions
  expect(chatData.content).toBeTruthy()
  expect(Array.isArray(chatData.proposed_actions)).toBe(true)

  // 4. Execute approved actions
  const dispatchResponse = await fetch('/api/v1/financial/actions/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selected_actions: chatData.proposed_actions.map(action => ({
        call_id: action.call_id,
        approved: true
      })),
      session_id: 'test-session-uuid'
    }),
    credentials: 'include'
  })

  expect(dispatchResponse.status).toBe(200)

  // 5. Verify asset was created for user
  const assetsResponse = await fetch('/api/v1/assets', {
    credentials: 'include'
  })
  const assetsData = await assetsResponse.json()

  expect(assetsData.assets.some(asset =>
    asset.name.includes('house') || asset.current_value === 500000
  )).toBe(true)
})
```

## 📊 Performance Testing

### 1. Authentication Performance

#### Test Login Performance

```javascript
test('login performance should be under 500ms', async () => {
  const startTime = Date.now()

  const response = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'SecurePass123!'
    }),
    credentials: 'include'
  })

  const endTime = Date.now()
  const duration = endTime - startTime

  expect(response.status).toBe(200)
  expect(duration).toBeLessThan(500) // 500ms threshold
})
```

### 2. User-Scoped Query Performance

#### Test Database Performance with User Filtering

```sql
-- Performance test for user-scoped queries
EXPLAIN ANALYZE
SELECT * FROM finance_assets WHERE user_id = 'test-user-1';

-- Should use index and complete in < 10ms
-- Query plan should show "Index Scan using idx_finance_assets_user_id"
```

#### Benchmark User-Scoped API Performance

```bash
# Install apache bench
# apt-get install apache2-utils

# Test assets endpoint performance
ab -n 100 -c 10 \
  -H "Authorization: Bearer valid-token" \
  -H "X-User-ID: test-user-1" \
  https://verylocal:3000/api/v1/assets

# Expected:
# - Requests per second > 50
# - Mean response time < 200ms
# - No failed requests
```

## 🔄 Migration Testing

### 1. Anonymous to Authenticated Migration

#### Test Session Data Migration

```javascript
test('should migrate anonymous session data to user account', async () => {
  const sessionId = 'anonymous-session-123'

  // 1. Create anonymous data
  await fetch('/api/v1/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    },
    body: JSON.stringify({
      name: 'Anonymous Asset',
      category: 'Cash',
      currentValue: 1000
    })
  })

  // 2. Register new account
  await fetch('/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'migrated@example.com',
      password: 'SecurePass123!',
      name: 'Migrated User'
    }),
    credentials: 'include'
  })

  // 3. Trigger migration
  await fetch('/api/migrate-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oldSessionId: sessionId
    }),
    credentials: 'include'
  })

  // 4. Verify data migrated
  const assetsResponse = await fetch('/api/v1/assets', {
    credentials: 'include'
  })
  const assetsData = await assetsResponse.json()

  expect(assetsData.assets.some(asset =>
    asset.name === 'Anonymous Asset'
  )).toBe(true)
})
```

## 🚨 Error Handling Testing

### 1. Network Error Testing

#### Test Offline Behavior

```javascript
test('should handle network errors gracefully', async () => {
  // Simulate network failure
  await page.setOfflineMode(true)

  const loginAttempt = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        }),
        credentials: 'include'
      })
      return response.status
    } catch (error) {
      return { error: error.message }
    }
  })

  expect(loginAttempt.error).toBeTruthy()
})
```

### 2. Token Expiry Testing

#### Test Expired Token Handling

```javascript
test('should handle expired tokens', async () => {
  // Create expired token
  const expiredToken = generateExpiredJWT()

  const response = await fetch('/api/v1/assets', {
    headers: {
      'Authorization': `Bearer ${expiredToken}`,
      'X-User-ID': 'test-user-1'
    }
  })

  expect(response.status).toBe(401)

  // Should redirect to login
  const data = await response.json()
  expect(data.error).toContain('expired')
})
```

## 📝 Test Automation

### Jest Test Suite

Create `frontend/tests/auth.test.js`:

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'

describe('BetterAuth Integration', () => {
  beforeEach(async () => {
    // Clean up test data
    await cleanupTestUsers()
    await cleanupTestFinancialData()
  })

  afterEach(async () => {
    // Cleanup cookies
    await clearAllCookies()
  })

  // Include all test cases from above
  test('complete authentication flow', async () => {
    // Registration, login, API access, logout
  })

  test('user data isolation', async () => {
    // Cross-user access prevention
  })

  test('session migration', async () => {
    // Anonymous to authenticated migration
  })
})
```

### Go Backend Tests

Create `backend/internal/auth/auth_test.go`:

```go
package auth_test

import (
    "testing"
    "context"
    "net/http"
    "net/http/httptest"
)

func TestBetterAuthTokenVerification(t *testing.T) {
    tests := []struct {
        name           string
        token          string
        userID         string
        expectedStatus int
    }{
        {"valid token", generateValidToken(), "test-user", 200},
        {"invalid token", "invalid", "test-user", 401},
        {"expired token", generateExpiredToken(), "test-user", 401},
        {"mismatched user", generateValidToken(), "other-user", 401},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest("GET", "/api/v1/assets", nil)
            req.Header.Set("X-Session-Token", tt.token)
            req.Header.Set("X-User-ID", tt.userID)

            rr := httptest.NewRecorder()
            handler := setupAuthenticatedHandler()
            handler.ServeHTTP(rr, req)

            if rr.Code != tt.expectedStatus {
                t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
            }
        })
    }
}
```

## 🎯 Testing Checklist

### Authentication Flow
- [ ] User registration works with valid data
- [ ] Registration rejects invalid/weak passwords
- [ ] Login works with correct credentials
- [ ] Login rejects incorrect credentials
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

### Security
- [ ] Cookies are HttpOnly, Secure, SameSite
- [ ] XSS prevention in forms
- [ ] CSRF protection active
- [ ] User data isolation enforced
- [ ] Token verification working
- [ ] Expired token handling

### Integration
- [ ] BFF token generation working
- [ ] Go backend token verification
- [ ] Chat flow with authentication
- [ ] Financial actions with user context
- [ ] API rate limiting functional

### Performance
- [ ] Login performance < 500ms
- [ ] User-scoped queries performant
- [ ] No N+1 query issues
- [ ] Database indexes optimal

### Migration
- [ ] Anonymous data migration works
- [ ] No data loss during migration
- [ ] Session mapping functions
- [ ] Database constraints enforced

### Error Handling
- [ ] Network error handling
- [ ] Token expiry graceful handling
- [ ] Database connection errors
- [ ] Invalid input handling

## 🔧 Test Utilities

### Helper Functions

```javascript
// Test utilities
async function loginAndGetToken(email, password) {
  const response = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  })
  return response.headers.get('Authorization')
}

async function cleanupTestUsers() {
  await fetch('/test-utils/cleanup-users', { method: 'DELETE' })
}

async function createTestFinancialData(userId) {
  return fetch('/test-utils/create-test-data', {
    method: 'POST',
    body: JSON.stringify({ userId }),
    headers: { 'Content-Type': 'application/json' }
  })
}
```

This comprehensive testing guide ensures that the BetterAuth implementation is thoroughly validated across all security, functionality, and performance aspects.