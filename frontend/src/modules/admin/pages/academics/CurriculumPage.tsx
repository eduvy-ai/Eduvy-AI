// ─── Curriculum Management Page ────────────────────────────────
// CRUD interface for curriculum entries (board+standard+medium+subjects combinations)

import React, { useEffect, useState, useMemo } from 'react'
import { useCurriculum, useBoards, useStandards, useMediums, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { CurriculumEntry } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  CheckCircle,
  XCircle,
  X,
  Books,
} from '@phosphor-icons/react'

const CurriculumPage: React.FC = () => {
  const { curriculum, fetchCurriculum, addCurriculumEntry, updateCurriculumEntry, removeCurriculumEntry } = useCurriculum()
  const { boards, fetchBoards } = useBoards()
  const { standards, fetchStandards } = useStandards()
  const { mediums, fetchMediums } = useMediums()
  const canEdit = useCanEdit('academics')
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CurriculumEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CurriculumEntry | null>(null)
  const [formError, setFormError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // Filters
  const [filterBoard, setFilterBoard] = useState('')
  const [filterStandard, setFilterStandard] = useState('')
  const [filterMedium, setFilterMedium] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Form state
  const [formData, setFormData] = useState({
    board_id: '',
    standard_id: '',
    medium_id: '',
    subjects: '',
    is_active: true,
  })

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchBoards(),
          fetchStandards(),
          fetchMediums(),
        ])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchBoards, fetchStandards, fetchMediums])

  // Load curriculum when filters change
  useEffect(() => {
    const loadCurriculum = async () => {
      setIsLoading(true)
      try {
        const filters: { board_id?: string; standard_id?: string; medium_id?: string } = {}
        if (filterBoard) filters.board_id = filterBoard
        if (filterStandard) filters.standard_id = filterStandard
        if (filterMedium) filters.medium_id = filterMedium
        await fetchCurriculum(filters)
      } finally {
        setIsLoading(false)
      }
    }
    loadCurriculum()
  }, [filterBoard, filterStandard, filterMedium, fetchCurriculum])

  // Get lookup maps for display
  const boardMap = useMemo(() => new Map(boards.map(b => [b.id, b.name])), [boards])
  const standardMap = useMemo(() => new Map(standards.map(s => [s.id, s.name])), [standards])
  const mediumMap = useMemo(() => new Map(mediums.map(m => [m.id, m.name])), [mediums])

  // Filter curriculum by search
  const filteredCurriculum = curriculum.filter(entry => {
    const boardName = boardMap.get(entry.board_id) || entry.board_id
    const standardName = standardMap.get(entry.standard_id) || entry.standard_id
    const mediumName = mediumMap.get(entry.medium_id) || entry.medium_id
    const subjectsStr = entry.subjects.join(', ')
    const searchStr = `${boardName} ${standardName} ${mediumName} ${subjectsStr}`.toLowerCase()
    return searchStr.includes(searchQuery.toLowerCase())
  })

  // Paginated data
  const totalPages = Math.ceil(filteredCurriculum.length / pageSize)
  const paginatedCurriculum = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCurriculum.slice(start, start + pageSize)
  }, [filteredCurriculum, currentPage, pageSize])

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterBoard, filterStandard, filterMedium])

  // Open create modal
  const handleCreate = () => {
    setEditingEntry(null)
    setFormData({
      board_id: filterBoard || (boards[0]?.id || ''),
      standard_id: filterStandard || (standards[0]?.id || ''),
      medium_id: filterMedium || (mediums[0]?.id || ''),
      subjects: '',
      is_active: true,
    })
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (entry: CurriculumEntry) => {
    setEditingEntry(entry)
    setFormData({
      board_id: entry.board_id,
      standard_id: entry.standard_id,
      medium_id: entry.medium_id,
      subjects: entry.subjects.join(', '),
      is_active: entry.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  // Open delete confirm
  const handleDeleteClick = (entry: CurriculumEntry) => {
    setDeleteTarget(entry)
    setShowDeleteConfirm(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.board_id) {
      setFormError('Board is required')
      return
    }
    if (!formData.standard_id) {
      setFormError('Standard is required')
      return
    }
    if (!formData.medium_id) {
      setFormError('Medium is required')
      return
    }
    if (!formData.subjects.trim()) {
      setFormError('At least one subject is required')
      return
    }

    const subjectsArray = formData.subjects
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    if (subjectsArray.length === 0) {
      setFormError('At least one subject is required')
      return
    }

    try {
      if (editingEntry) {
        const updated = await adminApi.curriculum.update(editingEntry.id, {
          subjects: subjectsArray,
          is_active: formData.is_active,
        })
        updateCurriculumEntry(updated)
      } else {
        const created = await adminApi.curriculum.create({
          board_id: formData.board_id,
          standard_id: formData.standard_id,
          medium_id: formData.medium_id,
          subjects: subjectsArray,
          is_active: formData.is_active,
        })
        addCurriculumEntry(created)
      }
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save curriculum entry')
    }
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.curriculum.delete(deleteTarget.id)
      removeCurriculumEntry(deleteTarget.id)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete curriculum entry')
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
    const pageIds = paginatedCurriculum.map(c => c.id)
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
      await adminApi.curriculum.bulkDelete(Array.from(selectedIds))
      selectedIds.forEach(id => removeCurriculumEntry(id))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete curriculum entries')
    }
  }

  // Open bulk delete confirm
  const handleBulkDeleteClick = () => {
    setDeleteTarget(null)
    setShowDeleteConfirm(true)
  }

  // Clear filters
  const clearFilters = () => {
    setFilterBoard('')
    setFilterStandard('')
    setFilterMedium('')
  }

  const hasFilters = filterBoard || filterStandard || filterMedium

  // Table columns
  const columns: TableColumn<CurriculumEntry>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof CurriculumEntry,
      header: (
        <input
          type="checkbox"
          checked={paginatedCurriculum.length > 0 && paginatedCurriculum.every(c => selectedIds.has(c.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (entry: CurriculumEntry) => (
        <input
          type="checkbox"
          checked={selectedIds.has(entry.id)}
          onChange={() => toggleSelect(entry.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    { key: 'id', header: 'ID', width: '60px' },
    {
      key: 'board_id',
      header: 'Board',
      width: '120px',
      render: (entry) => boardMap.get(entry.board_id) || entry.board_id,
    },
    {
      key: 'standard_id',
      header: 'Standard',
      width: '120px',
      render: (entry) => standardMap.get(entry.standard_id) || entry.standard_id,
    },
    {
      key: 'medium_id',
      header: 'Medium',
      width: '120px',
      render: (entry) => mediumMap.get(entry.medium_id) || entry.medium_id,
    },
    {
      key: 'subjects',
      header: 'Subjects',
      render: (entry) => (
        <div className="flex flex-wrap gap-1">
          {entry.subjects.map((subject, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-app-blue/10 text-app-blue"
            >
              {subject}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (entry) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${entry.is_active ? 'text-app-green' : 'text-app-muted'}`}>
          {entry.is_active ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} />}
          {entry.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(canEdit ? [{
      key: 'actions' as keyof CurriculumEntry,
      header: 'Actions',
      width: '100px',
      render: (entry: CurriculumEntry) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(entry)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(entry)}
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
          <h1 className="text-2xl font-black text-app-text">Curriculum</h1>
          <p className="text-sm text-app-muted mt-1">
            Define which subjects are available for each board + standard + medium combination
          </p>
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
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleCreate}
            >
              Add Entry
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Funnel size={16} className="text-app-muted" />
          <span className="text-sm font-medium text-app-text">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-app-muted hover:text-app-text flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Boards</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
          <select
            value={filterStandard}
            onChange={(e) => setFilterStandard(e.target.value)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Standards</option>
            {standards.map(std => (
              <option key={std.id} value={std.id}>{std.name}</option>
            ))}
          </select>
          <select
            value={filterMedium}
            onChange={(e) => setFilterMedium(e.target.value)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Mediums</option>
            {mediums.map(med => (
              <option key={med.id} value={med.id}>{med.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          placeholder="Search curriculum..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedCurriculum}
        isLoading={isLoading}
        emptyMessage={hasFilters ? "No curriculum entries match the filters" : "No curriculum entries found. Add your first entry!"}
        keyExtractor={(entry) => entry.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredCurriculum.length}
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
        title={editingEntry ? 'Edit Curriculum Entry' : 'Create Curriculum Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Board</label>
              <select
                value={formData.board_id}
                onChange={(e) => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
                disabled={!!editingEntry}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              >
                <option value="">Select Board</option>
                {boards.filter(b => b.is_active).map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Standard</label>
              <select
                value={formData.standard_id}
                onChange={(e) => setFormData(prev => ({ ...prev, standard_id: e.target.value }))}
                disabled={!!editingEntry}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              >
                <option value="">Select Standard</option>
                {standards.filter(s => s.is_active).map(std => (
                  <option key={std.id} value={std.id}>{std.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Medium</label>
              <select
                value={formData.medium_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medium_id: e.target.value }))}
                disabled={!!editingEntry}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              >
                <option value="">Select Medium</option>
                {mediums.filter(m => m.is_active).map(med => (
                  <option key={med.id} value={med.id}>{med.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Subjects (comma-separated)</label>
            <textarea
              value={formData.subjects}
              onChange={(e) => setFormData(prev => ({ ...prev, subjects: e.target.value }))}
              placeholder="e.g., Mathematics, Science, English, Social Studies, Hindi"
              rows={3}
              className="w-full p-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
            <p className="text-xs text-app-muted mt-1">Enter subject names separated by commas</p>
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
              {editingEntry ? 'Save Changes' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteTarget ? 'Delete Curriculum Entry' : `Delete ${selectedIds.size} Entr${selectedIds.size > 1 ? 'ies' : 'y'}`}
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-app-card2 rounded-xl">
                <Books size={24} className="text-app-muted shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-app-text">
                    {boardMap.get(deleteTarget.board_id)} · {standardMap.get(deleteTarget.standard_id)} · {mediumMap.get(deleteTarget.medium_id)}
                  </div>
                  <div className="text-xs text-app-muted">
                    {deleteTarget.subjects.length} subject{deleteTarget.subjects.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <p className="text-sm text-app-muted">
                Are you sure you want to delete this curriculum entry? This action cannot be undone.
              </p>
            </>
          ) : (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{selectedIds.size} curriculum entr{selectedIds.size > 1 ? 'ies' : 'y'}</strong>? This action cannot be undone.
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
    </div>
  )
}

export default CurriculumPage
