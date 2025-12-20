# BetterAuth Security Guide

## Overview

This guide covers security considerations, best practices, and implementation details for securing your BetterAuth integration in the financial chat system. Given the sensitive nature of financial data, this guide emphasizes defense-in-depth security.

## Threat Model

### Attack Vectors Addressed

1. **Session Hijacking**: Malicious access to user sessions
2. **CSRF Attacks**: Cross-site request forgery
3. **XSS Attacks**: Cross-site scripting vulnerabilities
4. **Token Theft**: Unauthorized access to authentication tokens
5. **Man-in-the-Middle**: Interception of authentication data
6. **Brute Force**: Password and session enumeration attacks
7. **Database Compromise**: Unauthorized database access
8. **API Abuse**: Unauthorized backend API access

### Security Architecture

```
┌─────────────────┐    HTTPS + Cookies    ┌──────────────────┐
│     Browser     │ ◄─────────────────► │   Next.js BFF   │
│   (Zero Trust)  │                      │  (Auth Gateway)  │
└─────────────────┘                      └──────────────────┘
                                                   │
                                         Signed Tokens
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │   Go Backend     │
                                         │ (Trusted Service)│
                                         └──────────────────┘
```

## Cookie Security

### Secure Cookie Configuration

```typescript
// BetterAuth cookie configuration
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes cache
    },
  },

  cookies: {
    sessionToken: {
      name: "__Secure-better-auth-session",
      httpOnly: true,        // Prevents XSS access
      secure: true,          // HTTPS only
      sameSite: "strict",    // CSRF protection
      maxAge: 60 * 60 * 24 * 7, // 7 days
      domain: process.env.NODE_ENV === 'production'
        ? '.yourdomain.com'
        : 'verylocal',
      path: '/',
    },
  },

  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
      domain: '.yourdomain.com',
    },

    cookiePrefix: "__Secure-",

    generateId: () => {
      // Use cryptographically secure random IDs
      return crypto.randomUUID()
    },
  },
})
```

### Cookie Security Headers

```typescript
// Next.js middleware for additional security headers
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Session Security

### Secure Session Token Generation

```typescript
// Token generation with strong cryptography
import { SignJWT, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'

interface SessionTokenPayload {
  userId: string
  sessionId: string
  iat: number
  exp: number
  jti: string  // Unique token ID for revocation
}

export async function generateSessionToken(payload: {
  userId: string
  sessionId: string
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.BETTERAUTH_SECRET!)

  const tokenId = nanoid(32) // Unique token identifier
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + (5 * 60) // 5 minutes

  return await new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
    jti: tokenId,
  })
    .setProtectedHeader({
      alg: 'HS256',
      typ: 'JWT',
    })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setNotBefore(issuedAt)
    .sign(secret)
}

export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.BETTERAUTH_SECRET!)

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    return payload as SessionTokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}
```

### Session Revocation System

```sql
-- Token blacklist for revoked sessions
CREATE TABLE revoked_tokens (
    jti VARCHAR(255) PRIMARY KEY,        -- Unique token identifier
    user_id TEXT NOT NULL,               -- User who owned the token
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),                 -- Revocation reason
    expires_at TIMESTAMP NOT NULL       -- When token would have expired
);

-- Index for efficient lookup
CREATE INDEX idx_revoked_tokens_jti ON revoked_tokens(jti);
CREATE INDEX idx_revoked_tokens_user_id ON revoked_tokens(user_id);
CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);

-- Cleanup expired revoked tokens
CREATE OR REPLACE FUNCTION cleanup_expired_revoked_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM revoked_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run periodically)
SELECT cron.schedule('cleanup-revoked-tokens', '0 2 * * *', 'SELECT cleanup_expired_revoked_tokens();');
```

### Go Backend Token Verification

```go
package middleware

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "github.com/golang-jwt/jwt/v5"
    "time"
)

type SessionClaims struct {
    UserID    string `json:"userId"`
    SessionID string `json:"sessionId"`
    JTI       string `json:"jti"`
    jwt.RegisteredClaims
}

