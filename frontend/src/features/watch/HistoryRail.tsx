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
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block" aria-label={t('Snapshot history')}>
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t('History')}</h2>
      </div>
      <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto p-1.5">
        {ordered.map((version) => (
          <button
            key={version.timestamp}
            type="button"
            onClick={() => onSelect(version.timestamp)}
            className={cn(
              'mb-0.5 flex w-full flex-col items-start rounded-input px-2.5 py-2 text-left text-xs',
              version.timestamp === selected ? 'bg-primary/10 text-primary' : 'text-fg hover:bg-surface-2',
            )}
          >
            <span className="flex w-full items-center justify-between gap-1">
              <span className="font-medium">{timeAgo(version.timestamp, locale)}</span>
              {version.is_latest ? <Badge tone="primary">{t('Latest')}</Badge> : null}
            </span>
            <span className="mt-0.5 text-[11px] text-muted">{formatDateTime(version.timestamp, locale)}</span>
          </button>
        ))}
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
