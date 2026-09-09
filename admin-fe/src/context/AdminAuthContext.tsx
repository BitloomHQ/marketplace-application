import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { adminLogin, type AdminAccount } from '../api/admin'
import { clearToken, getToken, setToken } from '../api/client'

const ADMIN_KEY = 'admin_user'

function loadAdmin(): AdminAccount | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY)
    return raw ? (JSON.parse(raw) as AdminAccount) : null
  } catch {
    return null
  }
}

function saveAdmin(admin: AdminAccount | null) {
  if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
  else localStorage.removeItem(ADMIN_KEY)
}

type AdminAuthContextValue = {
  admin: AdminAccount | null
  isAuthenticated: boolean
  login: (email: string, password: string) => ReturnType<typeof adminLogin>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<AdminAccount | null>(() => {
    if (getToken()) return loadAdmin()
    return null
  })

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminLogin(email, password)
    setToken(res.token)
    saveAdmin(res.admin)
    setAdminState(res.admin)
    return res
  }, [])

  const logout = useCallback(() => {
    clearToken()
    saveAdmin(null)
    setAdminState(null)
  }, [])

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin && getToken()),
      login,
      logout,
    }),
    [admin, login, logout],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
