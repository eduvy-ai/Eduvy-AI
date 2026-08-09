// ─── School Teachers List Page ──────────────────────────────────
// Manage school-specific teachers (for B2B school admins)

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { schoolTeachersApi, subjectsApi, standardsApi, type SchoolTeacher, type SchoolTeacherCreate } from '../../api'
import type { Subject, Standard } from '../../types'
import { useCanEdit } from '../../hooks'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Pagination from '../../../../shared/components/Pagination'
import Loader from '../../../../shared/components/Loader'
import {
  ChalkboardTeacher,
  MagnifyingGlass,
  Plus,
  Eye,
  Pencil,
  Trash,
  X,
  CheckCircle,
  XCircle,
  Books,
  GraduationCap,
  CaretDown,
} from '@phosphor-icons/react'

// Default form state
const defaultFormState: SchoolTeacherCreate & { is_active?: boolean } = {
  name: '',
  email: '',
  phone: '',
  subjects: [],
  standards: [],
  notes: '',
}

const SchoolTeachersListPage: React.FC = () => {
  const canEdit = useCanEdit('teachers')
  
  // Data state
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Available options from DB
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [availableStandards, setAvailableStandards] = useState<Standard[]>([])
  
  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacher | null>(null)
  const [viewingTeacher, setViewingTeacher] = useState<SchoolTeacher | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dropdown visibility
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const [showStandardDropdown, setShowStandardDropdown] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState(defaultFormState)

  // Ref to prevent duplicate initial fetches
  const loadedRef = useRef(false)

  // Fetch subjects and standards from DB
  const fetchOptions = useCallback(async () => {
    try {
      const [subjects, standards] = await Promise.all([
        subjectsApi.getAll(),
        standardsApi.getAll()
      ])
      setAvailableSubjects(subjects.filter(s => s.is_active))
      setAvailableStandards(standards.filter(s => s.is_active))
    } catch (error) {
      console.error('Failed to load options:', error)
    }
  }, [])

  // Core fetch logic
  const fetchTeachers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await schoolTeachersApi.getAll()
      setTeachers(data)
    } catch (error) {
      console.error('Failed to load teachers:', error)
      setTeachers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load with guard
  const loadTeachers = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    await Promise.all([fetchTeachers(), fetchOptions()])
  }, [fetchTeachers, fetchOptions])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!t.name.toLowerCase().includes(q) && 
            !t.email.toLowerCase().includes(q) &&
            !(t.notes || '').toLowerCase().includes(q) &&
            !t.subjects.some(s => s.toLowerCase().includes(q)) &&
            !t.standards.some(s => s.toLowerCase().includes(q))) {
          return false
        }
      }
      if (filterStatus === 'active' && !t.is_active) return false
      if (filterStatus === 'inactive' && t.is_active) return false
      return true
    })
  }, [teachers, searchQuery, filterStatus])

  // Paginate
  const paginatedTeachers = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTeachers.slice(start, start + pageSize)
  }, [filteredTeachers, page, pageSize])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterStatus])

  // Handlers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    setEditingTeacher(null)
    setFormData(defaultFormState)
    setShowSubjectDropdown(false)
    setShowStandardDropdown(false)
    setFormError('')
    setShowModal(true)
  }

  const handleEdit = (teacher: SchoolTeacher) => {
    setEditingTeacher(teacher)
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || '',
      subjects: [...teacher.subjects],
      standards: [...teacher.standards],
      notes: teacher.notes || '',
      is_active: teacher.is_active,
    })
    setShowSubjectDropdown(false)
    setShowStandardDropdown(false)
    setFormError('')
    setShowModal(true)
  }

  const handleView = (teacher: SchoolTeacher) => {
    setViewingTeacher(teacher)
    setShowDetailModal(true)
  }

  const handleDelete = (teacher: SchoolTeacher) => {
    setEditingTeacher(teacher)
    setSelectedIds(new Set([teacher.id]))
    setShowDeleteConfirm(true)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setEditingTeacher(null)
    setShowDeleteConfirm(true)
  }

  const toggleSubject = (subjectName: string) => {
    setFormData(prev => {
      const current = prev.subjects || []
      if (current.includes(subjectName)) {
        return { ...prev, subjects: current.filter(s => s !== subjectName) }
      } else {
        return { ...prev, subjects: [...current, subjectName] }
      }
    })
  }

  const toggleStandard = (standardName: string) => {
    setFormData(prev => {
      const current = prev.standards || []
      if (current.includes(standardName)) {
        return { ...prev, standards: current.filter(s => s !== standardName) }
      } else {
        return { ...prev, standards: [...current, standardName] }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!formData.email.trim()) {
      setFormError('Email is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingTeacher) {
        await schoolTeachersApi.update(editingTeacher.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subjects: formData.subjects,
          standards: formData.standards,
          notes: formData.notes || undefined,
          is_active: formData.is_active,
        })
      } else {
        await schoolTeachersApi.create({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subjects: formData.subjects,
          standards: formData.standards,
          notes: formData.notes || '',
        })
      }
      
      setShowModal(false)
      fetchTeachers()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to save teacher')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return
    setIsSubmitting(true)
    setFormError('')
    
    try {
      await schoolTeachersApi.bulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      fetchTeachers()
    } catch (error: any) {
      setFormError(error.response?.data?.detail || 'Failed to delete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
  }

  const hasFilters = searchQuery || filterStatus !== 'all'

  // Stats
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.is_active).length,
    inactive: teachers.filter(t => !t.is_active).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ChalkboardTeacher className="w-7 h-7" />
            Teachers
          </h1>
          <p className="text-gray-400 mt-1">Manage your school's teachers</p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Teacher
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Teachers</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Active</div>
          <div className="text-2xl font-bold text-green-400">{stats.active}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Inactive</div>
          <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="text-gray-400">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        {selectedIds.size > 0 && canEdit && (
          <Button variant="danger" onClick={handleBulkDelete} className="flex items-center gap-2">
            <Trash className="w-4 h-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : paginatedTeachers.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <ChalkboardTeacher className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            {hasFilters ? 'No teachers match your filters' : 'No teachers yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasFilters
              ? 'Try adjusting your search or filters'
              : 'Add your first teacher to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                {canEdit && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={paginatedTeachers.every(t => selectedIds.has(t.id))}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(paginatedTeachers.map(t => t.id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Subjects</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Standards</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedTeachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-750">
                  {canEdit && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(teacher.id)}
                        onChange={() => toggleSelect(teacher.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-white font-medium">{teacher.name}</td>
                  <td className="px-4 py-3 text-gray-400">{teacher.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.slice(0, 2).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {s}
                        </span>
                      ))}
                      {teacher.subjects.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                          +{teacher.subjects.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {teacher.standards.slice(0, 2).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {s}
                        </span>
                      ))}
                      {teacher.standards.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                          +{teacher.standards.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {teacher.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleView(teacher)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleEdit(teacher)}
                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(teacher)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredTeachers.length > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredTeachers.length / pageSize)}
          totalItems={filteredTeachers.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Teacher name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="teacher@school.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="+91 9876543210"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Subjects</label>
            <button
              type="button"
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-left flex items-center justify-between focus:outline-none focus:border-blue-500"
            >
              <span className={formData.subjects?.length ? 'text-white' : 'text-gray-400'}>
                {formData.subjects?.length 
                  ? `${formData.subjects.length} selected` 
                  : 'Select subjects'}
              </span>
              <CaretDown className={`w-4 h-4 transition-transform ${showSubjectDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSubjectDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {availableSubjects.length === 0 ? (
                  <div className="px-4 py-2 text-gray-400 text-sm">No subjects available</div>
                ) : (
                  availableSubjects.map(subject => (
                    <label
                      key={subject.id}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.subjects?.includes(subject.name) || false}
                        onChange={() => toggleSubject(subject.name)}
                        className="rounded"
                      />
                      <span className="text-white">{subject.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            {formData.subjects && formData.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subjects.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                    <Books className="w-3 h-3" />
                    {s}
                    <button type="button" onClick={() => toggleSubject(s)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Standards</label>
            <button
              type="button"
              onClick={() => setShowStandardDropdown(!showStandardDropdown)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-left flex items-center justify-between focus:outline-none focus:border-blue-500"
            >
              <span className={formData.standards?.length ? 'text-white' : 'text-gray-400'}>
                {formData.standards?.length 
                  ? `${formData.standards.length} selected` 
                  : 'Select standards'}
              </span>
              <CaretDown className={`w-4 h-4 transition-transform ${showStandardDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStandardDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {availableStandards.length === 0 ? (
                  <div className="px-4 py-2 text-gray-400 text-sm">No standards available</div>
                ) : (
                  availableStandards.map(standard => (
                    <label
                      key={standard.id}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-600 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.standards?.includes(standard.name) || false}
                        onChange={() => toggleStandard(standard.name)}
                        className="rounded"
                      />
                      <span className="text-white">{standard.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            {formData.standards && formData.standards.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.standards.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                    <GraduationCap className="w-3 h-3" />
                    {s}
                    <button type="button" onClick={() => toggleStandard(s)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {editingTeacher && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-gray-300">Active</label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTeacher ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Teacher Details"
      >
        {viewingTeacher && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-sm">Name</div>
                <div className="text-white font-medium">{viewingTeacher.name}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Email</div>
                <div className="text-white">{viewingTeacher.email}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Phone</div>
                <div className="text-white">{viewingTeacher.phone || '-'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Status</div>
                <div className={viewingTeacher.is_active ? 'text-green-400' : 'text-red-400'}>
                  {viewingTeacher.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-2">Subjects</div>
              <div className="flex flex-wrap gap-2">
                {viewingTeacher.subjects.length > 0 ? (
                  viewingTeacher.subjects.map(s => (
                    <span key={s} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No subjects assigned</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-sm mb-2">Standards</div>
              <div className="flex flex-wrap gap-2">
                {viewingTeacher.standards.length > 0 ? (
                  viewingTeacher.standards.map(s => (
                    <span key={s} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No standards assigned</span>
                )}
              </div>
            </div>

            {viewingTeacher.notes && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Notes</div>
                <div className="text-white">{viewingTeacher.notes}</div>
              </div>
            )}

            <div className="text-gray-500 text-sm">
              Created: {new Date(viewingTeacher.created_at).toLocaleDateString()}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg">
              {formError}
            </div>
          )}
          
          <p className="text-gray-300">
            Are you sure you want to delete {selectedIds.size === 1 ? 'this teacher' : `${selectedIds.size} teachers`}?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SchoolTeachersListPage
