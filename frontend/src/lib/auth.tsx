import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { login as loginRequest, logout as logoutRequest, fetchBootstrap } from './api'
import type { Bootstrap } from './types'

interface AuthContextValue {
  bootstrap: Bootstrap
  login: (password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ bootstrap, children }: { bootstrap: Bootstrap; children: ReactNode }) {
  const client = useQueryClient()

  const refresh = useCallback(async () => {
    const next = await fetchBootstrap()
    client.setQueryData(['bootstrap'], next)
  }, [client])

  const login = useCallback(
    async (password: string) => {
      const next = await loginRequest(password)
      client.setQueryData(['bootstrap'], next)
      await client.invalidateQueries()
    },
    [client],
  )

  const logout = useCallback(async () => {
    const next = await logoutRequest()
    client.setQueryData(['bootstrap'], next)
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'bootstrap' })
  }, [client])

  useEffect(() => {
    const handler = () => {
      refresh().catch(() => undefined)
    }
    window.addEventListener('pulse:auth-required', handler)
    return () => window.removeEventListener('pulse:auth-required', handler)
  }, [refresh])

  const value = useMemo(
    () => ({ bootstrap, login, logout, refresh }),
    [bootstrap, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
