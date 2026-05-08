import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface AuthUser {
  userId: string
  name: string
  email: string
  telefone?: string | null
  role: string
  token: string
}

interface AuthStore {
  user: AuthUser | null
  setUser: (u: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      user: null,
      setUser: user => {
        localStorage.setItem('crm_token', user.token)
        set({ user })
      },
      logout: () => {
        localStorage.removeItem('crm_token')
        set({ user: null })
      },
    }),
    { name: 'crm-auth' }
  )
)

export function useSse() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('crm_token')
    if (!token) return

    const base = import.meta.env.VITE_API_URL || ''
    const es = new EventSource(`${base}/api/sse`)

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['sla-alerts'] })
    }

    es.addEventListener('lead_created', invalidate)
    es.addEventListener('lead_updated', invalidate)
    es.addEventListener('sla_breached', invalidate)

    return () => es.close()
  }, [queryClient])
}
