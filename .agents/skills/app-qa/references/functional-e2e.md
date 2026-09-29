# Functional / end-to-end

Test what users are trying to accomplish, not individual widgets.

## Build the journey list
From the spec, list each user journey start to finish (sign up -> verify -> log in -> core task -> result -> log out). Add the journeys users invent: change their mind halfway, go back, retry, come back later.

## For every journey, cover
- **Happy path** with valid data
- **Validation**: empty, too short/long, wrong format, special characters, emoji, RTL text, leading/trailing spaces, script-like strings (verify they are displayed as text, not executed)
- **State**: refresh mid-flow, back/forward, open in two tabs/devices, session expiry, logout then back-button
- **Repetition**: double-click submit, retry after failure, duplicate records
- **Boundaries**: zero, one, max, max+1; past/future dates; timezone edges; currency rounding; pagination edges
- **Permissions**: each role sees and does only what it should; deep-link to a page you should not reach
- **Data integrity**: after every write, verify the data is actually correct where it lands (list view, detail view, API, DB) and that related counts/totals update
- **Errors**: server error, timeout, offline, partial failure. Is the message useful? Can the user recover?
- **Side effects**: emails/notifications/webhooks triggered exactly once, with correct content (use sandbox or captured output)
- **Money flows** (Open tier / sandbox only): totals, tax, discounts, refunds, failed and pending payments, callbacks arriving late or twice

## Unspecified-behavior sweep
Click everything. Every link, button, menu item, tab, footer link. Look for: dead links, placeholder text (lorem ipsum, TODO), features that do nothing, inconsistent labels, wrong language, missing loading/empty/error states.

## Judging a result
A step passes only if the visible outcome AND the underlying state are right. Note timing: an action that takes 10 seconds with no feedback is a finding even if it eventually works.
