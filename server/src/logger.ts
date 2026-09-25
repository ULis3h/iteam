const ts = () => new Date().toISOString().slice(11, 19)

export const log = {
  info: (msg: string, ...rest: unknown[]) => console.log(`${ts()} [info] ${msg}`, ...rest),
  warn: (msg: string, ...rest: unknown[]) => console.warn(`${ts()} [warn] ${msg}`, ...rest),
  error: (msg: string, ...rest: unknown[]) => console.error(`${ts()} [error] ${msg}`, ...rest),
}
