---
description: Advanced React patterns for performance optimization and best practices
triggers:
  - performance
  - re-render
  - slow
  - optimize
  - memoization
  - useMemo
  - useCallback
  - React.memo
  - composition
  - context
  - reconciliation
  - useEffect
  - useLayoutEffect
  - refs
  - forwardRef
  - portal
  - data fetching
  - race condition
  - error boundary
---

# Advanced React Patterns

Reference guide based on "Advanced React" by Nadia Makarevich. Use these patterns when optimizing React performance or debugging re-render issues.

## Core Concepts

### Re-renders: The Basics

- **Re-rendering is essential** - it's how React updates components with new data. Without re-renders, no interactivity.
- **State update is the initial source of ALL re-renders** in React apps.
- When a component re-renders, **all nested components re-render too** (down the tree).
- React **never goes "up"** the render tree when re-rendering.

### The Big Re-renders Myth

**MYTH: "Components re-render when their props change"**

This is FALSE. Normal React behavior:
- If state update is triggered → all nested components re-render **regardless of props**
- If no state update → changing props does nothing (React doesn't monitor them)
- Props only matter when using `React.memo`

```tsx
// This WON'T trigger re-render - no state update!
const App = () => {
  let isOpen = false; // local variable
  return (
    <Button onClick={() => (isOpen = true)}>
      Open dialog
    </Button>
  );
};
```

---

## Performance Patterns

### Pattern 1: Moving State Down

Extract state and components that depend on it into a smaller component.

```tsx
// BEFORE: Slow - entire App re-renders on dialog open
const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open</Button>
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
      <VerySlowComponent />  {/* Re-renders unnecessarily! */}
    </div>
  );
};

// AFTER: Fast - only ButtonWithModal re-renders
const ButtonWithModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open</Button>
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
    </>
  );
};

const App = () => (
  <div>
    <ButtonWithModal />
    <VerySlowComponent />  {/* Won't re-render */}
  </div>
);
```

### Pattern 2: Children as Props

Pass slow components as props/children to isolate them from state updates.

```tsx
// BEFORE: Slow - scroll updates re-render everything
const ScrollArea = () => {
  const [position, setPosition] = useState(0);
  return (
    <div onScroll={(e) => setPosition(e.target.scrollTop)}>
      <MovingBlock position={position} />
      <VerySlowComponent />  {/* Re-renders on every scroll! */}
    </div>
  );
};

// AFTER: Fast - children passed as props don't re-render
const ScrollArea = ({ children }) => {
  const [position, setPosition] = useState(0);
  return (
    <div onScroll={(e) => setPosition(e.target.scrollTop)}>
      <MovingBlock position={position} />
      {children}  {/* Won't re-render - same object reference */}
    </div>
  );
};

const App = () => (
  <ScrollArea>
    <VerySlowComponent />
  </ScrollArea>
);
```

**Why it works:** Elements passed as props are created in the parent scope. When the child re-renders, React compares the element objects with `Object.is()`. Since the reference hasn't changed, React skips re-rendering.

### Pattern 3: Elements as Props (Configuration)

Pass pre-configured elements for flexible component APIs.

```tsx
// Configurable button with icon
const Button = ({ icon, children }) => (
  <button>
    {icon}
    {children}
  </button>
);

// Usage - icon won't re-render when Button re-renders
<Button icon={<SearchIcon />}>Search</Button>
```

---

## Memoization

### When to Use React.memo

`React.memo` makes React **check props before re-rendering**. Use it when:
- Component is heavy/slow to render
- Component receives the same props frequently
- Component is rendered often due to parent re-renders

```tsx
const SlowComponent = React.memo(({ data }) => {
  // expensive render
});
```

### React.memo Pitfalls

**Objects/arrays/functions as props break memoization:**

```tsx
// BAD: New object every render, memo useless
<MemoizedComponent style={{ color: 'red' }} />

// GOOD: Stable reference
const style = useMemo(() => ({ color: 'red' }), []);
<MemoizedComponent style={style} />
```

**Callbacks break memoization:**

```tsx
// BAD: New function every render
<MemoizedComponent onClick={() => doSomething()} />

// GOOD: Stable callback
const onClick = useCallback(() => doSomething(), []);
<MemoizedComponent onClick={onClick} />
```

### useMemo and useCallback

```tsx
// useMemo: Cache expensive calculations
const sortedList = useMemo(() => {
  return items.sort((a, b) => a.value - b.value);
}, [items]);

// useCallback: Cache function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

**Don't overuse!** Memoization has overhead. Only use when:
1. Calculation is actually expensive
2. Reference stability matters (for memo'd children or effect deps)

---

## Hooks Danger Zone

### Custom Hooks Cause Re-renders

State in hooks triggers re-renders in the component using the hook, **even if the state isn't used**:

```tsx
// DANGEROUS: App re-renders on every resize!
const useWindowSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handler = () => setSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
};

