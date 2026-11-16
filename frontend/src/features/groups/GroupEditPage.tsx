import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FlaskConical, Save, Trash2, Unlink } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useGroup, useSettings } from '@/lib/queries'
import type { Group } from '@/lib/types'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmDialog } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'

type GroupSection = 'general' | 'filters' | 'ai' | 'restock' | 'notifications'

interface GroupState {
  title: string
  customColour: boolean
  colour: string
  url_match_pattern: string
  overrides_watch: boolean
  include_filters: string
  subtractive_selectors: string
  trigger_text: string
  ignore_text: string
  text_should_not_be_present: string
  extract_text: string
  extract_lines_containing: string
  strip_ignored_lines: 'yes' | 'no'
  llm_backend_profile: 'inherit' | 'on' | 'off'
  llm_intent: string
  llm_change_summary: string
  llm_change_summary_mode: string
  notification_muted: boolean
  notification_screenshot: boolean
  notification_urls: string
  notification_title: string
  notification_body: string
  notification_format: string
  restock: {
    in_stock_processing: string
    follow_price_changes: boolean
    price_change_min: string
    price_change_max: string
    price_change_threshold_percent: string
  }
}

const emptyState: GroupState = {
  title: '',
  customColour: false,
  colour: '#4f8ef7',
  url_match_pattern: '',
  overrides_watch: false,
  include_filters: '',
  subtractive_selectors: '',
  trigger_text: '',
  ignore_text: '',
  text_should_not_be_present: '',
  extract_text: '',
  extract_lines_containing: '',
  strip_ignored_lines: 'no',
  llm_backend_profile: 'inherit',
  llm_intent: '',
  llm_change_summary: '',
  llm_change_summary_mode: 'replace',
  notification_muted: false,
  notification_screenshot: false,
  notification_urls: '',
  notification_title: '',
  notification_body: '',
  notification_format: 'System default',
  restock: {
    in_stock_processing: 'in_stock_only',
    follow_price_changes: true,
    price_change_min: '',
    price_change_max: '',
    price_change_threshold_percent: '',
  },
}

function listText(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join('\n') : ''
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function numberText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function fromGroup(group: Group): GroupState {
  return {
    title: group.title || '',
    customColour: Boolean(group.tag_colour),
    colour: group.tag_colour || group.colour || '#4f8ef7',
    url_match_pattern: group.url_match_pattern || '',
    overrides_watch: Boolean(group.overrides_watch),
    include_filters: listText(group.include_filters),
    subtractive_selectors: listText(group.subtractive_selectors),
    trigger_text: listText(group.trigger_text),
    ignore_text: listText(group.ignore_text),
    text_should_not_be_present: listText(group.text_should_not_be_present),
    extract_text: listText(group.extract_text),
    extract_lines_containing: listText(group.extract_lines_containing),
    strip_ignored_lines: group.strip_ignored_lines ? 'yes' : 'no',
    llm_backend_profile:
      group.llm_backend_profile === true ? 'on' : group.llm_backend_profile === false ? 'off' : 'inherit',
    llm_intent: text(group.llm_intent),
    llm_change_summary: text(group.llm_change_summary),
    llm_change_summary_mode: text(group.llm_change_summary_mode) || 'replace',
    notification_muted: Boolean(group.notification_muted),
    notification_screenshot: Boolean(group.notification_screenshot),
    notification_urls: listText(group.notification_urls),
    notification_title: text(group.notification_title),
    notification_body: text(group.notification_body),
    notification_format: text(group.notification_format) || 'System default',
    restock: {
      in_stock_processing: text((group.processor_config_restock_diff as Record<string, unknown> | undefined)?.in_stock_processing) || 'in_stock_only',
      follow_price_changes: (group.processor_config_restock_diff as Record<string, unknown> | undefined)?.follow_price_changes !== false,
      price_change_min: numberText((group.processor_config_restock_diff as Record<string, unknown> | undefined)?.price_change_min),
      price_change_max: numberText((group.processor_config_restock_diff as Record<string, unknown> | undefined)?.price_change_max),
      price_change_threshold_percent: numberText((group.processor_config_restock_diff as Record<string, unknown> | undefined)?.price_change_threshold_percent),
    },
  }
}

function splitLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}

