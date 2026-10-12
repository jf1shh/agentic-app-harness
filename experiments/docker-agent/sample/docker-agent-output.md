# Work Order: 2 spec feature(s) not marked complete for legal-financial-rag

- Finding ID: legal-financial-rag-spec-drift
- App: legal-financial-rag
- Type: drift
- Severity: medium
- Acceptance gate: manual-review
- Spec: specs/legal-financial-rag-spec.md

## Context

Implement (or explicitly defer) these unchecked spec items:
  - **Security & Privilege Control Matrix**: Enforce strict document classification tags (`CONFIDENTIAL`, `ATTORNEY_CLIENT_PRIVILEGE`, `WORK_PRODUCT`, `PUBLIC_RESTRICTED`, `HIGHLY_RESTRICTED`) and user role permissions during query execution.
  - **5 Enterprise Defense-in-Depth Security Hardening Layers**: Zero-exfiltration CSP headers, PBKDF2 100,000-iteration key derivation, auto-lock timer, ReDoS/prompt injection shield, and tamper-evident blockchain-style hash chaining.

### Spec reference for "Security & Privilege Control Matrix"

> **Security & Privilege Control Matrix**
> 
> Enforce strict document classification tags (`CONFIDENTIAL`, `ATTORNEY_CLIENT_PRIVILEGE`, `WORK_PRODUCT`, `PUBLIC_RESTRICTED`, `HIGHLY_RESTRICTED`) and user role permissions during query execution.

### Spec reference for "5 Enterprise Defense-in-Depth Security Hardening Layers"

> **5 Enterprise Defense-in-Depth Security Hardening Layers**
> 
> Zero-exfiltration CSP headers, PBKDF2 100,000-iteration key derivation, auto-lock timer, ReDoS/prompt injection shield, and tamper-evident blockchain-style hash chaining.

## Definition of done

1. Implement the "Security & Privilege Control Matrix" feature as specified, ensuring document classification tags and user role permissions are enforced during query execution.
2. Implement the "5 Enterprise Defense-in-Depth Security Hardening Layers" feature, including:
   - Zero-exfiltration CSP headers
   - PBKDF2 100,000-iteration key derivation
   - Auto-lock timer
   - ReDoS/prompt injection shield
   - Tamper-evident blockchain-style hash chaining
3. Verify that the implemented features meet the requirements specified in the spec.
4. Run the acceptance gate command: `manual-review`
5. Run `node scripts/emit-tasks.mjs --prune`
6. Open a PR — never self-merge