func (h *AuthHandler) verifySessionToken(tokenString, expectedUserID string) (*SessionClaims, error) {
    // Parse and verify JWT
    token, err := jwt.ParseWithClaims(tokenString, &SessionClaims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(h.secret), nil
    })

    if err != nil {
        return nil, fmt.Errorf("token parsing failed: %w", err)
    }

    claims, ok := token.Claims.(*SessionClaims)
    if !ok || !token.Valid {
        return nil, fmt.Errorf("invalid token claims")
    }

    // Verify user ID matches
    if claims.UserID != expectedUserID {
        return nil, fmt.Errorf("token user ID mismatch")
    }

    // Check if token is revoked
    if h.isTokenRevoked(claims.JTI) {
        return nil, fmt.Errorf("token has been revoked")
    }

    // Verify session still exists in BetterAuth
    if !h.validateSessionExists(claims.SessionID) {
        return nil, fmt.Errorf("session no longer exists")
    }

    return claims, nil
}

func (h *AuthHandler) isTokenRevoked(jti string) bool {
    var count int
    err := h.db.QueryRow(
        "SELECT COUNT(*) FROM revoked_tokens WHERE jti = $1",
        jti,
    ).Scan(&count)

    if err != nil {
        // Log error, but fail secure
        return true
    }

    return count > 0
}

func (h *AuthHandler) revokeToken(jti, userID, reason string, expiresAt time.Time) error {
    _, err := h.db.Exec(`
        INSERT INTO revoked_tokens (jti, user_id, reason, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (jti) DO NOTHING
    `, jti, userID, reason, expiresAt)

    return err
}
```

## Password Security

### Password Policies

```typescript
// Password validation schema
import { z } from 'zod'

export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine((password) => {
    // Check against common passwords list
    const commonPasswords = [
      'password123', '123456789', 'qwertyuiop',
      'admin123456', 'password1234'
    ]
    return !commonPasswords.some(common =>
      password.toLowerCase().includes(common.toLowerCase())
    )
  }, 'Password is too common')

// Password strength meter
export function calculatePasswordStrength(password: string): number {
  let score = 0

  // Length
  if (password.length >= 12) score += 2
  else if (password.length >= 8) score += 1

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  // Patterns
  if (!/(.)\1{2,}/.test(password)) score += 1 // No repeated chars
  if (!/123|abc|qwe/i.test(password)) score += 1 // No common sequences

  return Math.min(score, 8) // Max score of 8
}
```

### Secure Password Reset

```typescript
// Password reset with secure token generation
export async function initiatePasswordReset(email: string) {
  // Generate cryptographically secure token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = await bcrypt.hash(resetToken, 12)

  // Store hashed token with short expiration
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  })

  // Send reset link (implement rate limiting)
  await sendPasswordResetEmail(email, resetToken)

  // Always return success to prevent email enumeration
  return { success: true }
}

export async function verifyPasswordReset(token: string, newPassword: string) {
  // Find and verify token
  const verificationToken = await db.verificationToken.findFirst({
    where: {
      expires: { gt: new Date() },
    },
  })

  if (!verificationToken) {
    throw new Error('Invalid or expired reset token')
  }

  // Verify token hash
  const isValidToken = await bcrypt.compare(token, verificationToken.token)
  if (!isValidToken) {
    throw new Error('Invalid reset token')
  }

  // Update password and invalidate all sessions
  await db.$transaction(async (tx) => {
    // Update password
    await tx.account.updateMany({
      where: {
        provider: 'credential',
        providerAccountId: verificationToken.identifier
      },
      data: {
        password: await bcrypt.hash(newPassword, 12),
      },
    })

    // Invalidate all user sessions
    const user = await tx.user.findUnique({
      where: { email: verificationToken.identifier },
    })

    if (user) {
      await tx.session.deleteMany({
        where: { userId: user.id },
      })
    }

    // Delete used token
    await tx.verificationToken.delete({
      where: { id: verificationToken.id },
    })
  })
}
```

## Rate Limiting and Abuse Prevention

### Authentication Rate Limiting

```typescript
// Rate limiting configuration
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Different rate limits for different endpoints
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
})

