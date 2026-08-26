// ─── Account Requests Page ───────────────────────────────────
// Superadmin workflow for reviewing public account requests

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api'
import { useAdminAuth } from '../../hooks'
import type { AccountRequest } from '../../types'
import Table, { type TableColumn } from '../../../../shared/components/Table'
import Pagination from '../../../../shared/components/Pagination'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Input from '../../../../shared/components/Input'
import Select from '../../../../shared/components/Select'
import { ArrowLeft, MagnifyingGlass, CheckCircle, XCircle, Eye, ClipboardText } from '@phosphor-icons/react'

const STATUS_OPTIONS = ['pending', 'in_review', 'approved', 'rejected'] as const
const TYPE_OPTIONS = ['all', 'individual', 'school'] as const

const AccountRequestsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAdminAuth()
  const isSuperAdmin = !user?.school_id

  const [items, setItems] = useState<AccountRequest[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'pending' | 'in_review' | 'approved' | 'rejected'>('pending')
  const [requestType, setRequestType] = useState<'all' | 'individual' | 'school'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [selected, setSelected] = useState<AccountRequest | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<'in_review' | 'approved' | 'rejected'>('in_review')
  const [reviewNotes, setReviewNotes] = useState('')
  const [createAccount, setCreateAccount] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const hasFilters = !!search || requestType !== 'all' || status !== 'pending'

  const load = async () => {
    if (!isSuperAdmin) return
    setIsLoading(true)
    setError('')
    try {
      const response = await adminApi.accountRequests.getAll({
        status,
        request_type: requestType === 'all' ? undefined : requestType,
        search: search || undefined,
        page,
        page_size: pageSize,
      })
      setItems(response.items || [])
      setTotal(response.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
  }, [search, status, requestType, page, pageSize, isSuperAdmin])

  useEffect(() => {
    setPage(1)
  }, [search, status, requestType])

  const openReview = (request: AccountRequest) => {
    setSelected(request)
    setReviewStatus(request.status === 'pending' ? 'in_review' : request.status)
    setReviewNotes(request.review_notes || '')
    setCreateAccount(false)
    setShowReviewModal(true)
  }

  const submitReview = async () => {
    if (!selected) return
    setIsSaving(true)
    setError('')
    try {
      await adminApi.accountRequests.review(selected.id, {
        status: reviewStatus,
        review_notes: reviewNotes,
        create_account: createAccount,
      })
      setShowReviewModal(false)
      setSelected(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request')
    } finally {
      setIsSaving(false)
    }
  }

  const columns: TableColumn<AccountRequest>[] = useMemo(
    () => [
      {
        key: 'full_name',
        header: 'Requester',
        render: (item) => (
          <div>
            <div className="font-semibold text-app-text">{item.full_name}</div>
            <div className="text-xs text-app-muted">{item.email}</div>
          </div>
        ),
      },
      {
        key: 'request_type',
        header: 'Type',
        render: (item) => (
          <span className="text-xs px-2 py-1 rounded-lg border border-app-border bg-app-card text-app-text capitalize">
            {item.request_type}
          </span>
        ),
      },
      {
        key: 'details',
        header: 'Details',
        render: (item) => (
          <div className="text-xs text-app-muted space-y-1">
            {item.request_type === 'school' ? (
              <>
                <div>{item.school_name || 'School not provided'}</div>
                <div>{[item.city, item.state].filter(Boolean).join(', ') || 'Location not provided'}</div>
              </>
            ) : (
              <>
                <div>{item.standard || 'Class not set'} • {item.board || 'Board not set'}</div>
                <div>{item.stream || 'No stream'} • {item.language || 'Language not set'}</div>
              </>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => {
          const tone =
            item.status === 'approved'
              ? 'text-app-green border-app-green/30 bg-app-green/10'
              : item.status === 'rejected'
              ? 'text-app-red border-app-red/30 bg-app-red/10'
              : item.status === 'in_review'
              ? 'text-app-yellow border-app-yellow/30 bg-app-yellow/10'
              : 'text-app-muted border-app-border bg-app-card'
          return (
            <span className={`text-xs px-2 py-1 rounded-lg border capitalize ${tone}`}>
              {item.status.replace('_', ' ')}
            </span>
          )
        },
      },
      {
        key: 'created_at',
        header: 'Requested',
        render: (item) => (
          <span className="text-xs text-app-muted">
            {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item) => (
          <button
            onClick={() => openReview(item)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-app-green/30 text-app-green bg-app-green/10 hover:bg-app-green/20"
          >
            <Eye size={14} />
            Review
          </button>
        ),
      },
    ],
    []
  )

  if (!isSuperAdmin) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center gap-2 text-sm text-app-muted hover:text-app-text"
        >
          <ArrowLeft size={16} />
          Back to students
        </button>
        <div className="rounded-xl border border-app-border bg-app-card p-6 text-app-muted">
          This page is available to superadmin only.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/students')}
            className="inline-flex items-center gap-2 text-sm text-app-muted hover:text-app-text mb-2"
          >
            <ArrowLeft size={16} />
            Back to students
          </button>
          <h1 className="text-2xl font-black text-app-text">Account Requests</h1>
          <p className="text-sm text-app-muted mt-1">
            {total} requests {hasFilters && '(filtered)'}
          </p>
        </div>
      </div>

      <div className="bg-app-card rounded-xl border border-app-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, school"
              className="w-full bg-app-card2 border border-app-border rounded-xl py-2.5 pl-9 pr-3 text-sm text-app-text"
            />
          </div>

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'pending' | 'in_review' | 'approved' | 'rejected')}
            options={STATUS_OPTIONS}
          />

          <Select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as 'all' | 'individual' | 'school')}
            options={TYPE_OPTIONS}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-app-red bg-app-red/15 border border-app-red/30 rounded-xl py-3 px-4">
          {error}
        </div>
      )}

      <Table
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyMessage="No account requests found"
        keyExtractor={(item) => item.id}
      />

      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Account Request"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl border border-app-border bg-app-card p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-app-text font-semibold">
                <ClipboardText size={16} />
                Request Snapshot
              </div>
              <div className="text-app-muted">Type: <span className="capitalize">{selected.request_type}</span></div>
              <div className="text-app-muted">Name: {selected.full_name}</div>
              <div className="text-app-muted">Email: {selected.email}</div>
              {selected.phone && <div className="text-app-muted">Phone: {selected.phone}</div>}
              {selected.school_name && <div className="text-app-muted">School: {selected.school_name}</div>}
              {selected.message && <div className="text-app-muted">Message: {selected.message}</div>}
            </div>

            <Select
              label="Status"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as 'in_review' | 'approved' | 'rejected')}
              options={['in_review', 'approved', 'rejected']}
            />

            <Input
              label="Review Notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Internal notes or reviewer comments"
            />

            <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
                disabled={reviewStatus !== 'approved'}
              />
              Provision account immediately on approval
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewStatus === 'rejected' ? 'danger' : 'primary'}
                isLoading={isSaving}
                leftIcon={reviewStatus === 'rejected' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                onClick={submitReview}
              >
                Save Decision
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AccountRequestsPage
