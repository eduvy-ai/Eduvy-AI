// ─── Admin Layout ──────────────────────────────────────────────
// Main layout shell for admin platform with sidebar navigation

import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAdminAuth, useAdminUI } from '../modules/admin/hooks'
import { ADMIN_NAV_ITEMS, type NavItem } from '../modules/admin/constants'
import type { AdminSection } from '../modules/admin/types'
import { canAccess } from '../modules/admin/service'
import {
  ChartLineUp,
  GraduationCap,
  PaintBrush,
  Users,
  Chalkboard,
  UsersThree,
  ChatCircleDots,
  Exam,
  Robot,
  ChartBar,
  Gear,
  Wrench,
  SignOut,
  CaretRight,
  CaretDown,
  List,
  X,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'
import Loader from '../shared/components/Loader'

// Icon mapping for nav items
const NAV_ICONS: Record<string, React.ComponentType<any>> = {
  ChartLineUp,
  GraduationCap,
  PaintBrush,
  Users,
  Chalkboard,
  UsersThree,
  ChatCircleDots,
  Exam,
  Robot,
  ChartBar,
  Gear,
  Wrench,
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isInitialized, initialize, logout } = useAdminAuth()
  const { sidebarCollapsed } = useAdminUI()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Ref to track initialization
  const initializedRef = useRef(false)
  const initializeRef = useRef(initialize)
  initializeRef.current = initialize

  // Initialize admin auth on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      initializeRef.current()
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/auth')
    }
  }, [isInitialized, isAuthenticated, navigate])

  // Get current path section
  const currentPath = location.pathname
  const getCurrentSection = (): AdminSection => {
    const pathParts = currentPath.split('/')
    if (pathParts.includes('academics')) return 'academics'
    if (pathParts.includes('content')) return 'content_studio'
    if (pathParts.includes('students')) return 'students'
    if (pathParts.includes('teachers')) return 'teachers'
    if (pathParts.includes('parents')) return 'parents'
    if (pathParts.includes('community')) return 'community'
    if (pathParts.includes('assessments')) return 'assessments'
    if (pathParts.includes('ai')) return 'ai_studio'
    if (pathParts.includes('analytics')) return 'analytics'
    if (pathParts.includes('operations')) return 'operations'
    if (pathParts.includes('settings')) return 'settings'
    return 'dashboard'
  }

  const activeSection = getCurrentSection()

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionKey)) {
        next.delete(sectionKey)
      } else {
        next.add(sectionKey)
      }
      return next
    })
  }

  // Navigate to a section
  const navigateTo = (path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  // Check if a nav item is active
  const isActive = (item: NavItem): boolean => {
    if (item.key === activeSection) return true
    if (item.children) {
      return item.children.some(child => currentPath === child.path)
    }
    return currentPath === `/admin/${item.key}`
  }

  // Render icon
  const renderIcon = (iconName: string, active: boolean, size = 20) => {
    const IconComponent = NAV_ICONS[iconName]
    if (!IconComponent) return null
    const weight: IconWeight = active ? 'fill' : 'regular'
    return <IconComponent size={size} weight={weight} />
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  // Only show loading during initial auth check, not during content fetches
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return null
  }

  // Render navigation item
  const renderNavItem = (item: NavItem) => {
    const hasAccess = canAccess(user, item.key)
    if (!hasAccess) return null

    const active = isActive(item)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.key)

    return (
      <div key={item.key} className="mb-0.5">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.key)
            } else {
              navigateTo(`/admin/${item.key}`)
            }
          }}
          className={`w-full rounded-xl py-2.5 px-3 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] text-left transition-all duration-150 border-[1.5px] active:scale-[0.98] ${
            active
              ? 'bg-app-green/10 border-app-green/30'
              : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.05]'
          }`}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            {renderIcon(item.icon, active)}
          </span>
          {!sidebarCollapsed && (
            <>
              <span className={`flex-1 text-sm ${active ? 'font-bold text-app-green' : 'font-medium text-app-text'}`}>
                {item.label}
              </span>
              {hasChildren && (
                <span className="text-app-muted">
                  {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                </span>
              )}
            </>
          )}
        </button>

        {/* Children */}
        {hasChildren && isExpanded && !sidebarCollapsed && (
          <div className="ml-8 mt-1 space-y-0.5">
            {item.children!.map((child: { key: string; label: string; path: string }) => (
              <button
                key={child.key}
                onClick={() => navigateTo(child.path)}
                className={`w-full rounded-lg py-2 px-3 text-left text-sm transition-all duration-150 ${
                  currentPath === child.path
                    ? 'bg-app-green/10 text-app-green font-medium'
                    : 'text-app-muted hover:text-app-text hover:bg-white/[0.04]'
                }`}
              >
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-app-border bg-app-card transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-app-border">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={28} weight="duotone" className="text-app-green shrink-0" />
            {!sidebarCollapsed && (
              <div>
                <div className="font-black text-lg text-app-green tracking-tight">Eduvy</div>
                <div className="text-[10px] text-app-muted font-medium -mt-0.5">Admin Platform</div>
              </div>
            )}
          </div>
        </div>

        {/* User info */}
        {user && !sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-app-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-app-green/15 border border-app-green/25 flex items-center justify-center text-sm font-black text-app-green shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-app-text truncate">{user.name}</div>
                <div className="text-[10px] text-app-muted truncate capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {ADMIN_NAV_ITEMS.map(item => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-app-border">
          <button
            onClick={handleLogout}
            className={`w-full rounded-xl py-2.5 px-3 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] border bg-app-red/10 border-app-red/30 hover:bg-app-red/20 active:scale-[0.98] transition-all duration-150 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <SignOut size={18} weight="fill" className="text-app-red" />
            {!sidebarCollapsed && <span className="text-sm font-medium text-app-red">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-app-card border-b border-app-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-app-text hover:bg-white/5 rounded-lg"
            >
              <List size={22} />
            </button>
            <GraduationCap size={24} weight="duotone" className="text-app-green" />
            <span className="font-bold text-app-green">Eduvy Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-app-muted hover:text-app-text hover:bg-white/5 rounded-lg">
              <MagnifyingGlass size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-app-card border-r border-app-border flex flex-col animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-4 border-b border-app-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={28} weight="duotone" className="text-app-green" />
                <div>
                  <div className="font-black text-lg text-app-green tracking-tight">Eduvy</div>
                  <div className="text-[10px] text-app-muted font-medium -mt-0.5">Admin Platform</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-app-muted hover:text-app-text hover:bg-white/5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-4 py-3 border-b border-app-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-app-green/15 border border-app-green/25 flex items-center justify-center text-sm font-black text-app-green">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app-text">{user.name}</div>
                    <div className="text-[10px] text-app-muted capitalize">{user.role.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {ADMIN_NAV_ITEMS.map((item: NavItem) => renderNavItem(item))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-app-border">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl py-2.5 px-3 flex items-center gap-3 cursor-pointer font-[Sora,sans-serif] border bg-app-red/10 border-app-red/30 hover:bg-app-red/20 active:scale-[0.98] transition-all duration-150"
              >
                <SignOut size={18} weight="fill" className="text-app-red" />
                <span className="text-sm font-medium text-app-red">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 min-h-screen lg:ml-0 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
