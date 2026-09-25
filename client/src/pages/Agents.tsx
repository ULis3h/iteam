import { Bot, Cpu, HardDrive, Pencil, Plus, Server, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AgentForm } from '../components/AgentForm'
import { AgentStateBadge } from '../components/StatusBadge'
import { Card, EmptyState, ErrorBanner, PageHeader, Section } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { relativeTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { useSocketEvent } from '../lib/socket'
import type { Agent, AgentInput, Runner } from '../types'

export function AgentsPage() {
  const { t, locale } = useT()
  const { system } = useApp()
  const [agents, setAgents] = useState<Agent[]>([])
  const [runners, setRunners] = useState<Runner[]>([])
  const [editing, setEditing] = useState<Agent | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([api.agents(), api.runners()])
      setAgents(a)
      setRunners(r)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useSocketEvent(['agent:changed', 'agent:deleted', 'runner:changed', 'runner:deleted', 'step:changed'], load)

  const providerLabel = (id: string) => system?.providers.find((p) => p.id === id)?.label ?? id

  const remove = async (agent: Agent) => {
    if (agent.busy > 0) return setError(t('agents.deleteBusy'))
    if (!confirm(t('common.confirmDelete', { name: agent.name }))) return
    try {
      await api.deleteAgent(agent.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const submit = async (data: AgentInput) => {
    if (editing) await api.updateAgent(editing.id, data)
    else await api.createAgent(data)
    await load()
  }

  return (
    <div>
      <PageHeader
        title={t('agents.title')}
        subtitle={t('agents.subtitle')}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus size={15} /> {t('agents.new')}
          </button>
        }
      />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      {agents.length === 0 ? (
        <EmptyState
          title={t('agents.empty')}
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> {t('agents.new')}
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-10">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-5 fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{agent.name}</h3>
                    <p className="text-[12px] text-ink-muted truncate">{agent.description || '—'}</p>
                  </div>
                </div>
                <AgentStateBadge state={agent.state} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="chip">
                  <Cpu size={11} /> {providerLabel(agent.provider)}
                </span>
                <span className="chip">{agent.model || t('common.default')}</span>
                <span className="chip">
                  {t('common.effort')} · {t(`effort.${agent.effort}` as never)}
                </span>
                <span className="chip">
                  {agent.location === 'local' ? <HardDrive size={11} /> : <Server size={11} />}
                  {agent.location === 'local' ? t('common.local') : agent.runner?.name ?? t('common.remote')}
                </span>
              </div>
              {agent.role && <p className="mt-3 text-[12px] text-ink-soft line-clamp-2 leading-snug">{agent.role}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-ink-muted">{agent.busy > 0 ? t('agents.busyCount', { n: agent.busy }) : agent.workDir ? <span className="mono">{agent.workDir}</span> : ''}</span>
                <div className="flex gap-1">
                  <button
                    className="btn-ghost btn-sm !px-2"
                    onClick={() => {
                      setEditing(agent)
                      setOpen(true)
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" onClick={() => remove(agent)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Section title={t('agents.runners')} description={t('agents.runners.desc')}>
        {runners.length === 0 ? (
          <Card className="p-6 text-[13px] text-ink-muted">{t('agents.runners.empty')}</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {runners.map((r) => (
              <Card key={r.id} className="p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.status === 'online' ? 'bg-status-success' : 'bg-status-pending'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {r.hostname} · {r.os} · {r.capabilities.filter((c) => c !== 'custom').map(providerLabel).join(', ') || '—'}
                  </div>
                </div>
                <div className="text-[11px] text-ink-muted text-right shrink-0">
                  <div>{t('agents.runners.agentsCount', { n: r.agents ?? 0 })}</div>
                  <div>{relativeTime(r.lastSeen, locale)}</div>
                </div>
                {r.status === 'offline' && (
                  <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" onClick={() => api.deleteRunner(r.id).then(load).catch((e) => setError(e.message))}>
                    <Trash2 size={14} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </Section>

      <AgentForm open={open} agent={editing} runners={runners} onClose={() => setOpen(false)} onSubmit={submit} />
    </div>
  )
}
