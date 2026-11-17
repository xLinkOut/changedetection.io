import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  primary: 'bg-violet/10 text-primary border-violet/25',
  success: 'bg-teal/10 text-success border-teal/25',
  warning: 'bg-warning-bg text-warning border-warning/25',
  danger: 'bg-danger-bg text-danger border-danger/25',
  info: 'bg-azure/10 text-info border-azure/25',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function TagPill({ title, colour }: { title: string; colour: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface-2/80 px-1.5 py-0.5 text-[10px] font-medium text-fg/80">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colour }} aria-hidden="true" />
      <span className="truncate">{title}</span>
    </span>
  )
}

export function StatusDot({
  tone = 'neutral',
  pulse = false,
  className,
  label,
}: {
  tone?: Tone
  pulse?: boolean
  className?: string
  label?: string
}) {
  const dot: Record<Tone, string> = {
    neutral: 'bg-muted',
    primary: 'bg-violet',
    success: 'bg-teal',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-azure',
  }
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)}
    >
      {pulse ? (
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dot[tone])} />
      ) : null}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', dot[tone])} />
    </span>
  )
}

export function CountBadge({ count, tone = 'primary' }: { count: number; tone?: Tone }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5',
        tones[tone],
      )}
    >
      {count > 999 ? '999+' : count}
    </span>
  )
}

export function IconSlot({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-4 w-4 items-center justify-center">{children}</span>
}
