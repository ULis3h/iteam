import type { Socket } from 'socket.io'
import type { JobHandle, JobHandlers, JobResult, JobSpec, LogStream } from './types.js'

interface PendingJob {
  runnerId: string
  socketId: string
  handlers: JobHandlers
  orphanTimer?: NodeJS.Timeout
}

/** How long a job survives without its runner connection before it is failed. */
export const ORPHAN_GRACE_MS = 90_000

/**
 * Tracks connected remote runners and the jobs dispatched to them. A runner that
 * reconnects within the grace period and still reports a job as running gets it
 * re-attached; anything else is failed so steps never hang.
 */
export class RunnerRegistry {
  private sockets = new Map<string, Socket>()
  private capacity = new Map<string, number>()
  private jobs = new Map<string, PendingJob>()

  attach(runnerId: string, socket: Socket, activeJobIds: string[] = [], maxJobs = 2) {
    const previous = this.sockets.get(runnerId)
    this.sockets.set(runnerId, socket)
    this.capacity.set(runnerId, Math.max(1, maxJobs))
    for (const [jobId, job] of this.jobs) {
      if (job.runnerId !== runnerId) continue
      if (activeJobIds.includes(jobId)) {
        if (job.orphanTimer) clearTimeout(job.orphanTimer)
        job.orphanTimer = undefined
        job.socketId = socket.id
        job.handlers.onLog('system', 'runner reconnected; job re-attached')
      } else if (job.socketId !== socket.id) {
        this.fail(jobId, job, 'runner reconnected without this job (it was lost on the runner side)')
      }
    }
    // jobs the runner still executes for a server process that no longer exists (restart / crash)
    for (const jobId of activeJobIds) {
      if (!this.jobs.has(jobId)) socket.emit('job:cancel', { jobId })
    }
    if (previous && previous.id !== socket.id) previous.disconnect(true)
  }

  detach(runnerId: string, socketId: string) {
    const current = this.sockets.get(runnerId)
    if (current && current.id === socketId) {
      this.sockets.delete(runnerId)
      this.capacity.delete(runnerId)
    }
    for (const [jobId, job] of this.jobs) {
      if (job.socketId !== socketId || job.orphanTimer) continue
      job.handlers.onLog('system', `runner disconnected; waiting up to ${ORPHAN_GRACE_MS / 1000}s for it to come back`)
      job.orphanTimer = setTimeout(() => this.fail(jobId, job, 'runner disconnected and did not come back'), ORPHAN_GRACE_MS)
      job.orphanTimer.unref()
    }
  }

  isOnline(runnerId: string | null | undefined): boolean {
    return !!runnerId && this.sockets.has(runnerId)
  }

  onlineIds(): string[] {
    return [...this.sockets.keys()]
  }

  maxJobs(runnerId: string): number {
    return this.capacity.get(runnerId) ?? 0
  }

  hasCapacity(runnerId: string | null | undefined): boolean {
    if (!runnerId || !this.sockets.has(runnerId)) return false
    return this.activeJobs(runnerId) < (this.capacity.get(runnerId) ?? 1)
  }

  dispatch(runnerId: string, job: JobSpec, handlers: JobHandlers): JobHandle {
    const socket = this.sockets.get(runnerId)
    if (!socket) {
      queueMicrotask(() => handlers.onDone({ exitCode: null, output: '', error: 'runner is offline' }))
      return { cancel: () => undefined }
    }
    this.jobs.set(job.id, { runnerId, socketId: socket.id, handlers })
    socket.emit('job:run', job)
    return {
      cancel: () => this.sockets.get(runnerId)?.emit('job:cancel', { jobId: job.id }),
    }
  }

  /** Only the socket a job is currently bound to may report on it. */
  handleLog(socketId: string, jobId: string, stream: LogStream, line: string) {
    const job = this.jobs.get(jobId)
    if (job && job.socketId === socketId) job.handlers.onLog(stream, line)
  }

  handleDone(socketId: string, jobId: string, result: JobResult) {
    const job = this.jobs.get(jobId)
    if (!job || job.socketId !== socketId) return
    if (job.orphanTimer) clearTimeout(job.orphanTimer)
    this.jobs.delete(jobId)
    job.handlers.onDone(result)
  }

  activeJobs(runnerId: string): number {
    let n = 0
    for (const job of this.jobs.values()) if (job.runnerId === runnerId) n++
    return n
  }

  private fail(jobId: string, job: PendingJob, error: string) {
    if (job.orphanTimer) clearTimeout(job.orphanTimer)
    this.jobs.delete(jobId)
    job.handlers.onDone({ exitCode: null, output: '', error })
  }
}
