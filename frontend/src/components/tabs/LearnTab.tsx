/**
 * Learn Tab Component
 * Chapter-centric learning browser.
 * Shows subjects → chapters with progress.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { useSubjectsWithChapters, useChaptersWithProgress } from '@/modules/chapters/hooks'
import { getDisplayLang } from '@/shared.js'
import { li } from '@/i18n/index.js'
import {
  BookOpen,
  CaretRight,
  CheckCircle,
  Circle,
  Lightning,
  ArrowLeft,
  Atom,
  MathOperations,
  Globe,
  Book,
  Flask,
  PencilSimple,
  ComputerTower,
  ChartLineUp,
  Buildings,
  Leaf,
  Sparkle,
} from '@phosphor-icons/react'
import { Loader, EmptyState } from '@/shared/components'

// Subject icons mapping
const SUBJECT_ICONS: Record<string, React.ComponentType<any>> = {
  Science: Flask,
  Mathematics: MathOperations,
  'Social Science': Globe,
  'Social Studies': Globe,
  English: Book,
  Hindi: PencilSimple,
  Sanskrit: BookOpen,
  Physics: Atom,
  Chemistry: Flask,
  Biology: Leaf,
  'Computer Science': ComputerTower,
  IT: ComputerTower,
  Economics: ChartLineUp,
  History: Buildings,
  Geography: Globe,
  Accountancy: ChartLineUp,
  'Business Studies': Buildings,
}

// Subject colors
const SUBJECT_COLORS: Record<string, string> = {
  Science: '#00E5A0',
  Mathematics: '#7B9CFF',
  'Social Science': '#FFD166',
  'Social Studies': '#FFD166',
  English: '#FF6B35',
  Hindi: '#FF6B6B',
  Sanskrit: '#BB86FC',
  Physics: '#00E5A0',
  Chemistry: '#03DAC6',
  Biology: '#82B1FF',
  'Computer Science': '#7B9CFF',
  IT: '#7B9CFF',
  Economics: '#FFD166',
  History: '#FF8A80',
  Geography: '#CCFF90',
  Accountancy: '#FFD166',
  'Business Studies': '#FF6B35',
}

interface LearnTabProps {
  profile?: {
    board?: string
    standard?: string
    subjects?: string[]
  }
}

const LearnTab: React.FC<LearnTabProps> = ({ profile }) => {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  
  // Get user's board and standard
  const board = profile?.board || user?.board || 'CBSE'
  const standard = profile?.standard || user?.standard || 'Class 10'
  
  // UI language
  const lang = getDisplayLang(user || profile)
  const ui = useMemo(() => li(lang), [lang])
  
  // Selected subject state
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  // Load subjects
  const { subjects, isLoading: subjectsLoading } = useSubjectsWithChapters(board, standard)
  
  // Load chapters when subject is selected
  const { chapters, isLoading: chaptersLoading } = useChaptersWithProgress(
    board,
    standard,
    selectedSubject || ''
  )

  // ── Subject Card ──
  const SubjectCard: React.FC<{ subject: string; chapterCount: number }> = ({
    subject,
    chapterCount,
  }) => {
    const IconComponent = SUBJECT_ICONS[subject] || BookOpen
    const color = SUBJECT_COLORS[subject] || '#7B9CFF'

    return (
      <button
        onClick={() => setSelectedSubject(subject)}
        className="w-full bg-t-surface hover:bg-t-surface-hover border border-t-border rounded-2xl p-4 
                   transition-all duration-200 hover:border-t-border-strong hover:-translate-y-0.5
                   flex items-center gap-4 text-left shadow-soft-sm active:scale-[0.99]"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}14` }}
        >
          <IconComponent size={24} weight="duotone" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-semibold text-t-text truncate">{subject}</h3>
          <p className="text-caption text-t-text-muted mt-0.5">
            {chapterCount} {chapterCount === 1 ? (ui.chapter || 'chapter') : (ui.chapters || 'chapters')}
          </p>
        </div>
        <CaretRight size={18} weight="bold" className="text-t-text-muted flex-shrink-0" />
      </button>
    )
  }

  // ── Chapter Card ──
  const ChapterCard: React.FC<{
    chapter: {
      id: number
      chapter_number: number
      chapter_name: string
      description?: string | null
      progress_percent?: number
      topics?: string[]
    }
  }> = ({ chapter }) => {
    const progress = chapter.progress_percent || 0
    const isComplete = progress >= 100
    const isStarted = progress > 0

    return (
      <button
        onClick={() => navigate(`/app/learn/${chapter.id}`)}
        className="w-full bg-t-surface hover:bg-t-surface-hover border border-t-border rounded-2xl p-4 
                   transition-all duration-200 hover:border-t-border-strong shadow-soft-sm
                   text-left active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
          {/* Chapter number badge */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-body-sm
                       ${isComplete ? 'bg-t-success/15 text-t-success' : 
                         isStarted ? 'bg-t-info/15 text-t-info' : 
                         'bg-t-surface-hover text-t-text-muted'}`}
          >
            {isComplete ? (
              <CheckCircle size={20} weight="fill" />
            ) : (
              chapter.chapter_number
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-body-sm font-semibold text-t-text leading-snug">
              {chapter.chapter_name}
            </h4>
            {chapter.description && (
              <p className="text-caption text-t-text-muted mt-1 line-clamp-2">
                {chapter.description}
              </p>
            )}
            
            {/* Topics pills */}
            {chapter.topics && chapter.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chapter.topics.slice(0, 3).map((topic, i) => (
                  <span
                    key={i}
                    className="text-micro px-2 py-0.5 rounded-full bg-t-surface-hover text-t-text-muted"
                  >
                    {topic}
                  </span>
                ))}
                {chapter.topics.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 text-app-muted">
                    +{chapter.topics.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Progress bar */}
            {isStarted && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: isComplete
                        ? '#00E5A0'
                        : 'linear-gradient(90deg, #7B9CFF, #a04dff)',
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-app-muted">{progress}%</span>
              </div>
            )}
          </div>
          
          {/* Arrow */}
          <CaretRight size={16} weight="bold" className="text-t-text-muted flex-shrink-0 mt-1" />
        </div>
      </button>
    )
  }

  // ── Loading State ──
  if (subjectsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    )
  }

  // ── Empty State ──
  if (!subjects.length && !selectedSubject) {
    return (
      <EmptyState
        icon={<BookOpen size={32} weight="duotone" />}
        title={ui.noChaptersTitle || 'No Chapters Available'}
        description={ui.noChaptersDesc || `Chapters for ${board} ${standard} are being added. Check back soon!`}
      />
    )
  }

  // ── Subject Selected: Show Chapters ──
  if (selectedSubject) {
    const subjectColor = SUBJECT_COLORS[selectedSubject] || '#7B9CFF'
    const SubjectIcon = SUBJECT_ICONS[selectedSubject] || BookOpen

    return (
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-t-bg/95 backdrop-blur-md pb-3 pt-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-2 text-t-text-muted hover:text-t-text transition-colors mb-3"
          >
            <ArrowLeft size={18} weight="bold" />
            <span className="text-caption font-semibold">{ui.allSubjects || 'All Subjects'}</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${subjectColor}18` }}
            >
              <SubjectIcon size={22} weight="duotone" style={{ color: subjectColor }} />
            </div>
            <div>
              <h2 className="text-h2 text-t-text">{selectedSubject}</h2>
              <p className="text-caption text-t-text-muted">
                {chapters.length} {chapters.length === 1 ? (ui.chapter || 'chapter') : (ui.chapters || 'chapters')} • {standard}
              </p>
            </div>
          </div>
        </div>

        {/* Chapter List */}
        {chaptersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size="md" />
          </div>
        ) : chapters.length > 0 ? (
          <div className="space-y-3 mt-4">
            {chapters.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Circle size={48} weight="duotone" className="text-app-muted mb-3" />
            <p className="text-[14px] text-app-muted">
              {ui.noChaptersFor || 'No chapters available for'} {selectedSubject} {ui.yet || 'yet.'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Default: Show Subjects ──
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkle size={18} weight="fill" className="text-t-primary" />
          <span className="text-micro font-bold text-t-primary tracking-wider uppercase">
            {ui.learnTab || 'Learn'}
          </span>
        </div>
        <h1 className="text-h1 text-t-text leading-tight">
          {ui.chooseSubject || 'Choose a Subject'}
        </h1>
        <p className="text-caption text-t-text-muted mt-1">
          {board} • {standard}
        </p>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map(({ subject, chapter_count }) => (
          <SubjectCard key={subject} subject={subject} chapterCount={chapter_count} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 p-4 bg-t-surface border border-t-border rounded-2xl shadow-soft-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--t-amber-light)] flex items-center justify-center">
            <Lightning size={20} weight="fill" className="text-t-amber" />
          </div>
          <div>
            <p className="text-caption font-bold text-t-text">
              {ui.totalChapters || 'Total Chapters'}
            </p>
            <p className="text-micro text-t-text-muted">
              {subjects.reduce((sum, s) => sum + s.chapter_count, 0)} {ui.chaptersAcross || 'chapters across'}{' '}
              {subjects.length} {ui.subjects || 'subjects'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearnTab
