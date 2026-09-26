import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulseboard_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('pulseboard_token')
      localStorage.removeItem('pulseboard_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ---- auth ----
export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

// ---- monitors ----
export const monitorApi = {
  list: () => api.get('/monitor/get-all-monitors').then((r) => r.data),
  getById: (id) => api.get(`/monitor/get-monitor-by-id/${id}`).then((r) => r.data),
  create: (payload) => api.post('/monitor/create-monitor', payload).then((r) => r.data),
  remove: (id) => api.delete(`/monitor/delete-monitor/${id}`).then((r) => r.data),
}

// ---- checks ----
export const checkApi = {
  listForMonitor: (id) => api.get(`/check/get-checks-by-monitor/${id}`).then((r) => r.data),
  uptimeStats: (id, range = '24h') =>
    api.get(`/check/get-uptime-stats/${id}/uptime`, { params: { range } }).then((r) => r.data),
}

// ---- incidents ----
export const incidentApi = {
  listAll: () => api.get('/incident/get-all-incidents').then((r) => r.data),
  getById: (id) => api.get(`/incident/get-incident-by-id/${id}`).then((r) => r.data),
  listForMonitor: (id) => api.get(`/incident/get-incident-by-monitor/${id}`).then((r) => r.data),
}

// ---- ai ----
// Only ever called on an explicit user action (see AskAi component) —
// never on an interval or automatically — to stay well within a free-tier
// Gemini quota.
export const aiApi = {
  ask: (question) => api.post('/ai/ask', { question }).then((r) => r.data),
}