function toPayload(state: GroupState): Record<string, unknown> {
  return {
    title: state.title.trim(),
    tag_colour: state.customColour ? state.colour : '',
    url_match_pattern: state.url_match_pattern.trim(),
    overrides_watch: state.overrides_watch,
    include_filters: splitLines(state.include_filters),
    subtractive_selectors: splitLines(state.subtractive_selectors),
    trigger_text: splitLines(state.trigger_text),
    ignore_text: splitLines(state.ignore_text),
    text_should_not_be_present: splitLines(state.text_should_not_be_present),
    extract_text: splitLines(state.extract_text),
    extract_lines_containing: splitLines(state.extract_lines_containing),
    strip_ignored_lines: state.strip_ignored_lines === 'yes',
    llm_backend_profile:
      state.llm_backend_profile === 'on' ? true : state.llm_backend_profile === 'off' ? false : null,
    llm_intent: state.llm_intent,
    llm_change_summary: state.llm_change_summary,
    llm_change_summary_mode: state.llm_change_summary_mode,
    notification_muted: state.notification_muted,
    notification_screenshot: state.notification_screenshot,
    notification_urls: splitLines(state.notification_urls),
    notification_title: state.notification_title,
    notification_body: state.notification_body,
    notification_format: state.notification_format,
    processor_config_restock_diff: {
      in_stock_processing: state.restock.in_stock_processing,
      follow_price_changes: state.restock.follow_price_changes,
      price_change_min: state.restock.price_change_min ? Number(state.restock.price_change_min) : null,
      price_change_max: state.restock.price_change_max ? Number(state.restock.price_change_max) : null,
      price_change_threshold_percent: state.restock.price_change_threshold_percent
        ? Number(state.restock.price_change_threshold_percent)
        : null,
    },
  }
}

