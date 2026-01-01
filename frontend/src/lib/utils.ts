import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Common style classes for numeric/currency displays.
 * Uses monospace font with tabular numbers for proper alignment.
 */
export const numericStyles = {
  /** Standard numeric display - used for amounts in lists */
  base: 'font-mono tabular-nums text-sm text-slate-300',
  /** Slightly emphasized - used for row values */
  medium: 'font-mono tabular-nums text-sm font-medium text-slate-200',
  /** De-emphasized - used for secondary values */
  muted: 'font-mono tabular-nums text-sm text-slate-400',
} as const

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// =============================================================================
// Type-safe helpers for API response transformation
// =============================================================================

/** Record type for raw API responses with unknown property values */
export type ApiRecord = Record<string, unknown>

/**
 * Safely get a property from an API response, checking multiple key naming conventions.
 * Returns undefined if none of the keys exist.
 */
export function get<T>(obj: ApiRecord, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key] as T
  }
  return undefined
}

/** Safely get a property with a default value */
export function getOr<T>(obj: ApiRecord, defaultValue: T, ...keys: string[]): T {
  return get<T>(obj, ...keys) ?? defaultValue
}

/** Ensure input is an ApiRecord for property access */
export function asRecord(input: unknown): ApiRecord {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as ApiRecord
  }
  return {}
}