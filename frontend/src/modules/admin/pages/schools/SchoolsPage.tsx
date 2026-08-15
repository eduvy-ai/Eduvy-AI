// ─── Schools Management Page ──────────────────────────────────
// B2B school administration - create, manage, view students

import React, { useEffect, useState, useMemo } from 'react'
import axiosInstance from '../../../../services/axios'
import { ADMIN_TOKEN_KEY } from '../../constants'
import { useAdminAuth } from '../../hooks'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import {
  MagnifyingGlass,
  Plus,
  Users,
  Buildings,
  Copy,
  Check,
  Warning,
  ChartLine,
  Upload,
  Trash,
  CreditCard,
  Pencil,
  X,
} from '@phosphor-icons/react'

// ── Types ──
interface School {
  id: number
  name: string
  logo_url: string
  contact_email: string
  contact_phone: string
  address: string
  city: string
  state: string
  plan: string
  student_limit: number
  plan_expires_at: string
  school_code: string
  admin_user_id: string
  is_active: boolean
  student_count: number
  created_at: string
}

interface SchoolStudent {
  id: string
  name: string
  email: string
  mobile: string
  standard: string
  xp: number
  plan: string
  last_active: string
}

interface SchoolAnalytics {
  total_students: number
  active_students_7d: number
  total_ai_calls: number
  total_battles: number
  total_study_minutes: number
  avg_mastery: number
  top_students: Array<{ id: string; name: string; xp: number; standard: string }>
}

const PLAN_LABELS: Record<string, string> = {
  pilot: '🧪 Pilot (30-day trial)',
  school_basic: '📚 School Basic',
  school_pro: '⭐ School Pro',
}

