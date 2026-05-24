// ─── Private Route ────────────────────────────────────────────
// Protects routes that require authentication

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/hooks'
import Loader from '../shared/components/Loader'

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth()
  const location = useLocation()

  // Show loader while checking auth status
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default PrivateRoute
