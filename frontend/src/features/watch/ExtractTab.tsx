import { useState, type FormEvent } from 'react'
import { Download, FileSpreadsheet, Loader2, ScanSearch } from 'lucide-react'
import type { WatchFull } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { apiBase, ApiError, apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { Badge } from '@/components/ui/badge'

interface ExtractPreview {
  regex: string
  snapshot_count: number
  match_count: number
  columns: string[]
  rows: string[][]
  truncated: boolean
}

/**
 * Regex extract-to-CSV over every snapshot. The API generates the same report
 * the classic UI produces, and the table is a preview of the first 50 rows so a
 * typo does not turn into a mystery download.
 */
export function ExtractTab({ watch }: { watch: WatchFull }) {
  const { t } = useI18n()
  const [regex, setRegex] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [result, setResult] = useState<ExtractPreview | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const pattern = regex.trim()
    setFieldError('')
    setError('')
    if (!pattern) {
      setFieldError(t('Enter a regular expression'))
      return
    }
    setBusy(true)
    try {
      const preview = await apiFetch<ExtractPreview>(`/watches/${watch.uuid}/extract`, {
        method: 'POST',
        body: { regex: pattern },
      })
      setResult(preview)
    } catch (caught) {
      setResult(null)
      if (caught instanceof ApiError) {
        setFieldError(caught.fields.regex?.[0] || '')
        setError(caught.message)
      } else {
        setError(caught instanceof Error ? caught.message : t('Could not extract the history'))
      }
    } finally {
      setBusy(false)
    }
  }

  const downloadHref = result
    ? `${apiBase()}/watches/${watch.uuid}/extract?regex=${encodeURIComponent(result.regex)}`
    : ''
  // The CSV keeps the legacy two-cell header while rows can carry extra
  // capture groups. Name those columns in the preview so the table stays
  // aligned and readable.
  const columns = result
    ? Array.from({ length: Math.max(result.columns.length, ...result.rows.map((row) => row.length), 2) }, (_, index) =>
        index < result.columns.length ? result.columns[index] : `${t('Match')} ${index - 1}`,
      )
    : []

  if (!watch.history_n) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title={t('No snapshots to extract yet')}
        description={t('Run a check first. Extraction reads every saved snapshot of this watch.')}
      />
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-success">
          <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">{t('Extract data as CSV')}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">
            {t(
              'Run a regular expression over every snapshot and download the matches as a spreadsheet, one row per snapshot.',
            )}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field
          label={t('Regular expression')}
          htmlFor="extract-regex"
          help={t('Capture groups become their own columns.')}
          error={fieldError || undefined}
          required
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="extract-regex"
              value={regex}
              onChange={(event) => setRegex(event.target.value)}
              placeholder="Price: ([0-9]+[.][0-9]{2})"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(fieldError)}
              className="font-mono"
            />
            <Button type="submit" variant="primary" loading={busy} className="shrink-0">
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              {t('Extract as CSV')}
            </Button>
          </div>
        </Field>
      </form>

      {error && !fieldError ? (
        <p role="alert" className="rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {busy ? (
        <div className="flex items-center justify-center gap-2 rounded-input border border-border bg-surface-2/50 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('Scanning every snapshot…')}
        </div>
      ) : null}

      {!busy && result && result.match_count === 0 ? (
        <div className="rounded-input border border-warning/30 bg-warning-bg px-3 py-3 text-sm text-warning">
          {t('No matches found while scanning all of the watch history for that RegEx.')}
        </div>
      ) : null}

      {!busy && result && result.match_count > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              {t('{count} matches').replace('{count}', String(result.match_count))}
            </Badge>
            <span className="text-xs text-muted">
              {t('{count} snapshots scanned').replace('{count}', String(result.snapshot_count))}
            </span>
            <a
              href={downloadHref}
              className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-input signal-gradient px-4 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
              download
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('Download CSV')}
            </a>
          </div>

          <div className="overflow-x-auto rounded-input border border-border">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <caption className="sr-only">{t('Extracted matches preview')}</caption>
              <thead className="bg-surface-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                <tr>
                  {columns.map((column, index) => (
                    <th key={`${column}-${index}`} scope="col" className="whitespace-nowrap px-3 py-2">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border/70">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="max-w-[22rem] truncate px-3 py-2 font-mono text-[12px]"
                        title={cell}
                      >
                        {cell || <span className="text-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.truncated ? (
            <p className="text-xs text-muted">
              {t('Preview shows the first {count} rows. The download contains every match.').replace(
                '{count}',
                String(result.rows.length),
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
