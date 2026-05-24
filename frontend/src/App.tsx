// ─── Main Application Component ───────────────────────────────
// App root - handles auth initialization and routing

import React, { useEffect } from 'react'
import { useAuth } from './modules/auth/hooks'
import AppRoutes from './routes'
import Loader from './shared/components/Loader'

const App: React.FC = () => {
  const { initialize, isInitialized } = useAuth()

  // Initialize auth on app load
  useEffect(() => {
    initialize()
  }, [initialize])

  // Listen for logout events from interceptor
  useEffect(() => {
    const handleLogout = () => {
      window.location.href = '/auth'
    }
    
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  // Show loader until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-[48px]">🎓</div>
          <Loader size="lg" />
          <p className="text-app-muted text-sm">Loading Eduvy-AI...</p>
        </div>
      </div>
    )
  }

  return <AppRoutes />
}

export default App
