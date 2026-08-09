// ─── Teacher Assignments Page ──────────────────────────────────
// Manage teacher-student assignments for Drishti students

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { helpersApi } from '../../api'
import { useCanEdit } from '../../hooks'
import type { DrishtiHelper, StudentUser } from '../../types'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import {
  Users,
  UserPlus,
  UserMinus,
  MagnifyingGlass,
  ChalkboardTeacher,
  Student,
  Warning,
} from '@phosphor-icons/react'

const AssignmentsPage: React.FC = () => {
  const canEdit = useCanEdit('teachers')
  
  // Data state
  const [teachers, setTeachers] = useState<DrishtiHelper[]>([])
  const [drishtiStudents, setDrishtiStudents] = useState<StudentUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Selection state
  const [selectedTeacher, setSelectedTeacher] = useState<DrishtiHelper | null>(null)
  const [assignedStudents, setAssignedStudents] = useState<StudentUser[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  
  // UI state
  
  // Modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState('')

  // Ref to prevent duplicate fetches
  const loadedRef = useRef(false)

  // Core fetch logic
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [allHelpers, students] = await Promise.all([
        helpersApi.getAll(),
        helpersApi.getDrishtiStudents(),
      ])
      setTeachers(allHelpers.filter(h => h.helper_type === 'teacher' && h.is_active))
      setDrishtiStudents(students)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load initial data with guard
  const loadData = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load assigned students for selected teacher
  const loadAssignedStudents = useCallback(async (teacher: DrishtiHelper) => {
    setLoadingAssignments(true)
    try {
      const students = await helpersApi.getStudents(teacher.id)
      setAssignedStudents(students)
    } catch (error) {
      console.error('Failed to load assigned students:', error)
      setAssignedStudents([])
    } finally {
      setLoadingAssignments(false)
    }
  }, [])

  // Select teacher and load assignments
  const handleSelectTeacher = async (teacher: DrishtiHelper) => {
    setSelectedTeacher(teacher)
    await loadAssignedStudents(teacher)
  }

  // Get unassigned students (students not assigned to selected teacher)
  const unassignedStudents = useMemo(() => {
    if (!selectedTeacher) return []
    const assignedIds = new Set(assignedStudents.map(s => s.id))
    return drishtiStudents.filter(s => !assignedIds.has(s.id))
  }, [drishtiStudents, assignedStudents, selectedTeacher])

  // Filter students for assignment modal
  const filteredUnassigned = useMemo(() => {
    if (!studentSearchQuery) return unassignedStudents
    const q = studentSearchQuery.toLowerCase()
    return unassignedStudents.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.school || '').toLowerCase().includes(q)
    )
  }, [unassignedStudents, studentSearchQuery])

  // Assign student to teacher
  const handleAssign = async (student: StudentUser) => {
    if (!selectedTeacher) return
    setIsAssigning(true)
    setError('')
    
    try {
      await helpersApi.assignStudent(selectedTeacher.id, student.id)
      // Refresh assignments
      await loadAssignedStudents(selectedTeacher)
      // Update teacher's count locally
      setTeachers(prev => prev.map(t => 
        t.id === selectedTeacher.id 
          ? { ...t, assigned_count: (t.assigned_count || 0) + 1 }
          : t
      ))
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to assign student')
    } finally {
      setIsAssigning(false)
    }
  }

  // Unassign student from teacher
  const handleUnassign = async (student: StudentUser) => {
    if (!selectedTeacher) return
    if (!confirm(`Remove ${student.name} from ${selectedTeacher.helper_name}?`)) return
    
    setError('')
    try {
      await helpersApi.unassignStudent(selectedTeacher.id, student.id)
      await loadAssignedStudents(selectedTeacher)
      // Update teacher's count locally
      setTeachers(prev => prev.map(t => 
        t.id === selectedTeacher.id 
          ? { ...t, assigned_count: Math.max(0, (t.assigned_count || 0) - 1) }
          : t
      ))
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to unassign student')
    }
  }

  // Open assign modal
  const handleOpenAssign = () => {
    if (!selectedTeacher) return
    setStudentSearchQuery('')
    setError('')
    setShowAssignModal(true)
  }

  // Stats
  const stats = {
    totalTeachers: teachers.length,
    totalStudents: drishtiStudents.length,
    totalAssignments: teachers.reduce((acc, t) => acc + (t.assigned_count || 0), 0),
    avgPerTeacher: teachers.length > 0 
      ? Math.round(teachers.reduce((acc, t) => acc + (t.assigned_count || 0), 0) / teachers.length * 10) / 10
      : 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Users size={28} className="text-app-purple" />
            Teacher Assignments
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Assign Drishti students to teachers
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.totalTeachers}</p>
          <p className="text-xs text-app-muted">Active Teachers</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.totalStudents}</p>
          <p className="text-xs text-app-muted">Drishti Students</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-purple">{stats.totalAssignments}</p>
          <p className="text-xs text-app-muted">Total Assignments</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{stats.avgPerTeacher}</p>
          <p className="text-xs text-app-muted">Avg Students/Teacher</p>
        </div>
      </div>

      {/* Main Content - Two Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teachers Panel */}
        <div className="bg-app-card rounded-xl border border-app-border">
          <div className="p-4 border-b border-app-border">
            <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
              <ChalkboardTeacher size={20} className="text-app-blue" />
              Select Teacher
            </h2>
            <p className="text-xs text-app-muted mt-1">Click a teacher to view/manage assignments</p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12 text-app-muted">
              No active teachers found
            </div>
          ) : (
            <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto">
              {teachers.map(teacher => (
                <button
                  key={teacher.id}
                  onClick={() => handleSelectTeacher(teacher)}
                  className={`w-full p-4 text-left hover:bg-app-card2 transition-colors ${
                    selectedTeacher?.id === teacher.id ? 'bg-app-green/10 border-l-2 border-app-green' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-app-blue/10 border border-app-blue/25 flex items-center justify-center text-sm font-bold text-app-blue shrink-0">
                      {teacher.helper_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-app-text font-medium truncate">{teacher.helper_name}</p>
                      <p className="text-xs text-app-muted truncate">{teacher.helper_email}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-app-purple">
                        <Users size={14} />
                        {teacher.assigned_count || 0}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assignments Panel */}
        <div className="bg-app-card rounded-xl border border-app-border">
          <div className="p-4 border-b border-app-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-app-text flex items-center gap-2">
                  <Student size={20} className="text-app-green" />
                  Assigned Students
                </h2>
                {selectedTeacher ? (
                  <p className="text-xs text-app-muted mt-1">
                    {selectedTeacher.helper_name} • {assignedStudents.length} students
                  </p>
                ) : (
                  <p className="text-xs text-app-muted mt-1">Select a teacher to view assignments</p>
                )}
              </div>
              {selectedTeacher && canEdit && (
                <button
                  onClick={handleOpenAssign}
                  className="px-3 py-1.5 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-1"
                >
                  <UserPlus size={14} />
                  Assign
                </button>
              )}
            </div>
          </div>
          
          {!selectedTeacher ? (
            <div className="text-center py-12 text-app-muted">
              <ChalkboardTeacher size={48} className="mx-auto mb-2 opacity-50" />
              Select a teacher from the left panel
            </div>
          ) : loadingAssignments ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : assignedStudents.length === 0 ? (
            <div className="text-center py-12 text-app-muted">
              <Users size={48} className="mx-auto mb-2 opacity-50" />
              No students assigned yet
            </div>
          ) : (
            <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto">
              {assignedStudents.map(student => (
                <div
                  key={student.id}
                  className="p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-app-green/10 border border-app-green/25 flex items-center justify-center text-sm font-bold text-app-green shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-app-text font-medium truncate">{student.name}</p>
                    <p className="text-xs text-app-muted truncate">
                      {student.email} • {student.standard} • {student.board}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleUnassign(student)}
                      className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                      title="Remove assignment"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Student Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Student to ${selectedTeacher?.helper_name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red flex items-center gap-2">
              <Warning size={16} /> {error}
            </div>
          )}

          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search students..."
              value={studentSearchQuery}
              onChange={e => setStudentSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          {unassignedStudents.length === 0 ? (
            <div className="text-center py-8 text-app-muted">
              All Drishti students are already assigned to this teacher
            </div>
          ) : filteredUnassigned.length === 0 ? (
            <div className="text-center py-8 text-app-muted">
              No students match your search
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto divide-y divide-app-border border border-app-border rounded-lg">
              {filteredUnassigned.map(student => (
                <div
                  key={student.id}
                  className="p-3 flex items-center gap-3 hover:bg-app-card2"
                >
                  <div className="w-8 h-8 rounded-full bg-app-purple/10 border border-app-purple/25 flex items-center justify-center text-xs font-bold text-app-purple shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-app-text text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-app-muted truncate">{student.email}</p>
                  </div>
                  <span className="text-xs text-app-muted">{student.standard}</span>
                  <button
                    onClick={() => handleAssign(student)}
                    disabled={isAssigning}
                    className="px-2 py-1 text-xs text-white bg-app-green rounded hover:bg-app-green/80 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserPlus size={12} />
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-app-border">
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AssignmentsPage
