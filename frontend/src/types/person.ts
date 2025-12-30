// Person Types for Multi-Person Household Support

import { z } from 'zod'

/**
 * Person represents a household member for income/CPF ownership and filtering.
 */
export const personSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  displayColor: z.string().optional().nullable(),
  isIncluded: z.boolean(),
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
}

export interface PersonUpdatePayload {
  name?: string
  displayColor?: string
  isIncluded?: boolean
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
