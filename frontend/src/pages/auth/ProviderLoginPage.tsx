import { Navigate } from 'react-router-dom'

/** Legacy route — provider login lives on the partner landing page. */
export function ProviderLoginPage() {
  return <Navigate to="/partner?login=1" replace />
}
