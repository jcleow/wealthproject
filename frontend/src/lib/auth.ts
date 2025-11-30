import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

// Create a PostgreSQL pool for BetterAuth
// Append search_path to use auth schema for BetterAuth tables
const connectionString = process.env.DATABASE_URL || ''
const separator = connectionString.includes('?') ? '&' : '?'
const poolConnectionString = `${connectionString}${separator}options=-c%20search_path%3Dauth`

const pool = new Pool({
  connectionString: poolConnectionString,
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
