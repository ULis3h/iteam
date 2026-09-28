# Security

## Threat model

iTeam launches command-line agents that run **unattended with auto-approval** in the working directories you configure. Anyone who can reach the API can therefore run arbitrary commands on the server (and on every connected runner). Treat the API as an admin interface.

Protections in place:

- Without `ITEAM_TOKEN` the server binds to `127.0.0.1` only. With a token it binds to all interfaces and every request (UI and runners) must present it in a header. Tokens are compared in constant time and repeated failures are rate-limited.
- Runners may use a separate credential (`ITEAM_RUNNER_TOKEN`) that grants no REST access. Job events are only accepted from the connection a job was dispatched to.
- Agent processes do not inherit `ITEAM_*` or `DATABASE_URL`, and an agent's env map cannot override loader variables such as `PATH`, `NODE_OPTIONS`, `LD_*`, `DYLD_*`, `HOME`.
- Agent env values (usually API keys) are masked in API responses and left out of exports by default.
- Runners can be confined with `--root <dir>` and `--no-custom`.

Recommendations:

- Set `ITEAM_TOKEN` (and `ITEAM_RUNNER_TOKEN`) before exposing the server to a network; put it behind HTTPS when crossing the internet.
- Use dedicated working directories or clones for agents; review diffs before merging what they produce.
- Import workflow files only from sources you trust: a file can define custom commands and environment variables for the agents it creates (the import preview shows them).

## Reporting a vulnerability

Please open a private security advisory on GitHub or email the maintainer listed in `package.json`. Include reproduction steps; you will get a response within a few days.
