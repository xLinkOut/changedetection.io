import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Undo2 } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useGroups, useSettings, useWatch } from '@/lib/queries'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { fromWatch, toPayload, type WatchFormState } from './formState'
import {
  AiSection,
  ConditionsSection,
  FiltersSection,
  GeneralSection,
  NotificationsSection,
  RequestSection,
  RestockSection,
  StatsSection,
} from './sections'

const sectionOrder = ['general', 'request', 'filters', 'conditions', 'notifications', 'ai', 'restock', 'stats'] as const
type SectionKey = (typeof sectionOrder)[number]

export function WatchEditPage() {
  const { uuid, section: rawSection } = useParams<{ uuid: string; section?: string }>()
  const section: SectionKey = sectionOrder.includes(rawSection as SectionKey)
    ? (rawSection as SectionKey)
    : 'general'
  const { t } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()

  const watchQuery = useWatch(uuid)
  const groupsQuery = useGroups()
  const settingsQuery = useSettings()

  const [state, setState] = useState<WatchFormState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const initial = useRef<string>('')
  const initializedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!watchQuery.data || initializedFor.current === watchQuery.data.uuid) return
    initializedFor.current = watchQuery.data.uuid
    const next = fromWatch(watchQuery.data)
    setState(next)
    initial.current = JSON.stringify(next)
  }, [watchQuery.data])

  const dirty = Boolean(state && JSON.stringify(state) !== initial.current)

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      apiFetch(`/watches/${uuid}`, { method: 'PUT', body: payload }),
    onSuccess: () => {
      if (state) initial.current = JSON.stringify(state)
      setErrors({})
      toast(t('Watch saved'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['watch', uuid] })
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(error.fields)) {
          fieldErrors[field] = messages.join(', ')
        }
        setErrors(fieldErrors)
      }
      toast(t('Could not save this watch'), {
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    },
  })

  const remove = useMutation({
    mutationFn: () => apiFetch(`/watches/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast(t('Watch deleted'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['stats'] })
      navigate('/')
    },
    onError: (error) => toast(error instanceof Error ? error.message : t('Could not delete watch'), { tone: 'error' }),
  })

  const clearHistory = useMutation({
    mutationFn: () => apiFetch(`/watches/${uuid}/clear-history`, { method: 'POST' }),
    onSuccess: () => {
      toast(t('History cleared'), { tone: 'success' })
      setHistoryOpen(false)
      client.invalidateQueries({ queryKey: ['watch', uuid] })
      client.invalidateQueries({ queryKey: ['watch', uuid, 'history'] })
      client.invalidateQueries({ queryKey: ['watches'] })
    },
    onError: (error) => toast(error instanceof Error ? error.message : t('Could not clear history'), { tone: 'error' }),
  })

  if (watchQuery.isLoading || !state) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
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
  const groups = groupsQuery.data?.items || []
  const settings = settingsQuery.data

  function patch(patchValue: Partial<WatchFormState>) {
    setState((current) => (current ? { ...current, ...patchValue } : current))
  }

  function onSave() {
    if (!state) return
    const { payload, errors: formErrors } = toPayload(state)
    if (Object.keys(formErrors).length) {
      setErrors(formErrors)
      toast(t('Please fix the highlighted fields'), { tone: 'error' })
      return
    }
    save.mutate(payload)
  }

  const tabs = [
    { value: 'general', label: t('General') },
    { value: 'request', label: t('Request') },
    { value: 'filters', label: t('Filters & Triggers') },
    { value: 'conditions', label: t('Conditions') },
    { value: 'notifications', label: t('Notifications') },
    { value: 'ai', label: t('AI') },
    { value: 'restock', label: t('Restock & Price') },
    { value: 'stats', label: t('Stats') },
  ]

  const sectionProps = {
    state,
    patch,
    watch,
    groups,
    settings,
    errors,
    onDelete: () => setDeleteOpen(true),
    onClearHistory: () => setHistoryOpen(true),
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Link to={`/watches/${watch.uuid}/changes`} className="inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> {t('Back to watch')}
        </Link>
        {settings ? <span className="text-[11px] text-muted">Pulse {settings.info.version}</span> : null}
      </div>

      <PageHeader
        title={t('Edit watch')}
        description={watch.title || watch.url}
        actions={
          <Button variant="primary" onClick={onSave} loading={save.isPending} disabled={!dirty}>
            <Save className="h-4 w-4" /> {t('Save')}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card dark:shadow-card-dark">
        <Tabs
          tabs={tabs}
          value={section}
          onChange={(value) => navigate(`/watches/${watch.uuid}/edit/${value}`)}
          ariaLabel={t('Watch edit sections')}
        />
        <div className="p-3 md:p-4">
          {Object.keys(errors).length ? (
            <div role="alert" className="mb-3 rounded-input border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
              <div className="flex items-start justify-between gap-2">
                <strong>{t('Could not save this watch')}</strong>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => setErrors({})}
                >
                  {t('Dismiss')}
                </button>
              </div>
              <ul className="mt-1 list-inside list-disc text-xs">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>
                    <span className="font-mono">{field}</span>: {message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {section === 'general' ? <GeneralSection {...sectionProps} /> : null}
          {section === 'request' ? <RequestSection {...sectionProps} /> : null}
          {section === 'filters' ? <FiltersSection {...sectionProps} /> : null}
          {section === 'conditions' ? <ConditionsSection {...sectionProps} /> : null}
          {section === 'notifications' ? <NotificationsSection {...sectionProps} /> : null}
          {section === 'ai' ? <AiSection {...sectionProps} /> : null}
          {section === 'restock' ? <RestockSection {...sectionProps} /> : null}
          {section === 'stats' ? <StatsSection {...sectionProps} /> : null}
        </div>
      </div>

      <div
        className={cn(
          'fixed inset-x-0 bottom-14 z-30 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur lg:bottom-0 lg:left-60',
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          <span className={cn('text-xs', dirty ? 'text-warning' : 'text-muted')}>
            {dirty ? t('Unsaved changes') : t('All changes saved')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (!dirty || window.confirm(t('Discard your unsaved changes?'))) {
                  setState(fromWatch(watch))
                  setErrors({})
                  initial.current = JSON.stringify(fromWatch(watch))
                }
              }}
            >
              <Undo2 className="h-4 w-4" /> {t('Discard')}
            </Button>
            <Button variant="primary" onClick={onSave} loading={save.isPending} disabled={!dirty}>
              <Save className="h-4 w-4" /> {t('Save')}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete this watch?')}
        description={t('The watch and all of its history will be deleted. This cannot be undone.')}
        confirmLabel={t('Delete watch')}
        destructive
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />

      <ConfirmDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t('Clear history for this watch?')}
        description={t('Snapshots and screenshots are removed. The watch and its settings stay. This cannot be undone.')}
        confirmLabel={t('Clear history')}
        destructive
        busy={clearHistory.isPending}
        onConfirm={() => clearHistory.mutate()}
      />
    </div>
  )
}
