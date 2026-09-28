-- AlterTable
ALTER TABLE "run_steps" ADD COLUMN "diff" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "inputs" TEXT NOT NULL DEFAULT '[]',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'ui',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_workflows" ("createdAt", "description", "id", "inputs", "name", "source", "steps", "updatedAt") SELECT "createdAt", "description", "id", "inputs", "name", "source", "steps", "updatedAt" FROM "workflows";
DROP TABLE "workflows";
ALTER TABLE "new_workflows" RENAME TO "workflows";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
