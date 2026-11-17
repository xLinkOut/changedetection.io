import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, ListChecks, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useQueue } from '@/lib/queries'
import type { QueueItem } from '@/lib/types'
import { formatDuration, timeAgo } from '@/lib/format'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'

export function QueuePage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [clearOpen, setClearOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const queue = useQueue(page, 50)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const clear = useMutation({
    mutationFn: () => apiFetch<{ removed: number }>('/queue/clear', { method: 'POST' }),
    onSuccess: (data) => {
      toast(t('Queue cleared ({count} items removed)').replace('{count}', String(data.removed)), { tone: 'success' })
      setClearOpen(false)
      client.invalidateQueries({ queryKey: ['queue'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const cancel = useMutation({
    mutationFn: (uuid: string) => apiFetch(`/queue/cancel`, { method: 'POST', body: { uuid } }),
    onSuccess: () => {
      toast(t('Check cancelled'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['queue'] })
      client.invalidateQueries({ queryKey: ['watches'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  if (queue.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (queue.isError || !queue.data) {
    return (
      <ErrorState
        title={t('Could not load the queue')}
        description={queue.error instanceof Error ? queue.error.message : undefined}
        onRetry={() => queue.refetch()}
      />
    )
  }

  const snapshot = queue.data
  const running = snapshot.running
  const queued = snapshot.queued

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('Queue')}
        description={t('What the fetch workers are doing right now. This page updates live.')}
        actions={
          <Button variant="secondary" onClick={() => setClearOpen(true)} disabled={!snapshot.queued_count}>
            <Trash2 className="h-4 w-4" /> {t('Clear queue')}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Metric label={t('Workers')} value={snapshot.worker_count} icon={ListChecks} gradient="linear-gradient(135deg,#5347CE,#887CFD)" />
        <Metric label={t('Running now')} value={snapshot.running_count} icon={RefreshCw} gradient="linear-gradient(135deg,#4896FE,#16C8C7)" />
        <Metric label={t('Queued')} value={snapshot.queued_count} icon={Clock} gradient="linear-gradient(135deg,#887CFD,#4896FE)" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{t('Running now')}</h2>
          </div>
          {running.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{t('No checks are running.')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {running.map((item) => (
                <QueueRow key={item.uuid} item={item} now={now} locale={locale} t={t} onCancel={() => cancel.mutate(item.uuid)} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">{t('Waiting')}</h2>
            {snapshot.queued_count ? (
              <span className="text-xs text-muted">
                {t('Page {page} of {pages}').replace('{page}', String(snapshot.page)).replace('{pages}', String(snapshot.total_pages))}
              </span>
            ) : null}
          </div>
          {queued.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={t('The queue is empty')}
              description={t('New checks appear here as the scheduler queues them.')}
            />
          ) : (
            <ul className="divide-y divide-border">
              {queued.map((item) => (
                <li key={item.uuid} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted">#{item.position}</span>
                  <div className="min-w-0 flex-1">
                    <QueueTitle item={item} />
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
                      <Badge tone="neutral">{item.priority_label || `p${item.priority}`}</Badge>
                      {item.enqueued_at ? <span>{t('Queued')} {timeAgo(item.enqueued_at, locale)}</span> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {snapshot.total_pages > 1 ? (
            <div className="flex items-center justify-end gap-2 border-t border-border p-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                {t('Previous')}
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= snapshot.total_pages} onClick={() => setPage((value) => value + 1)}>
                {t('Next')}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title={t('Clear the queue?')}
        description={t('Every waiting check is removed. Running checks keep going. This cannot be undone.')}
        confirmLabel={t('Clear queue')}
        destructive
        busy={clear.isPending}
        onConfirm={() => clear.mutate()}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string
  value: number
  icon: typeof Clock
  gradient: string
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
          style={{ background: gradient }}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="display-number mt-1.5 text-3xl">{value}</p>
    </div>
  )
}

function QueueTitle({ item }: { item: QueueItem }) {
  if (item.gone) return <span className="text-sm text-muted">Deleted watch</span>
  return (
    <Link to={`/watches/${item.uuid}/changes`} className="block truncate text-sm font-medium hover:text-primary">
      {item.title || item.url || item.uuid}
    </Link>
  )
}

function QueueRow({
  item,
  now,
  locale,
  t,
  onCancel,
}: {
  item: QueueItem
  now: number
  locale: string
  t: (message: string) => string
  onCancel: () => void
}) {
  const elapsed = item.started_at ? (now / 1000) - item.started_at : item.running_seconds
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <QueueTitle item={item} />
        <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
          <span>{t('Running for')} {formatDuration(elapsed)}</span>
          {item.last_checked ? <span>{t('Last checked')} {timeAgo(item.last_checked, locale)}</span> : null}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="text-danger">
        <XCircle className="h-4 w-4" /> {t('Cancel')}
      </Button>
    </li>
  )
}
