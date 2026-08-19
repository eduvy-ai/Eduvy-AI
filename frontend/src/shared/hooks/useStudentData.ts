import { useState, useEffect, useMemo } from 'react'
import axiosInstance from '../../services/axios'

interface StudentData {
  subjects: string[]
  masteries: Record<string, number>
  masteryAvg: number
  loading: boolean
}

/**
 * Loads student's subjects (from chapters API) and mastery scores.
 * Used by HomeTab and LearnTab to avoid duplicating this logic.
 */
export function useStudentData(userId: string | null, board: string, standard: string, fallbackSubjects: string[] = []): StudentData {
  const [subjects, setSubjects] = useState<string[]>(fallbackSubjects)
  const [masteries, setMasteries] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!board || !standard) return
    axiosInstance.get('/api/chapters/subjects', { params: { board, standard } })
      .then(res => {
        const subs = Array.isArray(res.data) ? res.data : []
        if (subs.length > 0) setSubjects(subs)
        else if (fallbackSubjects.length > 0) setSubjects(fallbackSubjects)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [board, standard])

  useEffect(() => {
    if (!userId) return
    axiosInstance.get(`/api/mastery/${userId}`)
      .then(res => {
        if (res.data && typeof res.data === 'object') setMasteries(res.data)
      })
      .catch(() => {})
  }, [userId])

  const masteryAvg = useMemo(() => {
    if (subjects.length === 0) return 0
    const total = subjects.reduce((sum, s) => sum + (masteries[s] ?? 0), 0)
    return Math.round(total / subjects.length)
  }, [subjects, masteries])

  return { subjects, masteries, masteryAvg, loading }
}
