import { Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/misc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { QuickAdd } from './QuickAdd'

export function AddWatchPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={t('Add a watch')}
        description={t('Paste a URL. Pulse starts checking it on the schedule from your global settings.')}
      />

      <QuickAdd large autoFocus />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t('Need to point at one element?')}</CardTitle>
            <CardDescription>
              {t('The live visual selector and browser steps are still in the classic interface.')}
            </CardDescription>
          </div>
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            {t(
              'Use the visual selector when you want to watch a price, a stock badge, or a single block of a page instead of the whole document.',
            )}
          </p>
          <LegacyLink href="/add-watch-ui/" />
        </CardContent>
      </Card>
    </div>
  )
}
