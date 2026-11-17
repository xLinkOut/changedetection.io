import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  value: string
  label: string
  count?: number
  icon?: ReactNode
}

export function Tabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'no-scrollbar flex flex-wrap gap-1 border-b border-border px-1 lg:flex-nowrap lg:overflow-x-auto',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative inline-flex min-h-12 shrink-0 items-center gap-1.5 px-3.5 text-sm font-medium transition',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold',
                  active ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted',
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {active ? (
              <span className="signal-gradient absolute inset-x-2.5 bottom-0 h-[2.5px] rounded-full" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: string; label: string; count?: number }[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('no-scrollbar flex gap-1.5 overflow-x-auto py-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
              active
                ? 'signal-gradient border-transparent text-white shadow-glow'
                : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg',
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold',
                  active ? 'bg-black/15' : 'bg-surface-2',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
