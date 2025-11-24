import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    // Simulate an initial size so charts render during tests
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 600,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this
    )
  }

  unobserve() {}
  disconnect() {}
}

// Provide a predictable ResizeObserver for jsdom
// @ts-expect-error jsdom global override for tests
global.ResizeObserver = ResizeObserverMock
