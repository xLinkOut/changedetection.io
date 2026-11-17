import { useState } from 'react'
import { Bell, BellOff, CheckCheck, EyeOff, MoreHorizontal, Pause, Play, RefreshCw, Tag, Trash2, Undo2, X, XCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Field, Input, Select } from '@/components/ui/input'
import type { Option } from '@/lib/types'

export function BulkBar({
  count,
  total,
  allMatchingSelected,
  onSelectAllMatching,
  onClear,
  onOp,
  onDelete,
  onClearHistory,
  busy,
  fetchers,
  proxies,
}: {
  count: number
  total: number
  allMatchingSelected: boolean
  onSelectAllMatching: () => void
  onClear: () => void
  onOp: (op: string, extra?: string) => Promise<void>
  onDelete: () => Promise<void>
  onClearHistory: () => Promise<void>
  busy: boolean
  fetchers: Option[]
  proxies: string[]
}) {
  const { t, tn } = useI18n()
  const [tagOpen, setTagOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [fetcherOpen, setFetcherOpen] = useState(false)
  const [fetcher, setFetcher] = useState('system')
  const [proxyOpen, setProxyOpen] = useState(false)
  const [proxy, setProxy] = useState('')

  if (!count) return null

  return (
    <>
      <div className="fixed inset-x-0 bottom-[104px] z-40 px-2 pb-1 lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:w-[900px] lg:-translate-x-1/2 lg:px-4">
        <div className="rounded-dialog border border-border bg-surface p-2 shadow-xl">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClear} aria-label={t('Clear selection')}>
              <X className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {tn('{count} selected', '{count} selected', count)}
              </p>
              {!allMatchingSelected && total > count ? (
                <button type="button" onClick={onSelectAllMatching} className="truncate text-xs text-primary hover:underline">
                  {t('Select all {total} matching').replace('{total}', String(total))}
                </button>
              ) : (
                <p className="truncate text-xs text-muted">
                  {allMatchingSelected ? t('All matching watches selected') : t('Selection is for this view')}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => onOp('pause')}>
                <Pause className="h-3.5 w-3.5" /> {t('Pause')}
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => onOp('unpause')}>
                <Play className="h-3.5 w-3.5" /> {t('Resume')}
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => onOp('recheck')}>
                <RefreshCw className="h-3.5 w-3.5" /> {t('Recheck')}
              </Button>
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => onOp('mark-viewed')}>
                <CheckCheck className="h-3.5 w-3.5" /> {t('Viewed')}
              </Button>
            </div>

            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="secondary" size="sm" disabled={busy} aria-label={t('More bulk actions')}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>{t('Bulk actions')}</DropdownLabel>
                <DropdownItem onSelect={() => onOp('pause')}>
                  <Pause className="mr-2 inline h-4 w-4" /> {t('Pause checks')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('unpause')}>
                  <Play className="mr-2 inline h-4 w-4" /> {t('Resume checks')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('mute')}>
                  <BellOff className="mr-2 inline h-4 w-4" /> {t('Mute notifications')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('unmute')}>
                  <Bell className="mr-2 inline h-4 w-4" /> {t('Unmute notifications')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('recheck')}>
                  <RefreshCw className="mr-2 inline h-4 w-4" /> {t('Recheck now')}
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => onOp('mark-viewed')}>
                  <CheckCheck className="mr-2 inline h-4 w-4" /> {t('Mark as viewed')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('mark-unviewed')}>
                  <EyeOff className="mr-2 inline h-4 w-4" /> {t('Mark as unviewed')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('clear-errors')}>
                  <XCircle className="mr-2 inline h-4 w-4" /> {t('Clear errors')}
                </DropdownItem>
                <DropdownItem onSelect={() => onOp('notification-default')}>
                  <Undo2 className="mr-2 inline h-4 w-4" /> {t('Use default notifications')}
                </DropdownItem>
                <DropdownItem onSelect={() => setTagOpen(true)}>
                  <Tag className="mr-2 inline h-4 w-4" /> {t('Add to group')}
                </DropdownItem>
                <DropdownItem onSelect={() => setFetcherOpen(true)}>
                  <RefreshCw className="mr-2 inline h-4 w-4" /> {t('Set browser / fetch method')}
                </DropdownItem>
                <DropdownItem onSelect={() => setProxyOpen(true)}>
                  <RefreshCw className="mr-2 inline h-4 w-4" /> {t('Set proxy')}
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => setHistoryOpen(true)} destructive>
                  <RefreshCw className="mr-2 inline h-4 w-4" /> {t('Clear history')}
                </DropdownItem>
                <DropdownItem onSelect={() => setDeleteOpen(true)} destructive>
                  <Trash2 className="mr-2 inline h-4 w-4" /> {t('Delete watches')}
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 md:hidden">
            <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => onOp('pause')}>
              <Pause className="h-3.5 w-3.5" /> {t('Pause')}
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => onOp('recheck')}>
              <RefreshCw className="h-3.5 w-3.5" /> {t('Recheck')}
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => onOp('mark-viewed')}>
              <CheckCheck className="h-3.5 w-3.5" /> {t('Viewed')}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={tagOpen}
        onOpenChange={setTagOpen}
        title={t('Add to group')}
        description={t('The group is created if it does not exist yet.')}
        confirmLabel={t('Add to group')}
        busy={busy}
        onConfirm={async () => {
          if (!tagName.trim()) return
          await onOp('assign-tag', tagName.trim())
          setTagName('')
          setTagOpen(false)
        }}
      >
        <div className="mt-4">
          <Field label={t('Group name')} htmlFor="bulk-tag">
            <Input id="bulk-tag" value={tagName} onChange={(event) => setTagName(event.target.value)} autoFocus />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={fetcherOpen}
        onOpenChange={setFetcherOpen}
        title={t('Set browser / fetch method')}
        description={t('Applies to every selected watch.')}
        confirmLabel={t('Apply')}
        busy={busy}
        onConfirm={async () => {
          await onOp('set-fetch-backend', fetcher)
          setFetcherOpen(false)
        }}
      >
        <div className="mt-4">
          <Field label={t('Fetch method')} htmlFor="bulk-fetcher">
            <Select id="bulk-fetcher" value={fetcher} onChange={(event) => setFetcher(event.target.value)}>
              {fetchers.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={proxyOpen}
        onOpenChange={setProxyOpen}
        title={t('Set proxy')}
        description={t('Applies to every selected watch.')}
        confirmLabel={t('Apply')}
        busy={busy}
        onConfirm={async () => {
          await onOp('set-proxy', proxy)
          setProxyOpen(false)
        }}
      >
        <div className="mt-4">
          <Field label={t('Proxy')} htmlFor="bulk-proxy">
            <Select id="bulk-proxy" value={proxy} onChange={(event) => setProxy(event.target.value)}>
              <option value="">{t('System default')}</option>
              {proxies.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t('Clear history for {count} watches?').replace('{count}', String(count))}
        description={t('Snapshots and screenshots are removed. The watches and their settings stay. This cannot be undone.')}
        confirmLabel={t('Clear history')}
        destructive
        busy={busy}
        onConfirm={async () => {
          await onClearHistory()
          setHistoryOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete {count} watches?').replace('{count}', String(count))}
        description={t('The watches and all of their history will be deleted. This cannot be undone.')}
        confirmLabel={t('Delete watches')}
        destructive
        busy={busy}
        onConfirm={async () => {
          await onDelete()
          setDeleteOpen(false)
        }}
      />
    </>
  )
}
