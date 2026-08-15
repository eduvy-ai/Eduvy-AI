// ─── Community Leaderboard Page ──────────────────────────────────
// View and manage platform-wide leaderboards

import React, { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../../api'
import type { StudentAnalytics } from '../../types'
import Loader from '../../../../shared/components/Loader'
import {
  Trophy,
  Medal,
  Lightning,
  Fire,
  Crown,
  MagnifyingGlass,
  ArrowClockwise,
} from '@phosphor-icons/react'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  standard?: string
  board?: string
  xp: number
  streak: number
  plan: string
}

type LeaderboardType = 'xp' | 'streak'

const LeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('xp')
  const [searchQuery, setSearchQuery] = useState('')
  const [rawData, setRawData] = useState<StudentAnalytics | null>(null)

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await adminApi.analytics.getStudents()
      setRawData(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leaderboard')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update entries when type changes or data loads
  useEffect(() => {
    if (!rawData) return
    
    const sourceData = leaderboardType === 'xp' ? rawData.top_by_xp : rawData.top_by_streak
    const sorted = [...(sourceData || [])].sort((a, b) => 
      leaderboardType === 'xp' ? b.xp - a.xp : b.streak - a.streak
    )
    
    let filtered = sorted
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = sorted.filter(e => 
        e.name.toLowerCase().includes(q) || 
        e.standard?.toLowerCase().includes(q) ||
        e.board?.toLowerCase().includes(q)
      )
    }
    
    const mapped: LeaderboardEntry[] = filtered.map((e, idx) => ({
      rank: idx + 1,
      user_id: e.id,
      name: e.name,
      standard: e.standard,
      board: e.board,
      xp: e.xp,
      streak: e.streak,
      plan: e.plan,
    }))
    
    setEntries(mapped)
  }, [rawData, leaderboardType, searchQuery])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy size={20} weight="fill" className="text-yellow-400" />
    if (rank === 2) return <Medal size={20} weight="fill" className="text-gray-400" />
    if (rank === 3) return <Medal size={20} weight="fill" className="text-orange-400" />
    return <span className="text-sm font-bold text-app-muted w-5 text-center">{rank}</span>
  }

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: 'bg-app-muted/10 text-app-muted',
      basic: 'bg-app-blue/10 text-app-blue',
      pro: 'bg-app-purple/10 text-app-purple',
      premium: 'bg-app-yellow/10 text-app-yellow',
    }
    return (
      <span className={`px-1.5 py-0.5 text-xs rounded ${styles[plan] || styles.free}`}>
        {plan}
      </span>
    )
  }

  const getValueByType = (entry: LeaderboardEntry, type: LeaderboardType) => {
    switch (type) {
      case 'xp': return entry.xp.toLocaleString()
      case 'streak': return entry.streak
    }
  }

  const getTypeIcon = (type: LeaderboardType) => {
    switch (type) {
      case 'xp': return <Lightning size={16} className="text-app-purple" />
      case 'streak': return <Fire size={16} className="text-app-orange" />
    }
  }

  if (error) {
    return (
      <div className="p-6 bg-app-red/10 border border-app-red/25 rounded-xl text-app-red">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Trophy size={28} className="text-app-yellow" />
            Leaderboard
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Platform-wide rankings • {entries.length} students
          </p>
        </div>
        <button
          onClick={loadLeaderboard}
          className="px-3 py-1.5 text-sm text-app-muted hover:text-app-text bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1"
        >
          <ArrowClockwise size={14} />
          Refresh
        </button>
      </div>

      {/* Leaderboard Type Tabs */}
      <div className="flex gap-2 p-1 bg-app-card rounded-xl border border-app-border">
        {(['xp', 'streak'] as LeaderboardType[]).map(type => (
          <button
            key={type}
            onClick={() => setLeaderboardType(type)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              leaderboardType === type
                ? 'bg-app-green text-white'
                : 'text-app-muted hover:text-app-text hover:bg-app-card2'
            }`}
          >
            {getTypeIcon(type)}
            {type === 'xp' ? 'XP Leaderboard' : 'Streak Leaders'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          placeholder="Search by name, standard, or board..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
        />
      </div>

      {/* Top 3 Highlight */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Second Place */}
          <div className="bg-app-card rounded-xl border border-app-border p-4 text-center order-1">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-2xl">
              🥈
            </div>
            <p className="font-bold text-app-text">{entries[1].name}</p>
            <p className="text-xs text-app-muted">{entries[1].standard} • {entries[1].board}</p>
            <p className="text-lg font-bold text-app-purple mt-2">
              {getValueByType(entries[1], leaderboardType)}
            </p>
          </div>
          
          {/* First Place */}
          <div className="bg-gradient-to-br from-app-yellow/20 to-app-orange/20 rounded-xl border border-app-yellow/30 p-6 text-center order-0 lg:order-1 -mt-4">
            <Crown size={24} className="text-app-yellow mx-auto mb-2" weight="fill" />
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-3xl">
              🏆
            </div>
            <p className="font-bold text-lg text-app-text">{entries[0].name}</p>
            <p className="text-xs text-app-muted">{entries[0].standard} • {entries[0].board}</p>
            <p className="text-2xl font-bold text-app-yellow mt-2">
              {getValueByType(entries[0], leaderboardType)}
            </p>
            {getPlanBadge(entries[0].plan)}
          </div>
          
          {/* Third Place */}
          <div className="bg-app-card rounded-xl border border-app-border p-4 text-center order-2">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center text-2xl">
              🥉
            </div>
            <p className="font-bold text-app-text">{entries[2].name}</p>
            <p className="text-xs text-app-muted">{entries[2].standard} • {entries[2].board}</p>
            <p className="text-lg font-bold text-app-purple mt-2">
              {getValueByType(entries[2], leaderboardType)}
            </p>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-app-border text-left">
              <th className="p-3 w-16 text-xs font-semibold text-app-muted uppercase">Rank</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Student</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Board</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">XP</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Streak</th>
              <th className="p-3 text-xs font-semibold text-app-muted uppercase">Plan</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <Loader size="md" />
                    <p className="text-app-muted mt-3 text-sm">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-app-muted">
                  No students found
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr
                  key={entry.user_id}
                  className={`border-b border-app-border/50 hover:bg-app-card2 transition-colors ${
                    entry.rank <= 3 ? 'bg-app-yellow/5' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      {getRankBadge(entry.rank)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-app-purple/20 flex items-center justify-center text-app-purple font-bold text-sm">
                        {entry.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-app-text">{entry.name}</p>
                        <p className="text-xs text-app-muted">{entry.standard}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted">{entry.board || '—'}</span>
                  </td>
                  <td className="p-3">
                    <span className={`text-sm font-medium ${leaderboardType === 'xp' ? 'text-app-purple' : 'text-app-text'}`}>
                      {entry.xp.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-sm flex items-center gap-1 ${leaderboardType === 'streak' ? 'text-app-orange font-medium' : 'text-app-muted'}`}>
                      <Fire size={14} className={entry.streak > 30 ? 'text-app-orange' : 'text-app-muted'} />
                      {entry.streak}
                    </span>
                  </td>
                  <td className="p-3">{getPlanBadge(entry.plan)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LeaderboardPage
