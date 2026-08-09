// ─── Teachers List Page ──────────────────────────────────
// Manage all teachers (Drishti helpers with type 'teacher')

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { helpersApi } from '../../api'
import { adminService } from '../../service'
import { useCanEdit } from '../../hooks'
import type { DrishtiHelper } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  ChalkboardTeacher,
  MagnifyingGlass,
  Plus,
  Eye,
  Pencil,
  Trash,
  X,
  CheckCircle,
  XCircle,
  Copy,
  Users,
  Upload,
  Download,
  Envelope,
  Warning,
} from '@phosphor-icons/react'

// Default form state
const defaultFormState = {
  helper_name: '',
  helper_email: '',
  notes: '',
  is_active: true,
}

const TeachersListPage: React.FC = () => {
  const canEdit = useCanEdit('teachers')
  
  // Data state
  const [teachers, setTeachers] = useState<DrishtiHelper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<DrishtiHelper | null>(null)
  const [viewingTeacher, setViewingTeacher] = useState<DrishtiHelper | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState(defaultFormState)

  // Ref to prevent duplicate initial fetches
  const loadedRef = useRef(false)

  // Core fetch logic
  const fetchTeachers = useCallback(async () => {
    setIsLoading(true)
    try {
      const allHelpers = await helpersApi.getAll()
      // Filter only teachers
      setTeachers(allHelpers.filter(h => h.helper_type === 'teacher'))
    } catch (error) {
      console.error('Failed to load teachers:', error)
      setTeachers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load with guard
  const loadTeachers = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    await fetchTeachers()
  }, [fetchTeachers])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!t.helper_name.toLowerCase().includes(q) && 
            !t.helper_email.toLowerCase().includes(q) &&
            !(t.notes || '').toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterStatus === 'active' && !t.is_active) return false
      if (filterStatus === 'inactive' && t.is_active) return false
      return true
    })
  }, [teachers, searchQuery, filterStatus])

  // Paginate
  const paginatedTeachers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTeachers.slice(start, start + pageSize)
  }, [filteredTeachers, page, pageSize])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterStatus])

  // Handlers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    setEditingTeacher(null)
    setFormData(defaultFormState)
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = (teacher: DrishtiHelper) => {
    setEditingTeacher(teacher)
    setFormData({
      helper_name: teacher.helper_name,
      helper_email: teacher.helper_email,
      notes: teacher.notes || '',
      is_active: teacher.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleView = (teacher: DrishtiHelper) => {
    setViewingTeacher(teacher)
    setShowDetailModal(true)
  }

  const handleDelete = (teacher: DrishtiHelper) => {
    setEditingTeacher(teacher)
    setSelectedIds(new Set([teacher.id]))
    setShowDeleteConfirm(true)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setEditingTeacher(null)
    setShowDeleteConfirm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.helper_name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!formData.helper_email.trim()) {
      setFormError('Email is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingTeacher) {
        await helpersApi.update(editingTeacher.id, {
          helper_name: formData.helper_name,
          helper_email: formData.helper_email,
          notes: formData.notes || undefined,
          is_active: formData.is_active,
        })
      } else {
        await helpersApi.create({
          helper_name: formData.helper_name,
          helper_email: formData.helper_email,
          helper_type: 'teacher',
          notes: formData.notes || '',
          is_active: formData.is_active,
          assigned_count: 0,
        })
      }
      
      setShowModal(false)
      fetchTeachers()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save teacher')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return
    setIsSubmitting(true)
    setFormError('')
    
    try {
      await helpersApi.bulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      fetchTeachers()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
  }

  const hasFilters = searchQuery || filterStatus !== 'all'

  // Stats
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.is_active).length,
    inactive: teachers.filter(t => !t.is_active).length,
    totalStudents: teachers.reduce((acc, t) => acc + (t.assigned_count || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ChalkboardTeacher size={28} className="text-app-blue" />
            All Teachers
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage teacher accounts and access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Import teachers - Coming soon')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => alert('Export teachers - Coming soon')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Teacher
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="text-xs text-app-muted">Total Teachers</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.active}</p>
          <p className="text-xs text-app-muted">Active</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-muted">{stats.inactive}</p>
          <p className="text-xs text-app-muted">Inactive</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.totalStudents}</p>
          <p className="text-xs text-app-muted">Students Assigned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text flex items-center gap-1"
          >
            <X size={14} />
            Clear
          </button>
        )}
        {canEdit && selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Teachers List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : paginatedTeachers.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            No teachers found. {teachers.length === 0 && 'Add your first teacher to get started.'}
          </div>
        ) : (
          paginatedTeachers.map(teacher => (
            <div
              key={teacher.id}
              className="bg-app-card rounded-xl border border-app-border p-4 hover:border-app-border/80 transition-colors"
            >
              <div className="flex items-center gap-4">
                {canEdit && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(teacher.id)}
                    onChange={() => toggleSelect(teacher.id)}
                    className="rounded border-app-border"
                  />
                )}
                <div className="w-12 h-12 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-xl font-bold text-app-blue shrink-0">
                  {teacher.helper_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-app-text font-medium">{teacher.helper_name}</p>
                    {teacher.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-app-green">
                        <CheckCircle size={12} weight="fill" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-app-muted">
                        <XCircle size={12} weight="fill" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-app-muted">
                    <span className="flex items-center gap-1">
                      <Envelope size={14} />
                      {teacher.helper_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {teacher.assigned_count || 0} students
                    </span>
                  </div>
                  {teacher.notes && (
                    <p className="text-xs text-app-muted mt-1 truncate">{teacher.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-app-muted">Access Token</p>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono text-app-text">{teacher.helper_token.slice(0, 8)}...</code>
                      <button
                        onClick={() => copyToken(teacher.helper_token)}
                        className="p-1 text-app-muted hover:text-app-blue"
                        title="Copy token"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleView(teacher)}
                      className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(filteredTeachers.length / pageSize)}
        totalItems={filteredTeachers.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red flex items-center gap-2">
              <Warning size={16} /> {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Name *</label>
            <input
              type="text"
              value={formData.helper_name}
              onChange={e => setFormData(prev => ({ ...prev, helper_name: e.target.value }))}
              placeholder="Teacher name"
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Email *</label>
            <input
              type="email"
              value={formData.helper_email}
              onChange={e => setFormData(prev => ({ ...prev, helper_email: e.target.value }))}
              placeholder="teacher@example.com"
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-app-border accent-app-green"
            />
            <label htmlFor="is_active" className="text-sm text-app-text">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingTeacher ? 'Update Teacher' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Teacher Details"
        size="md"
      >
        {viewingTeacher && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-2xl font-bold text-app-blue">
                {viewingTeacher.helper_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-app-text">{viewingTeacher.helper_name}</h3>
                <p className="text-sm text-app-muted">{viewingTeacher.helper_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
              <div>
                <p className="text-xs text-app-muted">Status</p>
                <p className="text-sm text-app-text mt-1">
                  {viewingTeacher.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-xs text-app-muted">Assigned Students</p>
                <p className="text-sm text-app-text mt-1">{viewingTeacher.assigned_count || 0}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-app-muted">Access Token</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono text-app-text bg-app-card2 px-3 py-2 rounded-lg break-all">
                    {viewingTeacher.helper_token}
                  </code>
                  <button
                    onClick={() => copyToken(viewingTeacher.helper_token)}
                    className="p-2 text-app-muted hover:text-app-blue"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              {viewingTeacher.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-app-muted">Notes</p>
                  <p className="text-sm text-app-text mt-1">{viewingTeacher.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-app-muted">Created</p>
                <p className="text-sm text-app-text mt-1">
                  {adminService.formatDateTime(viewingTeacher.created_at)}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-app-border">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Teacher(s)"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-app-muted">
            Are you sure you want to delete {selectedIds.size > 1 ? `${selectedIds.size} teachers` : 'this teacher'}? 
            This action cannot be undone.
          </p>

          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TeachersListPage
