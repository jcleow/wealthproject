# CSS Stacking Context & Z-Index

## What is Z-Index?

Z-index controls the **stacking order** of elements along the z-axis (front-to-back). Higher values appear in front of lower values.

```css
.behind { z-index: 1; }
.in-front { z-index: 10; }
```

## What is a Stacking Context?

A **stacking context** is like a "layer group" - a self-contained layer where z-index values only compete with each other, not with elements outside.

### What Creates a Stacking Context?

An element creates a new stacking context when it has:
- `position: relative/absolute/fixed` + `z-index` value (not `auto`)
- `opacity` less than 1
- `transform`, `filter`, `perspective`
- `isolation: isolate`
- `position: fixed` or `position: sticky`

## The Trap: Z-Index Only Works Within the Same Context

```
Document (root stacking context)
│
├── Header (z-index: 50)
│
├── Main Content (z-index: 1)
│
└── Dropdown Container (z-index: 100)  ← NEW stacking context created
    │
    ├── Backdrop (z-index: 99)
    │
    └── Menu (z-index: 100)
```

### What You'd Expect
Backdrop (z-99) should cover Header (z-50) and Main Content (z-1).

### What Actually Happens
The backdrop's `z-index: 99` only competes with **siblings inside the same container**.

To elements outside, the entire Dropdown Container is ONE unit at z-100. Children can't escape their parent's stacking context.

## Analogy: Folders with Priority

Think of stacking contexts like folders with priority numbers:

```
Folder A (priority: 100)
├── file1.txt (priority: 99)
└── file2.txt (priority: 101)

Folder B (priority: 50)
└── file3.txt (priority: 9999)
```

Even though `file3.txt` has priority 9999, it can never appear above anything in Folder A because its parent folder only has priority 50.

Similarly, `file1.txt` at priority 99 can never go behind Folder B - it's trapped inside Folder A which sits at priority 100.

## Real Example: Why the Backdrop Failed

### The Broken Code

```tsx
// UserMenu.tsx
<div className="relative z-[100]">  {/* Creates stacking context */}
  <button>Toggle Menu</button>

  {isOpen && (
    <>
      {/* This backdrop CAN'T cover elements outside the parent */}
      <div
        className="fixed inset-0 z-[99]"
        onClick={() => setIsOpen(false)}
      />

      <div className="absolute z-[100]">
        Dropdown content
      </div>
    </>
  )}
</div>
```

The backdrop with `z-[99]` is inside a parent with `z-[100]`. Even though it's `fixed inset-0` (covering the viewport visually), clicks on elements outside the parent container won't trigger it because those elements might have their own stacking contexts.

### The Working Solution

Instead of relying on CSS layers, use JavaScript to detect clicks:

```tsx
const menuRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!isOpen) return

  const handleClickOutside = (event: MouseEvent) => {
    // Ask the DOM: "Is the click target inside my menu?"
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  // Listen at document level - bypasses all CSS stacking
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [isOpen])

return (
  <div ref={menuRef} className="relative">
    <button>Toggle</button>
    {isOpen && <div>Dropdown</div>}
  </div>
)
```

**Why this works:**
- `document.addEventListener` listens at the root level
- `element.contains(target)` is a DOM check, not CSS
- Completely ignores z-index and stacking contexts

## Key Takeaways

1. **Z-index is relative** - it only works within the same stacking context
2. **Children can't escape** - a child's z-index can't make it appear behind/above elements outside its parent's stacking context
3. **Creating stacking contexts** - be aware that `z-index` + `position`, `opacity`, `transform` etc. create new contexts
4. **Click-outside detection** - use JavaScript (`document.addEventListener` + `contains()`) instead of CSS backdrops when dealing with complex z-index hierarchies

## Debugging Tips

1. **Chrome DevTools** - In Elements panel, look for "Stacking context" in the Layers panel (3D view)
2. **Check ancestors** - If z-index isn't working, check if any ancestor creates a stacking context
3. **Isolation** - Use `isolation: isolate` intentionally to create stacking contexts when needed

## Further Reading

- [MDN: Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
- [What The Heck, z-index?? (Josh Comeau)](https://www.joshwcomeau.com/css/stacking-contexts/)
