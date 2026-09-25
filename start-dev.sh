#!/usr/bin/env bash
# One-command development start: installs dependencies on first run, then starts server + web UI.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  echo "Node.js 20+ is required (https://nodejs.org)."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting iTeam — server http://localhost:3000, web UI http://localhost:5173"
npm run dev