export const passwordResetRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 reset requests per hour
})

export const generalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour per user
})

// Apply rate limiting middleware
export async function withRateLimit(
  request: Request,
  identifier: string,
  rateLimit: Ratelimit
) {
  const { success, limit, remaining, reset } = await rateLimit.limit(identifier)

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.round((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.round((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  return null // Continue processing
}
```

### Suspicious Activity Detection

```typescript
// Anomaly detection for auth events
export interface SecurityEvent {
  userId?: string
  ipAddress: string
  userAgent: string
  eventType: 'login' | 'failed_login' | 'password_reset' | 'suspicious_activity'
  timestamp: Date
  metadata?: Record<string, any>
}

export async function logSecurityEvent(event: SecurityEvent) {
  // Store security event
  await db.securityEvent.create({
    data: event,
  })

  // Check for suspicious patterns
  await checkSuspiciousActivity(event)
}

async function checkSuspiciousActivity(event: SecurityEvent) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Check for multiple failed logins
  if (event.eventType === 'failed_login') {
    const failedAttempts = await db.securityEvent.count({
      where: {
        eventType: 'failed_login',
        ipAddress: event.ipAddress,
        timestamp: { gte: oneHourAgo },
      },
    })

    if (failedAttempts >= 10) {
      // Block IP temporarily
      await blockIPTemporarily(event.ipAddress, 24 * 60 * 60 * 1000) // 24 hours

      // Send security alert
      await sendSecurityAlert('Multiple failed login attempts', event)
    }
  }

  // Check for logins from new locations
  if (event.eventType === 'login' && event.userId) {
    const previousLogins = await db.securityEvent.findMany({
      where: {
        userId: event.userId,
        eventType: 'login',
        timestamp: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
      },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    })

    const knownIPs = previousLogins.map(login => login.ipAddress)
    if (!knownIPs.includes(event.ipAddress)) {
      // New location login - require additional verification
      await requireAdditionalVerification(event.userId, 'new_location_login')
    }
  }
}
```

## API Security

### Request Validation and Sanitization

```typescript
// Input validation middleware
import { z } from 'zod'

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: Request) => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed',
          details: error.errors
        }
      }
      return { success: false, error: 'Invalid request format' }
    }
  }
}

// Financial data validation schemas
export const createAssetSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\s\-_.]+$/),
  currentValue: z.number().positive().max(999999999.99),
  description: z.string().max(1000).optional(),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().uuid().optional(),
  chatId: z.string().uuid().optional(),
})
```

### SQL Injection Prevention

```go
// Secure database queries in Go backend
package repository

import (
    "context"
    "database/sql"
)

type AssetRepository struct {
    db *sql.DB
}