const App = () => {
  const size = useWindowSize(); // Every resize re-renders App!
  return <SlowComponent />;
};
```

**Fix:** Move the hook to a smaller component or use the state only where needed.

---

## Context Performance

### Context Re-render Rules

When context value changes, **ALL consumers re-render**, even if they only use part of the value.

```tsx
// BAD: Every consumer re-renders when ANY value changes
const AppContext = createContext({ user: null, theme: 'light', settings: {} });

// GOOD: Split into separate contexts
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const SettingsContext = createContext({});
```

### Context Value Stability

```tsx
// BAD: New object every render
<MyContext.Provider value={{ user, updateUser }}>

// GOOD: Memoize the value
const value = useMemo(() => ({ user, updateUser }), [user, updateUser]);
<MyContext.Provider value={value}>
```

---

## Refs

### When to Use Refs Instead of State

Use refs when you need to:
- Store values that **shouldn't trigger re-renders**
- Access DOM elements
- Keep mutable values across renders

```tsx
// Track previous value without re-render
const prevValueRef = useRef(value);
useEffect(() => {
  prevValueRef.current = value;
});

// Store timeout ID
const timeoutRef = useRef(null);
const handleClick = () => {
  clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {}, 1000);
};
```

### Ref vs State

| Ref | State |
|-----|-------|
| Update doesn't trigger re-render | Update triggers re-render |
| Synchronous updates | Async/batched updates |
| Mutable (`.current`) | Immutable |
| For DOM access, timers, previous values | For UI data |

---

## useEffect vs useLayoutEffect

### useEffect
- Runs **after** browser paints
- Non-blocking, better for performance
- Use for: data fetching, subscriptions, logging

### useLayoutEffect
- Runs **before** browser paints
- Blocking, can cause jank if slow
- Use for: DOM measurements, preventing flicker

```tsx
// Flickers - useEffect runs after paint
const [position, setPosition] = useState(0);
useEffect(() => {
  setPosition(calculatePosition());
}, []);

// No flicker - useLayoutEffect runs before paint
useLayoutEffect(() => {
  setPosition(calculatePosition());
}, []);
```

---

## Data Fetching

### Prevent Race Conditions

```tsx
useEffect(() => {
  let cancelled = false;

  fetchData(id).then(data => {
    if (!cancelled) {
      setData(data);
    }
  });

  return () => {
    cancelled = true;
  };
}, [id]);
```

### With AbortController

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });

  return () => controller.abort();
}, [url]);
```

---

## Error Boundaries

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}
```

**Limitations:**
- Only catch errors in render, lifecycle methods, and constructors
- Don't catch: event handlers, async code, SSR, errors in the boundary itself

---

## Quick Reference: Performance Checklist

1. **Is state in the right place?** Move it down if possible
2. **Can slow components be passed as children/props?**
3. **Is React.memo needed?** Only for heavy components with stable props
4. **Are context values memoized?** Split contexts if needed
5. **Are hooks causing unnecessary re-renders?** Check custom hooks
6. **Are expensive calculations memoized with useMemo?**
7. **Are callback references stable with useCallback?** (only when needed)

## Don'ts

- Don't wrap everything in `React.memo` - it has overhead
- Don't use `useMemo`/`useCallback` for cheap operations
- Don't store UI state in refs (won't trigger updates)
- Don't create components inside other components
- Don't use array index as key for dynamic lists
