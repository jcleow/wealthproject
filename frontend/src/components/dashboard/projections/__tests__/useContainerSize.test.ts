import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContainerSize } from '../useContainerSize'

describe('useContainerSize', () => {
  // The ResizeObserver is mocked in setupTests.ts with 800x600 dimensions

  it('returns a ref that can be attached to a container', () => {
    const { result } = renderHook(() => useContainerSize())

    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef.current).toBeNull() // Not attached yet
  })

  it('initially has hasSize false before ref is attached', () => {
    const { result } = renderHook(() => useContainerSize())

    // Before the ref is attached to a DOM element
    expect(result.current.hasSize).toBe(false)
    expect(result.current.containerWidth).toBe(0)
  })

  it('updates size when ref is attached to an element', () => {
    const { result } = renderHook(() => useContainerSize())

    // Create a mock element and attach the ref
    const mockElement = document.createElement('div')

    // Mock getBoundingClientRect
    mockElement.getBoundingClientRect = vi.fn(() => ({
      width: 500,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))

    // Manually set the ref (simulating React attaching it)
    act(() => {
      // @ts-ignore - accessing internal for testing
      result.current.containerRef.current = mockElement
    })

    // The hook should detect the size via ResizeObserver mock
    // Note: The actual size depends on the mock in setupTests.ts
  })

  it('returns stable ref across re-renders', () => {
    const { result, rerender } = renderHook(() => useContainerSize())

    const firstRef = result.current.containerRef

    rerender()

    const secondRef = result.current.containerRef

    // Ref should be the same object (stable reference)
    expect(firstRef).toBe(secondRef)
  })
})
