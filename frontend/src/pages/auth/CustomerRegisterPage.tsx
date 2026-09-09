import { Navigate } from 'react-router-dom'

/** Legacy route — customer registration is now a modal on the homepage. */
export function CustomerRegisterPage() {
  return <Navigate to="/?register=1" replace />
}
