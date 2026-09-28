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
      if (acc && typeof acc === 'object' && Object.hasOwn(acc as object, key)) {
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

/** Static check of template references against a workflow definition (used by validation). */
export function templateIssues(def: { inputs: Array<{ key: string }>; steps: Array<{ id: string; name: string; prompt: string; dependsOn: string[] }> }): string[] {
  const issues: string[] = []
  const inputKeys = new Set(def.inputs.map((i) => i.key))
  const stepIds = new Set(def.steps.map((s) => s.id))
  for (const step of def.steps) {
    const refs = [...step.prompt.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1])
    for (const ref of refs) {
      const [root, name] = ref.split('.')
      if ((root === 'inputs' || root === 'input') && name && !inputKeys.has(name)) issues.push(`step "${step.name}": unknown input {{${ref}}}`)
      if (root === 'steps' && name) {
        if (!stepIds.has(name)) issues.push(`step "${step.name}": unknown step {{${ref}}}`)
        else if (name === step.id) issues.push(`step "${step.name}": refers to its own output`)
        else if (!step.dependsOn.includes(name)) issues.push(`step "${step.name}": uses {{${ref}}} but does not depend on "${name}"`)
      }
    }
  }
  return issues
}
