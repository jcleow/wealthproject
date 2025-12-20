# Git Hooks for Testing and Linting

## Background: Why Git Hooks?

Without git hooks, the typical workflow is:

```
1. Developer writes code
2. Developer commits & pushes
3. CI runs tests (5-10 min wait)
4. CI fails ❌
5. Developer fixes, commits, pushes again
6. Repeat...
```

With git hooks:

```
1. Developer writes code
2. Developer tries to commit
3. Pre-commit hook runs linting (instant feedback)
4. Developer tries to push
5. Pre-push hook runs tests (local, faster than CI)
6. Only clean code reaches CI ✅
```

## Benefits

- **Faster feedback:** Catch errors in seconds, not minutes
- **Reduced CI costs:** Fewer failed builds = less compute time
- **Cleaner git history:** No "fix lint" or "fix tests" commits
- **Team consistency:** Everyone runs the same checks

## Tools

### Husky

Modern git hooks manager for Node.js projects. Installs hooks that run npm scripts.

```bash
pnpm add -D husky
pnpm exec husky init
```

### lint-staged

Runs linters only on staged files (fast, focused).

```bash
pnpm add -D lint-staged
```

## Implementation

### 1. Install dependencies

```bash
cd frontend
pnpm add -D husky lint-staged
```

### 2. Initialize husky

```bash
pnpm exec husky init
```

This creates `.husky/` directory with a sample pre-commit hook.

### 3. Configure lint-staged

Add to `frontend/package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

### 4. Setup pre-commit hook

Edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd frontend && pnpm lint-staged
```

This runs linting only on staged files - fast even in large codebases.

### 5. Setup pre-push hook

Create `.husky/pre-push`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running tests before push..."

# Frontend tests
cd frontend && pnpm test --passWithNoTests

# Backend tests
cd ../backend && go test ./... -short
```

## Hook Options

### Pre-commit (fast, every commit)

- **Linting:** ESLint, Prettier
- **Type checking:** `tsc --noEmit` (optional, can be slow)
- **Format checking:** Prettier --check

### Pre-push (thorough, before push)

- **Unit tests:** Jest, Go test
- **Type checking:** Full TypeScript build
- **Build verification:** `pnpm build`

## Configuration Examples

### Minimal (recommended to start)

```bash
# .husky/pre-commit
cd frontend && pnpm lint-staged

# .husky/pre-push
cd frontend && pnpm test --passWithNoTests
cd backend && go test ./... -short
```

### Comprehensive

```bash
# .husky/pre-commit
cd frontend && pnpm lint-staged
cd frontend && pnpm type-check

# .husky/pre-push
cd frontend && pnpm test
cd frontend && pnpm build
cd backend && go test ./...
cd backend && go build ./cmd/server
```

## Skipping Hooks (Escape Hatch)

Sometimes you need to push work-in-progress:

```bash
# Skip pre-commit
git commit --no-verify -m "WIP: work in progress"

# Skip pre-push
git push --no-verify
```

Use sparingly - the point is to catch issues early.

## Monorepo Considerations

For a monorepo with `frontend/` and `backend/`:

### Option 1: Root-level husky

```
/
├── .husky/
│   ├── pre-commit
│   └── pre-push
├── frontend/
└── backend/
```

Hooks run from root, `cd` into subdirectories as needed.

### Option 2: Detect changed files

Only run tests for changed parts:

```bash
# .husky/pre-push
if git diff --name-only origin/main...HEAD | grep -q "^frontend/"; then
  echo "Frontend changes detected, running frontend tests..."
  cd frontend && pnpm test
fi

if git diff --name-only origin/main...HEAD | grep -q "^backend/"; then
  echo "Backend changes detected, running backend tests..."
  cd backend && go test ./...
fi
```

## Troubleshooting

### Hooks not running

```bash
# Ensure hooks are executable
chmod +x .husky/*

# Reinstall husky
pnpm exec husky install
```

### Hooks too slow

- Use `lint-staged` to only check changed files
- Use `go test -short` to skip slow tests
- Skip type-check in pre-commit, do it in pre-push
- Consider running only affected tests

### Team members missing hooks

Husky auto-installs hooks via `prepare` script in package.json:

```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

After `pnpm install`, hooks are set up automatically.

## Alternative: lefthook

If husky feels too Node-centric, `lefthook` is a fast Go-based alternative:

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint-frontend:
      root: frontend/
      run: pnpm lint-staged
    lint-backend:
      root: backend/
      run: golangci-lint run

pre-push:
  commands:
    test-frontend:
      root: frontend/
      run: pnpm test
    test-backend:
      root: backend/
      run: go test ./...
```

## References

- [Husky docs](https://typicode.github.io/husky/)
- [lint-staged docs](https://github.com/okonet/lint-staged)
- [lefthook docs](https://github.com/evilmartians/lefthook)
