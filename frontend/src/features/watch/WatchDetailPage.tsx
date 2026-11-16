import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  History,
  Image as ImageIcon,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Eye,
  CircleDollarSign,
  MoreVertical,
  Clipboard,
  XCircle,
} from 'lucide-react'
import { apiBase, apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useDeleteWatch, useHistory, useWatch } from '@/lib/queries'
import { formatDateTime, hostFromUrl, safeHref, timeAgo } from '@/lib/format'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Badge, TagPill } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { ConfirmDialog } from '@/components/ui/confirm'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { WatchStatus } from '@/features/dashboard/WatchCard'
import { ChangesTab } from './ChangesTab'
import { PreviewTab } from './PreviewTab'
import { ScreenshotTab } from './ScreenshotTab'
import { ErrorTab } from './ErrorTab'
import { PriceTab } from './PriceTab'

export type WatchTab = 'changes' | 'preview' | 'screenshot' | 'error' | 'price'

export function WatchDetailPage({ tab }: { tab: WatchTab }) {
  const { uuid } = useParams<{ uuid: string }>()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()

  const watchQuery = useWatch(uuid)
  const historyQuery = useHistory(uuid)
  const deleteWatch = useDeleteWatch()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const markedViewed = useRef<string | null>(null)

  const recheck = useMutation({
    mutationFn: () => apiFetch(`/watches/${uuid}/recheck`, { method: 'POST' }),
    onSuccess: () => {
      toast(t('Watch queued'), { tone: 'info' })
      client.invalidateQueries({ queryKey: ['watch', uuid] })
      client.invalidateQueries({ queryKey: ['watches'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const markViewed = useMutation({
    mutationFn: () => apiFetch(`/watches/${uuid}/mark-viewed`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['watch', uuid] })
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  useEffect(() => {
    if (!watchQuery.data || !uuid || markedViewed.current === uuid) return
    if ((tab === 'changes' || tab === 'preview') && watchQuery.data.has_unviewed) {
      markedViewed.current = uuid
      markViewed.mutate()
    }
  }, [watchQuery.data, tab, uuid, markViewed])

  if (watchQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (watchQuery.isError || !watchQuery.data) {
    return (
      <ErrorState
        title={t('Could not load this watch')}
        description={watchQuery.error instanceof Error ? watchQuery.error.message : undefined}
        onRetry={() => watchQuery.refetch()}
      />
    )
  }

  const watch = watchQuery.data
  const tabs = [
    { value: 'changes', label: t('Changes'), icon: <History className="h-4 w-4" /> },
    { value: 'preview', label: t('Preview'), icon: <Eye className="h-4 w-4" /> },
    { value: 'screenshot', label: t('Screenshot'), icon: <ImageIcon className="h-4 w-4" /> },
    ...(watch.last_error
      ? [{ value: 'error', label: t('Error'), icon: <TriangleAlert className="h-4 w-4" /> }]
      : []),
    ...(watch.processor === 'restock_diff'
      ? [{ value: 'price', label: t('Price'), icon: <CircleDollarSign className="h-4 w-4" /> }]
      : []),
  ]

  const screenshotUrl = `${apiBase()}/watches/${watch.uuid}/screenshot?v=${watch.last_checked}`

  return (
    <div className="space-y-3">
      <div>
        <Link to="/" className="mb-2 inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> {t('All watches')}
        </Link>

        <PageHeader
          title={watch.title || watch.url}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={safeHref(watch.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {hostFromUrl(watch.url)} <ExternalLink className="h-3 w-3" />
              </a>
              <span>{t('Checked')} {timeAgo(watch.last_checked, locale)}</span>
              <span>{t('Changed')} {timeAgo(watch.last_changed, locale)}</span>
              {watch.history_n ? <span>{watch.history_n} {t('snapshots')}</span> : null}
            </span>
          }
          actions={
            <>
              <WatchStatus watch={watch} />
              <Button variant="secondary" onClick={() => recheck.mutate()} loading={recheck.isPending} disabled={watch.checking_now}>
                <RefreshCw className={`h-4 w-4 ${watch.checking_now ? 'animate-spin' : ''}`} />
                {watch.checking_now ? t('Checking') : t('Recheck')}
              </Button>
              <Button variant="primary" onClick={() => navigate(`/watches/${watch.uuid}/edit`)}>
                <Pencil className="h-4 w-4" /> {t('Edit')}
              </Button>
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t('More actions')}>
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem onSelect={() => markViewed.mutate()}>
                    <CheckCheck className="mr-2 inline h-4 w-4" /> {t('Mark as viewed')}
                  </DropdownItem>
                  <DropdownItem
                    onSelect={() =>
                      apiFetch(`/watches/${watch.uuid}/clear-errors`, { method: 'POST' }).then(() => {
                        toast(t('Errors cleared'), { tone: 'success' })
                        client.invalidateQueries({ queryKey: ['watch', uuid] })
                      })
                    }
                    disabled={!watch.last_error}
                  >
                    <XCircle className="mr-2 inline h-4 w-4" /> {t('Clear errors')}
                  </DropdownItem>
                  <DropdownItem
                    onSelect={() =>
                      apiFetch(`/watches/${watch.uuid}/clone`, { method: 'POST' }).then(() => {
                        toast(t('Watch cloned'), { tone: 'success' })
                        client.invalidateQueries({ queryKey: ['watches'] })
                      })
                    }
                  >
                    <Clipboard className="mr-2 inline h-4 w-4" /> {t('Clone watch')}
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => setHistoryOpen(true)} destructive>
                    <History className="mr-2 inline h-4 w-4" /> {t('Clear history')}
                  </DropdownItem>
                  <DropdownItem onSelect={() => setDeleteOpen(true)} destructive>
                    <Trash2 className="mr-2 inline h-4 w-4" /> {t('Delete watch')}
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </>
          }
        />

        {watch.tags.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {watch.tags.map((tag) => (
              <TagPill key={tag.uuid} title={tag.title} colour={tag.colour} />
            ))}
          </div>
        ) : null}
        {watch.notification_muted ? <Badge tone="neutral" className="mt-2">{t('Notifications muted')}</Badge> : null}
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card dark:shadow-card-dark">
        <Tabs
          tabs={tabs}
          value={tab}
          onChange={(value) => navigate(`/watches/${watch.uuid}/${value}`)}
          ariaLabel={t('Watch sections')}
        />

        {tab === 'changes' ? (
          historyQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : historyQuery.isError || !historyQuery.data ? (
            <ErrorState
              title={t('Could not load history')}
              description={historyQuery.error instanceof Error ? historyQuery.error.message : undefined}
              onRetry={() => historyQuery.refetch()}
            />
          ) : (
            <ChangesTab watch={watch} history={historyQuery.data} />
          )
        ) : null}

        {tab === 'preview' ? (
          <PreviewTab uuid={watch.uuid} versions={historyQuery.data?.versions || []} />
        ) : null}

        {tab === 'screenshot' ? <ScreenshotTab watch={watch} /> : null}

        {tab === 'error' ? <ErrorTab uuid={watch.uuid} screenshotUrl={screenshotUrl} /> : null}

        {tab === 'price' ? <PriceTab uuid={watch.uuid} /> : null}
      </div>

      <p className="px-1 text-[11px] text-muted">
        {t('Last checked')} {formatDateTime(watch.last_checked, locale)} · {t('Last changed')}{' '}
        {formatDateTime(watch.last_changed, locale)}
      </p>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete this watch?')}
        description={t('The watch and all of its history will be deleted. This cannot be undone.')}
        confirmLabel={t('Delete watch')}
        destructive
        busy={deleteWatch.isPending}
        onConfirm={async () => {
          try {
            await deleteWatch.mutateAsync(watch.uuid)
            toast(t('Watch deleted'), { tone: 'success' })
            navigate('/')
          } catch (error) {
            toast(error instanceof Error ? error.message : t('Could not delete watch'), { tone: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t('Clear history for this watch?')}
        description={t('Snapshots and screenshots are removed. The watch stays. This cannot be undone.')}
        confirmLabel={t('Clear history')}
        destructive
        onConfirm={async () => {
          try {
            await apiFetch(`/watches/${watch.uuid}/clear-history`, { method: 'POST' })
            toast(t('History cleared'), { tone: 'success' })
            setHistoryOpen(false)
            client.invalidateQueries({ queryKey: ['watch', watch.uuid] })
            client.invalidateQueries({ queryKey: ['watch', watch.uuid, 'history'] })
          } catch (error) {
            toast(error instanceof Error ? error.message : t('Could not clear history'), { tone: 'error' })
          }
        }}
      />
    </div>
  )
}
