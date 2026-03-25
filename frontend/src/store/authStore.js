import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refresh: null,

      login: async (email, password) => {
        const res = await api.post('/api/auth/login/', { email, password })
        const token = res.data.access
        const refresh = res.data.refresh
        set({ token, refresh })
        const me = await api.get('/api/auth/me/')
        set({ user: me.data, token, refresh })
      },

      register: async (email, username, password, password2) => {
        const res = await api.post('/api/auth/register/', { email, username, password, password2 })
        set({ user: res.data.user, token: res.data.access, refresh: res.data.refresh })
      },

      loginGoogle: async (accessToken) => {
        const res = await api.post('/api/auth/google/', { access_token: accessToken })
        set({ user: res.data.user, token: res.data.access, refresh: res.data.refresh })
      },

      loginGitHub: async (code) => {
        const res = await api.post('/api/auth/github/', { code })
        set({ user: res.data.user, token: res.data.access, refresh: res.data.refresh })
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout/', { refresh: get().refresh })
        } catch {
          // ignore logout API failures
        }
        set({ user: null, token: null, refresh: null })
      },

      refreshToken: async () => {
        const res = await api.post('/api/auth/refresh/', { refresh: get().refresh })
        set({ token: res.data.access })
        return res.data.access
      },
    }),
    { name: 'auth-storage' }
  )
)
