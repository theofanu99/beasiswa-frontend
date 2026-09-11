import { Navigate, Outlet } from 'react-router-dom'
import { getAccessToken, getAuthUser } from '../auth/auth'

type ProtectedRouteProps = {
  allowedRoles?: string[]
}

function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const token = getAccessToken()
  const user = getAuthUser()

  // Belum login
  if (!token || !user) {
    return <Navigate to="/internal/login" replace />
  }

  // Tidak punya role yang diizinkan
  if (
    allowedRoles &&
    !user.roles.some((role) =>
      allowedRoles.includes(role),
    )
  ) {
    return <Navigate to="/internal/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute