import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, SlidersHorizontal, ArrowLeftRight, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import type { HistoryResponse, WatchFull } from '@/lib/types'
import { useSnapshot } from '@/lib/queries'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { apiBase } from '@/lib/api'
import { computeDiff, type DiffMode } from '@/lib/diff'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/tabs'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { Badge } from '@/components/ui/badge'
import { DiffViewer } from './DiffViewer'
import { DiffMinimap } from './DiffMinimap'
import { HistoryRail, SnapshotSelect } from './HistoryRail'
import { SummaryCard } from './SummaryCard'

export function ChangesTab({ watch, history }: { watch: WatchFull; history: HistoryResponse }) {
  const { t } = useI18n()
  const { bootstrap } = useAuth()
  const versions = history.versions
  const latest = versions[versions.length - 1]?.timestamp || ''
  const [to, setTo] = useState(latest)
  const [from, setFrom] = useState(
    history.from_version_suggested ||
      versions[versions.length - 2]?.timestamp ||
      latest,
  )
  const previousLatest = useRef(latest)

  const [mode, setMode] = useState<DiffMode>('lines')
  const [view, setView] = useState<'unified' | 'split'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? 'split' : 'unified',
  )
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [changesOnly, setChangesOnly] = useState(false)
  const [showAdded, setShowAdded] = useState(true)
  const [showRemoved, setShowRemoved] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const diffScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    diffScrollRef.current?.scrollTo({ top: 0 })
  }, [from, to, view, mode])

  useEffect(() => {
    if (previousLatest.current !== latest) {
      if (to === previousLatest.current) setTo(latest)
      previousLatest.current = latest
    }
  }, [latest, to])

  const beforeQuery = useSnapshot(watch.uuid, from)
  const afterQuery = useSnapshot(watch.uuid, to)

  const result = useMemo(() => {
    if (beforeQuery.data === undefined || afterQuery.data === undefined) return null
    return computeDiff(beforeQuery.data, afterQuery.data, {
      mode,
      ignoreWhitespace,
      changesOnly,
      showAdded,
      showRemoved,
    })
  }, [beforeQuery.data, afterQuery.data, mode, ignoreWhitespace, changesOnly, showAdded, showRemoved])

  const fromIndex = versions.findIndex((version) => version.timestamp === from)
  const toIndex = versions.findIndex((version) => version.timestamp === to)

  function step(delta: number) {
    const nextFrom = versions[fromIndex + delta]
    const nextTo = versions[toIndex + delta]
    if (nextFrom && nextTo) {
      setFrom(nextFrom.timestamp)
      setTo(nextTo.timestamp)
    }
  }

  if (versions.length < 2) {
    return (
      <EmptyState
        title={t('Not enough history yet')}
        description={t('Two snapshots are needed to show a difference. Run another check.')}
      />
    )
  }

  const loading = beforeQuery.isLoading || afterQuery.isLoading
  const error = beforeQuery.error || afterQuery.error
  const downloadHref = `${apiBase()}/watches/${watch.uuid}/download-patch?from_version=${encodeURIComponent(
    from,
  )}&to_version=${encodeURIComponent(to)}`

  return (
    <div className="flex min-h-[420px]">
      <HistoryRail versions={versions} selected={to} onSelect={(timestamp) => setTo(timestamp)} />

      <div className="min-w-0 flex-1">
        <div className="space-y-2 border-b border-border bg-surface p-3 md:p-4">
          <div className="flex items-end gap-2">
            <SnapshotSelect versions={versions} value={from} onChange={setFrom} label={t('From')} />
            <Button
              variant="ghost"
              size="icon"
              className="mb-0.5 shrink-0"
              onClick={() => {
                setFrom(to)
                setTo(from)
              }}
              aria-label={t('Swap versions')}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <SnapshotSelect versions={versions} value={to} onChange={setTo} label={t('To')} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={[
                { value: 'lines', label: t('Lines') },
                { value: 'words', label: t('Words') },
                { value: 'chars', label: t('Character') },
              ]}
              value={mode}
              onChange={(value) => setMode(value as DiffMode)}
              ariaLabel={t('Diff mode')}
            />

            <div className="ml-auto hidden items-center gap-0.5 rounded-full border border-border bg-surface-2 p-0.5 lg:flex">
              {[
                { value: 'split', label: t('Side by side') },
                { value: 'unified', label: t('Inline') },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={view === option.value}
                  onClick={() => setView(option.value as 'split' | 'unified')}
                  className={cn(
                    'min-h-8 rounded-full px-2.5 text-[11px] font-medium transition',
                    view === option.value
                      ? 'bg-surface text-fg shadow-sm'
                      : 'text-muted hover:text-fg',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Button
              variant={filtersOpen ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('Filters')}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => step(-1)} disabled={fromIndex <= 0} aria-label={t('Previous change')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => step(1)}
              disabled={toIndex < 0 || toIndex >= versions.length - 1}
              aria-label={t('Next change')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <a
              href={downloadHref}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-input px-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Download patch')}</span>
            </a>
          </div>

          {filtersOpen ? (
            <div className="grid gap-1 border-t border-border pt-2 sm:grid-cols-2 lg:grid-cols-4">
              <Checkbox
                label={t('Ignore whitespace')}
                checked={ignoreWhitespace}
                onChange={(event) => setIgnoreWhitespace(event.target.checked)}
              />
              <Checkbox
                label={t('Changes only')}
                checked={changesOnly}
                onChange={(event) => setChangesOnly(event.target.checked)}
              />
              <Checkbox
                label={t('Show added')}
                checked={showAdded}
                onChange={(event) => setShowAdded(event.target.checked)}
              />
              <Checkbox
                label={t('Show removed')}
                checked={showRemoved}
                onChange={(event) => setShowRemoved(event.target.checked)}
              />
            </div>
          ) : null}

          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone="success">+{result.stats.added}</Badge>
              <Badge tone="danger">-{result.stats.removed}</Badge>
              <span>{t('changed blocks')}: {result.stats.changed}</span>
              {result.truncated ? (
                <span className="inline-flex items-center gap-1 text-warning">
                  <Info className="h-3 w-3" />
                  {t('Large document: character diff was switched to line diff for speed.')}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {bootstrap.features?.llm ? (
          <div className="p-3 md:p-4">
            <SummaryCard
              uuid={watch.uuid}
              fromVersion={from}
              toVersion={to}
              configured={Boolean(bootstrap.features.llm)}
            />
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        ) : error ? (
          <ErrorState
            title={t('Could not load these snapshots')}
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => {
              beforeQuery.refetch()
              afterQuery.refetch()
            }}
          />
        ) : null}

        {!loading && !error && result ? (
          <div className="flex min-w-0 items-stretch">
            <div
              ref={diffScrollRef}
              className="min-w-0 flex-1 overflow-auto lg:max-h-[calc(100dvh-17rem)]"
              data-diff-scroll
            >
              <div className="hidden lg:block">
                {view === 'split' ? <DiffViewer parts={result.parts} mode={mode} view="split" /> : null}
              </div>
              <div className={cn(view === 'split' ? 'lg:hidden' : '')}>
                <DiffViewer parts={result.parts} mode={mode} view="unified" />
              </div>
            </div>
            <DiffMinimap parts={result.parts} scrollRef={diffScrollRef} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
