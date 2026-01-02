// Person Types for Multi-Person Household Support

import { z } from 'zod'
import type { ResidencyStatus } from './cpf'

/**
 * Person represents a household member for income/CPF ownership and filtering.
 * Now includes personal attributes previously stored on CPF accounts:
 * - dateOfBirth: Required for CPF contribution calculations
 * - residencyStatus: 'citizen' or 'pr' (PR year is computed from prGrantDate)
 * - prGrantDate: Used to compute PR year (1, 2, or 3+) for CPF rate calculations
 */
export const personSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  displayColor: z.string().optional().nullable(),
  isIncluded: z.boolean(),
  dateOfBirth: z.string(), // ISO date format (YYYY-MM-DD)
  residencyStatus: z.enum(['citizen', 'pr']) as z.ZodType<ResidencyStatus>,
  prGrantDate: z.string().optional().nullable(), // ISO date format, required if residencyStatus='pr'
  createdAt: z.string(),
  updatedAt: z.string(),
  // Stats populated by ListPersonsWithStats endpoint
  incomeCount: z.number().optional(),
  cpfCount: z.number().optional(),
})

export type Person = z.infer<typeof personSchema>

export interface PersonCreatePayload {
  name: string
  displayColor?: string
  dateOfBirth: string // Required, format: YYYY-MM-DD
  residencyStatus?: ResidencyStatus // Defaults to 'citizen'
  prGrantDate?: string // Optional, format: YYYY-MM-DD
}

export interface PersonUpdatePayload {
  name?: string
  displayColor?: string
  isIncluded?: boolean
  dateOfBirth?: string
  residencyStatus?: ResidencyStatus
  prGrantDate?: string | null // Can be cleared by passing null
}

/**
 * Pre-defined color palette for person display colors.
 * These are carefully selected to be visually distinct and accessible.
 */
export const PERSON_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
] as const

export type PersonColor = (typeof PERSON_COLORS)[number]

/**
 * Get a suggested color for a new person based on existing persons.
 * Cycles through the color palette to avoid duplicates.
 */
export function getSuggestedColor(existingPersons: Person[]): string {
  const usedColors = new Set(existingPersons.map((p) => p.displayColor).filter(Boolean))
  const available = PERSON_COLORS.find((c) => !usedColors.has(c))
  return available ?? PERSON_COLORS[existingPersons.length % PERSON_COLORS.length]
}
