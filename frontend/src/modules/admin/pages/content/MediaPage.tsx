// ─── Media Library Page ──────────────────────────────────
// Manage media files (images, videos, audio)

import React, { useEffect, useState, useCallback } from 'react'
import Pagination from '../../../../shared/components/Pagination'
import {
  Image,
  Video,
  FileAudio,
  Trash,
  MagnifyingGlass,
  Funnel,
  Download,
  CloudArrowUp,
  Eye,
  Copy,
  GridFour,
  List,
  Play,
  Warning,
} from '@phosphor-icons/react'

interface MediaFile {
  id: string
  name: string
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail?: string
  size: number
  duration?: number // for video/audio in seconds
  dimensions?: { width: number; height: number }
  subject?: string
  chapter?: string
  uploaded_at: string
  uploaded_by?: string
  usage_count: number
}

const MediaPage: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  const [totalCount, setTotalCount] = useState(0)

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

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call
      const mockFiles: MediaFile[] = [
        {
          id: '1',
          name: 'algebra_intro.mp4',
          type: 'video',
          url: '/media/videos/algebra_intro.mp4',
          thumbnail: '/media/thumbs/algebra_intro.jpg',
          size: 45678900,
          duration: 324,
          dimensions: { width: 1920, height: 1080 },
          subject: 'Mathematics',
          chapter: 'Algebra',
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'admin@eduvy.ai',
          usage_count: 156,
        },
        {
          id: '2',
          name: 'photosynthesis_diagram.png',
          type: 'image',
          url: '/media/images/photosynthesis_diagram.png',
          size: 1234567,
          dimensions: { width: 1200, height: 800 },
          subject: 'Science',
          chapter: 'Life Processes',
          uploaded_at: new Date().toISOString(),
          usage_count: 89,
        },
        {
          id: '3',
          name: 'chemical_reactions_lecture.mp3',
          type: 'audio',
          url: '/media/audio/chemical_reactions_lecture.mp3',
          size: 12345678,
          duration: 1245,
          subject: 'Science',
          chapter: 'Chemical Reactions',
          uploaded_at: new Date().toISOString(),
          usage_count: 234,
        },
        {
          id: '4',
          name: 'quadratic_equations.mp4',
          type: 'video',
          url: '/media/videos/quadratic_equations.mp4',
          thumbnail: '/media/thumbs/quadratic_equations.jpg',
          size: 67890123,
          duration: 456,
          dimensions: { width: 1920, height: 1080 },
          subject: 'Mathematics',
          chapter: 'Polynomials',
          uploaded_at: new Date().toISOString(),
          usage_count: 198,
        },
        {
          id: '5',
          name: 'human_heart.jpg',
          type: 'image',
          url: '/media/images/human_heart.jpg',
          size: 2345678,
          dimensions: { width: 1500, height: 1000 },
          subject: 'Science',
          chapter: 'Life Processes',
          uploaded_at: new Date().toISOString(),
          usage_count: 312,
        },
        {
          id: '6',
          name: 'periodic_table.png',
          type: 'image',
          url: '/media/images/periodic_table.png',
          size: 3456789,
          dimensions: { width: 2000, height: 1200 },
          subject: 'Science',
          chapter: 'Elements',
          uploaded_at: new Date().toISOString(),
          usage_count: 456,
        },
      ]

      setFiles(mockFiles)
      setTotalCount(120)
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, typeFilter, searchQuery])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getTypeIcon = (type: MediaFile['type']) => {
    const icons = {
      image: <Image size={20} className="text-app-green" />,
      video: <Video size={20} className="text-app-blue" />,
      audio: <FileAudio size={20} className="text-app-purple" />,
    }
    return icons[type]
  }

  const stats = {
    total: files.length,
    images: files.filter(f => f.type === 'image').length,
    videos: files.filter(f => f.type === 'video').length,
    audio: files.filter(f => f.type === 'audio').length,
    totalSize: files.reduce((acc, f) => acc + f.size, 0),
  }

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
            Manage images, videos, and audio files
          </p>
        </div>
        <button
          onClick={() => alert('Upload media')}
          className="px-4 py-2 text-sm text-white bg-app-green rounded-lg hover:bg-app-green/80 transition-colors flex items-center gap-2"
        >
          <CloudArrowUp size={16} />
          Upload
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-app-card rounded-xl border border-app-border p-4">
          <p className="text-2xl font-bold text-app-text">{totalCount}</p>
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
            onChange={e => setTypeFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-app-card border border-app-border rounded-lg text-sm text-app-text appearance-none cursor-pointer focus:outline-none focus:border-app-green"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center bg-app-card border border-app-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-app-green text-white' : 'text-app-muted hover:text-app-text'}`}
          >
            <GridFour size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-app-green text-white' : 'text-app-muted hover:text-app-text'}`}
          >
            <List size={16} />
          </button>
        </div>
        
        {selectedIds.size > 0 && (
          <button
            onClick={() => alert('Delete selected')}
            className="px-3 py-2 text-sm text-app-red bg-app-red/10 border border-app-red/25 rounded-lg hover:bg-app-red/20 transition-colors flex items-center gap-1"
          >
            <Trash size={14} />
            Delete {selectedIds.size}
          </button>
        )}
      </div>

      {/* Files Display */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-app-green border-t-transparent rounded-full" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          No files found
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {files.map(file => (
            <div
              key={file.id}
              className={`bg-app-card rounded-xl border overflow-hidden transition-colors ${
                selectedIds.has(file.id) ? 'border-app-green' : 'border-app-border hover:border-app-border/80'
              }`}
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-video bg-app-card2 flex items-center justify-center cursor-pointer"
                onClick={() => toggleSelect(file.id)}
              >
                {file.type === 'image' ? (
                  <Image size={40} className="text-app-green/50" />
                ) : file.type === 'video' ? (
                  <>
                    <Video size={40} className="text-app-blue/50" />
                    {file.duration && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded">
                        {formatDuration(file.duration)}
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={32} weight="fill" className="text-white/80" />
                    </div>
                  </>
                ) : (
                  <FileAudio size={40} className="text-app-purple/50" />
                )}
                
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(file.id)}
                    onChange={() => toggleSelect(file.id)}
                    className="rounded border-app-border"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
              
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-app-text truncate">{file.name}</p>
                <div className="flex items-center justify-between mt-1 text-xs text-app-muted">
                  <span>{formatSize(file.size)}</span>
                  <span>Used {file.usage_count}×</span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center border-t border-app-border">
                <button
                  onClick={() => alert('Preview')}
                  className="flex-1 p-2 text-app-blue hover:bg-app-blue/10 transition-colors"
                  title="Preview"
                >
                  <Eye size={14} className="mx-auto" />
                </button>
                <button
                  onClick={() => alert('Copy URL')}
                  className="flex-1 p-2 text-app-muted hover:bg-app-card2 transition-colors border-l border-app-border"
                  title="Copy URL"
                >
                  <Copy size={14} className="mx-auto" />
                </button>
                <button
                  onClick={() => alert('Download')}
                  className="flex-1 p-2 text-app-green hover:bg-app-green/10 transition-colors border-l border-app-border"
                  title="Download"
                >
                  <Download size={14} className="mx-auto" />
                </button>
                <button
                  onClick={() => alert('Delete')}
                  className="flex-1 p-2 text-app-red hover:bg-app-red/10 transition-colors border-l border-app-border"
                  title="Delete"
                >
                  <Trash size={14} className="mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-app-card rounded-xl border border-app-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-app-border text-left">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedIds.size === files.length}
                    onChange={() => {
                      if (selectedIds.size === files.length) {
                        setSelectedIds(new Set())
                      } else {
                        setSelectedIds(new Set(files.map(f => f.id)))
                      }
                    }}
                    className="rounded border-app-border"
                  />
                </th>
                <th className="p-3 text-xs font-semibold text-app-muted uppercase">File</th>
                <th className="p-3 text-xs font-semibold text-app-muted uppercase">Type</th>
                <th className="p-3 text-xs font-semibold text-app-muted uppercase">Size</th>
                <th className="p-3 text-xs font-semibold text-app-muted uppercase">Used</th>
                <th className="p-3 text-xs font-semibold text-app-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} className="border-b border-app-border/50 hover:bg-app-card2 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded border-app-border"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(file.type)}
                      <div>
                        <p className="font-medium text-app-text">{file.name}</p>
                        <p className="text-xs text-app-muted">
                          {file.subject && `${file.subject}`}
                          {file.chapter && ` • ${file.chapter}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted capitalize">{file.type}</span>
                    {file.duration && (
                      <span className="text-xs text-app-muted ml-2">
                        ({formatDuration(file.duration)})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted">{formatSize(file.size)}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-app-muted">{file.usage_count}×</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alert('Preview')}
                        className="p-1.5 text-app-blue hover:bg-app-blue/10 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => alert('Download')}
                        className="p-1.5 text-app-green hover:bg-app-green/10 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => alert('Delete')}
                        className="p-1.5 text-app-red hover:bg-app-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalCount / pageSize)}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[12, 24, 48, 96]}
      />

      {/* Info Note */}
      <div className="p-4 bg-app-blue/10 border border-app-blue/25 rounded-xl text-sm text-app-muted">
        <p className="font-medium text-app-blue mb-1">Note</p>
        <p>Media library endpoint not yet implemented. Showing mock data for UI preview.</p>
      </div>
    </div>
  )
}

export default MediaPage
