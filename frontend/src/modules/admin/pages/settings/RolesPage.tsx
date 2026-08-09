// ─── Roles Management Page ──────────────────────────────────
// Manage admin roles and their permissions

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  UserGear,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  X,
  Shield,
  Users,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  user_count: number
  is_system: boolean
  created_at: string
}

const AVAILABLE_PERMISSIONS = [
  { key: 'users.view', label: 'View Users', group: 'Users' },
  { key: 'users.create', label: 'Create Users', group: 'Users' },
  { key: 'users.edit', label: 'Edit Users', group: 'Users' },
  { key: 'users.delete', label: 'Delete Users', group: 'Users' },
  { key: 'content.view', label: 'View Content', group: 'Content' },
  { key: 'content.create', label: 'Create Content', group: 'Content' },
  { key: 'content.edit', label: 'Edit Content', group: 'Content' },
  { key: 'content.delete', label: 'Delete Content', group: 'Content' },
  { key: 'analytics.view', label: 'View Analytics', group: 'Analytics' },
  { key: 'analytics.export', label: 'Export Analytics', group: 'Analytics' },
  { key: 'settings.view', label: 'View Settings', group: 'Settings' },
  { key: 'settings.edit', label: 'Edit Settings', group: 'Settings' },
  { key: 'ai.manage', label: 'Manage AI', group: 'AI' },
  { key: 'payments.view', label: 'View Payments', group: 'Payments' },
  { key: 'payments.manage', label: 'Manage Payments', group: 'Payments' },
]

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] })

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockRoles: Role[] = [
        { 
          id: '1', 
          name: 'Super Admin', 
          description: 'Full access to all features', 
          permissions: AVAILABLE_PERMISSIONS.map(p => p.key),
          user_count: 2,
          is_system: true,
          created_at: new Date().toISOString()
        },
        { 
          id: '2', 
          name: 'Content Manager', 
          description: 'Manage curriculum and content', 
          permissions: ['content.view', 'content.create', 'content.edit', 'content.delete', 'users.view'],
          user_count: 5,
          is_system: false,
          created_at: new Date().toISOString()
        },
        { 
          id: '3', 
          name: 'Support Agent', 
          description: 'Handle user queries and basic management', 
          permissions: ['users.view', 'users.edit', 'content.view', 'analytics.view'],
          user_count: 10,
          is_system: false,
          created_at: new Date().toISOString()
        },
        { 
          id: '4', 
          name: 'Analyst', 
          description: 'View and export analytics data', 
          permissions: ['analytics.view', 'analytics.export', 'users.view'],
          user_count: 3,
          is_system: false,
          created_at: new Date().toISOString()
        },
      ]
      
      setRoles(mockRoles)
      setTotalCount(mockRoles.length)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, searchQuery])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreateModal = () => {
    setEditingRole(null)
    setFormData({ name: '', description: '', permissions: [] })
    setShowModal(true)
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setFormData({ name: role.name, description: role.description, permissions: [...role.permissions] })
    setShowModal(true)
  }

  const handleSave = () => {
    // TODO: Save to backend
    alert(editingRole ? 'Role updated' : 'Role created')
    setShowModal(false)
    loadRoles()
  }

  const togglePermission = (key: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }))
  }

  const permissionGroups = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = []
    acc[perm.group].push(perm)
    return acc
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <UserGear size={28} className="text-app-purple" />
            Roles Management
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Define roles and their permissions
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          New Role
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => alert('Delete selected roles')}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Role management API not yet implemented.
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-app-muted">
            No roles found
          </div>
        ) : (
          roles.map(role => (
            <div
              key={role.id}
              className="bg-app-card rounded-xl border border-app-border p-5 hover:border-app-border/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {!role.is_system && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(role.id)}
                      onChange={() => toggleSelect(role.id)}
                      className="rounded border-app-border"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-app-purple" />
                      <h3 className="font-bold text-app-text">{role.name}</h3>
                      {role.is_system && (
                        <span className="px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded-full">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-app-muted mt-1">{role.description}</p>
                  </div>
                </div>
                {!role.is_system && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => alert('Delete role')}
                      className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="flex items-center gap-1 text-app-muted">
                  <Users size={14} />
                  {role.user_count} users
                </span>
                <span className="flex items-center gap-1 text-app-muted">
                  <CheckCircle size={14} />
                  {role.permissions.length} permissions
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 5).map(perm => (
                  <span key={perm} className="px-2 py-0.5 text-xs bg-app-card2 text-app-muted rounded">
                    {perm}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="px-2 py-0.5 text-xs bg-app-card2 text-app-muted rounded">
                    +{role.permissions.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-app-card rounded-xl border border-app-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-app-card border-b border-app-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-app-text">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-app-muted hover:text-app-text"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text focus:outline-none focus:border-app-green"
                  placeholder="e.g. Content Manager"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text focus:outline-none focus:border-app-green resize-none"
                  rows={2}
                  placeholder="Brief description of this role"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-app-text mb-3">Permissions</label>
                <div className="space-y-4">
                  {Object.entries(permissionGroups).map(([group, perms]) => (
                    <div key={group}>
                      <h4 className="text-sm font-medium text-app-muted mb-2">{group}</h4>
                      <div className="flex flex-wrap gap-2">
                        {perms.map(perm => (
                          <button
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              formData.permissions.includes(perm.key)
                                ? 'bg-app-green/10 border-app-green/50 text-app-green'
                                : 'bg-app-card2 border-app-border text-app-muted hover:border-app-border/80'
                            }`}
                          >
                            {perm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-app-card border-t border-app-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-app-muted hover:text-app-text bg-app-card2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors"
              >
                {editingRole ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Roles management endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default RolesPage
