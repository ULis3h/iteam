/**
 * Minimal mustache-like renderer: {{inputs.repo}}, {{steps.plan.output}}, {{run.name}}.
 * Unknown paths render as empty strings and are reported to the caller.
 */
export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): { text: string; missing: string[] } {
  const missing: string[] = []
  const text = template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, context)
    if (value === undefined || value === null) {
      missing.push(path)
      return ''
    }
    return typeof value === 'string' ? value : JSON.stringify(value)
  })
  return { text, missing }
}
