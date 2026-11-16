import { useState } from 'react'
import { AlertCircle, Highlighter, Ban, EyeOff } from 'lucide-react'
import { usePreview } from '@/lib/queries'
import { useI18n } from '@/lib/i18n'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import type { HistoryVersion } from '@/lib/types'

export function PreviewTab({ uuid, versions }: { uuid: string; versions: HistoryVersion[] }) {
  const { t, locale } = useI18n()
  const [version, setVersion] = useState(versions[versions.length - 1]?.timestamp || '')
  const query = usePreview(uuid, version)

  if (!versions.length) {
    return (
      <EmptyState
        icon={Highlighter}
        title={t('No snapshot to preview yet')}
        description={t('Run a check first. The preview shows the text after filters are applied.')}
      />
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('Could not load the preview')}
        description={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )
  }

  const data = query.data!
  const trigger = new Set(data.triggered_lines)
  const ignored = new Set(data.ignored_lines)
  const blocked = new Set(data.blocked_lines)
  const lines = data.content.split('\n')

  return (
    <div className="space-y-3 p-3 md:p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-medium text-muted sm:max-w-xs">
          <span className="mb-1 block">{t('Version')}</span>
          <select
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            className="h-11 w-full rounded-input border border-border-strong bg-surface px-2 text-xs text-fg"
          >
            {[...versions].reverse().map((item) => (
              <option key={item.timestamp} value={item.timestamp}>
                {timeAgo(item.timestamp, locale)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5 pb-1">
          <Badge tone="warning">
            <Highlighter className="h-3 w-3" /> {t('Trigger')}
          </Badge>
          <Badge tone="neutral">
            <EyeOff className="h-3 w-3" /> {t('Ignored')}
          </Badge>
          <Badge tone="danger">
            <Ban className="h-3 w-3" /> {t('Blocked')}
          </Badge>
        </div>
      </div>

      {data.error_text ? (
        <div className="rounded-input border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          <AlertCircle className="mr-1 inline h-4 w-4 align-[-2px]" />
          {data.error_text}
        </div>
      ) : null}

      {!data.content ? (
        <EmptyState
          icon={Highlighter}
          title={t('This snapshot is empty')}
          description={t('Filters removed everything, or the page returned no text.')}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="max-h-[70dvh] overflow-auto font-mono text-[13px] leading-5" style={{ fontVariantLigatures: 'none' }}>
            {lines.map((line, index) => {
              const lineNumber = index + 1
              const isTrigger = trigger.has(lineNumber)
              const isIgnored = ignored.has(lineNumber)
              const isBlocked = blocked.has(lineNumber)
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-start border-b border-border/40 last:border-0',
                    isTrigger && 'bg-warning-bg',
                    isIgnored && !isTrigger && 'bg-surface-2 text-muted',
                    isBlocked && 'bg-danger-bg text-danger',
                  )}
                >
                  <span className="w-12 shrink-0 select-none border-r border-border/60 px-2 text-right text-[11px] text-muted/70">
                    {lineNumber}
                  </span>
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words px-2">{line || ' '}</span>
                  {isTrigger || isIgnored || isBlocked ? (
                    <span className="shrink-0 px-2 text-[10px] font-semibold uppercase tracking-wide">
                      {isBlocked ? t('Blocked') : isTrigger ? t('Trigger') : t('Ignored')}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        {t(
          'This is the text after filters are applied. Lines are highlighted when they match a trigger, ignore, or block rule.',
        )}
      </p>
    </div>
  )
}