// Always use parameterized queries
func (r *AssetRepository) GetAssetsByUserID(ctx context.Context, userID string) ([]Asset, error) {
    // SECURE: Uses parameterized query
    query := `
        SELECT id, name, current_value, description, created_at, updated_at
        FROM assets
        WHERE betterauth_user_id = $1
        ORDER BY created_at DESC
        LIMIT 1000  -- Prevent resource exhaustion
    `

    rows, err := r.db.QueryContext(ctx, query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var assets []Asset
    for rows.Next() {
        var asset Asset
        err := rows.Scan(
            &asset.ID,
            &asset.Name,
            &asset.CurrentValue,
            &asset.Description,
            &asset.CreatedAt,
            &asset.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }

        // Sanitize output data
        asset.Name = sanitizeString(asset.Name)
        asset.Description = sanitizeString(asset.Description)

        assets = append(assets, asset)
    }

    return assets, rows.Err()
}

func sanitizeString(input string) string {
    // Remove potentially dangerous characters
    // This is context-specific based on how data is used
    return strings.ReplaceAll(
        strings.ReplaceAll(input, "<", "&lt;"),
        ">", "&gt;",
    )
}
```

## Audit Logging and Monitoring

### Comprehensive Audit Trail

```sql
-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,                    -- BetterAuth user ID
    session_id TEXT,                 -- BetterAuth session ID
    action VARCHAR(100) NOT NULL,    -- Action performed
    resource_type VARCHAR(50),       -- Type of resource (asset, liability, etc.)
    resource_id TEXT,               -- ID of the resource
    old_values JSONB,               -- Previous values
    new_values JSONB,               -- New values
    ip_address INET,                -- Client IP address
    user_agent TEXT,                -- Client user agent
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB                  -- Additional context
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data = row_to_json(OLD);
        INSERT INTO audit_logs (
            action, resource_type, resource_id, old_values, timestamp
        ) VALUES (
            TG_OP, TG_TABLE_NAME, OLD.id::TEXT, old_data, CURRENT_TIMESTAMP
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = row_to_json(OLD);
        new_data = row_to_json(NEW);
        INSERT INTO audit_logs (
            action, resource_type, resource_id, old_values, new_values, timestamp
        ) VALUES (
            TG_OP, TG_TABLE_NAME, NEW.id::TEXT, old_data, new_data, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_data = row_to_json(NEW);
        INSERT INTO audit_logs (
            action, resource_type, resource_id, new_values, timestamp
        ) VALUES (
            TG_OP, TG_TABLE_NAME, NEW.id::TEXT, new_data, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to financial tables
CREATE TRIGGER assets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER liabilities_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON liabilities
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Security Monitoring

```typescript
// Real-time security monitoring
export class SecurityMonitor {
  private alerts = new Map<string, number>()

  async monitorSecurityEvents() {
    // Check for suspicious patterns every minute
    setInterval(async () => {
      await this.checkFailedLogins()
      await this.checkUnusualActivity()
      await this.checkDataAccess()
    }, 60000)
  }

  private async checkFailedLogins() {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000)

    const failedLogins = await db.securityEvent.groupBy({
      by: ['ipAddress'],
      where: {
        eventType: 'failed_login',
        timestamp: { gte: last5Minutes },
      },
      _count: true,
      having: {
        _count: { gte: 5 }, // 5 or more failures in 5 minutes
      },
    })

    for (const group of failedLogins) {
      await this.sendAlert('HIGH', `Multiple failed logins from IP: ${group.ipAddress}`)
      await this.blockIP(group.ipAddress, 30 * 60 * 1000) // Block for 30 minutes
    }
  }

  private async checkUnusualActivity() {
    // Check for unusual data access patterns
    const last10Minutes = new Date(Date.now() - 10 * 60 * 1000)

    const unusualAccess = await db.auditLog.groupBy({
      by: ['userId'],
      where: {
        action: 'SELECT',
        timestamp: { gte: last10Minutes },
      },
      _count: true,
      having: {
        _count: { gte: 100 }, // More than 100 reads in 10 minutes
      },
    })

    for (const access of unusualAccess) {
      await this.sendAlert('MEDIUM', `Unusual data access pattern for user: ${access.userId}`)
    }
  }

  private async sendAlert(severity: 'LOW' | 'MEDIUM' | 'HIGH', message: string) {
    // Send to monitoring system (e.g., Slack, PagerDuty, email)
    console.error(`SECURITY ALERT [${severity}]: ${message}`)

    // In production, integrate with your monitoring system
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Security Alert [${severity}]: ${message}`,
        }),
      })
    }
  }
}
```

## Security Testing

### Automated Security Tests

```typescript
// Security test suite
import { test, expect } from '@playwright/test'

