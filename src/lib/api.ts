import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('crm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
}

export const leadsApi = {
  list:    (params?: { userId?: string; statusId?: string }) =>
    api.get('/api/leads', { params }).then(r => r.data),
  get:     (id: string) => api.get(`/api/leads/${id}`).then(r => r.data),
  create:  (data: any)  => api.post('/api/leads', data).then(r => r.data),
  update:  (id: string, data: any) => api.patch(`/api/leads/${id}`, data).then(r => r.data),
  history: (id: string) => api.get(`/api/leads/${id}/history`).then(r => r.data),
}

export const statusesApi = {
  list: () => api.get('/admin/statuses').then(r => r.data),
}

export const scriptsApi = {
  list:       () => api.get('/api/scripts').then(r => r.data),
  categories: () => api.get('/api/scripts/categories').then(r => r.data),
  create:     (data: any) => api.post('/api/scripts', data).then(r => r.data),
  delete:     (id: string) => api.delete(`/api/scripts/${id}`),
}

export const assistantApi = {
  chat: (message: string) =>
    api.post('/api/assistant/chat', { message }).then(r => r.data),
}

export const performanceApi = {
  snapshots:  (params?: { userId?: string; days?: number }) =>
    api.get('/api/performance/snapshots', { params }).then(r => r.data),
  slaAlerts:  () => api.get('/api/performance/sla-alerts').then(r => r.data),
}

export const adminApi = {
  listUsers:    () => api.get('/admin/users').then(r => r.data),
  createUser:   (data: any) => api.post('/admin/users', data).then(r => r.data),
  updateUser:   (id: string, data: any) => api.patch(`/admin/users/${id}`, data).then(r => r.data),
  listStatuses: () => api.get('/admin/statuses').then(r => r.data),
  createStatus: (data: any) => api.post('/admin/statuses', data).then(r => r.data),
  updateStatus: (id: string, data: any) => api.patch(`/admin/statuses/${id}`, data).then(r => r.data),
  listSla:      () => api.get('/admin/sla').then(r => r.data),
  updateSla:    (id: string, data: any) => api.patch(`/admin/sla/${id}`, data).then(r => r.data),
  webhookLogs:  (source: string) =>
    api.get('/admin/webhook-logs', { params: { source } }).then(r => r.data),
}
