# QA Checklists by Area

Use only the sections relevant to the app. Contents: Smoke · Auth · Forms & validation · CRUD/data · Search/filter/sort/pagination · Payments/checkout · File upload/download · Permissions/roles · API · Error handling · Notifications/email · Accessibility · Responsive · Cross-browser · Performance · Security basics · i18n/time/currency · State/session/navigation

## Smoke (P0)
- App loads with no blank page, console errors, or failed critical requests
- Login works; logout works
- Primary journey completes start to finish
- Key pages reachable from navigation; no dead links on main nav

## Auth
- Sign up: valid, duplicate email, weak password, invalid email, missing fields, email verification flow
- Login: valid, wrong password, unknown user, locked/disabled account, case sensitivity of email
- Password reset: request, expired/used token, reuse of old password rules
- Session: persists on refresh, expires as designed, logout invalidates session (back button, other tab)
- Protected pages redirect to login when signed out, then return to intended page
- Rate limiting / lockout after repeated failures (observe only, don't hammer)
- Social/SSO login: success, cancel, denied scope, existing-account linking
- MFA: correct/incorrect/expired code, recovery path

## Forms & validation
- Required, optional, min/max length, format (email, phone, URL, date), numeric ranges
- Boundary: empty, 1 char, max, max+1, whitespace only, leading/trailing spaces
- Special input: unicode, emoji, RTL text, very long text, HTML/script strings, SQL-like strings (verify escaped, not executed)
- Client vs server validation both enforced (bypass UI, send directly if API accessible)
- Error messages: clear, next to field, keyboard/screen-reader reachable, cleared when fixed
- Submit: double-click/double-submit protection, loading state, success confirmation, data persisted
- Unsaved-changes warning, draft/autosave, reset/cancel behavior, autofill

## CRUD / data
- Create, read, update, delete each work and persist after refresh and re-login
- Edit concurrently in two tabs/users (last-write vs conflict handling)
- Delete: confirmation, soft vs hard delete, cascades, undo, related records
- Lists: empty state, one item, many items, long names, special characters
- Data integrity: totals/counts match, timestamps and timezones correct, no duplicates on retry

## Search / filter / sort / pagination
- No results, single result, many; partial match, case, accents, special characters
- Filters combine correctly; clear filters; state kept in URL and on back button
- Sort ascending/descending, ties stable; pagination first/last/out-of-range page; page size change
- Total counts correct; performance with large result sets

## Payments / checkout (sandbox only)
- Success, declined, insufficient funds, 3-D Secure required/failed, network drop mid-payment
- Pricing: taxes, discounts/coupons (valid, expired, stacked, invalid), shipping, rounding, currency
- Idempotency: refresh/double-click does not double charge; webhook delivered once, out of order, or delayed
- Order/booking status transitions; receipts/emails; refunds/cancellations
- Payment methods and virtual-account/bank-transfer/e-wallet expiry and status callbacks (as applicable)

## File upload / download
- Allowed vs disallowed types, size limit and just over it, empty file, duplicate name, special-character filename
- Wrong extension vs actual content type; progress and cancel; failed upload recovery
- Uploaded file accessible only to authorized users; download integrity and correct filename

## Permissions / roles
- For each role: can see/do what is allowed, and is blocked from the rest (UI hidden AND server enforced)
- Direct URL and direct API call to forbidden resource returns 401/403, not data
- Horizontal access: user A cannot read/modify user B's records by changing IDs (IDOR)
- Role change takes effect; deactivated user loses access

## API
- Status codes correct (200/201/204/400/401/403/404/409/422/429/5xx); consistent error schema
- Required/optional fields, wrong types, nulls, extra fields, oversized payloads, malformed JSON
- Auth: missing/expired/invalid token; CORS as intended; pagination and filtering params
- Idempotency of PUT/DELETE; safe GET (no side effects); response time reasonable
- Contract matches OpenAPI/docs; backward compatibility of fields

## Error handling & resilience
- Offline / network failure / timeout / slow 3G: sensible message, retry, no data loss
- 404 and 500 pages; API error surfaced to user without stack traces or internals
- Back/forward/refresh mid-flow; multiple tabs; expired session mid-action
- Third-party outage (payments, email, maps): graceful degradation

## Notifications / email / webhooks
- Triggered at the right event, once; correct recipient, subject, content, links, unsubscribe
- Links work and are not reusable past expiry; in-app notification read/unread state
- Webhooks: signature verified, retries, ordering

## Accessibility (WCAG 2.2 AA essentials)
- Full keyboard operation: logical tab order, visible focus, no traps, skip link, Esc closes modals
- Semantic structure: headings, landmarks, labels tied to inputs, alt text, button vs link usage
- Contrast >= 4.5:1 text; not color-only meaning; zoom to 200% and text resize without loss
- Screen-reader announcements for errors, dynamic updates, dialogs; focus returned after modal closes
- Run automated scan (axe/Lighthouse) then verify manually; automated tools catch only part

## Responsive / visual
- Widths: 320, 375, 768, 1024, 1440+; portrait/landscape; no horizontal scroll or overlap
- Touch targets >= 44px; sticky headers/footers do not cover content; keyboard on mobile does not hide fields
- Images/fonts load; long text wraps; dark mode if supported; print styles if relevant

## Cross-browser / device
- Latest Chrome, Firefox, Safari (WebKit), Edge; iOS Safari and Android Chrome at minimum
- Features: date pickers, file inputs, clipboard, storage, payment popups, PWA behavior

## Performance (observational)
- Core Web Vitals via Lighthouse (LCP, CLS, INP); time to interactive on key pages
- Large lists/tables, big images, unnecessary requests, memory growth in long sessions
- Basic load only against systems you own and with permission

## Security basics (non-intrusive)
- HTTPS enforced; secure/HttpOnly cookies; no secrets or tokens in URLs, logs, or client bundle
- XSS: user input rendered escaped; CSRF protection on state-changing requests
- Auth/authorization checks server-side; IDOR; verbose errors; directory listing; exposed .env/.git/debug endpoints
- Security headers (CSP, HSTS, X-Content-Type-Options, frame protections); dependency warnings
- Do not run exploit tools or scans against third-party or production systems without written permission

## i18n / locale / time
- Languages, text expansion, RTL; date/time/number/currency formats; timezone and DST boundaries
- Locale-specific validation (phone formats, postal codes, names)

## State / session / navigation
- Deep links, refresh on any route, browser back/forward, breadcrumbs, redirects after login
- State after logout/login as different user (no stale data from previous user)
- Multi-tab consistency; cache invalidation after updates
