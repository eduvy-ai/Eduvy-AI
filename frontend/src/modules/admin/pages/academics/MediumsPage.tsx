// ─── Mediums Management Page ───────────────────────────────────
// CRUD interface for teaching mediums/languages

import React, { useEffect, useState, useMemo } from 'react'
import { useMediums, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { Medium } from '../../types'
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

const MediumsPage: React.FC = () => {
  const { mediums, fetchMediums, addMedium, updateMedium, removeMedium } = useMediums()
  const canEdit = useCanEdit('academics')
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingMedium, setEditingMedium] = useState<Medium | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Medium | null>(null)
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
    sort_order: 0,
    is_active: true,
  })

  // Load mediums on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchMediums()
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchMediums])

  // Filter mediums by search
  const filteredMediums = mediums.filter(med =>
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Paginated data
  const totalPages = Math.ceil(filteredMediums.length / pageSize)
  const paginatedMediums = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMediums.slice(start, start + pageSize)
  }, [filteredMediums, currentPage, pageSize])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Open create modal
  const handleCreate = () => {
    setEditingMedium(null)
    setFormData({ id: '', name: '', sort_order: mediums.length, is_active: true })
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (med: Medium) => {
    setEditingMedium(med)
    setFormData({
      id: med.id,
      name: med.name,
      sort_order: med.sort_order,
      is_active: med.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  // Open delete confirm
  const handleDeleteClick = (med: Medium) => {
    setDeleteTarget(med)
    setShowDeleteConfirm(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.id.trim()) {
      setFormError('Medium ID is required')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Medium name is required')
      return
    }

    try {
      if (editingMedium) {
        const updated = await adminApi.mediums.update(editingMedium.id, {
          name: formData.name,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        updateMedium(updated)
      } else {
        const created = await adminApi.mediums.create({
          id: formData.id,
          name: formData.name,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        addMedium(created)
      }
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save medium')
    }
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.mediums.delete(deleteTarget.id)
      removeMedium(deleteTarget.id)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete medium')
    }
  }

  // Import mediums
  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson)
      const mediums = Array.isArray(data) ? data : [data]
      await adminApi.mediums.bulkImport(mediums)
      await fetchMediums()
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
    const pageIds = paginatedMediums.map(m => m.id)
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
      await adminApi.mediums.bulkDelete(Array.from(selectedIds))
      selectedIds.forEach(id => removeMedium(id))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete mediums')
    }
  }

  // Open bulk delete confirm
  const handleBulkDeleteClick = () => {
    setDeleteTarget(null)
    setShowDeleteConfirm(true)
  }

  // Table columns
  const columns: TableColumn<Medium>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof Medium,
      header: (
        <input
          type="checkbox"
          checked={paginatedMediums.length > 0 && paginatedMediums.every(m => selectedIds.has(m.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (med: Medium) => (
        <input
          type="checkbox"
          checked={selectedIds.has(med.id)}
          onChange={() => toggleSelect(med.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    { key: 'id', header: 'ID', width: '150px' },
    { key: 'name', header: 'Name' },
    { key: 'sort_order', header: 'Order', width: '80px' },
    {
      key: 'is_active',
      header: 'Status',
      width: '100px',
      render: (med) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${med.is_active ? 'text-app-green' : 'text-app-muted'}`}>
          {med.is_active ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} />}
          {med.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(canEdit ? [{
      key: 'actions' as keyof Medium,
      header: 'Actions',
      width: '120px',
      render: (med: Medium) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(med)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(med)}
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
          <h1 className="text-2xl font-black text-app-text">Mediums</h1>
          <p className="text-sm text-app-muted mt-1">Manage teaching mediums/languages</p>
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
              Add Medium
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          placeholder="Search mediums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedMediums}
        isLoading={isLoading}
        emptyMessage="No mediums found"
        keyExtractor={(med) => med.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredMediums.length}
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
        title={editingMedium ? 'Edit Medium' : 'Create Medium'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Medium ID</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
              placeholder="e.g., english"
              disabled={!!editingMedium}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Medium Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., English"
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
              {editingMedium ? 'Save Changes' : 'Create Medium'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteTarget ? 'Delete Medium' : `Delete ${selectedIds.size} Medium${selectedIds.size > 1 ? 's' : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget ? (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This will also remove all curriculum entries for this medium.
            </p>
          ) : (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{selectedIds.size} medium{selectedIds.size > 1 ? 's' : ''}</strong>? This will also remove all related curriculum entries.
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
        title="Import Mediums"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-app-muted">
            Paste JSON array of mediums. Each medium should have: id, name, sort_order, is_active
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[
  { "id": "english", "name": "English", "sort_order": 0, "is_active": true },
  { "id": "hindi", "name": "Hindi", "sort_order": 1, "is_active": true }
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

export default MediumsPage
