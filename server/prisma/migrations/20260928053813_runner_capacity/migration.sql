-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_runners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',
    "arch" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'offline',
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "maxJobs" INTEGER NOT NULL DEFAULT 2,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_runners" ("arch", "capabilities", "createdAt", "hostname", "id", "lastSeen", "name", "os", "status", "version") SELECT "arch", "capabilities", "createdAt", "hostname", "id", "lastSeen", "name", "os", "status", "version" FROM "runners";
DROP TABLE "runners";
ALTER TABLE "new_runners" RENAME TO "runners";
CREATE UNIQUE INDEX "runners_name_key" ON "runners"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
