export type ThemePreference = 'light' | 'dark' | 'system'

export interface Language {
  code: string
  name: string
}

export interface Bootstrap {
  app: string
  version: string
  basePath: string
  appBase: string
  apiBase: string
  authenticated: boolean
  passwordEnabled: boolean
  csrfToken: string
  locale: string
  languages: Language[]
  serverTime: number
  features?: {
    llm: boolean
    llmFeaturesDisabled: boolean
    screenshots: boolean
    restock: boolean
    shareWatch: boolean
    favicons: boolean
    realtime: boolean
    sharedDiffAccess: boolean
    apiKeyEnabled: boolean
    passwordLocked: boolean
    legacyBrowserSteps: boolean
    legacyVisualSelector: boolean
  }
  settings?: {
    pagerSize: number
    timeagoFormat: 'long' | 'short'
    usePageTitleInList: boolean
    faviconsEnabled: boolean
    openDiffInNewTab: boolean
    sidebarMode: string
    allPaused: boolean
    allMuted: boolean
  }
  stats?: Stats
  processors?: Option[]
  fetchers?: Option[]
}

export interface Option {
  value: string
  label: string
  badge?: string
}

export interface Stats {
  watch_count: number
  unread_changes_count: number
  error_count: number
  queue_size: number
  checking_now: number
}

export interface Tag {
  uuid: string
  title: string
  colour: string
}

export interface RestockInfo {
  in_stock: boolean | null
  price: number | string | null
  last_price: number | string | null
  currency: string
  price_change_percent: number | null
}

export interface Watch {
  uuid: string
  url: string
  title: string
  page_title: string
  link: string
  tags: Tag[]
  paused: boolean
  notification_muted: boolean
  last_checked: number
  last_changed: number
  last_error: boolean
  error_text: string
  last_notification_error: string
  history_n: number
  viewed: boolean
  has_unviewed: boolean
  fetch_time: number | null
  checking_now: boolean
  queued: boolean
  check_status: string
  processor: string
  processor_badge: string
  has_restock_info: boolean
  restock: RestockInfo | null
  has_favicon: boolean
  has_browser_steps: boolean
  is_pdf: boolean
  date_created: number
}

export interface WatchFull extends Watch {
  [key: string]: unknown
  tag_uuids: string[]
  has_screenshot: boolean
  fetch_backend_resolved: string
  fetcher_supports_screenshots: boolean
  llm_effective?: {
    enabled: boolean
    source: string
    summary_prompt: string
    groups: {
      uuid: string
      title: string
      decision: boolean | null
      llm_intent: string
      llm_change_summary: string
    }[]
  } | null
}

export interface WatchListResponse {
  items: Watch[]
  total: number
  page: number
  per_page: number
  total_pages: number
  facets: {
    status: {
      all: number
      unread: number
      deals: number
      errors: number
      healthy: number
    }
    processors: Record<string, number>
  }
  stats: Stats
}

export interface Group {
  uuid: string
  title: string
  colour: string
  tag_colour: string
  url_match_pattern: string
  notification_muted: boolean
  overrides_watch: boolean
  watch_count: number
  processor?: string
  notification_urls?: string[]
  notification_title?: string | null
  notification_body?: string | null
  notification_format?: string | null
  llm_backend_profile?: boolean | null
  llm_intent?: string
  llm_change_summary?: string
  llm_change_summary_mode?: string
  processor_config_restock_diff?: Record<string, unknown>
  matching_watches?: {
    uuid: string
    title: string
    url: string
    paused: boolean
  }[]
  [key: string]: unknown
}

export interface HistoryVersion {
  timestamp: string
  iso: string
  size: number | null
  is_latest: boolean
}

export interface HistoryResponse {
  uuid: string
  versions: HistoryVersion[]
  history_n: number
  last_changed: number
  viewed: boolean
  from_version_suggested: string | null
}

export interface PreviewResponse {
  uuid: string
  version: string | null
  versions: string[]
  content: string
  triggered_lines: number[]
  ignored_lines: number[]
  blocked_lines: number[]
  error_text: string
  has_error_screenshot: boolean
  has_screenshot: boolean
  capabilities: Record<string, unknown>
}

export interface QueueSnapshot {
  worker_count: number
  running_count: number
  queued_count: number
  summary: {
    immediate: number
    clone: number
    scheduled: number
    priority_breakdown: Record<string, number>
  }
  running: QueueItem[]
  queued: QueueItem[]
  page: number
  per_page: number
  total_pages: number
}

export interface QueueItem {
  uuid: string
  title: string | null
  url: string | null
  position?: number
  priority?: number
  priority_label?: string
  started_at?: number | null
  running_seconds?: number | null
  enqueued_at?: number | null
  paused?: boolean
  last_checked?: number
  last_error?: string | null
  gone?: boolean
}

export interface Settings {
  general: {
    time_between_check: Record<string, number | null>
    time_schedule_limit: Record<string, unknown>
    history_snapshot_max_length: number | null
    filter_failure_notification_threshold_attempts: number
    password_set: boolean
    password_locked: boolean
    shared_diff_access: boolean
    empty_pages_are_a_change: boolean
    default_proxy: string | null
    scheduler_timezone_default: string | null
    all_paused: boolean
    all_muted: boolean
  }
  fetching: {
    fetch_backend: string
    webdriver_delay: number | null
    workers: number
    jitter_seconds: number
    timeout: number
    default_ua: Record<string, string | null>
    min_recheck_seconds: number
  }
  filters: {
    ignore_whitespace: boolean
    render_anchor_tag_content: boolean
    global_subtractive_selectors: string[]
    global_ignore_text: string[]
    strip_ignored_lines: boolean
  }
  ui: {
    open_diff_in_new_tab: boolean
    realtime_updates: boolean
    favicons_enabled: boolean
    use_page_title_in_list: boolean
    use_share_watch: boolean
    pager_size: number
    timeago_format: 'long' | 'short'
    sidebar_mode: string
    sidebar_modes: Option[]
  }
  api: {
    api_access_token_enabled: boolean
    api_key: string
  }
  notifications: {
    notification_urls: string[]
    notification_title: string | null
    notification_body: string | null
    notification_format: string
    base_url: string | null
    formats: Option[]
  }
  llm: Record<string, unknown> & { api_key_set: boolean; api_key: string }
  rss: {
    rss_hide_muted_watches: boolean
    rss_diff_length: number
    rss_reader_mode: boolean
    rss_content_format: string
    rss_template_type: string
    rss_template_override: string | null
    rss_access_token: string | null
    content_formats: Option[]
    template_types: Option[]
  }
  proxies: {
    extra_proxies: { proxy_name?: string; proxy_url?: string }[]
    extra_browsers: { browser_name?: string; browser_connection_url?: string }[]
    proxy_list: string[]
  }
  info: {
    version: string
    uptime_seconds: number
    python_version: string
    watch_limit: number | null
    watch_count: number
    active_plugins: string[]
    server_time: number
    available_timezones: string[]
  }
}
