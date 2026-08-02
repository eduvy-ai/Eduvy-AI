// ─── Assessments Management Page ──────────────────────────────────
// View and manage quizzes and assessments

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
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
  ChartBar,
  Users,
  Warning,
} from '@phosphor-icons/react'

interface Assessment {
  id: string
  title: string
  subject: string
  chapter?: string
  type: 'quiz' | 'test' | 'practice' | 'exam'
  difficulty: 'easy' | 'medium' | 'hard'
  question_count: number
  time_limit?: number // minutes
  attempts: number
  avg_score: number
  pass_rate: number
  status: 'draft' | 'active' | 'archived'
  created_at: string
  created_by?: string
}

interface AssessmentStats {
  total: number
  active: number
  draft: number
  total_attempts: number
  avg_score: number
}

const AssessmentsPage: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [stats, setStats] = useState<AssessmentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  const loadAssessments = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockAssessments: Assessment[] = [
        {
          id: '1',
          title: 'Mathematics Chapter 1 Quiz',
          subject: 'Mathematics',
          chapter: 'Algebra Basics',
          type: 'quiz',
          difficulty: 'easy',
          question_count: 10,
          time_limit: 15,
          attempts: 234,
          avg_score: 78.5,
          pass_rate: 85,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Science Unit Test',
          subject: 'Science',
          chapter: 'Physics - Motion',
          type: 'test',
          difficulty: 'medium',
          question_count: 25,
          time_limit: 45,
          attempts: 156,
          avg_score: 72.3,
          pass_rate: 78,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'English Grammar Practice',
          subject: 'English',
          type: 'practice',
          difficulty: 'easy',
          question_count: 20,
          attempts: 89,
          avg_score: 85.2,
          pass_rate: 92,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: '4',
          title: 'History Final Exam',
          subject: 'History',
          type: 'exam',
          difficulty: 'hard',
          question_count: 50,
          time_limit: 90,
          attempts: 0,
          avg_score: 0,
          pass_rate: 0,
          status: 'draft',
          created_at: new Date().toISOString(),
        },
        {
          id: '5',
          title: 'Geography Map Quiz',
          subject: 'Geography',
          type: 'quiz',
          difficulty: 'medium',
          question_count: 15,
          time_limit: 20,
          attempts: 312,
          avg_score: 68.9,
          pass_rate: 71,
          status: 'archived',
          created_at: new Date().toISOString(),
        },
      ]

      setAssessments(mockAssessments)
      setTotalCount(mockAssessments.length)
      setStats({
        total: 5,
        active: 3,
        draft: 1,
        total_attempts: 791,
        avg_score: 76.2,
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, typeFilter, statusFilter, searchQuery])

  useEffect(() => {
    loadAssessments()
  }, [loadAssessments])

  const toggleSelect = (id: string) => {
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

  const getTypeBadge = (type: Assessment['type']) => {
    const styles = {
      quiz: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      test: 'bg-app-purple/10 text-app-purple border-app-purple/25',
      practice: 'bg-app-green/10 text-app-green border-app-green/25',
      exam: 'bg-app-red/10 text-app-red border-app-red/25',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[type]}`}>
        {type}
      </span>
    )
  }

  const getDifficultyBadge = (difficulty: Assessment['difficulty']) => {
    const styles = {
      easy: 'text-app-green',
      medium: 'text-app-yellow',
      hard: 'text-app-red',
    }
    return <span className={`text-xs font-medium ${styles[difficulty]}`}>{difficulty}</span>
  }

  const getStatusBadge = (status: Assessment['status']) => {
    const styles = {
      draft: 'bg-app-muted/10 text-app-muted border-app-muted/25',
      active: 'bg-app-green/10 text-app-green border-app-green/25',
      archived: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
    }
    const icons = {
      draft: <Clock size={12} />,
      active: <CheckCircle size={12} />,
      archived: <XCircle size={12} />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    )
  }

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
          onClick={() => alert('Create assessment')}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Create Assessment
        </button>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Assessments API not yet implemented.
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <p className="text-2xl font-bold text-app-text">{stats.total}</p>
            <p className="text-xs text-app-muted">Total Assessments</p>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <p className="text-2xl font-bold text-app-green">{stats.active}</p>
            <p className="text-xs text-app-muted">Active</p>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <p className="text-2xl font-bold text-app-muted">{stats.draft}</p>
            <p className="text-xs text-app-muted">Drafts</p>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <p className="text-2xl font-bold text-app-blue">{stats.total_attempts}</p>
            <p className="text-xs text-app-muted">Total Attempts</p>
          </div>
          <div className="bg-app-card rounded-xl border border-app-border p-4">
            <p className="text-2xl font-bold text-app-purple">{stats.avg_score}%</p>
            <p className="text-xs text-app-muted">Avg Score</p>
          </div>
        </div>
      )}

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
            onChange={e => setTypeFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="test">Test</option>
            <option value="practice">Practice</option>
            <option value="exam">Exam</option>
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {selectedIds.size > 0 && (
          <button
            onClick={() => alert('Delete selected')}
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
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Attempts</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Avg Score</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Status</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-app-green border-t-transparent rounded-full" />
                  </div>
                </td>
              </tr>
            ) : assessments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-app-muted">
                  No assessments found
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
                        <span>{assessment.subject}</span>
                        {assessment.chapter && (
                          <>
                            <span>•</span>
                            <span>{assessment.chapter}</span>
                          </>
                        )}
                        <span>•</span>
                        {getDifficultyBadge(assessment.difficulty)}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{getTypeBadge(assessment.type)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-app-text">{assessment.question_count}</span>
                      {assessment.time_limit && (
                        <span className="text-xs text-app-muted flex items-center gap-1">
                          <Clock size={12} />
                          {assessment.time_limit}m
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-text flex items-center gap-1">
                      <Users size={14} className="text-app-muted" />
                      {assessment.attempts}
                    </span>
                  </td>
                  <td className="p-3">
                    {assessment.attempts > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-app-text">{assessment.avg_score}%</p>
                        <p className="text-xs text-app-muted">{assessment.pass_rate}% pass</p>
                      </div>
                    ) : (
                      <span className="text-sm text-app-muted">—</span>
                    )}
                  </td>
                  <td className="p-3">{getStatusBadge(assessment.status)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alert('Preview assessment')}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => alert('View analytics')}
                        className="p-1.5 text-app-purple hover:bg-app-purple/10 rounded-lg transition-colors"
                        title="Analytics"
                      >
                        <ChartBar size={14} />
                      </button>
                      <button
                        onClick={() => alert('Duplicate assessment')}
                        className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => alert('Edit assessment')}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => alert('Delete assessment')}
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
        totalPages={Math.ceil(totalCount / pageSize)}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Assessments management endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default AssessmentsPage
