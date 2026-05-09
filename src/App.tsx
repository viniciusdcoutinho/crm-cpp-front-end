import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './lib/store'
import { Layout } from './components/shared/Layout'
import { LoginPage } from './pages/LoginPage'
import { CrmPage } from './pages/CrmPage'
import { ContactsPage } from './pages/ContactsPage'
import { AssistantPage } from './pages/AssistantPage'
import { PerformancePage } from './pages/PerformancePage'
import { AdminPage } from './pages/AdminPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<CrmPage />} />
            <Route path="contatos" element={<ContactsPage />} />
            <Route path="assistente" element={<AssistantPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
