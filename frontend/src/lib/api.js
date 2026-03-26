import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({ baseURL: '' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (err) => {
    const original = err.config
    const url = original?.url || ''
    const isAuthEndpoint =
      url.includes('/api/auth/login/') ||
      url.includes('/api/auth/register/') ||
      url.includes('/api/auth/refresh/')
    const hasRefreshToken = !!useAuthStore.getState().refresh

    if (err.response?.status === 401 && !isAuthEndpoint && !original?._retry && hasRefreshToken) {
      original._retry = true
      try {
        const newToken = await useAuthStore.getState().refreshToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        // Avoid recursive 401 loops when refresh token is expired/invalid.
        useAuthStore.setState({ user: null, token: null, refresh: null })
      }
    }
    return Promise.reject(err)
  }
)

export default api
