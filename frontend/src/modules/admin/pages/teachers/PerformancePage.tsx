// ─── Teacher Performance Page ──────────────────────────────────
// View teacher performance metrics and analytics

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { helpersApi } from '../../api'
import type { DrishtiHelper, StudentUser } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import {
  ChartBar,
  TrendUp,
  Trophy,
  Eye,
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  Minus,
} from '@phosphor-icons/react'

interface TeacherMetrics {
  teacher: DrishtiHelper
  students: StudentUser[]
  avgStudentXP: number
  avgStudentStreak: number
  activeStudents: number
  totalSessions: number
}

const PerformancePage: React.FC = () => {
  // Data state
  const [metricsData, setMetricsData] = useState<TeacherMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'students' | 'avgXP' | 'avgStreak' | 'active'>('students')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Modal state
  const [selectedMetrics, setSelectedMetrics] = useState<TeacherMetrics | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Ref to prevent duplicate fetches
  const loadedRef = useRef(false)

  // Load data
  const loadData = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    setIsLoading(true)
    try {
      const allHelpers = await helpersApi.getAll()
      const activeTeachers = allHelpers.filter(h => h.helper_type === 'teacher' && h.is_active)
      
      // Load students for each teacher
      const metricsPromises = activeTeachers.map(async (teacher) => {
        try {
          const students = await helpersApi.getStudents(teacher.id)
          
          // Calculate metrics
          const avgXP = students.length > 0 
            ? Math.round(students.reduce((acc, s) => acc + s.xp, 0) / students.length)
            : 0
          const avgStreak = students.length > 0 
            ? Math.round(students.reduce((acc, s) => acc + s.streak, 0) / students.length * 10) / 10
            : 0
          
          // Active students (logged in within last 7 days)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const activeStudents = students.filter(s => {
            if (!s.last_active) return false
            const lastActive = new Date(s.last_active)
            return lastActive >= sevenDaysAgo
          }).length
          
          return {
            teacher,
            students,
            avgStudentXP: avgXP,
            avgStudentStreak: avgStreak,
            activeStudents,
            totalSessions: 0, // Would need backend API for this
          }
        } catch (error) {
          return {
            teacher,
            students: [],
            avgStudentXP: 0,
            avgStudentStreak: 0,
            activeStudents: 0,
            totalSessions: 0,
          }
        }
      })
      
      const metrics = await Promise.all(metricsPromises)
      setMetricsData(metrics)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter and sort
  const filteredMetrics = useMemo(() => {
    let filtered = metricsData
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.teacher.helper_name.toLowerCase().includes(q) ||
        m.teacher.helper_email.toLowerCase().includes(q)
      )
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal = 0, bVal = 0
      switch (sortBy) {
        case 'students':
          aVal = a.students.length
          bVal = b.students.length
          break
        case 'avgXP':
          aVal = a.avgStudentXP
          bVal = b.avgStudentXP
          break
        case 'avgStreak':
          aVal = a.avgStudentStreak
          bVal = b.avgStudentStreak
          break
        case 'active':
          aVal = a.activeStudents
          bVal = b.activeStudents
          break
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
    
    return filtered
  }, [metricsData, searchQuery, sortBy, sortOrder])

  // Toggle sort
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // View details
  const handleViewDetails = (metrics: TeacherMetrics) => {
    setSelectedMetrics(metrics)
    setShowDetailModal(true)
  }

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (metricsData.length === 0) return { totalStudents: 0, avgXP: 0, avgStreak: 0, activeRate: 0 }
    
    const totalStudents = metricsData.reduce((acc, m) => acc + m.students.length, 0)
    const totalXP = metricsData.reduce((acc, m) => acc + m.avgStudentXP * m.students.length, 0)
    const totalStreak = metricsData.reduce((acc, m) => acc + m.avgStudentStreak * m.students.length, 0)
    const totalActive = metricsData.reduce((acc, m) => acc + m.activeStudents, 0)
    
    return {
      totalStudents,
      avgXP: totalStudents > 0 ? Math.round(totalXP / totalStudents) : 0,
      avgStreak: totalStudents > 0 ? Math.round(totalStreak / totalStudents * 10) / 10 : 0,
      activeRate: totalStudents > 0 ? Math.round(totalActive / totalStudents * 100) : 0,
    }
  }, [metricsData])

  // Top performers
  const topPerformers = useMemo(() => {
    return [...metricsData]
      .filter(m => m.students.length > 0)
      .sort((a, b) => b.avgStudentXP - a.avgStudentXP)
      .slice(0, 3)
  }, [metricsData])

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return <Minus size={12} className="opacity-30" />
    return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <ChartBar size={28} className="text-app-yellow" />
            Teacher Performance
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Analytics and metrics for teacher effectiveness
          </p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{overallStats.totalStudents}</p>
          <p className="text-xs text-app-muted">Total Students</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-purple">{overallStats.avgXP}</p>
          <p className="text-xs text-app-muted">Avg XP/Student</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-orange">{overallStats.avgStreak}</p>
          <p className="text-xs text-app-muted">Avg Streak</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{overallStats.activeRate}%</p>
          <p className="text-xs text-app-muted">Weekly Active Rate</p>
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="bg-gradient-to-r from-app-yellow/10 to-app-orange/10 rounded-xl border border-app-yellow/25 p-4">
          <h2 className="text-sm font-bold text-app-yellow flex items-center gap-2 mb-3">
            <Trophy size={16} />
            Top Performing Teachers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((m, idx) => (
              <div
                key={m.teacher.id}
                className="bg-app-card/50 rounded-lg p-3 flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx === 0 ? 'bg-app-yellow/20 text-app-yellow' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                  'bg-orange-600/20 text-orange-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-app-text font-medium truncate">{m.teacher.helper_name}</p>
                  <p className="text-xs text-app-muted">{m.avgStudentXP} avg XP • {m.students.length} students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-app-card2 border-b border-app-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Teacher
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider cursor-pointer hover:text-app-text"
                  onClick={() => handleSort('students')}
                >
                  <span className="flex items-center gap-1">
                    Students {getSortIcon('students')}
                  </span>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider cursor-pointer hover:text-app-text"
                  onClick={() => handleSort('avgXP')}
                >
                  <span className="flex items-center gap-1">
                    Avg XP {getSortIcon('avgXP')}
                  </span>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider cursor-pointer hover:text-app-text"
                  onClick={() => handleSort('avgStreak')}
                >
                  <span className="flex items-center gap-1">
                    Avg Streak {getSortIcon('avgStreak')}
                  </span>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider cursor-pointer hover:text-app-text"
                  onClick={() => handleSort('active')}
                >
                  <span className="flex items-center gap-1">
                    Active (7d) {getSortIcon('active')}
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Loader size="lg" />
                      <p className="text-app-muted mt-3 text-sm">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-app-muted">
                    No teachers found
                  </td>
                </tr>
              ) : (
                filteredMetrics.map(metrics => (
                  <tr key={metrics.teacher.id} className="hover:bg-app-card2/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-sm font-bold text-app-blue shrink-0">
                          {metrics.teacher.helper_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-app-text font-medium">{metrics.teacher.helper_name}</p>
                          <p className="text-xs text-app-muted">{metrics.teacher.helper_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-app-text font-medium">{metrics.students.length}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-medium ${
                        metrics.avgStudentXP >= overallStats.avgXP ? 'text-app-green' : 'text-app-text'
                      }`}>
                        {metrics.avgStudentXP}
                      </span>
                      {metrics.avgStudentXP >= overallStats.avgXP && metrics.students.length > 0 && (
                        <TrendUp size={14} className="inline ml-1 text-app-green" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`font-medium ${
                        metrics.avgStudentStreak >= overallStats.avgStreak ? 'text-app-orange' : 'text-app-text'
                      }`}>
                        {metrics.avgStudentStreak}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-app-text">
                        {metrics.activeStudents}
                        {metrics.students.length > 0 && (
                          <span className="text-app-muted text-xs ml-1">
                            ({Math.round(metrics.activeStudents / metrics.students.length * 100)}%)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleViewDetails(metrics)}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Teacher Performance Details"
        size="lg"
      >
        {selectedMetrics && (
          <div className="space-y-6">
            {/* Teacher Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-2xl font-bold text-app-blue">
                {selectedMetrics.teacher.helper_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-app-text">{selectedMetrics.teacher.helper_name}</h3>
                <p className="text-sm text-app-muted">{selectedMetrics.teacher.helper_email}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-app-card2 rounded-lg p-4">
                <p className="text-2xl font-bold text-app-text">{selectedMetrics.students.length}</p>
                <p className="text-xs text-app-muted">Total Students</p>
              </div>
              <div className="bg-app-card2 rounded-lg p-4">
                <p className="text-2xl font-bold text-app-purple">{selectedMetrics.avgStudentXP}</p>
                <p className="text-xs text-app-muted">Avg XP</p>
              </div>
              <div className="bg-app-card2 rounded-lg p-4">
                <p className="text-2xl font-bold text-app-orange">{selectedMetrics.avgStudentStreak}</p>
                <p className="text-xs text-app-muted">Avg Streak</p>
              </div>
              <div className="bg-app-card2 rounded-lg p-4">
                <p className="text-2xl font-bold text-app-green">{selectedMetrics.activeStudents}</p>
                <p className="text-xs text-app-muted">Active (7d)</p>
              </div>
            </div>

            {/* Student List */}
            <div>
              <h4 className="text-sm font-medium text-app-text mb-3">Assigned Students</h4>
              {selectedMetrics.students.length === 0 ? (
                <p className="text-app-muted text-sm">No students assigned</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto divide-y divide-app-border border border-app-border rounded-lg">
                  {selectedMetrics.students.map(student => (
                    <div key={student.id} className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-app-green/10 flex items-center justify-center text-xs font-bold text-app-green">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-app-text font-medium truncate">{student.name}</p>
                        <p className="text-xs text-app-muted">{student.email}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-app-purple font-medium">{student.xp} XP</p>
                        <p className="text-app-muted">{student.streak} day streak</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-app-border">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PerformancePage
