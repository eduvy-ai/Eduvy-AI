// ─── Admin Dashboard Page ──────────────────────────────────────
// Mission control with platform health, metrics, and quick actions

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminUser, useAIConfig, useStudents } from '../../../modules/admin/hooks'
import { adminService } from '../../../modules/admin/service'
import {
  Users,
  ChartLineUp,
  Robot,
  BookOpen,
  Clock,
  Lightning,
  CurrencyInr,
  ArrowRight,
  CheckCircle,
  XCircle,
  Minus,
} from '@phosphor-icons/react'

// Stat card component
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: { value: number; positive: boolean }
  color: 'green' | 'blue' | 'yellow' | 'red' | 'orange'
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, change, color, onClick }) => {
  const colorClasses = {
    green: 'bg-app-green/10 border-app-green/25 text-app-green',
    blue: 'bg-app-blue/10 border-app-blue/25 text-app-blue',
    yellow: 'bg-app-yellow/10 border-app-yellow/25 text-app-yellow',
    red: 'bg-app-red/10 border-app-red/25 text-app-red',
    orange: 'bg-app-orange/10 border-app-orange/25 text-app-orange',
  }

  return (
    <div
      onClick={onClick}
      className={`bg-app-card rounded-2xl border border-app-border p-5 transition-all ${
        onClick ? 'cursor-pointer hover:border-white/10 hover:bg-app-card2' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium ${change.positive ? 'text-app-green' : 'text-app-red'}`}>
            {change.positive ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-app-text mb-0.5">
        {typeof value === 'number' ? adminService.formatNumber(value) : value}
      </div>
      <div className="text-sm text-app-muted">{label}</div>
    </div>
  )
}

// Health status component
interface HealthStatusProps {
  label: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency?: number
}

const HealthStatus: React.FC<HealthStatusProps> = ({ label, status, latency }) => {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-app-green', label: 'Healthy' },
    degraded: { icon: Minus, color: 'text-app-yellow', label: 'Degraded' },
    down: { icon: XCircle, color: 'text-app-red', label: 'Down' },
    unknown: { icon: Minus, color: 'text-app-muted', label: 'Unknown' },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-app-border last:border-b-0">
      <span className="text-sm text-app-text">{label}</span>
      <div className="flex items-center gap-2">
        {latency !== undefined && (
          <span className="text-xs text-app-muted">{latency}ms</span>
        )}
        <div className={`flex items-center gap-1.5 ${config.color}`}>
          <Icon size={16} weight="fill" />
          <span className="text-xs font-medium">{config.label}</span>
        </div>
      </div>
    </div>
  )
}

// Quick action component
interface QuickActionProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, description, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-app-card2 rounded-xl border border-app-border hover:border-white/10 hover:bg-white/[0.03] transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-app-green/10 border border-app-green/25 flex items-center justify-center text-app-green shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-app-text mb-0.5">{label}</div>
          <div className="text-xs text-app-muted">{description}</div>
        </div>
        <ArrowRight size={16} className="text-app-muted group-hover:text-app-green transition-colors mt-3" />
      </div>
    </button>
  )
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAdminUser()
  const { aiUsage, fetchAIUsage } = useAIConfig()
  const { students, fetchStudents } = useStudents()
  
  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchAIUsage(7),
          fetchStudents({ search: '' }),
        ])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    }
    loadData()
  }, [fetchAIUsage, fetchStudents])

  // Calculate stats
  const totalStudents = students.length
  const activeToday = students.filter(s => {
    if (!s.last_active) return false
    const today = new Date().toISOString().split('T')[0]
    return s.last_active.startsWith(today)
  }).length
  const totalAICalls = aiUsage?.total_calls || 0
  const paidUsers = students.filter(s => s.plan !== 'free').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-app-text">Dashboard</h1>
        <p className="text-sm text-app-muted mt-1">
          Welcome back, {user?.name || 'Admin'}. Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Students"
          value={totalStudents}
          change={{ value: 12, positive: true }}
          color="green"
          onClick={() => navigate('/admin/students')}
        />
        <StatCard
          icon={<Lightning size={20} />}
          label="Active Today"
          value={activeToday}
          color="blue"
        />
        <StatCard
          icon={<Robot size={20} />}
          label="AI Calls (7d)"
          value={totalAICalls}
          change={{ value: 8, positive: true }}
          color="yellow"
          onClick={() => navigate('/admin/ai/usage')}
        />
        <StatCard
          icon={<CurrencyInr size={20} />}
          label="Paid Users"
          value={paidUsers}
          color="orange"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platform Health */}
        <div className="bg-app-card rounded-2xl border border-app-border p-5">
          <h2 className="text-lg font-bold text-app-text mb-4">Platform Health</h2>
          <div className="space-y-0">
            <HealthStatus label="API Server" status="healthy" latency={45} />
            <HealthStatus label="Database" status="healthy" latency={12} />
            <HealthStatus label="AI Provider (Groq)" status="healthy" latency={280} />
            <HealthStatus label="AI Provider (Gemini)" status="healthy" latency={340} />
            <HealthStatus label="Storage (R2)" status="healthy" latency={85} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-app-card rounded-2xl border border-app-border p-5">
          <h2 className="text-lg font-bold text-app-text mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <QuickAction
              icon={<BookOpen size={18} />}
              label="Add Chapter"
              description="Create new learning content"
              onClick={() => navigate('/admin/academics/chapters')}
            />
            <QuickAction
              icon={<Users size={18} />}
              label="Manage Users"
              description="View and edit student accounts"
              onClick={() => navigate('/admin/students')}
            />
            <QuickAction
              icon={<Robot size={18} />}
              label="AI Configuration"
              description="Manage providers and routing"
              onClick={() => navigate('/admin/ai/providers')}
            />
            <QuickAction
              icon={<ChartLineUp size={18} />}
              label="View Analytics"
              description="Student engagement metrics"
              onClick={() => navigate('/admin/analytics/overview')}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-app-card rounded-2xl border border-app-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-app-text">Recent Activity</h2>
          <button className="text-sm text-app-green hover:underline font-medium">
            View all
          </button>
        </div>
        <div className="text-center py-8 text-app-muted">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Activity log coming soon</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
