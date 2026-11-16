import type { WatchFull } from '@/lib/types'

export type TernaryChoice = 'system' | 'yes' | 'no'
export type NotificationChoice = 'system' | 'on' | 'muted'

export interface ScheduleDay {
  enabled: boolean
  start_time: string
  hours: string
  minutes: string
}

export type ScheduleState = {
  enabled: boolean
  timezone: string
  monday: ScheduleDay
  tuesday: ScheduleDay
  wednesday: ScheduleDay
  thursday: ScheduleDay
  friday: ScheduleDay
  saturday: ScheduleDay
  sunday: ScheduleDay
}

export interface ConditionRow {
  field: string
  operator: string
  value: string
}

export interface RestockState {
  in_stock_processing: string
  follow_price_changes: boolean
  price_change_min: string
  price_change_max: string
  price_change_threshold_percent: string
}

export interface WatchFormState {
  url: string
  title: string
  tags: string[]
  processor: string
  link_to_open: string
  use_page_title_in_list: TernaryChoice
  time_between_check_use_default: boolean
  time_between_check: {
    weeks: string
    days: string
    hours: string
    minutes: string
    seconds: string
  }
  time_schedule_limit: ScheduleState
  history_snapshot_max_length: string
  fetch_backend: string
  proxy: string
  webdriver_delay: string
  webdriver_js_execute_code: string
  method: string
  body: string
  headers: string
  ignore_status_codes: boolean
  include_filters: string
  subtractive_selectors: string
  trigger_text: string
  ignore_text: string
  text_should_not_be_present: string
  extract_text: string
  extract_lines_containing: string
  check_unique_lines: boolean
  remove_duplicate_lines: boolean
  sort_text_alphabetically: boolean
  trim_text_whitespace: boolean
  strip_ignored_lines: TernaryChoice
  filter_text_added: boolean
  filter_text_replaced: boolean
  filter_text_removed: boolean
  conditions_match_logic: 'ALL' | 'ANY'
  conditions: ConditionRow[]
  notification_muted: NotificationChoice
  notification_screenshot: boolean
  filter_failure_notification_send: boolean
  notification_urls: string
  notification_title: string
  notification_body: string
  notification_format: string
  llm_backend_profile: boolean
  llm_intent: string
  llm_change_summary: string
  llm_change_summary_mode: string
  restock: RestockState
}

export const DEFAULT_SCHEDULE_DAY: ScheduleDay = {
  enabled: true,
  start_time: '00:00',
  hours: '24',
  minutes: '0',
}

const days = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function listText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map((item) => String(item)).join('\n')
}

function numberText(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function ternary(value: unknown): TernaryChoice {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'system'
}

function notificationChoice(value: unknown): NotificationChoice {
  if (value === true) return 'muted'
  if (value === false) return 'on'
  return 'system'
}

export function normaliseSchedule(raw: unknown): ScheduleState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const schedule: ScheduleState = {
    enabled: Boolean(value.enabled),
    timezone: text(value.timezone),
    monday: { ...DEFAULT_SCHEDULE_DAY },
    tuesday: { ...DEFAULT_SCHEDULE_DAY },
    wednesday: { ...DEFAULT_SCHEDULE_DAY },
    thursday: { ...DEFAULT_SCHEDULE_DAY },
    friday: { ...DEFAULT_SCHEDULE_DAY },
    saturday: { ...DEFAULT_SCHEDULE_DAY },
    sunday: { ...DEFAULT_SCHEDULE_DAY },
  }
  for (const day of days) {
    const rawDay = (value[day] && typeof value[day] === 'object' ? value[day] : {}) as Record<string, unknown>
    const duration = (rawDay.duration && typeof rawDay.duration === 'object'
      ? rawDay.duration
      : {}) as Record<string, unknown>
    schedule[day] = {
      enabled: rawDay.enabled === undefined ? true : Boolean(rawDay.enabled),
      start_time: text(rawDay.start_time) || '00:00',
      hours: numberText(duration.hours) || '24',
      minutes: numberText(duration.minutes) || '0',
    }
  }
  return schedule
}

