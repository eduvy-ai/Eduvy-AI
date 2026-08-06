// ─── Muqabla Page ─────────────────────────────────────────────
// Main page component for Battle Arena
// Uses Redux hooks and delegates to existing UI components

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../redux/store'

// Import existing tab component (will be gradually migrated)
// @ts-ignore - JSX component
import MuqablaTabLegacy from '../../../components/tabs/MuqablaTab'

// ErrorBoundary prevents the entire app from crashing to a black screen
// when a render error occurs inside the battle tab
class MuqablaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MuqablaTab crash:', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: '#eee' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</p>
          <p style={{ fontSize: 13, color: '#7878A8', marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#F97316', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 24px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * MuqablaPage - Redux-connected wrapper for Battle Arena
 * 
 * This component:
 * 1. Gets user data from Redux
 * 2. Passes data as props to the legacy MuqablaTab component
 * 3. Will be the foundation for full TypeScript migration
 */
const MuqablaPage: React.FC = () => {
  // Get auth state
  const { user } = useSelector((state: RootState) => state.auth)

  // Pass through to legacy component
  if (!user) return null
  return (
    <MuqablaErrorBoundary>
      <MuqablaTabLegacy
        profile={user}
        userId={user?.id || ''}
      />
    </MuqablaErrorBoundary>
  )
}

export default MuqablaPage
