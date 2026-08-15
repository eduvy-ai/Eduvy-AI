// ─── Storage Management Page ──────────────────────────────────
// Monitor R2 cloud storage usage

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi, type StorageStats, type SyncResult } from '../../api'
import Loader from '../../../../shared/components/Loader'
import {
  HardDrive,
  CloudArrowUp,
  Warning,
  CheckCircle,
  ArrowClockwise,
  XCircle,
  Folder,
  User,
  File,
  ArrowsClockwise,
} from '@phosphor-icons/react'

const StoragePage: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  const loadStorage = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.storage.getStats()
      setStats(result)
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

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const result = await adminApi.storage.sync()
      setSyncResult(result)
      // Reload stats after sync
      await loadStorage()
    } catch (err: any) {
      setSyncResult({
        synced: false,
        added: 0,
        removed: 0,
        total_files_r2: 0,
        total_bytes_r2: 0,
        total_mb_r2: 0,
        error: err.response?.data?.detail || 'Sync failed',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader size="lg" />
        <p className="text-app-muted mt-3 text-sm">Loading...</p>
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1.5 text-sm text-app-purple hover:text-app-text bg-app-purple/10 border border-app-purple/30 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowsClockwise size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync with R2'}
          </button>
          <button
            onClick={loadStorage}
            className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <ArrowClockwise size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          syncResult.synced 
            ? 'bg-app-green/10 border-app-green/25' 
            : 'bg-app-red/10 border-app-red/25'
        }`}>
          {syncResult.synced ? (
            <CheckCircle size={20} className="text-app-green flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle size={20} className="text-app-red flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${syncResult.synced ? 'text-app-green' : 'text-app-red'}`}>
              {syncResult.synced ? 'Storage Synced Successfully' : 'Sync Failed'}
            </p>
            {syncResult.synced ? (
              <p className="text-sm text-app-muted mt-1">
                R2 has {syncResult.total_files_r2} files ({syncResult.total_mb_r2} MB).
                {syncResult.added > 0 && ` Added ${syncResult.added} missing records.`}
                {syncResult.removed > 0 && ` Removed ${syncResult.removed} orphaned records.`}
                {syncResult.added === 0 && syncResult.removed === 0 && ' Database was already in sync.'}
              </p>
            ) : (
              <p className="text-sm text-app-red mt-1">{syncResult.error}</p>
            )}
          </div>
          <button 
            onClick={() => setSyncResult(null)}
            className="text-app-muted hover:text-app-text"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

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
          value={`${stats?.total_gb?.toFixed(3) || 0} GB`}
        />
        <StatCard
          icon={<CloudArrowUp size={24} />}
          iconColor="text-app-green"
          iconBg="bg-app-green/10"
          label="Available"
          value={`${stats?.remaining_gb?.toFixed(2) || 0} GB`}
        />
        <StatCard
          icon={<File size={24} />}
          iconColor="text-app-blue"
          iconBg="bg-app-blue/10"
          label="Files Stored"
          value={stats?.file_count?.toLocaleString() || '0'}
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          iconColor="text-app-cyan"
          iconBg="bg-app-cyan/10"
          label="Storage Limit"
          value={`${stats?.limit_gb || 5} GB`}
        />
      </div>

      {/* Category Breakdown & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
            <Folder size={20} className="text-app-purple" />
            Storage by Category
          </h3>
          {stats?.by_category && Object.keys(stats.by_category).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.by_category)
                .sort((a, b) => b[1].bytes - a[1].bytes)
                .map(([category, data]) => {
                  const totalBytes = stats.total_bytes || 1
                  const percentage = (data.bytes / totalBytes) * 100
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-app-text capitalize">{category.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-app-muted">
                          {formatBytes(data.bytes)} · {data.count} files
                        </span>
                      </div>
                      <div className="h-2 bg-app-card2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-app-purple/60 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-app-muted text-sm">
              <Folder size={32} className="mx-auto mb-2 opacity-50" />
              No files stored yet
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-app-card rounded-xl border border-app-border p-6">
          <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
            <User size={20} className="text-app-blue" />
            Top Users by Storage
          </h3>
          {stats?.top_users && stats.top_users.length > 0 ? (
            <div className="space-y-3">
              {stats.top_users.map((user, idx) => {
                const totalBytes = stats.total_bytes || 1
                const percentage = (user.bytes / totalBytes) * 100
                return (
                  <div key={user.user_id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-app-yellow/20 text-app-yellow' :
                      idx === 1 ? 'bg-gray-300/20 text-gray-300' :
                      idx === 2 ? 'bg-app-orange/20 text-app-orange' :
                      'bg-app-card2 text-app-muted'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-app-text truncate" title={user.user_id}>
                          {user.user_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-app-muted">
                          {formatBytes(user.bytes)} · {user.count} files
                        </span>
                      </div>
                      <div className="h-1.5 bg-app-card2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-app-blue/60 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-app-muted text-sm">
              <User size={32} className="mx-auto mb-2 opacity-50" />
              No user data available
            </div>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">About R2 Storage</p>
        <p>
          Files are stored in Cloudflare R2 for fast global delivery. Audio files, images, and other
          media are automatically uploaded here. The {stats?.limit_gb || 5}GB limit is enforced to control costs.
        </p>
      </div>
    </div>
  )
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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
