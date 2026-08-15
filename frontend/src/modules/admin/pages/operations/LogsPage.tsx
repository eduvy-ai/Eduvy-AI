// ─── System Logs Page ──────────────────────────────────
// View and filter application logs

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  FileText,
  MagnifyingGlass,
  Funnel,
  Download,
  ArrowClockwise,
  Warning,
  Info,
  Bug,
  XCircle,
  CheckCircle,
} from '@phosphor-icons/react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warning' | 'error'
  source: string
  message: string
  metadata?: Record<string, any>
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Mock data since we don't have a real logs endpoint yet
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call when backend endpoint is ready
      // const result = await adminApi.operations.getLogs({ page, pageSize, level: levelFilter, source: sourceFilter, search: searchQuery })
      
      // Mock data
      const mockLogs: LogEntry[] = [
        { id: '1', timestamp: new Date().toISOString(), level: 'info', source: 'auth', message: 'User login successful: user_123' },
        { id: '2', timestamp: new Date(Date.now() - 5000).toISOString(), level: 'warning', source: 'ai', message: 'AI rate limit approaching (80% used)' },
        { id: '3', timestamp: new Date(Date.now() - 10000).toISOString(), level: 'error', source: 'database', message: 'Connection pool exhausted, retrying...' },
        { id: '4', timestamp: new Date(Date.now() - 15000).toISOString(), level: 'info', source: 'api', message: 'Request: POST /api/quiz - 200 OK (45ms)' },
        { id: '5', timestamp: new Date(Date.now() - 20000).toISOString(), level: 'debug', source: 'cache', message: 'Cache hit for key: curriculum_list' },
        { id: '6', timestamp: new Date(Date.now() - 25000).toISOString(), level: 'info', source: 'payments', message: 'Subscription renewed: sub_456' },
        { id: '7', timestamp: new Date(Date.now() - 30000).toISOString(), level: 'error', source: 'ai', message: 'OpenAI API error: 429 Too Many Requests' },
        { id: '8', timestamp: new Date(Date.now() - 35000).toISOString(), level: 'warning', source: 'storage', message: 'Storage usage at 75%' },
        { id: '9', timestamp: new Date(Date.now() - 40000).toISOString(), level: 'info', source: 'auth', message: 'New user registered: user_789' },
        { id: '10', timestamp: new Date(Date.now() - 45000).toISOString(), level: 'debug', source: 'api', message: 'Middleware: auth check passed' },
      ]
      
      setLogs(mockLogs)
      setTotalCount(mockLogs.length)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, levelFilter, sourceFilter, searchQuery])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, loadLogs])

  const getLevelIcon = (level: LogEntry['level']) => {
    const icons = {
      debug: <Bug size={14} className="text-app-muted" />,
      info: <Info size={14} className="text-app-blue" />,
      warning: <Warning size={14} className="text-app-yellow" />,
      error: <XCircle size={14} className="text-app-red" />,
    }
    return icons[level]
  }

  const getLevelBadge = (level: LogEntry['level']) => {
    const styles = {
      debug: 'bg-app-muted/10 text-app-muted border-app-muted/25',
      info: 'bg-app-blue/10 text-app-blue border-app-blue/25',
      warning: 'bg-app-yellow/10 text-app-yellow border-app-yellow/25',
      error: 'bg-app-red/10 text-app-red border-app-red/25',
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${styles[level]}`}>
        {getLevelIcon(level)}
        {level.toUpperCase()}
      </span>
    )
  }

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
  }

  const uniqueSources = [...new Set(logs.map(l => l.source))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <FileText size={28} className="text-app-blue" />
            System Logs
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Real-time application logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              autoRefresh
                ? 'bg-app-green text-white'
                : 'bg-app-card border border-app-border text-app-muted hover:text-app-text'
            }`}
          >
            {autoRefresh ? <CheckCircle size={14} /> : <ArrowClockwise size={14} />}
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
          </button>
          <button
            onClick={() => alert('Download logs')}
            className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Sample Data Notice */}
      <div className="p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg text-sm text-app-yellow flex items-center gap-2">
        <Warning size={16} />
        Showing sample data. Backend logging endpoint not yet implemented.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Sources</option>
          {uniqueSources.map(src => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
      </div>

      {/* Log Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-app-muted">
          Errors: <span className="text-app-red font-medium">{logs.filter(l => l.level === 'error').length}</span>
        </span>
        <span className="text-app-muted">
          Warnings: <span className="text-app-yellow font-medium">{logs.filter(l => l.level === 'warning').length}</span>
        </span>
        <span className="text-app-muted">
          Info: <span className="text-app-blue font-medium">{logs.filter(l => l.level === 'info').length}</span>
        </span>
      </div>

      {/* Logs List */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <div className="bg-app-card2 border-b border-app-border px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-mono text-app-muted">
            Showing {logs.length} entries
          </span>
          {autoRefresh && (
            <span className="text-xs text-app-green flex items-center gap-1">
              <span className="w-2 h-2 bg-app-green rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="divide-y divide-app-border/50 max-h-[600px] overflow-y-auto font-mono text-sm">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <Loader size="md" />
              <p className="text-app-muted mt-3 text-sm">Loading...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-app-muted">
              No logs found
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="px-4 py-2 hover:bg-app-card2 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-app-muted text-xs shrink-0 pt-0.5">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className="shrink-0">
                    {getLevelBadge(log.level)}
                  </span>
                  <span className="text-app-purple text-xs shrink-0 pt-0.5 w-20">
                    [{log.source}]
                  </span>
                  <span className={`flex-1 ${log.level === 'error' ? 'text-app-red' : log.level === 'warning' ? 'text-app-yellow' : 'text-app-text'}`}>
                    {log.message}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[25, 50, 100, 200]}
      />

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>System logs endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default LogsPage
