// ─── Study Coach Page ───────────────────────────────────────

import { useState, useCallback } from 'react'
import { useStudyCoach } from '../../modules/studycoach'
import { useAuth } from '../../modules/auth'
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
import LoadingSkeleton from './LoadingSkeleton'
import { TeacherModePlayer } from '../teacher'

export default function StudyCoachPage() {
  const { response, isLoading, error, mode, ask, setMode, clear, dismissError } = useStudyCoach()
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [showTeacherMode, setShowTeacherMode] = useState(false)

  // Use user's medium (instruction language) for TTS
  const userLanguage = user?.language || 'English'

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return
    await ask({ question: question.trim() })
  }, [question, ask])

  const handleNewQuestion = useCallback(() => {
    clear()
    setQuestion('')
  }, [clear])

  return (
    <div className="min-h-full bg-app-bg text-app-text p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <header className="text-center space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-app-green to-emerald-400 bg-clip-text text-transparent">
            🎓 Study Coach
          </h1>
          <p className="text-app-muted text-sm">
            Your personal AI tutor — ask anything, learn everything
          </p>
        </header>

        {/* Question Input with Mode Selector inside */}
        <QuestionInput
          value={question}
          onChange={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask me anything..."
          currentMode={mode}
          onModeChange={setMode}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-app-red/15 border border-app-red/30 rounded-xl p-4 flex justify-between items-center">
            <span className="text-app-red">{error}</span>
            <button
              onClick={dismissError}
              className="text-app-red hover:opacity-80 transition-opacity"
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
            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              {/* Teacher Mode Button */}
              <button
                onClick={() => setShowTeacherMode(true)}
                className="px-5 py-2 bg-gradient-to-r from-app-green to-emerald-500 hover:from-app-green/90 hover:to-emerald-500/90 rounded-full text-sm text-white font-semibold shadow-lg shadow-app-green/20 transition-all flex items-center gap-2"
              >
                <span>▶</span>
                Teacher Mode
              </button>
              
              {/* New Question Button */}
              <button
                onClick={handleNewQuestion}
                className="px-5 py-2 bg-app-card2 border border-app-border hover:border-app-green/30 rounded-full text-sm text-app-muted hover:text-app-green transition-colors"
              >
                + Ask New Question
              </button>
            </div>

            {/* Concept Overview */}
            <ConceptOverview
              title={response.title}
              difficulty={response.difficulty}
              overview={response.overview}
            />

            {/* Key Takeaways */}
            {response.key_takeaways.length > 0 && (
              <KeyTakeaways takeaways={response.key_takeaways} />
            )}

            {/* Diagram */}
            {response.diagram && response.diagram.content && (
              <DiagramViewer diagram={response.diagram} />
            )}

            {/* Real World Example */}
            {response.real_world_example && (
              <RealWorldExample example={response.real_world_example} />
            )}

            {/* Code Examples (Coding Mode) */}
            {response.code_examples && response.code_examples.length > 0 && (
              <CodeExamples examples={response.code_examples} />
            )}

            {/* Memory Aids (Revision Mode) */}
            {response.memory_aids && (
              <MemoryAidsSection aids={response.memory_aids} />
            )}

            {/* Quiz */}
            {response.quiz.length > 0 && (
              <QuizSection questions={response.quiz} />
            )}

            {/* Flashcards */}
            {response.flashcards.length > 0 && (
              <FlashcardSection flashcards={response.flashcards} />
            )}

            {/* Exam Notes */}
            {response.exam_notes.length > 0 && (
              <ExamNotes notes={response.exam_notes} />
            )}

            {/* Related Topics & Next Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {response.related_topics.length > 0 && (
                <RelatedTopics topics={response.related_topics} onTopicClick={(topic) => {
                  setQuestion(topic)
                  handleSubmit()
                }} />
              )}
              {response.next_topic && (
                <NextTopic topic={response.next_topic} onExplore={() => {
                  setQuestion(response.next_topic)
                }} />
              )}
            </div>

            {/* Usage Info */}
            {response.usage && (
              <div className="text-center text-xs text-slate-500">
                AI calls today: {response.usage.calls_today}/{response.usage.daily_limit}
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
        />
      )}
    </div>
  )
}
