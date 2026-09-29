# API testing

Applies to the app's own backend, whether or not the UI exists yet.

## Discover
Read OpenAPI/Swagger, route files, GraphQL schema, or watch the network log while using the UI. List endpoints with method, auth requirement, and expected shapes.

## Per endpoint
- **Contract**: status codes, response shape, types, required vs optional fields, consistent error format
- **Auth**: no token, expired token, wrong-role token, another user's token
- **Authorization (IDOR)**: with user A's token, request user B's resources by ID. Must be refused.
- **Validation**: missing fields, wrong types, oversized payloads, unicode, negative numbers, nulls
- **Idempotency**: repeat POST/PUT/DELETE; retry after timeout; duplicate webhooks
- **Pagination/filtering/sorting**: first, last, beyond last, invalid params
- **Concurrency**: two simultaneous updates to the same record (Open tier)
- **Errors**: 4xx vs 5xx correctness. A 500 on bad input is a bug. Stack traces or internal paths in responses are a finding.
- **Headers**: CORS scope, cache headers on private data, content types
- **Rate limits**: exist on login/OTP/expensive endpoints? (probe lightly; heavy testing only in Open tier)

## Method
Use curl or a script; save requests and responses as evidence. Keep a small reusable collection (`qa/api-checks.sh` or a Postman/Bruno/Playwright API test file) so the developer can re-run it.
