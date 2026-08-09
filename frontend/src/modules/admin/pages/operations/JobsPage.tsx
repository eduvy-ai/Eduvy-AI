// ─── Background Jobs Page ──────────────────────────────────
// Monitor and manage background tasks

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  Lightning,
  Clock,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Play,
  Pause,
  Trash,
  MagnifyingGlass,
  Funnel,
  Warning,
} from '@phosphor-icons/react'

interface Job {
  id: string
  name: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  created_at: string
  started_at?: string
  completed_at?: string
  error?: string
  metadata?: Record<string, any>
}

interface JobStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
}

const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<JobStats>({ total: 0, pending: 0, running: 0, completed: 0, failed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  // Mock data since we don't have a real jobs endpoint yet
  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call when backend endpoint is ready
      // const result = await adminApi.operations.getJobs({ page, pageSize, status: statusFilter, search: searchQuery })
      
      // Mock data for now
      const mockJobs: Job[] = [
        { id: '1', name: 'Email Digest', type: 'scheduled', status: 'completed', created_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        { id: '2', name: 'AI Model Warmup', type: 'system', status: 'running', progress: 67, created_at: new Date().toISOString(), started_at: new Date().toISOString() },
        { id: '3', name: 'Database Backup', type: 'scheduled', status: 'pending', created_at: new Date().toISOString() },
        { id: '4', name: 'Cache Cleanup', type: 'maintenance', status: 'completed', created_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        { id: '5', name: 'Analytics Aggregation', type: 'scheduled', status: 'failed', error: 'Connection timeout', created_at: new Date().toISOString() },
      ]
      
      setJobs(mockJobs)
      setTotalCount(mockJobs.length)
      setStats({
        total: 5,
        pending: 1,
        running: 1,
        completed: 2,
        failed: 1,
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, statusFilter, searchQuery])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(jobs.map(j => j.id)))
    }
  }

  const getStatusBadge = (status: Job['status']) => {
    const styles = {
      pending: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
      running: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      completed: 'bg-app-green/10 text-app-green border-app-green/25',
      failed: 'bg-app-red/10 text-app-red border-app-red/25',
      cancelled: 'bg-app-muted/10 text-app-muted border-app-muted/25',
    }
    const icons = {
      pending: <Clock size={12} />,
      running: <ArrowClockwise size={12} className="animate-spin" />,
      completed: <CheckCircle size={12} />,
      failed: <XCircle size={12} />,
      cancelled: <Pause size={12} />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Lightning size={28} className="text-app-yellow" />
            Background Jobs
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Monitor and manage scheduled tasks
          </p>
        </div>
        <button
          onClick={loadJobs}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
        >
          <ArrowClockwise size={14} />
          Refresh
        </button>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Backend job queue not yet implemented.
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="text-xs text-app-muted">Total Jobs</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{stats.pending}</p>
          <p className="text-xs text-app-muted">Pending</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.running}</p>
          <p className="text-xs text-app-muted">Running</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.completed}</p>
          <p className="text-xs text-app-muted">Completed</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-red">{stats.failed}</p>
          <p className="text-xs text-app-muted">Failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => alert('Cancel selected jobs')}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Cancel {selectedIds.size}
          </button>
        )}
      </div>

      {/* Jobs Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border text-left">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={jobs.length > 0 && selectedIds.size === jobs.length}
                  onChange={toggleSelectAll}
                  className="rounded border-app-border"
                />
              </th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Job</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Type</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Status</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Progress</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Created</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <div className="flex justify-center">
                    <Loader size="md" />
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-app-muted">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="border-b border-app-border/50 hover:bg-app-card2 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      className="rounded border-app-border"
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-app-text">{job.name}</p>
                      {job.error && (
                        <p className="text-xs text-app-red flex items-center gap-1 mt-1">
                          <Warning size={12} />
                          {job.error}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted capitalize">{job.type}</span>
                  </td>
                  <td className="p-3">{getStatusBadge(job.status)}</td>
                  <td className="p-3">
                    {job.status === 'running' && job.progress !== undefined ? (
                      <div className="w-20">
                        <div className="h-1.5 bg-app-card2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-app-blue rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-app-muted mt-1">{job.progress}%</p>
                      </div>
                    ) : (
                      <span className="text-sm text-app-muted">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted">{formatDate(job.created_at)}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {job.status === 'pending' && (
                        <button
                          onClick={() => alert('Start job')}
                          className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                          title="Start"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {job.status === 'running' && (
                        <button
                          onClick={() => alert('Pause job')}
                          className="p-1.5 text-app-yellow hover:bg-app-yellow/10 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause size={14} />
                        </button>
                      )}
                      {job.status === 'failed' && (
                        <button
                          onClick={() => alert('Retry job')}
                          className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                          title="Retry"
                        >
                          <ArrowClockwise size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => alert('Delete job')}
                        className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
        <p>Background jobs endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default JobsPage
