-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT 'local',
    "runnerId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'claude-code',
    "model" TEXT NOT NULL DEFAULT '',
    "effort" TEXT NOT NULL DEFAULT 'medium',
    "workDir" TEXT NOT NULL DEFAULT '',
    "command" TEXT NOT NULL DEFAULT '',
    "extraArgs" TEXT NOT NULL DEFAULT '[]',
    "env" TEXT NOT NULL DEFAULT '{}',
    "autoApprove" BOOLEAN NOT NULL DEFAULT true,
    "timeoutSec" INTEGER NOT NULL DEFAULT 1800,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "agents_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "runners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_agents" ("autoApprove", "color", "command", "createdAt", "description", "effort", "env", "extraArgs", "id", "location", "model", "name", "provider", "role", "runnerId", "timeoutSec", "updatedAt", "workDir") SELECT "autoApprove", "color", "command", "createdAt", "description", "effort", "env", "extraArgs", "id", "location", "model", "name", "provider", "role", "runnerId", "timeoutSec", "updatedAt", "workDir" FROM "agents";
DROP TABLE "agents";
ALTER TABLE "new_agents" RENAME TO "agents";
CREATE UNIQUE INDEX "agents_name_key" ON "agents"("name");
CREATE TABLE "new_run_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "agentId" TEXT,
    "agentName" TEXT NOT NULL,
    "dependsOn" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "continueOnError" BOOLEAN NOT NULL DEFAULT false,
    "prompt" TEXT,
    "output" TEXT,
    "error" TEXT,
    "exitCode" INTEGER,
    "provider" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "effort" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT 'local',
    "runnerId" TEXT,
    "runtime" TEXT NOT NULL DEFAULT '{}',
    "sessionId" TEXT,
    "costUsd" REAL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "turns" INTEGER,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_steps_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_run_steps" ("agentId", "agentName", "attempt", "continueOnError", "costUsd", "dependsOn", "effort", "error", "exitCode", "finishedAt", "id", "inputTokens", "key", "location", "maxAttempts", "model", "name", "order", "output", "outputTokens", "prompt", "provider", "runId", "runnerId", "sessionId", "startedAt", "status", "turns") SELECT "agentId", "agentName", "attempt", "continueOnError", "costUsd", "dependsOn", "effort", "error", "exitCode", "finishedAt", "id", "inputTokens", "key", "location", "maxAttempts", "model", "name", "order", "output", "outputTokens", "prompt", "provider", "runId", "runnerId", "sessionId", "startedAt", "status", "turns" FROM "run_steps";
DROP TABLE "run_steps";
ALTER TABLE "new_run_steps" RENAME TO "run_steps";
CREATE UNIQUE INDEX "run_steps_runId_key_key" ON "run_steps"("runId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
