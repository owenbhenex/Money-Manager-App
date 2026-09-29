# Recon

Spend a few minutes here; wrong assumptions poison everything after.

## 1. Find the project facts
Look in: README, AGENTS.md, PRD.md, ARCHITECTURE.md, package.json / pyproject / pubspec / build.gradle / Podfile, docker-compose, .env.example, CI config, existing tests.

Capture:
- **Platform(s)**: web (SPA/SSR), REST/GraphQL API, Android, iOS, React Native/Flutter, desktop (Electron/Tauri), CLI
- **Stack and how to run it**: install, start, seed, test commands; ports; required services (DB, cache, queue)
- **Spec**: where acceptance criteria live
- **Test accounts/roles**: never use real accounts; ask if none exist
- **Third parties**: payment gateway, email/SMS, auth provider, maps, analytics. Note which have sandbox modes.

## 2. Classify the environment and tier
- localhost / 127.0.0.1 / private dev container / `*.local` -> **Open**
- Staging or preview URL -> **Open** only if the user confirms it uses test data and sandboxed third parties; otherwise **Guarded**
- Public production domain, app-store build, anything with real users -> **Guarded**
- Unknown -> **Guarded**, ask once

For payments (virtual accounts, e-wallets, cards) use the gateway's sandbox only. Never trigger a real payment.

## 3. Inventory your tools
Check what you can actually do; do not assume.
- Browser control (Playwright, built-in agent browser, Chrome automation)? `npx playwright --version`
- HTTP client (curl, httpie, language HTTP libs)?
- Android: `adb devices`, `emulator -list-avds`. iOS: `xcrun simctl list` (macOS only).
- Test runners already in the repo (jest, vitest, pytest, playwright, cypress, maestro)?
- Lighthouse, axe-core available or installable? (Network may be limited; check before planning around it.)
- Ability to read server logs / DB?

## 4. Decide coverage
For every layer in the workflow, mark: **run**, **partial**, or **skip (reason)**. Put this table in the report's "Test context" so the reader knows what "no bugs found" actually covers.

## 5. Smoke check first
Start the app, load the home/entry screen, hit a health endpoint or main page. If the app does not start, that is finding #1; report it and try to fix it before continuing.
