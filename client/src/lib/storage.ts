/** localStorage/sessionStorage can throw (private mode, sandboxed iframes); fall back to memory. */
const memory = new Map<string, string>()

const area = (persistent: boolean): Storage | null => {
  try {
    return persistent ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const storage = {
  get(key: string): string | null {
    for (const persistent of [false, true]) {
      try {
        const v = area(persistent)?.getItem(key)
        if (v !== null && v !== undefined) return v
      } catch {
        /* ignore */
      }
    }
    return memory.get(key) ?? null
  },
  set(key: string, value: string, persistent: boolean) {
    this.remove(key)
    try {
      const a = area(persistent)
      if (a) return a.setItem(key, value)
    } catch {
      /* fall through */
    }
    memory.set(key, value)
  },
  remove(key: string) {
    memory.delete(key)
    for (const persistent of [false, true]) {
      try {
        area(persistent)?.removeItem(key)
      } catch {
        /* ignore */
      }
    }
  },
}
