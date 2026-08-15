// ─── Assessments Management Page ──────────────────────────────────
// View and manage quizzes and assessments

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import ConfirmDialog from '../../../../shared/components/ConfirmDialog'
import { useAssessments, useBoards } from '../../hooks'
import { assessmentsApi } from '../../api'
import type { AssessmentType, AssessmentStatus, AssessmentDifficulty } from '../../types'
import {
  Exam,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUp,
  Archive,
} from '@phosphor-icons/react'

const AssessmentsPage: React.FC = () => {
  const { assessments, total, isLoading, fetchAssessments } = useAssessments()
  const { boards, fetchBoards } = useBoards()
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [boardFilter, setBoardFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: number } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  
  // Toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'info' | 'error'>('info')

  // Refs to prevent duplicate fetches
  const boardsLoadedRef = useRef(false)
  const fetchAssessmentsRef = useRef(fetchAssessments)
  const fetchBoardsRef = useRef(fetchBoards)
  
  // Keep refs updated
  fetchAssessmentsRef.current = fetchAssessments
  fetchBoardsRef.current = fetchBoards

  // Load boards once on mount
  useEffect(() => {
    if (!boardsLoadedRef.current) {
      boardsLoadedRef.current = true
      fetchBoardsRef.current()
    }
  }, [])

  // Load assessments with filters
  useEffect(() => {
    const params: Record<string, unknown> = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }
    if (typeFilter !== 'all') params.type = typeFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (boardFilter !== 'all') params.board_id = boardFilter
    if (searchQuery) params.search = searchQuery
    
    fetchAssessmentsRef.current(params)
  }, [page, pageSize, typeFilter, statusFilter, boardFilter, searchQuery])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === assessments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(assessments.map(a => a.id)))
    }
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
        await assessmentsApi.bulkDelete(Array.from(selectedIds))
        setSelectedIds(new Set())
      } else if (deleteTarget.id) {
        await assessmentsApi.delete(deleteTarget.id)
      }
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      fetchAssessments({ limit: pageSize, offset: (page - 1) * pageSize })
    } catch (error) {
      console.error('Failed to delete assessment(s):', error)
      setDeleteError('Failed to delete. Please try again.')
    }
  }
  
  // Show toast helper
  const showToastMessage = (message: string, type: 'info' | 'error' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const handlePublish = async (id: number) => {
    try {
      await assessmentsApi.publish(id)
      fetchAssessments({ limit: pageSize, offset: (page - 1) * pageSize })
    } catch (error) {
      console.error('Failed to publish assessment:', error)
      showToastMessage('Failed to publish assessment', 'error')
    }
  }

  const handleArchive = async (id: number) => {
    try {
      await assessmentsApi.archive(id)
      fetchAssessments({ limit: pageSize, offset: (page - 1) * pageSize })
    } catch (error) {
      console.error('Failed to archive assessment:', error)
      showToastMessage('Failed to archive assessment', 'error')
    }
  }

  const getTypeBadge = (type: AssessmentType) => {
    const styles: Record<AssessmentType, string> = {
      quiz: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      mock_test: 'bg-app-purple/10 text-app-purple border-app-purple/25',
      practice: 'bg-app-green/10 text-app-green border-app-green/25',
      assignment: 'bg-app-orange/10 text-app-orange border-app-orange/25',
    }
    const labels: Record<AssessmentType, string> = {
      quiz: 'Quiz',
      mock_test: 'Mock Test',
      practice: 'Practice',
      assignment: 'Assignment',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[type]}`}>
        {labels[type]}
      </span>
    )
  }

  const getDifficultyBadge = (difficulty: AssessmentDifficulty) => {
    const styles: Record<AssessmentDifficulty, string> = {
      easy: 'text-app-green',
      medium: 'text-app-yellow',
      hard: 'text-app-red',
      mixed: 'text-app-purple',
    }
    return <span className={`text-xs font-medium ${styles[difficulty]}`}>{difficulty}</span>
  }

  const getStatusBadge = (status: AssessmentStatus) => {
    const styles: Record<AssessmentStatus, string> = {
      draft: 'bg-app-muted/10 text-app-muted border-app-muted/25',
      published: 'bg-app-green/10 text-app-green border-app-green/25',
      archived: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
    }
    const icons: Record<AssessmentStatus, JSX.Element> = {
      draft: <Clock size={12} />,
      published: <CheckCircle size={12} />,
      archived: <XCircle size={12} />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    )
  }

  // Stats computed from data
  const stats = useMemo(() => ({
    total: total,
    published: assessments.filter(a => a.status === 'published').length,
    draft: assessments.filter(a => a.status === 'draft').length,
    totalQuestions: assessments.reduce((acc, a) => acc + a.question_count, 0),
  }), [total, assessments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Exam size={28} className="text-app-purple" />
            Assessments
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage quizzes, tests, and exams
          </p>
        </div>
        <button
          onClick={() => showToastMessage('Create assessment - Coming soon')}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Create Assessment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="text-xs text-app-muted">Total Assessments</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.published}</p>
          <p className="text-xs text-app-muted">Published (this page)</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-muted">{stats.draft}</p>
          <p className="text-xs text-app-muted">Drafts</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-purple">{stats.totalQuestions}</p>
          <p className="text-xs text-app-muted">Total Questions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="mock_test">Mock Test</option>
            <option value="practice">Practice</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={boardFilter}
          onChange={e => { setBoardFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Boards</option>
          {boards.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
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

      {/* Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border text-left">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={assessments.length > 0 && selectedIds.size === assessments.length}
                  onChange={toggleSelectAll}
                  className="rounded border-app-border"
                />
              </th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Assessment</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Type</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Questions</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Time</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Marks</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Status</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <Loader size="md" />
                    <p className="text-app-muted mt-3 text-sm">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : assessments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-app-muted">
                  No assessments found. {total === 0 && 'Create your first assessment to get started.'}
                </td>
              </tr>
            ) : (
              assessments.map(assessment => (
                <tr key={assessment.id} className="border-b border-app-border/50 hover:bg-app-card2 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(assessment.id)}
                      onChange={() => toggleSelect(assessment.id)}
                      className="rounded border-app-border"
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-app-text">{assessment.title}</p>
                      <div className="flex items-center gap-2 text-xs text-app-muted mt-1">
                        {assessment.subject_name && <span>{assessment.subject_name}</span>}
                        {assessment.chapter_name && (
                          <>
                            <span>•</span>
                            <span>{assessment.chapter_name}</span>
                          </>
                        )}
                        <span>•</span>
                        {getDifficultyBadge(assessment.difficulty)}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{getTypeBadge(assessment.type)}</td>
                  <td className="p-3">
                    <span className="text-sm text-app-text">{assessment.question_count}</span>
                  </td>
                  <td className="p-3">
                    {assessment.time_limit_min ? (
                      <span className="text-xs text-app-muted flex items-center gap-1">
                        <Clock size={12} />
                        {assessment.time_limit_min}m
                      </span>
                    ) : (
                      <span className="text-xs text-app-muted">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <span className="text-app-text">{assessment.total_marks}</span>
                      {assessment.pass_marks > 0 && (
                        <span className="text-xs text-app-muted ml-1">(pass: {assessment.pass_marks})</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{getStatusBadge(assessment.status)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => showToastMessage('Preview assessment - Coming soon')}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      {assessment.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(assessment.id)}
                          className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                          title="Publish"
                        >
                          <ArrowUp size={14} />
                        </button>
                      )}
                      {assessment.status === 'published' && (
                        <button
                          onClick={() => handleArchive(assessment.id)}
                          className="p-1.5 text-app-yellow hover:bg-app-yellow/10 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => showToastMessage('Duplicate assessment - Coming soon')}
                        className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => showToastMessage('Edit assessment - Coming soon')}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(assessment.id)}
                        className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
          setDeleteError('')
        }}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'bulk' ? `Delete ${selectedIds.size} Assessments?` : 'Delete Assessment?'}
        message={
          <>
            {deleteTarget?.type === 'bulk' 
              ? 'This will permanently delete all selected assessments.'
              : 'This will permanently delete this assessment.'
            }
            {deleteError && (
              <p className="mt-2 text-app-red text-sm">{deleteError}</p>
            )}
          </>
        }
        confirmText="Delete"
        variant="danger"
      />

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-6 right-6 z-[250] px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          toastType === 'error' ? 'bg-app-red text-white' : 'bg-app-blue text-white'
        }`}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default AssessmentsPage
