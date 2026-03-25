import axios from 'axios'
import { useAuthStore } from '../store/authStore'

/**
 * Axios client for the FastAPI ML service (default: http://localhost:8001).
 * Separate from the Django REST API client so each can have its own baseURL.
 */
const mlApi = axios.create({
  baseURL: import.meta.env.VITE_ML_URL ?? 'http://localhost:8001',
})

mlApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

mlApi.interceptors.response.use(
  (response) => response,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true
      try {
        const newToken = await useAuthStore.getState().refreshToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return mlApi(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(err)
  }
)

export default mlApi
