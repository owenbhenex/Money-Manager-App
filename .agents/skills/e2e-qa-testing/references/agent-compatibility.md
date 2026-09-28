# Using this skill across AI agents

The skill is plain Markdown with YAML frontmatter (`name`, `description`), the open "SKILL.md" layout used by most agent tools. No agent-specific syntax is used, so the same folder works everywhere. Install paths below are the commonly documented ones and can change between versions - confirm in your tool's docs if a path does not work.

Folder to install: `e2e-qa-testing/` (contains `SKILL.md` and `references/`).

| Agent | Where to put it | Notes |
|---|---|---|
| Claude (claude.ai / Desktop) | Settings > Capabilities > Skills > upload `e2e-qa-testing.skill` (or the zipped folder) | Needs Code execution/File creation enabled for Tier B; use the Chrome extension or computer-use for Tier A |
| Claude Code | `~/.claude/skills/e2e-qa-testing/` (personal) or `<project>/.claude/skills/e2e-qa-testing/` (shared via git) | Runs shell and can use Playwright directly |
| Google Antigravity | `<workspace>/.agent/skills/e2e-qa-testing/` (workspace) or `~/.gemini/antigravity/skills/e2e-qa-testing/` (global) | Its built-in browser agent gives Tier A UI testing with screenshots |
| Hermes Agent | `~/.hermes/skills/e2e-qa-testing/` | Confirm the skills directory with `hermes` docs/CLI; use its terminal/browser tools for Tier A/B |
| ChatGPT / Codex / others | If skills are not supported: paste the body of `SKILL.md` into Project instructions / custom instructions, and attach `references/*.md` as project files. Codex CLI can read it from the repo (e.g. reference it from `AGENTS.md`) | Without code execution you are Tier C (static + manual test script) |
| Cursor / Windsurf / Copilot / any other | Put the folder in the repo (e.g. `docs/skills/e2e-qa-testing/`) and add to `AGENTS.md` / rules file: "For QA/testing tasks follow `docs/skills/e2e-qa-testing/SKILL.md`" | Works because the workflow is tool-agnostic |

## Cross-agent tip: AGENTS.md pointer
```
## QA
When asked to test, QA, verify, or review a build, read and follow skills/e2e-qa-testing/SKILL.md.
Test only against local/staging. Never commit credentials.
```

## Example trigger prompts
- "QA the checkout flow on http://localhost:3000 end to end and give me a bug list."
- "Run a smoke + regression test on staging before tonight's release and tell me go/no-go."
- "Write a test plan and test cases from PRD.md, then execute them."
- "Test the new booking feature as student, tutor, and admin roles; check permissions."
- "I can't run the app here - produce a manual QA script and checklist for the tutor booking flow."

## What to give the agent for best results
URL or start command, test accounts per role (test data only), the PRD/user stories, what changed in this release, environments/browsers that matter, and anything off-limits.
