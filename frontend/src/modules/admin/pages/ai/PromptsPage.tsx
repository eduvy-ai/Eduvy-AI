// ─── AI Prompts Management Page ──────────────────────────────────
// Manage AI system prompts and templates

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Loader from '../../../../shared/components/Loader'
import {
  ChatTeardrop,
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Funnel,
  Copy,
  Eye,
  X,
  Clock,
  Code,
  TestTube,
  Warning,
} from '@phosphor-icons/react'

interface AIPrompt {
  id: string
  name: string
  key: string
  description: string
  category: 'tutor' | 'quiz' | 'grading' | 'summary' | 'chat' | 'system'
  template: string
  variables: string[]
  model: string
  max_tokens?: number
  temperature?: number
  is_active: boolean
  version: number
  updated_at: string
  updated_by?: string
}

const PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showPreview, setShowPreview] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState<AIPrompt | null>(null)
  
  // Ref to prevent duplicate loads
  const loadedRef = useRef(false)

  const loadPrompts = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    setIsLoading(true)
    try {
      // TODO: Replace with real API call when prompts API is implemented
      const mockPrompts: AIPrompt[] = [
        {
          id: '1',
          name: 'Tutor System Prompt',
          key: 'tutor_system',
          description: 'Main system prompt for AI tutor interactions',
          category: 'tutor',
          template: `You are Vidya, an AI tutor for Indian students. You help students learn concepts in a friendly, encouraging way.

Current student:
- Name: {{student_name}}
- Standard: {{standard}}
- Medium: {{medium}}
- Subject: {{subject}}

Guidelines:
1. Explain concepts step-by-step
2. Use relatable examples from Indian context
3. Encourage questions
4. Be patient and supportive
5. Respond in {{language}}`,
          variables: ['student_name', 'standard', 'medium', 'subject', 'language'],
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          temperature: 0.7,
          is_active: true,
          version: 3,
          updated_at: new Date().toISOString(),
          updated_by: 'admin@eduvy.ai'
        },
        {
          id: '2',
          name: 'Quiz Question Generator',
          key: 'quiz_generator',
          description: 'Generate quiz questions for a topic',
          category: 'quiz',
          template: `Generate {{count}} multiple-choice questions for:
Topic: {{topic}}
Subject: {{subject}}
Difficulty: {{difficulty}}
Standard: {{standard}}

Return JSON array with format:
[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]`,
          variables: ['count', 'topic', 'subject', 'difficulty', 'standard'],
          model: 'gpt-4o-mini',
          max_tokens: 2048,
          temperature: 0.5,
          is_active: true,
          version: 5,
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Answer Grader',
          key: 'answer_grader',
          description: 'Grade student answers and provide feedback',
          category: 'grading',
          template: `Grade the following student answer:

Question: {{question}}
Expected Answer: {{expected_answer}}
Student Answer: {{student_answer}}

Return JSON: {"score": 0-100, "feedback": "...", "correct": true/false, "suggestions": [...]}`,
          variables: ['question', 'expected_answer', 'student_answer'],
          model: 'gpt-4o-mini',
          max_tokens: 512,
          temperature: 0.3,
          is_active: true,
          version: 2,
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'Chapter Summary',
          key: 'chapter_summary',
          description: 'Generate chapter summaries',
          category: 'summary',
          template: `Create a summary for:
Chapter: {{chapter_name}}
Subject: {{subject}}
Content: {{content}}

Include:
1. Key concepts
2. Important formulas/facts
3. Quick revision points`,
          variables: ['chapter_name', 'subject', 'content'],
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          temperature: 0.5,
          is_active: true,
          version: 1,
          updated_at: new Date().toISOString(),
        },
        {
          id: '5',
          name: 'Doubt Resolver (Draft)',
          key: 'doubt_resolver',
          description: 'Help resolve student doubts',
          category: 'chat',
          template: `Student doubt: {{doubt}}
Subject: {{subject}}
Chapter: {{chapter}}

Provide a clear, step-by-step explanation...`,
          variables: ['doubt', 'subject', 'chapter'],
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          temperature: 0.7,
          is_active: false,
          version: 1,
          updated_at: new Date().toISOString(),
        },
      ]

      setPrompts(mockPrompts)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])

  const getCategoryBadge = (category: AIPrompt['category']) => {
    const styles = {
      tutor: 'bg-app-green/10 text-app-green border-app-green/25',
      quiz: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      grading: 'bg-app-purple/10 text-app-purple border-app-purple/25',
      summary: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
      chat: 'bg-app-orange/10 text-app-orange border-app-orange/25',
      system: 'bg-app-muted/10 text-app-muted border-app-muted/25',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[category]}`}>
        {category}
      </span>
    )
  }

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(prompts.map(p => p.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ChatTeardrop size={28} className="text-app-purple" />
            AI Prompts
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage AI system prompts and templates
          </p>
        </div>
        <button
          onClick={() => alert('Create new prompt')}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          New Prompt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{prompts.length}</p>
          <p className="text-xs text-app-muted">Total Prompts</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{prompts.filter(p => p.is_active).length}</p>
          <p className="text-xs text-app-muted">Active</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-muted">{prompts.filter(p => !p.is_active).length}</p>
          <p className="text-xs text-app-muted">Drafts</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{categories.length}</p>
          <p className="text-xs text-app-muted">Categories</p>
        </div>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. AI Prompts management API not yet implemented.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-12">
            <Loader size="lg" />
            <p className="text-app-muted mt-3 text-sm">Loading...</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-app-muted">
            No prompts found
          </div>
        ) : (
          filteredPrompts.map(prompt => (
            <div
              key={prompt.id}
              className={`bg-app-card rounded-xl border transition-colors p-5 ${
                prompt.is_active ? 'border-app-border' : 'border-app-border/50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-app-text">{prompt.name}</h3>
                    {getCategoryBadge(prompt.category)}
                    {!prompt.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-app-muted/10 text-app-muted rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-app-muted">{prompt.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setPreviewPrompt(prompt)
                      setShowPreview(true)
                    }}
                    className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => alert('Test prompt')}
                    className="p-1.5 text-app-purple hover:bg-app-purple/10 rounded-lg transition-colors"
                    title="Test"
                  >
                    <TestTube size={14} />
                  </button>
                  <button
                    onClick={() => alert('Edit prompt')}
                    className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => alert('Duplicate prompt')}
                    className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => alert('Delete prompt')}
                    className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>

              <div className="bg-app-card2 rounded-lg p-3 font-mono text-xs text-app-muted max-h-24 overflow-hidden mb-3">
                {prompt.template.substring(0, 200)}...
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-app-muted">
                    <Code size={12} />
                    <code className="bg-app-card2 px-1 rounded">{prompt.key}</code>
                  </span>
                  <span className="text-app-purple">{prompt.model}</span>
                </div>
                <div className="flex items-center gap-3 text-app-muted">
                  <span>v{prompt.version}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(prompt.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Variables */}
              {prompt.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-app-border/50">
                  {prompt.variables.map(v => (
                    <span key={v} className="px-2 py-0.5 text-xs bg-app-purple/10 text-app-purple rounded">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative bg-app-card rounded-xl border border-app-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-app-card border-b border-app-border p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-app-text">{previewPrompt.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getCategoryBadge(previewPrompt.category)}
                  <span className="text-xs text-app-muted">{previewPrompt.model}</span>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 text-app-muted hover:text-app-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-app-text mb-2">Template</h3>
                <pre className="bg-app-card2 rounded-lg p-4 text-sm text-app-text whitespace-pre-wrap font-mono overflow-x-auto">
                  {previewPrompt.template}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-app-text mb-2">Variables</h3>
                  <div className="flex flex-wrap gap-2">
                    {previewPrompt.variables.map(v => (
                      <span key={v} className="px-2 py-1 text-xs bg-app-purple/10 text-app-purple rounded font-mono">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-app-text mb-2">Settings</h3>
                  <div className="space-y-1 text-sm text-app-muted">
                    <p>Max Tokens: {previewPrompt.max_tokens || 'default'}</p>
                    <p>Temperature: {previewPrompt.temperature ?? 'default'}</p>
                    <p>Version: {previewPrompt.version}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>AI prompts management endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default PromptsPage
