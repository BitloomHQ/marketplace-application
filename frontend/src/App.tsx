import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout, Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { isProviderRole, providerDashboardPath } from './lib/format'
import { CustomerLoginPage } from './pages/auth/CustomerLoginPage'
import { CustomerRegisterPage } from './pages/auth/CustomerRegisterPage'
import { ProviderLoginPage } from './pages/auth/ProviderLoginPage'
import { ProviderRegisterPage } from './pages/auth/ProviderRegisterPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { CustomerDashboard } from './pages/customer/CustomerDashboard'
import { CustomerAddressesPage } from './pages/customer/CustomerAddressesPage'
import { MyBookingsPage } from './pages/customer/MyBookingsPage'
import { MyRequestsPage } from './pages/customer/MyRequestsPage'
import { ViewQuotesPage } from './pages/customer/ViewQuotesPage'
import { ProviderBookingsPage } from './pages/provider/ProviderBookingsPage'
import { ProviderDashboard } from './pages/provider/ProviderDashboard'
import { ProviderLeadsPage } from './pages/provider/ProviderLeadsPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminLoginPage } from './pages/auth/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminProvidersPage } from './pages/admin/AdminProvidersPage'
import { AdminServicesPage } from './pages/admin/AdminServicesPage'
import { AdminMarketplacePage } from './pages/admin/AdminMarketplacePage'
import { AdminPendingProvidersPage } from './pages/admin/AdminPendingProvidersPage'
import { PublicHomePage } from './pages/PublicHomePage'
import { PartnerLandingPage } from './pages/PartnerLandingPage'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated || !user) return <Navigate to="/" replace />
  if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />
  if (user.role === 'customer') return <Navigate to="/customer-dashboard" replace />
  if (isProviderRole(user.role)) return <Navigate to={providerDashboardPath(user.role)} replace />
  return <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/partner" element={<PartnerLandingPage />} />
      <Route path="/prtner" element={<Navigate to="/partner" replace />} />

      <Route element={<AuthLayout />}>
        <Route path="/customer/login" element={<CustomerLoginPage />} />
        <Route path="/customer/register" element={<CustomerRegisterPage />} />
        <Route path="/provider/login" element={<ProviderLoginPage />} />
        <Route path="/provider/register" element={<ProviderRegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login" element={<Navigate to="/?login=1" replace />} />
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

        <Route path="/provider-dashboard" element={<ProtectedRoute providerOnly><ProviderDashboard /></ProtectedRoute>} />
        <Route path="/gardener-dashboard" element={<Navigate to="/provider-dashboard" replace />} />
        <Route path="/electrician-dashboard" element={<Navigate to="/provider-dashboard" replace />} />
        <Route path="/plumber-dashboard" element={<Navigate to="/provider-dashboard" replace />} />
        <Route path="/provider/leads" element={<ProtectedRoute providerOnly><ProviderLeadsPage /></ProtectedRoute>} />
        <Route path="/provider/bookings" element={<ProtectedRoute providerOnly><ProviderBookingsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/pending-providers" element={<ProtectedRoute roles={['admin']}><AdminPendingProvidersPage /></ProtectedRoute>} />
        <Route path="/admin/providers" element={<ProtectedRoute roles={['admin']}><AdminProvidersPage /></ProtectedRoute>} />
        <Route path="/admin/services" element={<ProtectedRoute roles={['admin']}><AdminServicesPage /></ProtectedRoute>} />
        <Route path="/admin/marketplace" element={<ProtectedRoute roles={['admin']}><AdminMarketplacePage /></ProtectedRoute>} />
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
