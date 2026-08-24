// ─── AI Usage Page ─────────────────────────────────────────────
// Monitor AI usage, costs, and per-user consumption

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { adminApi } from '../../api'
import type { AIUsageSummary, AIUserUsage, AIQuotaOverview } from '../../types'
import { PLAN_LABELS } from '../../constants'
import { adminService } from '../../service'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  Lightning,
  Coins,
  ChartLine,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'

const UsagePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<AIUsageSummary | null>(null)
  const [userUsage, setUserUsage] = useState<AIUserUsage[]>([])
  const [quotaOverview, setQuotaOverview] = useState<AIQuotaOverview | null>(null)
  const [dateRange, setDateRange] = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Ref to track last loaded dateRange
  const lastDateRangeRef = useRef<number | null>(null)

  // Load data
  useEffect(() => {
    if (lastDateRangeRef.current === dateRange) return
    lastDateRangeRef.current = dateRange
    const load = async () => {
      setIsLoading(true)
      try {
        const [summaryData, userData] = await Promise.all([
          adminApi.aiUsage.getSummary(dateRange),
          adminApi.aiUsage.getUserUsage(dateRange),
        ])
        const quotaData = await adminApi.aiUsage.getQuotaOverview()
        console.log('UsagePage loaded data:', { summaryData, userData })
        setSummary(summaryData)
        setUserUsage(userData)
        setQuotaOverview(quotaData)
      } catch (err) {
        console.error('UsagePage load error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [dateRange])

  // Filter user usage
  const filteredUsers = useMemo(() => {
    return userUsage.filter(u => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterPlan && u.plan !== filterPlan) return false
      return true
    })
  }, [userUsage, searchQuery, filterPlan])

  // Paginated users
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterPlan])

  // Calculate estimated costs
  const estimatedCost = useMemo(() => {
    if (!summary) return 0
    // Simple estimate using average costs
    const avgInputCost = 0.50 // per 1M tokens
    const avgOutputCost = 2.00 // per 1M tokens
    const inputCost = (summary.total_prompt_tokens / 1_000_000) * avgInputCost
    const outputCost = (summary.total_completion_tokens / 1_000_000) * avgOutputCost
    return inputCost + outputCost
  }, [summary])

  // Calculate daily average
  const dailyAverage = useMemo(() => {
    if (!summary || !summary.daily_breakdown.length) return 0
    return Math.round(summary.total_calls / summary.daily_breakdown.length)
  }, [summary])

  // Get trend indicator
  const getTrend = () => {
    if (!summary || summary.daily_breakdown.length < 2) return null
    const recent = summary.daily_breakdown.slice(-3)
    const earlier = summary.daily_breakdown.slice(0, 3)
    const recentAvg = recent.reduce((a, b) => a + b.calls, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b.calls, 0) / earlier.length
    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100
    return { change, isUp: change > 0 }
  }

  const trend = getTrend()

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setFilterPlan('')
  }

  const hasFilters = searchQuery || filterPlan

  const quotaConsumption = useMemo(() => {
    const userDailyTotal = quotaOverview?.user_quota.daily_total || 0
    const userDailyRemaining = quotaOverview?.user_quota.daily_remaining || 0
    const userMonthTotal = quotaOverview?.user_quota.month_total || 0
    const userMonthRemaining = quotaOverview?.user_quota.month_remaining || 0

    const keysDailyTotal = quotaOverview?.keys_quota.daily_total_capacity || 0
    const keysDailyRemaining = quotaOverview?.keys_quota.daily_remaining || 0
    const keysMonthTotal = quotaOverview?.keys_quota.month_total_capacity || 0
    const keysMonthRemaining = quotaOverview?.keys_quota.month_remaining || 0

    const toPercent = (used: number, total: number) => {
      if (total <= 0) return 0
      return Math.min(100, Math.max(0, (used / total) * 100))
    }

    const userDailyUsed = Math.max(userDailyTotal - userDailyRemaining, 0)
    const userMonthUsed = Math.max(userMonthTotal - userMonthRemaining, 0)
    const keysDailyUsed = Math.max(keysDailyTotal - keysDailyRemaining, 0)
    const keysMonthUsed = Math.max(keysMonthTotal - keysMonthRemaining, 0)

    return {
      todayUserPct: toPercent(userDailyUsed, userDailyTotal),
      todayKeysPct: toPercent(keysDailyUsed, keysDailyTotal),
      monthUserPct: toPercent(userMonthUsed, userMonthTotal),
      monthKeysPct: toPercent(keysMonthUsed, keysMonthTotal),
    }
  }, [quotaOverview])

  // Table columns for user usage
  const columns: TableColumn<AIUserUsage>[] = [
    {
      key: 'name',
      header: 'User',
      render: (user) => (
        <div>
          <div className="font-medium text-app-text">{user.name}</div>
          <div className="text-xs text-app-muted">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      width: '100px',
      render: (user) => (
        <span className={`text-xs font-medium ${PLAN_LABELS[user.plan]?.color || 'text-app-muted'}`}>
          {PLAN_LABELS[user.plan]?.label || user.plan}
        </span>
      ),
    },
    {
      key: 'calls',
      header: 'API Calls',
      width: '100px',
      render: (user) => (
        <span className="text-app-text font-medium">
          {adminService.formatNumber(user.calls)}
        </span>
      ),
    },
    {
      key: 'prompt_tokens',
      header: 'Input Tokens',
      width: '120px',
      render: (user) => (
        <span className="text-app-muted text-sm">
          {adminService.formatNumber(user.prompt_tokens)}
        </span>
      ),
    },
    {
      key: 'completion_tokens',
      header: 'Output Tokens',
      width: '120px',
      render: (user) => (
        <span className="text-app-muted text-sm">
          {adminService.formatNumber(user.completion_tokens)}
        </span>
      ),
    },
  ]

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
          <h1 className="text-2xl font-black text-app-text">AI Usage</h1>
          <p className="text-sm text-app-muted mt-1">Monitor API calls, tokens, and costs</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-app-muted" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 text-app-muted mb-2">
            <Lightning size={16} />
            <span className="text-xs font-medium">Total Calls</span>
          </div>
          <div className="text-2xl font-black text-app-text">
            {adminService.formatNumber(summary?.total_calls || 0)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-app-muted">~{dailyAverage}/day avg</span>
            {trend && (
              <span className={`text-xs flex items-center gap-0.5 ${trend.isUp ? 'text-app-green' : 'text-app-red'}`}>
                {trend.isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {Math.abs(trend.change).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 text-app-muted mb-2">
            <ChartLine size={16} />
            <span className="text-xs font-medium">Total Tokens</span>
          </div>
          <div className="text-2xl font-black text-app-text">
            {adminService.formatNumber((summary?.total_prompt_tokens || 0) + (summary?.total_completion_tokens || 0))}
          </div>
          <div className="text-xs text-app-muted mt-1">
            {adminService.formatNumber(summary?.total_prompt_tokens || 0)} in / {adminService.formatNumber(summary?.total_completion_tokens || 0)} out
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 text-app-muted mb-2">
            <Coins size={16} />
            <span className="text-xs font-medium">Est. Cost</span>
          </div>
          <div className="text-2xl font-black text-app-green">
            ${estimatedCost.toFixed(2)}
          </div>
          <div className="text-xs text-app-muted mt-1">
            ~${(estimatedCost / dateRange).toFixed(2)}/day
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 text-app-muted mb-2">
            <Users size={16} />
            <span className="text-xs font-medium">Active Users</span>
          </div>
          <div className="text-2xl font-black text-app-text">
            {userUsage.length}
          </div>
          <div className="text-xs text-app-muted mt-1">
            with AI usage this period
          </div>
        </div>
      </div>

      {/* Usage by Plan */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <h3 className="font-bold text-app-text mb-4">Usage by Plan</h3>
        {summary?.by_plan && Object.keys(summary.by_plan).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(summary.by_plan).map(([plan, data]) => (
              <div key={plan} className="p-3 bg-app-card2 rounded-xl">
                <div className={`text-sm font-medium ${PLAN_LABELS[plan]?.color || 'text-app-text'} mb-1`}>
                  {PLAN_LABELS[plan]?.label || plan}
                </div>
                <div className="text-lg font-bold text-app-text">{adminService.formatNumber(data.calls)} calls</div>
                <div className="text-xs text-app-muted">{data.users} users</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex items-center justify-center text-app-muted text-sm">
            <div className="text-center">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>No plan usage data yet</p>
              <p className="text-xs opacity-70">Usage breakdown by plan will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Quota Overview */}
      <div className="bg-app-card rounded-xl border border-app-border p-4 space-y-4">
        <h3 className="font-bold text-app-text">Quota Overview</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3 bg-app-card2 rounded-xl border border-app-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-app-muted">Today Quota Consumed</span>
              <span className="text-xs font-semibold text-app-text">
                User {quotaConsumption.todayUserPct.toFixed(1)}% | Keys {quotaConsumption.todayKeysPct.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px] text-app-muted mb-1">
                  <span>User Quota</span>
                  <span>{quotaConsumption.todayUserPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-app-card rounded-full overflow-hidden">
                  <div className="h-full bg-app-green" style={{ width: `${quotaConsumption.todayUserPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-app-muted mb-1">
                  <span>All Keys Quota</span>
                  <span>{quotaConsumption.todayKeysPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-app-card rounded-full overflow-hidden">
                  <div className="h-full bg-app-blue" style={{ width: `${quotaConsumption.todayKeysPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-app-card2 rounded-xl border border-app-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-app-muted">Month Quota Consumed</span>
              <span className="text-xs font-semibold text-app-text">
                User {quotaConsumption.monthUserPct.toFixed(1)}% | Keys {quotaConsumption.monthKeysPct.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px] text-app-muted mb-1">
                  <span>User Quota</span>
                  <span>{quotaConsumption.monthUserPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-app-card rounded-full overflow-hidden">
                  <div className="h-full bg-app-green" style={{ width: `${quotaConsumption.monthUserPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-app-muted mb-1">
                  <span>All Keys Quota</span>
                  <span>{quotaConsumption.monthKeysPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-app-card rounded-full overflow-hidden">
                  <div className="h-full bg-app-blue" style={{ width: `${quotaConsumption.monthKeysPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">Total Users</div>
            <div className="text-xl font-black text-app-text mt-1">
              {adminService.formatNumber(quotaOverview?.users.total_users || 0)}
            </div>
            <div className="text-xs text-app-muted mt-1">in {quotaOverview?.scope === 'school' ? 'this school' : 'platform'}</div>
          </div>

          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">Today Pending Calls</div>
            <div className="text-xl font-black text-app-green mt-1">
              {adminService.formatNumber(quotaOverview?.user_quota.daily_remaining || 0)}
            </div>
            <div className="text-xs text-app-muted mt-1">
              of {adminService.formatNumber(quotaOverview?.user_quota.daily_total || 0)} total user quota
            </div>
          </div>

          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">Month Pending Calls</div>
            <div className="text-xl font-black text-app-blue mt-1">
              {adminService.formatNumber(quotaOverview?.user_quota.month_remaining || 0)}
            </div>
            <div className="text-xs text-app-muted mt-1">
              of {adminService.formatNumber(quotaOverview?.user_quota.month_total || 0)} monthly user quota
            </div>
          </div>

          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">All Keys Pending Today</div>
            <div className="text-xl font-black text-app-text mt-1">
              {adminService.formatNumber(quotaOverview?.keys_quota.daily_remaining || 0)}
            </div>
            <div className="text-xs text-app-muted mt-1">
              keys: {adminService.formatNumber(quotaOverview?.keys_quota.total_keys || 0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">Today Usage</div>
            <div className="mt-1 text-sm text-app-text">
              Calls used: {adminService.formatNumber(quotaOverview?.today.calls_used || 0)}
            </div>
            <div className="text-sm text-app-text">
              Active users: {adminService.formatNumber(quotaOverview?.today.active_users || 0)}
            </div>
            <div className="text-sm text-app-text">
              Tokens used: {adminService.formatNumber(quotaOverview?.today.tokens_used || 0)}
            </div>
          </div>

          <div className="p-3 bg-app-card2 rounded-xl">
            <div className="text-xs text-app-muted">Month Usage</div>
            <div className="mt-1 text-sm text-app-text">
              Calls used: {adminService.formatNumber(quotaOverview?.month.calls_used || 0)}
            </div>
            <div className="text-sm text-app-text">
              Active users: {adminService.formatNumber(quotaOverview?.month.active_users || 0)}
            </div>
            <div className="text-sm text-app-text">
              Tokens used: {adminService.formatNumber(quotaOverview?.month.tokens_used || 0)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-app-muted border-b border-app-border">
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Keys</th>
                <th className="py-2 pr-3">Daily Capacity</th>
                <th className="py-2 pr-3">Daily Used</th>
                <th className="py-2 pr-3">Daily Pending</th>
                <th className="py-2 pr-3">Month Capacity</th>
                <th className="py-2 pr-3">Month Pending</th>
              </tr>
            </thead>
            <tbody>
              {(quotaOverview?.keys_quota.providers || []).map((provider) => (
                <tr key={provider.provider} className="border-b border-app-border/40">
                  <td className="py-2 pr-3 font-medium text-app-text capitalize">{provider.provider}</td>
                  <td className="py-2 pr-3 text-app-muted">{adminService.formatNumber(provider.keys)}</td>
                  <td className="py-2 pr-3 text-app-text">{adminService.formatNumber(provider.daily_capacity)}</td>
                  <td className="py-2 pr-3 text-app-text">{adminService.formatNumber(provider.daily_calls_used)}</td>
                  <td className="py-2 pr-3 text-app-green">
                    {provider.daily_calls_remaining === null
                      ? 'N/A'
                      : adminService.formatNumber(provider.daily_calls_remaining)}
                  </td>
                  <td className="py-2 pr-3 text-app-text">{adminService.formatNumber(provider.month_capacity)}</td>
                  <td className="py-2 pr-3 text-app-blue">
                    {provider.month_calls_remaining === null
                      ? 'N/A'
                      : adminService.formatNumber(provider.month_calls_remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown Chart */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <h3 className="font-bold text-app-text mb-4">Daily Breakdown</h3>
        {summary?.daily_breakdown && summary.daily_breakdown.length > 0 ? (
          <div className="space-y-2">
            {/* Chart bars */}
            <div className="h-32 flex items-end gap-[2px]">
              {summary.daily_breakdown.map((day) => {
                const maxCalls = Math.max(...summary.daily_breakdown.map(d => d.calls))
                const height = maxCalls > 0 ? (day.calls / maxCalls) * 100 : 0
                
                return (
                  <div
                    key={day.date}
                    className={`flex-1 rounded-t transition-colors cursor-pointer ${
                      day.calls > 0 ? 'bg-app-green/60 hover:bg-app-green' : 'bg-app-card2 hover:bg-app-border'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${adminService.formatNumber(day.calls)} calls`}
                  />
                )
              })}
            </div>
            {/* Date labels */}
            <div className="flex justify-between text-[10px] text-app-muted">
              <span>{new Date(summary.daily_breakdown[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {summary.daily_breakdown.length > 2 && (
                <span>{new Date(summary.daily_breakdown[Math.floor(summary.daily_breakdown.length / 2)].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
              <span>{new Date(summary.daily_breakdown[summary.daily_breakdown.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            {/* Summary stats */}
            <div className="flex items-center justify-between text-xs text-app-muted pt-2 border-t border-app-border/50">
              <span>{summary.daily_breakdown.length} days shown</span>
              <span>Days with activity: {summary.daily_breakdown.filter(d => d.calls > 0).length}</span>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-app-muted text-sm">
            <div className="text-center">
              <ChartLine size={32} className="mx-auto mb-2 opacity-50" />
              <p>No usage data yet</p>
              <p className="text-xs opacity-70">AI calls will appear here when users start using the service</p>
            </div>
          </div>
        )}
      </div>

      {/* User Usage Table */}
      <div className="space-y-4">
        <h3 className="font-bold text-app-text">Per-User Usage</h3>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-app-green/50"
            />
          </div>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-10 px-3 text-app-muted hover:text-app-text flex items-center gap-1 text-sm"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        <Table
          columns={columns}
          data={paginatedUsers}
          isLoading={false}
          emptyMessage="No usage data"
          keyExtractor={(user) => user.user_id}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />
      </div>
    </div>
  )
}

export default UsagePage
