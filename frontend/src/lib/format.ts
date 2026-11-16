export function toDate(timestamp: number | string | null | undefined): Date | null {
  if (timestamp === null || timestamp === undefined || timestamp === '' || timestamp === 0) {
    return null
  }
  const value = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp
  if (!Number.isFinite(value) || value <= 0) return null
  return new Date(value * 1000)
}

export function timeAgo(
  timestamp: number | string | null | undefined,
  locale: string,
  now: number = Date.now(),
): string {
  const date = toDate(timestamp)
  if (!date) return '—'
  const seconds = Math.round((date.getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  const formatter = new Intl.RelativeTimeFormat(locale.replace('_', '-'), { numeric: 'auto' })

  if (abs < 45) return formatter.format(seconds, 'second')
  if (abs < 60 * 45) return formatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 60 * 60 * 22) return formatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 60 * 60 * 24 * 26) return formatter.format(Math.round(seconds / 86400), 'day')
  if (abs < 60 * 60 * 24 * 320) return formatter.format(Math.round(seconds / (86400 * 30)), 'month')
  return formatter.format(Math.round(seconds / (86400 * 365)), 'year')
}

export function formatDateTime(timestamp: number | string | null | undefined, locale: string): string {
  const date = toDate(timestamp)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale.replace('_', '-'), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDate(timestamp: number | string | null | undefined, locale: string): string {
  const date = toDate(timestamp)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale.replace('_', '-'), { dateStyle: 'medium' }).format(date)
}

export function formatPrice(
  value: number | string | null | undefined,
  currency: string,
  locale: string,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) {
    return `${value}${currency ? ` ${currency}` : ''}`
  }
  const code = (currency || '').toUpperCase()
  try {
    if (code && code.length === 3) {
      return new Intl.NumberFormat(locale.replace('_', '-'), {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(number)
    }
  } catch {
    // Unknown currency code: fall through to a plain decimal + code.
  }
  const formatted = new Intl.NumberFormat(locale.replace('_', '-'), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
  return code ? `${formatted} ${code}` : formatted
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale.replace('_', '-')).format(value)
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '—'
  const total = Math.round(seconds)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (!parts.length) parts.push(`${total % 60}s`)
  return parts.join(' ')
}

export function safeHref(url: string | null | undefined): string {
  if (!url) return '#'
  try {
    const parsed = new URL(url, window.location.origin)
    if (['http:', 'https:', 'ftp:'].includes(parsed.protocol)) {
      return parsed.toString()
    }
  } catch {
    // Invalid URL: refuse to make it clickable.
  }
  return '#'
}

export function hostFromUrl(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
