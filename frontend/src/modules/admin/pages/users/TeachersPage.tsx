// ─── Teachers Management Page ──────────────────────────────────
// View and manage teacher helpers (Drishti helpers with type 'teacher')

import React, { useEffect, useState, useMemo } from 'react'
import { useHelpers, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import { adminService } from '../../service'
import type { DrishtiHelper } from '../../types'
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
  ChalkboardTeacher,
  CheckCircle,
  XCircle,
  Copy,
  Users,
} from '@phosphor-icons/react'

const TeachersPage: React.FC = () => {
  const { helpers, fetchHelpers, addHelper, updateHelper, removeHelper } = useHelpers()
  const canEdit = useCanEdit('teachers')
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<DrishtiHelper | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Form state
  const [form, setForm] = useState({
    helper_name: '',
    helper_email: '',
    notes: '',
    is_active: true,
  })

  // Filter only teachers
  const teachers = useMemo(() => {
    return helpers.filter(h => h.helper_type === 'teacher')
  }, [helpers])

  // Load helpers
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchHelpers()
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchHelpers])

  // Filter locally
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

  // Paginated teachers
  const totalPages = Math.ceil(filteredTeachers.length / pageSize)
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTeachers.slice(start, start + pageSize)
  }, [filteredTeachers, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // View teacher details
  const handleView = (teacher: DrishtiHelper) => {
    setSelectedTeacher(teacher)
    setShowDetailModal(true)
  }

  // Open create/edit modal
  const handleAdd = () => {
    setSelectedTeacher(null)
    setForm({
      helper_name: '',
      helper_email: '',
      notes: '',
      is_active: true,
    })
    setFormError('')
    setShowEditModal(true)
  }

  const handleEdit = (teacher: DrishtiHelper) => {
    setSelectedTeacher(teacher)
    setForm({
      helper_name: teacher.helper_name,
      helper_email: teacher.helper_email,
      notes: teacher.notes || '',
      is_active: teacher.is_active,
    })
    setFormError('')
    setShowEditModal(true)
  }

  // Save teacher
  const handleSave = async () => {
    if (!form.helper_name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!form.helper_email.trim()) {
      setFormError('Email is required')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      if (selectedTeacher) {
        // Update existing
        const updated = await adminApi.helpers.update(selectedTeacher.id, {
          helper_name: form.helper_name,
          helper_email: form.helper_email,
          notes: form.notes,
          is_active: form.is_active,
        })
        updateHelper(updated)
      } else {
        // Create new
        const created = await adminApi.helpers.create({
          helper_name: form.helper_name,
          helper_email: form.helper_email,
          helper_type: 'teacher',
          notes: form.notes,
          is_active: form.is_active,
        })
        addHelper(created)
      }
      setShowEditModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save teacher')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete confirmation
  const handleDeleteClick = (teacher: DrishtiHelper) => {
    setSelectedTeacher(teacher)
    setSelectedIds(new Set([teacher.id]))
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
      await adminApi.helpers.bulkDelete(Array.from(selectedIds))
      selectedIds.forEach(id => removeHelper(id))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setSelectedTeacher(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete teachers')
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
    const pageIds = paginatedTeachers.map(t => t.id)
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

  // Copy access token
  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
  }

  const hasFilters = searchQuery || filterStatus !== 'all'

  // Table columns
  const columns: TableColumn<DrishtiHelper>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof DrishtiHelper,
      header: (
        <input
          type="checkbox"
          checked={paginatedTeachers.length > 0 && paginatedTeachers.every(t => selectedIds.has(t.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (teacher: DrishtiHelper) => (
        <input
          type="checkbox"
          checked={selectedIds.has(teacher.id)}
          onChange={() => toggleSelect(teacher.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    {
      key: 'helper_name',
      header: 'Teacher',
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-sm font-bold text-app-blue shrink-0">
            {teacher.helper_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-app-text">{teacher.helper_name}</div>
            <div className="text-xs text-app-muted">{teacher.helper_email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'assigned_count' as keyof DrishtiHelper,
      header: 'Students',
      width: '100px',
      render: (teacher: DrishtiHelper) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <Users size={14} className="text-app-muted" />
          {teacher.assigned_count || 0}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (teacher) => (
        teacher.is_active ? (
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
      key: 'helper_token',
      header: 'Access Token',
      width: '150px',
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <code className="text-xs text-app-muted font-mono truncate max-w-[100px]">
            {teacher.helper_token}
          </code>
          <button
            onClick={() => copyToken(teacher.helper_token)}
            className="p-1 text-app-muted hover:text-app-blue transition-colors"
            title="Copy token"
          >
            <Copy size={14} />
          </button>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      width: '120px',
      render: (teacher) => (
        <span className="text-xs text-app-muted">
          {adminService.getRelativeTime(teacher.created_at)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof DrishtiHelper,
      header: 'Actions',
      width: '120px',
      render: (teacher: DrishtiHelper) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(teacher)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => handleEdit(teacher)}
                className="p-1.5 text-app-muted hover:text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(teacher)}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ChalkboardTeacher size={28} className="text-app-blue" />
            Teachers
          </h1>
          <p className="text-sm text-app-muted mt-1">
            {filteredTeachers.length} teachers {hasFilters && '(filtered)'}
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
              Add Teacher
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-blue focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm focus:border-app-blue focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <Table
          data={paginatedTeachers}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No teachers found"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredTeachers.length}
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
        title="Teacher Details"
      >
        {selectedTeacher && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-2xl font-bold text-app-blue">
                {selectedTeacher.helper_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-app-text">{selectedTeacher.helper_name}</h3>
                <p className="text-sm text-app-muted">{selectedTeacher.helper_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border">
              <div>
                <label className="text-xs text-app-muted">Status</label>
                <p className="text-sm text-app-text mt-1">
                  {selectedTeacher.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <label className="text-xs text-app-muted">Assigned Students</label>
                <p className="text-sm text-app-text mt-1">{selectedTeacher.assigned_count || 0}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-app-muted">Access Token</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono text-app-text bg-app-card2 px-3 py-2 rounded-lg break-all">
                    {selectedTeacher.helper_token}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToken(selectedTeacher.helper_token)}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              {selectedTeacher.notes && (
                <div className="col-span-2">
                  <label className="text-xs text-app-muted">Notes</label>
                  <p className="text-sm text-app-text mt-1">{selectedTeacher.notes}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-app-muted">Created</label>
                <p className="text-sm text-app-text mt-1">
                  {adminService.formatDateTime(selectedTeacher.created_at)}
                </p>
              </div>
            </div>

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
        title={selectedTeacher ? 'Edit Teacher' : 'Add Teacher'}
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
              value={form.helper_name}
              onChange={(e) => setForm(f => ({ ...f, helper_name: e.target.value }))}
              placeholder="Teacher name"
              className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-app-text">Email *</label>
            <input
              type="email"
              value={form.helper_email}
              onChange={(e) => setForm(f => ({ ...f, helper_email: e.target.value }))}
              placeholder="teacher@example.com"
              className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-app-text">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes about this teacher..."
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-blue focus:outline-none resize-none"
            />
          </div>

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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSubmitting}
            >
              {selectedTeacher ? 'Save Changes' : 'Create Teacher'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Teacher(s)"
      >
        <div className="space-y-4">
          <p className="text-app-muted">
            Are you sure you want to delete {selectedIds.size > 1 ? `${selectedIds.size} teachers` : 'this teacher'}? 
            This action cannot be undone.
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

export default TeachersPage
