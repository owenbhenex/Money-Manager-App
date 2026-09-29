# Security basics (hygiene checks on the user's own app)

This is defensive QA, not penetration testing. Check that common mistakes are absent; do not build exploits or attack third-party systems. Stay within the safety tier.

## Authentication and sessions
- Login errors do not reveal whether an account exists (or note it as low)
- Rate limiting or lockout on login, OTP, password reset
- Session/token invalidated on logout and after password change; sensible expiry
- Cookies: HttpOnly, Secure, SameSite where applicable; tokens not in URLs
- Password reset links single-use and expiring

## Authorization
- Each role limited to its own permissions, enforced server-side (not just hidden in the UI)
- Users cannot read or change other users' data by changing an ID in URL/body (IDOR)
- Admin pages and APIs require admin

## Input and output handling
- User-supplied text rendered as text (no script execution in names, comments, search)
- Server validates input regardless of client validation
- File uploads: type and size limits, no execution, safe filenames
- Error messages do not leak stack traces, SQL, file paths, or internal hostnames

## Data exposure
- API responses do not include fields the client does not need (password hashes, internal ids, other users' PII)
- Secrets: search the repo and built bundles for API keys, tokens, private keys, `.env` committed; source maps exposed in production
- HTTPS everywhere; no mixed content; HSTS on production
- Security headers: Content-Security-Policy, X-Content-Type-Options, frame protections, Referrer-Policy
- CORS not wildcard for authenticated APIs
- Dependencies: run the ecosystem audit (`npm audit`, `pip-audit`, etc.) and list high/critical items

## Mobile native
- Sensitive data in logs, insecure local storage, cleartext traffic allowed, exported components, debuggable release build, hardcoded secrets in the binary

Report each item with impact in plain language and a concrete fix.