function normaliseRestock(raw: unknown): RestockState {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    in_stock_processing: text(value.in_stock_processing) || 'in_stock_only',
    follow_price_changes: value.follow_price_changes === undefined ? true : Boolean(value.follow_price_changes),
    price_change_min: numberText(value.price_change_min),
    price_change_max: numberText(value.price_change_max),
    price_change_threshold_percent: numberText(value.price_change_threshold_percent),
  }
}

export function scheduleToBackend(value: ScheduleState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    enabled: value.enabled,
  }
  if (value.timezone.trim()) {
    payload.timezone = value.timezone.trim()
  }
  for (const day of days) {
    payload[day] = {
      enabled: value[day].enabled,
      start_time: value[day].start_time || '00:00',
      duration: {
        hours: value[day].hours || '0',
        minutes: value[day].minutes || '0',
      },
    }
  }
  return payload
}

export function fromWatch(watch: WatchFull): WatchFormState {
  const raw = watch as Record<string, unknown>
  const interval = (raw.time_between_check && typeof raw.time_between_check === 'object'
    ? raw.time_between_check
    : {}) as Record<string, unknown>
  const headers =
    raw.headers && typeof raw.headers === 'object' && !Array.isArray(raw.headers)
      ? Object.entries(raw.headers as Record<string, string>)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : ''

  return {
    url: watch.url || '',
    title: text(raw.title),
    tags: (watch.tags || []).map((tag) => tag.title),
    processor: watch.processor || 'text_json_diff',
    link_to_open: text(raw.link_to_open),
    use_page_title_in_list: ternary(raw.use_page_title_in_list),
    time_between_check_use_default: raw.time_between_check_use_default === undefined
      ? true
      : Boolean(raw.time_between_check_use_default),
    time_between_check: {
      weeks: numberText(interval.weeks),
      days: numberText(interval.days),
      hours: numberText(interval.hours),
      minutes: numberText(interval.minutes),
      seconds: numberText(interval.seconds),
    },
    time_schedule_limit: normaliseSchedule(raw.time_schedule_limit),
    history_snapshot_max_length: numberText(raw.history_snapshot_max_length),
    fetch_backend: text(raw.fetch_backend) || 'system',
    proxy: text(raw.proxy),
    webdriver_delay: numberText(raw.webdriver_delay),
    webdriver_js_execute_code: text(raw.webdriver_js_execute_code),
    method: text(raw.method) || 'GET',
    body: text(raw.body),
    headers,
    ignore_status_codes: Boolean(raw.ignore_status_codes),
    include_filters: listText(raw.include_filters),
    subtractive_selectors: listText(raw.subtractive_selectors),
    trigger_text: listText(raw.trigger_text),
    ignore_text: listText(raw.ignore_text),
    text_should_not_be_present: listText(raw.text_should_not_be_present),
    extract_text: listText(raw.extract_text),
    extract_lines_containing: listText(raw.extract_lines_containing),
    check_unique_lines: Boolean(raw.check_unique_lines),
    remove_duplicate_lines: Boolean(raw.remove_duplicate_lines),
    sort_text_alphabetically: Boolean(raw.sort_text_alphabetically),
    trim_text_whitespace: Boolean(raw.trim_text_whitespace),
    strip_ignored_lines: ternary(raw.strip_ignored_lines),
    filter_text_added: raw.filter_text_added === undefined ? true : Boolean(raw.filter_text_added),
    filter_text_replaced: raw.filter_text_replaced === undefined ? true : Boolean(raw.filter_text_replaced),
    filter_text_removed: raw.filter_text_removed === undefined ? true : Boolean(raw.filter_text_removed),
    conditions_match_logic: raw.conditions_match_logic === 'ANY' ? 'ANY' : 'ALL',
    conditions: Array.isArray(raw.conditions)
      ? (raw.conditions as Record<string, unknown>[]).map((row) => ({
          field: text(row.field),
          operator: text(row.operator),
          value: text(row.value),
        }))
      : [],
    notification_muted: notificationChoice(raw.notification_muted),
    notification_screenshot: Boolean(raw.notification_screenshot),
    filter_failure_notification_send: Boolean(raw.filter_failure_notification_send),
    notification_urls: listText(raw.notification_urls),
    notification_title: text(raw.notification_title),
    notification_body: text(raw.notification_body),
    notification_format: text(raw.notification_format) || 'System default',
    llm_backend_profile: raw.llm_backend_profile === undefined ? true : Boolean(raw.llm_backend_profile),
    llm_intent: text(raw.llm_intent),
    llm_change_summary: text(raw.llm_change_summary),
    llm_change_summary_mode: text(raw.llm_change_summary_mode) || 'replace',
    restock: normaliseRestock(raw.processor_config_restock_diff || raw.processor_state_restock_diff),
  }
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function intOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

function floatOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

function parseHeaders(value: string): { headers: Record<string, string>; error?: string } {
  const headers: Record<string, string> = {}
  for (const line of value.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const index = trimmed.indexOf(':')
    if (index < 1) {
      return { headers, error: `Invalid header line: ${trimmed}` }
    }
    headers[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return { headers }
}

export function toPayload(state: WatchFormState): {
  payload: Record<string, unknown>
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  if (!state.url.trim()) errors.url = 'A URL is required'

  const { headers, error: headerError } = parseHeaders(state.headers)
  if (headerError) errors.headers = headerError
  if (state.method === 'GET' && state.body.trim()) {
    errors.body = 'Body must be empty when the request method is GET'
  }
  if (
    state.restock.price_change_threshold_percent &&
    (Number(state.restock.price_change_threshold_percent) < 0 ||
      Number(state.restock.price_change_threshold_percent) > 100)
  ) {
    errors.restock_price_threshold = 'Must be between 0 and 100'
  }

  const schedule = scheduleToBackend(state.time_schedule_limit)

  const payload: Record<string, unknown> = {
    url: state.url.trim(),
    title: state.title.trim(),
    tags: state.tags,
    processor: state.processor,
    link_to_open: state.link_to_open.trim(),
    use_page_title_in_list:
      state.use_page_title_in_list === 'yes' ? true : state.use_page_title_in_list === 'no' ? false : null,
    time_between_check_use_default: state.time_between_check_use_default,
    time_between_check: {
      weeks: intOrNull(state.time_between_check.weeks),
      days: intOrNull(state.time_between_check.days),
      hours: intOrNull(state.time_between_check.hours),
      minutes: intOrNull(state.time_between_check.minutes),
      seconds: intOrNull(state.time_between_check.seconds),
    },
    time_schedule_limit: schedule,
    history_snapshot_max_length: intOrNull(state.history_snapshot_max_length),
    fetch_backend: state.fetch_backend,
    proxy: state.proxy || null,
    webdriver_delay: intOrNull(state.webdriver_delay),
    webdriver_js_execute_code: state.webdriver_js_execute_code,
    method: state.method,
    body: state.body,
    headers,
    ignore_status_codes: state.ignore_status_codes,
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
    conditions_match_logic: state.conditions_match_logic,
    conditions: state.conditions.filter(
      (row) => row.field && row.operator && row.value.trim(),
    ),
    notification_muted:
      state.notification_muted === 'muted' ? true : state.notification_muted === 'on' ? false : null,
    notification_screenshot: state.notification_screenshot,
    filter_failure_notification_send: state.filter_failure_notification_send,
    notification_urls: splitLines(state.notification_urls),
    notification_title: state.notification_title,
    notification_body: state.notification_body,
    notification_format: state.notification_format,
    llm_backend_profile: state.llm_backend_profile,
    llm_intent: state.llm_intent,
    llm_change_summary: state.llm_change_summary,
    llm_change_summary_mode: state.llm_change_summary_mode,
    processor_config_restock_diff: {
      in_stock_processing: state.restock.in_stock_processing,
      follow_price_changes: state.restock.follow_price_changes,
      price_change_min: floatOrNull(state.restock.price_change_min),
      price_change_max: floatOrNull(state.restock.price_change_max),
      price_change_threshold_percent: floatOrNull(state.restock.price_change_threshold_percent),
    },
  }

  return { payload, errors }
}
