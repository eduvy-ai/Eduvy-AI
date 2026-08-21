// ─── AI Prompts Management Page ──────────────────────────────────
// Manage AI system prompts and templates

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Loader from '../../../../shared/components/Loader'
import { aiPromptsApi } from '../../api'
import type { AIPrompt, AIPromptCreate, AIPromptUpdate, AIPromptCategory } from '../../types'
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
  Download,
  Check,
  Warning,
} from '@phosphor-icons/react'

const PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showPreview, setShowPreview] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState<AIPrompt | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Edit/Create modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete confirmation
  const [deletePrompt, setDeletePrompt] = useState<AIPrompt | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Seed prompts
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Ref to prevent duplicate loads
  const loadedRef = useRef(false)
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadPrompts = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await aiPromptsApi.getAll({ include_inactive: showInactive })
      setPrompts(data)
    } catch (error: any) {
      console.error('Failed to load prompts:', error)
      showToast(error.response?.data?.detail || 'Failed to load prompts', 'error')
    } finally {
      setIsLoading(false)
      loadedRef.current = true
    }
  }, [showInactive])

  useEffect(() => {
    loadPrompts()
  }, [loadPrompts])
  
  const handleSeedPrompts = async () => {
    setIsSeeding(true)
    setSeedResult(null)
    try {
      const result = await aiPromptsApi.seed(false)
      setSeedResult(result)
      showToast(`Seeded ${result.inserted} prompts, updated ${result.updated}, skipped ${result.skipped}`)
      loadPrompts()
    } catch (error: any) {
      console.error('Failed to seed prompts:', error)
      showToast(error.response?.data?.detail || 'Failed to seed prompts', 'error')
    } finally {
      setIsSeeding(false)
    }
  }
  
  const handleCreateOrUpdate = async (data: AIPromptCreate | AIPromptUpdate) => {
    setIsSaving(true)
    try {
      if (editingPrompt) {
        await aiPromptsApi.update(editingPrompt.id, data as AIPromptUpdate)
        showToast('Prompt updated successfully')
      } else {
        await aiPromptsApi.create(data as AIPromptCreate)
        showToast('Prompt created successfully')
      }
      setShowEditModal(false)
      setEditingPrompt(null)
      loadPrompts()
    } catch (error: any) {
      console.error('Failed to save prompt:', error)
      showToast(error.response?.data?.detail || 'Failed to save prompt', 'error')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDelete = async () => {
    if (!deletePrompt) return
    setIsDeleting(true)
    try {
      await aiPromptsApi.delete(deletePrompt.id)
      showToast('Prompt deleted successfully')
      setDeletePrompt(null)
      loadPrompts()
    } catch (error: any) {
      console.error('Failed to delete prompt:', error)
      showToast(error.response?.data?.detail || 'Failed to delete prompt', 'error')
    } finally {
      setIsDeleting(false)
    }
  }
  
  const handleDuplicate = async (prompt: AIPrompt) => {
    const newData: AIPromptCreate = {
      key: `${prompt.key}_copy`,
      name: `${prompt.name} (Copy)`,
      description: prompt.description,
      category: prompt.category,
      template: prompt.template,
      variables: prompt.variables,
      model: prompt.model,
      max_tokens: prompt.max_tokens,
      temperature: prompt.temperature,
      is_active: false, // Create as draft
    }
    try {
      await aiPromptsApi.create(newData)
      showToast('Prompt duplicated successfully')
      loadPrompts()
    } catch (error: any) {
      console.error('Failed to duplicate prompt:', error)
      showToast(error.response?.data?.detail || 'Failed to duplicate prompt', 'error')
    }
  }

  const getCategoryBadge = (category: AIPromptCategory) => {
    const styles: Record<AIPromptCategory, string> = {
      tutor: 'bg-app-green/10 text-app-green border-app-green/25',
      quiz: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      grading: 'bg-app-purple/10 text-app-purple border-app-purple/25',
      summary: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
      chat: 'bg-app-orange/10 text-app-orange border-app-orange/25',
      system: 'bg-app-muted/10 text-app-muted border-app-muted/25',
      persona: 'bg-pink-500/10 text-pink-400 border-pink-500/25',
      language: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
      home: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      template: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
      service: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[category] || styles.system}`}>
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedPrompts}
            disabled={isSeeding}
            className="px-4 py-2 text-sm text-app-purple bg-app-purple/10 border border-app-purple/25 rounded-lg hover:bg-app-purple/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {isSeeding ? 'Seeding...' : 'Seed from Code'}
          </button>
          <button
            onClick={() => {
              setEditingPrompt(null)
              setShowEditModal(true)
            }}
            className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Prompt
          </button>
        </div>
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
          <p className="text-xs text-app-muted">Inactive</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{categories.length}</p>
          <p className="text-xs text-app-muted">Categories</p>
        </div>
      </div>

      {/* Seed Result Notice */}
      {seedResult && (
        <div className="p-3 bg-app-green/10 border border-app-green/25 rounded-lg text-sm text-app-green flex items-center gap-2">
          <Check size={16} />
          Seeded {seedResult.inserted} new prompts, updated {seedResult.updated}, skipped {seedResult.skipped} existing.
        </div>
      )}

      {/* Empty State / Seed Prompt */}
      {!isLoading && prompts.length === 0 && (
        <div className="p-6 bg-app-card rounded-xl border border-app-border text-center">
          <ChatTeardrop size={48} className="text-app-muted mx-auto mb-3" />
          <h3 className="text-lg font-bold text-app-text mb-2">No Prompts Found</h3>
          <p className="text-sm text-app-muted mb-4">
            Seed prompts from the hardcoded templates to get started.
          </p>
          <button
            onClick={handleSeedPrompts}
            disabled={isSeeding}
            className="px-4 py-2 text-sm text-white bg-app-purple rounded-lg hover:bg-app-purple/80 transition-colors disabled:opacity-50"
          >
            {isSeeding ? 'Seeding...' : 'Seed Prompts from Code'}
          </button>
        </div>
      )}

      {/* Filters */}
      {prompts.length > 0 && (
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
          <label className="flex items-center gap-2 px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-app-border text-app-green focus:ring-app-green"
            />
            Show inactive
          </label>
        </div>
      )}

      {/* Prompts Grid */}
      {prompts.length > 0 && (
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
                          Inactive
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
                      onClick={() => {
                        setEditingPrompt(prompt)
                        setShowEditModal(true)
                      }}
                      className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(prompt)}
                      className="p-1.5 text-app-muted hover:bg-app-card2 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => setDeletePrompt(prompt)}
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
      )}

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

      {/* Edit/Create Modal */}
      {showEditModal && (
        <PromptFormModal
          prompt={editingPrompt}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowEditModal(false)
            setEditingPrompt(null)
          }}
          isSaving={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {deletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeletePrompt(null)} />
          <div className="relative bg-app-card rounded-xl border border-app-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-app-text mb-2">Delete Prompt</h2>
            <p className="text-sm text-app-muted mb-4">
              Are you sure you want to delete <strong>{deletePrompt.name}</strong>? This will deactivate the prompt (soft delete).
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletePrompt(null)}
                className="px-4 py-2 text-sm text-app-muted hover:text-app-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-white bg-app-red rounded-lg hover:bg-app-red/80 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[250] px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          toast.type === 'error' ? 'bg-app-red text-white' : 'bg-app-green text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ── Prompt Form Modal ──────────────────────────────────────────────

interface PromptFormModalProps {
  prompt: AIPrompt | null
  onSave: (data: AIPromptCreate | AIPromptUpdate) => void
  onClose: () => void
  isSaving: boolean
}

const PromptFormModal: React.FC<PromptFormModalProps> = ({ prompt, onSave, onClose, isSaving }) => {
  const [key, setKey] = useState(prompt?.key || '')
  const [name, setName] = useState(prompt?.name || '')
  const [description, setDescription] = useState(prompt?.description || '')
  const [category, setCategory] = useState<AIPromptCategory>(prompt?.category || 'system')
  const [template, setTemplate] = useState(prompt?.template || '')
  const [variablesStr, setVariablesStr] = useState(prompt?.variables.join(', ') || '')
  const [model, setModel] = useState(prompt?.model || 'gpt-4o-mini')
  const [maxTokens, setMaxTokens] = useState(prompt?.max_tokens?.toString() || '1024')
  const [temperature, setTemperature] = useState(prompt?.temperature?.toString() || '0.7')
  const [isActive, setIsActive] = useState(prompt?.is_active ?? true)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const variables = variablesStr.split(',').map(v => v.trim()).filter(Boolean)
    
    const data: AIPromptCreate | AIPromptUpdate = {
      name,
      description,
      category,
      template,
      variables,
      model,
      max_tokens: parseInt(maxTokens) || 1024,
      temperature: parseFloat(temperature) || 0.7,
      is_active: isActive,
    }
    
    // Include key only for create
    if (!prompt) {
      (data as AIPromptCreate).key = key
    }
    
    onSave(data)
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-app-card rounded-xl border border-app-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-app-card border-b border-app-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-app-text">
            {prompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
          <button onClick={onClose} className="p-1 text-app-muted hover:text-app-text">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Key</label>
              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value)}
                disabled={!!prompt}
                placeholder="quiz_generate"
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green disabled:opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Quiz Generator"
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Generate quiz questions for a topic"
              className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as AIPromptCategory)}
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              >
                <option value="system">System</option>
                <option value="tutor">Tutor</option>
                <option value="quiz">Quiz</option>
                <option value="grading">Grading</option>
                <option value="summary">Summary</option>
                <option value="chat">Chat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              >
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</option>
                <option value="claude-3-haiku-20240307">claude-3-haiku</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Template</label>
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              placeholder="Enter the prompt template..."
              rows={10}
              className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green font-mono"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Variables (comma-separated)</label>
            <input
              type="text"
              value={variablesStr}
              onChange={e => setVariablesStr(e.target.value)}
              placeholder="student_name, subject, topic"
              className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(e.target.value)}
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="w-full px-3 py-2 bg-app-card2 border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-app-border text-app-green focus:ring-app-green"
            />
            <label htmlFor="isActive" className="text-sm text-app-text">Active</label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-app-muted hover:text-app-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (prompt ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PromptsPage
