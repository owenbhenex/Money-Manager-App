# Templates

## 1. Test Plan

```
# Test Plan - <App> <version/build>
Date · Tester (agent + human owner) · Environment URL · Commit/build

## Scope
In scope: ...
Out of scope: ...
Assumptions & open questions: ...

## Environments & data
Browsers/devices · Test accounts by role (no real secrets) · Seed data · Third-party sandboxes

## Risk ranking
| Area | Risk (H/M/L) | Why |

## Test cases
| ID | Area | Priority | Preconditions | Steps | Expected | Status | Evidence |

## Entry / exit criteria
Entry: build deployed, smoke passes.
Exit: all P0/P1 executed; no open Blocker/Critical; Majors triaged.

## Schedule / tooling
```

## 2. Test Case

```
ID: TC-<area>-<nnn>     Priority: P0-P3     Type: functional | negative | edge | a11y | perf | security
Requirement/Story: <link or ID>
Preconditions: <role, data, state>
Steps:
 1. ...
 2. ...
Expected: <observable outcome>
Actual: <fill when run>
Status: PASS | FAIL | BLOCKED | NOT RUN     Evidence: <path/link>
```

## 3. Bug Report

```
# BUG-<nnn>: <Component> - <what is wrong, in <= 12 words>
Severity: Blocker | Critical | Major | Minor | Trivial      Priority: P0-P3
Status: New            Found in: <build/commit>    Date: <ISO>
Environment: <URL, browser+version, OS/device, viewport, role/account (no secrets), locale>
Related test case: TC-...

## Steps to reproduce
1. ...
2. ...
3. ...

## Expected result
...
## Actual result
...

## Evidence
Screenshot/video: <path>   Console: <errors>   Network: <method URL -> status, redacted body>
Frequency: always | intermittent (n of m) | once
Workaround: <if any>
Scope/impact: <who/what is affected; other browsers/roles checked?>
Suspected cause (hypothesis only): ...
```

Good title: "Checkout - total not updated after removing coupon". Bad title: "Checkout broken".

## 4. QA Summary Report

```
# QA Report - <App> <build>   <date>
Recommendation: GO | NO-GO | GO WITH CONDITIONS  (1-3 sentence reason)

## Coverage
Approach/tier used: A UI-driven | B automated/shell | C static only
Tested: ...          Not tested (and why): ...

## Results
| Status | Count |  PASS / FAIL / BLOCKED / NOT RUN

## Defects
| Severity | Count | IDs |
Top issues (max 5): BUG-... one line each with user impact

## Risks & observations
Flaky areas, performance, accessibility, security notes, spec ambiguities/questions

## Environment
URL, build, browsers, data used

## Next steps
Fixes to verify, tests to automate, areas needing deeper coverage
```
