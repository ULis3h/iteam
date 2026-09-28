# Changelog

All notable changes to iTeam are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] - 2026-09-28

### Added
- Human-in-the-loop **approval steps** (`type: approval`): the run waits (status `waiting`, no slot used, survives restarts) until someone approves or rejects in the UI; the note becomes the step output.
- **Cost limit** per workflow (`settings.maxCostUsd`): the run fails once the summed reported cost exceeds it.
- **Rerun from a step**: re-execute one step and everything downstream inside the same run.
- **Working-tree diff** captured per step (local and remote) and shown in the step detail.
- **Notifications**: opt-in browser notifications and an optional webhook (`ITEAM_WEBHOOK_URL`, `ITEAM_PUBLIC_URL`) for finished / waiting runs.
- First-run checklist on the overview (CLI detected → agent → workflow → run); `waiting` filter on the runs page; `release-gate` example.
- Built-in **demo provider** and one-click demo run (`POST /workflows/demo`, `examples/demo.yaml`): try the pipeline, roadmap and live logs before installing any CLI.
- Per-step **check command** (`check: npm test`): runs in the working directory after the agent; a non-zero exit fails the step.
- Retried prompts include the previous failure and output tail; steps log why they are waiting for capacity.
- Orphaned local agent processes are killed when the server restarts after a crash; runners cancel jobs the server no longer knows.
- CLI versions in Settings; live "will run" command preview in the agent form (`POST /agents/preview`); note on the run page when its workflow changed or was deleted.
- SQLite runs in WAL mode with a busy timeout.
- **Conditional steps** (`when`) branch on inputs or upstream results without an LLM; **output assertions** (`assertOutput`) fail a step whose answer does not satisfy a predicate and feed the reason into retries.
- **Trigger URLs** per workflow (`POST /api/hooks/:id/:token`) start runs from CI or any HTTP client; rotate or revoke from the editor.
- Cost visibility: 24h spend on the overview, per-run totals in the run list, per-agent totals on agent cards.
- Webhook payloads formatted for Slack and Discord incoming webhooks; coloured diff view in the step detail.

### Fixed
- Workflow settings (cost limit) were not persisted when a workflow was created or updated through the API and were returned as a raw string.

### Changed
- Codex agents without auto-approve now run with `--sandbox workspace-write` instead of `--full-auto`.
- Package versions are aligned with the changelog (1.2.0).

## [1.1.0] - 2026-09-28

### Added
- Live agent event streams: Claude Code (`stream-json`) and Codex (`--json`) output is rendered as readable tool/result events; per-step cost, tokens, turns and session id.
- Follow-up prompts that continue a finished Claude Code step in the same session.
- Built-in workflow template gallery (from `examples/`) and agent role presets.
- Per-agent `maxConcurrent`, per-step `workDir` (templated, e.g. `{{inputs.repo}}`), per-runner `--max-jobs`.
- Runner guardrails (`--root`, `--no-custom`), strict CLI parsing, `--version`.
- Retention (`ITEAM_RETENTION_DAYS`, `POST /runs/prune`), run list paging and workflow filter, run download, copy/expand for outputs.
- Optional separate runner credential `ITEAM_RUNNER_TOKEN`; `HOST`, `ITEAM_CORS_ORIGINS`.
- Tests (vitest for the engine and API helpers, node:test for the runner), GitHub Actions CI, Dockerfile + compose, LICENSE.

### Changed
- The server binds to `127.0.0.1` unless `ITEAM_TOKEN` or `HOST` is set; tokens are accepted in headers only.
- Agent env values are masked in API responses and omitted from exports unless `includeEnv=1`.
- Agent configuration is frozen on each run step when the run is created.
- Default working directory for local agents is the home directory instead of the server folder.

### Fixed
- Runs blocked by the global parallel cap are rescheduled when other runs finish.
- Late results of cancelled processes can no longer overwrite a retried attempt.
- Runner reconnects re-attach in-flight jobs instead of failing them; job events are only accepted from the dispatching connection.
- UTF-8 output split across chunks, unbounded output capture, orchestrator secrets leaking into agent processes, `$` sequences corrupting custom commands, Windows spawning of npm shims.
- Workflow editor focus loss while typing step names; renames now update `{{steps.id.*}}` references.

## [1.0.0] - 2026-09-25

First release of the rebuilt product: agents (Claude Code / Codex / Gemini / custom), DAG workflows with templated prompts, runs with pipeline, roadmap and live logs, YAML/JSON import & export, remote runners, bilingual web UI.
