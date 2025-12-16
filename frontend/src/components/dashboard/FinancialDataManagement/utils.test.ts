import { describe, it, expect } from 'vitest'
import { calculateActualYear, calculateAllocationEndDate } from './utils'

describe('calculateActualYear', () => {
  describe('when selectedYear is an offset (< 1900)', () => {
    it('should add offset to anchorYear', () => {
      expect(calculateActualYear(0, 2025)).toBe(2025)
      expect(calculateActualYear(1, 2025)).toBe(2026)
      expect(calculateActualYear(2, 2025)).toBe(2027)
      expect(calculateActualYear(5, 2025)).toBe(2030)
    })

    it('should handle different anchor years', () => {
      expect(calculateActualYear(2, 2020)).toBe(2022)
      expect(calculateActualYear(2, 2030)).toBe(2032)
    })
  })

  describe('when selectedYear is an actual year (>= 1900)', () => {
    it('should return the year directly without adding to anchorYear', () => {
      expect(calculateActualYear(2025, 2025)).toBe(2025)
      expect(calculateActualYear(2027, 2025)).toBe(2027)
      expect(calculateActualYear(2030, 2025)).toBe(2030)
    })

    it('should ignore anchorYear when selectedYear is an actual year', () => {
      // This was the bug: 2025 + 2026 = 4051
      expect(calculateActualYear(2026, 2025)).toBe(2026)
      expect(calculateActualYear(2027, 2020)).toBe(2027)
    })
  })

  describe('edge cases', () => {
    it('should handle year 1900 as actual year', () => {
      expect(calculateActualYear(1900, 2025)).toBe(1900)
    })

    it('should handle year 1899 as offset', () => {
      expect(calculateActualYear(1899, 2025)).toBe(2025 + 1899)
    })

    it('should use current year when anchorYear is undefined', () => {
      const currentYear = new Date().getFullYear()
      expect(calculateActualYear(2, undefined)).toBe(currentYear + 2)
    })
  })

  describe('regression test for bug #4051', () => {
    // Bug: When selectedYear was 2026 (actual year) and anchorYear was 2025,
    // the old code did: 2025 + 2026 = 4051
    it('should NOT produce year 4051 when selectedYear=2026 and anchorYear=2025', () => {
      const result = calculateActualYear(2026, 2025)
      expect(result).toBe(2026)
      expect(result).not.toBe(4051)
    })

    it('should NOT produce unrealistic years (> 2100) for normal inputs', () => {
      // Test various combinations that could have caused the bug
      const testCases = [
        { selectedYear: 2025, anchorYear: 2025 },
        { selectedYear: 2026, anchorYear: 2025 },
        { selectedYear: 2027, anchorYear: 2025 },
        { selectedYear: 2030, anchorYear: 2025 },
        { selectedYear: 0, anchorYear: 2025 },
        { selectedYear: 1, anchorYear: 2025 },
        { selectedYear: 5, anchorYear: 2025 },
        { selectedYear: 10, anchorYear: 2025 },
      ]

      for (const { selectedYear, anchorYear } of testCases) {
        const result = calculateActualYear(selectedYear, anchorYear)
        expect(result).toBeLessThan(2100)
        expect(result).toBeGreaterThan(1900)
      }
    })
  })
})

describe('calculateAllocationEndDate', () => {
  describe('basic functionality', () => {
    it('should return last day of previous month', () => {
      // April (month 4, 1-indexed) 2027 -> should return March 31, 2027
      const result = calculateAllocationEndDate(2027, 4, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2027)
      expect(date.getMonth()).toBe(2) // March (0-indexed in JS Date)
      expect(date.getDate()).toBe(31)
    })

    it('should handle January (returns December of previous year)', () => {
      // January (month 1, 1-indexed) 2027 -> should return December 31, 2026
      const result = calculateAllocationEndDate(2027, 1, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(11) // December
      expect(date.getDate()).toBe(31)
    })

    it('should handle February (returns January 31)', () => {
      // February (month 2, 1-indexed) 2027 -> should return January 31, 2027
      const result = calculateAllocationEndDate(2027, 2, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2027)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(31)
    })

    it('should handle months with 30 days (returns 30th)', () => {
      // May (month 5, 1-indexed) 2027 -> should return April 30, 2027
      const result = calculateAllocationEndDate(2027, 5, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2027)
      expect(date.getMonth()).toBe(3) // April
      expect(date.getDate()).toBe(30)
    })

    it('should handle December (returns November 30)', () => {
      // December (month 12, 1-indexed) 2026 -> should return November 30, 2026
      const result = calculateAllocationEndDate(2026, 12, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(10) // November
      expect(date.getDate()).toBe(30)
    })
  })

  describe('with offset selectedYear', () => {
    it('should correctly calculate year from offset', () => {
      // selectedYear=2 means year 2027 when anchorYear=2025
      // April (month 4, 1-indexed) -> should return March 31, 2027
      const result = calculateAllocationEndDate(2, 4, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2027)
      expect(date.getMonth()).toBe(2) // March
      expect(date.getDate()).toBe(31)
    })
  })

  describe('regression test for bug #4051', () => {
    it('should NOT produce year 4051 in end date', () => {
      // The bug: Year 2 April with anchorYear 2025 produced 4051-03-31
      const result = calculateAllocationEndDate(2026, 4, 2025)
      const date = new Date(result)
      expect(date.getFullYear()).toBe(2026)
      expect(date.getFullYear()).not.toBe(4051)
    })

    it('should produce correct date for "year 2 April" scenario', () => {
      // User scenario: "year 2 April" with anchor 2025
      // If selectedYear is passed as actual year (2027): should be March 31, 2027
      const resultActualYear = calculateAllocationEndDate(2027, 4, 2025)
      const dateActual = new Date(resultActualYear)
      expect(dateActual.getFullYear()).toBe(2027)
      expect(dateActual.getMonth()).toBe(2) // March

      // If selectedYear is passed as offset (2): should also be March 31, 2027
      const resultOffset = calculateAllocationEndDate(2, 4, 2025)
      const dateOffset = new Date(resultOffset)
      expect(dateOffset.getFullYear()).toBe(2027)
      expect(dateOffset.getMonth()).toBe(2) // March
    })
  })
})
