import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

// SECURITY: Validate critical secrets in production
const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) {
  const authSecret = process.env.BETTER_AUTH_SECRET || ''
  if (!authSecret || authSecret.includes('dev') || authSecret.length < 32) {
    throw new Error('SECURITY ERROR: BETTER_AUTH_SECRET must be a strong secret (at least 32 characters) in production')
  }
  const backendSecret = process.env.BACKEND_SHARED_SECRET || ''
  if (!backendSecret || backendSecret.includes('dev') || backendSecret.length < 32) {
    throw new Error('SECURITY ERROR: BACKEND_SHARED_SECRET must be a strong secret (at least 32 characters) in production')
  }
}

// Load Supabase CA certificate chain (check multiple locations)
const caCandidates = [
  path.join(process.cwd(), 'supabase-ca-chain.pem'),
  path.join(process.cwd(), '..', 'supabase-ca-chain.pem'),
  '/workspace/supabase-ca-chain.pem',
]
const caPath = caCandidates.find((p) => fs.existsSync(p))
const ca = caPath ? fs.readFileSync(caPath).toString() : undefined

// Only log in development - SECURITY: Never log sensitive info in production
if (!isProduction) {
  console.log('[Auth] Looking for CA cert, cwd:', process.cwd())
  console.log('[Auth] CA candidates:', caCandidates.map((p) => `${p} (exists: ${fs.existsSync(p)})`))
  console.log('[Auth] CA cert loaded:', caPath ? `yes (${caPath})` : 'no')
}

// Create a PostgreSQL pool for BetterAuth
// Append search_path to use auth schema for BetterAuth tables
const connectionString = process.env.DATABASE_URL || ''

// Only log DATABASE_URL presence in development (not the actual value)
if (!isProduction) {
  console.log('[Auth] DATABASE_URL:', connectionString ? 'configured' : 'NOT SET')
}
const separator = connectionString.includes('?') ? '&' : '?'
const poolConnectionString = `${connectionString}${separator}options=-c%20search_path%3Dapp_auth`

const pool = new Pool({
  connectionString: poolConnectionString,
  ssl: ca
    ? {
        ca,
        rejectUnauthorized: true, // Verify against our CA
      }
    : undefined,
})

pool.on('error', (err) => {
  console.error('[Auth] Pool error:', err.message)
})

export const auth = betterAuth({
  // Pass pool directly - BetterAuth auto-detects PostgreSQL
  database: pool,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Start simple, can enable later
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  advanced: {
    generateId: () => crypto.randomUUID(),
    cookiePrefix: process.env.NODE_ENV === 'production' ? '__Secure-' : '',
  },

  trustedOrigins: [
    process.env.BETTERAUTH_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://verylocal:3000',
  ],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