const PLAN_COLORS: Record<string, string> = {
  pilot: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  school_basic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  school_pro: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// ── Helper: Get admin config ──
const adminConfig = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

const SchoolsPage: React.FC = () => {
  // Get current admin user
  const { user } = useAdminAuth()
  const isSuperAdmin = user?.school_id == null

  // State
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState<'school_basic' | 'school_pro'>('school_basic')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  // Toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Selected school data
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [schoolStudents, setSchoolStudents] = useState<SchoolStudent[]>([])
  const [schoolAnalytics, setSchoolAnalytics] = useState<SchoolAnalytics | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    state: '',
    plan: 'pilot',
    student_limit: 100,
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    state: '',
    plan: 'pilot',
    student_limit: 100,
    is_active: true,
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<number | null>(null)
  
  // Import state
  const [importData, setImportData] = useState('')
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)

  // Load schools
  useEffect(() => {
    loadSchools()
  }, [searchQuery])

  const loadSchools = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '500')
      
      const res = await axiosInstance.get(`/api/schools?${params}`, adminConfig())
      setSchools(res.data.schools || [])
    } catch (err) {
      console.error('Failed to load schools:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered & paginated
  const filteredSchools = useMemo(() => {
    if (!searchQuery) return schools
    const q = searchQuery.toLowerCase()
    return schools.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.school_code.toLowerCase().includes(q)
    )
  }, [schools, searchQuery])

  const totalPages = Math.ceil(filteredSchools.length / pageSize)
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSchools.slice(start, start + pageSize)
  }, [filteredSchools, currentPage, pageSize])

  // Create school
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setFormError('School name is required')
      return
    }
    
    try {
      await axiosInstance.post('/api/schools', formData, adminConfig())
      setShowCreateModal(false)
      setFormData({ name: '', contact_email: '', contact_phone: '', city: '', state: '', plan: 'pilot', student_limit: 100 })
      loadSchools()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create school')
    }
  }

  // Delete school
  const handleDelete = async () => {
    if (!selectedSchool) return
    
    try {
      await axiosInstance.delete(`/api/schools/${selectedSchool.id}`, adminConfig())
      setShowDeleteConfirm(false)
      setSelectedSchool(null)
      loadSchools()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to delete school')
    }
  }

  // Open edit modal
  const handleEdit = (school: School) => {
    setSelectedSchool(school)
    setEditFormData({
      name: school.name,
      contact_email: school.contact_email,
      contact_phone: school.contact_phone,
      city: school.city,
      state: school.state,
      plan: school.plan,
      student_limit: school.student_limit,
      is_active: school.is_active,
    })
    setFormError('')
    setShowEditModal(true)
  }

  // Update school
  const handleUpdateSchool = async () => {
    if (!selectedSchool) return
    if (!editFormData.name.trim()) {
      setFormError('School name is required')
      return
    }
    
    setIsSubmitting(true)
    try {
      await axiosInstance.put(`/api/schools/${selectedSchool.id}`, editFormData, adminConfig())
      setShowEditModal(false)
      loadSchools()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update school')
    } finally {
      setIsSubmitting(false)
    }
  }

  // View students
  const handleViewStudents = async (school: School) => {
    setSelectedSchool(school)
    try {
      const res = await axiosInstance.get(`/api/schools/${school.id}/students?limit=100`, adminConfig())
      setSchoolStudents(res.data.students || [])
      setShowStudentsModal(true)
    } catch (err) {
      console.error('Failed to load students:', err)
    }
  }

  // View analytics
  const handleViewAnalytics = async (school: School) => {
    setSelectedSchool(school)
    try {
      const res = await axiosInstance.get(`/api/schools/${school.id}/analytics`, adminConfig())
      setSchoolAnalytics(res.data)
      setShowAnalyticsModal(true)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
  }

  // Copy school code
  const copyCode = (school: School) => {
    navigator.clipboard.writeText(school.school_code)
    setCopiedCode(school.id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Import students
  const handleImport = async () => {
    if (!selectedSchool || !importData.trim()) return
    
    try {
      // Parse CSV-like data (name, email, mobile, standard)
      const lines = importData.trim().split('\n')
      const students = lines.map(line => {
        const [name, email, mobile, standard] = line.split(',').map(s => s.trim())
        return { name, email: email || '', mobile: mobile || '', standard: standard || 'Class 10' }
      }).filter(s => s.name)
      
      const res = await axiosInstance.post(
        `/api/schools/${selectedSchool.id}/import-students`,
        { students },
        adminConfig()
      )
      setImportResult(res.data)
      loadSchools()
    } catch (err: any) {
      setImportResult({ created: 0, skipped: 0, errors: [err.response?.data?.detail || 'Import failed'] })
    }
  }

  // Upgrade school plan with Razorpay
  const handleUpgrade = async () => {
    if (!selectedSchool) return
    setIsProcessingPayment(true)
    setFormError('')

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY)
      
      // Create order
      const orderRes = await axiosInstance.post(
        '/api/payments/school/create-order',
        { school_id: selectedSchool.id, plan: upgradePlan },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const order = orderRes.data

      // Load Razorpay
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)

      await new Promise(resolve => { script.onload = resolve })

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Eduvy-AI',
        description: `${PLAN_LABELS[upgradePlan]} - ${order.school_name}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            await axiosInstance.post(
              '/api/payments/school/verify',
              {
                school_id: selectedSchool.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            )
            setShowUpgradeModal(false)
            loadSchools()
            setSuccessMessage('Payment successful! School plan upgraded.')
            setShowSuccessToast(true)
            setTimeout(() => setShowSuccessToast(false), 3000)
          } catch (err: any) {
            setFormError(err.response?.data?.detail || 'Verification failed')
          }
        },
        modal: { ondismiss: () => setIsProcessingPayment(false) },
        theme: { color: '#10b981' },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create payment')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text flex items-center gap-2">
            <Buildings size={28} weight="duotone" className="text-app-blue" />
            Schools
          </h1>
          <p className="text-sm text-app-muted mt-1">
            {isSuperAdmin 
              ? `Manage B2B school partnerships • ${schools.length} schools`
              : 'Your school dashboard'}
          </p>
        </div>
        
        <Button onClick={() => setShowCreateModal(true)} disabled={!isSuperAdmin} className={!isSuperAdmin ? 'hidden' : ''}>
          <Plus size={18} className="mr-1" /> Add School
        </Button>
      </div>

      {/* Search - only shown for superadmin */}
      {isSuperAdmin && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-app-card border border-app-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-app-card2 rounded-xl border border-app-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-app-card border-b border-app-border">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">School</th>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">Join Code</th>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">Plan</th>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">Students</th>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">Expires</th>
              <th className="text-left py-3 px-4 font-semibold text-app-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8">
                  <div className="flex flex-col items-center justify-center">
                    <Loader size="md" />
                    <p className="text-app-muted mt-3 text-sm">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedSchools.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-app-muted">No schools found</td></tr>
            ) : paginatedSchools.map(school => (
              <tr key={school.id} className={`border-t border-app-border hover:bg-app-card/50 ${!school.is_active ? 'opacity-60' : ''}`}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Buildings size={18} className={school.is_active ? 'text-app-blue' : 'text-app-red'} />
                    <div>
                      <div className="font-semibold text-app-text flex items-center gap-2">
                        {school.name}
                        {!school.is_active && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-app-red/20 text-app-red rounded">SUSPENDED</span>
                        )}
                      </div>
                      <div className="text-xs text-app-muted">{school.city}{school.state ? `, ${school.state}` : ''}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => copyCode(school)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-app-card2 rounded border border-app-border font-mono text-sm hover:bg-app-card transition-colors"
                  >
                    {copiedCode === school.id ? <Check size={14} className="text-app-green" /> : <Copy size={14} />}
                    {school.school_code}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PLAN_COLORS[school.plan] || 'bg-gray-500/20 text-gray-400'}`}>
                    {PLAN_LABELS[school.plan] || school.plan}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-app-muted" />
                    <span className={school.student_count >= school.student_limit ? 'text-app-red' : ''}>
                      {school.student_count} / {school.student_limit}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-sm ${new Date(school.plan_expires_at) < new Date() ? 'text-app-red' : 'text-app-muted'}`}>
                    {school.plan_expires_at || 'N/A'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleViewStudents(school)} className="p-1.5 hover:bg-app-card2 rounded transition-colors" title="View Students">
                      <Users size={16} />
                    </button>
                    <button onClick={() => handleViewAnalytics(school)} className="p-1.5 hover:bg-app-card2 rounded transition-colors" title="Analytics">
                      <ChartLine size={16} />
                    </button>
                    <button onClick={() => handleEdit(school)} className="p-1.5 hover:bg-app-blue/20 rounded transition-colors text-app-blue" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => { setSelectedSchool(school); setShowImportModal(true); setImportData(''); setImportResult(null) }} className="p-1.5 hover:bg-app-card2 rounded transition-colors" title="Import Students">
                      <Upload size={16} />
                    </button>
                    {school.plan === 'pilot' && (
                      <button onClick={() => { setSelectedSchool(school); setShowUpgradeModal(true); setFormError('') }} className="p-1.5 hover:bg-app-green/20 rounded transition-colors text-app-green" title="Upgrade Plan">
                        <CreditCard size={16} />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => { setSelectedSchool(school); setShowDeleteConfirm(true) }} className="p-1.5 hover:bg-app-red/20 rounded transition-colors text-app-red" title="Delete">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-app-muted">
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredSchools.length)} of {filteredSchools.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-app-card border border-app-border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-app-muted">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-app-card border border-app-border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setFormError('') }}
        title="Add New School"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-app-muted font-semibold mb-1.5 block">School Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              placeholder="e.g. Delhi Public School"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Contact Phone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              >
                <option value="pilot">Pilot (30-day trial)</option>
                <option value="school_basic">School Basic (₹25K/year)</option>
                <option value="school_pro">School Pro (₹50K/year)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Student Limit</label>
              <input
                type="number"
                value={formData.student_limit}
                onChange={(e) => setFormData({ ...formData, student_limit: parseInt(e.target.value) || 100 })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
                min={10}
                max={5000}
              />
            </div>
          </div>
          
          {formError && (
            <div className="text-sm text-app-red flex items-center gap-1.5">
              <Warning size={14} /> {formError}
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create School</Button>
          </div>
        </div>
      </Modal>

      {/* Students Modal */}
      <Modal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        title={`Students - ${selectedSchool?.name}`}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {schoolStudents.length === 0 ? (
            <p className="text-center text-app-muted py-8">No students enrolled yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-app-card2 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-app-muted">Name</th>
                  <th className="text-left py-2 px-3 font-semibold text-app-muted">Email</th>
                  <th className="text-left py-2 px-3 font-semibold text-app-muted">Class</th>
                  <th className="text-left py-2 px-3 font-semibold text-app-muted">XP</th>
                  <th className="text-left py-2 px-3 font-semibold text-app-muted">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {schoolStudents.map(s => (
                  <tr key={s.id} className="border-t border-app-border">
                    <td className="py-2 px-3 font-medium">{s.name}</td>
                    <td className="py-2 px-3 text-app-muted">{s.email}</td>
                    <td className="py-2 px-3">{s.standard}</td>
                    <td className="py-2 px-3">{s.xp.toLocaleString()}</td>
                    <td className="py-2 px-3 text-app-muted">{s.last_active || 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title={`Analytics - ${selectedSchool?.name}`}
      >
        {schoolAnalytics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-text">{schoolAnalytics.total_students}</div>
              <div className="text-xs text-app-muted">Total Students</div>
            </div>
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-green">{schoolAnalytics.active_students_7d}</div>
              <div className="text-xs text-app-muted">Active (7 days)</div>
            </div>
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-blue">{schoolAnalytics.total_ai_calls.toLocaleString()}</div>
              <div className="text-xs text-app-muted">AI Calls</div>
            </div>
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-yellow">{schoolAnalytics.total_battles}</div>
              <div className="text-xs text-app-muted">Battles</div>
            </div>
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-purple">{Math.round(schoolAnalytics.total_study_minutes / 60)}h</div>
              <div className="text-xs text-app-muted">Study Time</div>
            </div>
            <div className="bg-app-card2 rounded-lg p-4">
              <div className="text-2xl font-bold text-app-text">{schoolAnalytics.avg_mastery}%</div>
              <div className="text-xs text-app-muted">Avg Mastery</div>
            </div>
            
            {schoolAnalytics.top_students.length > 0 && (
              <div className="col-span-2 mt-2">
                <div className="text-xs font-semibold text-app-muted mb-2">Top Students</div>
                <div className="space-y-1">
                  {schoolAnalytics.top_students.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between bg-app-card2 rounded px-3 py-2">
                      <span className="font-medium">{i + 1}. {s.name}</span>
                      <span className="text-app-green font-semibold">{s.xp.toLocaleString()} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={`Import Students - ${selectedSchool?.name}`}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-app-muted font-semibold mb-1.5 block">
              Paste student data (one per line: name, email, mobile, class)
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full h-40 bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-app-green/50"
              placeholder="John Doe, john@email.com, 9876543210, Class 10&#10;Jane Smith, , , Class 9&#10;..."
            />
          </div>
          
          {importResult && (
            <div className={`p-3 rounded-lg ${importResult.errors.length ? 'bg-app-red/10 border border-app-red/30' : 'bg-app-green/10 border border-app-green/30'}`}>
              <div className="text-sm">
                <span className="text-app-green">✓ Created: {importResult.created}</span>
                {importResult.skipped > 0 && <span className="ml-3 text-app-yellow">⏭ Skipped: {importResult.skipped}</span>}
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-xs text-app-red mt-2">
                  {importResult.errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowImportModal(false)}>Close</Button>
            <Button onClick={handleImport} disabled={!importData.trim()}>Import</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete School"
      >
        <div className="flex flex-col gap-4">
          <p className="text-app-text">
            Are you sure you want to delete <strong>{selectedSchool?.name}</strong>?
          </p>
          <p className="text-sm text-app-muted">
            This will unlink all {selectedSchool?.student_count} students from this school. Students will not be deleted.
          </p>
          
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete School</Button>
          </div>
        </div>
      </Modal>

      {/* Edit School Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit School${selectedSchool && !selectedSchool.is_active ? ' (Suspended)' : ''}`}
      >
        <div className="flex flex-col gap-4">
          {selectedSchool && !selectedSchool.is_active && (
            <div className="bg-app-red/10 border border-app-red/30 rounded-lg p-3 flex items-center gap-2">
              <X size={18} className="text-app-red flex-shrink-0" />
              <span className="text-sm text-app-red">This school is suspended. All students will be blocked from login.</span>
            </div>
          )}
          
          <div>
            <label className="text-xs text-app-muted font-semibold mb-1.5 block">School Name *</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">City</label>
              <input
                type="text"
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">State</label>
              <input
                type="text"
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Contact Email</label>
              <input
                type="email"
                value={editFormData.contact_email}
                onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Contact Phone</label>
              <input
                type="tel"
                value={editFormData.contact_phone}
                onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Plan</label>
              <select
                value={editFormData.plan}
                onChange={(e) => setEditFormData({ ...editFormData, plan: e.target.value })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
              >
                <option value="pilot">Pilot (30-day trial)</option>
                <option value="school_basic">School Basic (₹25K/year)</option>
                <option value="school_pro">School Pro (₹50K/year)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-app-muted font-semibold mb-1.5 block">Student Limit</label>
              <input
                type="number"
                value={editFormData.student_limit}
                onChange={(e) => setEditFormData({ ...editFormData, student_limit: parseInt(e.target.value) || 100 })}
                className="w-full bg-app-card2 border border-app-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-app-green/50"
                min={10}
                max={5000}
              />
            </div>
          </div>
          
          {/* Suspend School */}
          <div className={`mt-2 p-3 rounded-lg border ${!editFormData.is_active ? 'bg-app-red/10 border-app-red/30' : 'border-app-border'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: !e.target.checked })}
                className="w-4 h-4 rounded border-app-border text-app-red focus:ring-app-red"
              />
              <div>
                <div className={`font-medium ${!editFormData.is_active ? 'text-app-red' : 'text-app-text'}`}>Suspend School</div>
                <div className="text-xs text-app-muted">All students will be blocked from login until reactivated</div>
              </div>
            </label>
          </div>
          
          {formError && (
            <div className="text-sm text-app-red flex items-center gap-1.5">
              <Warning size={14} /> {formError}
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateSchool} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={`Upgrade - ${selectedSchool?.name}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-app-muted">
            Select a plan to upgrade this school from the pilot trial.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUpgradePlan('school_basic')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                upgradePlan === 'school_basic' 
                  ? 'border-app-blue bg-app-blue/10' 
                  : 'border-app-border hover:border-app-blue/50'
              }`}
            >
              <div className="font-bold text-app-text">School Basic</div>
              <div className="text-2xl font-bold text-app-blue mt-1">₹25,000<span className="text-sm font-normal">/year</span></div>
              <div className="text-xs text-app-muted mt-2">Up to 200 students</div>
              <div className="text-xs text-app-muted">Pro features for all</div>
            </button>
            <button
              onClick={() => setUpgradePlan('school_pro')}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                upgradePlan === 'school_pro' 
                  ? 'border-app-purple bg-app-purple/10' 
                  : 'border-app-border hover:border-app-purple/50'
              }`}
            >
              <div className="font-bold text-app-text">⭐ School Pro</div>
              <div className="text-2xl font-bold text-app-purple mt-1">₹50,000<span className="text-sm font-normal">/year</span></div>
              <div className="text-xs text-app-muted mt-2">Up to 500 students</div>
              <div className="text-xs text-app-muted">Premium features for all</div>
            </button>
          </div>

          {formError && (
            <div className="text-sm text-app-red flex items-center gap-1.5">
              <Warning size={14} /> {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={isProcessingPayment}>
              {isProcessingPayment ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[250] bg-app-green text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {successMessage}
        </div>
      )}
    </div>
  )
}

export default SchoolsPage
