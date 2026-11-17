import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Layers, Search, SlidersHorizontal, Tags, X } from 'lucide-react'
import type { Group, WatchListResponse } from '@/lib/types'
import type { WatchFilters } from '@/lib/queries'
import { useI18n } from '@/lib/i18n'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const sortOptions = [
  { value: 'last_changed:desc', label: 'Recently changed' },
  { value: 'last_checked:desc', label: 'Recently checked' },
  { value: 'date_created:desc', label: 'Newest first' },
  { value: 'title:asc', label: 'Title A–Z' },
  { value: 'paused:desc', label: 'Paused first' },
  { value: 'muted:desc', label: 'Muted first' },
]

export function FilterBar({
  filters,
  onChange,
  facets,
  groups,
  processors,
  total,
  focusSearch = false,
}: {
  filters: WatchFilters
  onChange: (patch: Partial<WatchFilters>) => void
  facets: WatchListResponse['facets'] | undefined
  groups: Group[]
  processors: { value: string; label: string }[]
  total: number
  focusSearch?: boolean
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState(filters.q || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    setSearch(filters.q || '')
  }, [filters.q])

  useEffect(() => {
    if (focusSearch) inputRef.current?.focus()
  }, [focusSearch])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function updateSearch(value: string) {
    setSearch(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange({ q: value || undefined }), 300)
  }

  const statusOptions = [
    { value: 'all', label: t('All'), count: facets?.status.all },
    { value: 'unread', label: t('Unread'), count: facets?.status.unread },
    { value: 'deals', label: t('Deals'), count: facets?.status.deals },
    { value: 'errors', label: t('Errors'), count: facets?.status.errors },
    { value: 'healthy', label: t('Healthy'), count: facets?.status.healthy },
  ]

  const hasFilters = Boolean(
    filters.q || filters.tag || filters.processor || (filters.status && filters.status !== 'all'),
  )
  const sortValue = `${filters.sort || 'last_changed'}:${filters.order || 'desc'}`

  return (
    <div className="pulse-card p-2.5 md:p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={t('Search title, URL or error…')}
            aria-label={t('Search watches')}
            className="h-12 border-transparent bg-surface-2/70 pl-10 pr-9 text-[15px] focus-visible:border-primary focus-visible:bg-surface"
          />
          {search ? (
            <button
              type="button"
              onClick={() => updateSearch('')}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-fg"
              aria-label={t('Clear search')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted sm:inline-flex">
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            {total} {t('watches')}
          </span>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ q: undefined, tag: undefined, processor: undefined, status: 'all' })}
            >
              <X className="h-3.5 w-3.5" /> {t('Clear')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 pb-0.5" role="radiogroup" aria-label={t('Filter by status')}>
        {statusOptions.map((option) => {
          const active = (filters.status || 'all') === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ status: option.value as WatchFilters['status'] })}
              className={cn(
                'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition',
                active
                  ? 'signal-gradient border-transparent text-white shadow-glow'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-fg',
              )}
            >
              {option.label}
              {typeof option.count === 'number' ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold leading-4',
                    active ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted',
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          <Tags className="h-3 w-3" aria-hidden="true" /> {t('Group')}
        </span>
        <Select
          value={filters.tag || ''}
          onChange={(event) => onChange({ tag: event.target.value || undefined })}
          aria-label={t('Filter by group')}
          className="h-9 w-auto min-w-[8rem] border-transparent bg-surface-2/70 py-1 text-xs"
        >
          <option value="">{t('All groups')}</option>
          {groups.map((group) => (
            <option key={group.uuid} value={group.uuid}>
              {group.title} ({group.watch_count})
            </option>
          ))}
        </Select>

        {processors.length > 1 ? (
          <>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Layers className="h-3 w-3" aria-hidden="true" /> {t('Processor')}
            </span>
            <Select
              value={filters.processor || ''}
              onChange={(event) => onChange({ processor: event.target.value || undefined })}
              aria-label={t('Filter by processor')}
              className="h-9 w-auto min-w-[8rem] border-transparent bg-surface-2/70 py-1 text-xs"
            >
              <option value="">{t('All processors')}</option>
              {processors.map((processor) => (
                <option key={processor.value} value={processor.value}>
                  {processor.label} ({facets?.processors[processor.value] || 0})
                </option>
              ))}
            </Select>
          </>
        ) : null}

        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          <ArrowUpDown className="h-3 w-3" aria-hidden="true" /> {t('Sort')}
        </span>
        <Select
          value={sortValue}
          onChange={(event) => {
            const [sort, order] = event.target.value.split(':')
            onChange({ sort, order: order as 'asc' | 'desc' })
          }}
          aria-label={t('Sort')}
          className="h-9 w-auto min-w-[9rem] border-transparent bg-surface-2/70 py-1 text-xs"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
