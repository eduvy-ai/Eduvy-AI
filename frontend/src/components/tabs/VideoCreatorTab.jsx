// VideoCreatorTab.jsx — Golpo-style 5-step whiteboard video wizard
import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../../config'
import {
  apiVideoGenerate,
  apiVideoStatus,
  apiVideoLibrary,
  apiVideoDelete,
  apiVideoShare,
} from '../../api'
import StylePicker from '../video/StylePicker'
import SceneEditor from '../video/SceneEditor'
import VideoPlayer from '../video/VideoPlayer'

const STEPS = ['Input', 'Style', 'Script', 'Generating', 'Done']

const LANGUAGES = [
  'English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil',
  'Telugu', 'Kannada', 'Bengali', 'Punjabi', 'Odia', 'Urdu',
]

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12', 'UG / College', 'General',
]

const TIMINGS = [
  { value: '0.5', label: '~30 seconds' },
  { value: '1', label: '~1 minute' },
  { value: '2', label: '~2 minutes' },
  { value: '4', label: '~4 minutes' },
]

export default function VideoCreatorTab({ profile = null }) {
  const [step, setStep] = useState(0)

  // Step 1 form
  const [topic, setTopic] = useState('')
  const [grade, setGrade] = useState('Grade 9')
  const [subject, setSubject] = useState('')
  const [narrLang, setNarrLang] = useState('English')
  const [onscreenLang, setOnscreenLang] = useState('English')
  const [timing, setTiming] = useState('1')
  const [pacing, setPacing] = useState('normal')

  // Step 2 style
  const [styleVariant, setStyleVariant] = useState('sketch_classic')
  const [orientation, setOrientation] = useState('horizontal')

  // Step 3 — scenes editable
  const [scenes, setScenes] = useState([])
  const [projectTitle, setProjectTitle] = useState('')

  // Step 4 — generation
  const [videoId, setVideoId] = useState(null)
  const [genStatus, setGenStatus] = useState('queued') // queued | processing | done | error
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState(null)
  const pollRef = useRef(null)

  // Step 5 — result
  const [videoData, setVideoData] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)

  // Library
  const [library, setLibrary] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  // Error / busy
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── Step navigation ──────────────────────────────────────────

  function goBack() {
    setError(null)
    if (step > 0) setStep(step - 1)
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────

  function handleStep1Next() {
    if (!topic.trim()) { setError('Please enter a topic.'); return }
    setError(null)
    setStep(1)
  }

  // ── Step 2 → 3 (generate script via AI) ─────────────────────

  async function handleGenerateScript() {
    setLoading(true)
    setError(null)
    try {
      const result = await apiVideoGenerate({
        topic: topic.trim(),
        grade,
        subject: subject.trim() || 'General',
        engine: 'whiteboard',
        style_variant: styleVariant,
        narration_language: narrLang,
        onscreen_language: onscreenLang,
        orientation,
        pacing,
        timing,
        bg_music: false,
        voice_instructions: '',
        enable_captions: true,
      })
      // result: { id, title, script_json, ... }
      const scriptObj = typeof result.script_json === 'string'
        ? JSON.parse(result.script_json)
        : result.script_json
      setScenes(scriptObj?.scenes || [])
      setProjectTitle(scriptObj?.title || topic)
      setVideoId(result.id)
      setStep(2)
    } catch (e) {
      setError(e.message || 'Failed to generate script. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3 → 4 (kick off render) ─────────────────────────────

  async function handleStartRender() {
    setError(null)
    setGenStatus('processing')
    setGenProgress(5)
    setStep(3)
    _startPolling()
  }

  function _startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await apiVideoStatus(videoId)
        const s = status.status
        setGenStatus(s)

        if (s === 'queued') {
          setGenProgress(5)
        }

        if (s === 'rendering' || s === 'processing') {
          const done = status.processed_frames || 0
          const total = status.frame_count || 1
          setGenProgress(Math.max(10, Math.min(90, Math.round((done / total) * 90))))
        }

        if (s === 'done') {
          setGenProgress(100)
          clearInterval(pollRef.current)
          pollRef.current = null
          setVideoData(status)
          setStep(4)
        }

        if (s === 'error') {
          clearInterval(pollRef.current)
          pollRef.current = null
          setGenError(status.error_msg || 'Rendering failed.')
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 3000)
  }

  // cleanup
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Share ────────────────────────────────────────────────────

  async function handleShare() {
    if (!videoId) return
    setShareLoading(true)
    try {
      const res = await apiVideoShare(videoId)
      setShareUrl(res.share_url || res.share_token)
    } catch (e) {
      setError(e.message)
    } finally {
      setShareLoading(false)
    }
  }

  // ── Library ──────────────────────────────────────────────────

  async function loadLibrary() {
    setLibraryLoading(true)
    try {
      const res = await apiVideoLibrary()
      setLibrary(res.videos || [])
    } catch {
      setLibrary([])
    } finally {
      setLibraryLoading(false)
    }
  }

  function toggleLibrary() {
    if (!showLibrary) loadLibrary()
    setShowLibrary((v) => !v)
  }

  async function handleDelete(vid) {
    if (!confirm('Delete this video?')) return
    try {
      await apiVideoDelete(vid)
      setLibrary((prev) => prev.filter((v) => v.id !== vid))
    } catch (e) {
      setError(e.message)
    }
  }

  // ── Reset ────────────────────────────────────────────────────

  function handleNewVideo() {
    if (pollRef.current) clearInterval(pollRef.current)
    setStep(0)
    setTopic('')
    setSubject('')
    setScenes([])
    setVideoId(null)
    setVideoData(null)
    setShareUrl('')
    setGenStatus('queued')
    setGenProgress(0)
    setGenError(null)
    setError(null)
  }

  // ── Scene change handler ─────────────────────────────────────

  function handleSceneChange(idx, updated) {
    setScenes((prev) => {
      const copy = [...prev]
      copy[idx] = updated
      return copy
    })
  }

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-app-bg px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text">🎥 Video Creator</h1>
          <p className="text-sm text-app-muted mt-0.5">
            Create animated whiteboard explainer videos with AI
          </p>
        </div>
        <button
          onClick={toggleLibrary}
          className="text-sm px-3 py-1.5 rounded-lg bg-app-card2 text-app-text border border-app-border hover:bg-white/5 transition-colors"
        >
          📁 My Videos
        </button>
      </div>

      {/* Library panel */}
      {showLibrary && (
        <LibraryPanel
          library={library}
          loading={libraryLoading}
          onDelete={handleDelete}
          onPlay={(v) => {
            setVideoData(v)
            setVideoId(v.id)
            setStep(4)
            setShowLibrary(false)
          }}
        />
      )}

      {/* Progress stepper */}
      <Stepper current={step} />

      {/* Error bar */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-app-red/15 border border-app-red/30 text-app-red text-sm">
          {error}
        </div>
      )}

      {/* Step panels */}
      <div className="mt-6">
        {step === 0 && (
          <StepInput
            topic={topic} setTopic={setTopic}
            grade={grade} setGrade={setGrade}
            subject={subject} setSubject={setSubject}
            narrLang={narrLang} setNarrLang={setNarrLang}
            onscreenLang={onscreenLang} setOnscreenLang={setOnscreenLang}
            timing={timing} setTiming={setTiming}
            pacing={pacing} setPacing={setPacing}
            onNext={handleStep1Next}
          />
        )}

        {step === 1 && (
          <StepStyle
            styleVariant={styleVariant} setStyleVariant={setStyleVariant}
            orientation={orientation} setOrientation={setOrientation}
            loading={loading}
            onBack={goBack}
            onNext={handleGenerateScript}
          />
        )}

        {step === 2 && (
          <StepScript
            title={projectTitle}
            scenes={scenes}
            onSceneChange={handleSceneChange}
            onBack={goBack}
            onNext={handleStartRender}
          />
        )}

        {step === 3 && (
          <StepGenerating
            status={genStatus}
            progress={genProgress}
            error={genError}
            onRetry={handleNewVideo}
          />
        )}

        {step === 4 && (
          <StepDone
            videoData={videoData}
            shareUrl={shareUrl}
            shareLoading={shareLoading}
            onShare={handleShare}
            onNewVideo={handleNewVideo}
          />
        )}
      </div>
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors
              ${i < current ? 'bg-app-green text-app-bg'
                : i === current ? 'bg-app-green text-app-bg ring-2 ring-app-green/40'
                : 'bg-app-card2 text-app-muted border border-app-border'}
            `}
          >
            {i < current ? '✓' : i + 1}
          </div>
          <span
            className={`hidden sm:block ml-1 text-xs font-medium ${
              i === current ? 'text-app-green' : 'text-app-muted'
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                i < current ? 'bg-app-green' : 'bg-app-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Input ──────────────────────────────────────────────

function StepInput({ topic, setTopic, grade, setGrade, subject, setSubject,
  narrLang, setNarrLang, onscreenLang, setOnscreenLang,
  timing, setTiming, pacing, setPacing, onNext }) {
  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-bold text-app-text">What should the video explain?</h2>

      <div>
        <label className="label">Topic *</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          className="input-base resize-none"
          placeholder="e.g. Newton's three laws of motion with examples"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="input-base"
          >
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Physics"
            className="input-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Narration Language</label>
          <select
            value={narrLang}
            onChange={(e) => setNarrLang(e.target.value)}
            className="input-base"
          >
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">On-screen Text Language</label>
          <select
            value={onscreenLang}
            onChange={(e) => setOnscreenLang(e.target.value)}
            className="input-base"
          >
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Video Length</label>
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            className="input-base"
          >
            {TIMINGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Pacing</label>
          <select
            value={pacing}
            onChange={(e) => setPacing(e.target.value)}
            className="input-base"
          >
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>
      </div>

      <button onClick={onNext} className="btn-primary">
        Next: Choose Style →
      </button>
    </div>
  )
}

// ── Step 2: Style ─────────────────────────────────────────────

function StepStyle({ styleVariant, setStyleVariant, orientation, setOrientation, loading, onBack, onNext }) {
  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-bold text-app-text">Choose a visual style</h2>

      <StylePicker value={styleVariant} onChange={setStyleVariant} />

      <div>
        <label className="label mb-2">Orientation</label>
        <div className="flex gap-3">
          {[{ val: 'horizontal', label: '⬛ Landscape (16:9)', desc: 'Best for desktop / YouTube' },
            { val: 'vertical', label: '📱 Portrait (9:16)', desc: 'Best for Reels / Shorts' }].map((o) => (
            <button
              key={o.val}
              onClick={() => setOrientation(o.val)}
              className={`flex-1 text-left rounded-xl border-2 p-3 transition-all ${
                orientation === o.val
                  ? 'border-app-green bg-app-green/10'
                  : 'border-app-border bg-app-card2 hover:border-app-green/40'
              }`}
            >
              <div className="text-sm font-medium text-app-text">{o.label}</div>
              <div className="text-xs text-app-muted mt-0.5">{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 btn-secondary py-3"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-[2] btn-primary disabled:opacity-60"
        >
          {loading ? '✨ Generating script…' : 'Generate Script →'}
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Script review ────────────────────────────────────

function StepScript({ title, scenes, onSceneChange, onBack, onNext }) {
  return (
    <div className="space-y-4">
      <div className="bg-app-card border border-app-border rounded-2xl p-5">
        <h2 className="text-lg font-bold text-app-text mb-1">Review your script</h2>
        {title && <p className="text-sm text-app-green font-medium">{title}</p>}
        <p className="text-xs text-app-muted mt-1">
          {scenes.length} scenes · Edit narration if needed, then start rendering.
        </p>
      </div>

      <div className="space-y-2">
        {scenes.map((scene, i) => (
          <SceneEditor key={i} scene={scene} index={i} onChange={onSceneChange} />
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex-1 btn-secondary py-3">← Back</button>
        <button onClick={onNext} className="flex-[2] btn-primary">🎬 Start Rendering →</button>
      </div>
    </div>
  )
}

// ── Step 4: Generating ────────────────────────────────────────

function StepGenerating({ status, progress, error, onRetry }) {
  const statusLabels = {
    queued: 'In queue…',
    processing: 'Rendering frames…',
    done: 'Finalizing…',
    error: 'Something went wrong',
  }
  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-8 text-center space-y-5">
      {error ? (
        <>
          <div className="text-4xl">😔</div>
          <h2 className="text-lg font-bold text-app-red">Rendering failed</h2>
          <p className="text-sm text-app-muted">{error}</p>
          <button onClick={onRetry} className="btn-primary px-6 w-auto">
            Try Again
          </button>
        </>
      ) : (
        <>
          <div className="text-4xl animate-spin">⚙️</div>
          <h2 className="text-lg font-bold text-app-text">
            {statusLabels[status] || 'Processing…'}
          </h2>
          <p className="text-sm text-app-muted">
            Your video is being generated. This usually takes 1–3 minutes.
          </p>
          <div className="w-full bg-app-card2 rounded-full h-3 overflow-hidden border border-app-border">
            <div
              className="h-3 bg-app-green rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-app-muted">{progress}% complete</p>
        </>
      )}
    </div>
  )
}

// ── Step 5: Done ──────────────────────────────────────────────

function StepDone({ videoData, shareUrl, shareLoading, onShare, onNewVideo }) {
  const videoUrl = videoData?.file_path
    ? `${API_BASE_URL}${videoData.file_path.replace(/\\/g, '/')}`
    : null
  const thumbUrl = videoData?.thumb_path
    ? `${API_BASE_URL}${videoData.thumb_path.replace(/\\/g, '/')}`
    : null

  return (
    <div className="space-y-5">
      <div className="bg-app-card border border-app-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-app-text">🎉 Your video is ready!</h2>
          <button
            onClick={onNewVideo}
            className="text-sm px-3 py-1.5 bg-app-green/15 text-app-green rounded-lg hover:bg-app-green/25 transition-colors border border-app-green/30"
          >
            + New Video
          </button>
        </div>
        {videoData?.title && (
          <p className="text-sm font-medium text-app-green mb-4">{videoData.title}</p>
        )}
        <VideoPlayer
          videoUrl={videoUrl}
          thumbUrl={thumbUrl}
          title={videoData?.title}
          shareUrl={shareUrl}
          onShare={shareLoading ? null : onShare}
        />
      </div>
    </div>
  )
}

// ── Library Panel ─────────────────────────────────────────────

function LibraryPanel({ library, loading, onDelete, onPlay }) {
  if (loading) {
    return (
      <div className="mb-6 bg-app-card border border-app-border rounded-2xl p-5 text-sm text-app-muted">
        Loading your videos…
      </div>
    )
  }

  if (!library.length) {
    return (
      <div className="mb-6 bg-app-card border border-app-border rounded-2xl p-5 text-sm text-app-muted text-center">
        No videos yet. Create your first one!
      </div>
    )
  }

  return (
    <div className="mb-6 bg-app-card border border-app-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-app-border text-sm font-semibold text-app-text">
        My Videos ({library.length})
      </div>
      <div className="divide-y divide-app-border max-h-64 overflow-y-auto">
        {library.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-3">
            {v.thumb_path ? (
              <img
                src={`${API_BASE_URL}${v.thumb_path.replace(/\\/g, '/')}`}
                alt="thumb"
                className="w-14 h-10 object-cover rounded-lg shrink-0 bg-app-card2"
              />
            ) : (
              <div className="w-14 h-10 rounded-lg bg-app-card2 flex items-center justify-center text-lg shrink-0 border border-app-border">
                🎬
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-app-text truncate">{v.title || v.id}</p>
              <p className="text-xs text-app-muted capitalize">{v.status}</p>
            </div>
            <button
              onClick={() => onPlay(v)}
              className="text-xs px-2 py-1 bg-app-green text-app-bg rounded-lg hover:opacity-80 transition-colors font-semibold"
            >
              ▶ Play
            </button>
            <button
              onClick={() => onDelete(v.id)}
              className="text-xs px-2 py-1 bg-app-red/20 text-app-red rounded-lg hover:bg-app-red/30 transition-colors"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
