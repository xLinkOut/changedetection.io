import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  CircleHelp,
  FlaskConical,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import type { Group, Settings, WatchFull } from '@/lib/types'
import type { ConditionRow, NotificationChoice, ScheduleDay, TernaryChoice, WatchFormState } from './formState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Field, Input, Label, Select, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { EmptyState } from '@/components/ui/states'
import { cn } from '@/lib/cn'

type PatchFn = (patch: Partial<WatchFormState>) => void

interface SectionProps {
  state: WatchFormState
  patch: PatchFn
  watch: WatchFull
  groups: Group[]
  settings?: Settings
  errors: Record<string, string>
  onDelete?: () => void
  onClearHistory?: () => void
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function GroupPicker({
  selected,
  groups,
  onChange,
}: {
  selected: string[]
  groups: Group[]
  onChange: (tags: string[]) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')
  const datalistId = 'pulse-group-options'

  function add(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (selected.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...selected, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => {
            const group = groups.find((item) => item.title.toLowerCase() === tag.toLowerCase())
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs"
              >
                {group ? (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.colour }} />
                ) : null}
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((item) => item !== tag))}
                  className="relative ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted after:absolute after:-inset-3 hover:bg-border hover:text-fg"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">{t('No groups yet. Type a name to create one.')}</p>
      )}
      <div className="flex gap-2">
        <Input
          list={datalistId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add(draft)
            }
          }}
          placeholder={t('Add a group and press Enter')}
          aria-label={t('Add a group')}
        />
        <datalist id={datalistId}>
          {groups.map((group) => (
            <option key={group.uuid} value={group.title} />
          ))}
        </datalist>
        <Button type="button" variant="secondary" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" /> {t('Add')}
        </Button>
      </div>
      <p className="text-xs text-muted">
        {t('A group name that does not exist yet is created when you save.')}
      </p>
    </div>
  )
}

export function GeneralSection({ state, patch, groups, settings, errors, onDelete, onClearHistory }: SectionProps) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const [processorHelp, setProcessorHelp] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <Section title={t('General')} description={t('What to watch, how often, and which processor to use.')}>
        <Field label={t('Web page URL')} htmlFor="watch-url" required error={errors.url}>
          <Input
            id="watch-url"
            type="text"
            inputMode="url"
            value={state.url}
            onChange={(event) => patch({ url: event.target.value })}
            placeholder="https://example.com/product"
          />
        </Field>

        <Field label={t('Title')} htmlFor="watch-title" help={t('Optional. The page title is used when this is empty.')}>
          <Input
            id="watch-title"
            value={state.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </Field>

        <Field label={t('Groups')} help={t('Groups can share filters, notifications and AI settings.')}>
          <GroupPicker selected={state.tags} groups={groups} onChange={(tags) => patch({ tags })} />
        </Field>

        <div>
          <Label>{t('Processor')}</Label>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {(bootstrap.processors || []).map((processor) => (
              <label
                key={processor.value}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-input border px-3 py-2 text-sm',
                  state.processor === processor.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name="processor"
                  value={processor.value}
                  checked={state.processor === processor.value}
                  onChange={() => {
                    patch({ processor: processor.value })
                    setProcessorHelp(processor.value)
                  }}
                  className="h-4 w-4 text-primary"
                />
                <span className="font-medium">{processor.badge || processor.label}</span>
                <span className="truncate text-xs text-muted">{processor.label}</span>
              </label>
            ))}
          </div>
          {processorHelp ? <p className="mt-1 text-xs text-muted">{t('Processor changes apply after saving and the next check.')}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t('Open link override')}
            htmlFor="watch-link"
            help={t('Optional URL to open instead of the watched URL.')}
          >
            <Input
              id="watch-link"
              value={state.link_to_open}
              onChange={(event) => patch({ link_to_open: event.target.value })}
              placeholder="https://example.com/product"
            />
          </Field>
          <Field label={t('Use page title in list')} htmlFor="watch-page-title">
            <Select
              id="watch-page-title"
              value={state.use_page_title_in_list}
              onChange={(event) => patch({ use_page_title_in_list: event.target.value as TernaryChoice })}
            >
              <option value="system">{t('Use system setting')}</option>
              <option value="yes">{t('Yes')}</option>
              <option value="no">{t('No')}</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title={t('Schedule')} description={t('How often this watch is checked.')}>
        <Checkbox
          label={t('Use global interval and schedule')}
          description={t('The defaults from Settings → General and Fetching.')}
          checked={state.time_between_check_use_default}
          onChange={(event) => patch({ time_between_check_use_default: event.target.checked })}
        />

        <TimeIntervalInput
          value={state.time_between_check}
          disabled={state.time_between_check_use_default}
          onChange={(value) => patch({ time_between_check: value })}
        />
        {errors.time_between_check ? <p className="text-xs text-danger">{errors.time_between_check}</p> : null}

        <ScheduleEditor
          value={state.time_schedule_limit}
          timezones={settings?.info.available_timezones || []}
          onChange={(value) => patch({ time_schedule_limit: value })}
        />
      </Section>

      <Section title={t('History')} description={t('How many snapshots to keep for this watch.')}>
        <Field
          label={t('Maximum snapshots')}
          htmlFor="watch-history"
          help={t('Leave empty to use the global setting. Minimum 2.')}
          error={errors.history_snapshot_max_length}
        >
          <Input
            id="watch-history"
            type="number"
            min={2}
            value={state.history_snapshot_max_length}
            onChange={(event) => patch({ history_snapshot_max_length: event.target.value })}
          />
        </Field>
      </Section>

      {onDelete || onClearHistory ? (
        <Card className="border-danger/30">
          <CardHeader>
            <div>
              <CardTitle className="text-danger">{t('Danger zone')}</CardTitle>
              <CardDescription>{t('These actions cannot be undone.')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {onClearHistory ? (
              <Button variant="secondary" onClick={onClearHistory}>
                <Trash2 className="h-4 w-4" /> {t('Clear history')}
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="danger" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> {t('Delete watch')}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function TimeIntervalInput({
  value,
  disabled,
  onChange,
}: {
  value: WatchFormState['time_between_check']
  disabled: boolean
  onChange: (value: WatchFormState['time_between_check']) => void
}) {
  const { t } = useI18n()
  const parts: { key: keyof WatchFormState['time_between_check']; label: string }[] = [
    { key: 'weeks', label: t('Weeks') },
    { key: 'days', label: t('Days') },
    { key: 'hours', label: t('Hours') },
    { key: 'minutes', label: t('Minutes') },
    { key: 'seconds', label: t('Seconds') },
  ]
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-fg">{t('Check every')}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {parts.map((part) => (
          <label key={part.key} className="block">
            <span className="mb-1 block text-[11px] text-muted">{part.label}</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={value[part.key]}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, [part.key]: event.target.value })}
              className="px-1 text-center"
            />
          </label>
        ))}
      </div>
      {disabled ? <p className="mt-1 text-xs text-muted">{t('Using the global interval.')}</p> : null}
    </fieldset>
  )
}

