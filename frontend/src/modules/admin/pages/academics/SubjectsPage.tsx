// ─── Subjects Management Page ────────────────────────────────────
// CRUD interface for subjects (linked to board + standard)

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useBoards, useStandards, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { Subject, Stream } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Upload,
  CheckCircle,
  XCircle,
  Funnel,
  BookOpen,
} from '@phosphor-icons/react'

const SubjectsPage: React.FC = () => {
  const { boards, fetchBoards } = useBoards()
  const { standards, fetchStandards } = useStandards()
  const canEdit = useCanEdit('academics')
  
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [boardFilter, setBoardFilter] = useState<string>('')
  const [standardFilter, setStandardFilter] = useState<string>('')
  const [streamFilter, setStreamFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [formError, setFormError] = useState('')
  const [importJson, setImportJson] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    board_id: '',
    standard_id: '',
    stream_id: '' as string | null,
    sort_order: 0,
    is_active: true,
  })

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const filters: { board_id?: string; standard_id?: string; stream_id?: string; page_size?: number } = { page_size: 200 }
      if (boardFilter) filters.board_id = boardFilter
      if (standardFilter) filters.standard_id = standardFilter
      if (streamFilter) filters.stream_id = streamFilter
      const response = await adminApi.subjects.getAll(filters)
      setSubjects(response.items)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [boardFilter, standardFilter, streamFilter])

  // Fetch streams
  const fetchStreams = useCallback(async () => {
    try {
      const data = await adminApi.streams.getAll()
      setStreams(data)
    } catch (error) {
      console.error('Failed to fetch streams:', error)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchBoards()
    fetchStandards()
    fetchStreams()
    fetchSubjects()
  }, [fetchBoards, fetchStandards, fetchStreams, fetchSubjects])

  // Filter subjects by search
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (subject.board_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (subject.standard_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (subject.stream_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Paginated data
  const totalPages = Math.ceil(filteredSubjects.length / pageSize)
  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSubjects.slice(start, start + pageSize)
  }, [filteredSubjects, currentPage, pageSize])

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, boardFilter, standardFilter, streamFilter])

  // Open create modal
  const handleCreate = () => {
    setEditingSubject(null)
    setFormData({ 
      id: '', 
      name: '', 
      board_id: boardFilter || (boards[0]?.id || ''),
      standard_id: standardFilter || (standards[0]?.id || ''),
      stream_id: streamFilter || null,
      sort_order: subjects.length, 
      is_active: true 
    })
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      id: subject.id,
      name: subject.name,
      board_id: subject.board_id,
      standard_id: subject.standard_id,
      stream_id: subject.stream_id || null,
      sort_order: subject.sort_order,
      is_active: subject.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  // Open delete confirm
  const handleDeleteClick = (subject: Subject) => {
    setDeleteTarget(subject)
    setShowDeleteConfirm(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.id.trim()) {
      setFormError('Subject ID is required')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Subject name is required')
      return
    }
    if (!formData.board_id) {
      setFormError('Board is required')
      return
    }
    if (!formData.standard_id) {
      setFormError('Standard is required')
      return
    }
    if (!/^[a-z0-9_]+$/.test(formData.id)) {
      setFormError('Subject ID must be lowercase alphanumeric with underscores')
      return
    }

    try {
      if (editingSubject) {
        await adminApi.subjects.update(editingSubject.id, {
          id: formData.id,
          name: formData.name,
          board_id: formData.board_id,
          standard_id: formData.standard_id,
          stream_id: formData.stream_id,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
      } else {
        await adminApi.subjects.create({
          id: formData.id,
          name: formData.name,
          board_id: formData.board_id,
          standard_id: formData.standard_id,
          stream_id: formData.stream_id,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
      }
      await fetchSubjects()
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save subject')
    }
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.subjects.delete(deleteTarget.id)
      await fetchSubjects()
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete subject')
    }
  }

  // Import subjects
  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson)
      const items = Array.isArray(data) ? data : [data]
      await adminApi.subjects.bulkImport(items)
      await fetchSubjects()
      setShowImportModal(false)
      setImportJson('')
    } catch (error: any) {
      setFormError(error.message || 'Invalid JSON')
    }
  }

  // Toggle selection
  const toggleSelect = (id: string) => {
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

  // Select all visible
  const toggleSelectAll = () => {
    const pageIds = paginatedSubjects.map(s => s.id)
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

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      await adminApi.subjects.bulkDelete(Array.from(selectedIds))
      await fetchSubjects()
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete subjects')
    }
  }

  // Open bulk delete confirm
  const handleBulkDeleteClick = () => {
    setDeleteTarget(null)
    setShowDeleteConfirm(true)
  }

  // Table columns
  const columns: TableColumn<Subject>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof Subject,
      header: (
        <input
          type="checkbox"
          checked={paginatedSubjects.length > 0 && paginatedSubjects.every(s => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (subject: Subject) => (
        <input
          type="checkbox"
          checked={selectedIds.has(subject.id)}
          onChange={() => toggleSelect(subject.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    { key: 'id', header: 'ID', width: '150px' },
    { key: 'name', header: 'Subject Name' },
    { 
      key: 'board_id', 
      header: 'Board', 
      width: '120px',
      render: (subject) => (
        <span className="text-app-blue font-medium">{subject.board_name || subject.board_id}</span>
      ),
    },
    { 
      key: 'standard_id', 
      header: 'Standard', 
      width: '120px',
      render: (subject) => (
        <span className="text-app-purple font-medium">{subject.standard_name || subject.standard_id}</span>
      ),
    },
    { 
      key: 'stream_id', 
      header: 'Stream', 
      width: '100px',
      render: (subject) => (
        subject.stream_name 
          ? <span className="text-app-orange font-medium">{subject.stream_name}</span>
          : <span className="text-app-muted">—</span>
      ),
    },
    { key: 'sort_order', header: 'Order', width: '80px' },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (subject) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${subject.is_active ? 'text-app-green' : 'text-app-muted'}`}>
          {subject.is_active ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} />}
          {subject.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(canEdit ? [{
      key: 'actions' as keyof Subject,
      header: 'Actions',
      width: '120px',
      render: (subject: Subject) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(subject)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(subject)}
            className="p-1.5 text-app-muted hover:text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
          >
            <Trash size={16} />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <BookOpen size={28} className="text-app-green" />
            Subjects
          </h1>
          <p className="text-sm text-app-muted mt-1">Manage subjects per board and standard</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash size={16} />}
                onClick={handleBulkDeleteClick}
              >
                Delete ({selectedIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload size={16} />}
              onClick={() => setShowImportModal(true)}
            >
              Import
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleCreate}
            >
              Add Subject
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
          />
        </div>
        <div className="relative min-w-[150px]">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Boards</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[150px]">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Standards</option>
            {standards.map(std => (
              <option key={std.id} value={std.id}>{std.name}</option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[150px]">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Streams</option>
            {streams.map(str => (
              <option key={str.id} value={str.id}>{str.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedSubjects}
        isLoading={isLoading}
        emptyMessage="No subjects found. Add your first subject or adjust filters."
        keyExtractor={(subject) => subject.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredSubjects.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Board</label>
              <select
                value={formData.board_id}
                onChange={(e) => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                <option value="">Select Board</option>
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Standard</label>
              <select
                value={formData.standard_id}
                onChange={(e) => setFormData(prev => ({ ...prev, standard_id: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                <option value="">Select Standard</option>
                {standards.map(std => (
                  <option key={std.id} value={std.id}>{std.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Stream (for Class 11-12)</label>
            <select
              value={formData.stream_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, stream_id: e.target.value || null }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
            >
              <option value="">No Stream (Class 9-10)</option>
              {streams.map(str => (
                <option key={str.id} value={str.id}>{str.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Subject ID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
              placeholder="e.g., mathematics"
              disabled={!!editingSubject}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
            />
            <p className="text-xs text-app-muted mt-1">Lowercase letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Subject Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Mathematics"
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Sort Order</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
            />
            <label htmlFor="is_active" className="text-sm text-app-text">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteTarget ? 'Delete Subject' : `Delete ${selectedIds.size} Subject${selectedIds.size > 1 ? 's' : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget ? (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
          ) : (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{selectedIds.size} subject{selectedIds.size > 1 ? 's' : ''}</strong>?
            </p>
          )}
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteTarget ? handleDelete : handleBulkDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Subjects"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-app-muted">
            Paste JSON array of subjects. Each subject should have: id, name, board_id, standard_id, sort_order, is_active
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[
  { "id": "cbse_10_math", "name": "Mathematics", "board_id": "cbse", "standard_id": "class_10", "sort_order": 0, "is_active": true },
  { "id": "cbse_10_science", "name": "Science", "board_id": "cbse", "standard_id": "class_10", "sort_order": 1, "is_active": true }
]`}
            className="w-full h-48 p-3 bg-app-card2 border border-white/10 rounded-xl text-app-text font-mono text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
          />
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SubjectsPage
