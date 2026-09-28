# Changelog

All notable changes to iTeam are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/).

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
