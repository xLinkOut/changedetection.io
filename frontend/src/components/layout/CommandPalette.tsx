import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  CornerDownLeft,
  ListChecks,
  Plus,
  Search,
  Settings,
  Tags,
  Upload,
  Users,
} from 'lucide-react'
import { apiFetch, buildQuery } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import type { Watch, WatchListResponse } from '@/lib/types'
import { cn } from '@/lib/cn'
import { hostFromUrl } from '@/lib/format'

interface Command {
  id: string
  label: string
  hint?: string
  icon: typeof Search
  run: () => void
}

/**
 * ⌘K command palette. It searches the server (not the rendered page) and can
 * jump to any watch, so it stays useful with hundreds of monitors.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 180)
    return () => window.clearTimeout(timer)
  }, [term])

  useEffect(() => {
    if (!open) return
    setTerm('')
    setDebounced('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [open])

  const watches = useQuery({
    queryKey: ['palette-watches', debounced],
    queryFn: () =>
      apiFetch<WatchListResponse>(
        `/watches${buildQuery({ q: debounced || undefined, status: 'all', per_page: 8, sort: 'last_changed', order: 'desc' })}`,
      ),
    enabled: open,
    staleTime: 15_000,
  })

  const close = () => onOpenChange(false)
  const go = (path: string) => {
    close()
    navigate(path)
  }

  const navigation: Command[] = useMemo(
    () => [
      { id: 'nav-watches', label: t('Watches'), icon: Search, run: () => go('/') },
      { id: 'nav-add', label: t('Add watch'), icon: Plus, run: () => go('/add') },
      { id: 'nav-groups', label: t('Groups'), icon: Tags, run: () => go('/groups') },
      { id: 'nav-queue', label: t('Queue'), icon: ListChecks, run: () => go('/queue') },
      { id: 'nav-import', label: t('Import'), icon: Upload, run: () => go('/import') },
      { id: 'nav-notifications', label: t('Notifications'), icon: Bell, run: () => go('/notifications') },
      { id: 'nav-settings', label: t('Settings'), icon: Settings, run: () => go('/settings') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const tokens = debounced.toLowerCase()
  const filteredNavigation = navigation.filter((command) => command.label.toLowerCase().includes(tokens))
  const watchItems = watches.data?.items || []

  type Row = { type: 'nav'; command: Command } | { type: 'watch'; watch: Watch }
  const rows: Row[] = [
    ...filteredNavigation.map((command) => ({ type: 'nav' as const, command })),
    ...watchItems.map((watch) => ({ type: 'watch' as const, watch })),
  ]

  useEffect(() => {
    setActive(0)
  }, [debounced])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const runRow = (row: Row | undefined) => {
    if (!row) return
    if (row.type === 'nav') row.command.run()
    else go(`/watches/${row.watch.uuid}/changes`)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[12vh] sm:pt-[16vh]">
      <button
        type="button"
        aria-label={t('Close')}
        className="absolute inset-0 bg-[rgb(var(--scrim)/0.55)] backdrop-blur-[3px] animate-fade-in"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Command palette')}
        className="signal-gradient-border relative w-full max-w-xl animate-rise overflow-hidden rounded-dialog border border-border bg-surface shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((value) => Math.min(value + 1, rows.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((value) => Math.max(value - 1, 0))
          } else if (event.key === 'Enter') {
            event.preventDefault()
            runRow(rows[active])
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('Search a watch or jump to a screen…')}
            aria-label={t('Command palette search')}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {filteredNavigation.length ? (
            <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t('Go to')}
            </p>
          ) : null}
          {rows.map((row, index) => {
            if (row.type === 'nav') {
              const Icon = row.command.icon
              return (
                <button
                  key={row.command.id}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  data-row={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => runRow(row)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-input px-2.5 py-2.5 text-left text-sm',
                    index === active ? 'bg-primary/10 text-fg' : 'text-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border',
                      index === active
                        ? 'border-violet/30 bg-violet/10 text-primary'
                        : 'border-border bg-surface-2',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1">{row.command.label}</span>
                  {index === active ? (
                    <CornerDownLeft className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  ) : null}
                </button>
              )
            }

            const watch = row.watch
            return (
              <button
                key={watch.uuid}
                type="button"
                role="option"
                aria-selected={index === active}
                data-row={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => runRow(row)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-input px-2.5 py-2.5 text-left',
                  index === active ? 'bg-primary/10' : '',
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
                  style={{
                    background: watch.has_unviewed
                      ? 'linear-gradient(135deg,#5347CE,#887CFD)'
                      : 'linear-gradient(135deg,#4896FE,#16C8C7)',
                  }}
                  aria-hidden="true"
                >
                  {(watch.title || watch.url || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">
                    {watch.title || watch.url}
                  </span>
                  <span className="block truncate text-[11px] text-muted">{hostFromUrl(watch.url)}</span>
                </span>
                {watch.has_unviewed ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-hidden="true" />
                ) : null}
                {index === active ? (
                  <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}

          {watches.isFetching && !rows.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('Searching…')}</p>
          ) : null}

          {!rows.length && !watches.isFetching ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              {t('No watch or screen matches that.')}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" /> {watches.data?.total ?? 0} {t('watches')}
          </span>
          <span className="ml-auto hidden items-center gap-2 sm:flex">
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↓</kbd>
            {t('to move')}
            <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5">↵</kbd>
            {t('to open')}
          </span>
        </div>
      </div>
    </div>
  )
}
