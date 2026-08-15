// ─── Moderation Page ──────────────────────────────────────────
// Manage and moderate doubts across all squads

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import { adminService } from '../../service'
import type { SquadDoubt, Squad } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import {
  MagnifyingGlass,
  Eye,
  Trash,
  X,
  Question,
  ChatTeardropText,
  UsersThree,
  Shield,
} from '@phosphor-icons/react'

const ModerationPage: React.FC = () => {
  const canEdit = useCanEdit('community')
  
  const [doubts, setDoubts] = useState<SquadDoubt[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSquad, setFilterSquad] = useState<number | ''>('')
  const [filterSubject, setFilterSubject] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedDoubt, setSelectedDoubt] = useState<SquadDoubt | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load doubts and squads
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [doubtsData, squadsResponse] = await Promise.all([
        adminApi.community.getDoubts(undefined, 500),
        adminApi.community.getSquads({ page_size: 200 }),
      ])
      setDoubts(doubtsData)
      setSquads(squadsResponse.items)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const set = new Set(doubts.map(d => d.subject).filter(Boolean))
    return Array.from(set).sort()
  }, [doubts])

  // Filter locally
  const filteredDoubts = useMemo(() => {
    return doubts.filter(d => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!d.question.toLowerCase().includes(q) && 
            !d.display_name.toLowerCase().includes(q) &&
            !(d.subject || '').toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterSquad && d.squad_id !== filterSquad) return false
      if (filterSubject && d.subject !== filterSubject) return false
      return true
    })
  }, [doubts, searchQuery, filterSquad, filterSubject])

  // Paginated doubts
  const totalPages = Math.ceil(filteredDoubts.length / pageSize)
  const paginatedDoubts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredDoubts.slice(start, start + pageSize)
  }, [filteredDoubts, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterSquad, filterSubject])

  // View doubt details
  const handleView = (doubt: SquadDoubt) => {
    setSelectedDoubt(doubt)
    setShowDetailModal(true)
  }

  // Delete confirmation
  const handleDeleteClick = (doubt: SquadDoubt) => {
    setSelectedDoubt(doubt)
    setSelectedIds(new Set([doubt.id]))
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
      await adminApi.community.bulkDeleteDoubts(Array.from(selectedIds))
      setDoubts(prev => prev.filter(d => !selectedIds.has(d.id)))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setSelectedDoubt(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete doubts')
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
    const pageIds = paginatedDoubts.map(d => d.id)
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
    setFilterSquad('')
    setFilterSubject('')
  }

  const hasFilters = searchQuery || filterSquad || filterSubject

  // Table columns
  const columns: TableColumn<SquadDoubt>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof SquadDoubt,
      header: (
        <input
          type="checkbox"
          checked={paginatedDoubts.length > 0 && paginatedDoubts.every(d => selectedIds.has(d.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (doubt: SquadDoubt) => (
        <input
          type="checkbox"
          checked={selectedIds.has(doubt.id)}
          onChange={() => toggleSelect(doubt.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    {
      key: 'question',
      header: 'Question',
      render: (doubt) => (
        <div className="max-w-md">
          <p className="text-sm text-app-text line-clamp-2">{doubt.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-app-muted">by {doubt.display_name}</span>
            {doubt.subject && (
              <span className="text-xs bg-app-blue/10 text-app-blue px-2 py-0.5 rounded">
                {doubt.subject}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'squad_name' as keyof SquadDoubt,
      header: 'Squad',
      width: '150px',
      render: (doubt: SquadDoubt) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <UsersThree size={14} className="text-app-muted" />
          {doubt.squad_name || `Squad ${doubt.squad_id}`}
        </span>
      ),
    },
    {
      key: 'answer_count',
      header: 'Answers',
      width: '100px',
      render: (doubt) => (
        <span className="flex items-center gap-1 text-app-text text-sm">
          <ChatTeardropText size={14} className="text-app-muted" />
          {doubt.answer_count}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Posted',
      width: '120px',
      render: (doubt) => (
        <span className="text-xs text-app-muted">
          {adminService.getRelativeTime(doubt.created_at)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof SquadDoubt,
      header: 'Actions',
      width: '100px',
      render: (doubt: SquadDoubt) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(doubt)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          {canEdit && (
            <button
              onClick={() => handleDeleteClick(doubt)}
              className="p-1.5 text-app-muted hover:text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash size={16} />
            </button>
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
            <Shield size={28} className="text-app-orange" />
            Moderation
          </h1>
          <p className="text-sm text-app-muted mt-1">
            {filteredDoubts.length} doubts {hasFilters && '(filtered)'}
          </p>
        </div>
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
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm placeholder:text-app-muted focus:border-app-orange focus:outline-none"
            />
          </div>
          <select
            value={filterSquad}
            onChange={(e) => setFilterSquad(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm focus:border-app-orange focus:outline-none"
          >
            <option value="">All Squads</option>
            {squads.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-app-text text-sm focus:border-app-orange focus:outline-none"
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
          data={paginatedDoubts}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No doubts found"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredDoubts.length}
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
        title="Doubt Details"
      >
        {selectedDoubt && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-app-purple/10 border border-app-purple/25 flex items-center justify-center shrink-0">
                <Question size={24} className="text-app-purple" />
              </div>
              <div className="flex-1">
                <p className="text-app-text">{selectedDoubt.question}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-app-muted">by {selectedDoubt.display_name}</span>
                  {selectedDoubt.subject && (
                    <span className="text-xs bg-app-blue/10 text-app-blue px-2 py-0.5 rounded">
                      {selectedDoubt.subject}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-app-border">
              <div>
                <label className="text-xs text-app-muted">Squad</label>
                <p className="text-sm text-app-text mt-1">{selectedDoubt.squad_name || `Squad ${selectedDoubt.squad_id}`}</p>
              </div>
              <div>
                <label className="text-xs text-app-muted">Answers</label>
                <p className="text-sm text-app-text mt-1">{selectedDoubt.answer_count}</p>
              </div>
              <div>
                <label className="text-xs text-app-muted">Posted</label>
                <p className="text-sm text-app-text mt-1">
                  {adminService.formatDateTime(selectedDoubt.created_at)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {canEdit && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowDetailModal(false)
                    handleDeleteClick(selectedDoubt)
                  }}
                >
                  Delete Doubt
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Doubt(s)"
      >
        <div className="space-y-4">
          <p className="text-app-muted">
            Are you sure you want to delete {selectedIds.size > 1 ? `${selectedIds.size} doubts` : 'this doubt'}? 
            This will also delete all answers. This action cannot be undone.
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

export default ModerationPage