export function GroupEditPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const isNew = !uuid
  const { t, tn } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()
  const groupQuery = useGroup(uuid)
  const settingsQuery = useSettings()

  const [section, setSection] = useState<GroupSection>('general')
  const [state, setState] = useState<GroupState>(emptyState)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const initial = useRef(JSON.stringify(emptyState))
  const initialized = useRef(false)

  useEffect(() => {
    // A different group UUID (or switching to the create screen) must reset
    // the form even though React Router reuses this component.
    initialized.current = false
    if (isNew) {
      setState(emptyState)
      initial.current = JSON.stringify(emptyState)
    }
  }, [uuid, isNew])

  useEffect(() => {
    if (isNew || !groupQuery.data || initialized.current) return
    initialized.current = true
    const next = fromGroup(groupQuery.data)
    setState(next)
    initial.current = JSON.stringify(next)
  }, [groupQuery.data, isNew])

  const dirty = JSON.stringify(state) !== initial.current

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      isNew
        ? apiFetch<Group>('/groups', { method: 'POST', body: payload })
        : apiFetch<Group>(`/groups/${uuid}`, { method: 'PUT', body: payload }),
    onSuccess: (group) => {
      initial.current = JSON.stringify(state)
      toast(t('Group saved'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['group', group.uuid] })
      client.invalidateQueries({ queryKey: ['watches'] })
      if (isNew) navigate(`/groups/${group.uuid}`, { replace: true })
    },
    onError: (error) => {
      const description = error instanceof ApiError
        ? Object.values(error.fields).flat().join(', ') || error.message
        : error.message
      toast(t('Could not save this group'), { description, tone: 'error' })
    },
  })

  const remove = useMutation({
    mutationFn: () => apiFetch(`/groups/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['watches'] })
      toast(t('Group deleted'), { tone: 'success' })
      navigate('/groups')
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const unlink = useMutation({
    mutationFn: () => apiFetch(`/groups/${uuid}/unlink`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['group', uuid] })
      client.invalidateQueries({ queryKey: ['watches'] })
      toast(t('Group unlinked'), { tone: 'success' })
      setUnlinkOpen(false)
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const test = useMutation({
    mutationFn: () =>
      apiFetch('/notifications/test', {
        method: 'POST',
        body: {
          urls: splitLines(state.notification_urls),
          title: state.notification_title || undefined,
          body: state.notification_body || undefined,
        },
      }),
    onSuccess: () => toast(t('Test notification sent'), { tone: 'success' }),
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  if (!isNew && groupQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!isNew && (groupQuery.isError || !groupQuery.data)) {
    return (
      <ErrorState
        title={t('Could not load this group')}
        description={groupQuery.error instanceof Error ? groupQuery.error.message : undefined}
        onRetry={() => groupQuery.refetch()}
      />
    )
  }

  const group = groupQuery.data
  const settings = settingsQuery.data
  const formats = settings?.notifications.formats || []

  function patch(value: Partial<GroupState>) {
    setState((current) => ({ ...current, ...value }))
  }

  const tabs = [
    { value: 'general', label: t('General') },
    { value: 'filters', label: t('Filters & Triggers') },
    { value: 'ai', label: t('AI') },
    { value: 'restock', label: t('Restock & Price') },
    { value: 'notifications', label: t('Notifications') },
  ]

  return (
    <div className="mx-auto max-w-4xl pb-20">
      <Link to="/groups" className="mb-2 inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {t('All groups')}
      </Link>

      <PageHeader
        title={isNew && !group ? t('New group') : state.title || t('Group')}
        description={
          isNew && !group
            ? t('Create the group, then share settings across its watches.')
            : tn('{count} watch', '{count} watches', group?.watch_count ?? 0)
        }
        actions={
          <Button variant="primary" onClick={() => save.mutate(toPayload(state))} loading={save.isPending} disabled={!state.title.trim()}>
            <Save className="h-4 w-4" /> {t('Save')}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card dark:shadow-card-dark">
        <Tabs tabs={tabs} value={section} onChange={(value) => setSection(value as GroupSection)} ariaLabel={t('Group sections')} />
        <div className="space-y-4 p-3 md:p-4">
          {section === 'general' ? (
            <>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{t('General')}</CardTitle>
                    <CardDescription>{t('Name, colour, and which watches belong to this group.')}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label={t('Group name')} htmlFor="group-title" required>
                    <Input id="group-title" value={state.title} onChange={(event) => patch({ title: event.target.value })} />
                  </Field>

                  <Field label={t('Auto-apply to URLs matching')} htmlFor="group-pattern" help={t('Wildcards are supported, for example *://example.com/*. Plain text is a case-insensitive substring match.')}>
                    <Input
                      id="group-pattern"
                      value={state.url_match_pattern}
                      onChange={(event) => patch({ url_match_pattern: event.target.value })}
                      placeholder="*://example.com/*"
                    />
                  </Field>

                  <div>
                    <Checkbox
                      label={t('Use a custom colour')}
                      checked={state.customColour}
                      onChange={(event) => patch({ customColour: event.target.checked })}
                    />
                    {state.customColour ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={state.colour}
                          onChange={(event) => patch({ colour: event.target.value })}
                          className="h-11 w-16 cursor-pointer rounded-input border border-border bg-surface p-1"
                          aria-label={t('Group colour')}
                        />
                        <Input value={state.colour} onChange={(event) => patch({ colour: event.target.value })} className="max-w-36 font-mono" />
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted">{t('Automatic colour from the group name.')}</p>
                    )}
                  </div>

                  {group?.matching_watches?.length ? (
                    <div>
                      <h3 className="mb-1 text-sm font-medium">{t('Matching watches')}</h3>
                      <ul className="space-y-1 rounded-input border border-border p-2 text-sm">
                        {group.matching_watches.map((watch) => (
                          <li key={watch.uuid} className="flex items-center justify-between gap-2">
                            <Link to={`/watches/${watch.uuid}/changes`} className="truncate hover:text-primary">
                              {watch.title || watch.url}
                            </Link>
                            {watch.paused ? <Badge tone="neutral">{t('Paused')}</Badge> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <Checkbox
                    label={t('Let this group override watch settings')}
                    description={t('Used by Restock & Price and other settings that support group overrides.')}
                    checked={state.overrides_watch}
                    onChange={(event) => patch({ overrides_watch: event.target.checked })}
                  />
                </CardContent>
              </Card>

              {!isNew ? (
                <Card className="border-danger/30">
                  <CardHeader>
                    <div>
                      <CardTitle className="text-danger">{t('Danger zone')}</CardTitle>
                      <CardDescription>{t('The group can be unlinked from watches or deleted.')}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setUnlinkOpen(true)}>
                      <Unlink className="h-4 w-4" /> {t('Unlink from all watches')}
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" /> {t('Delete group')}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          {section === 'filters' ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t('Filters & Triggers')}</CardTitle>
                  <CardDescription>{t('Applied additively to every watch in this group.')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                <Field label={t('CSS / XPath / JSONPath filters')} htmlFor="group-include">
                  <Textarea id="group-include" value={state.include_filters} onChange={(event) => patch({ include_filters: event.target.value })} rows={5} />
                </Field>
                <Field label={t('Remove elements')} htmlFor="group-subtractive">
                  <Textarea id="group-subtractive" value={state.subtractive_selectors} onChange={(event) => patch({ subtractive_selectors: event.target.value })} rows={5} />
                </Field>
                <Field label={t('Trigger text')} htmlFor="group-trigger">
                  <Textarea id="group-trigger" value={state.trigger_text} onChange={(event) => patch({ trigger_text: event.target.value })} rows={4} />
                </Field>
                <Field label={t('Ignore text')} htmlFor="group-ignore">
                  <Textarea id="group-ignore" value={state.ignore_text} onChange={(event) => patch({ ignore_text: event.target.value })} rows={4} />
                </Field>
                <Field label={t('Blocked text')} htmlFor="group-blocked">
                  <Textarea id="group-blocked" value={state.text_should_not_be_present} onChange={(event) => patch({ text_should_not_be_present: event.target.value })} rows={3} />
                </Field>
                <Field label={t('Extract text')} htmlFor="group-extract">
                  <Textarea id="group-extract" value={state.extract_text} onChange={(event) => patch({ extract_text: event.target.value })} rows={3} />
                </Field>
                <Field label={t('Extract lines containing')} htmlFor="group-extract-lines" className="lg:col-span-2">
                  <Textarea id="group-extract-lines" value={state.extract_lines_containing} onChange={(event) => patch({ extract_lines_containing: event.target.value })} rows={3} />
                </Field>
                <Checkbox
                  className="lg:col-span-2"
                  label={t('Strip ignored lines')}
                  checked={state.strip_ignored_lines === 'yes'}
                  onChange={(event) => patch({ strip_ignored_lines: event.target.checked ? 'yes' : 'no' })}
                />
              </CardContent>
            </Card>
          ) : null}

          {section === 'ai' ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t('AI / LLM')}</CardTitle>
                  <CardDescription>{t('A group can turn AI on and lend its intent and summary prompt to every watch in it.')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label={t('AI for watches in this group')} htmlFor="group-ai-profile">
                  <Select
                    id="group-ai-profile"
                    value={state.llm_backend_profile}
                    onChange={(event) => patch({ llm_backend_profile: event.target.value as GroupState['llm_backend_profile'] })}
                  >
                    <option value="inherit">{t('Leave it to each watch')}</option>
                    <option value="on">{t('On, use the settings below')}</option>
                    <option value="off">{t('Off for every watch')}</option>
                  </Select>
                </Field>
                <Field label={t('Change intent')} htmlFor="group-ai-intent">
                  <Textarea id="group-ai-intent" value={state.llm_intent} onChange={(event) => patch({ llm_intent: event.target.value })} rows={4} />
                </Field>
                <Field label={t('Change summary prompt')} htmlFor="group-ai-summary">
                  <Textarea id="group-ai-summary" value={state.llm_change_summary} onChange={(event) => patch({ llm_change_summary: event.target.value })} rows={5} />
                </Field>
                <Field label={t('Prompt mode')} htmlFor="group-ai-mode">
                  <Select id="group-ai-mode" value={state.llm_change_summary_mode} onChange={(event) => patch({ llm_change_summary_mode: event.target.value })}>
                    <option value="replace">{t('Replace the inherited prompt')}</option>
                    <option value="append">{t('Append to the inherited prompt')}</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>
          ) : null}

          {section === 'restock' ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t('Restock & Price')}</CardTitle>
                  <CardDescription>{t('Applied to every watch in this group when overrides are enabled.')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Checkbox
                  label={t('Activate for individual watches in this group')}
                  checked={state.overrides_watch}
                  onChange={(event) => patch({ overrides_watch: event.target.checked })}
                />
                <Field label={t('Restock detection')} htmlFor="group-restock-mode">
                  <Select
                    id="group-restock-mode"
                    value={state.restock.in_stock_processing}
                    onChange={(event) => patch({ restock: { ...state.restock, in_stock_processing: event.target.value } })}
                  >
                    <option value="in_stock_only">{t('In stock only (out of stock → in stock)')}</option>
                    <option value="all_changes">{t('Any availability change')}</option>
                    <option value="off">{t('Off, do not follow availability')}</option>
                  </Select>
                </Field>
                <Checkbox
                  label={t('Follow price changes')}
                  checked={state.restock.follow_price_changes}
                  onChange={(event) => patch({ restock: { ...state.restock, follow_price_changes: event.target.checked } })}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t('Notify below price')} htmlFor="group-price-min">
                    <Input id="group-price-min" type="number" step="0.01" value={state.restock.price_change_min} onChange={(event) => patch({ restock: { ...state.restock, price_change_min: event.target.value } })} />
                  </Field>
                  <Field label={t('Notify above price')} htmlFor="group-price-max">
                    <Input id="group-price-max" type="number" step="0.01" value={state.restock.price_change_max} onChange={(event) => patch({ restock: { ...state.restock, price_change_max: event.target.value } })} />
                  </Field>
                  <Field label={t('Change threshold (%)')} htmlFor="group-price-threshold">
                    <Input id="group-price-threshold" type="number" min={0} max={100} step="0.1" value={state.restock.price_change_threshold_percent} onChange={(event) => patch({ restock: { ...state.restock, price_change_threshold_percent: event.target.value } })} />
                  </Field>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {section === 'notifications' ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t('Notifications')}</CardTitle>
                  <CardDescription>{t('A group notification configuration is inherited by its watches.')}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Checkbox
                  label={t('Mute notifications for this group')}
                  checked={state.notification_muted}
                  onChange={(event) => patch({ notification_muted: event.target.checked })}
                />
                <Checkbox
                  label={t('Attach a screenshot')}
                  checked={state.notification_screenshot}
                  onChange={(event) => patch({ notification_screenshot: event.target.checked })}
                />
                <Field label={t('Notification URLs')} htmlFor="group-notify-urls" help={t('One Apprise URL per line.')}>
                  <Textarea id="group-notify-urls" value={state.notification_urls} onChange={(event) => patch({ notification_urls: event.target.value })} rows={5} className="font-mono" />
                </Field>
                <Field label={t('Notification format')} htmlFor="group-notify-format">
                  <Select id="group-notify-format" value={state.notification_format} onChange={(event) => patch({ notification_format: event.target.value })}>
                    <option value="System default">{t('System default')}</option>
                    {formats.filter((format) => format.value !== 'System default').map((format) => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('Notification title')} htmlFor="group-notify-title">
                  <Input id="group-notify-title" value={state.notification_title} onChange={(event) => patch({ notification_title: event.target.value })} />
                </Field>
                <Field label={t('Notification body')} htmlFor="group-notify-body">
                  <Textarea id="group-notify-body" value={state.notification_body} onChange={(event) => patch({ notification_body: event.target.value })} rows={5} className="font-mono" />
                </Field>
                <Button variant="secondary" onClick={() => test.mutate()} loading={test.isPending}>
                  <FlaskConical className="h-4 w-4" /> {t('Send test notification')}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur lg:bottom-0 lg:left-60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <span className={cn('text-xs', dirty ? 'text-warning' : 'text-muted')}>{dirty ? t('Unsaved changes') : t('All changes saved')}</span>
          <Button variant="primary" onClick={() => save.mutate(toPayload(state))} loading={save.isPending} disabled={!state.title.trim()}>
            <Save className="h-4 w-4" /> {t('Save')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete this group?')}
        description={t('It is removed from every watch. The watches themselves stay.')}
        confirmLabel={t('Delete group')}
        destructive
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        title={t('Unlink from all watches?')}
        description={t('The group stays, but no watch belongs to it any more.')}
        confirmLabel={t('Unlink')}
        busy={unlink.isPending}
        onConfirm={() => unlink.mutate()}
      />
    </div>
  )
}
