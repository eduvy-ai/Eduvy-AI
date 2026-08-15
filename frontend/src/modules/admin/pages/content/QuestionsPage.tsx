// ─── Questions Bank Page ──────────────────────────────────
// Manage question bank for quizzes and assessments

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import { useQuestions, useChapters } from '../../hooks'
import { questionsApi } from '../../api'
import type { Question, QuestionType, Difficulty, QuestionCreate, QuestionUpdate } from '../../types'
import {
  Question as QuestionIcon,
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
  X,
} from '@phosphor-icons/react'

// Default form state
const defaultFormState = {
  chapter_id: 0,
  type: 'mcq' as QuestionType,
  difficulty: 'medium' as Difficulty,
  question: '',
  options: ['', '', '', ''],
  correct_answer: '0',
  explanation: '',
  tags: [] as string[],
}

const QuestionsPage: React.FC = () => {
  const { questions, total, isLoading, fetchQuestions } = useQuestions()
  const { chapters, fetchChapters } = useChapters()
  
  // List state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInput, setTagInput] = useState('')
  
  // Form state
  const [formData, setFormData] = useState(defaultFormState)

  // Refs to prevent duplicate fetches
  const chaptersLoadedRef = useRef(false)
  const lastFetchParamsRef = useRef<string>('')

  // Load chapters once on mount
  useEffect(() => {
    if (!chaptersLoadedRef.current) {
      chaptersLoadedRef.current = true
      fetchChapters()
    }
  }, [fetchChapters])

  // Load questions with filters
  useEffect(() => {
    const params: Record<string, unknown> = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }
    if (typeFilter !== 'all') params.type = typeFilter
    if (difficultyFilter !== 'all') params.difficulty = difficultyFilter
    if (chapterFilter !== 'all') params.chapter_id = parseInt(chapterFilter)
    if (searchQuery) params.search = searchQuery
    
    // Dedupe by comparing serialized params
    const paramsKey = JSON.stringify(params)
    if (paramsKey === lastFetchParamsRef.current) return
    lastFetchParamsRef.current = paramsKey
    
    fetchQuestions(params)
  }, [page, pageSize, typeFilter, difficultyFilter, chapterFilter, searchQuery, fetchQuestions])

  // Refetch helper - resets the guard to force a fresh fetch
  const refetchQuestions = () => {
    lastFetchParamsRef.current = ''
    fetchQuestions({ limit: pageSize, offset: (page - 1) * pageSize })
  }

  // Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} questions?`)) return
    
    try {
      await questionsApi.bulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      refetchQuestions()
    } catch (error) {
      console.error('Failed to delete questions:', error)
      alert('Failed to delete questions')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return
    try {
      await questionsApi.delete(id)
      refetchQuestions()
    } catch (error) {
      console.error('Failed to delete question:', error)
      alert('Failed to delete question')
    }
  }

  // Open create modal
  const handleCreate = () => {
    setEditingQuestion(null)
    setFormData({
      ...defaultFormState,
      chapter_id: chapters.length > 0 ? chapters[0].id : 0,
    })
    setFormError('')
    setTagInput('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      chapter_id: question.chapter_id,
      type: question.type,
      difficulty: question.difficulty,
      question: question.question,
      options: question.options?.length ? question.options : ['', '', '', ''],
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      tags: question.tags || [],
    })
    setFormError('')
    setTagInput('')
    setShowModal(true)
  }

  // Duplicate question
  const handleDuplicate = (question: Question) => {
    setEditingQuestion(null)
    setFormData({
      chapter_id: question.chapter_id,
      type: question.type,
      difficulty: question.difficulty,
      question: question.question + ' (Copy)',
      options: question.options?.length ? [...question.options] : ['', '', '', ''],
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      tags: question.tags || [],
    })
    setFormError('')
    setTagInput('')
    setShowModal(true)
  }

  // Preview question
  const handlePreview = (question: Question) => {
    setPreviewQuestion(question)
    setShowPreviewModal(true)
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.chapter_id) {
      setFormError('Please select a chapter')
      return
    }
    if (!formData.question.trim()) {
      setFormError('Question text is required')
      return
    }
    if (formData.type === 'mcq') {
      const validOptions = formData.options.filter(o => o.trim())
      if (validOptions.length < 2) {
        setFormError('MCQ requires at least 2 options')
        return
      }
    }
    if (!formData.correct_answer.trim()) {
      setFormError('Correct answer is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingQuestion) {
        // Update existing
        const updateData: QuestionUpdate = {
          type: formData.type,
          difficulty: formData.difficulty,
          question: formData.question,
          options: formData.type === 'mcq' ? formData.options.filter(o => o.trim()) : undefined,
          correct_answer: formData.correct_answer,
          explanation: formData.explanation || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
        }
        await questionsApi.update(editingQuestion.id, updateData)
      } else {
        // Create new
        const createData: QuestionCreate = {
          chapter_id: formData.chapter_id,
          type: formData.type,
          difficulty: formData.difficulty,
          question: formData.question,
          options: formData.type === 'mcq' ? formData.options.filter(o => o.trim()) : undefined,
          correct_answer: formData.correct_answer,
          explanation: formData.explanation || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
        }
        await questionsApi.create(createData)
      }
      
      setShowModal(false)
      refetchQuestions()
    } catch (error: any) {
      setFormError(error.message || 'Failed to save question')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput('')
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  // Update option
  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }))
  }

  const getTypeBadge = (type: QuestionType) => {
    const labels: Record<QuestionType, string> = {
      mcq: 'MCQ',
      true_false: 'T/F',
      fill_blank: 'Fill',
      short_answer: 'Short',
      long_answer: 'Long',
    }
    const styles: Record<QuestionType, string> = {
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

  const getDifficultyBadge = (difficulty: Difficulty) => {
    const styles: Record<Difficulty, string> = {
      easy: 'text-app-green',
      medium: 'text-app-yellow',
      hard: 'text-app-red',
    }
    return <span className={`text-xs font-medium ${styles[difficulty]}`}>{difficulty}</span>
  }

  // Stats computed from current page data
  const stats = useMemo(() => ({
    mcq: questions.filter(q => q.type === 'mcq').length,
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  }), [questions])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <QuestionIcon size={28} className="text-app-purple" />
            Question Bank
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage questions for quizzes and assessments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Import questions - Coming soon')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => alert('Export questions - Coming soon')}
            className="px-3 py-2 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={handleCreate}
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
          <p className="text-2xl font-bold text-app-text">{total}</p>
          <p className="text-xs text-app-muted">Total Questions</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.mcq}</p>
          <p className="text-xs text-app-muted">MCQs (this page)</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.easy}</p>
          <p className="text-xs text-app-muted">Easy</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{stats.medium}</p>
          <p className="text-xs text-app-muted">Medium</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-red">{stats.hard}</p>
          <p className="text-xs text-app-muted">Hard</p>
        </div>
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
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
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
          onChange={e => { setDifficultyFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={chapterFilter}
          onChange={e => { setChapterFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Chapters</option>
          {chapters.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>
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

      {/* Questions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader size="lg" />
            <p className="text-app-muted mt-3 text-sm">Loading...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            No questions found. {total === 0 && 'Add your first question to get started.'}
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
                        {question.subject_name && (
                          <span className="text-xs text-app-muted">• {question.subject_name}</span>
                        )}
                        {question.chapter_name && (
                          <span className="text-xs text-app-muted">• {question.chapter_name}</span>
                        )}
                      </div>
                      <p className="text-app-text font-medium">{question.question}</p>
                      
                      {question.type === 'mcq' && question.options && question.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {question.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`px-3 py-1.5 rounded text-sm ${
                                String(idx) === question.correct_answer
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
                      
                      {question.tags && question.tags.length > 0 && (
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
                        onClick={() => handlePreview(question)}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(question)}
                        className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(question)}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
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
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red">
              {formError}
            </div>
          )}

          {/* Chapter Selection */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Chapter *</label>
            <select
              value={formData.chapter_id}
              onChange={e => setFormData(prev => ({ ...prev, chapter_id: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              disabled={!!editingQuestion}
            >
              <option value={0}>Select Chapter...</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>
              ))}
            </select>
          </div>

          {/* Type & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as QuestionType }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True/False</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Difficulty *</label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData(prev => ({ ...prev, difficulty: e.target.value as Difficulty }))}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Question *</label>
            <textarea
              value={formData.question}
              onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the question text..."
              rows={3}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green resize-none"
            />
          </div>

          {/* MCQ Options */}
          {formData.type === 'mcq' && (
            <div>
              <label className="block text-sm font-medium text-app-text mb-2">Options *</label>
              <div className="space-y-2">
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.correct_answer === String(idx)}
                      onChange={() => setFormData(prev => ({ ...prev, correct_answer: String(idx) }))}
                      className="accent-app-green"
                    />
                    <span className="text-sm text-app-muted w-6">{String.fromCharCode(65 + idx)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-app-muted mt-1">Select the radio button to mark correct answer</p>
            </div>
          )}

          {/* Answer for non-MCQ */}
          {formData.type !== 'mcq' && (
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Correct Answer *</label>
              {formData.type === 'true_false' ? (
                <select
                  value={formData.correct_answer}
                  onChange={e => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                  className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <textarea
                  value={formData.correct_answer}
                  onChange={e => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                  placeholder="Enter the correct answer..."
                  rows={2}
                  className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green resize-none"
                />
              )}
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Explanation (optional)</label>
            <textarea
              value={formData.explanation}
              onChange={e => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Explain the correct answer..."
              rows={2}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Tags</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-app-purple/10 text-app-purple rounded-lg text-sm hover:bg-app-purple/20 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingQuestion ? 'Update Question' : 'Create Question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Question Preview"
        size="md"
      >
        {previewQuestion && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getTypeBadge(previewQuestion.type)}
              {getDifficultyBadge(previewQuestion.difficulty)}
            </div>
            
            <p className="text-app-text font-medium text-lg">{previewQuestion.question}</p>
            
            {previewQuestion.type === 'mcq' && previewQuestion.options && (
              <div className="space-y-2">
                {previewQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-2 rounded-lg ${
                      String(idx) === previewQuestion.correct_answer
                        ? 'bg-app-green/10 border border-app-green/25'
                        : 'bg-app-card2'
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                    {String(idx) === previewQuestion.correct_answer && (
                      <CheckCircle size={16} className="inline ml-2 text-app-green" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {previewQuestion.type !== 'mcq' && (
              <div className="p-4 bg-app-green/10 border border-app-green/25 rounded-lg">
                <p className="text-sm text-app-muted mb-1">Correct Answer:</p>
                <p className="text-app-text font-medium">{previewQuestion.correct_answer}</p>
              </div>
            )}
            
            {previewQuestion.explanation && (
              <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-lg">
                <p className="text-sm text-app-muted mb-1">Explanation:</p>
                <p className="text-app-text">{previewQuestion.explanation}</p>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-app-border">
              <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default QuestionsPage
