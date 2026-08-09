// ─── Students Analytics Page ──────────────────────────────────
// Detailed student breakdowns and leaderboards

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../../api'
import { adminService } from '../../service'
import type { StudentAnalytics } from '../../types'
import { PLAN_LABELS } from '../../constants'
import Loader from '../../../../shared/components/Loader'
import {
  Users,
  GraduationCap,
  Globe,
  Buildings,
  Trophy,
  Lightning,
  ChartBar,
  TrendUp,
} from '@phosphor-icons/react'

const StudentsAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<StudentAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'breakdown' | 'leaderboards' | 'growth'>('breakdown')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.analytics.getStudents()
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
        <Loader size="lg" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Users size={28} className="text-app-blue" />
            Student Analytics
          </h1>
          <p className="text-sm text-app-muted mt-1">
            {data.drishti_count} Drishti students enrolled
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-app-border pb-1">
        {[
          { key: 'breakdown', label: 'Breakdown', icon: <ChartBar size={16} /> },
          { key: 'leaderboards', label: 'Leaderboards', icon: <Trophy size={16} /> },
          { key: 'growth', label: 'Growth', icon: <TrendUp size={16} /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-app-green bg-app-card border border-app-border border-b-transparent -mb-[1px]'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Board */}
          <BreakdownCard
            title="By Board"
            icon={<GraduationCap size={20} />}
            data={data.by_board}
          />
          
          {/* By Standard */}
          <BreakdownCard
            title="By Standard"
            icon={<GraduationCap size={20} />}
            data={data.by_standard}
          />
          
          {/* By Language */}
          <BreakdownCard
            title="By Medium"
            icon={<Globe size={20} />}
            data={data.by_language}
          />
          
          {/* By School */}
          <div className="bg-app-card rounded-xl border border-app-border p-6">
            <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
              <Buildings size={20} className="text-app-cyan" />
              Top Schools
            </h3>
            {data.by_school.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.by_school.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-app-text truncate flex-1 mr-4">
                      {item.school || 'Not specified'}
                    </span>
                    <span className="text-sm font-medium text-app-muted">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-app-muted">No school data available</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top by XP */}
          <LeaderboardCard
            title="Top by XP"
            icon={<Trophy size={20} />}
            iconColor="text-app-yellow"
            data={data.top_by_xp}
            valueKey="xp"
            valueLabel="XP"
          />
          
          {/* Top by Streak */}
          <LeaderboardCard
            title="Top by Streak"
            icon={<Lightning size={20} />}
            iconColor="text-app-orange"
            data={data.top_by_streak}
            valueKey="streak"
            valueLabel="days"
          />
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Signups Chart */}
          <ChartCard
            title="Daily Signups (30 days)"
            icon={<TrendUp size={20} />}
            iconColor="text-app-green"
            data={data.growth_chart}
          />
          
          {/* Activity Chart */}
          <ChartCard
            title="Daily Active Users (30 days)"
            icon={<TrendUp size={20} />}
            iconColor="text-app-blue"
            data={data.activity_chart}
          />
        </div>
      )}
    </div>
  )
}

// Breakdown Card Component
interface BreakdownCardProps {
  title: string
  icon: React.ReactNode
  data: Record<string, number>
}

const BreakdownCard: React.FC<BreakdownCardProps> = ({ title, icon, data }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  
  return (
    <div className="bg-app-card rounded-xl border border-app-border p-6">
      <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
        <span className="text-app-purple">{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">
        {entries.slice(0, 8).map(([key, count]) => {
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-app-text">{key || 'Unknown'}</span>
                <span className="text-sm text-app-muted">
                  {adminService.formatNumber(count)} ({percentage}%)
                </span>
              </div>
              <div className="h-1.5 bg-app-card2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-app-purple/60 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
        {entries.length > 8 && (
          <p className="text-xs text-app-muted text-center pt-2">
            +{entries.length - 8} more
          </p>
        )}
      </div>
    </div>
  )
}

// Leaderboard Card Component
interface LeaderboardCardProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  data: { id: string; name: string; xp: number; streak: number; plan: string; standard: string; board: string }[]
  valueKey: 'xp' | 'streak'
  valueLabel: string
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, icon, iconColor, data, valueKey, valueLabel }) => (
  <div className="bg-app-card rounded-xl border border-app-border p-6">
    <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
      <span className={iconColor}>{icon}</span>
      {title}
    </h3>
    <div className="space-y-3">
      {data.map((user, idx) => {
        const config = PLAN_LABELS[user.plan] || PLAN_LABELS.free
        return (
          <div key={user.id} className="flex items-center gap-3 p-2 bg-app-card2 rounded-lg">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              idx === 0 ? 'bg-app-yellow/20 text-app-yellow' :
              idx === 1 ? 'bg-gray-300/20 text-gray-300' :
              idx === 2 ? 'bg-app-orange/20 text-app-orange' :
              'bg-app-card text-app-muted'
            }`}>
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-app-text truncate">
                  {user.name}
                </span>
                <span className={`text-xs ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <span className="text-xs text-app-muted">
                {user.standard} • {user.board}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${iconColor}`}>
                {adminService.formatNumber(user[valueKey])}
              </span>
              <span className="text-xs text-app-muted ml-1">{valueLabel}</span>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

// Simple Chart Card Component
interface ChartCardProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  data: { date: string; count: number }[]
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, iconColor, data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const avg = data.length > 0 ? Math.round(total / data.length) : 0
  
  return (
    <div className="bg-app-card rounded-xl border border-app-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          {title}
        </h3>
        <div className="text-right">
          <p className="text-xs text-app-muted">Average</p>
          <p className={`text-lg font-bold ${iconColor}`}>{avg}/day</p>
        </div>
      </div>
      
      {data.length > 0 ? (
        <div className="flex items-end gap-1 h-32">
          {data.map((item, idx) => (
            <div
              key={idx}
              className="flex-1 group relative"
              title={`${item.date}: ${item.count}`}
            >
              <div 
                className={`w-full ${iconColor.replace('text-', 'bg-')}/60 rounded-t hover:opacity-80 transition-opacity`}
                style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: '2px' }}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-app-bg border border-app-border rounded px-2 py-1 text-xs whitespace-nowrap">
                  <p className="text-app-text font-medium">{item.count}</p>
                  <p className="text-app-muted">{item.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-app-muted text-sm">
          No data available
        </div>
      )}
    </div>
  )
}

export default StudentsAnalyticsPage
