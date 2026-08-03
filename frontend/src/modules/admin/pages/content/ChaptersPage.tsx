// ─── Chapters Management Page ──────────────────────────────────
// Manage curriculum chapters

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import {
  Book,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  Eye,
  CheckCircle,
  Clock,
  FileText,
  Video,
  Question,
  Warning,
} from '@phosphor-icons/react'

interface Chapter {
  id: string
  title: string
  board: string
  standard: string
  subject: string
  medium: string
  order: number
  status: 'draft' | 'published' | 'archived'
  content_count: {
    topics: number
    videos: number
    questions: number
  }
  created_at: string
  updated_at: string
}

const ChaptersPage: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [boardFilter, setBoardFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  const loadChapters = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockChapters: Chapter[] = [
        {
          id: '1',
          title: 'Real Numbers',
          board: 'CBSE',
          standard: '10th',
          subject: 'Mathematics',
          medium: 'English',
          order: 1,
          status: 'published',
          content_count: { topics: 8, videos: 5, questions: 45 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Polynomials',
          board: 'CBSE',
          standard: '10th',
          subject: 'Mathematics',
          medium: 'English',
          order: 2,
          status: 'published',
          content_count: { topics: 6, videos: 4, questions: 38 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Chemical Reactions and Equations',
          board: 'CBSE',
          standard: '10th',
          subject: 'Science',
          medium: 'English',
          order: 1,
          status: 'published',
          content_count: { topics: 10, videos: 7, questions: 52 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          title: 'Light - Reflection and Refraction',
          board: 'CBSE',
          standard: '10th',
          subject: 'Science',
          medium: 'English',
          order: 10,
          status: 'draft',
          content_count: { topics: 5, videos: 2, questions: 20 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '5',
          title: 'A Letter to God',
          board: 'CBSE',
          standard: '10th',
          subject: 'English',
          medium: 'English',
          order: 1,
          status: 'published',
          content_count: { topics: 4, videos: 2, questions: 25 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      setChapters(mockChapters)
      setTotalCount(mockChapters.length)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, boardFilter, subjectFilter, statusFilter, searchQuery])

  useEffect(() => {
    loadChapters()
  }, [loadChapters])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === chapters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(chapters.map(c => c.id)))
    }
  }

  const getStatusBadge = (status: Chapter['status']) => {
    const styles = {
      draft: 'bg-app-muted/10 text-app-muted border-app-muted/25',
      published: 'bg-app-green/10 text-app-green border-app-green/25',
      archived: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
    }
    const icons = {
      draft: <Clock size={12} />,
      published: <CheckCircle size={12} />,
      archived: <Clock size={12} />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    )
  }

  const boards = [...new Set(chapters.map(c => c.board))]
  const subjects = [...new Set(chapters.map(c => c.subject))]

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
            Manage curriculum chapters and content
          </p>
        </div>
        <button
          onClick={() => alert('Create chapter')}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Chapter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{chapters.length}</p>
          <p className="text-xs text-app-muted">Total Chapters</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{chapters.filter(c => c.status === 'published').length}</p>
          <p className="text-xs text-app-muted">Published</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-muted">{chapters.filter(c => c.status === 'draft').length}</p>
          <p className="text-xs text-app-muted">Drafts</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-purple">{subjects.length}</p>
          <p className="text-xs text-app-muted">Subjects</p>
        </div>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Content chapters API is separate from admin module.
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
            onChange={e => setBoardFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Boards</option>
            {boards.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <select
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Subjects</option>
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
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
                  checked={chapters.length > 0 && selectedIds.size === chapters.length}
                  onChange={toggleSelectAll}
                  className="rounded border-app-border"
                />
              </th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Chapter</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Board</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Standard</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Subject</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Content</th>
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
            ) : chapters.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-app-muted">
                  No chapters found
                </td>
              </tr>
            ) : (
              chapters.map(chapter => (
                <tr key={chapter.id} className="border-b border-app-border/50 hover:bg-app-card2 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(chapter.id)}
                      onChange={() => toggleSelect(chapter.id)}
                      className="rounded border-app-border"
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-app-text">{chapter.title}</p>
                      <p className="text-xs text-app-muted">Chapter {chapter.order}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-text">{chapter.board}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted">{chapter.standard}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-purple">{chapter.subject}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 text-xs text-app-muted">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {chapter.content_count.topics}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video size={12} />
                        {chapter.content_count.videos}
                      </span>
                      <span className="flex items-center gap-1">
                        <Question size={12} />
                        {chapter.content_count.questions}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{getStatusBadge(chapter.status)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alert('Preview chapter')}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => alert('Edit chapter')}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => alert('Delete chapter')}
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
        <p>Chapters management endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default ChaptersPage
