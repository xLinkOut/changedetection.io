import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </kbd>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn('h-px w-full bg-border', className)} />
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 pb-4 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0">
        {back ? <div className="mb-1">{back}</div> : null}
        <h1 className="truncate text-xl font-semibold text-fg md:text-2xl">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionTitle({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
  )
}

export function Truncate({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('block truncate', className)}>{children}</span>
}
