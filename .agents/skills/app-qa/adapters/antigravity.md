# Antigravity adapter

Antigravity agents typically have an editor, a terminal, and a controllable browser. Confirm what your session exposes before relying on it.

- **Browser**: if a browser agent/tool is available, use it as the primary web driver (see `references/web.md`) and save screenshots to `qa-artifacts/`. Its recordings or screenshots are good evidence to link from findings.
- **Terminal**: use it for starting the app, running the test suite, curl/API checks, git branching, `adb`, and Lighthouse/axe if installed.
- **Plan first**: write the test plan (Step 2) into a file such as `qa-artifacts/PLAN.md` before executing, so the run is reviewable and resumable.
- **Long runs**: if the task feels large, split by layer and finish one layer's findings in `QA_REPORT.md` before starting the next.
- **Fixing**: use the editor for changes, but keep the branch-per-run, commit-per-bug rules from `references/fix-loop.md`.
- **Skill location**: if your setup expects skills in a specific folder (project-level or global), place this whole `app-qa/` folder there, and keep the internal relative paths unchanged.
- Verify with the user if any assumption here does not match their Antigravity version.
