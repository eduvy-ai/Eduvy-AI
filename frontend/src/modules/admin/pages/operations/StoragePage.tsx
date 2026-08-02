// ─── Storage Management Page ──────────────────────────────────
// Monitor R2 cloud storage usage

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../../api'
import {
  HardDrive,
  CloudArrowUp,
  Warning,
  CheckCircle,
  ArrowClockwise,
  Info,
  XCircle,
} from '@phosphor-icons/react'

interface StorageStats {
  configured: boolean
  message?: string
  total_gb?: number
  limit_gb?: number
  usage_percent?: number
  remaining_gb?: number
  is_warning?: boolean
  is_limit_reached?: boolean
  files_count?: number
}

const StoragePage: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStorage = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.storage.getStats()
      // Backend returns different structure, normalize it
      setStats({
        configured: true,
        total_gb: result.used_gb,
        limit_gb: result.limit_gb,
        usage_percent: result.limit_gb > 0 ? (result.used_gb / result.limit_gb) * 100 : 0,
        remaining_gb: result.limit_gb - result.used_gb,
        is_warning: (result.used_gb / result.limit_gb) > 0.8,
        is_limit_reached: result.used_gb >= result.limit_gb,
        files_count: result.files_count,
      })
    } catch (err: any) {
      // Check if R2 is not configured
      if (err.response?.data?.configured === false) {
        setStats({
          configured: false,
          message: err.response?.data?.message || 'R2 storage not configured',
        })
      } else {
        setError(err.response?.data?.detail || 'Failed to load storage stats')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStorage()
  }, [loadStorage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-app-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
              <HardDrive size={28} className="text-app-purple" />
              Storage Management
            </h1>
          </div>
        </div>
        <div className="p-6 bg-app-red/10 border border-app-red/25 rounded-xl text-app-red">
          {error}
        </div>
      </div>
    )
  }

  // R2 not configured
  if (stats && !stats.configured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
              <HardDrive size={28} className="text-app-purple" />
              Storage Management
            </h1>
            <p className="text-sm text-app-muted mt-1">
              Cloudflare R2 storage
            </p>
          </div>
        </div>
        
        <div className="bg-app-card rounded-xl border border-app-border p-8 text-center">
          <XCircle size={48} className="text-app-muted mx-auto mb-4" />
          <h2 className="text-lg font-bold text-app-text mb-2">Storage Not Configured</h2>
          <p className="text-app-muted mb-4">{stats.message}</p>
          <div className="p-4 bg-app-card2 rounded-lg text-left max-w-md mx-auto">
            <p className="text-xs text-app-muted mb-2">Add to your .env file:</p>
            <code className="text-xs text-app-green">
              R2_ACCOUNT_ID=your_account_id<br />
              R2_ACCESS_KEY_ID=your_key_id<br />
              R2_SECRET_ACCESS_KEY=your_secret_key
            </code>
          </div>
        </div>
      </div>
    )
  }

  const usedPercentage = stats?.usage_percent || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <HardDrive size={28} className="text-app-purple" />
            Storage Management
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Cloudflare R2 cloud storage
          </p>
        </div>
        <button
          onClick={loadStorage}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
        >
          <ArrowClockwise size={14} />
          Refresh
        </button>
      </div>

      {/* Storage Overview Card */}
      <div className="bg-app-card rounded-xl border border-app-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-app-text">Storage Usage</h2>
          <div className="flex items-center gap-2">
            {stats?.is_limit_reached ? (
              <span className="px-2 py-1 text-xs font-medium bg-app-red/10 text-app-red rounded-lg flex items-center gap-1">
                <XCircle size={12} /> Limit Reached
              </span>
            ) : stats?.is_warning ? (
              <span className="px-2 py-1 text-xs font-medium bg-app-yellow/10 text-app-yellow rounded-lg flex items-center gap-1">
                <Warning size={12} /> Warning
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-app-green/10 text-app-green rounded-lg flex items-center gap-1">
                <CheckCircle size={12} /> Healthy
              </span>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-6 bg-app-card2 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${
              stats?.is_limit_reached ? 'bg-app-red' : stats?.is_warning ? 'bg-app-yellow' : 'bg-app-green'
            }`}
            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
          >
            {usedPercentage > 15 && (
              <span className="text-xs font-bold text-white">{usedPercentage.toFixed(1)}%</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-muted">
            {stats?.total_gb?.toFixed(2) || 0} GB used
          </span>
          <span className="text-app-muted">
            {stats?.limit_gb || 10} GB limit
          </span>
        </div>
        
        {stats?.is_warning && !stats?.is_limit_reached && (
          <div className="flex items-center gap-2 p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow mt-4">
            <Warning size={16} />
            Storage is {usedPercentage.toFixed(1)}% full. Only {stats.remaining_gb?.toFixed(2)} GB remaining.
          </div>
        )}
        
        {stats?.is_limit_reached && (
          <div className="flex items-center gap-2 p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red mt-4">
            <XCircle size={16} />
            Storage limit reached. Uploads are disabled until space is freed.
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<HardDrive size={24} />}
          iconColor="text-app-purple"
          iconBg="bg-app-purple/10"
          label="Total Used"
          value={`${stats?.total_gb?.toFixed(2) || 0} GB`}
        />
        <StatCard
          icon={<CloudArrowUp size={24} />}
          iconColor="text-app-green"
          iconBg="bg-app-green/10"
          label="Available"
          value={`${stats?.remaining_gb?.toFixed(2) || 0} GB`}
        />
        <StatCard
          icon={<Info size={24} />}
          iconColor="text-app-blue"
          iconBg="bg-app-blue/10"
          label="Files Stored"
          value={stats?.files_count?.toLocaleString() || '—'}
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          iconColor="text-app-cyan"
          iconBg="bg-app-cyan/10"
          label="Storage Limit"
          value={`${stats?.limit_gb || 10} GB`}
        />
      </div>

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">About R2 Storage</p>
        <p>
          Files are stored in Cloudflare R2 for fast global delivery. Audio files, images, and other
          media are automatically uploaded here. The 10GB limit is enforced to control costs.
        </p>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string
}> = ({ icon, iconColor, iconBg, label, value }) => (
  <div className="bg-app-card rounded-xl border border-app-border p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-app-muted">{label}</p>
        <p className="text-lg font-bold text-app-text">{value}</p>
      </div>
    </div>
  </div>
)

export default StoragePage
