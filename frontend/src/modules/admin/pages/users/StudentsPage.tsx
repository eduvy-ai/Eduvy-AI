// ─── Students Management Page ──────────────────────────────────
// View and manage student users

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useStudents, useCanEdit, useAdminAuth } from '../../hooks'
import { adminApi, boardsApi, standardsApi } from '../../api'
import { adminService } from '../../service'
import type { StudentUser, Board, Standard } from '../../types'
import { PLAN_LABELS } from '../../constants'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import {
  MagnifyingGlass,
  Funnel,
  Eye,
  Pencil,
  Trash,
  Crown,
  Lightning,
  X,
  User,
  GraduationCap,
  Calendar,
  CheckCircle,
  Plus,
  Upload,
  FileText,
  DownloadSimple,
} from '@phosphor-icons/react'

// Default create form state
const defaultCreateForm = {
  name: '',
  email: '',
  password: '',
  standard: 'Class 10',
  board: 'CBSE',
  language: 'English',
  plan: 'free',
}

const StudentsPage: React.FC = () => {
  const { students, fetchStudents, updateStudentLocal, removeStudents, addStudentLocal } = useStudents()
  const canEdit = useCanEdit('students')
  const { user: adminUser } = useAdminAuth()
  const isSchoolAdmin = !!adminUser?.school_id
  
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterDrishti, setFilterDrishti] = useState<'all' | 'yes' | 'no'>('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dropdown options
  const [availableBoards, setAvailableBoards] = useState<Board[]>([])
  const [availableStandards, setAvailableStandards] = useState<Standard[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    plan: 'free',
    plan_expires_at: '',
    is_drishti: false,
  })
  
  // Create form state
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  
  // Bulk import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [bulkImportData, setBulkImportData] = useState('')
  const [bulkImportSendEmail, setBulkImportSendEmail] = useState(true)
  const [bulkImportResult, setBulkImportResult] = useState<{
    success: number
    failed: number
    errors: Array<{ row: number; email: string; error: string }>
    created_students: Array<{ id: string; name: string; email: string; temp_password: string }>
  } | null>(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  
  // Ref to keep fetch function stable
  const fetchStudentsRef = useRef(fetchStudents)
  fetchStudentsRef.current = fetchStudents

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    try {
      const [boards, standards] = await Promise.all([
        boardsApi.getAll(),
        standardsApi.getAll()
      ])
      setAvailableBoards(boards.filter(b => b.is_active))
      setAvailableStandards(standards.filter(s => s.is_active))
    } catch (error) {
      console.error('Failed to load options:', error)
    }
  }, [])

  // Load options on mount
  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  // Load students
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const filters: { search?: string; plan?: string; drishti?: boolean } = {}
        if (searchQuery) filters.search = searchQuery
        if (filterPlan) filters.plan = filterPlan
        if (filterDrishti !== 'all') filters.drishti = filterDrishti === 'yes'
        await fetchStudentsRef.current(filters)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Debounce search
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, filterPlan, filterDrishti])

  // Filter locally for instant feedback
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!s.name.toLowerCase().includes(q) && 
            !s.email.toLowerCase().includes(q) &&
            !(s.school || '').toLowerCase().includes(q)) {
          return false
        }
      }
      if (filterPlan && s.plan !== filterPlan) return false
      if (filterDrishti === 'yes' && !s.is_drishti) return false
      if (filterDrishti === 'no' && s.is_drishti) return false
      return true
    })
  }, [students, searchQuery, filterPlan, filterDrishti])

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / pageSize)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterPlan, filterDrishti])

  // View student details
  const handleView = (student: StudentUser) => {
    setSelectedStudent(student)
    setShowDetailModal(true)
  }

  // Open edit modal
  const handleEdit = (student: StudentUser) => {
    setSelectedStudent(student)
    setEditForm({
      plan: student.plan,
      plan_expires_at: student.plan_expires_at || '',
      is_drishti: student.is_drishti,
    })
    setFormError('')
    setShowEditModal(true)
  }

  // Save edit
  const handleSaveEdit = async () => {
    if (!selectedStudent) return
    setFormError('')

    try {
      // Update plan
      if (editForm.plan !== selectedStudent.plan || editForm.plan_expires_at !== (selectedStudent.plan_expires_at || '')) {
        await adminApi.users.updatePlan(selectedStudent.id, editForm.plan, editForm.plan_expires_at || undefined)
      }

      // Update drishti
      if (editForm.is_drishti !== selectedStudent.is_drishti) {
        await adminApi.users.updateDrishti(selectedStudent.id, editForm.is_drishti)
      }

      // Update local state
      updateStudentLocal({
        ...selectedStudent,
        plan: editForm.plan as any,
        plan_expires_at: editForm.plan_expires_at || null,
        is_drishti: editForm.is_drishti,
      })

      setShowEditModal(false)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to update student')
    }
  }

  // Open create modal
  const handleCreate = () => {
    setCreateForm(defaultCreateForm)
    setFormError('')
    setShowCreateModal(true)
  }

  // Save create
  const handleSaveCreate = async () => {
    setFormError('')
    
    if (!createForm.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!createForm.email.trim()) {
      setFormError('Email is required')
      return
    }
    // School admins don't need to set password — backend generates a temp one
    if (!isSchoolAdmin && (!createForm.password.trim() || createForm.password.length < 6)) {
      setFormError('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const newStudent = await adminApi.users.create({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password || '',
        standard: createForm.standard,
        board: createForm.board,
        language: createForm.language,
        plan: createForm.plan,
      })
      
      // Add to local state with safe defaults for fields not returned by create API
      if (addStudentLocal) {
        const defaults: Partial<StudentUser> = {
          xp: 0,
          streak: 0,
          is_drishti: false,
          school: '',
          created_at: new Date().toISOString(),
          last_active: '',
          plan_expires_at: null,
        }
        addStudentLocal({ ...defaults, ...newStudent } as StudentUser)
      }
      
      setShowCreateModal(false)
      // Refresh list
      fetchStudentsRef.current()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to create student')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open bulk import modal
  const handleBulkImport = () => {
    setBulkImportData('')
    setBulkImportResult(null)
    setFormError('')
    setBulkImportSendEmail(true)
    setShowBulkImportModal(true)
  }

  // Parse CSV/text input
  const parseBulkImportData = (text: string) => {
    const lines = text.trim().split('\n')
    const students: Array<{
      name: string
      email: string
      standard?: string
      board?: string
      language?: string
      plan?: string
    }> = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue // Skip empty lines and comments
      
      const parts = trimmed.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        students.push({
          name: parts[0],
          email: parts[1],
          standard: parts[2] || 'Class 10',
          board: parts[3] || 'CBSE',
          language: parts[4] || 'English',
          plan: parts[5] || 'free',
        })
      }
    }
    return students
  }

  // Download sample CSV
  const downloadSampleCSV = () => {
    const sample = `# Name, Email, Standard, Board, Language, Plan
# Lines starting with # are ignored
John Doe, john@example.com, Class 10, CBSE, English, free
Jane Smith, jane@example.com, Class 9, Maharashtra Board, Marathi, basic
Rahul Kumar, rahul@example.com, Class 11, CBSE, Hindi, pro`
    
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_import_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Submit bulk import
  const handleSubmitBulkImport = async () => {
    setFormError('')
    const students = parseBulkImportData(bulkImportData)
    
    if (students.length === 0) {
      setFormError('No valid students found. Check format: Name, Email, Standard, Board, Language, Plan')
      return
    }

    setIsBulkImporting(true)
    try {
      const result = await adminApi.users.bulkImport({
        students,
        send_email: bulkImportSendEmail,
      })
      setBulkImportResult(result)
      
      // Refresh list if any succeeded
      if (result.success > 0) {
        fetchStudentsRef.current()
      }
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Bulk import failed')
    } finally {
      setIsBulkImporting(false)
    }
  }

  // Delete confirmation
  const handleDeleteClick = (student: StudentUser) => {
    setSelectedStudent(student)
    setSelectedIds(new Set([student.id]))
    setShowDeleteConfirm(true)
  }

  // Bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      await adminApi.users.bulkDelete(Array.from(selectedIds))
      removeStudents(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      setSelectedStudent(null)
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete users')
    }
  }

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all visible (on current page)
  const toggleSelectAll = () => {
    const pageIds = paginatedStudents.map(s => s.id)
    const allSelected = pageIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...pageIds]))
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('')
    setFilterPlan('')
    setFilterDrishti('all')
  }

  const hasFilters = searchQuery || filterPlan || filterDrishti !== 'all'

  // Get plan badge
  const getPlanBadge = (plan: string) => {
    const config = PLAN_LABELS[plan] || PLAN_LABELS.free
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
        {plan !== 'free' && <Crown size={12} weight="fill" />}
        {config.label}
      </span>
    )
  }

  // Table columns
  const columns: TableColumn<StudentUser>[] = [
    ...(canEdit ? [{
      key: 'select' as keyof StudentUser,
      header: (
        <input
          type="checkbox"
          checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ) as any,
      width: '40px',
      render: (student: StudentUser) => (
        <input
          type="checkbox"
          checked={selectedIds.has(student.id)}
          onChange={() => toggleSelect(student.id)}
          className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
        />
      ),
    }] : []),
    {
      key: 'name',
      header: 'Student',
      render: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-app-green/10 border border-app-green/25 flex items-center justify-center text-sm font-bold text-app-green shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-app-text">{student.name}</div>
            <div className="text-xs text-app-muted">{student.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'standard',
      header: 'Class',
      width: '100px',
      render: (student) => (
        <div className="text-sm">
          <div className="text-app-text">{student.standard}</div>
          <div className="text-xs text-app-muted">{student.board}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      width: '100px',
      render: (student) => getPlanBadge(student.plan),
    },
    {
      key: 'xp',
      header: 'XP',
      width: '80px',
      render: (student) => (
        <span className="text-app-yellow font-medium text-sm">
          {adminService.formatNumber(student.xp)}
        </span>
      ),
    },
    {
      key: 'streak',
      header: 'Streak',
      width: '80px',
      render: (student) => (
        <span className="flex items-center gap-1 text-app-orange text-sm">
          <Lightning size={14} weight="fill" />
          {student.streak}
        </span>
      ),
    },
    {
      key: 'is_drishti',
      header: 'Drishti',
      width: '80px',
      render: (student) => (
        student.is_drishti ?
          <CheckCircle size={18} weight="fill" className="text-app-green" /> :
          <span className="text-app-muted">-</span>
      ),
    },
    {
      key: 'last_active',
      header: 'Last Active',
      width: '120px',
      render: (student) => (
        <span className="text-xs text-app-muted">
          {adminService.getRelativeTime(student.last_active)}
        </span>
      ),
    },
    {
      key: 'actions' as keyof StudentUser,
      header: 'Actions',
      width: '120px',
      render: (student: StudentUser) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleView(student)}
            className="p-1.5 text-app-muted hover:text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
            title="View details"
          >
            <Eye size={16} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => handleEdit(student)}
                className="p-1.5 text-app-muted hover:text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(student)}
                className="p-1.5 text-app-muted hover:text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-app-text">Students</h1>
          <p className="text-sm text-app-muted mt-1">
            {filteredStudents.length} students {hasFilters && '(filtered)'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && selectedIds.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash size={16} />}
              onClick={handleBulkDeleteClick}
            >
              Delete {selectedIds.size}
            </Button>
          )}
          {canEdit && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Upload size={16} />}
                onClick={handleBulkImport}
              >
                Bulk Import
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={handleCreate}
              >
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Funnel size={16} className="text-app-muted" />
          <span className="text-sm font-medium text-app-text">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-app-muted hover:text-app-text flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search name, email, school..."
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
          <select
            value={filterDrishti}
            onChange={(e) => setFilterDrishti(e.target.value as any)}
            className="h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-app-green/50"
          >
            <option value="all">All Students</option>
            <option value="yes">Drishti Only</option>
            <option value="no">Non-Drishti Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedStudents}
        isLoading={isLoading}
        emptyMessage="No students found"
        keyExtractor={(student) => student.id}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredStudents.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Student Details"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-app-green/10 border-2 border-app-green/25 flex items-center justify-center text-2xl font-bold text-app-green">
                {selectedStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-app-text">{selectedStudent.name}</h3>
                <p className="text-sm text-app-muted">{selectedStudent.email}</p>
                <div className="mt-1">{getPlanBadge(selectedStudent.plan)}</div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-app-card2 rounded-xl">
                <div className="flex items-center gap-2 text-app-muted mb-1">
                  <GraduationCap size={16} />
                  <span className="text-xs">Education</span>
                </div>
                <div className="text-sm text-app-text">
                  {selectedStudent.standard} · {selectedStudent.board}
                </div>
              </div>
              <div className="p-3 bg-app-card2 rounded-xl">
                <div className="flex items-center gap-2 text-app-muted mb-1">
                  <Lightning size={16} />
                  <span className="text-xs">Progress</span>
                </div>
                <div className="text-sm text-app-text">
                  {adminService.formatNumber(selectedStudent.xp)} XP · {selectedStudent.streak} day streak
                </div>
              </div>
              <div className="p-3 bg-app-card2 rounded-xl">
                <div className="flex items-center gap-2 text-app-muted mb-1">
                  <User size={16} />
                  <span className="text-xs">School</span>
                </div>
                <div className="text-sm text-app-text">
                  {selectedStudent.school || 'Not specified'}
                </div>
              </div>
              <div className="p-3 bg-app-card2 rounded-xl">
                <div className="flex items-center gap-2 text-app-muted mb-1">
                  <Calendar size={16} />
                  <span className="text-xs">Joined</span>
                </div>
                <div className="text-sm text-app-text">
                  {adminService.formatDate(selectedStudent.created_at)}
                </div>
              </div>
            </div>

            {/* Subscription */}
            {selectedStudent.plan !== 'free' && (
              <div className="p-4 bg-app-green/5 border border-app-green/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-app-text">
                      {PLAN_LABELS[selectedStudent.plan]?.label || selectedStudent.plan} Subscription
                    </div>
                    <div className="text-xs text-app-muted mt-0.5">
                      {selectedStudent.plan_expires_at ? 
                        `Expires ${adminService.formatDate(selectedStudent.plan_expires_at)}` : 
                        'No expiry set'}
                    </div>
                  </div>
                  <Crown size={24} weight="fill" className="text-app-green" />
                </div>
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedStudent)
                }}>
                  Edit Student
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Student"
        size="md"
      >
        {selectedStudent && (
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
                {formError}
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-app-card2 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-app-green/10 border border-app-green/25 flex items-center justify-center text-sm font-bold text-app-green">
                {selectedStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-app-text">{selectedStudent.name}</div>
                <div className="text-xs text-app-muted">{selectedStudent.email}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Plan</label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {editForm.plan !== 'free' && (
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1.5">Plan Expires At</label>
                <input
                  type="date"
                  value={editForm.plan_expires_at?.split('T')[0] || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, plan_expires_at: e.target.value }))}
                  className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_drishti"
                checked={editForm.is_drishti}
                onChange={(e) => setEditForm(prev => ({ ...prev, is_drishti: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
              />
              <label htmlFor="is_drishti" className="text-sm text-app-text">
                Drishti Student (enables helper access)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Student Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Student"
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Name *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              placeholder="Student name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-muted mb-1.5">Email *</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              placeholder="student@example.com"
            />
          </div>

          {isSchoolAdmin ? (
            <div className="p-3 rounded-xl bg-app-blue/10 border border-app-blue/30 text-sm text-app-muted">
              A temporary password will be auto-generated. Student must change it on first login.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Password *</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
                placeholder="Minimum 6 characters"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Standard</label>
              <select
                value={createForm.standard}
                onChange={(e) => setCreateForm(prev => ({ ...prev, standard: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                {availableStandards.length > 0 ? (
                  availableStandards.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Class 1">Class 1</option>
                    <option value="Class 2">Class 2</option>
                    <option value="Class 3">Class 3</option>
                    <option value="Class 4">Class 4</option>
                    <option value="Class 5">Class 5</option>
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Board</label>
              <select
                value={createForm.board}
                onChange={(e) => setCreateForm(prev => ({ ...prev, board: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                {availableBoards.length > 0 ? (
                  availableBoards.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))
                ) : (
                  <>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="Maharashtra Board">Maharashtra Board</option>
                    <option value="GSEB">GSEB</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className={`grid ${isSchoolAdmin ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1.5">Language</label>
              <select
                value={createForm.language}
                onChange={(e) => setCreateForm(prev => ({ ...prev, language: e.target.value }))}
                className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </div>
            {!isSchoolAdmin && (
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1.5">Plan</label>
                <select
                  value={createForm.plan}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, plan: e.target.value }))}
                  className="w-full h-10 px-3 bg-app-card2 border border-white/10 rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-app-green/50"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Student'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        title="Bulk Import Students"
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}

          {!bulkImportResult ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-app-muted">
                  Paste CSV data or type students line by line
                </p>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-1.5 text-sm text-app-blue hover:underline"
                >
                  <DownloadSimple size={14} />
                  Sample CSV
                </button>
              </div>

              <div className="bg-app-card2 rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2 mb-2 text-xs text-app-muted">
                  <FileText size={14} />
                  <span>Format: Name, Email, Standard, Board, Language, Plan</span>
                </div>
                <textarea
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder={`John Doe, john@example.com, Class 10, CBSE, English, free\nJane Smith, jane@example.com, Class 9, Maharashtra Board, Marathi, basic`}
                  className="w-full h-48 bg-transparent text-app-text text-sm font-mono resize-none focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkImportSendEmail}
                  onChange={(e) => setBulkImportSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-app-card2 text-app-green focus:ring-app-green/50"
                />
                <span className="text-sm text-app-text">
                  Send welcome email with temporary password
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowBulkImportModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSubmitBulkImport} 
                  disabled={isBulkImporting || !bulkImportData.trim()}
                >
                  {isBulkImporting ? 'Importing...' : 'Import Students'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Import Results */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-app-green/10 border border-app-green/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-app-green">{bulkImportResult.success}</div>
                  <div className="text-sm text-app-muted">Imported</div>
                </div>
                <div className="bg-app-red/10 border border-app-red/30 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-app-red">{bulkImportResult.failed}</div>
                  <div className="text-sm text-app-muted">Failed</div>
                </div>
              </div>

              {bulkImportResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-app-text">Errors</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {bulkImportResult.errors.map((err, idx) => (
                      <div key={idx} className="text-xs text-app-red bg-app-red/5 rounded px-2 py-1">
                        Row {err.row}: {err.email} - {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bulkImportResult.created_students.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-app-text">Created Students</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-app-muted">
                        <tr>
                          <th className="text-left py-1">Name</th>
                          <th className="text-left py-1">Email</th>
                          <th className="text-left py-1">Temp Password</th>
                        </tr>
                      </thead>
                      <tbody className="text-app-text">
                        {bulkImportResult.created_students.map((student) => (
                          <tr key={student.id} className="border-t border-white/5">
                            <td className="py-1.5">{student.name}</td>
                            <td className="py-1.5">{student.email}</td>
                            <td className="py-1.5 font-mono text-app-green">{student.temp_password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => {
                  setBulkImportResult(null)
                  setBulkImportData('')
                }}>
                  Import More
                </Button>
                <Button variant="primary" onClick={() => setShowBulkImportModal(false)}>
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Students"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-app-text">
            Are you sure you want to delete {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''}? 
            This action cannot be undone.
          </p>
          {formError && (
            <div className="p-3 rounded-xl bg-app-red/10 border border-app-red/30 text-sm text-app-red">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default StudentsPage
