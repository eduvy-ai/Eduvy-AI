// ─── Admin Dashboard Page ──────────────────────────────────────
// Mission control with platform health, metrics, and quick actions

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminUser, useAdminAuth, useAIConfig, useStudents } from '../../../modules/admin/hooks'
import { adminService } from '../../../modules/admin/service'
import { curriculumApi } from '../../../modules/admin/api'
import axiosInstance from '../../../services/axios'
import { ADMIN_TOKEN_KEY } from '../../../modules/admin/constants'
import {
  Users,
  ChartLineUp,
  Robot,
  BookOpen,
  Buildings,
  Clock,
  Lightning,
  CurrencyInr,
  ArrowRight,
  Check,
  CheckCircle,
  XCircle,
  Minus,
  Download,
  Spinner,
  Warning,
} from '@phosphor-icons/react'
import Modal from '../../../shared/components/Modal'

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

interface AIDailyChartProps {
  data: {
    date: string
    calls: number
  }[]
}

const AIDailyChart: React.FC<AIDailyChartProps> = ({ data }) => {
  const maxCalls = Math.max(...data.map((item) => item.calls), 1)

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const label = new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short' })
        const widthPct = Math.max(8, Math.round((item.calls / maxCalls) * 100))

        return (
          <div key={item.date} className="flex items-center gap-3">
            <div className="w-10 text-xs text-app-muted">{label}</div>
            <div className="flex-1 h-2.5 rounded-full bg-app-card2 overflow-hidden">
              <div className="h-full rounded-full bg-app-green/80" style={{ width: `${widthPct}%` }} />
            </div>
            <div className="w-10 text-right text-xs text-app-text font-medium">{item.calls}</div>
          </div>
        )
      })}
    </div>
  )
}

