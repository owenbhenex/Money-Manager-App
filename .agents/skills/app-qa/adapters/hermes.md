# Hermes adapter

Hermes-style agents usually work mainly through a terminal and file tools, sometimes with browser or messaging tools. Confirm what your session exposes.

- **Shell-first testing**: without a browser tool, drive web apps through Playwright scripts (see `references/web.md`) and APIs through curl. State clearly in the coverage table if UI layers were skipped for lack of a browser.
- **Persistence**: write `QA_REPORT.md` and `QA_FIXES.md` incrementally, and keep a `qa-artifacts/` folder, so a long or interrupted run can be resumed by reading those files.
- **Context economy**: load reference files one at a time, only when reaching that layer.
- **Reporting channel**: if you are reachable through a chat or messaging gateway, send the final summary (Step 6) there and point to the report file instead of pasting the full report.
- **Fixing**: follow `references/fix-loop.md` exactly; never push, merge, or deploy.
- **Skill location**: place this whole `app-qa/` folder wherever your setup loads skills from, and keep the internal relative paths unchanged.
- Verify with the user if any assumption here does not match their Hermes setup.
