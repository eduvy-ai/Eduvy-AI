// ─── Chapters Management Page ──────────────────────────────────
// CRUD interface for chapters with filtering by board/standard/subject

import React, { useEffect, useState, useMemo } from 'react'
import { useChapters, useBoards, useStandards, useSubjects, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { Chapter, Stream } from '../../types'
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
  BookOpen,
  X,
} from '@phosphor-icons/react'

const ChaptersPage: React.FC = () => {
  const { chapters, fetchChapters, addChapter, updateChapter, removeChapter } = useChapters()
  const { boards, fetchBoards } = useBoards()
  const { standards, fetchStandards } = useStandards()
  const { subjects, fetchSubjects } = useSubjects()
  const canEdit = useCanEdit('academics')
  
  // Local streams state (not in Redux)
  const [streams, setStreams] = useState<Stream[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null)
  const [formError, setFormError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Filters
  const [filterBoard, setFilterBoard] = useState('')
  const [filterStandard, setFilterStandard] = useState('')
  const [filterStream, setFilterStream] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    board_id: '',
    standard_id: '',
    subject_id: '',
    chapter_number: 1,
    chapter_name: '',
    chapter_name_local: '',
    description: '',
    topics: '',
    is_active: true,
    content_status: 'draft' as 'draft' | 'review' | 'published',
  })

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [, , , streamsData] = await Promise.all([
          fetchBoards(),
          fetchStandards(),
          fetchSubjects({}), // Load ALL subjects initially
          adminApi.streams.getAll(), // Load streams
        ])
        setStreams(streamsData)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchBoards, fetchStandards, fetchSubjects])

  // Reload subjects when board+standard+stream changes (to filter subject list)
  useEffect(() => {
    if (filterBoard || filterStandard || filterStream) {
      const filters: { board_id?: string; standard_id?: string; stream_id?: string } = {}
      if (filterBoard) filters.board_id = filterBoard
      if (filterStandard) filters.standard_id = filterStandard
      if (filterStream) filters.stream_id = filterStream
      fetchSubjects(filters)
    }
  }, [filterBoard, filterStandard, filterStream, fetchSubjects])

  // Load chapters when filters change
  useEffect(() => {
    const loadChapters = async () => {
      setIsLoading(true)
      try {
        const filters: { board_id?: string; standard_id?: string; subject_id?: string; stream_id?: string } = {}
        if (filterBoard) filters.board_id = filterBoard
        if (filterStandard) filters.standard_id = filterStandard
        if (filterStream) filters.stream_id = filterStream
        if (filterSubject) filters.subject_id = filterSubject
        await fetchChapters(filters)
      } finally {
        setIsLoading(false)
      }
    }
    loadChapters()
  }, [filterBoard, filterStandard, filterStream, filterSubject, fetchChapters])

  // Filter chapters by search
  const filteredChapters = chapters.filter(chapter =>
    chapter.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chapter.subject_name || chapter.subject_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chapter.board_name || chapter.board_id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Paginated data
  const totalPages = Math.ceil(filteredChapters.length / pageSize)
  const paginatedChapters = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredChapters.slice(start, start + pageSize)
  }, [filteredChapters, currentPage, pageSize])

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterBoard, filterStandard, filterSubject])

  // Open create modal
  const handleCreate = () => {
    setEditingChapter(null)
    const boardId = filterBoard || (boards[0]?.id || '')
    const standardId = filterStandard || (standards[0]?.id || '')
    setFormData({
      board_id: boardId,
      standard_id: standardId,
      subject_id: filterSubject || '',
      chapter_number: chapters.length + 1,
      chapter_name: '',
      chapter_name_local: '',
      description: '',
      topics: '',
      is_active: true,
      content_status: 'draft',
    })
    // Load subjects for selected board+standard
    if (boardId && standardId) {
      fetchSubjects({ board_id: boardId, standard_id: standardId })
    }
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setFormData({
      board_id: chapter.board_id,
      standard_id: chapter.standard_id,
      subject_id: chapter.subject_id,
      chapter_number: chapter.chapter_number,
      chapter_name: chapter.chapter_name,
      chapter_name_local: chapter.chapter_name_local || '',
      description: chapter.description || '',
      topics: chapter.topics?.join(', ') || '',
      is_active: chapter.is_active,
      content_status: chapter.content_status || 'draft',
    })
    setFormError('')
    setShowModal(true)
  }

  // Open delete confirm
  const handleDeleteClick = (chapter: Chapter) => {
    setDeleteTarget(chapter)
    setShowDeleteConfirm(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.board_id.trim()) {
      setFormError('Board is required')
      return
    }
    if (!formData.standard_id.trim()) {
      setFormError('Standard is required')
      return
    }
    if (!formData.subject_id.trim()) {
      setFormError('Subject is required')
      return
    }
    if (!formData.chapter_name.trim()) {
      setFormError('Chapter name is required')
      return
    }
    if (formData.chapter_number < 1) {
      setFormError('Chapter number must be at least 1')
      return
    }

    const topicsArray = formData.topics
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    try {
      if (editingChapter) {
        const updated = await adminApi.chapters.update(editingChapter.id, {
          chapter_name: formData.chapter_name,
          chapter_name_local: formData.chapter_name_local,
          description: formData.description,
          topics: topicsArray,
          is_active: formData.is_active,
          content_status: formData.content_status,
        })
        updateChapter(updated)
      } else {
        const created = await adminApi.chapters.create({
          board_id: formData.board_id,
          standard_id: formData.standard_id,
          subject_id: formData.subject_id,
          chapter_number: formData.chapter_number,
          chapter_name: formData.chapter_name,
          chapter_name_local: formData.chapter_name_local,
          description: formData.description,
          topics: topicsArray,
          is_active: formData.is_active,
          content_status: formData.content_status,
        })
        addChapter(created)
      }
      setShowModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save chapter')
    }
  }

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.chapters.delete(deleteTarget.id)
      removeChapter(deleteTarget.id)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete chapter')
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
    const pageIds = paginatedChapters.map(c => c.id)
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
      await adminApi.chapters.bulkDelete(Array.from(selectedIds))
      selectedIds.forEach(id => removeChapter(id))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete chapters')
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
    setFilterStream('')
    setFilterSubject('')
  }

  const hasFilters = filterBoard || filterStandard || filterStream || filterSubject

  // Table columns
  const columns: TableColumn<Chapter>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof Chapter,
      header: (
        <input
          type="checkbox"
          checked={paginatedChapters.length > 0 && paginatedChapters.every(c => selectedIds.has(c.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (chapter: Chapter) => (
        <input
          type="checkbox"
          checked={selectedIds.has(chapter.id)}
          onChange={() => toggleSelect(chapter.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    { key: 'chapter_number', header: '#', width: '60px' },
    { 
      key: 'chapter_name', 
      header: 'Chapter',
      render: (chapter) => (
        <div>
          <div className="font-medium text-app-text">{chapter.chapter_name}</div>
          {chapter.description && (
            <div className="text-xs text-app-muted truncate max-w-xs">{chapter.description}</div>
          )}
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', width: '120px' },
    { key: 'board', header: 'Board', width: '100px' },
    { key: 'standard', header: 'Class', width: '100px' },
    {
      key: 'content_status',
      header: 'Status',
      width: '100px',
      render: (chapter) => {
        const statusColors = {
          draft: 'text-app-muted bg-app-muted/10',
          review: 'text-app-yellow bg-app-yellow/10',
          published: 'text-app-green bg-app-green/10',
        }
        const status = chapter.content_status || 'draft'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[status]}`}>
            {status}
          </span>
        )
      },
    },
    {
      key: 'is_active',
      header: 'Active',
      width: '80px',
      render: (chapter) => (
        chapter.is_active ? 
          <CheckCircle size={18} weight="fill" className="text-app-green" /> : 
          <XCircle size={18} className="text-app-muted" />
      ),
    },
    ...(canEdit ? [{
      key: 'actions' as keyof Chapter,
      header: 'Actions',
      width: '100px',
      render: (chapter: Chapter) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(chapter)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(chapter)}
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
          <h1 className="text-2xl font-black text-app-text">Chapters</h1>
          <p className="text-sm text-app-muted mt-1">
            {chapters.length} chapters {hasFilters && '(filtered)'}
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
              Add Chapter
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filterBoard}
            onChange={(e) => {
              setFilterBoard(e.target.value)
              setFilterStream('')
              setFilterSubject('') // Reset subject when board changes
            }}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Boards</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
          <select
            value={filterStandard}
            onChange={(e) => {
              setFilterStandard(e.target.value)
              setFilterStream('')
              setFilterSubject('') // Reset subject when standard changes
            }}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Standards</option>
            {standards.map(std => (
              <option key={std.id} value={std.id}>{std.name}</option>
            ))}
          </select>
          <select
            value={filterStream}
            onChange={(e) => {
              setFilterStream(e.target.value)
              setFilterSubject('') // Reset subject when stream changes
            }}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Streams</option>
            {streams.map(stream => (
              <option key={stream.id} value={stream.id}>{stream.name}</option>
            ))}
          </select>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          placeholder="Search chapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedChapters}
        isLoading={isLoading}
        emptyMessage={hasFilters ? "No chapters match the filters" : "No chapters found. Add your first chapter!"}
        keyExtractor={(chapter) => chapter.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredChapters.length}
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
        title={editingChapter ? 'Edit Chapter' : 'Create Chapter'}
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
                onChange={(e) => {
                  const newBoardId = e.target.value
                  setFormData(prev => ({ ...prev, board_id: newBoardId, subject_id: '' }))
                  if (newBoardId && formData.standard_id) {
                    fetchSubjects({ board_id: newBoardId, standard_id: formData.standard_id })
                  }
                }}
                disabled={!!editingChapter}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
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
                onChange={(e) => {
                  const newStandardId = e.target.value
                  setFormData(prev => ({ ...prev, standard_id: newStandardId, subject_id: '' }))
                  if (formData.board_id && newStandardId) {
                    fetchSubjects({ board_id: formData.board_id, standard_id: newStandardId })
                  }
                }}
                disabled={!!editingChapter}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              >
                <option value="">Select Standard</option>
                {standards.map(std => (
                  <option key={std.id} value={std.id}>{std.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Subject</label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                disabled={!!editingChapter}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Chapter #</label>
              <input
                type="number"
                min="1"
                value={formData.chapter_number}
                onChange={(e) => setFormData(prev => ({ ...prev, chapter_number: parseInt(e.target.value) || 1 }))}
                disabled={!!editingChapter}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-app-muted mb-1.5">Chapter Name</label>
              <input
                type="text"
                value={formData.chapter_name}
                onChange={(e) => setFormData(prev => ({ ...prev, chapter_name: e.target.value }))}
                placeholder="e.g., Chemical Reactions and Equations"
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the chapter..."
              rows={2}
              className="w-full p-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Topics (comma-separated)</label>
            <input
              type="text"
              value={formData.topics}
              onChange={(e) => setFormData(prev => ({ ...prev, topics: e.target.value }))}
              placeholder="Topic 1, Topic 2, Topic 3"
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Content Status</label>
              <select
                value={formData.content_status}
                onChange={(e) => setFormData(prev => ({ ...prev, content_status: e.target.value as any }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3 h-10">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
                />
                <label htmlFor="is_active" className="text-sm text-app-text">Active</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingChapter ? 'Save Changes' : 'Create Chapter'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteTarget ? 'Delete Chapter' : `Delete ${selectedIds.size} Chapter${selectedIds.size > 1 ? 's' : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {deleteTarget ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-app-card2 rounded-xl">
                <BookOpen size={24} className="text-app-muted shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-app-text">{deleteTarget.chapter_name}</div>
                  <div className="text-xs text-app-muted">
                    Chapter {deleteTarget.chapter_number} · {deleteTarget.subject_name || deleteTarget.subject_id} · {deleteTarget.board_name || deleteTarget.board_id}
                  </div>
                </div>
              </div>
              <p className="text-sm text-app-muted">
                Are you sure you want to delete this chapter? This action cannot be undone.
              </p>
            </>
          ) : (
            <p className="text-app-text">
              Are you sure you want to delete <strong>{selectedIds.size} chapter{selectedIds.size > 1 ? 's' : ''}</strong>? This action cannot be undone.
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
              Delete{deleteTarget ? ' Chapter' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ChaptersPage
