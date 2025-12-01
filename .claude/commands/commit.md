---
description: Create a well-formatted git commit
argument-hint: [description]
---

Create a git commit for the current staged changes.

## Steps

1. **Check status** - Run `git status` to see what's staged
2. **Review changes** - Run `git diff --staged` to understand the changes
3. **Check recent commits** - Run `git log --oneline -5` to match commit style
4. **Stage if needed** - If nothing staged but there are changes, ask what to stage
5. **Write commit message** following conventions below

## Commit Message Format

```
<type>: <short description>

[optional body - what and why, not how]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependencies, configs

### Rules
- Subject line: imperative mood, no period, max 50 chars
- Body: wrap at 72 chars, explain *what* and *why*
- Reference issues if applicable: "Fixes #123"

## Context from user
$ARGUMENTS

## After committing
- Show the commit hash and message
- Run `git status` to confirm clean state
