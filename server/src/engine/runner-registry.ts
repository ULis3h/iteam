import type { Socket } from 'socket.io'
import type { JobHandle, JobHandlers, JobResult, JobSpec, LogStream } from './types.js'

interface PendingJob {
  runnerId: string
  socketId: string
  handlers: JobHandlers
}

/** Tracks connected remote runners and the jobs dispatched to them. */
export class RunnerRegistry {
  private sockets = new Map<string, Socket>()
  private jobs = new Map<string, PendingJob>()

  /** Register a runner connection; a previous connection with the same name is superseded and its jobs failed. */
  attach(runnerId: string, socket: Socket) {
    const previous = this.sockets.get(runnerId)
    this.sockets.set(runnerId, socket)
    if (previous && previous.id !== socket.id) {
      this.failJobs((job) => job.socketId === previous.id, 'runner reconnected while the job was running')
      previous.disconnect(true)
    }
  }

  detach(runnerId: string, socketId: string) {
    const current = this.sockets.get(runnerId)
    if (current && current.id === socketId) this.sockets.delete(runnerId)
    this.failJobs((job) => job.socketId === socketId, 'runner disconnected')
  }

  isOnline(runnerId: string | null | undefined): boolean {
    return !!runnerId && this.sockets.has(runnerId)
  }

  onlineIds(): string[] {
    return [...this.sockets.keys()]
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
      cancel: () => {
        const current = this.sockets.get(runnerId)
        current?.emit('job:cancel', { jobId: job.id })
      },
    }
  }

  /** Only the socket a job was dispatched to may report on it. */
  handleLog(socketId: string, jobId: string, stream: LogStream, line: string) {
    const job = this.jobs.get(jobId)
    if (job && job.socketId === socketId) job.handlers.onLog(stream, line)
  }

  handleDone(socketId: string, jobId: string, result: JobResult) {
    const job = this.jobs.get(jobId)
    if (!job || job.socketId !== socketId) return
    this.jobs.delete(jobId)
    job.handlers.onDone(result)
  }

  activeJobs(runnerId: string): number {
    let n = 0
    for (const job of this.jobs.values()) if (job.runnerId === runnerId) n++
    return n
  }

  private failJobs(match: (job: PendingJob) => boolean, error: string) {
    for (const [jobId, job] of this.jobs) {
      if (match(job)) {
        this.jobs.delete(jobId)
        job.handlers.onDone({ exitCode: null, output: '', error })
      }
    }
  }
}
