import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from './components/Layout'
import { AppShell } from './components/AppShell'
import { PageLoader } from './components/PageLoader'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { isProviderRole, providerDashboardPath } from './lib/format'

const PublicHomePage = lazy(() =>
  import('./pages/PublicHomePage').then((m) => ({ default: m.PublicHomePage })),
)
const PartnerLandingPage = lazy(() =>
  import('./pages/PartnerLandingPage').then((m) => ({ default: m.PartnerLandingPage })),
)
const SiteInfoPage = lazy(() =>
  import('./pages/SiteInfoPage').then((m) => ({ default: m.SiteInfoPage })),
)

const CustomerLoginPage = lazy(() =>
  import('./pages/auth/CustomerLoginPage').then((m) => ({ default: m.CustomerLoginPage })),
)
const CustomerRegisterPage = lazy(() =>
  import('./pages/auth/CustomerRegisterPage').then((m) => ({ default: m.CustomerRegisterPage })),
)
const ProviderLoginPage = lazy(() =>
  import('./pages/auth/ProviderLoginPage').then((m) => ({ default: m.ProviderLoginPage })),
)
const ProviderRegisterPage = lazy(() =>
  import('./pages/auth/ProviderRegisterPage').then((m) => ({ default: m.ProviderRegisterPage })),
)
const VerifyEmailPage = lazy(() =>
  import('./pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const AdminLoginPage = lazy(() =>
  import('./pages/auth/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
)

const CustomerDashboard = lazy(() =>
  import('./pages/customer/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })),
)
const CustomerAddressesPage = lazy(() =>
  import('./pages/customer/CustomerAddressesPage').then((m) => ({ default: m.CustomerAddressesPage })),
)
const MyBookingsPage = lazy(() =>
  import('./pages/customer/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
)
const MyRequestsPage = lazy(() =>
  import('./pages/customer/MyRequestsPage').then((m) => ({ default: m.MyRequestsPage })),
)
const ViewQuotesPage = lazy(() =>
  import('./pages/customer/ViewQuotesPage').then((m) => ({ default: m.ViewQuotesPage })),
)

const ProviderBookingsPage = lazy(() =>
  import('./pages/provider/ProviderBookingsPage').then((m) => ({ default: m.ProviderBookingsPage })),
)
const ProviderDashboard = lazy(() =>
  import('./pages/provider/ProviderDashboard').then((m) => ({ default: m.ProviderDashboard })),
)
const ProviderLeadsPage = lazy(() =>
  import('./pages/provider/ProviderLeadsPage').then((m) => ({ default: m.ProviderLeadsPage })),
)

const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)

const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminProvidersPage = lazy(() =>
  import('./pages/admin/AdminProvidersPage').then((m) => ({ default: m.AdminProvidersPage })),
)
const AdminServicesPage = lazy(() =>
  import('./pages/admin/AdminServicesPage').then((m) => ({ default: m.AdminServicesPage })),
)
const AdminMarketplacePage = lazy(() =>
  import('./pages/admin/AdminMarketplacePage').then((m) => ({ default: m.AdminMarketplacePage })),
)
const AdminCustomersPage = lazy(() =>
  import('./pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage })),
)
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminPendingProvidersPage = lazy(() =>
  import('./pages/admin/AdminPendingProvidersPage').then((m) => ({ default: m.AdminPendingProvidersPage })),
)

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/partner" element={<PartnerLandingPage />} />
        <Route path="/prtner" element={<Navigate to="/partner" replace />} />
        <Route path="/about" element={<SiteInfoPage slug="about" />} />
        <Route path="/investors" element={<SiteInfoPage slug="investors" />} />
        <Route path="/privacy" element={<SiteInfoPage slug="privacy" />} />
        <Route path="/careers" element={<SiteInfoPage slug="careers" />} />
        <Route path="/reviews" element={<SiteInfoPage slug="reviews" />} />
        <Route path="/categories" element={<SiteInfoPage slug="categories" />} />
        <Route path="/contact" element={<SiteInfoPage slug="contact" />} />

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
              <AppShell />
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
          <Route path="/admin/customers" element={<ProtectedRoute roles={['admin']}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="/admin/admin-users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/pending-providers" element={<ProtectedRoute roles={['admin']}><AdminPendingProvidersPage /></ProtectedRoute>} />
          <Route path="/admin/providers" element={<ProtectedRoute roles={['admin']}><AdminProvidersPage /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute roles={['admin']}><AdminServicesPage /></ProtectedRoute>} />
          <Route path="/admin/marketplace" element={<ProtectedRoute roles={['admin']}><AdminMarketplacePage /></ProtectedRoute>} />
        </Route>

        <Route path="/dashboard" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
