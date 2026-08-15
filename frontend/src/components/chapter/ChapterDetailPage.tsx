/**
 * Chapter Detail Page
 * Unified view of a chapter with all learning resources.
 * Shows: Overview, Notes, Videos, Flashcards, Quiz, AI Tutor
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { useChapterById } from '@/modules/chapters/hooks'
import { getDisplayLang, callAI, parseAIObject, parseAIArray, buildSystemPrompt, LANG_RULES } from '@/shared.js'
import { API_BASE_URL } from '@/config'
import DiagramViewer from '@/components/studycoach/DiagramViewer'
import {
  getAuthToken,
  apiGetChapterNotes, apiCreateChapterNote, apiUpdateChapterNote, apiDeleteChapterNote,
  apiGetChapterSummary, apiSaveChapterSummary,
  apiGetChapterUploads, apiCreateChapterUpload, apiDeleteChapterUpload, apiGetChapterExtractedContent,
  apiGetChapterQuizHistory, apiSaveChapterQuizHistory, apiDeleteChapterQuizHistory,
  apiGetChapterQuizBookmarks, apiSaveChapterQuizBookmark, apiDeleteChapterQuizBookmark,
  apiGetChapterVideoHistory, apiSaveChapterVideoHistory, apiDeleteChapterVideoHistory,
  apiGetChapterVideoBookmarks, apiSaveChapterVideoBookmark, apiDeleteChapterVideoBookmark,
  apiGetChapterFlashcards, apiSaveChapterFlashcards, apiUpdateChapterFlashcards, apiDeleteChapterFlashcards,
  apiGetChapterChatSessions, apiCreateChapterChatSession, apiGetChapterChatMessages,
  apiSaveChapterChatMessage, apiDeleteChapterChatSession,
} from '@/api.js'
import { li } from '@/i18n/index.js'
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Cards,
  Target,
  Robot,
  Notebook,
  Sparkle,
  Brain,
  ListBullets,
  Lightning,
  CheckCircle,
  XCircle,
  Clock,
  ArrowCounterClockwise,
  Trophy,
  BookmarkSimple,
  Trash,
  ClockCounterClockwise,
  Plus,
  ChatCircle,
  PencilSimple,
  MagicWand,
  FileText,
  Star,
  Copy,
  Check,
  UploadSimple,
  File,
  FilePdf,
  Image,
  Eye,
  X,
} from '@phosphor-icons/react'
import Loader from '@/shared/components/Loader'

type SubTab = 'overview' | 'notes' | 'videos' | 'flashcards' | 'quiz' | 'ai'

interface SubTabConfig {
  key: SubTab
  labelKey: string
  icon: React.ComponentType<any>
  color: string
}

const SUB_TABS: SubTabConfig[] = [
  { key: 'overview', labelKey: 'overview', icon: BookOpen, color: '#7B9CFF' },
  { key: 'notes', labelKey: 'notes', icon: Notebook, color: '#00E5A0' },
  { key: 'videos', labelKey: 'videos', icon: PlayCircle, color: '#FF6B35' },
  { key: 'flashcards', labelKey: 'flashcards', icon: Cards, color: '#FFD166' },
  { key: 'quiz', labelKey: 'quiz', icon: Target, color: '#FF6B6B' },
  { key: 'ai', labelKey: 'aiTutor', icon: Robot, color: '#BB86FC' },
]

const ChapterDetailPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  
  // Load chapter data
  const { chapter, isLoading, error } = useChapterById(
    chapterId ? parseInt(chapterId, 10) : null
  )
  
  // UI language
  const lang = getDisplayLang(user)
  const ui = useMemo(() => li(lang), [lang])
  
  // Active sub-tab
  const [activeTab, setActiveTab] = useState<SubTab>('overview')

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center">
        <Loader size="lg" />
        <p className="text-app-muted mt-3 text-sm">Loading...</p>
      </div>
    )
  }

  // ── Error State ──
  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-app-red/10 flex items-center justify-center mb-4">
          <BookOpen size={32} weight="duotone" className="text-app-red" />
        </div>
        <h3 className="text-[17px] font-bold text-app-text mb-2">{ui.chapterNotFound || 'Chapter Not Found'}</h3>
        <p className="text-[13px] text-app-muted mb-6 text-center">
          {error || ui.chapterNotFoundDesc || "This chapter doesn't exist or has been removed."}
        </p>
        <button
          onClick={() => navigate('/app/learn')}
          className="px-5 py-2.5 bg-app-green text-app-bg rounded-xl font-bold text-[14px]"
        >
          {ui.backToLearn || 'Back to Learn'}
        </button>
      </div>
    )
  }

  // ── Tab Content Renderer ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab chapter={chapter} ui={ui} user={user} setActiveTab={setActiveTab} />
      case 'notes':
        return <NotesTab chapter={chapter} ui={ui} user={user} />
      case 'videos':
        return <VideosTab chapter={chapter} ui={ui} user={user} />
      case 'flashcards':
        return <FlashcardsTab chapter={chapter} ui={ui} user={user} />
      case 'quiz':
        return <QuizTab chapter={chapter} ui={ui} user={user} />
      case 'ai':
        return <AITutorTab chapter={chapter} ui={ui} user={user} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-app-bg pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-app-bg/95 backdrop-blur-md border-b border-white/[0.04]">
        <div className="px-4 py-3">
          {/* Back button + chapter title */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center
                        hover:bg-white/[0.08] transition-colors"
            >
              <ArrowLeft size={18} weight="bold" className="text-app-text" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-app-muted font-semibold">
                Chapter {chapter.chapter_number} • {chapter.subject_name || chapter.subject_id}
              </p>
              <h1 className="text-[16px] font-black text-app-text truncate">
                {chapter.chapter_name}
              </h1>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {SUB_TABS.map(({ key, labelKey, icon: Icon, color }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap
                            transition-all duration-200 flex-shrink-0
                            ${isActive 
                              ? 'bg-white/[0.08] text-app-text' 
                              : 'text-app-muted hover:text-app-text hover:bg-white/[0.04]'}`}
                >
                  <Icon 
                    size={16} 
                    weight={isActive ? 'fill' : 'regular'} 
                    style={{ color: isActive ? color : undefined }}
                  />
                  <span className="text-[12px] font-semibold">
                    {ui[labelKey] || labelKey}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 py-4">
        {renderTabContent()}
      </div>
    </div>
  )
}

// ── Overview Tab ──
const OverviewTab: React.FC<{ 
  chapter: any
  ui: any
  user: any
  setActiveTab: (tab: SubTab) => void 
}> = ({ chapter, ui, user, setActiveTab }) => {
  const [summary, setSummary] = useState<{ summary: string; key_points: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Load or auto-generate summary on mount
  useEffect(() => {
    let cancelled = false
    const loadSummary = async () => {
      setLoading(true)
      try {
        const existing = await apiGetChapterSummary(chapter.id)
        if (!cancelled && existing && existing.summary) {
          setSummary(existing)
          setLoading(false)
          return
        }
      } catch {}

      // If chapter already has a description, use it directly without AI
      if (!cancelled && chapter.description) {
        setSummary({ summary: chapter.description, key_points: chapter.topics || [] })
        setLoading(false)
        return
      }

      // Auto-generate only if no description exists
      if (!cancelled) {
        setLoading(false)
        autoGenerate()
      }
    }

    const autoGenerate = async () => {
      setGenerating(true)
      try {
        const userLang = user?.language || 'English'
        const langRule = LANG_RULES[userLang as keyof typeof LANG_RULES] || LANG_RULES.English

        const prompt = `You are an expert ${chapter.board} Class ${chapter.standard} ${chapter.subject} teacher.

Generate a proper chapter summary for students that helps them understand what this chapter is about, what they will learn, and why it matters.

CHAPTER: "${chapter.chapter_name}" (Chapter ${chapter.chapter_number})
Subject: ${chapter.subject}
Board: ${chapter.board}, Class: ${chapter.standard}
${chapter.description ? `Brief: ${chapter.description}` : ''}
${chapter.topics?.length ? `Topics covered: ${chapter.topics.join(', ')}` : ''}

Return ONLY a valid JSON object:
{
  "summary": "A comprehensive 3-4 paragraph summary (150-200 words) that explains: what this chapter covers, the key concepts students will learn, how topics connect to each other, and why this chapter is important for exams. Write in simple student-friendly language.",
  "keyPoints": ["Point 1 - a meaningful sentence explaining a key concept (not just a keyword)", "Point 2 ...", ...up to 6-8 points]
}

IMPORTANT:
- Each keyPoint must be a full explanatory sentence, NOT just a keyword
- Summary should flow naturally like a teacher explaining to a student
- Include exam relevance (e.g., "This chapter typically carries 8-10 marks in board exams")
- Write in ${userLang}`

        const systemPrompt = `You are an expert Indian school teacher. Generate chapter summaries that genuinely help students understand the chapter before they start studying.

🚨 LANGUAGE RULE:
${langRule}

Return ONLY valid JSON. No markdown, no extra text.`

        const response = await callAI(prompt, systemPrompt, [], 3, 2000, 'summary')
        const parsed = parseAIObject(response)

        if (!cancelled && parsed && parsed.summary) {
          const keyPoints = Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints.map((p: any) => {
                if (typeof p === 'string') return p.trim()
                if (typeof p === 'object' && p !== null) {
                  return String(p.point || p.title || p.text || p.content || p.description || '').trim()
                }
                return String(p).trim()
              }).filter((p: string) => p && p.length > 5)
            : []

          // Save to DB so it doesn't regenerate next time
          let saved = null
          try {
            saved = await apiSaveChapterSummary(chapter.id, parsed.summary, keyPoints)
          } catch (saveErr) {
            console.warn('Failed to save summary, will show but not persist:', saveErr)
          }
          if (!cancelled) setSummary(saved || { summary: parsed.summary, key_points: keyPoints })
        }
      } catch (err) {
        console.error('Failed to generate overview summary:', err)
      }
      if (!cancelled) setGenerating(false)
    }

    loadSummary()
    return () => { cancelled = true }
  }, [chapter.id])

  return (
    <div className="space-y-4">
      {/* Chapter Summary */}
      <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} weight="bold" className="text-app-blue" />
          <h3 className="text-[13px] font-bold text-app-text">
            {ui.aboutChapter || 'About This Chapter'}
          </h3>
        </div>

        {loading || generating ? (
          <div className="flex items-center gap-2 py-4">
            <Loader size="sm" />
            <span className="text-[12px] text-app-muted">
              {generating ? (ui.generatingSummary || 'Generating chapter summary...') : (ui.loading || 'Loading...')}
            </span>
          </div>
        ) : summary?.summary ? (
          <p className="text-[13px] text-app-muted leading-[1.8] whitespace-pre-wrap">
            {summary.summary}
          </p>
        ) : (
          <p className="text-[13px] text-app-muted leading-relaxed">
            {chapter.description || ui.noSummaryAvailable || 'Summary not available.'}
          </p>
        )}
      </div>

      {/* Key Points */}
      {(summary?.key_points && summary.key_points.length > 0) ? (
        <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListBullets size={16} weight="bold" className="text-app-green" />
            <h3 className="text-[13px] font-bold text-app-text">
              {ui.keyPoints || 'Key Points'}
            </h3>
          </div>
          <div className="space-y-2.5">
            {summary.key_points.map((point: string, i: number) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-app-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-app-green">{i + 1}</span>
                </span>
                <p className="text-[12px] text-app-muted leading-relaxed flex-1 m-0">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (!loading && !generating && chapter.topics?.length > 0) && (
        <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListBullets size={16} weight="bold" className="text-app-blue" />
            <h3 className="text-[13px] font-bold text-app-text">
              {ui.keyTopics || 'Key Topics'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {chapter.topics.map((topic: string, i: number) => (
              <span
                key={i}
                className="text-[12px] px-3 py-1.5 rounded-full bg-white/[0.04] text-app-muted border border-white/[0.04]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
        <h3 className="text-[13px] font-bold text-app-text mb-3">
          {ui.quickStart || 'Quick Start'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            icon={Robot}
            label={ui.askAI || 'Ask AI Tutor'}
            color="#BB86FC"
            onClick={() => setActiveTab('ai')}
          />
          <QuickActionCard
            icon={Target}
            label={ui.takeQuiz || 'Take Quiz'}
            color="#FF6B6B"
            onClick={() => setActiveTab('quiz')}
          />
          <QuickActionCard
            icon={PlayCircle}
            label={ui.watchVideo || 'Watch Video'}
            color="#FF6B35"
            onClick={() => setActiveTab('videos')}
          />
          <QuickActionCard
            icon={Cards}
            label={ui.reviewFlashcards || 'Flashcards'}
            color="#FFD166"
            onClick={() => setActiveTab('flashcards')}
          />
        </div>
      </div>
    </div>
  )
}

// ── Quick Action Card ──
const QuickActionCard: React.FC<{
  icon: React.ComponentType<any>
  label: string
  color: string
  onClick: () => void
}> = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2.5 p-3 bg-white/[0.02] border border-white/[0.04] 
              rounded-xl hover:bg-white/[0.04] transition-colors text-left"
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18` }}
    >
      <Icon size={18} weight="duotone" style={{ color }} />
    </div>
    <span className="text-[12px] font-semibold text-app-text">{label}</span>
  </button>
)

