// ─── Study Coach Page ───────────────────────────────────────

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ClockCounterClockwise, BookOpen, X } from '@phosphor-icons/react'
import { useStudyCoach } from '../../modules/studycoach'
import { useAuth } from '../../modules/auth'
import { studyCoachApi, type CoachSession } from '../../modules/studycoach/api'
import { li, getDisplayLang } from '../../shared.js'
import QuestionInput from './QuestionInput'
import ConceptOverview from './ConceptOverview'
import KeyTakeaways from './KeyTakeaways'
import DiagramViewer from './DiagramViewer'
import RealWorldExample from './RealWorldExample'
import QuizSection from './QuizSection'
import FlashcardSection from './FlashcardSection'
import ExamNotes from './ExamNotes'
import RelatedTopics from './RelatedTopics'
import NextTopic from './NextTopic'
import CodeExamples from './CodeExamples'
import MemoryAidsSection from './MemoryAidsSection'
import WellnessSection from './WellnessSection'
import LoadingSkeleton from './LoadingSkeleton'
import CoachHistory from './CoachHistory'
import { TeacherModePlayer } from '../teacher'
import type { StudyCoachMode } from '../../modules/studycoach'

// Chapter context from Learn tab navigation
interface ChapterContext {
  chapterId?: number
  chapterName?: string
  subject?: string
  prefillQuestion?: string
}

