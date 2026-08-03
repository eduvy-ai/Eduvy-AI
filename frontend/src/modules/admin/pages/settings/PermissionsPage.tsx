// ─── Permissions Overview Page ──────────────────────────────────
// View permission assignments across roles

import React, { useEffect, useState } from 'react'
import {
  Lock,
  CheckCircle,
  XCircle,
  Shield,
  MagnifyingGlass,
  Info,
  Warning,
} from '@phosphor-icons/react'

interface PermissionMatrix {
  permission: string
  description: string
  group: string
  roles: Record<string, boolean>
}

const PERMISSIONS: Omit<PermissionMatrix, 'roles'>[] = [
  { permission: 'users.view', description: 'View user list and profiles', group: 'Users' },
  { permission: 'users.create', description: 'Create new users', group: 'Users' },
  { permission: 'users.edit', description: 'Edit user profiles', group: 'Users' },
  { permission: 'users.delete', description: 'Delete users', group: 'Users' },
  { permission: 'content.view', description: 'View curriculum and content', group: 'Content' },
  { permission: 'content.create', description: 'Create new content', group: 'Content' },
  { permission: 'content.edit', description: 'Edit existing content', group: 'Content' },
  { permission: 'content.delete', description: 'Delete content', group: 'Content' },
  { permission: 'analytics.view', description: 'View analytics dashboards', group: 'Analytics' },
  { permission: 'analytics.export', description: 'Export analytics data', group: 'Analytics' },
  { permission: 'settings.view', description: 'View system settings', group: 'Settings' },
  { permission: 'settings.edit', description: 'Modify system settings', group: 'Settings' },
  { permission: 'ai.manage', description: 'Manage AI providers and prompts', group: 'AI' },
  { permission: 'payments.view', description: 'View payment information', group: 'Payments' },
  { permission: 'payments.manage', description: 'Manage subscriptions', group: 'Payments' },
]

const ROLES = [
  { id: 'super_admin', name: 'Super Admin', permissions: PERMISSIONS.map(p => p.permission) },
  { id: 'content_manager', name: 'Content Manager', permissions: ['content.view', 'content.create', 'content.edit', 'content.delete', 'users.view'] },
  { id: 'support_agent', name: 'Support Agent', permissions: ['users.view', 'users.edit', 'content.view', 'analytics.view'] },
  { id: 'analyst', name: 'Analyst', permissions: ['analytics.view', 'analytics.export', 'users.view'] },
]

const PermissionsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [matrix, setMatrix] = useState<PermissionMatrix[]>([])

  useEffect(() => {
    // Build permission matrix
    const built = PERMISSIONS.map(perm => ({
      ...perm,
      roles: ROLES.reduce((acc, role) => {
        acc[role.id] = role.permissions.includes(perm.permission)
        return acc
      }, {} as Record<string, boolean>)
    }))
    setMatrix(built)
  }, [])

  const groups = [...new Set(PERMISSIONS.map(p => p.group))]
  
  const filteredMatrix = matrix.filter(perm => {
    const matchesSearch = perm.permission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGroup = selectedGroup === 'all' || perm.group === selectedGroup
    return matchesSearch && matchesGroup
  })

  const groupedMatrix = filteredMatrix.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = []
    acc[perm.group].push(perm)
    return acc
  }, {} as Record<string, PermissionMatrix[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Lock size={28} className="text-app-yellow" />
            Permissions Matrix
          </h1>
          <p className="text-sm text-app-muted mt-1">
            View permission assignments across roles
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl">
        <Info size={20} className="text-app-blue shrink-0 mt-0.5" />
        <div className="text-sm text-app-muted">
          <p className="font-medium text-app-blue mb-1">Permission Management</p>
          <p>To modify permissions, edit the role directly from the Roles page. This matrix provides a read-only overview of all permission assignments.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Groups</option>
          {groups.map(group => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-app-card rounded-xl border border-app-border">
        <span className="text-sm text-app-muted">Roles:</span>
        {ROLES.map(role => (
          <div key={role.id} className="flex items-center gap-2">
            <Shield size={14} className="text-app-purple" />
            <span className="text-sm font-medium text-app-text">{role.name}</span>
          </div>
        ))}
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing predefined permissions matrix. Custom permissions API not yet implemented.
      </div>

      {/* Permission Matrix */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-app-border">
              <th className="p-3 text-left text-xs font-semibold text-app-muted uppercase w-[300px]">
                Permission
              </th>
              {ROLES.map(role => (
                <th key={role.id} className="p-3 text-center text-xs font-semibold text-app-muted uppercase">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedMatrix).map(([group, perms]) => (
              <React.Fragment key={group}>
                <tr className="bg-app-card2">
                  <td colSpan={ROLES.length + 1} className="px-3 py-2">
                    <span className="text-xs font-bold text-app-purple uppercase">{group}</span>
                  </td>
                </tr>
                {perms.map(perm => (
                  <tr key={perm.permission} className="border-b border-app-border/50 hover:bg-app-card2 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-mono text-sm text-app-text">{perm.permission}</p>
                        <p className="text-xs text-app-muted">{perm.description}</p>
                      </div>
                    </td>
                    {ROLES.map(role => (
                      <td key={role.id} className="p-3 text-center">
                        {perm.roles[role.id] ? (
                          <CheckCircle size={20} className="text-app-green mx-auto" weight="fill" />
                        ) : (
                          <XCircle size={20} className="text-app-muted/30 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROLES.map(role => (
          <div key={role.id} className="bg-app-card rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-app-purple" />
              <span className="text-sm font-medium text-app-text">{role.name}</span>
            </div>
            <p className="text-2xl font-bold text-app-text">{role.permissions.length}</p>
            <p className="text-xs text-app-muted">permissions</p>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Permissions system not yet implemented in backend. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default PermissionsPage
