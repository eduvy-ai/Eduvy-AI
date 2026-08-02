// ─── Analytics Overview Page ──────────────────────────────────
// Main analytics dashboard with key metrics

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../../api'
import { adminService } from '../../service'
import type { AnalyticsOverview } from '../../types'
import { PLAN_LABELS } from '../../constants'
import {
  Users,
  UserPlus,
  Lightning,
  ChartLineUp,
  Brain,
  Crown,
  Trophy,
  CalendarCheck,
  Heartbeat,
  TrendUp,
  Sparkle,
} from '@phosphor-icons/react'

const OverviewPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.analytics.getOverview()
      setData(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-app-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-app-red/10 border border-app-red/25 rounded-xl text-app-red">
        {error}
      </div>
    )
  }

  if (!data) return null

  // Calculate percentages for plan distribution
  const totalByPlan = Object.values(data.by_plan).reduce((a, b) => a + b, 0)
  const planPercentages = Object.entries(data.by_plan).map(([plan, count]) => ({
    plan,
    count,
    percentage: totalByPlan > 0 ? Math.round((count / totalByPlan) * 100) : 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ChartLineUp size={28} className="text-app-green" />
            Analytics Overview
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Platform performance at a glance
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users size={24} />}
          iconColor="text-app-blue"
          iconBg="bg-app-blue/10"
          label="Total Users"
          value={adminService.formatNumber(data.total_users)}
        />
        <MetricCard
          icon={<Heartbeat size={24} />}
          iconColor="text-app-green"
          iconBg="bg-app-green/10"
          label="Active Today"
          value={adminService.formatNumber(data.active_today)}
          subtext={`${data.active_7d} this week`}
        />
        <MetricCard
          icon={<UserPlus size={24} />}
          iconColor="text-app-cyan"
          iconBg="bg-app-cyan/10"
          label="Signups Today"
          value={adminService.formatNumber(data.signups_today)}
          subtext={`${data.signups_7d} this week`}
        />
        <MetricCard
          icon={<Crown size={24} />}
          iconColor="text-app-yellow"
          iconBg="bg-app-yellow/10"
          label="Paid Subscribers"
          value={adminService.formatNumber(data.paid_subscriptions)}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Brain size={24} />}
          iconColor="text-app-purple"
          iconBg="bg-app-purple/10"
          label="AI Calls Today"
          value={adminService.formatNumber(data.ai_calls_today)}
          subtext={`${adminService.formatNumber(data.ai_calls_7d)} this week`}
        />
        <MetricCard
          icon={<Lightning size={24} />}
          iconColor="text-app-orange"
          iconBg="bg-app-orange/10"
          label="Avg Streak"
          value={`${data.avg_streak} days`}
        />
        <MetricCard
          icon={<Trophy size={24} />}
          iconColor="text-app-yellow"
          iconBg="bg-app-yellow/10"
          label="Total XP Earned"
          value={adminService.formatNumber(data.total_xp)}
        />
        <MetricCard
          icon={<CalendarCheck size={24} />}
          iconColor="text-app-green"
          iconBg="bg-app-green/10"
          label="Active (30d)"
          value={adminService.formatNumber(data.active_30d)}
          subtext={`${Math.round((data.active_30d / data.total_users) * 100)}% retention`}
        />
      </div>

      {/* Plan Distribution */}
      <div className="bg-app-card rounded-xl border border-app-border p-6">
        <h2 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
          <Sparkle size={20} className="text-app-purple" />
          User Distribution by Plan
        </h2>
        <div className="space-y-4">
          {planPercentages.map(({ plan, count, percentage }) => {
            const config = PLAN_LABELS[plan] || { label: plan, color: 'text-app-muted' }
            const barColor = plan === 'free' ? 'bg-gray-500' : 
                            plan === 'basic' ? 'bg-app-blue' :
                            plan === 'pro' ? 'bg-app-purple' : 'bg-app-yellow'
            return (
              <div key={plan}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-sm text-app-muted">
                    {adminService.formatNumber(count)} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-app-card2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink
          to="/admin/analytics/students"
          icon={<Users size={24} />}
          label="Student Analytics"
          description="Breakdown by board, standard, school"
          color="text-app-blue"
        />
        <QuickLink
          to="/admin/analytics/revenue"
          icon={<TrendUp size={24} />}
          label="Revenue Analytics"
          description="Subscriptions and MRR"
          color="text-app-green"
        />
        <QuickLink
          to="/admin/ai/usage"
          icon={<Brain size={24} />}
          label="AI Usage"
          description="Calls, tokens, and costs"
          color="text-app-purple"
        />
      </div>
    </div>
  )
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string
  subtext?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, iconColor, iconBg, label, value, subtext }) => (
  <div className="bg-app-card rounded-xl border border-app-border p-4">
    <div className="flex items-start justify-between">
      <div className={`p-2 ${iconBg} rounded-lg ${iconColor}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-app-text mt-3">{value}</p>
    <p className="text-xs text-app-muted">{label}</p>
    {subtext && (
      <p className="text-xs text-app-muted/70 mt-1">{subtext}</p>
    )}
  </div>
)

// Quick Link Component
interface QuickLinkProps {
  to: string
  icon: React.ReactNode
  label: string
  description: string
  color: string
}

const QuickLink: React.FC<QuickLinkProps> = ({ to, icon, label, description, color }) => (
  <a
    href={to}
    className="bg-app-card rounded-xl border border-app-border p-4 hover:border-app-green/50 transition-colors group"
  >
    <div className={`${color} mb-3 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="font-bold text-app-text group-hover:text-app-green transition-colors">
      {label}
    </h3>
    <p className="text-xs text-app-muted mt-1">{description}</p>
  </a>
)

export default OverviewPage
