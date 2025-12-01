---
description: Create a GitHub PR with summary and test plan
argument-hint: [base-branch]
---

Create a pull request for the current branch.

## Steps

1. **Analyze changes** - Run `git diff` against the base branch to understand all changes
2. **Check branch status** - Ensure branch is pushed to remote
3. **Generate PR content**:
   - Title: Concise description of the change (imperative mood)
   - Summary: 2-4 bullet points explaining what changed and why
   - Test plan: How to verify the changes work

## Base branch
$ARGUMENTS

If no base branch specified, use `main`.

## PR Template

```
## Summary
- [What changed]
- [Why it changed]
- [Any notable implementation details]

## Test plan
- [ ] [Manual test steps]
- [ ] [Automated tests added/updated]

## Screenshots (if UI changes)
[Add if applicable]
```

## Requirements
- Push branch to remote before creating PR
- Use `gh pr create` command
- Include link to the created PR in response
