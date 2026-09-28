-- AlterTable
ALTER TABLE "run_steps" ADD COLUMN "costUsd" REAL;
ALTER TABLE "run_steps" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "run_steps" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "run_steps" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "run_steps" ADD COLUMN "turns" INTEGER;
