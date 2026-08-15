// ─── Squads Management Page ──────────────────────────────────
// View and manage study squads

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import { adminService } from '../../service'
import type { Squad, SquadMember, CommunityStats } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import {
  MagnifyingGlass,
  Plus,
  Eye,
  Pencil,
  Trash,
  X,
  UsersThree,
  ChatCircle,
  Question,
  CheckCircle,
  XCircle,
  Users,
} from '@phosphor-icons/react'

const SquadsPage: React.FC = () => {
  const canEdit = useCanEdit('community')
  
  const [squads, setSquads] = useState<Squad[]>([])
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterSubject, setFilterSubject] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    focus_subject: 'General',
    standard: 'Class 10',
    medium: 'English',
    is_active: true,
  })

  // Load squads and stats
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [squadsResponse, statsData] = await Promise.all([
        adminApi.community.getSquads({ page_size: 200 }),
        adminApi.community.getStats(),
      ])
      setSquads(squadsResponse.items)
      setStats(statsData)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const set = new Set(squads.map(s => s.focus_subject))
    return Array.from(set).sort()
  }, [squads])

  // Filter locally
  const filteredSquads = useMemo(() => {
    return squads.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!s.name.toLowerCase().includes(q) && 
            !s.focus_subject.toLowerCase().includes(q) &&
            !s.standard.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterStatus === 'active' && !s.is_active) return false
      if (filterStatus === 'inactive' && s.is_active) return false
      if (filterSubject && s.focus_subject !== filterSubject) return false
      return true
    })
  }, [squads, searchQuery, filterStatus, filterSubject])

  // Paginated squads
  const totalPages = Math.ceil(filteredSquads.length / pageSize)
  const paginatedSquads = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSquads.slice(start, start + pageSize)
  }, [filteredSquads, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterSubject])

  // View squad details with members
  const handleView = async (squad: Squad) => {
    setSelectedSquad(squad)
    try {
      const members = await adminApi.community.getSquadMembers(squad.id)
      setSquadMembers(members)
    } catch {
      setSquadMembers([])
    }
    setShowDetailModal(true)
  }

  // Open create/edit modal
  const handleAdd = () => {
    setSelectedSquad(null)
    setForm({
      name: '',
      focus_subject: 'General',
      standard: 'Class 10',
      medium: 'English',
      is_active: true,
    })
    setFormError('')
    setShowEditModal(true)
  }

  const handleEdit = (squad: Squad) => {
    setSelectedSquad(squad)
    setForm({
      name: squad.name,
      focus_subject: squad.focus_subject,
      standard: squad.standard,
      medium: squad.medium,
      is_active: squad.is_active,
    })
    setFormError('')
    setShowEditModal(true)
  }

  // Save squad
  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      if (selectedSquad) {
        // Update existing
        const updated = await adminApi.community.updateSquad(selectedSquad.id, {
          name: form.name,
          focus_subject: form.focus_subject,
          standard: form.standard,
          medium: form.medium,
          is_active: form.is_active,
        })
        setSquads(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
      } else {
        // Create new
        const created = await adminApi.community.createSquad({
          name: form.name,
          focus_subject: form.focus_subject,
          standard: form.standard,
          medium: form.medium,
        })
        setSquads(prev => [created, ...prev])
      }
      setShowEditModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save squad')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete confirmation
  const handleDeleteClick = (squad: Squad) => {
    setSelectedSquad(squad)
    setSelectedIds(new Set([squad.id]))
    setShowDeleteConfirm(true)
  }

  // Bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return
    setIsSubmitting(true)
    try {
      await adminApi.community.bulkDeleteSquads(Array.from(selectedIds))
      setSquads(prev => prev.filter(s => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setSelectedSquad(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete squads')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all visible (on current page)
  const toggleSelectAll = () => {
    const pageIds = paginatedSquads.map(s => s.id)
    const allSelected = pageIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...pageIds]))
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
    setFilterSubject('')
  }

  const hasFilters = searchQuery || filterStatus !== 'all' || filterSubject

  // Table columns
  const columns: TableColumn<Squad>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof Squad,
      header: (
        <input
          type="checkbox"
          checked={paginatedSquads.length > 0 && paginatedSquads.every(s => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (squad: Squad) => (
        <input
          type="checkbox"
          checked={selectedIds.has(squad.id)}
          onChange={() => toggleSelect(squad.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    {
      key: 'name',
      header: 'Squad',
      render: (squad) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-app-cyan/10 border border-app-cyan/25 flex items-center justify-center text-sm font-bold text-app-cyan shrink-0">
            <UsersThree size={16} />
          </div>
          <div>
            <div className="font-medium text-app-text">{squad.name}</div>
            <div className="text-xs text-app-muted">{squad.focus_subject} • {squad.standard}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'member_count' as keyof Squad,
      header: 'Members',
      width: '100px',
      render: (squad: Squad) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <Users size={14} className="text-app-muted" />
          {squad.member_count || 0}
        </span>
      ),
    },
    {
      key: 'message_count' as keyof Squad,
      header: 'Messages',
      width: '100px',
      render: (squad: Squad) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <ChatCircle size={14} className="text-app-muted" />
          {squad.message_count || 0}
        </span>
      ),
    },
    {
      key: 'doubt_count' as keyof Squad,
      header: 'Doubts',
      width: '80px',
      render: (squad: Squad) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <Question size={14} className="text-app-muted" />
          {squad.doubt_count || 0}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (squad) => (
        squad.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-app-green">
            <CheckCircle size={14} weight="fill" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-app-muted">
            <XCircle size={14} weight="fill" />
            Inactive
          </span>
        )
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      width: '120px',
      render: (squad) => (
        <span className="text-xs text-app-muted">
          {adminService.getRelativeTime(squad.created_at)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof Squad,
      header: 'Actions',
      width: '120px',
      render: (squad: Squad) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(squad)}
            className="p-1.5 text-app-muted hover:text-app-cyan hover:bg-app-cyan/10 rounded-lg transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => handleEdit(squad)}
                className="p-1.5 text-app-muted hover:text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(squad)}
                className="p-1.5 text-app-muted hover:text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-app-cyan/10 rounded-lg">
                <UsersThree size={20} className="text-app-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-app-text">{stats.active_squads}</p>
                <p className="text-xs text-app-muted">Active Squads</p>
              </div>
            </div>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-app-green/10 rounded-lg">
                <Users size={20} className="text-app-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-app-text">{stats.total_members}</p>
                <p className="text-xs text-app-muted">Total Members</p>
              </div>
            </div>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-app-blue/10 rounded-lg">
                <ChatCircle size={20} className="text-app-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-app-text">{stats.messages_this_week}</p>
                <p className="text-xs text-app-muted">Messages (7d)</p>
              </div>
            </div>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-app-purple/10 rounded-lg">
                <Question size={20} className="text-app-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-app-text">{stats.doubts_this_week}</p>
                <p className="text-xs text-app-muted">Doubts (7d)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <UsersThree size={28} className="text-app-cyan" />
            Study Squads
          </h1>
          <p className="text-sm text-app-muted mt-1">
            {filteredSquads.length} squads {hasFilters && '(filtered)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && selectedIds.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash size={16} />}
              onClick={handleBulkDeleteClick}
            >
              Delete {selectedIds.size}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleAdd}
            >
              Create Squad
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-app-text">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-app-muted hover:text-app-text flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search squads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-cyan focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm focus:border-app-cyan focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm focus:border-app-cyan focus:outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <Table
          data={paginatedSquads}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No squads found"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredSquads.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Squad Details"
      >
        {selectedSquad && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-app-cyan/10 border border-app-cyan/25 flex items-center justify-center text-2xl font-bold text-app-cyan">
                <UsersThree size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-app-text">{selectedSquad.name}</h3>
                <p className="text-sm text-app-muted">{selectedSquad.focus_subject} • {selectedSquad.standard}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-app-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-app-text">{selectedSquad.member_count || 0}</p>
                <p className="text-xs text-app-muted">Members</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-app-text">{selectedSquad.message_count || 0}</p>
                <p className="text-xs text-app-muted">Messages</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-app-text">{selectedSquad.doubt_count || 0}</p>
                <p className="text-xs text-app-muted">Doubts</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
              <div>
                <label className="text-xs text-app-muted">Status</label>
                <p className="text-sm text-app-text mt-1">
                  {selectedSquad.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="text-xs text-app-muted">Medium</label>
                <p className="text-sm text-app-text mt-1">{selectedSquad.medium}</p>
              </div>
              <div>
                <label className="text-xs text-app-muted">Created</label>
                <p className="text-sm text-app-text mt-1">
                  {adminService.formatDateTime(selectedSquad.created_at)}
                </p>
              </div>
            </div>

            {/* Members List */}
            {squadMembers.length > 0 && (
              <div className="pt-4 border-t border-app-border">
                <label className="text-xs text-app-muted">Members ({squadMembers.length})</label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {squadMembers.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-2 bg-app-card2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-app-green/10 border border-app-green/25 flex items-center justify-center text-xs font-bold text-app-green">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-app-text">{member.name}</div>
                          <div className="text-xs text-app-muted">{member.standard} • {member.board}</div>
                        </div>
                      </div>
                      <div className="text-xs text-app-muted">
                        {member.xp} XP
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedSquad ? 'Edit Squad' : 'Create Squad'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-app-red text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-app-text">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Squad name"
              className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-app-text">Focus Subject</label>
            <input
              type="text"
              value={form.focus_subject}
              onChange={(e) => setForm(f => ({ ...f, focus_subject: e.target.value }))}
              placeholder="e.g., Mathematics, Science"
              className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-cyan focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-app-text">Standard</label>
              <input
                type="text"
                value={form.standard}
                onChange={(e) => setForm(f => ({ ...f, standard: e.target.value }))}
                placeholder="e.g., Class 10"
                className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-app-text">Medium</label>
              <input
                type="text"
                value={form.medium}
                onChange={(e) => setForm(f => ({ ...f, medium: e.target.value }))}
                placeholder="e.g., English, Hindi"
                className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-cyan focus:outline-none"
              />
            </div>
          </div>

          {selectedSquad && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
              />
              <label htmlFor="is_active" className="text-sm text-app-text">Active</label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSubmitting}
            >
              {selectedSquad ? 'Save Changes' : 'Create Squad'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Squad(s)"
      >
        <div className="space-y-4">
          <p className="text-app-muted">
            Are you sure you want to delete {selectedIds.size > 1 ? `${selectedIds.size} squads` : 'this squad'}? 
            This will also delete all messages and doubts in the squad. This action cannot be undone.
          </p>

          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-app-red text-sm">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isSubmitting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SquadsPage
