import type { Socket } from 'socket.io'
import type { JobHandle, JobHandlers, JobResult, JobSpec, LogStream } from './types.js'

interface PendingJob {
  runnerId: string
  handlers: JobHandlers
}

/** Tracks connected remote runners and the jobs dispatched to them. */
export class RunnerRegistry {
  private sockets = new Map<string, Socket>()
  private jobs = new Map<string, PendingJob>()

  attach(runnerId: string, socket: Socket) {
    const previous = this.sockets.get(runnerId)
    if (previous && previous.id !== socket.id) previous.disconnect(true)
    this.sockets.set(runnerId, socket)
  }

  detach(runnerId: string, socketId: string) {
    const current = this.sockets.get(runnerId)
    if (!current || current.id !== socketId) return
    this.sockets.delete(runnerId)
    for (const [jobId, job] of this.jobs) {
      if (job.runnerId === runnerId) {
        this.jobs.delete(jobId)
        job.handlers.onDone({ exitCode: null, output: '', error: 'runner disconnected' })
      }
    }
  }

  isOnline(runnerId: string | null | undefined): boolean {
    return !!runnerId && this.sockets.has(runnerId)
  }

  dispatch(runnerId: string, job: JobSpec, handlers: JobHandlers): JobHandle {
    const socket = this.sockets.get(runnerId)
    if (!socket) {
      queueMicrotask(() => handlers.onDone({ exitCode: null, output: '', error: 'runner is offline' }))
      return { cancel: () => undefined }
    }
    this.jobs.set(job.id, { runnerId, handlers })
    socket.emit('job:run', job)
    return {
      cancel: () => socket.emit('job:cancel', { jobId: job.id }),
    }
  }

  handleLog(jobId: string, stream: LogStream, line: string) {
    this.jobs.get(jobId)?.handlers.onLog(stream, line)
  }

  handleDone(jobId: string, result: JobResult) {
    const job = this.jobs.get(jobId)
    if (!job) return
    this.jobs.delete(jobId)
    job.handlers.onDone(result)
  }

  activeJobs(runnerId: string): number {
    let n = 0
    for (const job of this.jobs.values()) if (job.runnerId === runnerId) n++
    return n
  }
}
