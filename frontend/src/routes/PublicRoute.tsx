// ─── Public Route ─────────────────────────────────────────────
// Routes that should only be accessible when NOT logged in

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../modules/auth/hooks'
import Loader from '../shared/components/Loader'

interface PublicRouteProps {
  children: React.ReactNode
  restricted?: boolean // If true, redirect to app when logged in
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children, restricted = false }) => {
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

  // If restricted and authenticated, redirect to app
  if (restricted && isAuthenticated) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/home'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}

export default PublicRoute
