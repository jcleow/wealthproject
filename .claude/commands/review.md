---
description: Review code changes for bugs, style, and best practices
argument-hint: [file-or-description]
---

Review the following code changes for:

1. **Bugs & Logic Errors** - Off-by-one errors, null/undefined handling, race conditions
2. **Security Issues**
   - Input validation, injection risks (SQL, XSS, command injection)
   - **Prompt injection** - User input that could manipulate LLM behavior, untrusted data in prompts
   - Auth/authz gaps, secrets exposure
3. **Performance** - N+1 queries, unnecessary re-renders, memory leaks
4. **Code Style** - Naming, consistency with existing patterns, readability
5. **Edge Cases** - Empty states, error handling, boundary conditions

$ARGUMENTS

If no specific file/change is mentioned, review the current uncommitted changes (staged + unstaged).

**Output format:**
- List issues by severity: Critical > High > Medium > Low
- For each issue: file:line, what's wrong, suggested fix
- End with a summary: "X issues found (Y critical, Z high)"
