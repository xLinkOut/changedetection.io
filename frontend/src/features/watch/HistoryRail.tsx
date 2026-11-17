import { useI18n } from '@/lib/i18n'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { HistoryVersion } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'

export function HistoryRail({
  versions,
  selected,
  onSelect,
}: {
  versions: HistoryVersion[]
  selected: string
  onSelect: (timestamp: string) => void
}) {
  const { t, locale } = useI18n()
  const ordered = [...versions].reverse()

  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-border bg-surface-2/30 lg:block"
      aria-label={t('Snapshot history')}
    >
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <h2 className="font-display text-sm font-semibold">{t('History')}</h2>
        <span className="rounded-full border border-border bg-surface px-2 text-[10px] font-semibold text-muted">
          {versions.length}
        </span>
      </div>
      <div className="relative max-h-[calc(100dvh-14rem)] overflow-y-auto px-2 py-2">
        <span
          className="pointer-events-none absolute bottom-5 left-[19px] top-5 w-px bg-gradient-to-b from-violet/60 via-azure/40 to-teal/40"
          aria-hidden="true"
        />
        {ordered.map((version) => {
          const active = version.timestamp === selected
          return (
            <button
              key={version.timestamp}
              type="button"
              onClick={() => onSelect(version.timestamp)}
              className={cn(
                'relative flex w-full items-start gap-2.5 rounded-xl py-2 pl-1.5 pr-2 text-left text-xs transition',
                active ? 'bg-primary/10' : 'hover:bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 transition',
                  active
                    ? 'border-violet bg-violet shadow-[0_0_0_4px_rgb(var(--violet)/0.16)]'
                    : 'border-border-strong bg-surface',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex w-full items-center justify-between gap-1">
                  <span className={cn('font-medium', active ? 'text-primary' : 'text-fg')}>
                    {timeAgo(version.timestamp, locale)}
                  </span>
                  {version.is_latest ? <Badge tone="primary">{t('Latest')}</Badge> : null}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted">
                  {formatDateTime(version.timestamp, locale)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export function SnapshotSelect({
  versions,
  value,
  onChange,
  label,
}: {
  versions: HistoryVersion[]
  value: string
  onChange: (timestamp: string) => void
  label: string
}) {
  const { locale } = useI18n()
  return (
    <label className="block min-w-0 flex-1 text-xs font-medium text-muted">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-input border border-border-strong bg-surface px-2 text-xs text-fg"
      >
        {[...versions].reverse().map((version) => (
          <option
            key={version.timestamp}
            value={version.timestamp}
            title={formatDateTime(version.timestamp, locale)}
          >
            {timeAgo(version.timestamp, locale)}
          </option>
        ))}
      </select>
    </label>
  )
}