export function ScheduleEditor({
  value,
  timezones,
  onChange,
}: {
  value: WatchFormState['time_schedule_limit']
  timezones: string[]
  onChange: (value: WatchFormState['time_schedule_limit']) => void
}) {
  const { t } = useI18n()
  const days: { key: keyof WatchFormState['time_schedule_limit']; label: string }[] = [
    { key: 'monday', label: t('Monday') },
    { key: 'tuesday', label: t('Tuesday') },
    { key: 'wednesday', label: t('Wednesday') },
    { key: 'thursday', label: t('Thursday') },
    { key: 'friday', label: t('Friday') },
    { key: 'saturday', label: t('Saturday') },
    { key: 'sunday', label: t('Sunday') },
  ]

  function updateDay(key: keyof WatchFormState['time_schedule_limit'], patch: Partial<ScheduleDay>) {
    const day = value[key] as ScheduleDay
    onChange({ ...value, [key]: { ...day, ...patch } })
  }

  return (
    <div className="space-y-3 rounded-input border border-border p-3">
      <Switch
        checked={value.enabled}
        onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        label={t('Only check during a schedule')}
        description={t('Outside these windows the watch is not checked.')}
      />

      {value.enabled ? (
        <>
          <Field label={t('Timezone')} htmlFor="schedule-timezone" help={t('IANA timezone, for example Europe/Rome.')}>
            <Input
              id="schedule-timezone"
              list="pulse-timezones"
              value={value.timezone}
              onChange={(event) => onChange({ ...value, timezone: event.target.value })}
              placeholder={t('Use the global timezone')}
            />
            <datalist id="pulse-timezones">
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone} />
              ))}
            </datalist>
          </Field>

          <div className="space-y-1.5">
            {days.map((day) => {
              const dayValue = value[day.key] as ScheduleDay
              return (
                <div key={day.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-input bg-surface-2 px-2 py-1.5">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dayValue.enabled}
                      onChange={(event) => updateDay(day.key, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-border-strong text-primary"
                    />
                    {day.label}
                  </label>
                  <input
                    type="time"
                    value={dayValue.start_time}
                    onChange={(event) => updateDay(day.key, { start_time: event.target.value })}
                    disabled={!dayValue.enabled}
                    className="h-11 rounded-input border border-border-strong bg-surface px-2 text-xs disabled:opacity-50"
                    aria-label={`${day.label} start time`}
                  />
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={dayValue.hours}
                      onChange={(event) => updateDay(day.key, { hours: event.target.value })}
                      disabled={!dayValue.enabled}
                      className="h-11 w-12 rounded-input border border-border-strong bg-surface px-1 text-center disabled:opacity-50"
                      aria-label={`${day.label} hours`}
                    />
                    <span className="text-muted">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={dayValue.minutes}
                      onChange={(event) => updateDay(day.key, { minutes: event.target.value })}
                      disabled={!dayValue.enabled}
                      className="h-11 w-12 rounded-input border border-border-strong bg-surface px-1 text-center disabled:opacity-50"
                      aria-label={`${day.label} minutes`}
                    />
                    <span className="text-muted">m</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function RequestSection({ state, patch, watch, settings, errors }: SectionProps) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const proxies = settings?.proxies.proxy_list || []

  return (
    <div className="space-y-4">
      <Section title={t('Request')} description={t('How Pulse fetches the page.')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Fetch method')} htmlFor="watch-fetcher">
            <Select
              id="watch-fetcher"
              value={state.fetch_backend}
              onChange={(event) => patch({ fetch_backend: event.target.value })}
            >
              {(bootstrap.fetchers || []).map((fetcher) => (
                <option key={fetcher.value} value={fetcher.value}>
                  {fetcher.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Proxy')} htmlFor="watch-proxy">
            <Select
              id="watch-proxy"
              value={state.proxy}
              onChange={(event) => patch({ proxy: event.target.value })}
            >
              <option value="">{t('System default')}</option>
              {proxies.map((proxy) => (
                <option key={proxy} value={proxy}>
                  {proxy}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Request method')} htmlFor="watch-method">
            <Select
              id="watch-method"
              value={state.method}
              onChange={(event) => patch({ method: event.target.value })}
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Chrome wait (seconds)')} htmlFor="watch-wait" help={t('Delay before extracting text with a browser.')}>
            <Input
              id="watch-wait"
              type="number"
              min={1}
              value={state.webdriver_delay}
              onChange={(event) => patch({ webdriver_delay: event.target.value })}
            />
          </Field>
        </div>

        <Checkbox
          label={t('Ignore non-2xx status codes')}
          description={t('Process the page even when the server returns a 4xx or 5xx status.')}
          checked={state.ignore_status_codes}
          onChange={(event) => patch({ ignore_status_codes: event.target.checked })}
        />

        <Field
          label={t('Request body')}
          htmlFor="watch-body"
          help={t('Used for POST/PUT/PATCH. Jinja2 variables like {{ now }} are allowed.')}
          error={errors.body}
        >
          <Textarea
            id="watch-body"
            value={state.body}
            onChange={(event) => patch({ body: event.target.value })}
            rows={4}
            className="font-mono"
          />
        </Field>

        <Field
          label={t('Request headers')}
          htmlFor="watch-headers"
          help={t('One per line, Key: Value. Jinja2 variables are allowed.')}
          error={errors.headers}
        >
          <Textarea
            id="watch-headers"
            value={state.headers}
            onChange={(event) => patch({ headers: event.target.value })}
            rows={5}
            placeholder={'Authorization: Bearer …\nAccept-Language: en'}
            className="font-mono"
          />
        </Field>

        <Field
          label={t('JavaScript before extraction')}
          htmlFor="watch-js"
          help={t('Advanced. Runs in the browser before the page is processed.')}
        >
          <Textarea
            id="watch-js"
            value={state.webdriver_js_execute_code}
            onChange={(event) => patch({ webdriver_js_execute_code: event.target.value })}
            rows={4}
            className="font-mono"
          />
        </Field>
      </Section>

      <Section title={t('Browser automation')} description={t('Browser Steps and the Visual Selector are in the classic interface for now.')}>
        <div className="flex flex-wrap gap-3">
          <LegacyLink href={`/edit/${watch.uuid}#browser-steps`}>{t('Open Browser Steps')}</LegacyLink>
          <LegacyLink href={`/edit/${watch.uuid}#visualselector`}>{t('Open Visual Selector')}</LegacyLink>
          <LegacyLink href={`/edit/${watch.uuid}#visualselector`} compact>
            {t('Advanced image diff settings')}
          </LegacyLink>
        </div>
        <p className="text-xs text-muted">
          {t('They live in the classic editor until the next wave. Your saved steps and selections stay usable there.')}
        </p>
      </Section>
    </div>
  )
}

export function FiltersSection({ state, patch, watch }: SectionProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<{
    after_filter: string
    before_filter: string
    trigger_line_numbers: number[]
    ignore_line_numbers: number[]
    blocked_line_numbers: number[]
    llm_evaluation?: string | null
  } | null>(null)

  const previewMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        after_filter: string
        before_filter: string
        trigger_line_numbers: number[]
        ignore_line_numbers: number[]
        blocked_line_numbers: number[]
        llm_evaluation?: string | null
      }>(`/watches/${watch.uuid}/filters/preview`, {
        method: 'POST',
        body: {
          overrides: {
            include_filters: splitLines(state.include_filters),
            subtractive_selectors: splitLines(state.subtractive_selectors),
            trigger_text: splitLines(state.trigger_text),
            ignore_text: splitLines(state.ignore_text),
            text_should_not_be_present: splitLines(state.text_should_not_be_present),
            extract_text: splitLines(state.extract_text),
            extract_lines_containing: splitLines(state.extract_lines_containing),
            check_unique_lines: state.check_unique_lines,
            remove_duplicate_lines: state.remove_duplicate_lines,
            sort_text_alphabetically: state.sort_text_alphabetically,
            trim_text_whitespace: state.trim_text_whitespace,
            strip_ignored_lines:
              state.strip_ignored_lines === 'yes' ? true : state.strip_ignored_lines === 'no' ? false : null,
            filter_text_added: state.filter_text_added,
            filter_text_replaced: state.filter_text_replaced,
            filter_text_removed: state.filter_text_removed,
            llm_intent: state.llm_intent,
          },
        },
      }),
    onSuccess: (data) => {
      setPreview(data)
      setPreviewOpen(true)
    },
    onError: (error) => toast(error instanceof Error ? error.message : t('Could not build the preview'), { tone: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Section
        title={t('Filters & Triggers')}
        description={t('Narrow the page down to the part that matters, then decide what counts as a change.')}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>
            <Wand2 className="h-4 w-4" /> {t('Preview with these filters')}
          </Button>
          <span className="text-xs text-muted">
            {t('Uses the latest HTML snapshot and these unsaved values.')}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={t('CSS / XPath / JSONPath filters')} htmlFor="filters-include" help={t('One per line. Leave empty to watch the whole page.')}>
            <Textarea id="filters-include" value={state.include_filters} onChange={(event) => patch({ include_filters: event.target.value })} rows={5} />
          </Field>
          <Field label={t('Remove elements')} htmlFor="filters-subtractive" help={t('CSS or XPath selectors, one per line.')}>
            <Textarea id="filters-subtractive" value={state.subtractive_selectors} onChange={(event) => patch({ subtractive_selectors: event.target.value })} rows={5} />
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={t('Trigger text')} htmlFor="filters-trigger" help={t('Only notify when one of these lines appears.')}>
            <Textarea id="filters-trigger" value={state.trigger_text} onChange={(event) => patch({ trigger_text: event.target.value })} rows={4} />
          </Field>
          <Field label={t('Ignore text')} htmlFor="filters-ignore" help={t('Lines containing these values are ignored.')}>
            <Textarea id="filters-ignore" value={state.ignore_text} onChange={(event) => patch({ ignore_text: event.target.value })} rows={4} />
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={t('Blocked text')} htmlFor="filters-blocked" help={t('Do not report a change while this text is present.')}>
            <Textarea id="filters-blocked" value={state.text_should_not_be_present} onChange={(event) => patch({ text_should_not_be_present: event.target.value })} rows={3} />
          </Field>
          <Field label={t('Extract text')} htmlFor="filters-extract" help={t('Regex, one per line. Only matching text is compared.')}>
            <Textarea id="filters-extract" value={state.extract_text} onChange={(event) => patch({ extract_text: event.target.value })} rows={3} />
          </Field>
        </div>

        <Field label={t('Extract lines containing')} htmlFor="filters-extract-lines" help={t('Only keep lines containing these values.')}>
          <Textarea id="filters-extract-lines" value={state.extract_lines_containing} onChange={(event) => patch({ extract_lines_containing: event.target.value })} rows={3} />
        </Field>

        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <Checkbox label={t('Only trigger when unique lines appear in all history')} checked={state.check_unique_lines} onChange={(event) => patch({ check_unique_lines: event.target.checked })} />
          <Checkbox label={t('Remove duplicate lines')} checked={state.remove_duplicate_lines} onChange={(event) => patch({ remove_duplicate_lines: event.target.checked })} />
          <Checkbox label={t('Sort text alphabetically')} checked={state.sort_text_alphabetically} onChange={(event) => patch({ sort_text_alphabetically: event.target.checked })} />
          <Checkbox label={t('Trim whitespace')} checked={state.trim_text_whitespace} onChange={(event) => patch({ trim_text_whitespace: event.target.checked })} />
        </div>

        <Field label={t('Strip ignored lines')} htmlFor="filters-strip">
          <Select
            id="filters-strip"
            value={state.strip_ignored_lines}
            onChange={(event) => patch({ strip_ignored_lines: event.target.value as TernaryChoice })}
          >
            <option value="system">{t('Use system setting')}</option>
            <option value="yes">{t('Yes')}</option>
            <option value="no">{t('No')}</option>
          </Select>
        </Field>

        <div className="grid gap-1 sm:grid-cols-3">
          <Checkbox label={t('Notify on added lines')} checked={state.filter_text_added} onChange={(event) => patch({ filter_text_added: event.target.checked })} />
          <Checkbox label={t('Notify on replaced lines')} checked={filterTextReplaced(state)} onChange={(event) => patch({ filter_text_replaced: event.target.checked })} />
          <Checkbox label={t('Notify on removed lines')} checked={state.filter_text_removed} onChange={(event) => patch({ filter_text_removed: event.target.checked })} />
        </div>
      </Section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent title={t('Filter preview')} description={t('The latest snapshot with these filters applied.')} className="max-w-4xl">
          {preview ? <FilterPreview preview={preview} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function filterTextReplaced(state: WatchFormState) {
  return state.filter_text_replaced
}

function FilterPreview({
  preview,
}: {
  preview: {
    after_filter: string
    before_filter: string
    trigger_line_numbers: number[]
    ignore_line_numbers: number[]
    blocked_line_numbers: number[]
    llm_evaluation?: string | null
  }
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'after' | 'before'>('after')
  const content = tab === 'after' ? preview.after_filter : preview.before_filter
  const trigger = new Set(preview.trigger_line_numbers)
  const ignored = new Set(preview.ignore_line_numbers)
  const blocked = new Set(preview.blocked_line_numbers)
  const lines = content.split('\n')

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant={tab === 'after' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('after')}>
          {t('After filters')}
        </Button>
        <Button variant={tab === 'before' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('before')}>
          {t('Before filters')}
        </Button>
      </div>
      {preview.llm_evaluation ? (
        <div className="rounded-input border border-primary/20 bg-primary/5 p-2 text-sm">
          <strong>{t('AI intent preview')}:</strong> {preview.llm_evaluation}
        </div>
      ) : null}
      <div className="max-h-[55dvh] overflow-auto rounded-input border border-border font-mono text-[13px] leading-5">
        {lines.map((line, index) => {
          const number = index + 1
          return (
            <div
              key={index}
              className={cn(
                'flex border-b border-border/40 last:border-0',
                tab === 'after' && trigger.has(number) && 'bg-warning-bg',
                tab === 'after' && ignored.has(number) && 'bg-surface-2 text-muted',
                tab === 'after' && blocked.has(number) && 'bg-danger-bg text-danger',
              )}
            >
              <span className="w-12 shrink-0 border-r border-border/50 px-2 text-right text-[11px] text-muted/70">{number}</span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words px-2">{line || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ConditionsSection({ state, patch, watch }: SectionProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const options = useQuery({
    queryKey: ['conditions-options', watch.uuid],
    queryFn: () =>
      apiFetch<{ fields: { value: string; label: string }[]; operators: { value: string; label: string }[] }>(
        `/watches/${watch.uuid}/conditions/options`,
      ),
    staleTime: 5 * 60_000,
  })
  const [verified, setVerified] = useState<Record<number, { passes: boolean } | { error: string }>>({})

  const verify = useMutation({
    mutationFn: ({ rule }: { index: number; rule: ConditionRow }) =>
      apiFetch<{ passes: boolean }>(`/watches/${watch.uuid}/conditions/verify`, {
        method: 'POST',
        body: { rule },
      }),
    onSuccess: (data, variables) => {
      setVerified((current) => ({ ...current, [variables.index]: { passes: data.passes } }))
    },
    onError: (error, variables) => {
      setVerified((current) => ({
        ...current,
        [variables.index]: { error: error instanceof Error ? error.message : 'Could not verify' },
      }))
      toast(error instanceof Error ? error.message : t('Could not verify this rule'), { tone: 'error' })
    },
  })

  function updateRow(index: number, row: Partial<ConditionRow>) {
    const next = state.conditions.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...row } : item,
    )
    patch({ conditions: next })
  }

  return (
    <Section
      title={t('Conditions')}
      description={t('Add rules that must match before a change is reported.')}
    >
      <Field label={t('Match')} htmlFor="conditions-logic">
        <Select
          id="conditions-logic"
          value={state.conditions_match_logic}
          onChange={(event) => patch({ conditions_match_logic: event.target.value as 'ALL' | 'ANY' })}
        >
          <option value="ALL">{t('All of the following')}</option>
          <option value="ANY">{t('Any of the following')}</option>
        </Select>
      </Field>

      <div className="space-y-2">
        {state.conditions.map((row, index) => {
          const result = verified[index]
          return (
            <div key={index} className="rounded-input border border-border p-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Select value={row.field} onChange={(event) => updateRow(index, { field: event.target.value })} aria-label={t('Field')}>
                  <option value="">{t('Choose field')}</option>
                  {(options.data?.fields || []).map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </Select>
                <Select value={row.operator} onChange={(event) => updateRow(index, { operator: event.target.value })} aria-label={t('Operator')}>
                  <option value="">{t('Choose operator')}</option>
                  {(options.data?.operators || []).map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </Select>
                <Input value={row.value} onChange={(event) => updateRow(index, { value: event.target.value })} placeholder={t('Value')} aria-label={t('Value')} />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => verify.mutate({ index, rule: row })}
                    disabled={!row.field || !row.operator || !row.value}
                    loading={verify.isPending && verify.variables?.index === index}
                  >
                    {t('Verify')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => patch({ conditions: state.conditions.filter((_, itemIndex) => itemIndex !== index) })}
                    aria-label={t('Remove rule')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {result ? (
                'passes' in result ? (
                  <Badge tone={result.passes ? 'success' : 'danger'} className="mt-2">
                    {result.passes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {result.passes ? t('Rule passes on the latest snapshot') : t('Rule does not pass')}
                  </Badge>
                ) : (
                  <p className="mt-2 text-xs text-danger">{result.error}</p>
                )
              ) : null}
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => patch({ conditions: [...state.conditions, { field: '', operator: '', value: '' }] })}
      >
        <Plus className="h-4 w-4" /> {t('Add rule')}
      </Button>

      <p className="text-xs text-muted">
        {t('Verification uses the latest snapshot and the filters saved on this watch.')}
      </p>
    </Section>
  )
}

export function NotificationsSection({ state, patch, settings, watch }: SectionProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const formats = settings?.notifications.formats || []
  const test = useMutation({
    mutationFn: () =>
      apiFetch<{ sent: boolean; count: number }>('/notifications/test', {
        method: 'POST',
        body: {
          urls: splitLines(state.notification_urls),
          title: state.notification_title || undefined,
          body: state.notification_body || undefined,
        },
      }),
    onSuccess: (data) =>
      toast(data.sent ? t('Test notification sent') : t('The notification service did not accept the message'), {
        tone: data.sent ? 'success' : 'warning',
      }),
    onError: (error) => toast(error instanceof Error ? error.message : t('Test notification failed'), { tone: 'error' }),
  })

  return (
    <Section title={t('Notifications')} description={t('Override the global notification settings for this watch.')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Notifications')} htmlFor="notify-muted">
          <Select
            id="notify-muted"
            value={state.notification_muted}
            onChange={(event) => patch({ notification_muted: event.target.value as NotificationChoice })}
          >
            <option value="system">{t('Use system setting')}</option>
            <option value="on">{t('On')}</option>
            <option value="muted">{t('Muted')}</option>
          </Select>
        </Field>
        <Field label={t('Format')} htmlFor="notify-format">
          <Select
            id="notify-format"
            value={state.notification_format}
            onChange={(event) => patch({ notification_format: event.target.value })}
          >
            <option value="System default">{t('System default')}</option>
            {formats
              .filter((format) => format.value !== 'System default')
              .map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <Checkbox
        label={t('Attach a screenshot')}
        description={watch.fetcher_supports_screenshots ? t('Where the notification service supports it.') : t('This fetcher does not capture screenshots.')}
        checked={state.notification_screenshot}
        disabled={!watch.fetcher_supports_screenshots}
        onChange={(event) => patch({ notification_screenshot: event.target.checked })}
      />
      <Checkbox
        label={t('Notify when the filter can no longer be found')}
        checked={state.filter_failure_notification_send}
        onChange={(event) => patch({ filter_failure_notification_send: event.target.checked })}
      />

      <Field
        label={t('Notification URLs')}
        htmlFor="notify-urls"
        help={t('One Apprise URL per line. Leave empty to use the global list.')}
      >
        <Textarea
          id="notify-urls"
          value={state.notification_urls}
          onChange={(event) => patch({ notification_urls: event.target.value })}
          rows={5}
          placeholder={'discord://…\ntgram://…'}
          className="font-mono"
        />
      </Field>

      <Field label={t('Notification title')} htmlFor="notify-title">
        <Input id="notify-title" value={state.notification_title} onChange={(event) => patch({ notification_title: event.target.value })} />
      </Field>
      <Field label={t('Notification body')} htmlFor="notify-body" help={t('Jinja2 tokens like {{ diff }} and {{ watch_url }} are replaced at send time.')}>
        <Textarea id="notify-body" value={state.notification_body} onChange={(event) => patch({ notification_body: event.target.value })} rows={5} className="font-mono" />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => test.mutate()} loading={test.isPending}>
          <FlaskConical className="h-4 w-4" /> {t('Send test notification')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            patch({
              notification_muted: 'system',
              notification_screenshot: false,
              filter_failure_notification_send: false,
              notification_urls: '',
              notification_title: '',
              notification_body: '',
              notification_format: 'System default',
            })
          }
        >
          {t('Reset to system defaults')}
        </Button>
        <LegacyLink href={`/edit/${watch.uuid}#notifications`} compact>
          {t('Open notification builder')}
        </LegacyLink>
      </div>

      <details className="rounded-input border border-border p-2 text-sm">
        <summary className="flex cursor-pointer items-center gap-1.5 font-medium">
          <CircleHelp className="h-4 w-4" /> {t('Available tokens')}
        </summary>
        <div className="mt-2 grid gap-1 font-mono text-xs text-muted sm:grid-cols-2">
          {['{{ watch_url }}', '{{ watch_title }}', '{{ diff }}', '{{ preview_url }}', '{{ current_snapshot }}', '{{ base_url }}', '{{ timestamp }}', '{{ restock.price }}'].map((token) => (
            <code key={token} className="rounded bg-surface-2 px-1.5 py-1">{token}</code>
          ))}
        </div>
      </details>
    </Section>
  )
}

export function AiSection({ state, patch, watch }: SectionProps) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const disabled = bootstrap.features?.llmFeaturesDisabled

  if (disabled) {
    return (
      <Section title={t('AI / LLM')}>
        <EmptyState
          icon={AlertCircle}
          title={t('AI features are disabled on this instance')}
          description={t('LLM_FEATURES_DISABLED is set. Remove it and restart to use AI in Pulse.')}
        />
      </Section>
    )
  }

  return (
    <div className="space-y-4">
      <Section title={t('AI / LLM')} description={t('Use an LLM to decide whether a change matters and to summarise it.')}>
        <Switch
          checked={state.llm_backend_profile}
          onCheckedChange={(checked) => patch({ llm_backend_profile: checked })}
          label={t('AI enabled for this watch')}
          description={t('The global provider and model are configured in Settings → AI.')}
        />

        {watch.llm_effective?.groups.length ? (
          <div className="rounded-input border border-info/20 bg-info/5 p-3 text-sm">
            <p className="font-medium text-info">{t('Inherited from groups')}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {watch.llm_effective.groups.map((group) => (
                <li key={group.uuid}>
                  <strong className="text-fg">{group.title}</strong>:{' '}
                  {group.decision === true ? t('AI on, settings inherited') : group.decision === false ? t('AI off') : t('No AI decision')}
                  {group.llm_intent ? ` · ${group.llm_intent}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Field label={t('Change intent')} htmlFor="ai-intent" help={t('Tell the AI what you care about, for example “only notify me about price drops”.')}>
          <Textarea id="ai-intent" value={state.llm_intent} onChange={(event) => patch({ llm_intent: event.target.value })} rows={4} />
        </Field>

        <Field label={t('Change summary prompt')} htmlFor="ai-summary" help={t('Optional. Leave empty to use the global prompt.')}>
          <Textarea id="ai-summary" value={state.llm_change_summary} onChange={(event) => patch({ llm_change_summary: event.target.value })} rows={5} />
        </Field>

        <Field label={t('Prompt mode')} htmlFor="ai-mode">
          <Select id="ai-mode" value={state.llm_change_summary_mode} onChange={(event) => patch({ llm_change_summary_mode: event.target.value })}>
            <option value="replace">{t('Replace the inherited prompt')}</option>
            <option value="append">{t('Append to the inherited prompt')}</option>
          </Select>
        </Field>

        {watch.llm_effective?.summary_prompt ? (
          <details className="rounded-input border border-border p-2 text-sm">
            <summary className="cursor-pointer font-medium">{t('Effective summary prompt')}</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted">{watch.llm_effective.summary_prompt}</pre>
          </details>
        ) : null}
      </Section>
    </div>
  )
}

export function RestockSection({ state, patch, groups, watch }: SectionProps) {
  const { t } = useI18n()
  const groupOverride = groups.some(
    (group) => group.overrides_watch && state.tags.some((tag) => tag.toLowerCase() === group.title.toLowerCase()),
  )

  return (
    <Section
      title={t('Restock & Price')}
      description={t('Settings for the Restock & Price processor. They apply when the processor is selected.')}
    >
      {state.processor !== 'restock_diff' ? (
        <div className="rounded-input border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
          {t('This watch uses a different processor. Switch to Restock & Price in General to use these settings.')}
        </div>
      ) : null}
      {groupOverride ? (
        <div className="rounded-input border border-info/20 bg-info/5 p-3 text-sm text-info">
          {t('A group on this watch overrides its restock and price settings.')}
        </div>
      ) : null}

      <Field label={t('Restock detection')} htmlFor="restock-mode">
        <Select
          id="restock-mode"
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
        <Field label={t('Notify below price')} htmlFor="restock-min">
          <Input
            id="restock-min"
            type="number"
            step="0.01"
            value={state.restock.price_change_min}
            onChange={(event) => patch({ restock: { ...state.restock, price_change_min: event.target.value } })}
            placeholder={t('No limit')}
          />
        </Field>
        <Field label={t('Notify above price')} htmlFor="restock-max">
          <Input
            id="restock-max"
            type="number"
            step="0.01"
            value={state.restock.price_change_max}
            onChange={(event) => patch({ restock: { ...state.restock, price_change_max: event.target.value } })}
            placeholder={t('No limit')}
          />
        </Field>
        <Field label={t('Change threshold (%)')} htmlFor="restock-threshold">
          <Input
            id="restock-threshold"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={state.restock.price_change_threshold_percent}
            onChange={(event) => patch({ restock: { ...state.restock, price_change_threshold_percent: event.target.value } })}
            placeholder="0"
          />
        </Field>
      </div>

      {watch.processor_state_restock_diff ? (
        <div className="rounded-input bg-surface-2 p-3 text-xs text-muted">
          <strong className="text-fg">{t('Latest processor state')}:</strong>{' '}
          {JSON.stringify(watch.processor_state_restock_diff)}
        </div>
      ) : null}
    </Section>
  )
}

export function StatsSection({ watch, settings }: SectionProps) {
  const { t, locale } = useI18n()
  const { bootstrap } = useAuth()
  const raw = watch as Record<string, unknown>
  const rows: { label: string; value: ReactNode }[] = [
    { label: t('Checks completed'), value: String(raw.check_count ?? 0) },
    { label: t('Consecutive filter failures'), value: String(raw.consecutive_filter_failures ?? 0) },
    { label: t('Snapshots'), value: String(watch.history_n) },
    { label: t('Last fetch duration'), value: watch.fetch_time ? `${watch.fetch_time}s` : '—' },
    { label: t('Notification alerts'), value: String(raw.notification_alert_count ?? 0) },
    { label: t('Remote reply'), value: String(raw.remote_server_reply ?? '—') },
    { label: t('AI tokens (last check)'), value: String(raw.llm_tokens_last_check ?? 0) },
    { label: t('AI tokens (total)'), value: String(raw.llm_tokens_total ?? 0) },
  ]

  return (
    <div className="space-y-4">
      <Section title={t('Stats')} description={t('Read-only information from the last checks.')}>
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 rounded-input bg-surface-2 px-3 py-2 text-sm">
              <dt className="text-muted">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t('Capabilities')}>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={watch.fetcher_supports_screenshots ? 'success' : 'neutral'}>
            {t('Screenshots')}: {watch.fetcher_supports_screenshots ? t('yes') : t('no')}
          </Badge>
          <Badge tone={watch.has_browser_steps ? 'success' : 'neutral'}>
            {t('Browser Steps')}: {watch.has_browser_steps ? t('configured') : t('no')}
          </Badge>
          <Badge tone="neutral">{t('Processor')}: {watch.processor}</Badge>
          <Badge tone="neutral">{t('Fetcher')}: {watch.fetch_backend_resolved}</Badge>
        </div>
      </Section>

      <Section title={t('Downloads')} description={t('Debug data for this watch.')}>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/v2/watches/${watch.uuid}/download-html`}
            className="inline-flex min-h-11 items-center rounded-input border border-border-strong px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t('Download latest HTML')}
          </a>
          <a
            href={`/api/v2/watches/${watch.uuid}/data-package`}
            className="inline-flex min-h-11 items-center rounded-input border border-border-strong px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t('Download watch data package')}
          </a>
          <a
            href={`/api/v2/watches/${watch.uuid}/history`}
            className="inline-flex min-h-11 items-center rounded-input border border-border-strong px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t('History index (JSON)')}
          </a>
          {settings?.rss.rss_access_token ? (
            <a
              href={`${bootstrap.basePath || ''}/rss/watch/${watch.uuid}?token=${encodeURIComponent(settings.rss.rss_access_token)}`}
              className="inline-flex min-h-11 items-center rounded-input border border-border-strong px-3 text-sm font-medium hover:bg-surface-2"
            >
              {t('RSS feed')}
            </a>
          ) : null}
        </div>
        {settings ? (
          <p className="text-xs text-muted">
            {t('Server time')}: {new Intl.DateTimeFormat(locale.replace('_', '-'), { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(settings.info.server_time * 1000))}
          </p>
        ) : null}
      </Section>
    </div>
  )
}
