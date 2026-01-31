-- AlterTable
ALTER TABLE "projects" ADD COLUMN "complexity" TEXT;

-- CreateTable
CREATE TABLE "agent_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "experience" TEXT,
    "expertise" TEXT NOT NULL,
    "communication" TEXT,
    "principles" TEXT NOT NULL,
    "workflows" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "agentCode" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "inputs" TEXT,
    "outputs" TEXT,
    "prerequisites" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "inputs" TEXT,
    "outputs" TEXT,
    "logs" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_executions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'sequential',
    "defaultWorkflows" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "role" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_members_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "role" TEXT,
    "skills" TEXT,
    "documentIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "os" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "currentProject" TEXT,
    "currentModule" TEXT,
    "metadata" TEXT,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agentTemplateId" TEXT,
    "agentConfig" TEXT,
    "skillLevel" TEXT NOT NULL DEFAULT 'intermediate',
    CONSTRAINT "devices_agentTemplateId_fkey" FOREIGN KEY ("agentTemplateId") REFERENCES "agent_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_devices" ("createdAt", "currentModule", "currentProject", "documentIds", "id", "ip", "lastSeen", "metadata", "name", "os", "role", "skills", "status", "type", "updatedAt") SELECT "createdAt", "currentModule", "currentProject", "documentIds", "id", "ip", "lastSeen", "metadata", "name", "os", "role", "skills", "status", "type", "updatedAt" FROM "devices";
DROP TABLE "devices";
ALTER TABLE "new_devices" RENAME TO "devices";
CREATE UNIQUE INDEX "devices_name_key" ON "devices"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "agent_templates_code_key" ON "agent_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_code_key" ON "workflows"("code");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_deviceId_key" ON "team_members"("teamId", "deviceId");
