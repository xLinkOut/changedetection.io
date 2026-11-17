import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Bell, ExternalLink, FlaskConical, ScrollText } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useSettings } from '@/lib/queries'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { ErrorState, Skeleton } from '@/components/ui/states'

export function NotificationsPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const settings = useSettings()

  const test = useMutation({
    mutationFn: () => apiFetch('/notifications/test', { method: 'POST', body: {} }),
    onSuccess: () => toast(t('Test notification sent'), { tone: 'success' }),
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  if (settings.isLoading) return <Skeleton className="h-64 w-full" />
  if (settings.isError || !settings.data) {
    return <ErrorState title={t('Could not load notification settings')} onRetry={() => settings.refetch()} />
  }

  const notifications = settings.data.notifications

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={t('Notifications')}
        description={t('Where Pulse and the classic interface send change alerts.')}
        actions={
          <Button variant="secondary" onClick={() => test.mutate()} loading={test.isPending}>
            <FlaskConical className="h-4 w-4" /> {t('Send test')}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t('Global notification services')}</CardTitle>
            <CardDescription>{t('Used by watches and groups that do not override notifications.')}</CardDescription>
          </div>
          <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="info">{t('Format')}: {notifications.notification_format}</Badge>
            <Badge tone={notifications.notification_urls.length ? 'success' : 'warning'}>
              {notifications.notification_urls.length} {t('services')}
            </Badge>
          </div>
          {notifications.notification_urls.length ? (
            <ul className="space-y-1 rounded-input bg-surface-2 p-3 font-mono text-xs">
              {notifications.notification_urls.map((url, index) => (
                <li key={index} className="truncate">{url}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('No notification services configured yet.')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to="/settings/notifications" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
              {t('Edit notification settings')}
            </Link>
            <Link to="/notifications/log" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-fg">
              <ScrollText className="h-4 w-4" /> {t('Notification log')}
            </Link>
            <LegacyLink href="/settings/notifications/apprise" compact>{t('Apprise builder')}</LegacyLink>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t('Per-watch titles and bodies')}</CardTitle>
            <CardDescription>{t('Each watch can override the title, body, format and Apprise list.')}</CardDescription>
          </div>
          <ExternalLink className="h-5 w-5 text-muted" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            {t('Open a watch, then the Notifications tab to test and override its alerts.')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
