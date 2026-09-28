import { X } from 'lucide-react'
import { cloneElement, isValidElement, useEffect, useId, type ReactElement, type ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 fade-in">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="text-ink-soft mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card ${onClick ? 'cursor-pointer hover:shadow-pop hover:-translate-y-[1px] transition' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  const id = useId()
  // wire the label to a single form control child when it has no id of its own
  const control = isValidElement(children) && ['input', 'select', 'textarea'].includes(String(children.type)) && !(children.props as { id?: string }).id
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children
  return (
    <div>
      <label className="label" htmlFor={control !== children ? id : undefined}>
        {label}
        {required && <span className="text-status-failed ml-0.5">*</span>}
      </label>
      {control}
      {hint && <p className="text-[11px] text-ink-muted mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide, confirmClose, closeLabel }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean; confirmClose?: () => boolean; closeLabel?: string }) {
  const close = () => {
    if (confirmClose && !confirmClose()) return
    onClose()
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, confirmClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c1e]/30 backdrop-blur-[2px]" onMouseDown={close}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} max-h-[90vh] flex flex-col bg-white fade-in`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button className="btn-ghost btn-sm !px-2" onClick={close} aria-label={closeLabel ?? 'Close'}>
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center fade-in">
      <p className="text-[15px] font-medium">{title}</p>
      {description && <p className="text-ink-soft mt-1.5 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="inline-block rounded-full border-2 border-line border-t-ink animate-spin" style={{ width: size, height: size }} />
}

export function ErrorBanner({ message, onClose }: { message: string | null; onClose?: () => void }) {
  if (!message) return null
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 text-status-failed px-4 py-2.5 text-[13px] mb-4 fade-in">
      <span className="break-words">{message}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-[13px]">
      <input type="checkbox" role="switch" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`relative inline-block w-9 h-5 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 ${checked ? 'bg-ink' : 'bg-[#d9dbe1]'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      {label}
    </label>
  )
}

/** Small inline banner for non-error notices. */
export function InfoBanner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const cls = tone === 'warn' ? 'border-amber-200 bg-amber-50 text-[#8f5a00]' : 'border-line bg-[#f7f7f9] text-ink-soft'
  return <div className={`rounded-xl border px-4 py-2.5 text-[13px] mb-4 fade-in ${cls}`}>{children}</div>
}

export function Section({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-8 fade-in">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="text-ink-soft text-[13px] mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

import { Component, type ErrorInfo } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode; label: string; reload: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('render error', error, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card p-8 text-center fade-in">
        <p className="font-medium mb-2">{this.props.label}</p>
        <pre className="mono text-status-failed whitespace-pre-wrap break-words mb-4 text-left max-h-40 overflow-auto">{this.state.error.message}</pre>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          {this.props.reload}
        </button>
      </div>
    )
  }
}