// ── Notes Tab (Full-featured with DB storage) ──
interface ChapterNote {
  id: number
  chapter_id: number
  content: string
  created_at: string
  updated_at: string
}

interface ChapterSummary {
  id: number
  chapter_id: number
  summary: string
  key_points: string[]
  generated_at: string
}

interface UploadedFile {
  id: number
  chapter_id: number
  name: string
  url: string
  file_type: 'pdf' | 'image' | 'text'
  file_size: number
  uploaded_at: string
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed'
  extraction_error?: string | null
  has_content: boolean
}

type NotesViewState = 'home' | 'writing' | 'editing' | 'summary'

const NotesTab: React.FC<{ chapter: any; ui: any; user: any }> = ({ chapter, ui: _ui, user }) => {
  const [viewState, setViewState] = useState<NotesViewState>('home')
  const [notes, setNotes] = useState<ChapterNote[]>([])
  const [summary, setSummary] = useState<ChapterSummary | null>(null)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [editingNote, setEditingNote] = useState<ChapterNote | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [_isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [notesData, summaryData, uploadsData] = await Promise.all([
          apiGetChapterNotes(chapter.id).catch(() => []),
          apiGetChapterSummary(chapter.id).catch(() => null),
          apiGetChapterUploads(chapter.id).catch(() => [])
        ])
        setNotes(notesData || [])
        setSummary(summaryData)
        setUploads(uploadsData || [])
      } catch (err) {
        console.error('Failed to load notes data:', err)
      }
      setIsLoading(false)
    }
    loadData()
  }, [chapter.id])

  // Poll for extraction status updates
  useEffect(() => {
    const hasProcessing = uploads.some(
      u => u.extraction_status === 'pending' || u.extraction_status === 'processing'
    )
    
    if (!hasProcessing) return
    
    const interval = setInterval(async () => {
      try {
        const updatedUploads = await apiGetChapterUploads(chapter.id)
        setUploads(updatedUploads || [])
        
        // Stop polling if all are done
        const stillProcessing = (updatedUploads || []).some(
          (u: UploadedFile) => u.extraction_status === 'pending' || u.extraction_status === 'processing'
        )
        if (!stillProcessing) {
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Failed to refresh uploads:', err)
      }
    }, 3000) // Poll every 3 seconds
    
    return () => clearInterval(interval)
  }, [uploads, chapter.id])

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10MB.')
      return
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Allowed: PDF, images (JPG, PNG, WebP), text files.')
      return
    }

    setIsUploading(true)
    setUploadError('')

    try {
      const token = getAuthToken()
      if (!token) {
        setUploadError('Please log in to upload files.')
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'notebook')

      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      
      // Determine file type
      let fileType: 'pdf' | 'image' | 'text' = 'text'
      if (file.type === 'application/pdf') fileType = 'pdf'
      else if (file.type.startsWith('image/')) fileType = 'image'

      // Save to database
      await apiCreateChapterUpload(chapter.id, {
        name: file.name,
        url: data.url,
        file_type: fileType,
        file_size: file.size
      })
      
      // Refresh uploads list
      const updatedUploads = await apiGetChapterUploads(chapter.id)
      setUploads(updatedUploads || [])
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file')
    }

    setIsUploading(false)
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Delete upload
  const handleDeleteUpload = async (uploadId: number) => {
    try {
      await apiDeleteChapterUpload(chapter.id, uploadId)
      setUploads(prev => prev.filter(u => u.id !== uploadId))
    } catch (err) {
      console.error('Failed to delete upload:', err)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FilePdf size={20} weight="duotone" className="text-red-400" />
      case 'image': return <Image size={20} weight="duotone" className="text-app-blue" />
      default: return <File size={20} weight="duotone" className="text-app-muted" />
    }
  }

  // Save note
  const handleSaveNote = async () => {
    if (!noteContent.trim()) return
    
    try {
      if (editingNote) {
        await apiUpdateChapterNote(chapter.id, editingNote.id, noteContent.trim())
      } else {
        await apiCreateChapterNote(chapter.id, noteContent.trim())
      }
      const updatedNotes = await apiGetChapterNotes(chapter.id)
      setNotes(updatedNotes || [])
    } catch (err) {
      console.error('Failed to save note:', err)
    }
    
    setNoteContent('')
    setEditingNote(null)
    setViewState('home')
  }

  // Delete note
  const handleDeleteNote = async (noteId: number) => {
    try {
      await apiDeleteChapterNote(chapter.id, noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  // Edit note
  const handleEditNote = (note: ChapterNote) => {
    setEditingNote(note)
    setNoteContent(note.content)
    setViewState('editing')
  }

  // Generate AI summary
  const generateSummary = async () => {
    setIsGenerating(true)
    setViewState('summary')

    try {
      // Fetch extracted content from uploads
      let extractedContent = ''
      try {
        const contentResult = await apiGetChapterExtractedContent(chapter.id)
        if (contentResult?.has_content) {
          extractedContent = contentResult.content
        }
      } catch (err) {
        console.log('No extracted content available')
      }

      // Build prompt with or without extracted content
      let prompt = ''
      if (extractedContent) {
        // RAG: Use extracted content as context
        prompt = `You are an expert teacher. Generate a comprehensive study summary based on the following study materials.

CHAPTER INFO:
Chapter: "${chapter.chapter_name}"
Subject: ${chapter.subject}
Board: ${chapter.board}
Class: ${chapter.standard}
${chapter.description ? `Overview: ${chapter.description}` : ''}
${chapter.topics?.length ? `Topics: ${chapter.topics.join(', ')}` : ''}

STUDY MATERIALS (extracted from uploaded PDFs/images):
---
${extractedContent.substring(0, 15000)}
---

Based on the study materials above, generate a comprehensive summary that helps students understand and remember the key concepts.

Return ONLY a valid JSON object with:
- "summary": A clear 2-3 paragraph summary explaining the main concepts based on the study materials (write in simple language suitable for students)
- "keyPoints": An array of 5-8 key points students must remember from the study materials (each point should be 1-2 sentences)

Return ONLY the JSON object, no other text.`
      } else {
        // Fallback: Generate from chapter metadata only
        prompt = `You are an expert teacher. Generate a comprehensive study summary for the chapter "${chapter.chapter_name}" (${chapter.subject}, ${chapter.board} Class ${chapter.standard}).

${chapter.description ? `Chapter overview: ${chapter.description}` : ''}
${chapter.topics?.length ? `Key topics: ${chapter.topics.join(', ')}` : ''}

Return ONLY a valid JSON object with:
- "summary": A clear 2-3 paragraph summary explaining the main concepts (write in simple language suitable for students)
- "keyPoints": An array of 5-8 key points students must remember (each point should be 1-2 sentences)

Return ONLY the JSON object, no other text.`
      }

      // Build language-aware system prompt
      const userLang = (user?.language || 'English') as keyof typeof LANG_RULES
      const langRule = LANG_RULES[userLang] || LANG_RULES.English
      const systemPrompt = `You are an expert teacher. Generate content in the student's language.

🚨 LANGUAGE RULE — MANDATORY:
${langRule}
${userLang === 'Hindi' ? '\n⚠️ Write summary and key points in DEVANAGARI SCRIPT (हिंदी). NO Roman/Latin letters, NO Hinglish.' : userLang === 'Marathi' ? '\n⚠️ Write in MARATHI DEVANAGARI (मराठी). NO Hindi words.' : ''}

🚨 FORMAT RULE — MANDATORY:
Return ONLY a valid JSON object with "summary" (string) and "keyPoints" (array of strings). Each key point must be a plain string, NOT an object. Example: {"summary": "...", "keyPoints": ["Point 1", "Point 2"]}`

      const response = await callAI(prompt, systemPrompt, [], 3, 3000, 'summary')
      const parsed = parseAIObject(response)
      
      if (parsed && parsed.summary) {
        // Ensure keyPoints is an array of strings — handle objects from AI
        const keyPoints = Array.isArray(parsed.keyPoints) 
          ? parsed.keyPoints.map((p: any) => {
              if (typeof p === 'string') return p.trim()
              if (typeof p === 'object' && p !== null) {
                // AI sometimes returns {point: "...", explanation: "..."} or {title: "...", description: "..."}
                return String(p.point || p.title || p.text || p.content || p.description || p.value || JSON.stringify(p)).trim()
              }
              return String(p).trim()
            }).filter((p: string) => p && p !== '[object Object]') 
          : []
        const savedSummary = await apiSaveChapterSummary(chapter.id, parsed.summary, keyPoints)
        setSummary(savedSummary)
      }
    } catch (err) {
      console.error('Failed to generate summary:', err)
    }

    setIsGenerating(false)
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── WRITING/EDITING VIEW ──
  if (viewState === 'writing' || viewState === 'editing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewState('home')
              setNoteContent('')
              setEditingNote(null)
            }}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <h3 className="text-[14px] font-bold text-app-text">
            {viewState === 'editing' ? 'Edit Note' : 'New Note'}
          </h3>
        </div>

        <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your notes here... What did you learn? What's important to remember?"
            className="w-full h-48 bg-transparent text-app-text text-[13px] placeholder:text-app-muted/50 
                      resize-none focus:outline-none leading-relaxed"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setViewState('home')
              setNoteContent('')
              setEditingNote(null)
            }}
            className="flex-1 py-2.5 bg-white/[0.04] text-app-muted rounded-xl text-[13px] font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNote}
            disabled={!noteContent.trim()}
            className="flex-1 py-2.5 bg-app-green text-app-bg rounded-xl text-[13px] font-bold
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} weight="bold" />
            Save Note
          </button>
        </div>
      </div>
    )
  }

  // ── SUMMARY VIEW ──
  if (viewState === 'summary') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-app-text">AI Summary</h3>
            <p className="text-[10px] text-app-muted">{chapter.chapter_name}</p>
          </div>
          {summary && (
            <button
              onClick={() => copyToClipboard(`${summary.summary}\n\nKey Points:\n${summary.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`)}
              className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-green"
            >
              {copied ? <Check size={16} weight="bold" className="text-app-green" /> : <Copy size={16} />}
            </button>
          )}
        </div>

        {isGenerating ? (
          <div className="bg-app-card border border-white/[0.04] rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-app-purple/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <MagicWand size={28} weight="duotone" className="text-app-purple" />
            </div>
            <p className="text-[14px] font-bold text-app-text mb-2">Generating Summary...</p>
            <p className="text-[12px] text-app-muted">AI is analyzing the chapter content</p>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} weight="duotone" className="text-app-purple" />
                <h4 className="text-[13px] font-bold text-app-text">Summary</h4>
              </div>
              <p className="text-[13px] text-app-muted leading-relaxed whitespace-pre-wrap">
                {summary.summary}
              </p>
            </div>

            {/* Key Points */}
            {summary.key_points.length > 0 && (
              <div className="bg-app-card border border-white/[0.04] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={16} weight="duotone" className="text-app-yellow" />
                  <h4 className="text-[13px] font-bold text-app-text">Key Points</h4>
                </div>
                <div className="space-y-2">
                  {summary.key_points.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-app-yellow/10 text-app-yellow text-[10px] 
                                      font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[12px] text-app-muted leading-relaxed flex-1">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate */}
            <button
              onClick={generateSummary}
              className="w-full py-2.5 bg-white/[0.04] text-app-muted rounded-xl text-[12px] font-semibold
                        flex items-center justify-center gap-2 hover:bg-white/[0.06]"
            >
              <ArrowCounterClockwise size={14} />
              Regenerate Summary
            </button>
          </div>
        ) : (
          <div className="bg-app-card border border-white/[0.04] rounded-2xl p-6 text-center">
            <p className="text-[13px] text-app-muted">Failed to generate summary. Please try again.</p>
            <button
              onClick={generateSummary}
              className="mt-4 px-4 py-2 bg-app-purple text-white rounded-xl text-[12px] font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── FILE PREVIEW MODAL ──
  if (previewFile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewFile(null)}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-app-text truncate">{previewFile.name}</h3>
            <p className="text-[10px] text-app-muted">{formatFileSize(previewFile.file_size)}</p>
          </div>
          <a
            href={previewFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-app-blue text-white rounded-lg text-[11px] font-bold"
          >
            Open
          </a>
        </div>

        {previewFile.file_type === 'image' ? (
          <div className="rounded-xl overflow-hidden bg-black/20">
            <img 
              src={previewFile.url} 
              alt={previewFile.name}
              className="w-full h-auto max-h-[60vh] object-contain"
            />
          </div>
        ) : previewFile.file_type === 'pdf' ? (
          <div className="rounded-xl overflow-hidden bg-black/20 aspect-[3/4]">
            <iframe
              src={previewFile.url}
              className="w-full h-full"
              title={previewFile.name}
            />
          </div>
        ) : (
          <div className="bg-app-card border border-white/[0.04] rounded-xl p-4 text-center">
            <File size={48} weight="duotone" className="text-app-muted mx-auto mb-3" />
            <p className="text-[12px] text-app-muted mb-3">Text file preview not available</p>
            <a
              href={previewFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-app-blue text-white rounded-lg text-[12px] font-bold"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    )
  }

  // ── HOME VIEW ──
  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* AI Summary Card */}
      <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-purple/20 flex items-center justify-center flex-shrink-0">
            <MagicWand size={20} weight="duotone" className="text-app-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-app-text mb-1">AI Summary</h3>
            <p className="text-[11px] text-app-muted mb-2">
              {summary 
                ? `Generated ${new Date(summary.generated_at).toLocaleDateString()}`
                : 'Get an AI-generated summary with key points'
              }
            </p>
            {/* Show when content is ready for RAG */}
            {!summary && uploads.some(f => f.extraction_status === 'completed' && f.has_content) && (
              <p className="text-[10px] text-green-400 mb-2 flex items-center gap-1">
                <Check size={12} weight="bold" />
                {uploads.filter(f => f.has_content).length} source(s) ready — summary will use your materials
              </p>
            )}
            <button
              onClick={() => summary ? setViewState('summary') : generateSummary()}
              className="px-4 py-2 bg-app-purple text-white rounded-lg text-[12px] font-bold
                        flex items-center gap-2"
            >
              {summary ? (
                <><FileText size={14} /> View Summary</>
              ) : (
                <><Sparkle size={14} weight="fill" /> Generate Summary</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload & Add Note Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Upload File */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-app-card border border-dashed border-white/[0.08] rounded-xl p-3
                    flex flex-col items-center gap-2 hover:border-app-blue/30 hover:bg-app-blue/5 
                    transition-colors disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-app-blue/10 flex items-center justify-center">
            {isUploading ? (
              <Loader size="sm" className="border-app-blue/30 border-t-app-blue" />
            ) : (
              <UploadSimple size={18} weight="bold" className="text-app-blue" />
            )}
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold text-app-text">
              {isUploading ? 'Uploading...' : 'Upload'}
            </p>
            <p className="text-[10px] text-app-muted">PDF, Images</p>
          </div>
        </button>

        {/* Add Note */}
        <button
          onClick={() => setViewState('writing')}
          className="bg-app-card border border-dashed border-white/[0.08] rounded-xl p-3
                    flex flex-col items-center gap-2 hover:border-app-green/30 hover:bg-app-green/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-app-green/10 flex items-center justify-center">
            <PencilSimple size={18} weight="bold" className="text-app-green" />
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold text-app-text">Add Note</p>
            <p className="text-[10px] text-app-muted">Write notes</p>
          </div>
        </button>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
          <XCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-400 flex-1">{uploadError}</p>
          <button onClick={() => setUploadError('')} className="text-red-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UploadSimple size={14} className="text-app-blue" />
            <h3 className="text-[12px] font-bold text-app-text">Uploaded Files ({uploads.length})</h3>
          </div>
          
          {uploads.map((file) => (
            <div
              key={file.id}
              className="bg-app-card border border-white/[0.04] rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                {getFileIcon(file.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-app-text truncate">{file.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-app-muted">
                    {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                  {/* Extraction status indicator */}
                  {file.extraction_status === 'pending' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                      Queued
                    </span>
                  )}
                  {file.extraction_status === 'processing' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Extracting...
                    </span>
                  )}
                  {file.extraction_status === 'completed' && file.has_content && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                      ✓ Ready
                    </span>
                  )}
                  {file.extraction_status === 'failed' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400" title={file.extraction_error || 'Extraction failed'}>
                      Failed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] text-app-muted hover:text-app-blue"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleDeleteUpload(file.id)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] text-app-muted hover:text-red-400"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PencilSimple size={14} className="text-app-green" />
            <h3 className="text-[12px] font-bold text-app-text">My Notes ({notes.length})</h3>
          </div>
          
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-app-card border border-white/[0.04] rounded-xl p-3"
            >
              <p className="text-[12px] text-app-muted leading-relaxed line-clamp-3 mb-2">
                {note.content}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-app-muted/60">
                  {new Date(note.updated_at).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditNote(note)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.04] text-app-muted hover:text-app-blue"
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.04] text-app-muted hover:text-red-400"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {notes.length === 0 && uploads.length === 0 && !summary && (
        <div className="bg-app-card border border-white/[0.04] rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-app-green/10 flex items-center justify-center mx-auto mb-3">
            <Notebook size={24} weight="duotone" className="text-app-green" />
          </div>
          <p className="text-[12px] text-app-muted">
            Upload your study materials, generate an AI summary, or write your own notes
          </p>
        </div>
      )}
    </div>
  )
}

// ── Videos Tab (Inline with AI recommendations) ──
interface VideoItem {
  id: string
  title: string
  description: string
  searchQuery: string
  concept: string
  watched: boolean
  videoId?: string // YouTube video ID for embedding
}

interface VideoHistory {
  id: number
  chapter_id: number
  video_id: string
  title: string
  search_query: string
  youtube_video_id?: string
  watched_at: string
}

interface BookmarkedVideo {
  id: number
  chapter_id: number
  video_id: string
  title: string
  description: string
  concept: string
  search_query: string
  youtube_video_id?: string
  bookmarked_at: string
}

type VideoViewState = 'home' | 'generating' | 'list' | 'player' | 'history' | 'bookmarks'

const VideosTab: React.FC<{ chapter: any; ui: any; user: any }> = ({ chapter, ui, user }) => {
  const [viewState, setViewState] = useState<VideoViewState>('home')
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [history, setHistory] = useState<VideoHistory[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkedVideo[]>([])
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingVideo, setLoadingVideo] = useState(false)
  const [_isLoading, setIsLoading] = useState(true)

  // Load history & bookmarks from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [historyData, bookmarksData] = await Promise.all([
          apiGetChapterVideoHistory(chapter.id).catch(() => []),
          apiGetChapterVideoBookmarks(chapter.id).catch(() => [])
        ])
        setHistory(historyData || [])
        setBookmarks(bookmarksData || [])
      } catch (err) {
        console.error('Failed to load video data:', err)
      }
      setIsLoading(false)
    }
    loadData()
  }, [chapter.id])

  // Generate video recommendations using AI
  const generateRecommendations = async () => {
    setLoading(true)
    setError('')
    setViewState('generating')

    try {
      const prompt = `Generate 6 educational video topic recommendations for studying "${chapter.chapter_name}" (${chapter.subject}, ${chapter.board} ${chapter.standard}).

${chapter.topics?.length ? `Key topics to cover: ${chapter.topics.join(', ')}` : ''}

Return ONLY a valid JSON array. Each object must have:
- "title": Short video title (max 60 chars)
- "description": What the video should explain (1 sentence)
- "searchQuery": YouTube search query to find this type of video (include class level and board)
- "concept": The topic/concept covered

Return ONLY the JSON array, no other text.`

      // Build language-aware system prompt
      const userLang = (user?.language || 'English') as keyof typeof LANG_RULES
      const langRule = LANG_RULES[userLang] || LANG_RULES.English
      const systemPrompt = `You are a video recommendation expert. Generate content in the student's language.

🚨 LANGUAGE RULE — MANDATORY:
${langRule}

🚨 FORMAT RULE — MANDATORY:
Return ONLY a valid JSON array starting with [ and ending with ]. Do NOT return separate JSON objects on different lines. Example format: [{"title": "...", "description": "...", "searchQuery": "...", "concept": "..."}, {...}]`

      const response = await callAI(prompt, systemPrompt, [], 3, 1500, 'video_rec')
      const parsed = parseAIArray(response)
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        const videoList: VideoItem[] = parsed.map((v: any, i: number) => ({
          id: `vid_${Date.now()}_${i}`,
          title: v.title || '',
          description: v.description || '',
          searchQuery: v.searchQuery || v.title || '',
          concept: v.concept || '',
          watched: false
        })).filter(v => v.title && v.searchQuery)
        
        if (videoList.length > 0) {
          setVideos(videoList)
          setViewState('list')
        } else {
          throw new Error('No recommendations generated')
        }
      } else {
        throw new Error('Failed to parse recommendations')
      }
    } catch (err) {
      setError('Failed to generate recommendations. Please try again.')
      setViewState('home')
    }

    setLoading(false)
  }

  // Search YouTube for real video
  const searchYouTubeVideo = async (query: string): Promise<string | null> => {
    try {
      const searchQuery = `${query} ${chapter.board} class ${chapter.standard}`
      const res = await fetch(`${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchQuery)}&limit=1`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        return data.results[0].id
      }
      return null
    } catch {
      return null
    }
  }

  // Check if video is bookmarked
  const isVideoBookmarked = (videoId: string): boolean => {
    return bookmarks.some(b => b.video_id === videoId)
  }

  // Play video - search YouTube and get real video ID
  const playVideo = async (video: VideoItem) => {
    setCurrentVideo(video)
    setViewState('player')
    setLoadingVideo(true)
    
    // If we don't have a videoId, search YouTube
    let youtubeVideoId = video.videoId
    if (!youtubeVideoId) {
      youtubeVideoId = await searchYouTubeVideo(video.searchQuery || video.title) || undefined
      if (youtubeVideoId) {
        // Update the video with the real ID
        setCurrentVideo({ ...video, videoId: youtubeVideoId })
        setVideos(prev => prev.map(v => v.id === video.id ? { ...v, videoId: youtubeVideoId } : v))
      }
    }
    setLoadingVideo(false)
    
    // Save to watch history via API
    try {
      await apiSaveChapterVideoHistory(chapter.id, {
        video_id: video.id,
        title: video.title,
        search_query: video.searchQuery,
        youtube_video_id: youtubeVideoId
      })
      const updatedHistory = await apiGetChapterVideoHistory(chapter.id)
      setHistory(updatedHistory || [])
    } catch (err) {
      console.error('Failed to save video history:', err)
    }
    
    // Update watched status
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, watched: true } : v))
  }

  // Play from history
  const playFromHistory = (h: VideoHistory) => {
    const video: VideoItem = {
      id: h.video_id,
      title: h.title,
      description: '',
      searchQuery: h.search_query,
      concept: '',
      watched: true,
      videoId: h.youtube_video_id
    }
    playVideo(video)
  }

  // Play from bookmark
  const playFromBookmark = (b: BookmarkedVideo) => {
    const video: VideoItem = {
      id: b.video_id,
      title: b.title,
      description: b.description,
      searchQuery: b.search_query,
      concept: b.concept,
      watched: true,
      videoId: b.youtube_video_id
    }
    playVideo(video)
  }

  // Toggle bookmark
  const toggleBookmark = async () => {
    if (!currentVideo) return
    
    try {
      if (isVideoBookmarked(currentVideo.id)) {
        const bookmark = bookmarks.find(b => b.video_id === currentVideo.id)
        if (bookmark) {
          await apiDeleteChapterVideoBookmark(chapter.id, bookmark.id)
        }
      } else {
        await apiSaveChapterVideoBookmark(chapter.id, {
          video_id: currentVideo.id,
          title: currentVideo.title,
          description: currentVideo.description,
          concept: currentVideo.concept,
          search_query: currentVideo.searchQuery,
          youtube_video_id: currentVideo.videoId
        })
      }
      const updatedBookmarks = await apiGetChapterVideoBookmarks(chapter.id)
      setBookmarks(updatedBookmarks || [])
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
    }
  }

  // Delete from history
  const handleDeleteHistory = async (historyId: number) => {
    try {
      await apiDeleteChapterVideoHistory(chapter.id, historyId)
      setHistory(prev => prev.filter(h => h.id !== historyId))
    } catch (err) {
      console.error('Failed to delete history:', err)
    }
  }

  // Delete from bookmarks
  const handleDeleteBookmark = async (bookmarkId: number) => {
    try {
      await apiDeleteChapterVideoBookmark(chapter.id, bookmarkId)
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
    } catch (err) {
      console.error('Failed to delete bookmark:', err)
    }
  }

  // ── GENERATING VIEW ──
  if (viewState === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-app-orange/10 flex items-center justify-center mb-4 animate-pulse">
          <PlayCircle size={32} weight="duotone" className="text-app-orange" />
        </div>
        <p className="text-[14px] font-bold text-app-text mb-2">Finding Videos...</p>
        <p className="text-[12px] text-app-muted">Getting recommendations for {chapter.chapter_name}</p>
      </div>
    )
  }

  // ── PLAYER VIEW ──
  if (viewState === 'player' && currentVideo) {
    const isBookmarked = isVideoBookmarked(currentVideo.id)
    const searchQuery = `${currentVideo.searchQuery} ${chapter.board} class ${chapter.standard}`
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => videos.length > 0 ? setViewState('list') : setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-app-text truncate">{currentVideo.title}</h3>
            {currentVideo.concept && (
              <p className="text-[10px] text-app-muted">{currentVideo.concept}</p>
            )}
          </div>
          {/* Bookmark button */}
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition-colors ${
              isBookmarked 
                ? 'bg-app-yellow/15 text-app-yellow' 
                : 'bg-white/[0.04] text-app-muted hover:text-app-yellow'
            }`}
          >
            <BookmarkSimple size={18} weight={isBookmarked ? 'fill' : 'regular'} />
          </button>
        </div>

        {/* Video Player or Loading */}
        {loadingVideo ? (
          <div className="aspect-video bg-black/50 rounded-xl flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center animate-pulse mb-3">
              <PlayCircle size={24} weight="duotone" className="text-red-500" />
            </div>
            <p className="text-[12px] text-app-muted">Loading video...</p>
          </div>
        ) : currentVideo.videoId ? (
          /* Embedded YouTube Player */
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentVideo.title}
            />
          </div>
        ) : (
          /* Fallback - Open on YouTube */
          <div 
            onClick={() => window.open(youtubeSearchUrl, '_blank', 'noopener,noreferrer')}
            className="bg-gradient-to-br from-red-600/20 to-red-900/30 rounded-xl aspect-video overflow-hidden relative cursor-pointer group"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg">
                <PlayCircle size={32} weight="fill" className="text-white ml-1" />
              </div>
              <p className="text-[14px] font-bold text-white mb-1">Watch on YouTube</p>
              <p className="text-[11px] text-white/70 text-center px-6">Click to open in YouTube</p>
            </div>
          </div>
        )}

        {/* Video details */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div>
            <p className="text-[10px] text-app-muted mb-1">Topic</p>
            <p className="text-[13px] text-app-text font-semibold">{currentVideo.title}</p>
          </div>
          
          {currentVideo.description && (
            <div>
              <p className="text-[10px] text-app-muted mb-1">Description</p>
              <p className="text-[12px] text-app-text">{currentVideo.description}</p>
            </div>
          )}
          
          {currentVideo.concept && (
            <div>
              <p className="text-[10px] text-app-muted mb-1">Concept</p>
              <span className="inline-block text-[11px] font-bold text-app-blue bg-app-blue/10 px-2 py-1 rounded">
                {currentVideo.concept}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={toggleBookmark}
            className={`flex-1 text-[12px] font-semibold rounded-xl py-2.5 flex items-center justify-center gap-1.5
                      ${isBookmarked 
                        ? 'bg-app-yellow/15 text-app-yellow' 
                        : 'bg-white/[0.04] text-app-muted'}`}
          >
            <BookmarkSimple size={14} weight={isBookmarked ? 'fill' : 'regular'} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button
            onClick={() => videos.length > 0 ? setViewState('list') : setViewState('home')}
            className="flex-1 bg-white/[0.04] text-app-text text-[12px] font-semibold rounded-xl py-2.5"
          >
            ← More Videos
          </button>
        </div>
      </div>
    )
  }

  // ── HISTORY VIEW ──
  if (viewState === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div>
            <h3 className="text-[14px] font-bold text-app-text">Watch History</h3>
            <p className="text-[10px] text-app-muted">{history.length} videos watched</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <ClockCounterClockwise size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">No watch history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const dateStr = new Date(h.watched_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })
              return (
                <div
                  key={h.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3"
                >
                  <div 
                    onClick={() => playFromHistory(h)}
                    className="w-10 h-10 rounded-lg bg-app-orange/15 flex items-center justify-center cursor-pointer hover:bg-app-orange/25 transition-colors"
                  >
                    <PlayCircle size={18} className="text-app-orange" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playFromHistory(h)}>
                    <p className="text-[12px] text-app-text font-semibold truncate">{h.title}</p>
                    <p className="text-[10px] text-app-muted">{dateStr}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteHistory(h.id)}
                    className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── BOOKMARKS VIEW ──
  if (viewState === 'bookmarks') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div>
            <h3 className="text-[14px] font-bold text-app-text">Bookmarked Videos</h3>
            <p className="text-[10px] text-app-muted">{bookmarks.length} saved</p>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <BookmarkSimple size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">No bookmarked videos yet</p>
            <p className="text-[10px] text-app-muted mt-1">Bookmark videos to watch later</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((b) => (
              <div
                key={b.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-start gap-3"
              >
                <div 
                  onClick={() => playFromBookmark(b)}
                  className="w-10 h-10 rounded-lg bg-app-yellow/15 flex items-center justify-center cursor-pointer hover:bg-app-yellow/25 transition-colors flex-shrink-0"
                >
                  <PlayCircle size={18} className="text-app-yellow" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playFromBookmark(b)}>
                  <p className="text-[12px] text-app-text font-semibold truncate">{b.title}</p>
                  {b.concept && (
                    <span className="inline-block text-[9px] font-bold text-app-blue bg-app-blue/10 px-1.5 py-0.5 rounded mt-0.5">
                      {b.concept}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteBookmark(b.id)}
                  className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── LIST VIEW ──
  if (viewState === 'list' && videos.length > 0) {
    const watchedCount = videos.filter(v => v.watched).length
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-app-text">Video Recommendations</h3>
            <p className="text-[10px] text-app-muted">{watchedCount}/{videos.length} watched</p>
          </div>
          <button
            onClick={generateRecommendations}
            disabled={loading}
            className="px-3 py-1.5 bg-app-orange/15 text-app-orange text-[11px] font-semibold rounded-lg"
          >
            Refresh
          </button>
        </div>

        {/* Video list */}
        <div className="space-y-2">
          {videos.map((video) => {
            const bookmarked = isVideoBookmarked(video.id)
            return (
              <div
                key={video.id}
                className={`bg-white/[0.02] border rounded-xl p-3 flex items-start gap-3
                           ${video.watched ? 'border-app-green/30' : 'border-white/[0.06]'}`}
              >
                <div 
                  onClick={() => playVideo(video)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer
                             hover:scale-105 transition-transform
                             ${video.watched ? 'bg-app-green/15' : 'bg-app-orange/15'}`}
                >
                  {video.watched ? (
                    <CheckCircle size={20} weight="fill" className="text-app-green" />
                  ) : (
                    <PlayCircle size={20} weight="duotone" className="text-app-orange" />
                  )}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playVideo(video)}>
                  <p className="text-[12px] font-semibold text-app-text mb-0.5 line-clamp-1">{video.title}</p>
                  <p className="text-[10px] text-app-muted line-clamp-2">{video.description}</p>
                  {video.concept && (
                    <span className="inline-block mt-1 text-[9px] font-bold text-app-blue bg-app-blue/10 px-1.5 py-0.5 rounded">
                      {video.concept}
                    </span>
                  )}
                </div>
                {/* Bookmark indicator */}
                {bookmarked && (
                  <BookmarkSimple size={14} weight="fill" className="text-app-yellow flex-shrink-0 mt-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── HOME VIEW ──
  return (
    <div className="space-y-4">
      {/* Generate recommendations */}
      <div className="bg-app-card border border-white/[0.04] rounded-2xl p-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-app-orange/10 flex items-center justify-center mx-auto mb-3">
          <PlayCircle size={24} weight="duotone" className="text-app-orange" />
        </div>
        <h3 className="text-[14px] font-bold text-app-text mb-1">
          {ui.learnWithVideos || 'Learn with Videos'}
        </h3>
        <p className="text-[11px] text-app-muted mb-4 max-w-[250px] mx-auto">
          Get AI-powered video recommendations for "{chapter.chapter_name}"
        </p>

        {error && (
          <p className="text-[11px] text-app-red mb-3">{error}</p>
        )}

        <button
          onClick={generateRecommendations}
          disabled={loading}
          className="px-5 py-2.5 bg-app-orange text-white rounded-xl font-bold text-[13px]
                    flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          <Sparkle size={16} weight="bold" />
          Find Videos
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        {history.length > 0 && (
          <button
            onClick={() => setViewState('history')}
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-left"
          >
            <ClockCounterClockwise size={18} className="text-app-orange mb-1" />
            <p className="text-[11px] font-semibold text-app-text">History</p>
            <p className="text-[9px] text-app-muted">{history.length} watched</p>
          </button>
        )}
        {bookmarks.length > 0 && (
          <button
            onClick={() => setViewState('bookmarks')}
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-left"
          >
            <BookmarkSimple size={18} className="text-app-yellow mb-1" />
            <p className="text-[11px] font-semibold text-app-text">Bookmarks</p>
            <p className="text-[9px] text-app-muted">{bookmarks.length} saved</p>
          </button>
        )}
      </div>

      {/* Recently watched preview */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[12px] font-bold text-app-muted">Continue Watching</h4>
            <button
              onClick={() => setViewState('history')}
              className="text-[10px] text-app-orange font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 2).map((h) => (
              <div
                key={h.id}
                onClick={() => playFromHistory(h)}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-app-orange/15 flex items-center justify-center">
                  <PlayCircle size={16} weight="fill" className="text-app-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-app-text truncate">{h.title}</p>
                  <p className="text-[9px] text-app-muted">
                    {new Date(h.watched_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Flashcards Tab (Placeholder) ──
// ── Flashcard Interfaces & Helpers ──
interface Flashcard {
  id: string
  front: string
  back: string
  concept?: string
  mastered: boolean
}

interface FlashcardSet {
  id: number
  chapter_id: number
  chapter_name: string
  cards: Flashcard[]
  created_at: string
  reviewed_count: number
}

type FlashcardViewState = 'home' | 'generating' | 'study' | 'sets'

const FlashcardsTab: React.FC<{ chapter: any; ui: any; user: any }> = ({ chapter, ui, user }) => {
  const [viewState, setViewState] = useState<FlashcardViewState>('home')
  const [sets, setSets] = useState<FlashcardSet[]>([])
  const [currentSet, setCurrentSet] = useState<FlashcardSet | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cardCount, setCardCount] = useState(10)
  const [_isLoading, setIsLoading] = useState(true)

  // Load sets from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const data = await apiGetChapterFlashcards(chapter.id)
        setSets(data || [])
      } catch (err) {
        console.error('Failed to load flashcards:', err)
      }
      setIsLoading(false)
    }
    loadData()
  }, [chapter.id])

  // Generate flashcards using AI
  const generateFlashcards = async () => {
    setLoading(true)
    setError('')
    setViewState('generating')

    try {
      const prompt = `Create ${cardCount} flashcards for studying "${chapter.chapter_name}" (${chapter.subject}, ${chapter.board} ${chapter.standard}).

${chapter.topics?.length ? `Key topics to cover: ${chapter.topics.join(', ')}` : ''}
${chapter.description ? `Chapter overview: ${chapter.description}` : ''}

Return ONLY a valid JSON array of flashcard objects. Each object must have:
- "front": The question or term (keep concise, 1-2 sentences max)
- "back": The answer or definition (clear, concise explanation)
- "concept": The topic/concept this card covers (optional, short label)

Example format:
[
  {"front": "What is photosynthesis?", "back": "The process by which plants convert sunlight, water, and CO2 into glucose and oxygen.", "concept": "Photosynthesis"},
  {"front": "Define mitosis", "back": "Cell division that produces two identical daughter cells with the same number of chromosomes.", "concept": "Cell Division"}
]

Generate exactly ${cardCount} diverse flashcards covering the key concepts. Return ONLY the JSON array, no other text.`

      // Build language-aware system prompt
      const userLang = (user?.language || 'English') as keyof typeof LANG_RULES
      const langRule = LANG_RULES[userLang] || LANG_RULES.English
      const systemPrompt = `You are a flashcard generator. Generate content in the student's language.

🚨 LANGUAGE RULE — MANDATORY:
${langRule}
${userLang === 'Hindi' ? '\n⚠️ Write questions and answers in DEVANAGARI SCRIPT (हिंदी). NO Roman/Latin letters, NO Hinglish.' : userLang === 'Marathi' ? '\n⚠️ Write in MARATHI DEVANAGARI (मराठी). NO Hindi words.' : ''}

🚨 FORMAT RULE — MANDATORY:
Return ONLY a valid JSON array starting with [ and ending with ]. Each flashcard must be {"front": "question", "back": "answer", "concept": "topic"}. Example: [{"front": "...", "back": "...", "concept": "..."}]`

      const response = await callAI(prompt, systemPrompt, [], 3, 2000, 'flashcard_gen')
      
      // Parse the response (AI returns an array)
      const parsed = parseAIArray(response)
      let cards: Flashcard[] = []

      if (Array.isArray(parsed) && parsed.length > 0) {
        cards = parsed.map((c: any, i: number) => ({
          id: `card_${Date.now()}_${i}`,
          front: String(c.front || c.question || '').trim(),
          back: String(c.back || c.answer || '').trim(),
          concept: String(c.concept || c.topic || '').trim(),
          mastered: false
        })).filter(c => c.front && c.back)
      }

      if (cards.length === 0) {
        throw new Error('Failed to generate flashcards')
      }

      // Save to API
      const savedSet = await apiSaveChapterFlashcards(chapter.id, {
        chapter_name: chapter.chapter_name,
        cards
      })
      
      const updatedSets = await apiGetChapterFlashcards(chapter.id)
      setSets(updatedSets || [])
      setCurrentSet(savedSet)
      setCurrentIndex(0)
      setIsFlipped(false)
      setViewState('study')
    } catch (err) {
      setError('Failed to generate flashcards. Please try again.')
      setViewState('home')
    }

    setLoading(false)
  }

  // Study a saved set
  const studySet = (set: FlashcardSet) => {
    setCurrentSet(set)
    setCurrentIndex(0)
    setIsFlipped(false)
    setViewState('study')
  }

  // Delete a set
  const handleDeleteSet = async (setId: number) => {
    try {
      await apiDeleteChapterFlashcards(chapter.id, setId)
      setSets(prev => prev.filter(s => s.id !== setId))
      if (currentSet?.id === setId) {
        setCurrentSet(null)
        setViewState('home')
      }
    } catch (err) {
      console.error('Failed to delete flashcard set:', err)
    }
  }

  // Toggle card mastered status
  const toggleMastered = async () => {
    if (!currentSet) return
    const updatedCards = [...currentSet.cards]
    updatedCards[currentIndex].mastered = !updatedCards[currentIndex].mastered
    const updatedSet = { ...currentSet, cards: updatedCards }
    
    try {
      await apiUpdateChapterFlashcards(chapter.id, currentSet.id, {
        name: currentSet.chapter_name,
        cards: updatedCards,
        mastery: currentSet.cards.filter(c => c.mastered).length / currentSet.cards.length,
        reviewed_count: currentSet.reviewed_count
      })
      setCurrentSet(updatedSet)
    } catch (err) {
      console.error('Failed to update flashcard:', err)
    }
  }

  // Navigation
  const nextCard = async () => {
    if (!currentSet) return
    setIsFlipped(false)
    if (currentIndex < currentSet.cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Update reviewed count
      const updatedSet = { ...currentSet, reviewed_count: currentSet.reviewed_count + 1 }
      try {
        await apiUpdateChapterFlashcards(chapter.id, currentSet.id, {
          name: currentSet.chapter_name,
          cards: currentSet.cards,
          mastery: currentSet.cards.filter(c => c.mastered).length / currentSet.cards.length,
          reviewed_count: updatedSet.reviewed_count
        })
        setCurrentSet(updatedSet)
      } catch (err) {
        console.error('Failed to update reviewed count:', err)
      }
      setCurrentIndex(0) // Loop back
    }
  }

  const prevCard = () => {
    setIsFlipped(false)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // ── GENERATING VIEW ──
  if (viewState === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-app-yellow/10 flex items-center justify-center mb-4 animate-pulse">
          <Cards size={32} weight="duotone" className="text-app-yellow" />
        </div>
        <p className="text-[14px] font-bold text-app-text mb-2">Generating Flashcards...</p>
        <p className="text-[12px] text-app-muted">Creating {cardCount} cards for {chapter.chapter_name}</p>
      </div>
    )
  }

  // ── STUDY VIEW ──
  if (viewState === 'study' && currentSet) {
    const currentCard = currentSet.cards[currentIndex]
    const masteredCount = currentSet.cards.filter(c => c.mastered).length
    const progress = ((currentIndex + 1) / currentSet.cards.length) * 100

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-app-text">Flashcards</h3>
            <p className="text-[10px] text-app-muted">
              Card {currentIndex + 1} of {currentSet.cards.length} · {masteredCount} mastered
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
            className="p-2 rounded-lg bg-white/[0.04] text-app-muted"
            title="Restart"
          >
            <ArrowCounterClockwise size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-app-yellow rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative min-h-[200px] rounded-2xl p-5 cursor-pointer transition-all duration-300 transform
                     ${isFlipped 
                       ? 'bg-app-yellow/10 border-2 border-app-yellow/30' 
                       : 'bg-white/[0.03] border-2 border-white/[0.08]'}
                     ${currentCard.mastered ? 'ring-2 ring-app-green/40' : ''}`}
        >
          {/* Concept tag */}
          {currentCard.concept && (
            <div className="absolute top-3 left-3">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-app-blue/10 text-app-blue rounded-md">
                {currentCard.concept}
              </span>
            </div>
          )}

          {/* Mastered badge */}
          {currentCard.mastered && (
            <div className="absolute top-3 right-3">
              <CheckCircle size={18} weight="fill" className="text-app-green" />
            </div>
          )}

          {/* Card content */}
          <div className="flex flex-col items-center justify-center min-h-[160px] pt-4">
            <p className="text-[10px] text-app-muted mb-2">{isFlipped ? 'Answer' : 'Question'}</p>
            <p className={`text-center leading-relaxed ${isFlipped ? 'text-[13px] text-app-text' : 'text-[15px] font-semibold text-app-text'}`}>
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          {/* Tap hint */}
          <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-app-muted">
            {isFlipped ? 'Tap to see question' : 'Tap to reveal answer'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevCard}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 bg-white/[0.04] text-app-text rounded-xl text-[12px] font-semibold
                      disabled:opacity-30 flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> Previous
          </button>
          <button
            onClick={toggleMastered}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1
                       ${currentCard.mastered 
                         ? 'bg-app-green/15 text-app-green' 
                         : 'bg-white/[0.04] text-app-muted'}`}
          >
            <CheckCircle size={14} weight={currentCard.mastered ? 'fill' : 'regular'} />
            {currentCard.mastered ? 'Mastered' : 'Mark Mastered'}
          </button>
          <button
            onClick={nextCard}
            className="flex-1 py-2.5 bg-app-yellow text-app-bg rounded-xl text-[12px] font-bold
                      flex items-center justify-center gap-1"
          >
            Next <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    )
  }

  // ── SAVED SETS VIEW ──
  if (viewState === 'sets') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('home')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div>
            <h3 className="text-[14px] font-bold text-app-text">Saved Sets</h3>
            <p className="text-[10px] text-app-muted">{sets.length} flashcard sets</p>
          </div>
        </div>

        {sets.length === 0 ? (
          <div className="text-center py-8">
            <Cards size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">No saved flashcard sets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sets.map((set) => {
              const masteredCount = set.cards.filter(c => c.mastered).length
              const masteredPct = Math.round((masteredCount / set.cards.length) * 100)
              const dateStr = new Date(set.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
              })
              return (
                <div
                  key={set.id}
                  onClick={() => studySet(set)}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-app-yellow/15 flex items-center justify-center">
                    <Cards size={18} className="text-app-yellow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text font-semibold">
                      {set.cards.length} cards
                    </p>
                    <p className="text-[10px] text-app-muted">
                      {dateStr} · {masteredPct}% mastered · Reviewed {set.reviewed_count}x
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSet(set.id)
                    }}
                    className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── HOME VIEW ──
  return (
    <div className="space-y-4">
      {/* Generate new */}
      <div className="bg-app-card border border-white/[0.04] rounded-2xl p-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-app-yellow/10 flex items-center justify-center mx-auto mb-3">
          <Cards size={24} weight="duotone" className="text-app-yellow" />
        </div>
        <h3 className="text-[14px] font-bold text-app-text mb-1">
          {ui.flashcards || 'Flashcards'}
        </h3>
        <p className="text-[11px] text-app-muted mb-4 max-w-[250px] mx-auto">
          Generate AI flashcards for "{chapter.chapter_name}"
        </p>

        {/* Card count selector */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[5, 10, 15, 20].map((count) => (
            <button
              key={count}
              onClick={() => setCardCount(count)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all
                        ${cardCount === count 
                          ? 'bg-app-yellow text-app-bg' 
                          : 'bg-white/[0.04] text-app-muted hover:text-app-text'}`}
            >
              {count}
            </button>
          ))}
          <span className="text-[10px] text-app-muted">cards</span>
        </div>

        {error && (
          <p className="text-[11px] text-app-red mb-3">{error}</p>
        )}

        <button
          onClick={generateFlashcards}
          disabled={loading}
          className="px-5 py-2.5 bg-app-yellow text-app-bg rounded-xl font-bold text-[13px]
                    flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          <Sparkle size={16} weight="bold" />
          Generate Flashcards
        </button>
      </div>

      {/* Saved sets */}
      {sets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[12px] font-bold text-app-muted">Saved Sets</h4>
            <button
              onClick={() => setViewState('sets')}
              className="text-[10px] text-app-blue font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {sets.slice(0, 2).map((set) => {
              const masteredCount = set.cards.filter(c => c.mastered).length
              const masteredPct = Math.round((masteredCount / set.cards.length) * 100)
              return (
                <div
                  key={set.id}
                  onClick={() => studySet(set)}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-app-yellow/15 flex items-center justify-center">
                    <Cards size={18} className="text-app-yellow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text font-semibold">{set.cards.length} cards</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-app-green rounded-full" style={{ width: `${masteredPct}%` }} />
                      </div>
                      <span className="text-[10px] text-app-muted">{masteredPct}%</span>
                    </div>
                  </div>
                  <ArrowLeft size={14} className="text-app-muted rotate-180" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quiz Tab (Self-Contained Inline Quiz) ──
const QUIZ_LENGTHS = [
  { count: 5, label: 'Quick', icon: '⚡', color: '#00E5A0', time: '~3 min' },
  { count: 10, label: 'Standard', icon: '📝', color: '#FFD166', time: '~6 min' },
  { count: 15, label: 'Challenge', icon: '🔥', color: '#FF6B35', time: '~10 min' },
]

type QuizState = 'setup' | 'active' | 'summary' | 'history' | 'bookmarks'

interface QuizQuestion {
  q: string
  o: string[]
  c: string
  concept?: string
  exp?: string
}

interface QuizAnswer {
  selected: string
  correct: boolean
  question: QuizQuestion
}

interface QuizHistoryItem {
  id: number
  chapter_id: number
  mode: string
  score: number
  total: number
  time_spent: number
  questions: QuizAnswer[]  // Stored as JSON in DB
  completed_at: string
}

interface BookmarkedQuestion {
  id: number
  chapter_id: number
  question: string
  options: string[]
  correct_idx: number
  explanation: string
  bookmarked_at: string
}

const QuizTab: React.FC<{ chapter: any; ui: any; user: any }> = ({ chapter, ui, user }) => {
  // Quiz states
  const [quizState, setQuizState] = useState<QuizState>('setup')
  const [quizLength, setQuizLength] = useState(5)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [askedConcepts, setAskedConcepts] = useState<string[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  
  // Final quiz results (stored when transitioning to summary)
  const [finalStats, setFinalStats] = useState<{
    totalQuestions: number
    correctCount: number
    accuracy: number
    allAnswers: QuizAnswer[]
  } | null>(null)
  
  // History & Bookmarks
  const [history, setHistory] = useState<QuizHistoryItem[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [selectedHistory, setSelectedHistory] = useState<QuizHistoryItem | null>(null)
  
  // Load history & bookmarks from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [historyData, bookmarksData] = await Promise.all([
          apiGetChapterQuizHistory(chapter.id).catch(() => []),
          apiGetChapterQuizBookmarks(chapter.id).catch(() => [])
        ])
        setHistory(historyData || [])
        setBookmarks(bookmarksData || [])
      } catch (err) {
        console.error('Failed to load quiz data:', err)
      }
      setIsLoading(false)
    }
    loadData()
  }, [chapter.id])
  
  // Refresh history/bookmarks
  const refreshData = async () => {
    try {
      const [historyData, bookmarksData] = await Promise.all([
        apiGetChapterQuizHistory(chapter.id).catch(() => []),
        apiGetChapterQuizBookmarks(chapter.id).catch(() => [])
      ])
      setHistory(historyData || [])
      setBookmarks(bookmarksData || [])
    } catch (err) {
      console.error('Failed to refresh quiz data:', err)
    }
  }
  
  // Save completed quiz to history
  const saveToHistory = async (finalAnswers: QuizAnswer[], _finalAccuracy: number) => {
    try {
      const timeSpent = startTime && endTime ? Math.round((endTime - startTime) / 1000) : 0
      await apiSaveChapterQuizHistory(chapter.id, {
        mode: 'quick',
        score: finalAnswers.filter(a => a.correct).length,
        total: finalAnswers.length,
        time_spent: timeSpent,
        questions: finalAnswers
      })
      await refreshData()
    } catch (err) {
      console.error('Failed to save quiz history:', err)
    }
  }
  
  // Bookmark a question
  const handleBookmark = async (question: QuizQuestion) => {
    try {
      const correctIdx = question.o.findIndex(opt => opt.charAt(0) === question.c)
      await apiSaveChapterQuizBookmark(chapter.id, {
        question: question.q,
        options: question.o,
        correct_idx: correctIdx >= 0 ? correctIdx : 0,
        explanation: question.exp || ''
      })
      setBookmarkedIds(prev => new Set(prev).add(question.q))
      await refreshData()
    } catch (err) {
      console.error('Failed to bookmark question:', err)
    }
  }
  
  // Delete history item
  const handleDeleteHistory = async (id: number) => {
    try {
      await apiDeleteChapterQuizHistory(chapter.id, id)
      await refreshData()
    } catch (err) {
      console.error('Failed to delete quiz history:', err)
    }
  }
  
  // Delete bookmark
  const handleDeleteBookmark = async (id: number, questionText: string) => {
    try {
      await apiDeleteChapterQuizBookmark(chapter.id, id)
      setBookmarkedIds(prev => {
        const next = new Set(prev)
        next.delete(questionText)
        return next
      })
      await refreshData()
    } catch (err) {
      console.error('Failed to delete bookmark:', err)
    }
  }

  // Generate a question for this chapter
  const generateQuestion = useCallback(async () => {
    const randomSeed = Math.random().toString(36).slice(2, 8)
    const topicsHint = chapter.topics?.length
      ? `Focus on one of these topics: ${chapter.topics.slice(0, 5).join(', ')}.`
      : ''
    const avoidList = askedConcepts.length > 0
      ? `\nAVOID these topics (already asked): ${askedConcepts.join(', ')}`
      : ''

    const prompt = `Generate exactly ONE multiple choice question for "${chapter.chapter_name}" (${chapter.subject}).

${topicsHint}${avoidList}

CRITICAL Requirements:
- Return ONLY a single JSON object, no markdown, no code fences
- The "o" array MUST have EXACTLY 4 options (not 5, not 6 - exactly 4)
- Options should be SHORT text (not labeled with A), B), etc - just the answer text)
- The "c" field must be exactly ONE letter: A, B, C, or D (the correct answer)
- Include a short "exp" field explaining why the answer is correct (1-2 sentences)
- Do NOT use LaTeX or special formatting - write equations as plain text (e.g. "Zn + CuSO4 → ZnSO4 + Cu")

Format:
{"q":"Question text?","o":["First option","Second option","Third option","Fourth option"],"c":"B","concept":"Topic","exp":"Brief explanation"}

[seed:${randomSeed}]`

    // Build language-aware system prompt
    const userLang = (user?.language || 'English') as keyof typeof LANG_RULES
    const langRule = LANG_RULES[userLang] || LANG_RULES.English
    const systemPrompt = `You are a quiz generator. Generate the question and options in the student's language.

🚨 LANGUAGE RULE — MANDATORY:
${langRule}
${userLang === 'Hindi' ? '\n⚠️ Write question and options in DEVANAGARI SCRIPT (हिंदी). NO Roman/Latin letters, NO Hinglish.' : userLang === 'Marathi' ? '\n⚠️ Write in MARATHI DEVANAGARI (मराठी). NO Hindi words.' : ''}

🚨 FORMAT RULE — MANDATORY:
Return ONLY a single JSON object. The question, options, explanation must all be strings. Example: {"q": "...", "o": ["A", "B", "C", "D"], "c": "B", "concept": "...", "exp": "..."}`

    try {
      const res = await callAI(prompt, systemPrompt, [], 3, 500, 'chapter_quiz')
      console.log('AI response:', res)
      if (typeof res === 'string' && res.startsWith('⚠️')) {
        setError(res)
        return null
      }
      
      // Clean the response - remove markdown fences if present
      let cleaned = res
      if (typeof cleaned === 'string') {
        cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        
        // Remove LaTeX-style escaped braces that break JSON parsing
        cleaned = cleaned.replace(/\\\{/g, '(').replace(/\\\}/g, ')')
        cleaned = cleaned.replace(/\{\{/g, '(').replace(/\}\}/g, ')')
        
        // Take only the first JSON object if multiple
        const firstBrace = cleaned.indexOf('{')
        if (firstBrace !== -1) {
          let depth = 0
          let end = firstBrace
          let inString = false
          let escapeNext = false
          for (let i = firstBrace; i < cleaned.length; i++) {
            const char = cleaned[i]
            if (escapeNext) { escapeNext = false; continue }
            if (char === '\\') { escapeNext = true; continue }
            if (char === '"') { inString = !inString; continue }
            if (inString) continue
            if (char === '{') depth++
            if (char === '}') depth--
            if (depth === 0) { end = i + 1; break }
          }
          cleaned = cleaned.slice(firstBrace, end)
        }
      }
      
      const parsed = parseAIObject(cleaned)
      
      // Validate and normalize the response
      if (parsed?.q && Array.isArray(parsed?.o) && parsed.o.length >= 4 && parsed?.c) {
        // Normalize options: take first 4, strip any "A)", "B)" prefixes
        const normalizedOptions = parsed.o.slice(0, 4).map((opt: string) => 
          String(opt).replace(/^[A-D]\)\s*/i, '').trim()
        )
        
        // Normalize correct answer to A/B/C/D
        let correctAnswer = String(parsed.c).toUpperCase().trim()
        if (!['A','B','C','D'].includes(correctAnswer)) {
          // Try to extract letter from "A)" or similar
          const match = correctAnswer.match(/^([A-D])/i)
          correctAnswer = match ? match[1].toUpperCase() : 'A'
        }
        
        return {
          q: String(parsed.q),
          o: normalizedOptions,
          c: correctAnswer,
          concept: String(parsed.concept || ''),
          exp: String(parsed.exp || '')
        }
      }
      
      console.warn('Invalid quiz response:', parsed, 'cleaned:', cleaned)
      return null
    } catch (err) {
      console.error('Quiz AI error:', err)
      setError(ui.errorGenerating || 'AI service unavailable. Please try again.')
      return null
    }
  }, [chapter, askedConcepts, user, ui])

  // Start quiz
  const startQuiz = async () => {
    setLoading(true)
    setError('')
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setSelected(null)
    setStartTime(Date.now())
    setEndTime(null)
    setAskedConcepts([])

    // Try up to 3 times to generate a valid first question
    let q = null
    for (let attempt = 0; attempt < 3 && !q; attempt++) {
      q = await generateQuestion()
      if (q?.q && q?.o?.length === 4) break
      q = null
      await new Promise(r => setTimeout(r, 500))
    }

    if (q?.q && q?.o?.length === 4) {
      setQuestions([q])
      if (q.concept) setAskedConcepts([q.concept])
      setQuizState('active')
    } else {
      setError(ui.errorGenerating || 'Could not generate question. Try again.')
    }
    setLoading(false)
  }

  // Answer question
  const answerQuestion = (letter: string) => {
    if (selected) return
    setSelected(letter)

    const currentQ = questions[currentIndex]
    const isCorrect = letter === currentQ.c

    setAnswers((prev) => [
      ...prev,
      { selected: letter, correct: isCorrect, question: currentQ },
    ])
  }

  // Next question
  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1

    if (nextIndex >= quizLength) {
      setEndTime(Date.now())
      setQuizState('summary')
      return
    }

    setSelected(null)
    setCurrentIndex(nextIndex)
    
    // Generate next question if needed
    if (nextIndex >= questions.length) {
      setLoading(true)
      
      // Try up to 3 times to generate a valid question
      let q = null
      for (let attempt = 0; attempt < 3 && !q; attempt++) {
        q = await generateQuestion()
        if (q?.q && q?.o?.length === 4) break
        q = null
        await new Promise(r => setTimeout(r, 500)) // Brief delay between retries
      }
      
      if (q?.q && q?.o?.length === 4) {
        setQuestions((prev) => [...prev, q])
        if (q.concept) setAskedConcepts((prev) => [...prev, q.concept])
      } else {
        // If we couldn't generate a question after retries, end quiz early
        setEndTime(Date.now())
        setQuizState('summary')
      }
      setLoading(false)
    }
  }

  // Reset quiz
  const resetQuiz = () => {
    setQuizState('setup')
    setQuestions([])
    setAnswers([])
    setCurrentIndex(0)
    setSelected(null)
    setError('')
    setAskedConcepts([])
    setFinalStats(null)
    setStartTime(null)
    setEndTime(null)
    setSelectedHistory(null)
  }

  // Stats
  const correctCount = answers.filter((a) => a.correct).length
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 100) : 0
  const accuracyColor = accuracy >= 70 ? '#00E5A0' : accuracy >= 40 ? '#FFD166' : '#FF6B6B'

  // Option styling
  const getOptionClass = (letter: string) => {
    const currentQ = questions[currentIndex]
    if (!currentQ) return ''
    const base =
      'w-full bg-white/[0.02] border-[1.5px] border-white/[0.08] rounded-xl px-3.5 py-3 text-[13px] font-medium text-app-text text-left transition-all duration-200'
    if (!selected) return `${base} cursor-pointer hover:border-app-green/40`
    if (letter === currentQ.c)
      return 'w-full rounded-xl px-3.5 py-3 text-[13px] font-bold text-left bg-app-green/15 border-[1.5px] border-app-green text-app-green cursor-default'
    if (letter === selected && letter !== currentQ.c)
      return 'w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-app-red/10 border-[1.5px] border-app-red text-app-red cursor-default'
    return 'w-full rounded-xl px-3.5 py-3 text-[13px] font-medium text-left bg-white/[0.02] border-[1.5px] border-white/[0.06] text-app-muted opacity-50 cursor-default'
  }

  // ── SETUP SCREEN ──
  if (quizState === 'setup') {
    return (
      <div className="space-y-4">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-app-red/10 flex items-center justify-center mx-auto mb-3">
            <Target size={28} weight="duotone" className="text-app-red" />
          </div>
          <h3 className="text-[16px] font-bold text-app-text mb-1">
            {ui.testYourself || 'Test Yourself'}
          </h3>
          <p className="text-[12px] text-app-muted max-w-[260px] mx-auto">
            Quiz on "{chapter.chapter_name}"
          </p>
        </div>

        {/* Quiz Length */}
        <div>
          <label className="text-[11px] font-bold text-app-muted mb-2 block uppercase tracking-wider">
            {ui.quizLength || 'Quiz Length'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {QUIZ_LENGTHS.map(({ count, label, icon, color, time }) => {
              const isActive = quizLength === count
              return (
                <button
                  key={count}
                  onClick={() => setQuizLength(count)}
                  className="rounded-xl py-3 px-2 text-center transition-all active:scale-95"
                  style={{
                    background: isActive ? `${color}18` : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="text-xl mb-1">{icon}</div>
                  <div
                    className="text-[11px] font-bold"
                    style={{ color: isActive ? color : '#e6e6e6' }}
                  >
                    {label}
                  </div>
                  <div className="text-[10px] text-app-muted">
                    {count} Q · {time}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-app-red text-[12px]">{error}</p>}

        {/* Start Button */}
        <button
          onClick={startQuiz}
          disabled={loading}
          className="w-full bg-gradient-to-r from-app-red to-[#ff4444] text-white text-[13px] font-bold rounded-xl py-3 
                    disabled:opacity-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>Generating...</>
          ) : (
            <>
              <Lightning size={16} weight="fill" />
              {ui.startQuiz || 'Start Quiz'} ({quizLength} Questions)
            </>
          )}
        </button>
        
        {/* History & Bookmarks */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { refreshData(); setQuizState('history') }}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 
                      text-[12px] font-semibold text-app-muted hover:text-app-text
                      flex items-center justify-center gap-1.5 transition-all"
          >
            <ClockCounterClockwise size={14} />
            History {history.length > 0 && <span className="text-[10px] bg-white/10 px-1.5 rounded-full">{history.length}</span>}
          </button>
          <button
            onClick={() => { refreshData(); setQuizState('bookmarks') }}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 
                      text-[12px] font-semibold text-app-muted hover:text-app-text
                      flex items-center justify-center gap-1.5 transition-all"
          >
            <BookmarkSimple size={14} />
            Bookmarks {bookmarks.length > 0 && <span className="text-[10px] bg-app-yellow/20 text-app-yellow px-1.5 rounded-full">{bookmarks.length}</span>}
          </button>
        </div>
      </div>
    )
  }
  
  // ── HISTORY VIEW ──
  if (quizState === 'history') {
    // If a history item is selected, show its details
    if (selectedHistory) {
      const accuracy = selectedHistory.total > 0 ? Math.round((selectedHistory.score / selectedHistory.total) * 100) : 0
      const accColor = accuracy >= 70 ? '#00E5A0' : accuracy >= 50 ? '#FFD166' : '#FF6B6B'
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedHistory(null)}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
            >
              <ArrowLeft size={16} weight="bold" className="text-app-text" />
            </button>
            <div className="flex-1">
              <h3 className="text-[14px] font-bold text-app-text">Quiz Review</h3>
              <p className="text-[10px] text-app-muted">
                {new Date(selectedHistory.completed_at).toLocaleDateString('en-IN', { 
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                })}
              </p>
            </div>
            <div
              className="px-3 py-1 rounded-lg font-bold text-[12px]"
              style={{ background: `${accColor}20`, color: accColor }}
            >
              {accuracy}%
            </div>
          </div>

          {/* Stats summary */}
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-app-green font-semibold">
              <CheckCircle size={14} weight="fill" className="inline mr-1" />
              {selectedHistory.score} correct
            </span>
            <span className="text-app-red font-semibold">
              <XCircle size={14} weight="fill" className="inline mr-1" />
              {selectedHistory.total - selectedHistory.score} wrong
            </span>
          </div>

          {/* Questions list */}
          <div className="space-y-3">
            {selectedHistory.questions.map((a, i) => {
              const correctIdx = ['A','B','C','D'].indexOf(a.question.c)
              const selectedIdx = ['A','B','C','D'].indexOf(a.selected)
              const correctText = a.question.o[correctIdx] || ''
              const selectedText = a.question.o[selectedIdx] || ''
              
              return (
                <div
                  key={i}
                  className={`bg-white/[0.02] border rounded-xl p-3 ${
                    a.correct ? 'border-app-green/30' : 'border-app-red/30'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      a.correct ? 'bg-app-green/20 text-app-green' : 'bg-app-red/20 text-app-red'
                    }`}>
                      Q{i + 1}
                    </span>
                    <p className="text-[12px] text-app-text flex-1">{a.question.q}</p>
                  </div>
                  
                  {a.correct ? (
                    <div className="text-[11px] text-app-green pl-6">
                      <CheckCircle size={12} weight="fill" className="inline mr-1" />
                      {a.question.c}. {correctText}
                    </div>
                  ) : (
                    <div className="pl-6 space-y-1">
                      <div className="text-[11px] text-app-red">
                        <XCircle size={12} weight="fill" className="inline mr-1" />
                        Your answer: {a.selected}. {selectedText}
                      </div>
                      <div className="text-[11px] text-app-green">
                        <CheckCircle size={12} weight="fill" className="inline mr-1" />
                        Correct: {a.question.c}. {correctText}
                      </div>
                      {a.question.exp && (
                        <div className="text-[10px] text-app-muted mt-1 pl-4 border-l-2 border-app-green/30">
                          {a.question.exp}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Back button */}
          <button
            onClick={() => setSelectedHistory(null)}
            className="w-full bg-white/[0.04] text-app-text text-[12px] font-semibold rounded-xl py-2.5"
          >
            Back to History
          </button>
        </div>
      )
    }

    // History list view
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuizState('setup')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div>
            <h3 className="text-[14px] font-bold text-app-text">{ui.quizHistory || 'Quiz History'}</h3>
            <p className="text-[10px] text-app-muted">{history.length} past quizzes</p>
          </div>
        </div>
        
        {history.length === 0 ? (
          <div className="text-center py-8">
            <ClockCounterClockwise size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">No quiz history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const dateStr = new Date(h.completed_at).toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
              })
              const accuracy = h.total > 0 ? Math.round((h.score / h.total) * 100) : 0
              const accColor = accuracy >= 70 ? '#00E5A0' : accuracy >= 50 ? '#FFD166' : '#FF6B6B'
              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHistory(h)}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[12px]"
                    style={{ background: `${accColor}20`, color: accColor }}
                  >
                    {accuracy}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text font-semibold">
                      {h.score}/{h.total} correct
                    </p>
                    <p className="text-[10px] text-app-muted">{dateStr}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteHistory(h.id)
                    }}
                    className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  
  // ── BOOKMARKS VIEW ──
  if (quizState === 'bookmarks') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuizState('setup')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div>
            <h3 className="text-[14px] font-bold text-app-text">{ui.bookmarkedQuestions || 'Bookmarked Questions'}</h3>
            <p className="text-[10px] text-app-muted">{bookmarks.length} saved for revision</p>
          </div>
        </div>
        
        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <BookmarkSimple size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">No bookmarked questions yet</p>
            <p className="text-[10px] text-app-muted mt-1">Bookmark wrong answers for revision</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((b) => {
              const correctText = b.options[b.correct_idx] || ''
              const correctLetter = ['A', 'B', 'C', 'D'][b.correct_idx] || 'A'
              return (
                <div
                  key={b.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[11px] text-app-text flex-1">{b.question}</p>
                    <button
                      onClick={() => handleDeleteBookmark(b.id, b.question)}
                      className="p-1.5 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-app-green font-semibold mb-1">
                    ✓ {correctLetter}: {correctText}
                  </div>
                  {b.explanation && (
                    <p className="text-[10px] text-app-blue bg-app-blue/10 rounded-lg px-2 py-1.5 leading-relaxed">
                      💡 {b.explanation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── SUMMARY SCREEN ──
  if (quizState === 'summary') {
    // Use finalStats if available, otherwise fall back to computed values
    const summaryAccuracy = finalStats?.accuracy ?? accuracy
    const summaryAllAnswers = finalStats?.allAnswers ?? answers
    const summaryCorrect = finalStats?.correctCount ?? correctCount
    const summaryTimeTaken = endTime && startTime ? Math.round((endTime - startTime) / 1000) : 0
    const summaryTimePerQ = summaryAllAnswers.length > 0 
      ? Math.round(summaryTimeTaken / summaryAllAnswers.length) 
      : 0
    
    const grade =
      summaryAccuracy >= 90
        ? 'A+'
        : summaryAccuracy >= 80
          ? 'A'
          : summaryAccuracy >= 70
            ? 'B'
            : summaryAccuracy >= 60
              ? 'C'
              : summaryAccuracy >= 50
                ? 'D'
                : 'F'
    const gradeColor = summaryAccuracy >= 70 ? '#00E5A0' : summaryAccuracy >= 50 ? '#FFD166' : '#FF6B6B'
    const wrongAnswers = summaryAllAnswers.filter((a) => !a.correct)

    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Completion message */}
        <div className="text-center mb-2">
          <Sparkle size={20} weight="fill" className="text-app-yellow mx-auto mb-1" />
          <p className="text-[11px] font-bold text-app-yellow">{ui.quizComplete || 'Quiz Complete!'}</p>
        </div>
        
        {/* Score Circle */}
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke={gradeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${summaryAccuracy * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color: gradeColor }}>
                {summaryAccuracy}%
              </span>
              <span className="text-[10px] text-app-muted">Accuracy</span>
            </div>
          </div>
          <div
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[14px] font-bold"
            style={{ background: `${gradeColor}20`, color: gradeColor }}
          >
            <Trophy size={16} weight="fill" />
            Grade: {grade}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <CheckCircle size={18} weight="duotone" className="text-app-green mx-auto mb-1" />
            <div className="text-[15px] font-bold text-app-text">{summaryCorrect}</div>
            <div className="text-[10px] text-app-muted">Correct</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <XCircle size={18} weight="duotone" className="text-app-red mx-auto mb-1" />
            <div className="text-[15px] font-bold text-app-text">{summaryAllAnswers.length - summaryCorrect}</div>
            <div className="text-[10px] text-app-muted">Wrong</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <Clock size={18} weight="duotone" className="text-app-blue mx-auto mb-1" />
            <div className="text-[15px] font-bold text-app-text">{summaryTimePerQ}s</div>
            <div className="text-[10px] text-app-muted">Per Q</div>
          </div>
        </div>

        {/* Wrong Answers Review */}
        {wrongAnswers.length > 0 && (
          <div>
            <h4 className="text-[12px] font-bold text-app-muted mb-2 flex items-center gap-1.5">
              <Brain size={14} className="text-app-orange" />
              {ui.reviewMistakes || 'Review Mistakes'}
            </h4>
            <div className="space-y-2">
              {wrongAnswers.slice(0, 5).map((a, i) => {
                const correctIdx = ['A','B','C','D'].indexOf(a.question.c)
                const correctText = a.question.o[correctIdx] || ''
                const isBookmarked = bookmarkedIds.has(a.question.q)
                return (
                  <div
                    key={i}
                    className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[11px] text-app-text line-clamp-2 flex-1">{a.question.q}</p>
                      <button
                        onClick={() => !isBookmarked && handleBookmark(a.question)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isBookmarked 
                            ? 'bg-app-yellow/20 text-app-yellow' 
                            : 'bg-white/[0.04] text-app-muted hover:text-app-yellow'
                        }`}
                        title={isBookmarked ? 'Bookmarked' : 'Bookmark for revision'}
                      >
                        <BookmarkSimple size={14} weight={isBookmarked ? 'fill' : 'regular'} />
                      </button>
                    </div>
                    <div className="text-[10px] flex gap-2 mb-2">
                      <span className="text-app-red line-through">You: {a.selected}</span>
                      <span className="text-app-green font-bold">✓ {a.question.c}: {correctText}</span>
                    </div>
                    {a.question.exp && (
                      <p className="text-[10px] text-app-blue bg-app-blue/10 rounded-lg px-2 py-1.5 leading-relaxed">
                        💡 {a.question.exp}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={resetQuiz}
            className="flex-1 bg-gradient-to-r from-app-green to-[#33cc88] text-app-bg text-[12px] font-bold rounded-xl py-2.5
                      active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            {ui.playAgain || 'Play Again'}
          </button>
        </div>
      </div>
    )
  }

  // ── ACTIVE QUIZ ──
  const currentQ = questions[currentIndex]
  const progress = ((currentIndex + (selected ? 1 : 0)) / quizLength) * 100
  const isWaitingForQuestion = !currentQ && currentIndex < quizLength

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-app-muted">
            Question {currentIndex + 1}/{quizLength}
          </span>
          <span className="text-[12px] font-bold" style={{ color: accuracyColor }}>
            {correctCount}/{answers.length} correct
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-app-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {(loading || isWaitingForQuestion) ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Lightning size={32} weight="duotone" className="text-app-green mb-2 animate-pulse" />
          <p className="text-[12px] text-app-muted">Generating question...</p>
        </div>
      ) : currentQ ? (
        <>
          {/* Concept tag */}
          {currentQ.concept && (
            <div className="text-[10px] font-bold text-app-blue bg-app-blue/10 rounded-md px-2 py-0.5 w-fit">
              {currentQ.concept}
            </div>
          )}

          {/* Question */}
          <p className="text-[14px] font-semibold text-app-text leading-relaxed">{currentQ.q}</p>

          {/* Options */}
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((letter, i) => (
              <button
                key={letter}
                onClick={() => answerQuestion(letter)}
                disabled={!!selected}
                className={getOptionClass(letter)}
              >
                <span className="font-bold mr-2">{letter}.</span>
                {currentQ.o[i]}
              </button>
            ))}
          </div>

          {/* Next Button */}
          {selected && (
            <button
              onClick={() => {
                if (currentIndex + 1 >= quizLength) {
                  // Last question - go to summary and save history
                  setEndTime(Date.now())
                  // Include current answer in final tally (answers state might not be updated yet)
                  const currentAnswer = { selected, correct: selected === currentQ.c, question: currentQ }
                  const allAnswers = answers.find(a => a.question.q === currentQ.q) 
                    ? answers 
                    : [...answers, currentAnswer]
                  const finalCorrect = allAnswers.filter(a => a.correct).length
                  const finalAccuracy = allAnswers.length > 0 
                    ? Math.round((finalCorrect / allAnswers.length) * 100) 
                    : 0
                  // Store final stats for summary display
                  setFinalStats({
                    totalQuestions: quizLength,
                    correctCount: finalCorrect,
                    accuracy: finalAccuracy,
                    allAnswers
                  })
                  saveToHistory(allAnswers, finalAccuracy)
                  setQuizState('summary')
                } else {
                  nextQuestion()
                }
              }}
              disabled={loading}
              className="w-full bg-app-green text-app-bg text-[13px] font-bold rounded-xl py-2.5
                        disabled:opacity-50 active:scale-[0.99] transition-all"
            >
              {loading
                ? 'Loading...'
                : currentIndex + 1 >= quizLength
                  ? ui.seeResults || 'See Results'
                  : ui.nextQuestion || 'Next Question'}
            </button>
          )}
        </>
      ) : null}
    </div>
  )
}

