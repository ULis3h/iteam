-- CreateTable
CREATE TABLE "task_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "title" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "task_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trace_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trace_entries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "task_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "trace_entries_sessionId_idx" ON "trace_entries"("sessionId");

-- CreateIndex
CREATE INDEX "trace_entries_type_idx" ON "trace_entries"("type");
