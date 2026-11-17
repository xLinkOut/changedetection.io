import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Filter, Plus, SearchX } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { apiFetch, buildQuery } from '@/lib/api'
import { useBulkAction, useDeleteWatch, useGroups, useSettings, useWatchAction, useWatches, type WatchFilters } from '@/lib/queries'
import type { Watch, WatchListResponse } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ListSkeleton, EmptyState, ErrorState } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm'
import { DashboardHero } from './DashboardHero'
import { QuickAdd } from './QuickAdd'
import { FilterBar } from './FilterBar'
import { WatchCard } from './WatchCard'
import { WatchTableRow } from './WatchTableRow'
import { BulkBar } from './BulkBar'
import type { WatchActionHandlers } from './WatchActionsMenu'

const HERO_COLLAPSED_KEY = 'pulse.dashboardHeroCollapsed'

function patchWatchLocally(client: ReturnType<typeof useQueryClient>, uuid: string, patch: Partial<Watch>) {
  client.setQueriesData<WatchListResponse>({ queryKey: ['watches'] }, (old) => {
    if (!old) return old
    return {
      ...old,
      items: old.items.map((item) => (item.uuid === uuid ? { ...item, ...patch } : item)),
    }
  })
}

export function DashboardPage() {
  const { bootstrap } = useAuth()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [params, setParams] = useSearchParams()

  const filters: WatchFilters = useMemo(
    () => ({
      q: params.get('q') || undefined,
      tag: params.get('tag') || undefined,
      status: (params.get('status') as WatchFilters['status']) || 'all',
      processor: params.get('processor') || undefined,
      sort: params.get('sort') || 'last_changed',
      order: (params.get('order') as 'asc' | 'desc') || 'desc',
    }),
    [params],
  )

  const pageSize = bootstrap.settings?.pagerSize ?? 50
  const page = Math.max(1, Number(params.get('page')) || 1)
  const watchesQuery = useWatches(filters, page, pageSize)
  const groupsQuery = useGroups()
  const settingsQuery = useSettings()
  const bulk = useBulkAction()
  const watchAction = useWatchAction()
  const deleteWatch = useDeleteWatch()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<Watch | null>(null)
  const [pendingHistory, setPendingHistory] = useState<Watch | null>(null)
  const [heroCollapsed, setHeroCollapsed] = useState<boolean>(() => {
    try {
      // Default to the compact view: monitoring first, banner on request.
      const saved = localStorage.getItem(HERO_COLLAPSED_KEY)
      return saved === null ? true : saved === '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(HERO_COLLAPSED_KEY, heroCollapsed ? '1' : '0')
    } catch {
      // Private mode / storage disabled: keep the in-memory preference.
    }
  }, [heroCollapsed])

  const items = watchesQuery.data?.items || []
  const total = watchesQuery.data?.total || 0
  const totalPages = watchesQuery.data?.total_pages || 1
  const currentPage = watchesQuery.data?.page || page
  const facets = watchesQuery.data?.facets
  const stats = watchesQuery.data?.stats || bootstrap.stats

  useEffect(() => {
    // Changing the view or the page must not leave hidden watches selected and
    // actionable from a bulk bar.
    setSelected(new Set())
  }, [filters.q, filters.tag, filters.status, filters.processor, page])

  const goToPage = useCallback(
    (next: number) => {
      const nextParams = new URLSearchParams(params)
      if (next <= 1) nextParams.delete('page')
      else nextParams.set('page', String(next))
      setParams(nextParams, { replace: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [params, setParams],
  )

  useEffect(() => {
    // Deleting the last watch on a page can make the server clamp the page.
    // Keep the URL and the pager in agreement with what was actually returned.
    const clamped = watchesQuery.data?.page
    if (clamped && clamped !== page) goToPage(clamped)
  }, [watchesQuery.data?.page, page, goToPage])

  const updateFilters = useCallback(
    (patch: Partial<WatchFilters>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === '' || (key === 'status' && value === 'all')) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      if ('q' in patch || 'tag' in patch || 'status' in patch || 'processor' in patch || 'sort' in patch || 'order' in patch) {
        next.delete('page')
      }
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const toggleSelect = useCallback((uuid: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(uuid)
      else next.delete(uuid)
      return next
    })
  }, [])

  async function fetchMatchingIds(): Promise<string[]> {
    const query = buildQuery({
      q: filters.q,
      tag: filters.tag,
      status: filters.status,
      processor: filters.processor,
      sort: filters.sort,
      order: filters.order,
    })
    const response = await apiFetch<{ uuids: string[] }>(`/watches/ids${query}`)
    return response.uuids
  }

  async function allMatching() {
    try {
      const uuids = await fetchMatchingIds()
      setSelected(new Set(uuids))
    } catch (error) {
      toast(error instanceof Error ? error.message : t('Could not select all watches'), { tone: 'error' })
    }
  }

  async function toggleWatch(watch: Watch, patch: { paused?: boolean; notification_muted?: boolean }) {
    patchWatchLocally(client, watch.uuid, patch)
    try {
      await apiFetch(`/watches/${watch.uuid}`, { method: 'PUT', body: patch })
    } catch (error) {
      client.invalidateQueries({ queryKey: ['watches'] })
      toast(error instanceof Error ? error.message : t('Could not update watch'), { tone: 'error' })
    }
  }

  const handlers: WatchActionHandlers = {
    onRecheck: (watch) => {
      watchAction.mutate(
        { uuid: watch.uuid, action: 'recheck' },
        {
          onSuccess: () => toast(t('Watch queued'), { description: watch.title, tone: 'info' }),
          onError: (error) => toast(error.message, { tone: 'error' }),
        },
      )
      patchWatchLocally(client, watch.uuid, { queued: true })
    },
    onTogglePause: (watch) => toggleWatch(watch, { paused: !watch.paused }),
    onToggleMute: (watch) => toggleWatch(watch, { notification_muted: !watch.notification_muted }),
    onMarkViewed: (watch) => {
      watchAction.mutate(
        { uuid: watch.uuid, action: 'mark-viewed' },
        {
          onSuccess: () => {
            patchWatchLocally(client, watch.uuid, { has_unviewed: false, viewed: true })
            toast(t('Marked as viewed'), { tone: 'success' })
          },
          onError: (error) => toast(error.message, { tone: 'error' }),
        },
      )
    },
    onClearErrors: (watch) => {
      watchAction.mutate(
        { uuid: watch.uuid, action: 'clear-errors' },
        {
          onSuccess: () => toast(t('Errors cleared'), { tone: 'success' }),
          onError: (error) => toast(error.message, { tone: 'error' }),
        },
      )
    },
    onClone: (watch) => {
      watchAction.mutate(
        { uuid: watch.uuid, action: 'clone' },
        {
          onSuccess: () => toast(t('Watch cloned'), { tone: 'success' }),
          onError: (error) => toast(error.message, { tone: 'error' }),
        },
      )
    },
    onClearHistory: (watch) => setPendingHistory(watch),
    onDelete: (watch) => setPendingDelete(watch),
  }

  function navigateWatch(watch: Watch, destination?: 'edit') {
    navigate(destination === 'edit' ? `/watches/${watch.uuid}/edit` : `/watches/${watch.uuid}/changes`)
  }

  async function runBulk(op: string, extra?: string) {
    try {
      const result = await bulk.mutateAsync({ op, uuids: [...selected], extra_data: extra })
      toast(result.result?.message || t('Bulk action completed'), {
        tone: result.result?.type === 'error' ? 'error' : 'success',
      })
      if (op !== 'recheck') setSelected(new Set())
    } catch (error) {
      toast(error instanceof Error ? error.message : t('Bulk action failed'), { tone: 'error' })
    }
  }

  async function runFilteredAction(op: 'recheck' | 'mark-viewed') {
    try {
      const uuids = await fetchMatchingIds()
      if (!uuids.length) {
        toast(t('No watches match this view'), { tone: 'info' })
        return
      }
      const result = await bulk.mutateAsync({ op, uuids })
      toast(result.result?.message || t('Action completed'), { tone: 'success' })
    } catch (error) {
      toast(error instanceof Error ? error.message : t('Action failed'), { tone: 'error' })
    }
  }

  const processors = (bootstrap.processors || []).map((option) => ({
    value: option.value,
    label: option.label,
  }))

  const hasFilters = Boolean(filters.q || filters.tag || filters.processor || (filters.status && filters.status !== 'all'))

  const heroStats = stats || {
    watch_count: 0,
    unread_changes_count: 0,
    error_count: 0,
    queue_size: 0,
    checking_now: 0,
  }

  return (
    <div className="space-y-4">
      <DashboardHero
        stats={heroStats}
        locale={locale}
        onMarkAllViewed={() => runFilteredAction('mark-viewed')}
        onRecheckAll={() => runFilteredAction('recheck')}
        busy={bulk.isPending}
        collapsed={heroCollapsed}
        onToggleCollapsed={() => setHeroCollapsed((current) => !current)}
      />

      <QuickAdd />

      <div className="space-y-3">
        <FilterBar
          filters={filters}
          onChange={updateFilters}
          facets={facets}
          groups={groupsQuery.data?.items || []}
          processors={processors}
          total={total}
          focusSearch={params.get('focus') === 'search'}
        />

        {watchesQuery.isLoading ? (
          <ListSkeleton rows={6} />
        ) : watchesQuery.isError ? (
          <ErrorState
            title={t('Could not load your watches')}
            description={watchesQuery.error instanceof Error ? watchesQuery.error.message : undefined}
            onRetry={() => watchesQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <div className="pulse-card">
            {hasFilters ? (
              <EmptyState
                icon={SearchX}
                title={t('No watches match this view')}
                description={t('Try clearing the search or filters.')}
                action={
                  <Button
                    onClick={() => updateFilters({ q: undefined, tag: undefined, processor: undefined, status: 'all' })}
                  >
                    <Filter className="h-4 w-4" /> {t('Clear filters')}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Plus}
                title={t('No watches yet')}
                description={t('Add the first web page you want to keep an eye on.')}
                action={<Button onClick={() => navigate('/add')}>{t('Add a watch')}</Button>}
              />
            )}
          </div>
        ) : (
          <>
            <h2 className="sr-only">{t('Watches')}</h2>
            <div className="hidden overflow-hidden rounded-[20px] border border-border bg-surface shadow-card dark:shadow-card-dark lg:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="border-b border-border bg-surface-2/70 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        aria-label={t('Select all on this page')}
                        checked={items.length > 0 && items.every((item) => selected.has(item.uuid))}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelected((current) => {
                              const next = new Set(current)
                              items.forEach((item) => next.add(item.uuid))
                              return next
                            })
                          } else {
                            setSelected((current) => {
                              const next = new Set(current)
                              items.forEach((item) => next.delete(item.uuid))
                              return next
                            })
                          }
                        }}
                        className="h-[18px] w-[18px] rounded border-border-strong text-primary"
                      />
                    </th>
                    <th className="w-[104px] px-2 py-3">{t('Status')}</th>
                    <th className="px-2 py-3">{t('Web page')}</th>
                    <th className="w-32 px-2 py-3">{t('Price')}</th>
                    <th className="w-24 px-2 py-3">{t('Checked')}</th>
                    <th className="w-24 px-2 py-3">{t('Changed')}</th>
                    <th className="w-[220px] px-2 py-3 text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((watch) => (
                    <WatchTableRow
                      key={watch.uuid}
                      watch={watch}
                      selected={selected.has(watch.uuid)}
                      onSelect={toggleSelect}
                      handlers={handlers}
                      onNavigate={navigateWatch}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 lg:hidden" role="list">
              {items.map((watch, index) => (
                <WatchCard
                  key={watch.uuid}
                  watch={watch}
                  selected={selected.has(watch.uuid)}
                  onSelect={toggleSelect}
                  handlers={handlers}
                  onNavigate={navigateWatch}
                  index={index}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-2 py-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted">
                {pageSize > 0
                  ? t('Showing {from}–{to} of {total}')
                      .replace('{from}', String(total ? (currentPage - 1) * pageSize + 1 : 0))
                      .replace('{to}', String(Math.min(currentPage * pageSize, total)))
                      .replace('{total}', String(total))
                  : t('Showing {shown} of {total}')
                      .replace('{shown}', String(items.length))
                      .replace('{total}', String(total))}
              </p>

              {pageSize > 0 && totalPages > 1 ? (
                <nav className="flex items-center gap-2" aria-label={t('Pagination')}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label={t('Previous page')}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden xs:inline">{t('Previous')}</span>
                  </Button>
                  <span className="min-w-[7rem] text-center text-xs font-medium text-muted" aria-live="polite">
                    {t('Page {page} of {pages}')
                      .replace('{page}', String(currentPage))
                      .replace('{pages}', String(totalPages))}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label={t('Next page')}
                  >
                    <span className="hidden xs:inline">{t('Next')}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </nav>
              ) : null}
            </div>
          </>
        )}
      </div>

      <BulkBar
        count={selected.size}
        total={total}
        allMatchingSelected={total > 0 && selected.size >= total}
        onSelectAllMatching={allMatching}
        onClear={() => setSelected(new Set())}
        onOp={runBulk}
        onDelete={async () => {
          await runBulk('delete')
          setSelected(new Set())
        }}
        onClearHistory={async () => {
          await runBulk('clear-history')
        }}
        busy={bulk.isPending}
        fetchers={bootstrap.fetchers || []}
        proxies={settingsQuery.data?.proxies.proxy_list || []}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('Delete this watch?')}
        description={
          pendingDelete
            ? t('“{title}” and all of its history will be deleted. This cannot be undone.').replace(
                '{title}',
                pendingDelete.title || pendingDelete.url,
              )
            : undefined
        }
        confirmLabel={t('Delete watch')}
        destructive
        busy={deleteWatch.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return
          try {
            await deleteWatch.mutateAsync(pendingDelete.uuid)
            toast(t('Watch deleted'), { tone: 'success' })
            setPendingDelete(null)
          } catch (error) {
            toast(error instanceof Error ? error.message : t('Could not delete watch'), { tone: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingHistory)}
        onOpenChange={(open) => !open && setPendingHistory(null)}
        title={t('Clear history for this watch?')}
        description={t('Snapshots and screenshots are removed. The watch stays. This cannot be undone.')}
        confirmLabel={t('Clear history')}
        destructive
        busy={watchAction.isPending}
        onConfirm={async () => {
          if (!pendingHistory) return
          try {
            await watchAction.mutateAsync({ uuid: pendingHistory.uuid, action: 'clear-history' })
            toast(t('History cleared'), { tone: 'success' })
            setPendingHistory(null)
          } catch (error) {
            toast(error instanceof Error ? error.message : t('Could not clear history'), { tone: 'error' })
          }
        }}
      />
    </div>
  )
}

export function Metric({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <span className={cn('text-xs text-muted', tone === 'danger' && 'text-danger')}>
      {label} <strong className="text-fg">{value}</strong>
    </span>
  )
}
