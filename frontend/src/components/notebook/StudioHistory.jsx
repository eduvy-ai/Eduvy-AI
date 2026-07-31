// ─── Studio History Component ───────────────────────────────────
// Shows saved Studio outputs for the Notebook tab

import { useState, useEffect } from 'react'
import { 
  ClockCounterClockwise, 
  X,
  Microphone,
  Books,
  ClipboardText,
  Question,
  CalendarBlank,
  MapTrifold,
  Target,
  Cards,
  BookmarkSimple,
  Trash,
  Funnel,
} from '@phosphor-icons/react'
import { apiGetStudioOutputs, apiDeleteStudioOutput, apiToggleStudioBookmark } from '../../api.js'

const STUDIO_ICONS = {
  podcast: Microphone,
  guide: Books,
  brief: ClipboardText,
  faq: Question,
  timeline: CalendarBlank,
  mindmap: MapTrifold,
  quiz: Target,
  flashcards: Cards,
}

const STUDIO_COLORS = {
  podcast: '#FFD166',
  guide: '#00E5A0',
  brief: '#7B9CFF',
  faq: '#FF6B35',
  timeline: '#FF6B6B',
  mindmap: '#7B9CFF',
  quiz: '#00E5A0',
  flashcards: '#FFD166',
}

const STUDIO_LABELS = {
  podcast: { English: 'Audio Overview', Hindi: 'ऑडियो ओवरव्यू', Marathi: 'ऑडिओ ओव्हरव्यू' },
  guide: { English: 'Study Guide', Hindi: 'स्टडी गाइड', Marathi: 'अभ्यास मार्गदर्शिका' },
  brief: { English: 'Briefing Doc', Hindi: 'ब्रीफिंग डॉक', Marathi: 'ब्रीफिंग डॉक' },
  faq: { English: 'FAQ', Hindi: 'FAQ', Marathi: 'FAQ' },
  timeline: { English: 'Timeline', Hindi: 'टाइमलाइन', Marathi: 'टाइमलाइन' },
  mindmap: { English: 'Mind Map', Hindi: 'माइंड मैप', Marathi: 'माइंड मॅप' },
  quiz: { English: 'Practice Quiz', Hindi: 'प्रैक्टिस क्विज़', Marathi: 'प्रॅक्टिस क्विझ' },
  flashcards: { English: 'Flashcards', Hindi: 'फ़्लैशकार्ड्स', Marathi: 'फ्लॅशकार्ड्स' },
}

function formatDate(dateStr, lang = 'English', ui = {}) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return ui.today || 'Today'
  if (diffDays === 1) return ui.yesterday || 'Yesterday'
  if (diffDays < 7) return `${diffDays} ${ui.daysAgo || 'days ago'}`
  
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function groupByDate(outputs, lang, ui) {
  const groups = {}
  
  outputs.forEach(output => {
    const dateKey = formatDate(output.created_at, lang, ui)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(output)
  })
  
  return groups
}

