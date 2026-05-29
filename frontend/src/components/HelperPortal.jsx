import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function HelperPortal() {
  const { token } = useParams()
  const [helperInfo, setHelperInfo] = useState(null)
  const [students, setStudents]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [noteText, setNoteText]     = useState({})
  const [sending, setSending]       = useState({})
  const [sent, setSent]             = useState({})

  const headers = { 'X-Helper-Token': token }

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch('/api/helper/me', { headers })
        if (!me.ok) { setError('Invalid or expired helper token.'); setLoading(false); return }
        const meData = await me.json()
        setHelperInfo(meData)
        const st = await fetch('/api/helper/students', { headers })
        const stData = await st.json()
        setStudents(Array.isArray(stData) ? stData : [])
      } catch {
        setError('Could not connect to server. Please try again.')
      }
      setLoading(false)
    }
    load()
  }, [token])

  const sendNote = async (studentId) => {
    const msg = (noteText[studentId] || '').trim()
    if (!msg) return
    setSending(s => ({ ...s, [studentId]: true }))
    try {
      const r = await fetch('/api/helper/notes', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, message: msg }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to send') }
      setNoteText(n => ({ ...n, [studentId]: '' }))
      setSent(s => ({ ...s, [studentId]: true }))
      setTimeout(() => setSent(s => ({ ...s, [studentId]: false })), 3000)
    } catch (e) {
      alert(e.message)
    }
    setSending(s => ({ ...s, [studentId]: false }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-app-muted text-base">Loading�</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">??</div>
          <h2 className="text-app-red text-lg font-extrabold mb-2">Access Denied</h2>
          <p className="text-app-muted text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div className="bg-app-card border-b border-app-border px-6 py-4">
        <div className="max-w-[800px] mx-auto flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-app-blue/[0.13] flex items-center justify-center text-[22px] shrink-0">???</div>
          <div>
            <h1 className="text-app-text text-lg font-extrabold m-0">Drishti Helper Portal</h1>
            <p className="text-app-muted text-[13px] m-0">
              {helperInfo?.helper_name} � {helperInfo?.helper_type}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-4 py-6">
        <p className="text-app-muted text-[13px] mb-5">
          You are supporting <strong className="text-app-text font-bold">{students.length}</strong> student{students.length !== 1 ? 's' : ''}. Send them encouraging notes to keep them motivated.
        </p>

        {students.length === 0 && (
          <div className="text-center p-12 bg-app-card rounded-2xl border border-app-border">
            <div className="text-[40px] mb-3">??</div>
            <p className="text-app-muted text-sm m-0">No students assigned yet.</p>
            <p className="text-app-muted text-xs mt-2">Contact your admin to get students assigned to you.</p>
          </div>
        )}

        {students.map(s => (
          <div key={s.id} className="bg-app-card border border-app-border rounded-2xl px-5 py-[18px] mb-3.5">
            {/* Student info */}
            <div className="flex items-start justify-between mb-3.5 flex-wrap gap-2">
              <div>
                <h3 className="text-app-text text-base font-bold m-0 mb-1">{s.name}</h3>
                <p className="text-app-muted text-xs m-0">Class {s.standard} � {s.board} � {s.language}</p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="text-center bg-app-yellow/[0.08] px-3 py-1.5 rounded-[10px]">
                  <p className="text-app-yellow font-extrabold text-base m-0">{s.xp || 0}</p>
                  <p className="text-app-muted text-[10px] m-0">XP</p>
                </div>
                <div className="text-center bg-app-orange/[0.08] px-3 py-1.5 rounded-[10px]">
                  <p className="text-app-orange font-extrabold text-base m-0">{s.streak || 0}</p>
                  <p className="text-app-muted text-[10px] m-0">Streak</p>
                </div>
              </div>
            </div>

            {/* Recent topics */}
            {s.recent_topics?.length > 0 && (
              <div className="mb-3.5">
                <p className="text-app-muted text-[11px] font-bold tracking-[0.05em] mb-1.5">RECENT TOPICS</p>
                <div className="flex gap-1.5 flex-wrap">
                  {s.recent_topics.slice(0, 5).map((t, i) => (
                    <span key={i} className="bg-app-blue/[0.09] border border-app-blue/30 text-app-blue text-[11px] rounded-lg px-2.5 py-0.5">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Send note */}
            <div>
              <p className="text-app-muted text-[11px] font-bold tracking-[0.05em] mb-1.5">SEND ENCOURAGEMENT NOTE</p>
              <div className="flex gap-2 items-start">
                <textarea
                  value={noteText[s.id] || ''}
                  onChange={e => setNoteText(n => ({ ...n, [s.id]: e.target.value }))}
                  placeholder={`Write an encouraging message for ${s.name}�`}
                  maxLength={500}
                  rows={2}
                  className="flex-1 bg-app-card2 border border-app-border rounded-[10px] py-2.5 px-3.5 text-app-text text-[13px] resize-y outline-none focus:ring-1 focus:ring-app-green/30 transition-all"
                />
                <button
                  onClick={() => sendNote(s.id)}
                  disabled={sending[s.id] || !noteText[s.id]?.trim()}
                  className={`shrink-0 rounded-[10px] px-[18px] py-2.5 text-[13px] font-extrabold border-none cursor-pointer transition-all duration-150 ${
                    sending[s.id] || !noteText[s.id]?.trim()
                      ? 'bg-app-card2 text-app-muted cursor-not-allowed'
                      : 'bg-gradient-to-br from-app-green to-emerald-400 text-app-bg hover:opacity-90 active:scale-95'
                  }`}
                >
                  {sending[s.id] ? '�' : sent[s.id] ? '? Sent!' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ))}

        <p className="text-center text-app-muted text-[11px] mt-8 opacity-60">
          Eduvy-AI Drishti Portal � Read-only helper access
        </p>
      </div>
    </div>
  )
}