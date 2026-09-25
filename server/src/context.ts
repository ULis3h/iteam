import type { PrismaClient } from '@prisma/client'
import type { RunManager } from './engine/run-manager.js'
import type { RunnerRegistry } from './engine/runner-registry.js'

export interface Broadcaster {
  /** Broadcast to every connected web client. */
  all: (event: string, payload: unknown) => void
  /** Broadcast to clients watching a specific run. */
  run: (runId: string, event: string, payload: unknown) => void
}

export interface AppContext {
  prisma: PrismaClient
  runs: RunManager
  registry: RunnerRegistry
  broadcast: Broadcaster
}