const adminConfig = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const user = useAdminUser()
  const { initialize } = useAdminAuth()
  const { aiUsage, fetchAIUsage } = useAIConfig()
  const { students, studentsTotal, fetchStudents } = useStudents()
  
  // Import state (for school admins)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [totalSchools, setTotalSchools] = useState(0)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  
  // Refs to prevent duplicate fetches
  const dataLoadedRef = useRef(false)
  const fetchAIUsageRef = useRef(fetchAIUsage)
  const fetchStudentsRef = useRef(fetchStudents)
  
  fetchAIUsageRef.current = fetchAIUsage
  fetchStudentsRef.current = fetchStudents
  
  // Check if school admin
  const isSchoolAdmin = user?.school_id != null
  const isSuperAdmin = user?.school_id == null
  const curriculumImported = user?.curriculum_imported === true
  
  // Handle import global curriculum
  const handleImportGlobal = async () => {
    setShowImportConfirm(false)
    
    setIsImporting(true)
    setImportResult(null)
    
    try {
      const result = await curriculumApi.importGlobal()
      const { imported } = result
      const total = imported.boards + imported.standards + imported.mediums + imported.subjects + imported.curriculum + imported.chapters
      setImportResult({
        success: true,
        message: `Successfully imported ${total} items (${imported.boards} boards, ${imported.standards} standards, ${imported.mediums} mediums, ${imported.subjects} subjects, ${imported.chapters} chapters)`
      })
      initialize()
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to import curriculum'
      })
    } finally {
      setIsImporting(false)
    }
  }
  
  // Load dashboard data once
  useEffect(() => {
    if (dataLoadedRef.current) return
    dataLoadedRef.current = true
    
    const loadData = async () => {
      try {
        const jobs: Array<Promise<unknown>> = [
          fetchAIUsageRef.current(7),
          fetchStudentsRef.current({ search: '' }),
        ]

        if (isSuperAdmin) {
          jobs.push(
            axiosInstance.get('/api/schools?limit=500', adminConfig()).then((response) => {
              const count = typeof response.data?.total === 'number'
                ? response.data.total
                : Array.isArray(response.data?.schools)
                  ? response.data.schools.length
                  : 0
              setTotalSchools(count)
            })
          )
        }

        await Promise.all(jobs)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    }
    loadData()
  }, [isSuperAdmin])

  // Calculate stats
  const totalStudents = studentsTotal || students.length
  const activeToday = students.filter(s => {
    if (!s.last_active) return false
    const today = new Date().toISOString().split('T')[0]
    return s.last_active.startsWith(today)
  }).length
  const totalAICalls = aiUsage?.total_calls || 0
  const paidUsers = students.filter(s => s.plan !== 'free').length
  const aiChartData = aiUsage?.daily_breakdown?.slice(-7).map((entry) => ({
    date: entry.date,
    calls: entry.calls,
  })) || []
  const avgDailyAICalls = aiChartData.length > 0
    ? Math.round(totalAICalls / aiChartData.length)
    : 0

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
        {isSuperAdmin ? (
          <StatCard
            icon={<ChartLineUp size={20} />}
            label="Daily AI Avg"
            value={avgDailyAICalls}
            color="green"
            onClick={() => navigate('/admin/ai/usage')}
          />
        ) : (
          <StatCard
            icon={<Users size={20} />}
            label="Total Students"
            value={totalStudents}
            color="green"
            onClick={() => navigate('/admin/students')}
          />
        )}
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

      {isSuperAdmin ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-app-card rounded-2xl border border-app-border p-5">
            <h2 className="text-lg font-bold text-app-text mb-4">Platform Snapshot</h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-app-border bg-app-card2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-app-muted mb-1">Total Schools</div>
                    <div className="text-2xl font-black text-app-text">{adminService.formatNumber(totalSchools)}</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-app-blue/10 border border-app-blue/25 text-app-blue flex items-center justify-center">
                    <Buildings size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-card2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-app-muted mb-1">Total Users</div>
                    <div className="text-2xl font-black text-app-text">{adminService.formatNumber(totalStudents)}</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-app-green/10 border border-app-green/25 text-app-green flex items-center justify-center">
                    <Users size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-app-card rounded-2xl border border-app-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-app-text">AI Usage Trend (7 Days)</h2>
              <button
                onClick={() => navigate('/admin/ai/usage')}
                className="text-sm text-app-green hover:underline font-medium"
              >
                Open details
              </button>
            </div>

            {aiChartData.length > 0 ? (
              <AIDailyChart data={aiChartData} />
            ) : (
              <div className="text-center py-10 text-app-muted">
                <Robot size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No AI usage data found for this period</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
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

          <div className="lg:col-span-2 bg-app-card rounded-2xl border border-app-border p-5">
            <h2 className="text-lg font-bold text-app-text mb-4">Quick Actions</h2>

            {isSchoolAdmin && !curriculumImported && (
              <div className="mb-4 p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-app-blue/20 border border-app-blue/30 flex items-center justify-center text-app-blue shrink-0">
                    <Download size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-app-text mb-1">Import Standard Curriculum</h3>
                    <p className="text-xs text-app-muted mb-3">
                      Import boards, standards, mediums, subjects, and chapters from Eduvy's standard curriculum.
                    </p>
                    {importResult && (
                      <div className={`text-xs mb-3 p-2 rounded-lg ${importResult.success ? 'bg-app-green/10 text-app-green' : 'bg-app-red/10 text-app-red'}`}>
                        {importResult.message}
                      </div>
                    )}
                    <button
                      onClick={() => setShowImportConfirm(true)}
                      disabled={isImporting}
                      className="px-4 py-2 bg-app-blue text-white text-sm font-semibold rounded-lg hover:bg-app-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <Spinner size={16} className="animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Import Curriculum
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isSchoolAdmin && curriculumImported && (
              <div className="mb-4 p-3 bg-app-green/10 border border-app-green/25 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-app-green/20 border border-app-green/30 flex items-center justify-center text-app-green shrink-0">
                    <Check size={16} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-app-green">Standard Curriculum Imported</h3>
                    <p className="text-xs text-app-muted">Boards, standards, subjects, and chapters are ready</p>
                  </div>
                </div>
              </div>
            )}

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
      )}

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

      {/* Import Curriculum Confirmation Modal */}
      <Modal
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        title="Import Standard Curriculum"
        size="sm"
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-app-blue/20 border border-app-blue/30 flex items-center justify-center text-app-blue shrink-0">
              <Download size={20} />
            </div>
            <div>
              <p className="text-sm text-app-text mb-2">
                This will import Eduvy's standard curriculum to your school:
              </p>
              <ul className="text-xs text-app-muted space-y-1 list-disc list-inside">
                <li>Education Boards (CBSE, ICSE, State Boards, etc.)</li>
                <li>Standards (Class 1-12)</li>
                <li>Mediums (English, Hindi, Marathi, etc.)</li>
                <li>Subjects & Chapters</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-app-yellow/10 border border-app-yellow/25 rounded-lg mb-4">
            <Warning size={18} className="text-app-yellow shrink-0" />
            <p className="text-xs text-app-muted">
              This action will copy curriculum data to your school. Existing data will not be affected.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowImportConfirm(false)}
              className="flex-1 px-4 py-2.5 bg-app-bg border border-app-border text-app-text text-sm font-semibold rounded-lg hover:bg-app-bg/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportGlobal}
              disabled={isImporting}
              className="flex-1 px-4 py-2.5 bg-app-blue text-white text-sm font-semibold rounded-lg hover:bg-app-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Spinner size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Import Now
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminDashboard
