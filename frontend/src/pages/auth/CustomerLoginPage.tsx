import { Navigate } from 'react-router-dom'

/** Legacy route — customer login is now a modal on the homepage. */
export function CustomerLoginPage() {
  return <Navigate to="/?login=1" replace />
}
