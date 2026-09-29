# Fix loop

Fixing is part of the job, but a fix you have not verified is just a guess.

## Setup
1. Confirm you are in the local source repository and that the working tree is clean (or stash/commit the user's changes first).
2. Create a branch: `git checkout -b qa/fixes-YYYYMMDD`.
3. Run the existing test suite once to record the baseline (what already fails before you touch anything).

## For each finding, highest severity first
1. **Reproduce** it again; capture the failing state.
2. **Write a failing test** that captures the bug when practical (unit, API, or e2e). Skip only for purely visual issues; then capture before/after screenshots.
3. **Find the root cause**, not just the symptom. If several findings share a cause, fix once and link them.
4. **Make the smallest correct change.** Do not refactor unrelated code or change behavior beyond the bug.
5. **Verify**: the new test passes, the original manual reproduction is fixed, the full suite shows no new failures, and adjacent flows still work.
6. **Commit** one bug per commit: `fix(qa-012): short description`, body with cause and verification.
7. **Update** status in `QA_REPORT.md` and `QA_FIXES.md` (Fixed and verified / Fixed, unverified / Needs decision / Won't fix, with reason).

## Stop and ask when
- The fix needs a product or design decision (which behavior is correct?)
- It touches auth, payments, migrations, or data deletion in a way that could lose data
- The correct fix is a large refactor; propose it instead and mark "needs decision"
- Two attempts have failed; write down what you learned and move on

## After the loop
Re-run the plan's critical journeys once more, not just the fixed items, to catch regressions. Record final counts. Never merge or push to a protected branch or deploy; leave the branch for the user to review.
