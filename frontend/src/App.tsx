import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout, Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { isProviderRole, providerDashboardPath } from './lib/format'
import { AuthLandingPage } from './pages/auth/AuthLandingPage'
import { CustomerLoginPage } from './pages/auth/CustomerLoginPage'
import { CustomerRegisterPage } from './pages/auth/CustomerRegisterPage'
import { ProviderLoginPage } from './pages/auth/ProviderLoginPage'
import { ProviderRegisterPage } from './pages/auth/ProviderRegisterPage'
import { CustomerDashboard } from './pages/customer/CustomerDashboard'
import { CustomerAddressesPage } from './pages/customer/CustomerAddressesPage'
import { MyBookingsPage } from './pages/customer/MyBookingsPage'
import { MyRequestsPage } from './pages/customer/MyRequestsPage'
import { ViewQuotesPage } from './pages/customer/ViewQuotesPage'
import { ProviderBookingsPage } from './pages/provider/ProviderBookingsPage'
import { ProviderDashboard } from './pages/provider/ProviderDashboard'
import { ProviderLeadsPage } from './pages/provider/ProviderLeadsPage'
import { ProfilePage } from './pages/ProfilePage'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated || !user) return <Navigate to="/" replace />
  if (user.role === 'customer') return <Navigate to="/customer-dashboard" replace />
  if (isProviderRole(user.role)) return <Navigate to={providerDashboardPath(user.role)} replace />
  return <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/" element={<AuthLandingPage />} />
        <Route path="/customer/login" element={<CustomerLoginPage />} />
        <Route path="/customer/register" element={<CustomerRegisterPage />} />
        <Route path="/provider/login" element={<ProviderLoginPage />} />
        <Route path="/provider/register" element={<ProviderRegisterPage />} />
        <Route path="/login" element={<Navigate to="/customer/login" replace />} />
        <Route path="/register" element={<Navigate to="/customer/register" replace />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/customer-dashboard" element={<ProtectedRoute roles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/customer/quotes/:requestId" element={<ProtectedRoute roles={['customer']}><ViewQuotesPage /></ProtectedRoute>} />
        <Route path="/customer/requests" element={<ProtectedRoute roles={['customer']}><MyRequestsPage /></ProtectedRoute>} />
        <Route path="/customer/bookings" element={<ProtectedRoute roles={['customer']}><MyBookingsPage /></ProtectedRoute>} />
        <Route path="/customer/addresses" element={<ProtectedRoute roles={['customer']}><CustomerAddressesPage /></ProtectedRoute>} />

        <Route path="/gardener-dashboard" element={<ProtectedRoute roles={['gardener']}><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/electrician-dashboard" element={<ProtectedRoute roles={['electrician']}><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/plumber-dashboard" element={<ProtectedRoute roles={['plumber']}><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/provider/leads" element={<ProtectedRoute roles={['gardener', 'electrician', 'plumber']}><ProviderLeadsPage /></ProtectedRoute>} />
        <Route path="/provider/bookings" element={<ProtectedRoute roles={['gardener', 'electrician', 'plumber']}><ProviderBookingsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/dashboard" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
