// ─── Questions Bank Page ──────────────────────────────────
// Manage question bank for quizzes and assessments

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import {
  Question,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  Eye,
  Copy,
  Upload,
  Download,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react'

interface QuestionItem {
  id: string
  question: string
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer'
  subject: string
  chapter?: string
  difficulty: 'easy' | 'medium' | 'hard'
  options?: string[]
  correct_answer: string | number
  explanation?: string
  times_used: number
  accuracy_rate: number
  tags: string[]
  created_at: string
}

const QuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockQuestions: QuestionItem[] = [
        {
          id: '1',
          question: 'What is the value of √2 × √8?',
          type: 'mcq',
          subject: 'Mathematics',
          chapter: 'Real Numbers',
          difficulty: 'easy',
          options: ['2', '4', '8', '16'],
          correct_answer: 1,
          explanation: '√2 × √8 = √(2×8) = √16 = 4',
          times_used: 156,
          accuracy_rate: 78,
          tags: ['real numbers', 'square root'],
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          question: 'Water is a compound of hydrogen and oxygen.',
          type: 'true_false',
          subject: 'Science',
          chapter: 'Chemical Reactions',
          difficulty: 'easy',
          correct_answer: 'true',
          times_used: 234,
          accuracy_rate: 92,
          tags: ['water', 'compounds'],
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          question: 'The chemical formula for water is ____.',
          type: 'fill_blank',
          subject: 'Science',
          chapter: 'Chemical Reactions',
          difficulty: 'easy',
          correct_answer: 'H2O',
          times_used: 189,
          accuracy_rate: 85,
          tags: ['water', 'formula'],
          created_at: new Date().toISOString(),
        },
        {
          id: '4',
          question: 'Explain the process of photosynthesis in plants.',
          type: 'long_answer',
          subject: 'Science',
          chapter: 'Life Processes',
          difficulty: 'hard',
          correct_answer: 'Photosynthesis is the process by which plants...',
          times_used: 78,
          accuracy_rate: 65,
          tags: ['photosynthesis', 'plants'],
          created_at: new Date().toISOString(),
        },
        {
          id: '5',
          question: 'If a polynomial p(x) = x² - 3x + 2, find p(2).',
          type: 'short_answer',
          subject: 'Mathematics',
          chapter: 'Polynomials',
          difficulty: 'medium',
          correct_answer: '0',
          explanation: 'p(2) = 2² - 3(2) + 2 = 4 - 6 + 2 = 0',
          times_used: 123,
          accuracy_rate: 71,
          tags: ['polynomials', 'evaluation'],
          created_at: new Date().toISOString(),
        },
      ]

      setQuestions(mockQuestions)
      setTotalCount(250)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, typeFilter, difficultyFilter, subjectFilter, searchQuery])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getTypeBadge = (type: QuestionItem['type']) => {
    const labels = {
      mcq: 'MCQ',
      true_false: 'T/F',
      fill_blank: 'Fill',
      short_answer: 'Short',
      long_answer: 'Long',
    }
    const styles = {
      mcq: 'bg-app-blue/10 text-app-blue',
      true_false: 'bg-app-green/10 text-app-green',
      fill_blank: 'bg-app-purple/10 text-app-purple',
      short_answer: 'bg-app-orange/10 text-app-orange',
      long_answer: 'bg-app-yellow/10 text-app-yellow',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[type]}`}>
        {labels[type]}
      </span>
    )
  }

  const getDifficultyBadge = (difficulty: QuestionItem['difficulty']) => {
    const styles = {
      easy: 'text-app-green',
      medium: 'text-app-yellow',
      hard: 'text-app-red',
    }
    return <span className={`text-xs font-medium ${styles[difficulty]}`}>{difficulty}</span>
  }

  const subjects = [...new Set(questions.map(q => q.subject))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Question size={28} className="text-app-purple" />
            Question Bank
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage questions for quizzes and assessments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Import questions')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => alert('Export questions')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => alert('Create question')}
            className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{totalCount}</p>
          <p className="text-xs text-app-muted">Total Questions</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{questions.filter(q => q.type === 'mcq').length}</p>
          <p className="text-xs text-app-muted">MCQs</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{questions.filter(q => q.difficulty === 'easy').length}</p>
          <p className="text-xs text-app-muted">Easy</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{questions.filter(q => q.difficulty === 'medium').length}</p>
          <p className="text-xs text-app-muted">Medium</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-red">{questions.filter(q => q.difficulty === 'hard').length}</p>
          <p className="text-xs text-app-muted">Hard</p>
        </div>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Question bank API not yet implemented.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search questions..."
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
            <option value="mcq">MCQ</option>
            <option value="true_false">True/False</option>
            <option value="fill_blank">Fill in Blank</option>
            <option value="short_answer">Short Answer</option>
            <option value="long_answer">Long Answer</option>
          </select>
        </div>
        <select
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
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

      {/* Questions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-app-green border-t-transparent rounded-full" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            No questions found
          </div>
        ) : (
          questions.map(question => (
            <div
              key={question.id}
              className="bg-app-card rounded-xl border border-app-border p-4 hover:border-app-border/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(question.id)}
                  onChange={() => toggleSelect(question.id)}
                  className="rounded border-app-border mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeBadge(question.type)}
                        {getDifficultyBadge(question.difficulty)}
                        <span className="text-xs text-app-muted">• {question.subject}</span>
                        {question.chapter && (
                          <span className="text-xs text-app-muted">• {question.chapter}</span>
                        )}
                      </div>
                      <p className="text-app-text font-medium">{question.question}</p>
                      
                      {question.type === 'mcq' && question.options && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {question.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`px-3 py-1.5 rounded text-sm ${
                                idx === question.correct_answer
                                  ? 'bg-app-green/10 text-app-green border border-app-green/25'
                                  : 'bg-app-card2 text-app-muted'
                              }`}
                            >
                              <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {question.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alert('Preview question')}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => alert('Duplicate question')}
                        className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => alert('Edit question')}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => alert('Delete question')}
                        className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-app-border/50 text-xs text-app-muted">
                    <span>Used {question.times_used} times</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-app-green" />
                      {question.accuracy_rate}% accuracy
                    </span>
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
        onPageSizeChange={setPageSize}
      />

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Question bank endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default QuestionsPage
