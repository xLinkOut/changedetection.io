import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ImageOff } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'

interface ErrorResponse {
  uuid: string
  last_error: string | false
  error_text: string
  last_notification_error: string | false
  has_error_screenshot: boolean
}

export function ErrorTab({ uuid, screenshotUrl }: { uuid: string; screenshotUrl: string }) {
  const { t } = useI18n()
  const query = useQuery({
    queryKey: ['watch', uuid, 'error'],
    queryFn: () => apiFetch<ErrorResponse>(`/watches/${uuid}/error`),
    staleTime: 10_000,
  })

  if (query.isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('Could not load the error details')}
        description={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => query.refetch()}
      />
    )
  }

  const data = query.data!
  if (!data.error_text && !data.last_notification_error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('No errors')}
        description={t('The last check completed without an error.')}
      />
    )
  }

  return (
    <div className="space-y-3 p-3 md:p-4">
      {data.error_text ? (
        <div className="rounded-card border border-danger/30 bg-danger-bg p-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-danger">
            <AlertCircle className="h-4 w-4" /> {t('Fetch error')}
          </h3>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-danger">
            {data.error_text}
          </pre>
        </div>
      ) : null}

      {data.last_notification_error ? (
        <div className="rounded-card border border-warning/30 bg-warning-bg p-3">
          <h3 className="mb-1 text-sm font-semibold text-warning">{t('Notification error')}</h3>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-warning">
            {String(data.last_notification_error)}
          </pre>
        </div>
      ) : null}

      {data.has_error_screenshot ? (
        <div className="overflow-hidden rounded-card border border-border">
          <img src={`${screenshotUrl}&error=1`} alt={t('Error screenshot')} className="h-auto max-w-full" />
        </div>
      ) : (
        <EmptyState
          icon={ImageOff}
          title={t('No error screenshot')}
          description={t('No screenshot was captured for this error.')}
        />
      )}
    </div>
  )
}
