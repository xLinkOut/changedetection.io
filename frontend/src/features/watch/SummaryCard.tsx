import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/states'

interface SummaryResponse {
  summary: string | null
  error: string | null
  status: 'done' | 'pending' | 'idle' | 'error'
  cached?: boolean
}

export function SummaryCard({
  uuid,
  fromVersion,
  toVersion,
  configured,
}: {
  uuid: string
  fromVersion: string
  toVersion: string
  configured: boolean
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const client = useQueryClient()
  const key = ['summary', uuid, fromVersion, toVersion]
  const [started, setStarted] = useState(false)

  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      apiFetch<SummaryResponse>(
        `/watches/${uuid}/summary?from_version=${encodeURIComponent(fromVersion)}&to_version=${encodeURIComponent(toVersion)}`,
      ),
    enabled: configured,
    retry: false,
    staleTime: 0,
  })

  const start = useMutation({
    mutationFn: () =>
      apiFetch<SummaryResponse>(
        `/watches/${uuid}/summary?from_version=${encodeURIComponent(fromVersion)}&to_version=${encodeURIComponent(toVersion)}`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      setStarted(true)
      if (data.summary) {
        client.setQueryData(key, data)
      } else {
        client.invalidateQueries({ queryKey: key })
      }
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : t('Could not start the AI summary'), { tone: 'error' })
    },
  })

  if (!configured) {
    return null
  }

  const data = query.data
  const pending = start.isPending || data?.status === 'pending'

  return (
    <div className="rounded-card border border-primary/20 bg-primary/5 p-3 md:p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">{t('AI change summary')}</h3>
            {pending ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <RefreshCw className="h-3 w-3 animate-spin" /> {t('Generating…')}
              </span>
            ) : null}
          </div>

          {query.isLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : pending ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-8 px-2"
                onClick={() => query.refetch()}
                loading={query.isFetching}
              >
                {t('Check now')}
              </Button>
            </div>
          ) : data?.summary ? (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg">{data.summary}</p>
          ) : data?.error ? (
            <p className="mt-1 text-sm text-danger">{data.error}</p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted">
                {t('Ask the configured AI to describe what changed between these two versions.')}
              </p>
              <Button variant="secondary" size="sm" onClick={() => start.mutate()} loading={start.isPending}>
                <Sparkles className="h-3.5 w-3.5" /> {t('Summarise changes')}
              </Button>
            </div>
          )}

          {started && data?.status === 'pending' ? (
            <p className="mt-1 text-[11px] text-muted">
              {t('This runs in the background. The result appears here automatically.')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
