import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemePreference } from './types'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (value: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'pulse.theme'

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(preference: ThemePreference) {
  const resolved = resolve(preference)
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themePreference = preference
  document.documentElement.style.colorScheme = resolved
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = ((): ThemePreference => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system'
    } catch {
      return 'system'
    }
  })()
  const [preference, setPreferenceState] = useState<ThemePreference>(initial)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolve(initial))

  useEffect(() => {
    setResolved(apply(preference))
  }, [preference])

  useEffect(() => {
    if (preference !== 'system' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => setResolved(apply('system'))
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [preference])

  const setPreference = useCallback((value: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Private mode / storage disabled: keep the in-memory preference.
    }
    setPreferenceState(value)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
