import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Group, WatchListResponse } from '@/lib/types'
import type { WatchFilters } from '@/lib/queries'
import { useI18n } from '@/lib/i18n'
import { SegmentedControl } from '@/components/ui/tabs'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    if (focusSearch) {
      inputRef.current?.focus()
    }
  }, [focusSearch])

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  function updateSearch(value: string) {
    setSearch(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onChange({ q: value || undefined })
    }, 300)
  }

  const statusOptions = [
    { value: 'all', label: t('All'), count: facets?.status.all },
    { value: 'unread', label: t('Unread'), count: facets?.status.unread },
    { value: 'deals', label: t('Deals'), count: facets?.status.deals },
    { value: 'errors', label: t('Errors'), count: facets?.status.errors },
    { value: 'healthy', label: t('Healthy'), count: facets?.status.healthy },
  ]

  const hasFilters = Boolean(filters.q || filters.tag || filters.processor || (filters.status && filters.status !== 'all'))
  const sortValue = `${filters.sort || 'last_changed'}:${filters.order || 'desc'}`

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={t('Search title, URL or error…')}
            aria-label={t('Search watches')}
            className="pl-9 pr-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => updateSearch('')}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted hover:text-fg"
              aria-label={t('Clear search')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <SegmentedControl
        options={statusOptions}
        value={filters.status || 'all'}
        onChange={(value) => onChange({ status: value as WatchFilters['status'] })}
        ariaLabel={t('Filter by status')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{total}</span>
          <span className="hidden sm:inline">{t('watches')}</span>
        </div>

        <Select
          value={filters.tag || ''}
          onChange={(event) => onChange({ tag: event.target.value || undefined })}
          aria-label={t('Filter by group')}
          className="h-11 w-auto min-w-[8rem] py-1 text-xs"
        >
          <option value="">{t('All groups')}</option>
          {groups.map((group) => (
            <option key={group.uuid} value={group.uuid}>
              {group.title} ({group.watch_count})
            </option>
          ))}
        </Select>

        {processors.length > 1 ? (
          <Select
            value={filters.processor || ''}
            onChange={(event) => onChange({ processor: event.target.value || undefined })}
            aria-label={t('Filter by processor')}
            className="h-11 w-auto min-w-[8rem] py-1 text-xs"
          >
            <option value="">{t('All processors')}</option>
            {processors.map((processor) => (
              <option key={processor.value} value={processor.value}>
                {processor.label} ({facets?.processors[processor.value] || 0})
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          value={sortValue}
          onChange={(event) => {
            const [sort, order] = event.target.value.split(':')
            onChange({ sort, order: order as 'asc' | 'desc' })
          }}
          aria-label={t('Sort')}
          className="h-11 w-auto min-w-[9rem] py-1 text-xs"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </Select>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            onClick={() => onChange({ q: undefined, tag: undefined, processor: undefined, status: 'all' })}
          >
            <X className="h-3.5 w-3.5" /> {t('Clear')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
