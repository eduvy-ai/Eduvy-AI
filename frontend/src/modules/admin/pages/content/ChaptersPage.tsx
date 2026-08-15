// ─── Chapters Management Page ──────────────────────────────────
// Manage curriculum chapters

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Modal from '../../../../shared/components/Modal'
import ConfirmDialog from '../../../../shared/components/ConfirmDialog'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import { chaptersApi, adminApi } from '../../api'
import type { Chapter, Subject } from '../../types'
import {
  Book,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  CheckCircle,
  Clock,
  Eye,
  Archive,
  Warning,
} from '@phosphor-icons/react'

// Default form state
const defaultFormState = {
  board_id: '',
  standard_id: '',
  subject_id: '',
  chapter_number: 1,
  chapter_name: '',
  chapter_name_local: '',
  description: '',
  topics: [] as string[],
  is_active: true,
  content_status: 'draft' as 'draft' | 'review' | 'published',
}

const ChaptersPage: React.FC = () => {
  // Data state
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [boards, setBoards] = useState<{ id: string; name: string }[]>([])
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([])
  const [streams, setStreams] = useState<{ id: string; name: string }[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [boardFilter, setBoardFilter] = useState<string>('all')
  const [standardFilter, setStandardFilter] = useState<string>('all')
  const [streamFilter, setStreamFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: number } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  
  // Form state
  const [formData, setFormData] = useState(defaultFormState)

  // Refs to prevent duplicate fetches
  const curriculumLoadedRef = useRef(false)
  const lastChapterFilterRef = useRef<string>('')

  // Load curriculum options
  const loadCurriculumOptions = useCallback(async () => {
    if (curriculumLoadedRef.current) return
    curriculumLoadedRef.current = true
    try {
      const [boardsData, standardsData, streamsData, subjectsData] = await Promise.all([
        adminApi.boards.getAll(),
        adminApi.standards.getAll(),
        adminApi.streams.getAll(),
        adminApi.subjects.getAll(),
      ])
      setBoards(boardsData)
      setStandards(standardsData)
      setStreams(streamsData)
      setAllSubjects(subjectsData)
      setSubjects(subjectsData)
    } catch (error) {
      console.error('Failed to load curriculum options:', error)
    }
  }, [])

  // Load chapters
  const loadChapters = useCallback(async () => {
    // Dedupe by comparing filter state
    const filterKey = JSON.stringify({ boardFilter, standardFilter, streamFilter, subjectFilter, statusFilter, searchQuery })
    if (filterKey === lastChapterFilterRef.current) return
    lastChapterFilterRef.current = filterKey
    
    setIsLoading(true)
    try {
      const filters: { board_id?: string; standard_id?: string; subject_id?: string; stream_id?: string } = {}
      if (boardFilter !== 'all') filters.board_id = boardFilter
      if (standardFilter !== 'all') filters.standard_id = standardFilter
      if (streamFilter !== 'all') filters.stream_id = streamFilter
      if (subjectFilter !== 'all') filters.subject_id = subjectFilter
      
      const data = await chaptersApi.getAll(filters)
      
      // Apply client-side filters
      let filtered = data
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.content_status === statusFilter)
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(c => 
          c.chapter_name.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.topics?.some(t => t.toLowerCase().includes(query))
        )
      }
      
      setChapters(filtered)
    } catch (error) {
      console.error('Failed to load chapters:', error)
      setChapters([])
    } finally {
      setIsLoading(false)
    }
  }, [boardFilter, standardFilter, streamFilter, subjectFilter, statusFilter, searchQuery])

  // Filter subjects when board/standard/stream changes
  useEffect(() => {
    if (allSubjects.length === 0) return
    
    let filtered = allSubjects
    if (boardFilter !== 'all') {
      filtered = filtered.filter(s => s.board_id === boardFilter)
    }
    if (standardFilter !== 'all') {
      filtered = filtered.filter(s => s.standard_id === standardFilter)
    }
    if (streamFilter !== 'all') {
      filtered = filtered.filter(s => s.stream_id === streamFilter)
    }
    
    setSubjects(filtered)
    // Reset subject filter if current selection is no longer valid
    if (subjectFilter !== 'all' && !filtered.some(s => s.id === subjectFilter)) {
      setSubjectFilter('all')
    }
  }, [allSubjects, boardFilter, standardFilter, streamFilter])

  // Initial load
  useEffect(() => {
    loadCurriculumOptions()
  }, [loadCurriculumOptions])

  useEffect(() => {
    loadChapters()
  }, [loadChapters])

  // Refetch helper - resets the guard to force a fresh fetch
  const refetchChapters = () => {
    lastChapterFilterRef.current = ''
    loadChapters()
  }

  // Paginated data
  const paginatedChapters = chapters.slice((page - 1) * pageSize, page * pageSize)
  const totalCount = chapters.length

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setDeleteTarget({ type: 'bulk' })
    setDeleteError('')
    setShowDeleteConfirm(true)
  }

  const handleDelete = (id: number) => {
    setDeleteTarget({ type: 'single', id })
    setDeleteError('')
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    try {
      if (deleteTarget.type === 'bulk') {
        await chaptersApi.bulkDelete(Array.from(selectedIds))
        setSelectedIds(new Set())
      } else if (deleteTarget.id) {
        await chaptersApi.delete(deleteTarget.id)
      }
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      refetchChapters()
    } catch (error) {
      console.error('Failed to delete chapter(s):', error)
      setDeleteError('Failed to delete. Please try again.')
    }
  }

  // Open create modal
  const handleCreate = () => {
    setEditingChapter(null)
    setFormData({
      ...defaultFormState,
      board_id: boards.length > 0 ? boards[0].id : '',
      standard_id: standards.length > 0 ? standards[0].id : '',
      subject_id: subjects.length > 0 ? subjects[0].id : '',
    })
    setFormError('')
    setTopicInput('')
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
      description: chapter.description,
      topics: chapter.topics || [],
      is_active: chapter.is_active,
      content_status: chapter.content_status,
    })
    setFormError('')
    setTopicInput('')
    setShowModal(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.board_id) {
      setFormError('Please select a board')
      return
    }
    if (!formData.standard_id) {
      setFormError('Please select a standard')
      return
    }
    if (!formData.subject_id) {
      setFormError('Please select a subject')
      return
    }
    if (!formData.chapter_name.trim()) {
      setFormError('Chapter name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const chapterData = {
        board_id: formData.board_id,
        standard_id: formData.standard_id,
        subject_id: formData.subject_id,
        chapter_number: formData.chapter_number,
        chapter_name: formData.chapter_name,
        chapter_name_local: formData.chapter_name_local || undefined,
        description: formData.description,
        topics: formData.topics,
        is_active: formData.is_active,
        content_status: formData.content_status,
      }
      
      if (editingChapter) {
        await chaptersApi.update(editingChapter.id, chapterData)
      } else {
        await chaptersApi.create(chapterData as Omit<Chapter, 'id' | 'created_at'>)
      }
      
      setShowModal(false)
      refetchChapters()
    } catch (error: any) {
      setFormError(error.message || 'Failed to save chapter')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add topic
  const addTopic = () => {
    const topic = topicInput.trim()
    if (topic && !formData.topics.includes(topic)) {
      setFormData(prev => ({ ...prev, topics: [...prev.topics, topic] }))
    }
    setTopicInput('')
  }

  // Remove topic
  const removeTopic = (topic: string) => {
    setFormData(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) }))
  }

  const getStatusBadge = (status: 'draft' | 'review' | 'published') => {
    const styles = {
      draft: 'bg-app-yellow/10 text-app-yellow',
      review: 'bg-app-blue/10 text-app-blue',
      published: 'bg-app-green/10 text-app-green',
    }
    const icons = {
      draft: <Clock size={12} className="mr-1" />,
      review: <Eye size={12} className="mr-1" />,
      published: <CheckCircle size={12} className="mr-1" />,
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    )
  }

  // Stats
  const stats = {
    total: chapters.length,
    published: chapters.filter(c => c.content_status === 'published').length,
    draft: chapters.filter(c => c.content_status === 'draft').length,
    review: chapters.filter(c => c.content_status === 'review').length,
    inactive: chapters.filter(c => !c.is_active).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Book size={28} className="text-app-blue" />
            Chapters
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage curriculum chapters for all boards and subjects
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Chapter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="text-xs text-app-muted">Total Chapters</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.published}</p>
          <p className="text-xs text-app-muted">Published</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{stats.draft}</p>
          <p className="text-xs text-app-muted">Draft</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.review}</p>
          <p className="text-xs text-app-muted">In Review</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-red">{stats.inactive}</p>
          <p className="text-xs text-app-muted">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={boardFilter}
            onChange={e => { setBoardFilter(e.target.value); setPage(1) }}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Boards</option>
            {boards.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <select
          value={standardFilter}
          onChange={e => { setStandardFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Standards</option>
          {standards.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={streamFilter}
          onChange={e => { setStreamFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Streams</option>
          {streams.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={e => { setSubjectFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Subjects</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
        </select>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Chapters List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader size="lg" />
            <p className="text-app-muted mt-3 text-sm">Loading...</p>
          </div>
        ) : paginatedChapters.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            No chapters found. {totalCount === 0 && 'Add your first chapter to get started.'}
          </div>
        ) : (
          paginatedChapters.map(chapter => (
            <div
              key={chapter.id}
              className="bg-app-card rounded-xl border border-app-border p-4 hover:border-app-border/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(chapter.id)}
                  onChange={() => toggleSelect(chapter.id)}
                  className="rounded border-app-border mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-app-muted bg-app-card2 px-2 py-0.5 rounded">
                          Ch. {chapter.chapter_number}
                        </span>
                        {getStatusBadge(chapter.content_status)}
                        {!chapter.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs text-app-red bg-app-red/10 rounded">
                            <Archive size={12} className="mr-1" /> Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-app-text font-medium">{chapter.chapter_name}</p>
                      {chapter.chapter_name_local && (
                        <p className="text-sm text-app-muted">{chapter.chapter_name_local}</p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-app-muted">
                        <span>{chapter.board_name || chapter.board_id}</span>
                        <span>•</span>
                        <span>{chapter.standard_name || chapter.standard_id}</span>
                        <span>•</span>
                        <span>{chapter.subject_name || chapter.subject_id}</span>
                      </div>
                      
                      {chapter.topics && chapter.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {chapter.topics.slice(0, 5).map(topic => (
                            <span key={topic} className="px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded">
                              {topic}
                            </span>
                          ))}
                          {chapter.topics.length > 5 && (
                            <span className="px-2 py-0.5 text-xs text-app-muted">
                              +{chapter.topics.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(chapter)}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(chapter.id)}
                        className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
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
        totalPages={Math.ceil(totalCount / pageSize)}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingChapter ? 'Edit Chapter' : 'Add Chapter'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red flex items-center gap-2">
              <Warning size={16} /> {formError}
            </div>
          )}

          {/* Curriculum Selection */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Board *</label>
              <select
                value={formData.board_id}
                onChange={e => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
                disabled={!!editingChapter}
              >
                <option value="">Select Board...</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Standard *</label>
              <select
                value={formData.standard_id}
                onChange={e => setFormData(prev => ({ ...prev, standard_id: e.target.value }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
                disabled={!!editingChapter}
              >
                <option value="">Select Standard...</option>
                {standards.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Subject *</label>
              <select
                value={formData.subject_id}
                onChange={e => setFormData(prev => ({ ...prev, subject_id: e.target.value }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
                disabled={!!editingChapter}
              >
                <option value="">Select Subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chapter Number & Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Chapter Number *</label>
              <input
                type="number"
                value={formData.chapter_number}
                onChange={e => setFormData(prev => ({ ...prev, chapter_number: parseInt(e.target.value) || 1 }))}
                min={1}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Status</label>
              <select
                value={formData.content_status}
                onChange={e => setFormData(prev => ({ ...prev, content_status: e.target.value as 'draft' | 'review' | 'published' }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-app-border accent-app-green"
                />
                <span className="text-sm text-app-text">Active</span>
              </label>
            </div>
          </div>

          {/* Chapter Name */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Chapter Name *</label>
            <input
              type="text"
              value={formData.chapter_name}
              onChange={e => setFormData(prev => ({ ...prev, chapter_name: e.target.value }))}
              placeholder="Enter chapter name..."
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          {/* Chapter Name Local */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Chapter Name (Local Language)</label>
            <input
              type="text"
              value={formData.chapter_name_local}
              onChange={e => setFormData(prev => ({ ...prev, chapter_name_local: e.target.value }))}
              placeholder="अध्याय का नाम..."
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the chapter..."
              rows={3}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green resize-none"
            />
          </div>

          {/* Topics */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Topics</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTopic()
                  }
                }}
                placeholder="Add topic..."
                className="flex-1 px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
              />
              <button
                type="button"
                onClick={addTopic}
                className="px-3 py-2 bg-app-purple/10 text-app-purple rounded-lg text-sm hover:bg-app-purple/20 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.topics.map(topic => (
                  <span key={topic} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded">
                    {topic}
                    <button type="button" onClick={() => removeTopic(topic)} className="hover:text-app-red">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingChapter ? 'Update Chapter' : 'Create Chapter'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
          setDeleteError('')
        }}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'bulk' ? `Delete ${selectedIds.size} Chapters?` : 'Delete Chapter?'}
        message={
          <>
            {deleteTarget?.type === 'bulk' 
              ? 'This will permanently delete all selected chapters and their content.'
              : 'This will permanently delete this chapter and its content.'
            }
            {deleteError && (
              <p className="mt-2 text-app-red text-sm">{deleteError}</p>
            )}
          </>
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

export default ChaptersPage
