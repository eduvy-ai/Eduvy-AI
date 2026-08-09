// ─── Media Library Page ──────────────────────────────────
// Manage media files (images, videos, audio, documents)

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import Modal from '../../../../shared/components/Modal'
import Button from '../../../../shared/components/Button'
import Loader from '../../../../shared/components/Loader'
import { useMedia, useChapters } from '../../hooks'
import { mediaApi } from '../../api'
import type { MediaFile, MediaType, MediaCreate } from '../../types'
import {
  Image,
  Video,
  FileAudio,
  FileDoc,
  Trash,
  MagnifyingGlass,
  Funnel,
  CloudArrowUp,
  Eye,
  Copy,
  GridFour,
  List,
  Play,
  Pencil,
  Link,
} from '@phosphor-icons/react'

// Default form state
const defaultFormState: MediaCreate = {
  name: '',
  type: 'image' as MediaType,
  url: '',
  thumbnail_url: '',
  size_bytes: 0,
  duration_sec: undefined,
  dimensions: '',
  subject_id: undefined,
  chapter_id: undefined,
}

const MediaPage: React.FC = () => {
  const { media, total, isLoading, fetchMedia } = useMedia()
  const { chapters, fetchChapters } = useChapters()
  
  // List state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaFile | null>(null)
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<MediaCreate>(defaultFormState)

  // Refs to prevent duplicate fetches
  const chaptersLoadedRef = useRef(false)
  const lastFetchParamsRef = useRef<string>('')

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load chapters once on mount
  useEffect(() => {
    if (!chaptersLoadedRef.current) {
      chaptersLoadedRef.current = true
      fetchChapters()
    }
  }, [fetchChapters])

  // Load media with filters
  useEffect(() => {
    const params: Record<string, unknown> = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }
    if (typeFilter !== 'all') params.type = typeFilter
    if (chapterFilter !== 'all') params.chapter_id = parseInt(chapterFilter)
    if (searchQuery) params.search = searchQuery
    
    // Dedupe by comparing serialized params
    const paramsKey = JSON.stringify(params)
    if (paramsKey === lastFetchParamsRef.current) return
    lastFetchParamsRef.current = paramsKey
    
    fetchMedia(params)
  }, [page, pageSize, typeFilter, chapterFilter, searchQuery, fetchMedia])

  // Refetch helper - resets the guard to force a fresh fetch
  const refetchMedia = () => {
    lastFetchParamsRef.current = ''
    fetchMedia({ limit: pageSize, offset: (page - 1) * pageSize })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} files?`)) return
    
    try {
      await mediaApi.bulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      refetchMedia()
    } catch (error) {
      console.error('Failed to delete files:', error)
      alert('Failed to delete files')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return
    try {
      await mediaApi.delete(id)
      refetchMedia()
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file')
    }
  }

  // Open create modal
  const handleCreate = () => {
    setEditingMedia(null)
    setFormData(defaultFormState)
    setFormError('')
    setShowModal(true)
  }

  // Open edit modal
  const handleEdit = (item: MediaFile) => {
    setEditingMedia(item)
    setFormData({
      name: item.name,
      type: item.type,
      url: item.url,
      thumbnail_url: item.thumbnail_url || '',
      size_bytes: item.size_bytes,
      duration_sec: item.duration_sec,
      dimensions: item.dimensions || '',
      subject_id: item.subject_id,
      chapter_id: item.chapter_id,
    })
    setFormError('')
    setShowModal(true)
  }

  // Preview media
  const handlePreview = (item: MediaFile) => {
    setPreviewMedia(item)
    setShowPreviewModal(true)
  }

  // Copy URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('URL copied to clipboard!')
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validation
    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (!formData.url.trim()) {
      setFormError('URL is required')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingMedia) {
        await mediaApi.update(editingMedia.id, formData)
      } else {
        await mediaApi.create(formData)
      }
      
      setShowModal(false)
      refetchMedia()
    } catch (error: any) {
      setFormError(error.message || 'Failed to save media')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = (type: MediaType) => {
    const icons = {
      image: <Image size={20} className="text-app-green" />,
      video: <Video size={20} className="text-app-blue" />,
      audio: <FileAudio size={20} className="text-app-purple" />,
      document: <FileDoc size={20} className="text-app-yellow" />,
    }
    return icons[type] || icons.document
  }

  // Stats
  const stats = useMemo(() => ({
    images: media.filter(f => f.type === 'image').length,
    videos: media.filter(f => f.type === 'video').length,
    audio: media.filter(f => f.type === 'audio').length,
    documents: media.filter(f => f.type === 'document').length,
    totalSize: media.reduce((acc, f) => acc + f.size_bytes, 0),
  }), [media])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-app-text flex items-center gap-2">
            <Image size={28} className="text-app-green" />
            Media Library
          </h1>
          <p className="text-sm text-app-muted mt-1">
            Manage images, videos, audio, and documents
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <CloudArrowUp size={16} />
          Add Media
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{total}</p>
          <p className="text-xs text-app-muted">Total Files</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-green">{stats.images}</p>
          <p className="text-xs text-app-muted">Images</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-blue">{stats.videos}</p>
          <p className="text-xs text-app-muted">Videos</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-purple">{stats.audio}</p>
          <p className="text-xs text-app-muted">Audio</p>
        </div>
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-yellow">{formatSize(stats.totalSize)}</p>
          <p className="text-xs text-app-muted">Total Size</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
          />
        </div>
        <div className="relative">
          <Funnel size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
        </div>
        <select
          value={chapterFilter}
          onChange={e => { setChapterFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
        >
          <option value="all">All Chapters</option>
          {chapters.map(ch => (
            <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 bg-app-card border border-app-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-app-green/20 text-app-green' : 'text-app-muted hover:text-app-text'}`}
          >
            <GridFour size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-app-green/20 text-app-green' : 'text-app-muted hover:text-app-text'}`}
          >
            <List size={16} />
          </button>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Media Grid/List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          No media files found. {total === 0 && 'Add your first file to get started.'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {media.map(item => (
            <div
              key={item.id}
              className="bg-app-card rounded-xl border border-app-border overflow-hidden hover:border-app-green/50 transition-colors group"
            >
              <div className="relative aspect-square">
                {item.type === 'image' ? (
                  <img src={item.thumbnail_url || item.url} alt={item.name} className="w-full h-full object-cover" />
                ) : item.type === 'video' ? (
                  <div className="w-full h-full bg-app-card2 flex items-center justify-center">
                    <Play size={32} className="text-app-blue" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-app-card2 flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                )}
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="absolute top-2 left-2 rounded border-app-border"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handlePreview(item)} className="p-2 bg-app-blue rounded-full text-white">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEdit(item)} className="p-2 bg-app-green rounded-full text-white">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 bg-app-red rounded-full text-white">
                    <Trash size={14} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-app-text font-medium truncate">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-app-muted">{formatSize(item.size_bytes)}</span>
                  {item.duration_sec && (
                    <span className="text-xs text-app-muted">{formatDuration(item.duration_sec)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {media.map(item => (
            <div
              key={item.id}
              className="bg-app-card rounded-xl border border-app-border p-4 flex items-center gap-4 hover:border-app-green/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="rounded border-app-border"
              />
              <div className="w-12 h-12 rounded-lg bg-app-card2 flex items-center justify-center overflow-hidden">
                {item.type === 'image' ? (
                  <img src={item.thumbnail_url || item.url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  getTypeIcon(item.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-app-text font-medium truncate">{item.name}</p>
                <p className="text-xs text-app-muted">
                  {formatSize(item.size_bytes)}
                  {item.duration_sec && ` • ${formatDuration(item.duration_sec)}`}
                  {item.chapter_name && ` • ${item.chapter_name}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleCopyUrl(item.url)} className="p-1.5 text-app-muted hover:text-app-text hover:bg-app-card2 rounded-lg">
                  <Copy size={14} />
                </button>
                <button onClick={() => handlePreview(item)} className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg">
                  <Eye size={14} />
                </button>
                <button onClick={() => handleEdit(item)} className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg">
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMedia ? 'Edit Media' : 'Add Media'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-app-red/10 border border-app-red/25 rounded-lg text-sm text-app-red">
              {formError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter file name..."
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as MediaType }))}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Document</option>
            </select>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">URL *</label>
            <div className="relative">
              <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
              <input
                type="url"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="w-full pl-9 pr-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
              />
            </div>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Thumbnail URL</label>
            <input
              type="url"
              value={formData.thumbnail_url || ''}
              onChange={e => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
            />
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Chapter (optional)</label>
            <select
              value={formData.chapter_id || ''}
              onChange={e => setFormData(prev => ({ ...prev, chapter_id: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text focus:outline-none focus:border-app-green"
            >
              <option value="">No chapter</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.chapter_name}</option>
              ))}
            </select>
          </div>

          {/* Duration (for video/audio) */}
          {(formData.type === 'video' || formData.type === 'audio') && (
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Duration (seconds)</label>
              <input
                type="number"
                value={formData.duration_sec || ''}
                onChange={e => setFormData(prev => ({ ...prev, duration_sec: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="0"
                min={0}
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
              />
            </div>
          )}

          {/* Dimensions (for images/videos) */}
          {(formData.type === 'image' || formData.type === 'video') && (
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Dimensions</label>
              <input
                type="text"
                value={formData.dimensions || ''}
                onChange={e => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                placeholder="1920x1080"
                className="w-full px-3 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-green"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingMedia ? 'Update Media' : 'Add Media'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Media Preview"
        size="lg"
      >
        {previewMedia && (
          <div className="space-y-4">
            <div className="aspect-video bg-app-card2 rounded-lg overflow-hidden flex items-center justify-center">
              {previewMedia.type === 'image' ? (
                <img src={previewMedia.url} alt={previewMedia.name} className="max-w-full max-h-full object-contain" />
              ) : previewMedia.type === 'video' ? (
                <video src={previewMedia.url} controls className="max-w-full max-h-full" />
              ) : previewMedia.type === 'audio' ? (
                <audio src={previewMedia.url} controls className="w-full" />
              ) : (
                <div className="text-center">
                  <FileDoc size={48} className="text-app-yellow mx-auto mb-2" />
                  <a href={previewMedia.url} target="_blank" rel="noopener noreferrer" className="text-app-blue hover:underline">
                    Open Document
                  </a>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-app-muted">Name</p>
                <p className="text-app-text font-medium">{previewMedia.name}</p>
              </div>
              <div>
                <p className="text-app-muted">Type</p>
                <p className="text-app-text font-medium capitalize">{previewMedia.type}</p>
              </div>
              <div>
                <p className="text-app-muted">Size</p>
                <p className="text-app-text font-medium">{formatSize(previewMedia.size_bytes)}</p>
              </div>
              {previewMedia.duration_sec && (
                <div>
                  <p className="text-app-muted">Duration</p>
                  <p className="text-app-text font-medium">{formatDuration(previewMedia.duration_sec)}</p>
                </div>
              )}
              {previewMedia.dimensions && (
                <div>
                  <p className="text-app-muted">Dimensions</p>
                  <p className="text-app-text font-medium">{previewMedia.dimensions}</p>
                </div>
              )}
              <div>
                <p className="text-app-muted">Used</p>
                <p className="text-app-text font-medium">{previewMedia.usage_count} times</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
              <Button variant="ghost" onClick={() => handleCopyUrl(previewMedia.url)}>
                <Copy size={14} className="mr-1" /> Copy URL
              </Button>
              <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MediaPage
