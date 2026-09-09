import { Navigate } from 'react-router-dom'

/** Legacy route — forgot password is now a modal on the homepage. */
export function ForgotPasswordPage() {
  return <Navigate to="/?forgot=1" replace />
}
