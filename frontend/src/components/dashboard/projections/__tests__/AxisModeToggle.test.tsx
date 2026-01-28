import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AxisModeToggle } from '../AxisModeToggle'

describe('AxisModeToggle', () => {
  it('displays "AGE" when mode is age', () => {
    render(<AxisModeToggle mode="age" onToggle={() => {}} />)

    expect(screen.getByRole('button')).toHaveTextContent('AGE')
  })

  it('displays "YEAR" when mode is actual_year', () => {
    render(<AxisModeToggle mode="actual_year" onToggle={() => {}} />)

    expect(screen.getByRole('button')).toHaveTextContent('YEAR')
  })

  it('calls onToggle when clicked', () => {
    const handleToggle = vi.fn()

    render(<AxisModeToggle mode="age" onToggle={handleToggle} />)

    fireEvent.click(screen.getByRole('button'))

    expect(handleToggle).toHaveBeenCalledTimes(1)
  })
})
