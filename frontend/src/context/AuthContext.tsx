import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { login as loginApi } from '../api/accounts'
import { fetchProfile } from '../api/services'
import { clearToken, getToken, setToken } from '../api/client'
import type { LoginResponse, User } from '../types'

const USER_KEY = 'marketplace_user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function saveUser(user: User | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    if (getToken()) return loadUser()
    return null
  })

  useEffect(() => {
    const token = getToken()
    if (!token) return

    fetchProfile()
      .then((res) => {
        saveUser(res.user)
        setUserState(res.user)
      })
      .catch(() => {
        clearToken()
        saveUser(null)
        setUserState(null)
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password)
    setToken(res.token)
    saveUser(res.user)
    setUserState(res.user)
    return res
  }, [])

  const logout = useCallback(() => {
    clearToken()
    saveUser(null)
    setUserState(null)
  }, [])

  const setUser = useCallback((u: User) => {
    saveUser(u)
    setUserState(u)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && getToken()),
      login,
      logout,
      setUser,
    }),
    [user, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
