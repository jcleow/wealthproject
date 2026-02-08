- always use descriptive variable namings
- please kill the background tasks after spinning them up after every iteration

## State Management
- Use **Zustand** for component state management where it makes sense (shared state, complex state logic)
- Prefer Zustand stores over React Context for global/shared state
- Use React's `useState` only for truly local, simple UI state

## Forms
- Use **React Hook Form** for form handling
- Combine with **Zod** for schema validation
- See existing patterns in `frontend/src/components/modals/` for reference

## useEffect & Callbacks
- Never put callback props (e.g., `onClose`, `onSave`, `onChange`) directly in `useEffect` dependency arrays — unstable references cause the effect to re-run on every parent re-render, which breaks focus management, triggers unwanted side effects, etc.
- Instead, store callbacks in a ref: `const onCloseRef = useRef(onClose); onCloseRef.current = onClose` and reference `onCloseRef.current` inside the effect. Only put primitive/stable values (like `isOpen`) in the dependency array.

## Test Account (Development Only)
For Playwright testing and AI-assisted debugging sessions:
- **Email:** `asdf@gmail.com`
- **Password:** `asdf1234!`

Use `authenticatedTest` fixture from `e2e/fixtures/auth.ts` for auto-login in E2E tests.