// ─── AI Providers Page ─────────────────────────────────────────
// Manage AI providers, API keys, and model routing

import React, { useEffect, useState, useRef } from 'react'
import { useAIConfig, useCanEdit } from '../../hooks'
import { adminApi } from '../../api'
import type { AIRouting, AIKeySlot } from '../../types'
import { PLAN_LABELS } from '../../constants'
import Modal from '../../../../shared/components/Modal'
import ConfirmDialog from '../../../../shared/components/ConfirmDialog'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import {
  Robot,
  Key,
  Plus,
  Pencil,
  Trash,
  Eye,
  EyeSlash,
  CheckCircle,
  XCircle,
  Lightning,
  Gear,
  WarningCircle,
} from '@phosphor-icons/react'

// Provider info
const PROVIDERS = {
  openai: { name: 'OpenAI', color: 'text-emerald-400', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  gemini: { name: 'Google AI (Gemini)', color: 'text-blue-400', models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  anthropic: { name: 'Anthropic', color: 'text-orange-400', models: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'] },
  groq: { name: 'Groq', color: 'text-pink-400', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  nvidia: { name: 'NVIDIA NIM', color: 'text-green-400', models: ['meta/llama-3.3-70b-instruct'] },
}

type ProviderKey = keyof typeof PROVIDERS

const ProvidersPage: React.FC = () => {
  const { aiRouting, aiKeySlots, fetchAIConfig } = useAIConfig()
  const canEdit = useCanEdit('ai_studio')

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'keys' | 'routing'>('keys')
  const [showAddKeyModal, setShowAddKeyModal] = useState(false)
  const [showRoutingModal, setShowRoutingModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  // Key form state
  const [keyForm, setKeyForm] = useState({
    provider: '' as ProviderKey | '',
    slot: 1,
    key: '',
  })

  // Routing form state
  const [routingForm, setRoutingForm] = useState<AIRouting[]>([])
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ provider: string; slot: number } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // Ref to prevent duplicate fetches
  const loadedRef = useRef(false)

  // Load config
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchAIConfig()
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchAIConfig])

  // Group keys by provider
  const keysByProvider = (aiKeySlots || []).reduce<Record<string, AIKeySlot[]>>((acc, key) => {
    if (!acc[key.provider]) acc[key.provider] = []
    acc[key.provider].push(key)
    return acc
  }, {})

  // Add API key
  const handleAddKey = async () => {
    if (!keyForm.provider || !keyForm.key) {
      setFormError('Provider and API key are required')
      return
    }
    setFormError('')

    try {
      await adminApi.aiConfig.addKey(keyForm.provider, keyForm.slot, keyForm.key)
      await fetchAIConfig()
      setShowAddKeyModal(false)
      setKeyForm({ provider: '', slot: 1, key: '' })
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to add API key')
    }
  }

  // Remove API key
  const handleRemoveKey = (provider: string, slot: number) => {
    setDeleteTarget({ provider, slot })
    setDeleteError('')
    setShowDeleteConfirm(true)
  }

  const confirmRemoveKey = async () => {
    if (!deleteTarget) return
    try {
      await adminApi.aiConfig.removeKey(deleteTarget.provider, deleteTarget.slot)
      await fetchAIConfig()
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      setDeleteError(error.response?.data?.detail || 'Failed to remove key')
    }
  }

  // Open routing modal
  const handleEditRouting = () => {
    setRoutingForm([...(Array.isArray(aiRouting) ? aiRouting : [])])
    setShowRoutingModal(true)
  }

  // Save routing
  const handleSaveRouting = async () => {
    setFormError('')
    try {
      await adminApi.aiConfig.updateRouting(routingForm)
      await fetchAIConfig() // Refresh config after save
      setShowRoutingModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save routing')
    }
  }

  // Update routing entry
  const updateRouting = (plan: string, field: 'provider' | 'model', value: string) => {
    setRoutingForm(prev => prev.map(r => 
      r.plan === plan ? { ...r, [field]: value } : r
    ))
  }

  // Toggle key visibility
  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Get provider health indicator
  const getProviderHealth = (provider: string) => {
    const hasKeys = keysByProvider[provider]?.some((k: AIKeySlot) => k.is_active)
    const routingArray = Array.isArray(aiRouting) ? aiRouting : []
    const hasRouting = routingArray.some((r: AIRouting) => r.provider === provider)
    
    if (hasKeys && hasRouting) return { status: 'active', color: 'text-app-green' }
    if (hasKeys) return { status: 'configured', color: 'text-app-yellow' }
    return { status: 'inactive', color: 'text-app-muted' }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader size="lg" />
        <p className="text-app-muted mt-3 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text">AI Providers</h1>
          <p className="text-sm text-app-muted mt-1">Manage API keys and model routing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-app-border pb-px">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'keys'
              ? 'border-app-green text-app-green'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          <Key size={16} className="inline mr-2" />
          API Keys
        </button>
        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'routing'
              ? 'border-app-green text-app-green'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          <Gear size={16} className="inline mr-2" />
          Plan Routing
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PROVIDERS).map(([key, provider]) => {
              const providerKey = key as ProviderKey
              const keys = keysByProvider[key] || []
              const health = getProviderHealth(key)
              
              return (
                <div
                  key={key}
                  className="bg-app-card rounded-xl border border-app-border p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-app-card2 flex items-center justify-center ${provider.color}`}>
                        <Robot size={20} weight="fill" />
                      </div>
                      <div>
                        <h3 className="font-bold text-app-text">{provider.name}</h3>
                        <span className={`text-xs ${health.color}`}>
                          {health.status === 'active' && <CheckCircle size={12} className="inline mr-1" weight="fill" />}
                          {health.status === 'configured' && <WarningCircle size={12} className="inline mr-1" />}
                          {health.status}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Plus size={14} />}
                        onClick={() => {
                          setKeyForm({ provider: providerKey, slot: keys.length + 1, key: '' })
                          setFormError('')
                          setShowAddKeyModal(true)
                        }}
                      >
                        Add Key
                      </Button>
                    )}
                  </div>

                  {/* Keys list */}
                  {keys.length > 0 ? (
                    <div className="space-y-2">
                      {keys.map((keySlot: AIKeySlot) => {
                        const keyId = `${keySlot.provider}-${keySlot.slot}`
                        return (
                          <div
                            key={keyId}
                            className="flex items-center justify-between p-2 bg-app-card2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-app-muted">Slot {keySlot.slot}</span>
                              <code className="text-xs text-app-text font-mono">
                                {showKeys[keyId] ? keySlot.masked_key : '••••••••••••'}
                              </code>
                              <button
                                onClick={() => toggleKeyVisibility(keyId)}
                                className="p-1 text-app-muted hover:text-app-text"
                              >
                                {showKeys[keyId] ? <EyeSlash size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              {keySlot.is_active ? (
                                <CheckCircle size={16} weight="fill" className="text-app-green" />
                              ) : (
                                <XCircle size={16} className="text-app-muted" />
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => handleRemoveKey(keySlot.provider, keySlot.slot)}
                                  className="p-1 text-app-muted hover:text-app-red"
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-app-muted text-center py-4">No API keys configured</p>
                  )}

                  {/* Models */}
                  <div className="mt-3 pt-3 border-t border-app-border">
                    <p className="text-xs text-app-muted mb-1">Available Models:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.map(model => (
                        <span
                          key={model}
                          className="px-2 py-0.5 text-xs bg-app-card2 rounded-full text-app-muted"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Routing Tab */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-muted">
              Configure which AI provider and model each plan uses
            </p>
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Pencil size={14} />}
                onClick={handleEditRouting}
              >
                Edit Routing
              </Button>
            )}
          </div>

          {/* Routing table */}
          <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-app-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-app-muted">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-app-muted">Provider</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-app-muted">Model</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-app-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(aiRouting) ? aiRouting : []).map((route: AIRouting) => {
                  const providerInfo = PROVIDERS[route.provider as ProviderKey]
                  const hasKey = keysByProvider[route.provider]?.some((k: AIKeySlot) => k.is_active)
                  
                  return (
                    <tr key={route.plan} className="border-b border-app-border last:border-0">
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${PLAN_LABELS[route.plan]?.color || 'text-app-text'}`}>
                          {PLAN_LABELS[route.plan]?.label || route.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${providerInfo?.color || 'text-app-text'}`}>
                          {providerInfo?.name || route.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-app-card2 px-2 py-1 rounded text-app-text">
                          {route.model}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {hasKey ? (
                          <span className="inline-flex items-center gap-1 text-xs text-app-green">
                            <Lightning size={12} weight="fill" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-app-red">
                            <WarningCircle size={12} />
                            No key
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      <Modal
        isOpen={showAddKeyModal}
        onClose={() => setShowAddKeyModal(false)}
        title="Add API Key"
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Provider</label>
            <select
              value={keyForm.provider}
              onChange={(e) => setKeyForm(prev => ({ ...prev, provider: e.target.value as ProviderKey }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
            >
              <option value="">Select provider</option>
              {Object.entries(PROVIDERS).map(([key, provider]) => (
                <option key={key} value={key}>{provider.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Slot Number</label>
            <input
              type="number"
              min="1"
              max="5"
              value={keyForm.slot}
              onChange={(e) => setKeyForm(prev => ({ ...prev, slot: parseInt(e.target.value) || 1 }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
            <p className="text-xs text-app-muted mt-1">Use multiple slots for key rotation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">API Key</label>
            <input
              type="password"
              value={keyForm.key}
              onChange={(e) => setKeyForm(prev => ({ ...prev, key: e.target.value }))}
              placeholder="sk-..."
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text font-mono placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddKeyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddKey}>
              Add Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Routing Modal */}
      <Modal
        isOpen={showRoutingModal}
        onClose={() => setShowRoutingModal(false)}
        title="Edit Plan Routing"
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <p className="text-sm text-app-muted">
            Set which AI provider and model each subscription plan should use.
          </p>

          <div className="space-y-3">
            {routingForm.map(route => (
              <div key={route.plan} className="flex items-center gap-3 p-3 bg-app-card2 rounded-xl">
                <div className="w-24">
                  <span className={`text-sm font-medium ${PLAN_LABELS[route.plan]?.color || 'text-app-text'}`}>
                    {PLAN_LABELS[route.plan]?.label || route.plan}
                  </span>
                </div>
                <select
                  value={route.provider}
                  onChange={(e) => updateRouting(route.plan, 'provider', e.target.value)}
                  className="flex-1 h-9 px-3 bg-app-card border border-white/10 rounded-lg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
                >
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <option key={key} value={key}>{provider.name}</option>
                  ))}
                </select>
                <select
                  value={route.model}
                  onChange={(e) => updateRouting(route.plan, 'model', e.target.value)}
                  className="flex-1 h-9 px-3 bg-app-card border border-white/10 rounded-lg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
                >
                  {PROVIDERS[route.provider as ProviderKey]?.models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowRoutingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRouting}>
              Save Routing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
          setDeleteError('')
        }}
        onConfirm={confirmRemoveKey}
        title="Remove API Key?"
        message={
          <>
            This will remove the API key for {deleteTarget?.provider} (Slot {deleteTarget?.slot}).
            {deleteError && (
              <p className="mt-2 text-app-red text-sm">{deleteError}</p>
            )}
          </>
        }
        confirmText="Remove"
        variant="danger"
      />
    </div>
  )
}

export default ProvidersPage