// ── AI Tutor Tab (Self-Contained Inline Chat with History) ──
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: number
  chapter_id: number
  title: string
  messages: ChatMessage[]
  created_at: string
}

// Simple markdown renderer for chat messages with Mermaid diagram support
const renderMarkdown = (text: string): React.ReactNode => {
  // First, extract Mermaid code blocks and replace with placeholders
  const mermaidBlocks: string[] = []
  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/gi
  let match
  let processedText = text
  
  while ((match = mermaidRegex.exec(text)) !== null) {
    const placeholder = `__MERMAID_BLOCK_${mermaidBlocks.length}__`
    mermaidBlocks.push(match[1].trim())
    processedText = processedText.replace(match[0], placeholder)
  }

  // Split into lines
  const lines = processedText.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let keyIndex = 0

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul'
      elements.push(
        <ListTag key={`list-${keyIndex++}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-4 my-1.5 space-y-0.5`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-[12px]">{renderInline(item)}</li>
          ))}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  const renderInline = (line: string): React.ReactNode => {
    // Process inline markdown: **bold**, *italic*, `code`
    const parts: React.ReactNode[] = []
    let remaining = line
    let partKey = 0

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      // Italic: *text*
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
      // Code: `text`
      const codeMatch = remaining.match(/`([^`]+)`/)

      // Find earliest match
      const matches = [
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index)

      if (matches.length === 0) {
        parts.push(remaining)
        break
      }

      const first = matches[0]!
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index))
      }

      if (first.type === 'bold') {
        parts.push(<strong key={`b-${partKey++}`} className="font-bold text-app-text">{first.match[1]}</strong>)
      } else if (first.type === 'italic') {
        parts.push(<em key={`i-${partKey++}`} className="italic">{first.match[1]}</em>)
      } else if (first.type === 'code') {
        parts.push(<code key={`c-${partKey++}`} className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono">{first.match[1]}</code>)
      }

      remaining = remaining.slice(first.index + first.match[0].length)
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty line
    if (!line) {
      flushList()
      elements.push(<div key={`br-${keyIndex++}`} className="h-2" />)
      continue
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={`h3-${keyIndex++}`} className="text-[13px] font-bold text-app-text mt-2 mb-1">{renderInline(line.slice(4))}</h4>)
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={`h2-${keyIndex++}`} className="text-[14px] font-bold text-app-text mt-2 mb-1">{renderInline(line.slice(3))}</h3>)
      continue
    }
    if (line.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={`h1-${keyIndex++}`} className="text-[15px] font-bold text-app-text mt-2 mb-1">{renderInline(line.slice(2))}</h2>)
      continue
    }

    // Numbered list: 1. item
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(numberedMatch[1])
      continue
    }

    // Bullet list: - item or * item
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(bulletMatch[1])
      continue
    }

    // Check for Mermaid placeholder
    const mermaidMatch = line.match(/__MERMAID_BLOCK_(\d+)__/)
    if (mermaidMatch) {
      flushList()
      const blockIndex = parseInt(mermaidMatch[1], 10)
      const mermaidContent = mermaidBlocks[blockIndex]
      if (mermaidContent) {
        // Detect diagram type from content
        let diagramType: 'flowchart' | 'mindmap' | 'sequence' | 'classDiagram' = 'flowchart'
        if (mermaidContent.toLowerCase().startsWith('mindmap')) {
          diagramType = 'mindmap'
        } else if (mermaidContent.toLowerCase().startsWith('sequencediagram')) {
          diagramType = 'sequence'
        } else if (mermaidContent.toLowerCase().startsWith('classdiagram')) {
          diagramType = 'classDiagram'
        }
        
        elements.push(
          <div key={`mermaid-${keyIndex++}`} className="my-3 overflow-hidden">
            <DiagramViewer 
              diagram={{ type: diagramType, content: mermaidContent }}
              showHeader={false}
              compact={true}
            />
          </div>
        )
      }
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(<p key={`p-${keyIndex++}`} className="text-[12px] leading-relaxed">{renderInline(line)}</p>)
  }

  flushList()
  return <div className="space-y-1">{elements}</div>
}

// localStorage helpers for chat history — REMOVED, using API now

type ChatViewState = 'chat' | 'history'

const AITutorTab: React.FC<{ chapter: any; ui: any; user: any }> = ({ chapter, ui, user }) => {
  const [viewState, setViewState] = useState<ChatViewState>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)
  const [history, setHistory] = useState<ChatSession[]>([])
  const [_isLoading, setIsLoading] = useState(true)

  // Load history from API on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const sessions = await apiGetChapterChatSessions(chapter.id)
        setHistory(sessions || [])
      } catch (err) {
        console.error('Failed to load chat sessions:', err)
      }
      setIsLoading(false)
    }
    loadData()
  }, [chapter.id])

  // Auto-save current session when messages change
  useEffect(() => {
    const saveSession = async () => {
      if (messages.length >= 2 && currentSessionId) {
        try {
          // Save the latest message to the session
          const latestMsg = messages[messages.length - 1]
          await apiSaveChapterChatMessage(chapter.id, currentSessionId, {
            role: latestMsg.role,
            content: latestMsg.content
          })
        } catch (err) {
          console.error('Failed to save chat message:', err)
        }
      }
    }
    if (messages.length >= 2) {
      saveSession()
    }
  }, [messages.length, currentSessionId, chapter.id])

  // Start new chat
  const startNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setViewState('chat')
  }

  // Load a session from history
  const loadSession = async (session: ChatSession) => {
    try {
      const msgs = await apiGetChapterChatMessages(chapter.id, session.id)
      setMessages(msgs || [])
      setCurrentSessionId(session.id)
      setViewState('chat')
    } catch (err) {
      console.error('Failed to load chat messages:', err)
    }
  }

  // Delete a session
  const handleDeleteSession = async (sessionId: number) => {
    try {
      await apiDeleteChapterChatSession(chapter.id, sessionId)
      setHistory(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        startNewChat()
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err)
    }
  }

  // Send message to AI
  const sendMessage = async (question?: string) => {
    const text = question || input.trim()
    if (!text || loading) return

    // Create session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '')
        const newSession = await apiCreateChapterChatSession(chapter.id, title)
        sessionId = newSession.id
        setCurrentSessionId(sessionId)
        // Save first user message
        await apiSaveChapterChatMessage(chapter.id, sessionId, {
          role: 'user',
          content: text
        })
        // Refresh history
        const sessions = await apiGetChapterChatSessions(chapter.id)
        setHistory(sessions || [])
      } catch (err) {
        console.error('Failed to create chat session:', err)
        return
      }
    }

    // Add user message to UI
    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build language-aware system prompt using buildSystemPrompt
      const userLang = user?.language || 'English'
      const modeInstructions = `You are tutoring the student on the chapter "${chapter.chapter_name}" (${chapter.subject}, ${chapter.board} ${chapter.standard}).
