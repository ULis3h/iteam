import { Router } from 'express'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { AppContext } from '../context.js'
import { stages } from '../engine/dag.js'
import { parseWorkflowFile } from '../workflow/import-export.js'
import { asyncRoute } from './helpers.js'

const EXAMPLES_DIR = path.resolve(process.cwd(), '../examples')

/** Built-in workflow templates: every valid YAML/JSON file in examples/. */
export function templateRoutes(_ctx: AppContext) {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      let files: string[] = []
      try {
        files = (await readdir(EXAMPLES_DIR)).filter((f) => /\.(ya?ml|json)$/i.test(f)).sort()
      } catch {
        return res.json([])
      }
      const templates = []
      for (const file of files) {
        try {
          const content = await readFile(path.join(EXAMPLES_DIR, file), 'utf8')
          const parsed = parseWorkflowFile(content)
          templates.push({
            id: file,
            name: parsed.name,
            description: parsed.description,
            steps: parsed.steps.length,
            stages: stages(parsed.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn }))).length,
            agents: [...new Set(parsed.steps.map((s) => s.agent))],
            inputs: parsed.inputs.map((i) => i.key),
            content,
          })
        } catch {
          /* skip invalid example files */
        }
      }
      res.json(templates)
    }),
  )

  return router
}
