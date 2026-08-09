// ─── AI Costs Page ─────────────────────────────────────────────
// Track AI costs, budgets, and cost optimization insights

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { adminApi } from '../../api'
import type { AIUsageSummary, AIUserUsage } from '../../types'
import { PLAN_LABELS } from '../../constants'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  Coins,
  ChartLine,
  ChartPie,
  Users,
  Calendar,
  Lightning,
  Warning,
  TrendUp,
  TrendDown,
  CurrencyDollar,
  Wallet,
  Receipt,
} from '@phosphor-icons/react'

// Cost per 1M tokens by provider/model (estimated)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  // Google
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // Anthropic
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  // Groq (subsidized/free tier)
  'llama-3.1-70b-versatile': { input: 0.05, output: 0.08 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.05, output: 0.05 },
}

// Default fallback cost
const DEFAULT_COST = { input: 0.50, output: 2.00 }

interface DailyCost {
  date: string
  cost: number
  inputCost: number
  outputCost: number
}

interface PlanCost {
  plan: string
  cost: number
  calls: number
  users: number
  avgCostPerUser: number
}

const CostsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<AIUsageSummary | null>(null)
  const [userUsage, setUserUsage] = useState<AIUserUsage[]>([])
  const [dateRange, setDateRange] = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  
  // Budget settings (mock - would come from admin settings)
  const [monthlyBudget, setMonthlyBudget] = useState(100)
  
  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 10
  
  // Ref to prevent duplicate fetches
  const lastDateRangeRef = useRef<number | null>(null)

  // Load data
  const loadData = useCallback(async () => {
    if (lastDateRangeRef.current === dateRange) return
    lastDateRangeRef.current = dateRange
    
    setIsLoading(true)
    try {
      const [summaryData, userData] = await Promise.all([
        adminApi.aiUsage.getSummary(dateRange),
        adminApi.aiUsage.getUserUsage(dateRange),
      ])
      setSummary(summaryData)
      setUserUsage(userData)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate total cost from summary
  const totalCost = useMemo(() => {
    if (!summary) return 0
    const cost = DEFAULT_COST
    const inputCost = (summary.total_prompt_tokens / 1_000_000) * cost.input
    const outputCost = (summary.total_completion_tokens / 1_000_000) * cost.output
    return inputCost + outputCost
  }, [summary])

  // Calculate daily costs
  const dailyCosts = useMemo((): DailyCost[] => {
    if (!summary?.daily_breakdown) return []
    return summary.daily_breakdown.map(day => {
      const cost = DEFAULT_COST
      const inputCost = (day.prompt_tokens / 1_000_000) * cost.input
      const outputCost = (day.completion_tokens / 1_000_000) * cost.output
      return {
        date: day.date,
        cost: inputCost + outputCost,
        inputCost,
        outputCost,
      }
    })
  }, [summary])

  // Calculate costs by plan
  const planCosts = useMemo((): PlanCost[] => {
    if (!summary?.by_plan) return []
    const avgCostPerCall = summary.total_calls > 0 ? totalCost / summary.total_calls : 0
    
    return Object.entries(summary.by_plan).map(([plan, data]) => {
      const planCost = data.calls * avgCostPerCall
      return {
        plan,
        cost: planCost,
        calls: data.calls,
        users: data.users,
        avgCostPerUser: data.users > 0 ? planCost / data.users : 0,
      }
    }).sort((a, b) => b.cost - a.cost)
  }, [summary, totalCost])

  // Calculate user costs
  const userCosts = useMemo(() => {
    const avgCostPerCall = summary && summary.total_calls > 0 
      ? totalCost / summary.total_calls 
      : 0
    
    return userUsage.map(user => ({
      ...user,
      estimatedCost: user.calls * avgCostPerCall,
      tokenCost: (user.prompt_tokens / 1_000_000) * DEFAULT_COST.input + 
                 (user.completion_tokens / 1_000_000) * DEFAULT_COST.output,
    }))
  }, [userUsage, summary, totalCost])

  // Filter users
  const filteredUsers = useMemo(() => {
    return userCosts.filter(u => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterPlan && u.plan !== filterPlan) return false
      return true
    }).sort((a, b) => b.tokenCost - a.tokenCost)
  }, [userCosts, searchQuery, filterPlan])

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, page, pageSize])

  // Calculate projected monthly cost
  const projectedMonthlyCost = useMemo(() => {
    if (!dailyCosts.length) return 0
    const avgDailyCost = dailyCosts.reduce((sum, d) => sum + d.cost, 0) / dailyCosts.length
    return avgDailyCost * 30
  }, [dailyCosts])

  // Budget status
  const budgetStatus = useMemo(() => {
    const used = projectedMonthlyCost
    const percent = (used / monthlyBudget) * 100
    if (percent >= 100) return { status: 'over', color: 'text-app-red' }
    if (percent >= 80) return { status: 'warning', color: 'text-app-yellow' }
    return { status: 'good', color: 'text-app-green' }
  }, [projectedMonthlyCost, monthlyBudget])

  // Cost trend
  const costTrend = useMemo(() => {
    if (dailyCosts.length < 4) return null
    const recent = dailyCosts.slice(-3)
    const earlier = dailyCosts.slice(0, 3)
    const recentAvg = recent.reduce((sum, d) => sum + d.cost, 0) / recent.length
    const earlierAvg = earlier.reduce((sum, d) => sum + d.cost, 0) / earlier.length
    if (earlierAvg === 0) return null
    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100
    return { change: Math.abs(change), isUp: change > 0 }
  }, [dailyCosts])

  // Format currency
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatCostRounded = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`
    return `$${cost.toFixed(2)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Coins size={28} className="text-app-yellow" />
            AI Costs
          </h1>
          <p className="text-sm text-app-muted mt-1">Track spending and optimize AI usage</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Wallet size={16} className="text-app-muted" />
            <span className="text-app-muted">Budget:</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-app-card2 border border-white/10 rounded text-app-text text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
            />
            <span className="text-app-muted">/mo</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-app-muted" />
            <select
              value={dateRange}
              onChange={(e) => {
                lastDateRangeRef.current = null
                setDateRange(parseInt(e.target.value))
              }}
              className="h-9 px-3 bg-app-card2 border border-white/10 rounded-lg text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cost Estimation Notice */}
      <div className="p-3 bg-app-blue/10 border border-app-blue/25 rounded-lg text-sm text-app-blue flex items-center gap-2">
        <Warning size={16} />
        Costs are estimated based on average token pricing. Actual costs may vary by provider and model.
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center justify-between mb-2">
            <CurrencyDollar size={20} className="text-app-yellow" />
            {costTrend && (
              <span className={`flex items-center text-xs ${costTrend.isUp ? 'text-app-red' : 'text-app-green'}`}>
                {costTrend.isUp ? <TrendUp size={12} /> : <TrendDown size={12} />}
                {costTrend.change.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-app-text">{formatCostRounded(totalCost)}</p>
          <p className="text-xs text-app-muted">Total ({dateRange} days)</p>
        </div>

        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={20} className="text-app-purple" />
          </div>
          <p className="text-2xl font-bold text-app-text">
            {formatCostRounded(totalCost / (dateRange || 1))}
          </p>
          <p className="text-xs text-app-muted">Daily Average</p>
        </div>

        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ChartLine size={20} className="text-app-blue" />
          </div>
          <p className={`text-2xl font-bold ${budgetStatus.color}`}>
            {formatCostRounded(projectedMonthlyCost)}
          </p>
          <p className="text-xs text-app-muted">Projected Monthly</p>
        </div>

        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={20} className={budgetStatus.color} />
          </div>
          <p className={`text-2xl font-bold ${budgetStatus.color}`}>
            {((projectedMonthlyCost / monthlyBudget) * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-app-muted">
            of ${monthlyBudget} budget
          </p>
        </div>
      </div>

      {/* Cost Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Costs */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
            <ChartLine size={18} />
            Daily Costs
          </h3>
          {dailyCosts.length > 0 ? (
            <div className="space-y-2">
              {dailyCosts.slice(-7).map((day) => {
                const maxCost = Math.max(...dailyCosts.map(d => d.cost), 0.01)
                const width = (day.cost / maxCost) * 100
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-app-muted w-20">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 h-6 bg-app-card2 rounded overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-app-green/60 to-app-green flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      >
                        <span className="text-[10px] font-medium text-white/90">
                          {formatCost(day.cost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-app-muted text-sm">
              <div className="text-center">
                <Coins size={32} className="mx-auto mb-2 opacity-50" />
                <p>No cost data yet</p>
                <p className="text-xs opacity-70">Costs will appear when AI calls are made</p>
              </div>
            </div>
          )}
        </div>

        {/* Costs by Plan */}
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
            <ChartPie size={18} />
            Costs by Plan
          </h3>
          {planCosts.length > 0 ? (
            <div className="space-y-3">
              {planCosts.map(planCost => {
                const maxCost = Math.max(...planCosts.map(p => p.cost), 0.01)
                const width = (planCost.cost / maxCost) * 100
                const label = PLAN_LABELS[planCost.plan]
                
                return (
                  <div key={planCost.plan}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={label?.color || 'text-app-text'}>
                        {label?.label || planCost.plan}
                      </span>
                      <span className="text-app-text font-medium">
                        {formatCostRounded(planCost.cost)}
                      </span>
                    </div>
                    <div className="h-3 bg-app-card2 rounded overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-app-purple/60 to-app-purple"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-app-muted mt-0.5">
                      <span>{planCost.users} users · {planCost.calls.toLocaleString()} calls</span>
                      <span>${planCost.avgCostPerUser.toFixed(4)}/user</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-app-muted text-sm">
              <div className="text-center">
                <ChartPie size={32} className="mx-auto mb-2 opacity-50" />
                <p>No plan data yet</p>
                <p className="text-xs opacity-70">Usage by plan will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Spenders */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-app-text flex items-center gap-2">
            <Users size={18} />
            Top Spenders
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-app-card2 border border-white/10 rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:ring-1 focus:ring-app-green/50 w-48"
            />
            <select
              value={filterPlan}
              onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
              className="px-3 py-1.5 bg-app-card2 border border-white/10 rounded-lg text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-app-green/50"
            >
              <option value="">All Plans</option>
              {Object.entries(PLAN_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border">
                <th className="text-left py-2 px-3 text-app-muted font-medium">User</th>
                <th className="text-left py-2 px-3 text-app-muted font-medium">Plan</th>
                <th className="text-right py-2 px-3 text-app-muted font-medium">API Calls</th>
                <th className="text-right py-2 px-3 text-app-muted font-medium">Tokens</th>
                <th className="text-right py-2 px-3 text-app-muted font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-app-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const label = PLAN_LABELS[user.plan]
                  return (
                    <tr key={user.user_id} className="border-b border-app-border/50 hover:bg-app-card2/50">
                      <td className="py-2 px-3">
                        <div>
                          <div className="font-medium text-app-text">{user.name}</div>
                          <div className="text-xs text-app-muted">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-medium ${label?.color || 'text-app-muted'}`}>
                          {label?.label || user.plan}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-app-text">
                        {user.calls.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-app-muted">
                        {((user.prompt_tokens + user.completion_tokens) / 1000).toFixed(1)}k
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-medium text-app-yellow">
                          {formatCostRounded(user.tokenCost)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > pageSize && (
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredUsers.length / pageSize)}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* Model Pricing Reference */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <h3 className="font-bold text-app-text mb-4 flex items-center gap-2">
          <Lightning size={18} className="text-app-yellow" />
          Model Pricing Reference (per 1M tokens)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(MODEL_COSTS).map(([model, costs]) => (
            <div key={model} className="flex items-center justify-between p-2 bg-app-card2 rounded-lg">
              <span className="text-sm font-mono text-app-text">{model}</span>
              <div className="text-xs text-app-muted">
                <span className="text-app-green">${costs.input}</span>
                <span className="mx-1">/</span>
                <span className="text-app-purple">${costs.output}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-app-muted mt-3">
          Green = Input tokens, Purple = Output tokens. Prices are estimates and may change.
        </p>
      </div>
    </div>
  )
}

export default CostsPage
