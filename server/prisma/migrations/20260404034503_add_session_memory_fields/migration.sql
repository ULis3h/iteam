-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_task_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "title" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "sessionMemory" TEXT,
    "memoryVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "task_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_task_sessions" ("createdAt", "deviceId", "endTime", "id", "startTime", "status", "taskId", "title", "updatedAt") SELECT "createdAt", "deviceId", "endTime", "id", "startTime", "status", "taskId", "title", "updatedAt" FROM "task_sessions";
DROP TABLE "task_sessions";
ALTER TABLE "new_task_sessions" RENAME TO "task_sessions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
