---
description: Deep security audit of code changes
argument-hint: [file-or-scope]
---

Perform a thorough security review focusing on:

## OWASP Top 10
1. **Injection** - SQL, NoSQL, OS command, LDAP injection
2. **Broken Authentication** - Session management, credential storage, MFA gaps
3. **Sensitive Data Exposure** - Secrets in code, unencrypted data, logging PII
4. **XML External Entities (XXE)** - XML parser configuration
5. **Broken Access Control** - Missing authz checks, IDOR, privilege escalation
6. **Security Misconfiguration** - Default configs, verbose errors, missing headers
7. **XSS** - Reflected, stored, DOM-based cross-site scripting
8. **Insecure Deserialization** - Untrusted data deserialization
9. **Using Components with Known Vulnerabilities** - Outdated dependencies
10. **Insufficient Logging & Monitoring** - Missing audit trails

## LLM/AI-Specific (OWASP LLM Top 10)
1. **Prompt Injection** - Direct/indirect injection via user input or retrieved data
2. **Insecure Output Handling** - Trusting LLM output without validation
3. **Training Data Poisoning** - If applicable
4. **Model Denial of Service** - Resource exhaustion via crafted inputs
5. **Supply Chain Vulnerabilities** - Third-party model/plugin risks
6. **Sensitive Information Disclosure** - PII leakage in prompts/responses
7. **Insecure Plugin Design** - Overprivileged tools, missing input validation
8. **Excessive Agency** - LLM actions without human approval
9. **Overreliance** - Missing validation of LLM-generated code/data
10. **Model Theft** - API key exposure, model extraction

## Additional Checks
- **Secrets** - API keys, passwords, tokens in code or configs
- **Input Validation** - All external inputs sanitized
- **Error Handling** - No sensitive info in error messages
- **Rate Limiting** - Protection against abuse
- **CORS/CSP** - Proper headers configured

$ARGUMENTS

If no specific scope is mentioned, review all pending changes.

**Output format:**
- Group by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
- Each finding: Location, vulnerability type, impact, remediation
- Include proof-of-concept where applicable