export default function StudioHistory({ userId, onClose, onSelectOutput, ui, lang }) {
  const [outputs, setOutputs] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false)
  const [selectedType, setSelectedType] = useState('')

  // Load outputs on mount
  useEffect(() => {
    setLoading(true)
    apiGetStudioOutputs(userId)
      .then(data => {
        setOutputs(data || [])
      })
      .catch(err => {
        console.error('Failed to load studio outputs:', err)
        setOutputs([])
      })
      .finally(() => setLoading(false))
  }, [userId])

  // Filter outputs
  const filteredOutputs = outputs.filter(output => {
    if (bookmarkedOnly && !output.is_bookmarked) return false
    if (selectedType && output.type !== selectedType) return false
    return true
  })

  // Get unique types for filter
  const uniqueTypes = [...new Set(outputs.map(o => o.type))]

  // Parse output to get preview
  const getPreview = (output) => {
    try {
      const parsed = JSON.parse(output.output_json)
      
      if (output.type === 'podcast') {
        return parsed.title || parsed.exchanges?.[0]?.t?.slice(0, 60) || 'Podcast episode'
      }
      if (output.type === 'mindmap') {
        return parsed.center || 'Mind Map'
      }
      if (output.type === 'flashcards' && Array.isArray(parsed)) {
        return `${parsed.length} cards: ${parsed[0]?.q?.slice(0, 40) || ''}...`
      }
      if (output.type === 'quiz') {
        return parsed.q?.slice(0, 60) || 'Quiz question'
      }
      // Text outputs (guide, brief, faq, timeline)
      if (typeof parsed === 'string') {
        return parsed.slice(0, 80) + (parsed.length > 80 ? '...' : '')
      }
      return output.output_json.slice(0, 80) + '...'
    } catch {
      return output.output_json?.slice(0, 80) + '...' || 'Generated content'
    }
  }

  const handleSelect = (output) => {
    try {
      const parsed = JSON.parse(output.output_json)
      onSelectOutput(output.type, parsed, output.output_json)
    } catch {
      onSelectOutput(output.type, null, output.output_json)
    }
    onClose()
  }

  // Toggle bookmark
  const handleToggleBookmark = async (output, e) => {
    e.stopPropagation()
    try {
      const result = await apiToggleStudioBookmark(userId, output.id)
      setOutputs(prev => prev.map(o => 
        o.id === output.id ? { ...o, is_bookmarked: result.is_bookmarked } : o
      ))
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
    }
  }

  // Delete output
  const handleDelete = async (output, e) => {
    e.stopPropagation()
    if (!confirm(ui.confirmDelete || 'Delete this output?')) return
    try {
      await apiDeleteStudioOutput(userId, output.id)
      setOutputs(prev => prev.filter(o => o.id !== output.id))
    } catch (err) {
      console.error('Failed to delete output:', err)
    }
  }

  const groupedOutputs = groupByDate(filteredOutputs, lang, ui)

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-app-card w-full max-w-lg max-h-[85vh] rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-app-border shrink-0">
          <div className="flex items-center gap-3">
            <ClockCounterClockwise size={24} weight="duotone" className="text-app-green" />
            <h2 className="text-app-text text-lg font-bold">{ui.studioHistory || 'Studio History'}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-app-card2 text-app-muted hover:text-app-text hover:bg-app-border transition-colors"
          >
            <X size={20} weight="bold" />
          </button>
        </header>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-app-border flex flex-wrap items-center gap-2 shrink-0">
          {/* Bookmarked filter */}
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

          {/* Type filter */}
          {uniqueTypes.length > 1 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-app-card2 border border-app-border rounded-full px-3 py-1.5 text-xs text-app-text font-semibold cursor-pointer"
            >
              <option value="">{ui.allTypes || 'All Types'}</option>
              {uniqueTypes.map(type => {
                const labelObj = STUDIO_LABELS[type] || {}
                return (
                  <option key={type} value={type}>
                    {labelObj[lang] || labelObj.English || type}
                  </option>
                )
              })}
            </select>
          )}

          {/* Clear filters */}
          {(bookmarkedOnly || selectedType) && (
            <button
              onClick={() => { setBookmarkedOnly(false); setSelectedType('') }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-app-muted hover:text-app-red transition-colors"
            >
              {ui.clearFilters || 'Clear'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-app-green/30 border-t-app-green rounded-full animate-spin" />
            </div>
          ) : filteredOutputs.length === 0 ? (
            <div className="text-center py-12">
              <ClockCounterClockwise size={48} weight="duotone" className="text-app-muted mx-auto mb-3" />
              <p className="text-app-muted text-sm">
                {bookmarkedOnly 
                  ? (ui.noBookmarks || 'No bookmarked outputs yet')
                  : (ui.noStudioHistory || 'No studio outputs yet. Generate something!')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOutputs).map(([dateKey, dateOutputs]) => (
                <div key={dateKey}>
                  <h3 className="text-app-muted text-xs font-semibold uppercase tracking-wider mb-2">
                    {dateKey}
                  </h3>
                  <div className="space-y-2">
                    {dateOutputs.map(output => {
                      const Icon = STUDIO_ICONS[output.type] || Books
                      const color = STUDIO_COLORS[output.type] || '#00E5A0'
                      const labelObj = STUDIO_LABELS[output.type] || {}
                      const label = labelObj[lang] || labelObj.English || output.type
                      
                      return (
                        <div
                          key={output.id}
                          onClick={() => handleSelect(output)}
                          className="bg-app-card2 border border-app-border rounded-xl p-3.5 cursor-pointer hover:border-app-green/30 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${color}15` }}
                            >
                              <Icon size={18} weight="duotone" style={{ color }} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span 
                                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${color}15`, color }}
                                >
                                  {label}
                                </span>
                                <span className="text-[10px] text-app-muted">
                                  {new Date(output.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {output.is_bookmarked && (
                                  <BookmarkSimple size={12} weight="fill" className="text-app-yellow" />
                                )}
                              </div>
                              <p className="text-app-text text-[13px] line-clamp-2">
                                {getPreview(output)}
                              </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => handleToggleBookmark(output, e)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                  output.is_bookmarked 
                                    ? 'text-app-yellow bg-app-yellow/10' 
                                    : 'text-app-muted hover:text-app-yellow hover:bg-app-yellow/10'
                                }`}
                                title={ui.bookmark || 'Bookmark'}
                              >
                                <BookmarkSimple size={16} weight={output.is_bookmarked ? 'fill' : 'regular'} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(output, e)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-app-muted hover:text-app-red hover:bg-app-red/10 transition-colors"
                                title={ui.delete || 'Delete'}
                              >
                                <Trash size={16} weight="regular" />
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
      </div>
    </div>
  )
}
