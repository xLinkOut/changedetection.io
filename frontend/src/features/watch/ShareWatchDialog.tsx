import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Copy, Link2, Share2 } from 'lucide-react'
import type { Watch } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { ApiError, apiFetch } from '@/lib/api'
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

/**
 * Upload a trimmed watch configuration to the changedetection.io share service.
 * History and notification settings are stripped server-side; the returned link
 * can be imported by another instance.
 */
export function ShareWatchDialog({
  watch,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  watch: Watch
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setError('')
      setShareUrl('')
      setCopied(false)
    }
  }, [open])

  async function createLink() {
    setBusy(true)
    setError('')
    try {
      const result = await apiFetch<{ url: string }>(`/watches/${watch.uuid}/share`, {
        method: 'POST',
      })
      setShareUrl(result.url)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : t('Could not share this watch'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    const node = inputRef.current
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else if (node) {
        node.select()
        document.execCommand('copy')
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      node?.select()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault()
            returnFocusRef.current.focus()
          }
        }}
        title={shareUrl ? t('Share link ready') : t('Share this watch')}
        description={
          shareUrl
            ? t('Import this link in another changedetection.io instance to copy the watch settings.')
            : t(
                'The watch URL, filters and settings are uploaded to the changedetection.io share service. History and notifications are never shared.',
              )
        }
      >
        <div className="flex items-start gap-3 rounded-input border border-border bg-surface-2/60 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-primary">
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{watch.title || watch.url}</p>
            <p className="truncate text-xs text-muted">{watch.url}</p>
          </div>
        </div>

        {shareUrl ? (
          <div className="mt-4 space-y-2">
            <Field label={t('Share link')} htmlFor="share-link">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="secondary" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? t('Copied') : t('Copy')}
                </Button>
              </div>
            </Field>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('Anyone with this link can import a copy of the watch settings.')}
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{shareUrl ? t('Close') : t('Cancel')}</Button>
          </DialogClose>
          {!shareUrl ? (
            <Button variant="primary" onClick={createLink} loading={busy}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t('Create share link')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
