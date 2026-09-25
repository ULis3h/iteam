import { Download, Pencil, Play, Plus, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ImportDialog } from '../components/ImportDialog'
import { PipelineGraph } from '../components/PipelineGraph'
import { RunDialog } from '../components/RunDialog'
import { StatusBadge } from '../components/StatusBadge'
import { Card, EmptyState, ErrorBanner, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { relativeTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { useSocketEvent } from '../lib/socket'
import type { Agent, Workflow } from '../types'

export function WorkflowsPage() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(params.get('import') === '1')
  const [runTarget, setRunTarget] = useState<Workflow | null>(null)

  const load = useCallback(async () => {
    try {
      const [w, a] = await Promise.all([api.workflows(), api.agents()])
      setWorkflows(w)
      setAgents(a)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  useSocketEvent(['workflow:changed', 'workflow:deleted', 'run:changed'], load)

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? '?'

  const remove = async (w: Workflow) => {
    if (!confirm(t('common.confirmDelete', { name: w.name }))) return
    try {
      await api.deleteWorkflow(w.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const exportYaml = async (w: Workflow) => {
    const text = await api.exportWorkflow(w.id, 'yaml')
    const blob = new Blob([text], { type: 'text/yaml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${w.name.replace(/[\\/:*?"<>|]+/g, '-')}.yaml`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <PageHeader
        title={t('workflows.title')}
        subtitle={t('workflows.subtitle')}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              <Upload size={15} /> {t('workflows.import')}
            </button>
            <Link to="/workflows/new" className="btn-primary">
              <Plus size={15} /> {t('workflows.new')}
            </Link>
          </>
        }
      />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      {workflows.length === 0 ? (
        <EmptyState
          title={t('workflows.empty')}
          action={
            <>
              <button className="btn-secondary" onClick={() => setImportOpen(true)}>
                <Upload size={15} /> {t('workflows.import')}
              </button>
              <Link to="/workflows/new" className="btn-primary">
                <Plus size={15} /> {t('workflows.new')}
              </Link>
            </>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {workflows.map((w) => (
            <Card key={w.id} className="p-5 fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/workflows/${w.id}`} className="font-semibold text-[15px] hover:underline underline-offset-2 truncate block">
                    {w.name}
                  </Link>
                  <p className="text-[12px] text-ink-soft mt-0.5 line-clamp-2">{w.description || '—'}</p>
                </div>
                <button className="btn-primary btn-sm shrink-0" onClick={() => setRunTarget(w)}>
                  <Play size={13} /> {t('workflows.runNow')}
                </button>
              </div>
              <div className="mt-3 rounded-xl bg-[#f7f7f9] p-2 overflow-hidden">
                <PipelineGraph compact nodes={w.steps.map((s) => ({ id: s.id, name: s.name, agentName: agentName(s.agentId), dependsOn: s.dependsOn }))} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-ink-muted">
                <div className="flex items-center gap-3">
                  <span>{t('workflows.stepsCount', { n: w.steps.length })}</span>
                  <span>{t('workflows.runsCount', { n: w.runCount ?? 0 })}</span>
                  {w.lastRun ? (
                    <Link to={`/runs/${w.lastRun.id}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                      <StatusBadge status={w.lastRun.status} small /> {relativeTime(w.lastRun.createdAt, locale)}
                    </Link>
                  ) : (
                    <span>{t('workflows.neverRun')}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm !px-2" onClick={() => navigate(`/workflows/${w.id}`)} title={t('common.edit')}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-ghost btn-sm !px-2" onClick={() => exportYaml(w)} title={t('common.export')}>
                    <Download size={14} />
                  </button>
                  <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" onClick={() => remove(w)} title={t('common.delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false)
          if (params.get('import')) setParams({})
        }}
        onImported={(w, run) => {
          if (run) navigate(`/runs/${run.id}`)
          else {
            void load()
            navigate(`/workflows/${w.id}`)
          }
        }}
      />
      <RunDialog
        open={!!runTarget}
        name={runTarget?.name ?? ''}
        inputs={runTarget?.inputs ?? []}
        onClose={() => setRunTarget(null)}
        onStart={async (values, name) => {
          const run = await api.runWorkflow(runTarget!.id, values, name)
          navigate(`/runs/${run.id}`)
        }}
      />
    </div>
  )
}