test.describe('Authentication Security', () => {
  test('should prevent XSS in login form', async ({ page }) => {
    await page.goto('/login')

    // Attempt XSS injection
    await page.fill('[name="email"]', '<script>alert("xss")</script>')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should not execute JavaScript
    const alerts = []
    page.on('dialog', dialog => alerts.push(dialog))

    expect(alerts.length).toBe(0)
  })

  test('should enforce rate limiting', async ({ page }) => {
    await page.goto('/login')

    // Make multiple failed login attempts
    for (let i = 0; i < 10; i++) {
      await page.fill('[name="email"]', 'test@example.com')
      await page.fill('[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
    }

    // Should show rate limit error
    await expect(page.locator('text=Rate limit exceeded')).toBeVisible()
  })

  test('should secure cookies', async ({ page, context }) => {
    await page.goto('/login')

    // Login with valid credentials
    await page.fill('[name="email"]', 'valid@example.com')
    await page.fill('[name="password"]', 'validpassword')
    await page.click('button[type="submit"]')

    // Check cookie security attributes
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name.includes('better-auth-session'))

    expect(sessionCookie?.httpOnly).toBe(true)
    expect(sessionCookie?.secure).toBe(true)
    expect(sessionCookie?.sameSite).toBe('Strict')
  })
})
```

### Penetration Testing Checklist

- [ ] **Authentication bypass attempts**
- [ ] **Session fixation attacks**
- [ ] **CSRF token validation**
- [ ] **XSS payload injection**
- [ ] **SQL injection attempts**
- [ ] **Directory traversal attacks**
- [ ] **API endpoint enumeration**
- [ ] **Rate limiting effectiveness**
- [ ] **Password policy enforcement**
- [ ] **Session timeout validation**
- [ ] **Token revocation testing**
- [ ] **Authorization bypass attempts**

## Security Compliance

### GDPR Compliance

```typescript
// GDPR data handling
export class GDPRCompliance {
  async handleDataDeletion(userId: string, reason: string) {
    await db.$transaction(async (tx) => {
      // Delete user data
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.local`,
          name: 'Deleted User',
          image: null,
        },
      })

      // Anonymize financial data (keep for analytics)
      await tx.asset.updateMany({
        where: { betterAuthUserId: userId },
        data: {
          name: 'Anonymized Asset',
          description: null,
        },
      })

      // Keep audit logs but anonymize
      await tx.auditLog.updateMany({
        where: { userId },
        data: {
          userId: 'anonymized',
          metadata: {},
        },
      })

      // Log deletion request
      await tx.auditLog.create({
        data: {
          action: 'GDPR_DELETE',
          resourceType: 'user',
          resourceId: userId,
          metadata: { reason },
        },
      })
    })
  }

  async exportUserData(userId: string) {
    // Export all user data for GDPR data portability
    const userData = await db.user.findUnique({
      where: { id: userId },
      include: {
        assets: true,
        liabilities: true,
        sessions: {
          select: {
            createdAt: true,
            updatedAt: true,
            ipAddress: true
          }
        },
      },
    })

    return userData
  }
}
```

## Security Best Practices Summary

### ✅ Implementation Checklist

1. **Authentication**
   - [ ] Strong password policies enforced
   - [ ] Secure session management with BetterAuth
   - [ ] Multi-factor authentication ready
   - [ ] Account lockout after failed attempts

2. **Authorization**
   - [ ] Proper user context validation
   - [ ] Resource-level access control
   - [ ] API endpoint protection
   - [ ] Session-based authorization

3. **Data Protection**
   - [ ] Encrypted data in transit (HTTPS)
   - [ ] Encrypted sensitive data at rest
   - [ ] Input validation and sanitization
   - [ ] Output encoding

4. **Infrastructure**
   - [ ] Secure cookie configuration
   - [ ] CORS properly configured
   - [ ] Security headers implemented
   - [ ] Rate limiting in place

5. **Monitoring**
   - [ ] Comprehensive audit logging
   - [ ] Real-time security monitoring
   - [ ] Anomaly detection
   - [ ] Incident response procedures

6. **Compliance**
   - [ ] GDPR data handling
   - [ ] Data retention policies
   - [ ] Privacy by design
   - [ ] Regular security assessments

This security guide provides a comprehensive defense-in-depth approach to securing your BetterAuth implementation, ensuring that financial data is protected at every layer of the application.