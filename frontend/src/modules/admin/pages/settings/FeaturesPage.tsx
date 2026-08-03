// ─── Feature Flags Page ──────────────────────────────────
// Toggle feature flags for the application

import React, { useEffect, useState, useCallback } from 'react'
import {
  ToggleLeft,
  ToggleRight,
  MagnifyingGlass,
  Funnel,
  Flask,
  Rocket,
  Warning,
  Clock,
} from '@phosphor-icons/react'

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  stage: 'development' | 'beta' | 'production'
  percentage?: number // For gradual rollout
  updated_at: string
  updated_by?: string
}

const FeaturesPage: React.FC = () => {
  const [features, setFeatures] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const loadFeatures = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockFeatures: FeatureFlag[] = [
        {
          id: '1',
          key: 'ai_voice_tutor',
          name: 'AI Voice Tutor',
          description: 'Enable voice-based AI tutoring sessions',
          enabled: true,
          stage: 'production',
          updated_at: new Date().toISOString(),
          updated_by: 'admin@eduvy.ai'
        },
        {
          id: '2',
          key: 'muqabla_battles',
          name: 'Muqabla Battles',
          description: 'Real-time multiplayer quiz battles',
          enabled: true,
          stage: 'beta',
          percentage: 50,
          updated_at: new Date().toISOString(),
          updated_by: 'admin@eduvy.ai'
        },
        {
          id: '3',
          key: 'notebook_ai',
          name: 'Notebook AI Chat',
          description: 'AI chat within notebook sources',
          enabled: true,
          stage: 'production',
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          key: 'bhool_bazaar',
          name: 'Bhool Bazaar',
          description: 'Mistake marketplace for learning from errors',
          enabled: true,
          stage: 'beta',
          percentage: 75,
          updated_at: new Date().toISOString(),
        },
        {
          id: '5',
          key: 'podcast_lab',
          name: 'Podcast Lab',
          description: 'Generate AI podcasts from content',
          enabled: false,
          stage: 'development',
          updated_at: new Date().toISOString(),
        },
        {
          id: '6',
          key: 'parent_dashboard',
          name: 'Parent Dashboard',
          description: 'Allow parents to monitor student progress',
          enabled: true,
          stage: 'production',
          updated_at: new Date().toISOString(),
        },
        {
          id: '7',
          key: 'study_squads',
          name: 'Sathi Study Squads',
          description: 'Social learning groups',
          enabled: true,
          stage: 'beta',
          percentage: 100,
          updated_at: new Date().toISOString(),
        },
        {
          id: '8',
          key: 'ai_examiner',
          name: 'AI Examiner Lab',
          description: 'AI-powered exam simulation',
          enabled: false,
          stage: 'development',
          updated_at: new Date().toISOString(),
        },
      ]
      
      setFeatures(mockFeatures)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled, updated_at: new Date().toISOString() } : f
    ))
    // TODO: Save to backend
  }

  const getStageIcon = (stage: FeatureFlag['stage']) => {
    const icons = {
      development: <Flask size={14} className="text-app-yellow" />,
      beta: <Warning size={14} className="text-app-orange" />,
      production: <Rocket size={14} className="text-app-green" />,
    }
    return icons[stage]
  }

  const getStageBadge = (stage: FeatureFlag['stage']) => {
    const styles = {
      development: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
      beta: 'bg-app-orange/10 text-app-orange border-app-orange/25',
      production: 'bg-app-green/10 text-app-green border-app-green/25',
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[stage]}`}>
        {getStageIcon(stage)}
        {stage}
      </span>
    )
  }

  const filteredFeatures = features.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || f.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const stats = {
    total: features.length,
    enabled: features.filter(f => f.enabled).length,
    disabled: features.filter(f => !f.enabled).length,
    development: features.filter(f => f.stage === 'development').length,
    beta: features.filter(f => f.stage === 'beta').length,
    production: features.filter(f => f.stage === 'production').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ToggleRight size={28} className="text-app-green" />
            Feature Flags
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Control feature availability across the platform
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="text-xs text-app-muted">Total</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.enabled}</p>
          <p className="text-xs text-app-muted">Enabled</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-red">{stats.disabled}</p>
          <p className="text-xs text-app-muted">Disabled</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{stats.development}</p>
          <p className="text-xs text-app-muted">Development</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-orange">{stats.beta}</p>
          <p className="text-xs text-app-muted">Beta</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.production}</p>
          <p className="text-xs text-app-muted">Production</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Stages</option>
            <option value="development">Development</option>
            <option value="beta">Beta</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>
      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Feature flags API not yet implemented.
      </div>
      {/* Feature List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-app-green border-t-transparent rounded-full" />
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            No features found
          </div>
        ) : (
          filteredFeatures.map(feature => (
            <div
              key={feature.id}
              className={`bg-app-card rounded-xl border transition-colors ${
                feature.enabled ? 'border-app-green/30' : 'border-app-border'
              } p-5`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-app-text">{feature.name}</h3>
                    {getStageBadge(feature.stage)}
                    {feature.percentage !== undefined && feature.percentage < 100 && (
                      <span className="text-xs text-app-muted">
                        {feature.percentage}% rollout
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-app-muted mb-2">{feature.description}</p>
                  <div className="flex items-center gap-4 text-xs text-app-muted">
                    <span className="font-mono bg-app-card2 px-2 py-0.5 rounded">{feature.key}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(feature.updated_at).toLocaleDateString()}
                    </span>
                    {feature.updated_by && (
                      <span>by {feature.updated_by}</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className={`shrink-0 p-1 rounded-lg transition-colors ${
                    feature.enabled
                      ? 'text-app-green hover:bg-app-green/10'
                      : 'text-app-muted hover:bg-app-card2'
                  }`}
                >
                  {feature.enabled ? (
                    <ToggleRight size={40} weight="fill" />
                  ) : (
                    <ToggleLeft size={40} />
                  )}
                </button>
              </div>
              
              {/* Rollout progress for beta features */}
              {feature.stage === 'beta' && feature.percentage !== undefined && (
                <div className="mt-4 pt-4 border-t border-app-border/50">
                  <div className="flex items-center justify-between text-xs text-app-muted mb-2">
                    <span>Gradual Rollout</span>
                    <span>{feature.percentage}%</span>
                  </div>
                  <div className="h-2 bg-app-card2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-app-orange/60 rounded-full transition-all"
                      style={{ width: `${feature.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Feature flags endpoint not yet implemented. Changes here are preview only and won't persist.</p>
      </div>
    </div>
  )
}

export default FeaturesPage
