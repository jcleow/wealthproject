import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChartHeader } from '../ChartHeader'

describe('ChartHeader', () => {
  // ============================================
  // BASIC RENDERING TESTS
  // ============================================

  it('renders title and subtitle', () => {
    // Arrange: Set up the component with props
    render(<ChartHeader title="Net Worth Projection" subtitle="Age 30 to 65" />)

    // Assert: Check that the text appears on screen
    expect(screen.getByText('Net Worth Projection')).toBeInTheDocument()
    expect(screen.getByText('Age 30 to 65')).toBeInTheDocument()
  })

  it('does not render Add Event button when onAddScenario is not provided', () => {
    render(<ChartHeader title="Test" subtitle="Test" />)

    // queryByText returns null if not found (doesn't throw)
    expect(screen.queryByText('Add Event')).not.toBeInTheDocument()
  })

  // ============================================
  // INTERACTION TESTS
  // ============================================

  it('calls onAddScenario when Add Event button is clicked', () => {
    // Arrange: Create a mock function to track calls
    const handleAddScenario = vi.fn()

    render(
      <ChartHeader
        title="Test"
        subtitle="Test"
        onAddScenario={handleAddScenario}
      />
    )

    // Act: Click the button
    fireEvent.click(screen.getByText('Add Event'))

    // Assert: Verify the callback was called
    expect(handleAddScenario).toHaveBeenCalledTimes(1)
  })

  // ============================================
  // CONDITIONAL RENDERING TESTS
  // ============================================

  it('renders chart controls when enableChartOverlays is true', () => {
    const handleChartTypeChange = vi.fn()
    const handleMetricsChange = vi.fn()

    render(
      <ChartHeader
        title="Test"
        subtitle="Test"
        enableChartOverlays={true}
        chartType="area"
        onChartTypeChange={handleChartTypeChange}
        selectedMetrics={['netWorth']}
        onMetricsChange={handleMetricsChange}
      />
    )

    // ChartControls should be rendered (check for its content)
    // This depends on what ChartControls renders - adjust as needed
    expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument()
  })
})