export default function StudyCoachPage() {
  const { response, isLoading, error, mode, ask, setMode, clear, dismissError, setResponse } = useStudyCoach()
  const { user } = useAuth()
  const location = useLocation()
  
  // Get chapter context from navigation state
  const chapterContext = location.state as ChapterContext | null
  
  const [question, setQuestion] = useState('')
  const [showTeacherMode, setShowTeacherMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeChapter, setActiveChapter] = useState<ChapterContext | null>(chapterContext)
  
  // Track if we already saved the current response
  const savedResponseRef = useRef<string | null>(null)
  // Track if we're viewing a loaded session (to prevent re-saving)
  const loadedSessionIdRef = useRef<number | null>(null)

  // Use user's medium (instruction language) for TTS
  const userLanguage = user?.language || 'English'
  const ui = useMemo(() => li(getDisplayLang(user)), [user])

  // Initialize question from chapter context prefill
  useEffect(() => {
    if (chapterContext?.prefillQuestion) {
      setQuestion(chapterContext.prefillQuestion)
      setActiveChapter(chapterContext)
    }
  }, [chapterContext?.prefillQuestion])

  // Clear old response when language changes so stale content doesn't persist
  useEffect(() => {
    clear()
  }, [userLanguage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Intent detection for auto-mode selection
  const detectIntentMode = useCallback((text: string): StudyCoachMode | null => {
    const lowerText = text.toLowerCase()
    
    // Wellness intent keywords (multi-language support)
    const wellnessKeywords = [
      // English
      'stress', 'anxious', 'anxiety', 'worried', 'scared', 'nervous', 'overwhelmed',
      'can\'t sleep', 'not sleeping', 'tired', 'exhausted', 'burnout', 'pressure',
      'depressed', 'sad', 'crying', 'hopeless', 'helpless', 'frustrated', 'angry',
      'motivation', 'motivate', 'give up', 'quit', 'fail', 'failure',
      // Hindi
      'तनाव', 'चिंता', 'डर', 'थका', 'नींद नहीं', 'उदास', 'रोना',
      // Marathi
      'ताण', 'काळजी', 'भिती', 'थकवा', 'झोप नाही', 'दुःखी',
      // Common phrases
      'i feel', 'feeling', 'help me', 'struggling', 'difficult'
    ]
    
    // Coding intent keywords
    const codingKeywords = [
      'code', 'coding', 'program', 'python', 'javascript', 'java', 'c++',
      'function', 'loop', 'array', 'debug', 'error', 'syntax', 'algorithm',
      'html', 'css', 'react', 'sql', 'database'
    ]
    
    // Exam intent keywords
    const examKeywords = [
      'exam', 'board', 'test', 'marks', 'paper', 'question paper',
      'important question', 'exam tips', 'परीक्षा', 'बोर్డ్', 'பரீட்சை'
    ]
    
    // Check wellness first (highest priority for mental health)
    if (wellnessKeywords.some(kw => lowerText.includes(kw))) {
      return 'study_coach_wellness'
    }
    
    // Check coding
    if (codingKeywords.some(kw => lowerText.includes(kw))) {
      return 'study_coach_coding'
    }
    
    // Check exam
    if (examKeywords.some(kw => lowerText.includes(kw))) {
      return 'study_coach_exam'
    }
    
    return null // No specific intent detected, use current mode
  }, [])

  // Auto-save session when we get a new response
  useEffect(() => {
    if (response && !isLoading && question.trim()) {
      // Skip saving if this is a loaded session from history
      if (loadedSessionIdRef.current !== null) {
        return
      }
      
      const responseKey = `${question}:${response.title}`
      
      // Only save if we haven't saved this exact response yet
      if (savedResponseRef.current !== responseKey) {
        savedResponseRef.current = responseKey
        
        // Determine subject from response or mode
        const subject = response.title?.split(' ')[0] || 'General'
        
        studyCoachApi.saveSession({
          question: question.trim(),
          title: response.title || question.slice(0, 80),
          subject,
          mode,
          response_json: response,
        }).catch(err => {
          console.warn('Failed to save session:', err)
        })
      }
    }
  }, [response, isLoading, question, mode])

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return
    savedResponseRef.current = null // Reset so we save the new response
    loadedSessionIdRef.current = null // Clear loaded session - this is a new question
    
    // Auto-detect intent and switch mode if needed
    const detectedMode = detectIntentMode(question)
    if (detectedMode && detectedMode !== mode) {
      setMode(detectedMode)
    }
    
    // Pass chapter context if available
    await ask({
      question: question.trim(),
      chapter_id: activeChapter?.chapterId,
      chapter_override: activeChapter?.chapterName,
      subject_override: activeChapter?.subject,
    })
  }, [question, ask, activeChapter, mode, setMode, detectIntentMode])

  const handleNewQuestion = useCallback(() => {
    clear()
    setQuestion('')
    savedResponseRef.current = null
    loadedSessionIdRef.current = null // Clear loaded session
    // Keep chapter context - user may want to ask another question about the same chapter
  }, [clear])

  // Clear chapter context
  const handleClearChapterContext = useCallback(() => {
    setActiveChapter(null)
    // Clear location state without navigation
    window.history.replaceState({}, '', location.pathname)
  }, [location.pathname])

  // Load a session from history
  const handleSelectSession = useCallback((session: CoachSession) => {
    if (session.response_json) {
      loadedSessionIdRef.current = session.id // Mark as loaded from history (prevents re-saving)
      savedResponseRef.current = `${session.question}:${session.response_json.title}` // Also mark the response key
      setQuestion(session.question)
      setMode(session.mode as any)
      setResponse(session.response_json)
    }
    setShowHistory(false)
  }, [setMode, setResponse])

  return (
    <div className="bg-t-bg text-t-text p-4 pb-6 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <header className="text-center space-y-1 relative">
          {/* History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="absolute right-0 top-0 w-10 h-10 flex items-center justify-center rounded-xl bg-t-surface border border-t-border text-t-text-muted hover:text-t-primary hover:border-t-primary/30 transition-colors"
            title={ui.coachHistory || 'Learning History'}
            aria-label="Learning History"
          >
            <ClockCounterClockwise size={20} weight="duotone" />
          </button>
          
          <h1 className="text-h1 md:text-display font-extrabold bg-gradient-to-r from-[var(--t-primary)] to-emerald-400 bg-clip-text text-transparent">
            {ui.coachTitle}
          </h1>
          <p className="text-t-text-muted text-body-sm">
            {ui.coachSubtitle}
          </p>
        </header>

        {/* Chapter Context Banner */}
        {activeChapter && activeChapter.chapterName && (
          <div className="bg-t-accent/10 border border-t-accent/25 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-t-accent/15 flex items-center justify-center">
                <BookOpen size={18} className="text-t-accent" weight="duotone" />
              </div>
              <div>
                <p className="text-micro text-t-accent font-medium uppercase tracking-wide">
                  {ui.learningAbout || 'Learning about'}
                </p>
                <p className="text-caption text-t-text font-semibold line-clamp-1">
                  {activeChapter.chapterName}
                  {activeChapter.subject && (
                    <span className="text-t-text-muted font-normal"> • {activeChapter.subject}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleClearChapterContext}
              className="w-8 h-8 rounded-lg bg-t-surface-hover flex items-center justify-center hover:bg-t-surface-active transition-colors"
              title={ui.clearContext || 'Clear chapter context'}
              aria-label="Clear chapter context"
            >
              <X size={14} className="text-t-text-muted" />
            </button>
          </div>
        )}

        {/* Question Input with Mode Selector inside */}
        <QuestionInput
          value={question}
          onChange={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder={ui.askPlaceholder}
          currentMode={mode}
          onModeChange={setMode}
          ui={ui}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-[var(--t-danger-light)] border border-t-danger/25 rounded-xl p-4 flex justify-between items-center">
            <span className="text-t-danger text-body-sm">{error}</span>
            <button
              onClick={dismissError}
              className="text-t-danger hover:opacity-80 transition-opacity"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Results */}
        {response && !isLoading && (
          <div className="space-y-5 animate-fade-in">
            {/* Action Buttons - hide Teacher Mode for wellness */}
            <div className="flex justify-center gap-3">
              {/* Teacher Mode Button - only for non-wellness modes */}
              {mode !== 'study_coach_wellness' && (
                <button
                  onClick={() => setShowTeacherMode(true)}
                  className="px-5 py-2.5 bg-t-primary hover:bg-t-primary-hover rounded-full text-body-sm text-t-text-inverse font-semibold shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all active:scale-[0.97] flex items-center gap-2"
                >
                  {ui.teacherMode}
                </button>
              )}
              
              {/* New Question Button */}
              <button
                onClick={handleNewQuestion}
                className="px-5 py-2.5 bg-t-surface border border-t-border hover:border-t-primary/30 rounded-full text-body-sm text-t-text-muted hover:text-t-primary transition-colors active:scale-[0.97]"
              >
                {ui.askNewQuestion}
              </button>
            </div>

            {/* Wellness Mode Response */}
            {mode === 'study_coach_wellness' && response.wellness && (
              <WellnessSection wellness={response.wellness} ui={ui} />
            )}

            {/* Regular Study Coach Response (non-wellness) */}
            {mode !== 'study_coach_wellness' && (
              <>
                {/* Concept Overview */}
                <ConceptOverview
                  title={response.title}
                  difficulty={response.difficulty}
                  overview={response.overview}
                  ui={ui}
                />

                {/* Key Takeaways */}
            {response.key_takeaways.length > 0 && (
              <KeyTakeaways takeaways={response.key_takeaways} ui={ui} />
            )}

            {/* Diagram */}
            {response.diagram && response.diagram.content && (
              <DiagramViewer diagram={response.diagram} ui={ui} />
            )}

            {/* Real World Example */}
            {response.real_world_example && (
              <RealWorldExample example={response.real_world_example} ui={ui} />
            )}

            {/* Code Examples (Coding Mode) */}
            {response.code_examples && response.code_examples.length > 0 && (
              <CodeExamples examples={response.code_examples} ui={ui} />
            )}

            {/* Memory Aids (Revision Mode) */}
            {response.memory_aids && (
              <MemoryAidsSection aids={response.memory_aids} ui={ui} />
            )}

            {/* Quiz */}
            {response.quiz.length > 0 && (
              <QuizSection questions={response.quiz} ui={ui} />
            )}

            {/* Flashcards */}
            {response.flashcards.length > 0 && (
              <FlashcardSection flashcards={response.flashcards} ui={ui} />
            )}

            {/* Exam Notes */}
            {response.exam_notes.length > 0 && (
              <ExamNotes notes={response.exam_notes} ui={ui} />
            )}

            {/* Related Topics & Next Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {response.related_topics.length > 0 && (
                <RelatedTopics topics={response.related_topics} onTopicClick={(topic) => {
                  setQuestion(topic)
                  ask({ question: topic })
                }} ui={ui} />
              )}
              {response.next_topic && (
                <NextTopic topic={response.next_topic} onExplore={() => {
                  setQuestion(response.next_topic)
                  ask({ question: response.next_topic })
                }} ui={ui} />
              )}
            </div>
              </>
            )}

            {/* Usage Info */}
            {response.usage && (
              <div className="text-center text-xs text-slate-500">
                {ui.aiCallsToday} {response.usage.calls_today}/{response.usage.daily_limit}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teacher Mode Player - Full Screen Overlay */}
      {showTeacherMode && response && (
        <TeacherModePlayer
          studyCoachResponse={response}
          onClose={() => setShowTeacherMode(false)}
          language={userLanguage}
          ui={ui}
        />
      )}

      {/* Coach History Modal */}
      {showHistory && (
        <CoachHistory
          onClose={() => setShowHistory(false)}
          onSelectSession={handleSelectSession}
          ui={ui}
        />
      )}
    </div>
  )
}