${chapter.topics?.length ? `Key topics: ${chapter.topics.join(', ')}.` : ''}
${chapter.description ? `Chapter overview: ${chapter.description}` : ''}

Answer the student's question clearly and concisely. Use simple language appropriate for ${chapter.standard}. If relevant, include examples.

⚠️ CRITICAL REMINDER: Your ENTIRE response must be in ${userLang} using the proper script for that language. ${userLang === 'Hindi' ? 'Use ONLY Devanagari script (हिंदी). Do NOT use Roman/Latin script or Hinglish.' : userLang === 'Marathi' ? 'Use ONLY Devanagari script (मराठी). Do NOT use Hindi words.' : userLang !== 'English' ? `Write in ${userLang} script only.` : ''}`

      const systemPrompt = buildSystemPrompt(user || { language: 'English', standard: chapter.standard, board: chapter.board, name: 'Student' }, modeInstructions)

      // Build chapter context for backend - this is critical for AI to know the actual chapter content
      const chapterContext = {
        id: chapter.id,
        name: chapter.chapter_name,
        number: chapter.chapter_number,
        subject: chapter.subject || chapter.subject_name || chapter.subject_id,
        board: chapter.board || chapter.board_id,
        standard: chapter.standard || chapter.standard_id,
        medium: user?.language || 'English',
        topics: chapter.topics || [],
        description: chapter.description || '',
      }

      // callAI has a new chapterContext parameter added in shared.js
      const callAIFn = callAI as (
        prompt: string,
        systemPrompt: string,
        history: Array<{role: string; content: string}>,
        retries: number,
        maxTokens: number,
        mode: string,
        chapterContext: typeof chapterContext
      ) => Promise<string>
      
      const response = await callAIFn(
        text,
        systemPrompt,
        messages.map((m) => ({ role: m.role, content: m.content })),
        3,
        1000,
        'chapter_tutor',
        chapterContext
      )

      const assistantMsg: ChatMessage = { role: 'assistant', content: response || (ui.noResponse || "I couldn't generate a response. Please try again.") }
      setMessages((prev) => [...prev, assistantMsg])
      
      // Save assistant response to DB
      if (sessionId) {
        await apiSaveChapterChatMessage(chapter.id, sessionId, assistantMsg)
      }
    } catch (err) {
      const errorMsg: ChatMessage = { role: 'assistant', content: ui.somethingWrong || 'Sorry, something went wrong. Please try again.' }
      setMessages((prev) => [...prev, errorMsg])
    }

    setLoading(false)
  }

  // Suggested questions (localized)
  const suggestions = [
    `${ui.explainSimply || 'Explain in simple terms'} ${chapter.chapter_name}`,
    ui.keyConcepts || 'What are the key concepts?',
    ui.giveExample || 'Give me an example',
  ]

  // ── HISTORY VIEW ──
  if (viewState === 'history') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewState('chat')}
            className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"
          >
            <ArrowLeft size={16} weight="bold" className="text-app-text" />
          </button>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-app-text">{ui.chatHistory || 'Chat History'}</h3>
            <p className="text-[10px] text-app-muted">{history.length} {ui.conversations || 'conversations'}</p>
          </div>
          <button
            onClick={startNewChat}
            className="px-3 py-1.5 bg-purple-500/15 text-purple-400 text-[11px] font-semibold rounded-lg"
          >
            {ui.newChat || '+ New Chat'}
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <ChatCircle size={32} className="text-app-muted mx-auto mb-2" />
            <p className="text-[12px] text-app-muted">{ui.noChatHistory || 'No chat history yet'}</p>
            <p className="text-[10px] text-app-muted mt-1">{ui.startConversation || 'Start a conversation to see it here'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((session) => {
              const dateStr = new Date(session.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })
              const msgCount = session.messages?.length || 0
              return (
                <div
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <ChatCircle size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-app-text font-semibold truncate">
                      {session.title}
                    </p>
                    <p className="text-[10px] text-app-muted">{dateStr} · {msgCount} messages</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                    className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-red transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── CHAT VIEW ──
  return (
    <div className="space-y-4">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <Robot size={22} weight="duotone" className="text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-app-text">{ui.aiTutor || 'AI Tutor'}</h3>
          <p className="text-[11px] text-app-muted">Ask anything about {chapter.chapter_name}</p>
        </div>
        {/* History button */}
        <button
          onClick={() => setViewState('history')}
          className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-purple-400 transition-colors relative"
          title="Chat History"
        >
          <ClockCounterClockwise size={18} />
          {history.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {history.length > 9 ? '9+' : history.length}
            </span>
          )}
        </button>
        {/* New chat button (when in active conversation) */}
        {messages.length > 0 && (
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg bg-white/[0.04] text-app-muted hover:text-app-green transition-colors"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-center">
            <Sparkle size={24} weight="duotone" className="text-purple-400 mx-auto mb-2" />
            <p className="text-[12px] text-app-muted mb-3">
              {ui.askAnything || 'Ask me anything about this chapter!'}
            </p>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 
                            text-purple-300 rounded-full hover:bg-purple-500/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed
                          ${msg.role === 'user'
                            ? 'bg-purple-500 text-white rounded-br-md text-[13px]'
                            : 'bg-white/[0.04] border border-white/[0.06] text-app-text rounded-bl-md'
                          }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={ui.typeQuestion || 'Type your question...'}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px]
                    text-app-text placeholder:text-app-muted focus:outline-none focus:border-purple-500/50"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 bg-purple-500 rounded-xl flex items-center justify-center
                    disabled:opacity-40 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} weight="bold" className="text-white rotate-180" />
        </button>
      </div>

      {/* Quick questions (shown after conversation starts) */}
      {messages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {['Explain more', 'Give an example', 'Why is this important?'].map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-[10px] px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] 
                        text-app-muted rounded-full hover:text-app-text transition-colors
                        disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChapterDetailPage
