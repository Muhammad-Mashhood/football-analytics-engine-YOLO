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

      loginGoogleCode: async (code, redirectUri) => {
        const payload = { code }
        if (redirectUri) payload.redirect_uri = redirectUri
        const res = await api.post('/api/auth/google/', payload)
        set({ user: res.data.user, token: res.data.access, refresh: res.data.refresh })
      },

      loginGitHub: async (code, redirectUri) => {
        const payload = { code }
        if (redirectUri) payload.redirect_uri = redirectUri
        const res = await api.post('/api/auth/github/', payload)
        set({ user: res.data.user, token: res.data.access, refresh: res.data.refresh })
      },

      logout: async () => {
        const refreshToken = get().refresh
        // Clear local session first so interceptor won't attempt token refresh loops.
        set({ user: null, token: null, refresh: null })

        if (!refreshToken) return
        try {
          await api.post('/api/auth/logout/', { refresh: refreshToken })
        } catch {
          // ignore logout API failures
        }
      },

      refreshToken: async () => {
        const refreshToken = get().refresh
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        const res = await api.post('/api/auth/refresh/', { refresh: refreshToken })
        set({ token: res.data.access })
        return res.data.access
      },
    }),
    { name: 'auth-storage' }
  )
)
