import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { Badge } from '@/components/ui/badge'

interface ImportResult {
  imported: number
  skipped: number
  errors: { line: string; error: string }[]
  uuids: string[]
}

export function ImportPage() {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const { toast } = useToast()
  const [urls, setUrls] = useState('')
  const [processor, setProcessor] = useState('')
  const [tags, setTags] = useState('')
  const [paused, setPaused] = useState(false)
  const [dedupe, setDedupe] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: () =>
      apiFetch<ImportResult>('/import/urls', {
        method: 'POST',
        body: {
          urls,
          processor: processor || undefined,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          paused,
          dedupe,
        },
      }),
    onSuccess: (data) => {
      setResult(data)
      toast(
        t('Imported {count} URLs').replace('{count}', String(data.imported)),
        { tone: data.errors.length ? 'warning' : 'success' },
      )
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!urls.trim()) return
    importMutation.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={t('Import watches')}
        description={t('Paste one URL per line. Add group names after a space, separated by commas.')}
      />

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t('URL list')}</CardTitle>
              <CardDescription>
                {t('Example: https://example.com/product electronics, deals')}
              </CardDescription>
            </div>
            <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={t('URLs')} htmlFor="import-urls" required>
              <Textarea
                id="import-urls"
                value={urls}
                onChange={(event) => setUrls(event.target.value)}
                rows={10}
                placeholder={'https://example.com/product\nhttps://example.com/blog deals'}
                className="font-mono"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('Processor for every URL')} htmlFor="import-processor">
                <Select id="import-processor" value={processor} onChange={(event) => setProcessor(event.target.value)}>
                  <option value="">{t('Default')}</option>
                  {(bootstrap.processors || []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Add these groups to every URL')} htmlFor="import-tags">
                <Input id="import-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t('deals, electronics')} />
              </Field>
            </div>

            <div className="grid gap-1 sm:grid-cols-2">
              <Checkbox label={t('Skip URLs that are already watched')} checked={dedupe} onChange={(event) => setDedupe(event.target.checked)} />
              <Checkbox label={t('Add the watches paused')} checked={paused} onChange={(event) => setPaused(event.target.checked)} />
            </div>

            <Button type="submit" variant="primary" loading={importMutation.isPending} disabled={!urls.trim()}>
              {t('Import')}
            </Button>
          </CardContent>
        </Card>
      </form>

      {result ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t('Import result')}</CardTitle>
              <CardDescription>
                {t('{imported} imported, {skipped} skipped').replace('{imported}', String(result.imported)).replace('{skipped}', String(result.skipped))}
              </CardDescription>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2">
            {result.uuids.length ? (
              <div className="flex flex-wrap gap-1">
                {result.uuids.slice(0, 20).map((uuid) => (
                  <Link key={uuid} to={`/watches/${uuid}/edit`} className="text-xs text-primary hover:underline">
                    <Badge tone="primary">{uuid.slice(0, 8)}</Badge>
                  </Link>
                ))}
              </div>
            ) : null}
            {result.errors.length ? (
              <div className="rounded-input border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
                <p className="font-medium">{t('Some lines were skipped')}</p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.errors.map((error, index) => (
                    <li key={index}>
                      <code>{error.line}</code> — {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link to="/" className="inline-flex text-sm font-medium text-primary hover:underline">
              {t('Back to watches')}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t('Spreadsheet and Distill.io imports')}</CardTitle>
            <CardDescription>{t('These importers are still in the classic interface for this wave.')}</CardDescription>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-muted" aria-hidden="true" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <LegacyLink href="/imports/import#xlsx">{t('XLSX import')}</LegacyLink>
          <LegacyLink href="/imports/import#distill-io">{t('Distill.io import')}</LegacyLink>
          <Link to="/settings/backups" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-fg">
            {t('Restore a backup')}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
