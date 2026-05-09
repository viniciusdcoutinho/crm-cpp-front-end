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
    const status = err.response?.status
    // 401 = sem auth, 403 = auth invalida/expirada (Spring Security 6)
    if (status === 401 || status === 403) {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm-auth')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
}

export type LeadFilters = {
  userId?: string
  statusId?: string
  dateFrom?: string
  dateTo?: string
  motivoNaoVenda?: string
  search?: string
}

export const leadsApi = {
  list:    (params?: LeadFilters) =>
    api.get('/api/leads', { params }).then(r => r.data),
  get:     (id: string) => api.get(`/api/leads/${id}`).then(r => r.data),
  create:  (data: any)  => api.post('/api/leads', data).then(r => r.data),
  update:  (id: string, data: any) => api.patch(`/api/leads/${id}`, data).then(r => r.data),
  history: (id: string) => api.get(`/api/leads/${id}/history`).then(r => r.data),
}

export const statusesApi = {
  list: () => api.get('/api/statuses').then(r => r.data),
}

export const scriptsApi = {
  list:       () => api.get('/api/scripts').then(r => r.data),
  categories: () => api.get('/api/scripts/categories').then(r => r.data),
  create:     (data: any) => api.post('/api/scripts', data).then(r => r.data),
  update:     (id: string, data: any) => api.patch(`/api/scripts/${id}`, data).then(r => r.data),
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

export const lossReasonsApi = {
  list: () => api.get('/api/loss-reasons').then(r => r.data),
}

export const usersApi = {
  vendedoras: () => api.get('/api/users/vendedoras').then(r => r.data),
}

export const adminApi = {
  listUsers:    () => api.get('/admin/users').then(r => r.data),
  createUser:   (data: any) => api.post('/admin/users', data).then(r => r.data),
  updateUser:   (id: string, data: any) => api.patch(`/admin/users/${id}`, data).then(r => r.data),
  uploadUserPhoto: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/admin/users/${id}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  listStatuses: () => api.get('/admin/statuses').then(r => r.data),
  createStatus: (data: any) => api.post('/admin/statuses', data).then(r => r.data),
  updateStatus: (id: string, data: any) => api.patch(`/admin/statuses/${id}`, data).then(r => r.data),
  deleteStatus: (id: string) => api.delete(`/admin/statuses/${id}`),
  listLossReasons:   () => api.get('/admin/loss-reasons').then(r => r.data),
  createLossReason:  (data: any) => api.post('/admin/loss-reasons', data).then(r => r.data),
  updateLossReason:  (id: string, data: any) => api.patch(`/admin/loss-reasons/${id}`, data).then(r => r.data),
  deleteLossReason:  (id: string) => api.delete(`/admin/loss-reasons/${id}`),
  listGlobalScripts:   () => api.get('/admin/scripts').then(r => r.data),
  createGlobalScript:  (data: any) => api.post('/admin/scripts', data).then(r => r.data),
  updateGlobalScript:  (id: string, data: any) => api.patch(`/admin/scripts/${id}`, data).then(r => r.data),
  deleteGlobalScript:  (id: string) => api.delete(`/admin/scripts/${id}`),
  listSla:      () => api.get('/admin/sla').then(r => r.data),
  updateSla:    (id: string, data: any) => api.patch(`/admin/sla/${id}`, data).then(r => r.data),
  webhookLogs:  (params: { source: string; dateFrom?: string; dateTo?: string; search?: string }) =>
    api.get('/admin/webhook-logs', { params }).then(r => r.data),
}
