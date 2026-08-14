import { Navigate } from 'react-router-dom'

/** Legacy route — provider registration lives on the partner landing page. */
export function ProviderRegisterPage() {
  return <Navigate to="/partner#register" replace />
}
