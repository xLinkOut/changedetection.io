import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from './api'
import type { Language } from './types'

interface Catalog {
  locale: string
  messages: Record<string, string>
  plurals: Record<string, string[]>
}

interface I18nContextValue {
  locale: string
  languages: Language[]
  ready: boolean
  setLocale: (locale: string) => Promise<void>
  t: (message: string) => string
  tn: (singular: string, plural: string, count: number) => string
  tf: (message: string, values: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const EMPTY: Catalog = { locale: 'en_GB', messages: {}, plurals: {} }

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  )
}

export function I18nProvider({
  locale,
  languages,
  children,
  onLocaleChange,
}: {
  locale: string
  languages: Language[]
  children: ReactNode
  onLocaleChange?: (locale: string) => void
}) {
  const [catalog, setCatalog] = useState<Catalog>(EMPTY)
  const [ready, setReady] = useState(locale.startsWith('en'))

  useEffect(() => {
    let cancelled = false
    if (locale.startsWith('en')) {
      setCatalog(EMPTY)
      setReady(true)
      return
    }
    setReady(false)
    apiFetch<Catalog>(`/i18n/${encodeURIComponent(locale)}`)
      .then((value) => {
        if (!cancelled) {
          setCatalog(value)
          setReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog(EMPTY)
          setReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const setLocale = useCallback(
    async (next: string) => {
      await apiFetch('/locale', { method: 'POST', body: { locale: next } })
      onLocaleChange?.(next)
    },
    [onLocaleChange],
  )

  const t = useCallback(
    (message: string) => catalog.messages[message] || message,
    [catalog],
  )

  const tf = useCallback(
    (message: string, values: Record<string, string | number>) =>
      interpolate(catalog.messages[message] || message, values),
    [catalog],
  )

  const tn = useCallback(
    (singular: string, plural: string, count: number) => {
      const forms = catalog.plurals[singular]
      if (forms && forms.length) {
        let index = 0
        try {
          const rule = new Intl.PluralRules(locale.replace('_', '-')).select(count)
          if (forms.length === 1) index = 0
          else if (rule === 'one') index = 0
          else if (forms.length >= 3 && rule === 'few') index = 1
          else index = forms.length - 1
        } catch {
          index = count === 1 ? 0 : forms.length - 1
        }
        return interpolate(forms[index] || forms[0], { count })
      }
      return interpolate(count === 1 ? singular : plural, { count })
    },
    [catalog, locale],
  )

  const value = useMemo(
    () => ({ locale, languages, ready, setLocale, t, tn, tf }),
    [locale, languages, ready, setLocale, t, tn, tf],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
