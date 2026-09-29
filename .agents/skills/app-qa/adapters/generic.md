# Generic adapter (any agent)

Use this when no agent-specific adapter exists.

1. Read `SKILL.md` fully, then follow the workflow in order.
2. Discover your capabilities before planning: can you run shell commands, control a browser, reach the network, write files, use git? Adapt each layer to what you actually have and record gaps in the report's coverage table.
3. If you cannot run the app at all, do a static review (code, config, dependencies, tests) and say clearly that no runtime testing happened.
4. Load reference files one at a time, when you reach that layer, to keep context small.
5. If your platform limits context or turn length, work layer by layer and write findings to `QA_REPORT.md` incrementally so progress survives an interruption.
6. Ask the user only for things you cannot discover: target URL or start command, test credentials, and confirmation of the environment tier.
