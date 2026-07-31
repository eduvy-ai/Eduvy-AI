// ─── Coach History Component ───────────────────────────────────
// Shows saved Study Coach sessions with search, filters, and bookmarks

import { useState, useEffect, useCallback } from 'react'
import { 
  ClockCounterClockwise, 
  MagnifyingGlass, 
  BookmarkSimple, 
  Trash,
  X,
  Funnel,
  CaretLeft,
  Brain,
  Lightbulb,
  GraduationCap,
  Code,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { studyCoachApi, type CoachSession } from '../../modules/studycoach/api'

interface Props {
  onClose: () => void
  onSelectSession: (session: CoachSession) => void
  ui: Record<string, string>
}

const MODE_ICONS: Record<string, typeof Brain> = {
  study_coach: Brain,
  study_coach_eli10: Lightbulb,
  study_coach_exam: GraduationCap,
  study_coach_coding: Code,
  study_coach_revision: ArrowsClockwise,
}

const MODE_COLORS: Record<string, string> = {
  study_coach: '#00E5A0',
  study_coach_eli10: '#FFD166',
  study_coach_exam: '#7B9CFF',
  study_coach_coding: '#A78BFA',
  study_coach_revision: '#FF6B6B',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupByDate(sessions: CoachSession[]): Record<string, CoachSession[]> {
  const groups: Record<string, CoachSession[]> = {}
  
  sessions.forEach(session => {
    const dateKey = formatDate(session.created_at)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(session)
  })
  
  return groups
}

export default function CoachHistory({ onClose, onSelectSession, ui }: Props) {
  const [sessions, setSessions] = useState<CoachSession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [subjects, setSubjects] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Load sessions
  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      if (searchQuery.trim()) {
        const result = await studyCoachApi.searchSessions(searchQuery, {
          subject: selectedSubject || undefined,
          bookmarked_only: bookmarkedOnly,
        })
        setSessions(result.sessions)
      } else {
        const result = await studyCoachApi.getSessions({
          subject: selectedSubject || undefined,
          bookmarked: bookmarkedOnly,
          limit: 100,
        })
        setSessions(result.sessions)
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedSubject, bookmarkedOnly])

  // Load subjects
  useEffect(() => {
    studyCoachApi.getSubjects()
      .then(res => setSubjects(res.subjects))
      .catch(() => {})
  }, [])

  // Load sessions on mount and filter changes
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Toggle bookmark
  const handleToggleBookmark = async (session: CoachSession, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await studyCoachApi.toggleBookmark(session.id, !session.is_bookmarked)
      setSessions(prev => prev.map(s => 
        s.id === session.id ? { ...s, is_bookmarked: !s.is_bookmarked } : s
      ))
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
    }
  }

  // Delete session
  const handleDelete = async (session: CoachSession, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(ui.confirmDeleteSession || 'Delete this session?')) return
    try {
      await studyCoachApi.deleteSession(session.id)
      setSessions(prev => prev.filter(s => s.id !== session.id))
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Open session
  const handleSelectSession = async (session: CoachSession) => {
    try {
      const fullSession = await studyCoachApi.getSession(session.id)
      onSelectSession(fullSession)
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }

  const groupedSessions = groupByDate(sessions)

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-app-card w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-app-border shrink-0">
          <div className="flex items-center gap-3">
            <ClockCounterClockwise size={24} weight="duotone" className="text-app-green" />
            <h2 className="text-app-text text-lg font-bold">{ui.coachHistory || 'Learning History'}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-app-card2 text-app-muted hover:text-app-text hover:bg-app-border transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </header>

        {/* Search & Filters */}
        <div className="px-5 py-3 border-b border-app-border space-y-3 shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.searchHistory || 'Search your learning history...'}
              className="w-full bg-app-card2 border border-app-border rounded-xl pl-10 pr-4 py-2.5 text-app-text text-sm placeholder:text-app-muted/70 focus:outline-none focus:border-app-green/50"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showFilters || selectedSubject || bookmarkedOnly
                  ? 'bg-app-green/15 text-app-green border border-app-green/30'
                  : 'bg-app-card2 text-app-muted border border-app-border hover:border-app-green/30'
              }`}
            >
              <Funnel size={14} weight="fill" />
              {ui.filters || 'Filters'}
            </button>

            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                bookmarkedOnly
                  ? 'bg-app-yellow/15 text-app-yellow border border-app-yellow/30'
                  : 'bg-app-card2 text-app-muted border border-app-border hover:border-app-yellow/30'
              }`}
            >
              <BookmarkSimple size={14} weight={bookmarkedOnly ? 'fill' : 'regular'} />
              {ui.bookmarked || 'Bookmarked'}
            </button>

            {selectedSubject && (
              <button
                onClick={() => setSelectedSubject('')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-app-blue/15 text-app-blue border border-app-blue/30"
              >
                {selectedSubject}
                <X size={12} weight="bold" />
              </button>
            )}
          </div>

          {/* Subject Filter Dropdown */}
          {showFilters && subjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => {
                    setSelectedSubject(selectedSubject === subject ? '' : subject)
                    setShowFilters(false)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedSubject === subject
                      ? 'bg-app-blue/15 text-app-blue border border-app-blue/30'
                      : 'bg-app-card2 text-app-muted border border-app-border hover:border-app-blue/30'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-app-green/30 border-t-app-green rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <ClockCounterClockwise size={48} weight="duotone" className="text-app-muted mx-auto mb-3" />
              <p className="text-app-muted text-sm">
                {searchQuery 
                  ? (ui.noSearchResults || 'No sessions found for your search')
                  : (ui.noHistory || 'No learning history yet. Ask the Coach something!')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSessions).map(([dateKey, dateSessions]) => (
                <div key={dateKey}>
                  <h3 className="text-app-muted text-xs font-semibold uppercase tracking-wider mb-2">
                    {dateKey}
                  </h3>
                  <div className="space-y-2">
                    {dateSessions.map(session => {
                      const ModeIcon = MODE_ICONS[session.mode] || Brain
                      const modeColor = MODE_COLORS[session.mode] || '#00E5A0'
                      
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className="bg-app-card2 border border-app-border rounded-xl p-4 cursor-pointer hover:border-app-green/30 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Mode Icon */}
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${modeColor}15` }}
                            >
                              <ModeIcon size={20} weight="duotone" style={{ color: modeColor }} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-app-text font-semibold text-sm line-clamp-1 mb-0.5">
                                {session.title || session.question}
                              </h4>
                              <p className="text-app-muted text-xs line-clamp-2">
                                {session.question}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span 
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ 
                                    backgroundColor: `${modeColor}15`, 
                                    color: modeColor 
                                  }}
                                >
                                  {session.subject}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleToggleBookmark(session, e)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                  session.is_bookmarked 
                                    ? 'bg-app-yellow/15 text-app-yellow' 
                                    : 'bg-app-card text-app-muted hover:text-app-yellow'
                                }`}
                              >
                                <BookmarkSimple 
                                  size={16} 
                                  weight={session.is_bookmarked ? 'fill' : 'regular'} 
                                />
                              </button>
                              <button
                                onClick={(e) => handleDelete(session, e)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-app-card text-app-muted hover:text-app-red hover:bg-app-red/10 transition-colors"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-app-border shrink-0">
          <p className="text-app-muted text-xs text-center">
            {sessions.length} {ui.sessionsCount || 'sessions in your history'}
          </p>
        </footer>
      </div>
    </div>
  )
}
