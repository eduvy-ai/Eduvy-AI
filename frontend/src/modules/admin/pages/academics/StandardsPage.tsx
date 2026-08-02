// ─── Standards Management Page ─────────────────────────────────
// CRUD interface for class standards

import React, { useEffect, useState, useMemo } from 'react'
import { useStandards, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { Standard } from '../../types'
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
} from '@phosphor-icons/react'

const StandardsPage: React.FC = () => {
  const { standards, fetchStandards, addStandard, updateStandard, removeStandard } = useStandards()
  const canEdit = useCanEdit('academics')
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Standard | null>(null)
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
    grade_num: 1,
    sort_order: 0,
    is_active: true,
  })

  // Load standards on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchStandards()
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchStandards])

  // Filter standards by search
  const filteredStandards = standards.filter(std =>
    std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    std.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Paginated data
  const totalPages = Math.ceil(filteredStandards.length / pageSize)
  const paginatedStandards = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStandards.slice(start, start + pageSize)
  }, [filteredStandards, currentPage, pageSize])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Open create modal
  const handleCreate = () => {
    setEditingStandard(null)
    setFormData({ id: '', name: '', grade_num: 1, sort_order: standards.length, is_active: true })
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (std: Standard) => {
    setEditingStandard(std)
    setFormData({
      id: std.id,
      name: std.name,
      grade_num: std.grade_num,
      sort_order: std.sort_order,
      is_active: std.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  // Open delete confirm
  const handleDeleteClick = (std: Standard) => {
    setDeleteTarget(std)
    setShowDeleteConfirm(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.id.trim()) {
      setFormError('Standard ID is required')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Standard name is required')
      return
    }
    if (formData.grade_num < 1 || formData.grade_num > 12) {
      setFormError('Grade number must be between 1 and 12')
      return
    }

    try {
      if (editingStandard) {
        const updated = await adminApi.standards.update(editingStandard.id, {
          name: formData.name,
          grade_num: formData.grade_num,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        updateStandard(updated)
      } else {
        const created = await adminApi.standards.create({
          id: formData.id,
          name: formData.name,
          grade_num: formData.grade_num,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        addStandard(created)
      }
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save standard')
    }
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.standards.delete(deleteTarget.id)
      removeStandard(deleteTarget.id)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete standard')
    }
  }

  // Import standards
  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson)
      const standards = Array.isArray(data) ? data : [data]
      await adminApi.standards.bulkImport(standards)
      await fetchStandards()
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

  // Select all visible (on current page)
  const toggleSelectAll = () => {
    const pageIds = paginatedStandards.map(s => s.id)
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
      await adminApi.standards.bulkDelete(Array.from(selectedIds))
      selectedIds.forEach(id => removeStandard(id))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete standards')
    }
  }

  // Open bulk delete confirm
  const handleBulkDeleteClick = () => {
    setDeleteTarget(null)
    setShowDeleteConfirm(true)
  }

  // Table columns
  const columns: TableColumn<Standard>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof Standard,
      header: (
        <input
          type="checkbox"
          checked={paginatedStandards.length > 0 && paginatedStandards.every(s => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (std: Standard) => (
        <input
          type="checkbox"
          checked={selectedIds.has(std.id)}
          onChange={() => toggleSelect(std.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    { key: 'id', header: 'ID', width: '150px' },
    { key: 'name', header: 'Name' },
    { key: 'grade_num', header: 'Grade', width: '80px' },
    { key: 'sort_order', header: 'Order', width: '80px' },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (std) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${std.is_active ? 'text-app-green' : 'text-app-muted'}`}>
          {std.is_active ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} />}
          {std.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(canEdit ? [{
      key: 'actions' as keyof Standard,
      header: 'Actions',
      width: '120px',
      render: (std: Standard) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(std)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(std)}
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
          <h1 className="text-2xl font-black text-app-text">Standards</h1>
          <p className="text-sm text-app-muted mt-1">Manage class standards (grades)</p>
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
              Add Standard
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          placeholder="Search standards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedStandards}
        isLoading={isLoading}
        emptyMessage="No standards found"
        keyExtractor={(std) => std.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredStandards.length}
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
        title={editingStandard ? 'Edit Standard' : 'Create Standard'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Standard ID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
              placeholder="e.g., class_10"
              disabled={!!editingStandard}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Standard Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Class 10"
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Grade Number</label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.grade_num}
                onChange={(e) => setFormData(prev => ({ ...prev, grade_num: parseInt(e.target.value) || 1 }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
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
              {editingStandard ? 'Save Changes' : 'Create Standard'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteTarget ? 'Delete Standard' : `Delete ${selectedIds.size} Standard${selectedIds.size > 1 ? 's' : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget ? (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This will also remove all curriculum entries for this standard.
            </p>
          ) : (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{selectedIds.size} standard{selectedIds.size > 1 ? 's' : ''}</strong>? This will also remove all related curriculum entries.
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
        title="Import Standards"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-app-muted">
            Paste JSON array of standards. Each standard should have: id, name, grade_num, sort_order, is_active
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[
  { "id": "class_10", "name": "Class 10", "grade_num": 10, "sort_order": 0, "is_active": true },
  { "id": "class_12", "name": "Class 12", "grade_num": 12, "sort_order": 1, "is_active": true }
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

export default StandardsPage
