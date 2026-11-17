import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useNotificationLogs } from '@/lib/queries'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { LegacyLink } from '@/components/legacy/LegacyLink'

export function NotificationLogPage() {
  const { t } = useI18n()
  const query = useNotificationLogs()

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/notifications" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {t('Notifications')}
      </Link>
      <PageHeader
        title={t('Notification log')}
        description={t('Recent send attempts, with notification URL passwords masked.')}
        actions={
          <Button variant="secondary" onClick={() => query.refetch()} loading={query.isFetching}>
            <RefreshCw className="h-4 w-4" /> {t('Refresh')}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-4"><Skeleton className="h-48 w-full" /></div>
          ) : query.isError ? (
            <ErrorState title={t('Could not load the log')} description={query.error instanceof Error ? query.error.message : undefined} onRetry={() => query.refetch()} />
          ) : !query.data?.lines.length ? (
            <EmptyState title={t('The log is empty')} description={t('No notification has been sent yet.')} />
          ) : (
            <pre className="max-h-[70dvh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5">
              {query.data.lines.join('\n')}
            </pre>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted">
        {t('This is the same log as the classic notification log.')}{' '}
        <LegacyLink href="/settings/notification-logs" compact>{t('Open classic log')}</LegacyLink>
      </p>
    </div>
  )
}
