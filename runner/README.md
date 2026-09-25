# iteam-runner

Turns any machine into an execution host for iTeam agents. Install the agent CLIs you want
(`claude`, `codex`, `gemini`, or your own command), then:

```bash
cd runner && npm install
node bin/iteam-runner.js --server http://SERVER:3000 --token YOUR_TOKEN --name my-mac
```

The runner shows up in the web UI under **Agents → Runners**. Create an agent with location
"remote", pick this runner, and every step assigned to that agent runs here.

See [docs/runner.md](../docs/runner.md) for details.
