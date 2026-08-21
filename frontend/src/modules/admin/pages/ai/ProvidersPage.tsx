// ─── AI Providers Page ─────────────────────────────────────────
// Manage AI providers, API keys, and model routing

import React, { useEffect, useState, useRef } from 'react'
import { useAIConfig, useCanEdit } from '../../hooks'
import { adminApi, aiKeysApi } from '../../api'
import type { AIRouting, AIKeySlot, AIKeyEnhanced, AIProviderModel, AIKeyValidationResult } from '../../types'
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
  ArrowsClockwise,
  User,
  Buildings,
  Info,
  ToggleLeft,
  ToggleRight,
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

  // Enhanced key management state
  const [enhancedKeys, setEnhancedKeys] = useState<AIKeyEnhanced[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<AIKeyValidationResult | null>(null)
  const [availableModels, setAvailableModels] = useState<AIProviderModel[]>([])
  const [editingKey, setEditingKey] = useState<AIKeyEnhanced | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedKeyInfo, setSelectedKeyInfo] = useState<AIKeyEnhanced | null>(null)
  const [validatingKey, setValidatingKey] = useState<string | null>(null) // "provider-slot"

  // Key form state (enhanced)
  const [keyForm, setKeyForm] = useState({
    provider: '' as ProviderKey | '',
    slot: 1,
    key: '',
    owner_email: '',
    project_name: '',
    description: '',
    rpm_limit: '' as string | number,
    tpm_limit: '' as string | number,
    daily_limit: '' as string | number,
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
        // Also load enhanced keys
        try {
          const keys = await aiKeysApi.getKeysEnhanced()
          setEnhancedKeys(keys)
        } catch {
          // Enhanced keys table might not exist yet, fallback to legacy
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchAIConfig])

  // Group enhanced keys by provider
  const enhancedKeysByProvider = enhancedKeys.reduce<Record<string, AIKeyEnhanced[]>>((acc, key) => {
    if (!acc[key.provider]) acc[key.provider] = []
    acc[key.provider].push(key)
    return acc
  }, {})

  // Group keys by provider
  const keysByProvider = (aiKeySlots || []).reduce<Record<string, AIKeySlot[]>>((acc, key) => {
    if (!acc[key.provider]) acc[key.provider] = []
    acc[key.provider].push(key)
    return acc
  }, {})

  // Validate API key
  const handleValidateKey = async () => {
    if (!keyForm.provider || !keyForm.key) {
      setFormError('Provider and API key are required')
      return
    }
    setFormError('')
    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await aiKeysApi.validateKey(keyForm.provider, keyForm.key)
      setValidationResult(result)
      if (result.valid && result.models) {
        setAvailableModels(result.models)
      }
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to validate key')
    } finally {
      setIsValidating(false)
    }
  }

  // Add API key (enhanced)
  const handleAddKey = async () => {
    // When adding new key, key is required. When editing, key is optional (keeps existing)
    if (!keyForm.provider || (!editingKey && !keyForm.key)) {
      setFormError('Provider and API key are required')
      return
    }
    setFormError('')

    try {
      // If editing and no new key provided, call metadata-only update
      if (editingKey && !keyForm.key) {
        await aiKeysApi.updateKeyMetadata(keyForm.provider, keyForm.slot, {
          owner_email: keyForm.owner_email,
          project_name: keyForm.project_name,
          description: keyForm.description,
          rpm_limit: keyForm.rpm_limit ? Number(keyForm.rpm_limit) : null,
          tpm_limit: keyForm.tpm_limit ? Number(keyForm.tpm_limit) : null,
          daily_limit: keyForm.daily_limit ? Number(keyForm.daily_limit) : null,
        })
      } else {
        await aiKeysApi.saveKeyEnhanced({
          provider: keyForm.provider,
          key: keyForm.key,
          slot: keyForm.slot,
          owner_email: keyForm.owner_email,
          project_name: keyForm.project_name,
          description: keyForm.description,
          rpm_limit: keyForm.rpm_limit ? Number(keyForm.rpm_limit) : null,
          tpm_limit: keyForm.tpm_limit ? Number(keyForm.tpm_limit) : null,
          daily_limit: keyForm.daily_limit ? Number(keyForm.daily_limit) : null,
        })
      }
      await fetchAIConfig()
      // Reload enhanced keys
      const keys = await aiKeysApi.getKeysEnhanced()
      setEnhancedKeys(keys)
      setShowAddKeyModal(false)
      resetKeyForm()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to add API key')
    }
  }

  // Reset key form
  const resetKeyForm = () => {
    setKeyForm({
      provider: '',
      slot: 1,
      key: '',
      owner_email: '',
      project_name: '',
      description: '',
      rpm_limit: '',
      tpm_limit: '',
      daily_limit: '',
    })
    setValidationResult(null)
    setAvailableModels([])
    setEditingKey(null)
  }

  // Toggle key enabled/disabled
  const handleToggleKey = async (provider: string, slot: number, currentEnabled: boolean) => {
    try {
      await aiKeysApi.toggleKey(provider, slot, !currentEnabled)
      const keys = await aiKeysApi.getKeysEnhanced()
      setEnhancedKeys(keys)
    } catch (error: any) {
      console.error('Failed to toggle key:', error)
    }
  }

  // Edit existing key (opens modal with pre-filled data)
  const handleEditKey = (keyData: AIKeyEnhanced) => {
    setEditingKey(keyData)
    setKeyForm({
      provider: keyData.provider as ProviderKey,
      slot: keyData.slot,
      key: '', // Don't pre-fill key for security - user must re-enter if changing
      owner_email: keyData.owner_email || '',
      project_name: keyData.project_name || '',
      description: keyData.description || '',
      rpm_limit: keyData.rpm_limit || '',
      tpm_limit: keyData.tpm_limit || '',
      daily_limit: keyData.daily_limit || '',
    })
    setFormError('')
    setValidationResult(null)
    setShowAddKeyModal(true)
  }

  // View key info
  const handleViewKeyInfo = (keyData: AIKeyEnhanced) => {
    setSelectedKeyInfo(keyData)
    setShowInfoModal(true)
  }

  // Validate existing key (inline)
  const handleValidateExistingKey = async (provider: string, slot: number) => {
    const keyId = `${provider}-${slot}`
    setValidatingKey(keyId)
    try {
      await aiKeysApi.validateExistingKey(provider, slot)
      // Refresh keys to get updated validation status
      const keys = await aiKeysApi.getKeysEnhanced()
      setEnhancedKeys(keys)
    } catch (error: any) {
      console.error('Validation failed:', error)
    } finally {
      setValidatingKey(null)
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
              // Use enhanced keys if available, fallback to legacy
              const enhancedKeysForProvider = enhancedKeysByProvider[key] || []
              const legacyKeys = keysByProvider[key] || []
              const hasEnhanced = enhancedKeysForProvider.length > 0
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
                          const nextSlot = Math.max(
                            ...([...enhancedKeysForProvider, ...legacyKeys].map(k => 'slot' in k ? k.slot : 0)),
                            0
                          ) + 1
                          resetKeyForm()
                          setKeyForm(prev => ({ ...prev, provider: providerKey, slot: nextSlot }))
                          setFormError('')
                          setShowAddKeyModal(true)
                        }}
                      >
                        Add Key
                      </Button>
                    )}
                  </div>

                  {/* Enhanced Keys list */}
                  {hasEnhanced ? (
                    <div className="space-y-2">
                      {enhancedKeysForProvider.map((keyData: AIKeyEnhanced) => {
                        const keyId = `${keyData.provider}-${keyData.slot}`
                        return (
                          <div
                            key={keyId}
                            className={`p-3 bg-app-card2 rounded-lg ${!keyData.is_enabled ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-app-muted">Slot {keyData.slot}</span>
                                <code className="text-xs text-app-text font-mono">
                                  {showKeys[keyId] ? keyData.key_hint : '••••••••••••'}
                                </code>
                                <button
                                  onClick={() => toggleKeyVisibility(keyId)}
                                  className="p-1 text-app-muted hover:text-app-text"
                                >
                                  {showKeys[keyId] ? <EyeSlash size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Validation status */}
                                {keyData.validation_status === 'valid' && (
                                  <span title="Valid">
                                    <CheckCircle size={14} weight="fill" className="text-app-green" />
                                  </span>
                                )}
                                {keyData.validation_status === 'invalid' && (
                                  <span title="Invalid">
                                    <XCircle size={14} weight="fill" className="text-app-red" />
                                  </span>
                                )}
                                {keyData.validation_status === 'pending' && (
                                  <span title="Pending validation">
                                    <WarningCircle size={14} className="text-app-yellow" />
                                  </span>
                                )}
                                {/* Validate button (show for pending/invalid) */}
                                {canEdit && (keyData.validation_status === 'pending' || keyData.validation_status === 'invalid') && (
                                  <button
                                    onClick={() => handleValidateExistingKey(keyData.provider, keyData.slot)}
                                    disabled={validatingKey === `${keyData.provider}-${keyData.slot}`}
                                    className="px-2 py-0.5 text-xs bg-app-blue/20 text-app-blue hover:bg-app-blue/30 rounded disabled:opacity-50"
                                    title="Validate key"
                                  >
                                    {validatingKey === `${keyData.provider}-${keyData.slot}` ? 'Validating...' : 'Validate'}
                                  </button>
                                )}
                                {/* Info button */}
                                <button
                                  onClick={() => handleViewKeyInfo(keyData)}
                                  className="p-1 text-app-muted hover:text-app-blue"
                                  title="View details"
                                >
                                  <Info size={14} />
                                </button>
                                {/* Edit button */}
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditKey(keyData)}
                                    className="p-1 text-app-muted hover:text-app-text"
                                    title="Edit key"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                                {/* Toggle enabled */}
                                {canEdit && (
                                  <button
                                    onClick={() => handleToggleKey(keyData.provider, keyData.slot, keyData.is_enabled)}
                                    className="p-1 text-app-muted hover:text-app-text"
                                    title={keyData.is_enabled ? 'Disable key' : 'Enable key'}
                                  >
                                    {keyData.is_enabled ? (
                                      <ToggleRight size={18} weight="fill" className="text-app-green" />
                                    ) : (
                                      <ToggleLeft size={18} className="text-app-muted" />
                                    )}
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => handleRemoveKey(keyData.provider, keyData.slot)}
                                    className="p-1 text-app-muted hover:text-app-red"
                                  >
                                    <Trash size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Metadata row */}
                            {(keyData.owner_email || keyData.project_name) && (
                              <div className="flex items-center gap-3 mt-2 text-xs text-app-muted">
                                {keyData.owner_email && (
                                  <span className="flex items-center gap-1">
                                    <User size={10} />
                                    {keyData.owner_email}
                                  </span>
                                )}
                                {keyData.project_name && (
                                  <span className="flex items-center gap-1">
                                    <Buildings size={10} />
                                    {keyData.project_name}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Limits row */}
                            {(keyData.rpm_limit || keyData.tpm_limit || keyData.daily_limit) && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-app-muted">
                                {keyData.rpm_limit && <span>RPM: {keyData.rpm_limit.toLocaleString()}</span>}
                                {keyData.tpm_limit && <span>TPM: {keyData.tpm_limit.toLocaleString()}</span>}
                                {keyData.daily_limit && <span>Daily: {keyData.daily_limit.toLocaleString()}</span>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : legacyKeys.length > 0 ? (
                    /* Legacy keys display (fallback) */
                    <div className="space-y-2">
                      {legacyKeys.map((keySlot: AIKeySlot) => {
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

      {/* Add/Edit Key Modal (Enhanced) */}
      <Modal
        isOpen={showAddKeyModal}
        onClose={() => { setShowAddKeyModal(false); resetKeyForm() }}
        title={editingKey ? `Edit API Key - ${PROVIDERS[editingKey.provider as ProviderKey]?.name || editingKey.provider}` : "Add API Key"}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          {/* Editing hint */}
          {editingKey && (
            <div className="p-3 rounded-xl bg-app-blue/10 border border-app-blue/30 text-sm text-app-blue">
              Editing Slot {editingKey.slot}. Leave "API Key" empty to keep the existing key, or enter a new key to replace it.
            </div>
          )}

          {/* Provider & Slot Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Provider</label>
              <select
                value={keyForm.provider}
                onChange={(e) => {
                  setKeyForm(prev => ({ ...prev, provider: e.target.value as ProviderKey }))
                  setValidationResult(null)
                  setAvailableModels([])
                }}
                disabled={!!editingKey}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-60"
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
                disabled={!!editingKey}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50 disabled:opacity-60"
              />
            </div>
          </div>

          {/* API Key with Validate Button */}
          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">
              API Key {editingKey && <span className="text-app-muted font-normal">(leave empty to keep existing)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyForm.key}
                onChange={(e) => {
                  setKeyForm(prev => ({ ...prev, key: e.target.value }))
                  setValidationResult(null)
                }}
                placeholder={editingKey ? "(unchanged)" : "sk-..."}
                className="flex-1 h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text font-mono placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleValidateKey}
                disabled={!keyForm.provider || !keyForm.key || isValidating}
                leftIcon={isValidating ? <ArrowsClockwise size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </Button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-xl border ${
              validationResult.valid 
                ? 'bg-app-green/10 border-app-green/30' 
                : 'bg-app-red/10 border-app-red/30'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <>
                    <CheckCircle size={18} weight="fill" className="text-app-green" />
                    <span className="text-sm text-app-green font-medium">
                      Key valid — {availableModels.length} models available
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} weight="fill" className="text-app-red" />
                    <span className="text-sm text-app-red">{validationResult.error}</span>
                  </>
                )}
              </div>
              {validationResult.valid && availableModels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {availableModels.slice(0, 8).map(m => (
                    <span key={m.id} className="px-2 py-0.5 text-xs bg-app-card rounded-full text-app-muted">
                      {m.name || m.id}
                    </span>
                  ))}
                  {availableModels.length > 8 && (
                    <span className="px-2 py-0.5 text-xs text-app-muted">
                      +{availableModels.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata Section */}
          <div className="border-t border-app-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-app-text mb-3 flex items-center gap-2">
              <Info size={14} />
              Key Metadata <span className="text-app-muted font-normal">(optional)</span>
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                  <User size={12} className="inline mr-1" />
                  Owner Email
                </label>
                <input
                  type="email"
                  value={keyForm.owner_email}
                  onChange={(e) => setKeyForm(prev => ({ ...prev, owner_email: e.target.value }))}
                  placeholder="team@company.com"
                  className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                  <Buildings size={12} className="inline mr-1" />
                  Project Name
                </label>
                <input
                  type="text"
                  value={keyForm.project_name}
                  onChange={(e) => setKeyForm(prev => ({ ...prev, project_name: e.target.value }))}
                  placeholder="Production"
                  className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-app-muted mb-1">Description</label>
              <input
                type="text"
                value={keyForm.description}
                onChange={(e) => setKeyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Main billing account for production"
                className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
              />
            </div>

            {/* Limits */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">RPM Limit</label>
                <input
                  type="number"
                  value={keyForm.rpm_limit}
                  onChange={(e) => setKeyForm(prev => ({ ...prev, rpm_limit: e.target.value }))}
                  placeholder="60"
                  className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">TPM Limit</label>
                <input
                  type="number"
                  value={keyForm.tpm_limit}
                  onChange={(e) => setKeyForm(prev => ({ ...prev, tpm_limit: e.target.value }))}
                  placeholder="100000"
                  className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Daily Limit</label>
                <input
                  type="number"
                  value={keyForm.daily_limit}
                  onChange={(e) => setKeyForm(prev => ({ ...prev, daily_limit: e.target.value }))}
                  placeholder="1000000"
                  className="w-full h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
            </div>
            <p className="text-xs text-app-muted mt-1">
              RPM = Requests/min, TPM = Tokens/min. Leave empty if unknown.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button variant="ghost" onClick={() => { setShowAddKeyModal(false); resetKeyForm() }}>
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

      {/* Key Info Modal */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => { setShowInfoModal(false); setSelectedKeyInfo(null) }}
        title={`Key Details - ${selectedKeyInfo ? PROVIDERS[selectedKeyInfo.provider as ProviderKey]?.name || selectedKeyInfo.provider : ''}`}
        size="md"
      >
        {selectedKeyInfo && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Provider</label>
                <p className="text-sm text-app-text">{PROVIDERS[selectedKeyInfo.provider as ProviderKey]?.name || selectedKeyInfo.provider}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Slot</label>
                <p className="text-sm text-app-text">{selectedKeyInfo.slot}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">API Key</label>
              <code className="text-sm text-app-text font-mono bg-app-card2 px-2 py-1 rounded">{selectedKeyInfo.key_hint}</code>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Status</label>
                <span className={`inline-flex items-center gap-1 text-sm ${selectedKeyInfo.is_enabled ? 'text-app-green' : 'text-app-muted'}`}>
                  {selectedKeyInfo.is_enabled ? (
                    <><CheckCircle size={14} weight="fill" /> Enabled</>
                  ) : (
                    <><XCircle size={14} /> Disabled</>
                  )}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Validation</label>
                <span className={`inline-flex items-center gap-1 text-sm ${
                  selectedKeyInfo.validation_status === 'valid' ? 'text-app-green' :
                  selectedKeyInfo.validation_status === 'invalid' ? 'text-app-red' : 'text-app-yellow'
                }`}>
                  {selectedKeyInfo.validation_status === 'valid' && <><CheckCircle size={14} weight="fill" /> Valid</>}
                  {selectedKeyInfo.validation_status === 'invalid' && <><XCircle size={14} weight="fill" /> Invalid</>}
                  {selectedKeyInfo.validation_status === 'pending' && <><WarningCircle size={14} /> Pending</>}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t border-app-border pt-4">
              <h4 className="text-sm font-medium text-app-text mb-3">Metadata</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">
                    <User size={10} className="inline mr-1" /> Owner Email
                  </label>
                  <p className="text-sm text-app-text">{selectedKeyInfo.owner_email || '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">
                    <Buildings size={10} className="inline mr-1" /> Project Name
                  </label>
                  <p className="text-sm text-app-text">{selectedKeyInfo.project_name || '—'}</p>
                </div>
              </div>
              {selectedKeyInfo.description && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-app-muted mb-1">Description</label>
                  <p className="text-sm text-app-text">{selectedKeyInfo.description}</p>
                </div>
              )}
            </div>

            {/* Limits */}
            {(selectedKeyInfo.rpm_limit || selectedKeyInfo.tpm_limit || selectedKeyInfo.daily_limit) && (
              <div className="border-t border-app-border pt-4">
                <h4 className="text-sm font-medium text-app-text mb-3">Rate Limits</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">RPM</label>
                    <p className="text-sm text-app-text">{selectedKeyInfo.rpm_limit?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">TPM</label>
                    <p className="text-sm text-app-text">{selectedKeyInfo.tpm_limit?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-app-muted mb-1">Daily</label>
                    <p className="text-sm text-app-text">{selectedKeyInfo.daily_limit?.toLocaleString() || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Info */}
            <div className="border-t border-app-border pt-4">
              <h4 className="text-sm font-medium text-app-text mb-3">Audit Info</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-app-muted">
                <div>
                  <label className="block font-medium mb-1">Created</label>
                  <p>{selectedKeyInfo.created_at ? new Date(selectedKeyInfo.created_at).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <label className="block font-medium mb-1">Last Updated</label>
                  <p>{selectedKeyInfo.updated_at ? new Date(selectedKeyInfo.updated_at).toLocaleString() : '—'}</p>
                </div>
                {selectedKeyInfo.last_validated && (
                  <div>
                    <label className="block font-medium mb-1">Last Validated</label>
                    <p>{new Date(selectedKeyInfo.last_validated).toLocaleString()}</p>
                  </div>
                )}
                {selectedKeyInfo.created_by && (
                  <div>
                    <label className="block font-medium mb-1">Created By</label>
                    <p>{selectedKeyInfo.created_by}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
              <Button variant="ghost" onClick={() => { setShowInfoModal(false); setSelectedKeyInfo(null) }}>
                Close
              </Button>
              {canEdit && (
                <Button
                  variant="primary"
                  leftIcon={<Pencil size={14} />}
                  onClick={() => {
                    setShowInfoModal(false)
                    handleEditKey(selectedKeyInfo)
                  }}
                >
                  Edit Key
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ProvidersPage
