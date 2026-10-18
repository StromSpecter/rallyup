import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import * as authApi from '../shared/api/auth'
import { refreshAccessToken, setAccessToken, setAuthLostHandler } from '../shared/api/client'
import type { User } from '../shared/types/api'

type AuthContextValue = {
  user: User | undefined
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (input: { name: string; avatarColor: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const authEpoch = useRef(0)

  const applySession = useCallback((nextUser: User, accessToken: string) => {
    authEpoch.current += 1
    setAccessToken(accessToken)
    setUser(nextUser)
    setLoading(false)
  }, [])

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(undefined)
    setLoading(false)
  }, [])

  useEffect(() => {
    setAuthLostHandler(clearSession)
    return () => setAuthLostHandler(null)
  }, [clearSession])

  useEffect(() => {
    let cancelled = false
    const epoch = authEpoch.current
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled && authEpoch.current === epoch) setUser(me)
      })
      .catch(() => {
        if (!cancelled && authEpoch.current === epoch) setUser(undefined)
      })
      .finally(() => {
        if (!cancelled && authEpoch.current === epoch) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      void refreshAccessToken()
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        const session = await authApi.login(email, password)
        applySession(session.user, session.accessToken)
      },
      signUp: async (name, email, password) => {
        const session = await authApi.register(name, email, password)
        applySession(session.user, session.accessToken)
      },
      signOut: async () => {
        authEpoch.current += 1
        try {
          await authApi.logout()
        } finally {
          clearSession()
        }
      },
      updateProfile: async (input) => {
        const updated = await authApi.updateMe(input)
        setUser(updated)
      },
    }),
    [applySession, clearSession, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth dipakai di luar AuthProvider')
  }
  return context
}
