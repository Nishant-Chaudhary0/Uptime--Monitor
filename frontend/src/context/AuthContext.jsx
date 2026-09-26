import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pulseboard_user')
    return raw ? JSON.parse(raw) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('pulseboard_token'))
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function verify() {
      if (!token) {
        setChecking(false)
        return
      }
      try {
        const res = await authApi.me()
        if (!cancelled) setUser(res.user)
      } catch {
        if (!cancelled) {
          setToken(null)
          setUser(null)
          localStorage.removeItem('pulseboard_token')
          localStorage.removeItem('pulseboard_user')
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    verify()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (tok, usr) => {
    localStorage.setItem('pulseboard_token', tok)
    localStorage.setItem('pulseboard_user', JSON.stringify(usr))
    setToken(tok)
    setUser(usr)
  }

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    persist(res.token, res.user)
    return res
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await authApi.register({ name, email, password })
    persist(res.token, res.user)
    return res
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('pulseboard_token')
    localStorage.removeItem('pulseboard_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, checking, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
