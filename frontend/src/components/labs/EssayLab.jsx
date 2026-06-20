import { useState, useEffect } from 'react'
import { callAI, checkStudentQuery } from '../../shared.js'
import { li } from '../../i18n/index.js'
import { getDeviceId, apiGetDraft, apiSaveDraft } from '../../api.js'

const TYPES = ["Essay", "Letter", "Paragraph", "Answer"]

export default function EssayLab({ profile, addXp, onBack }) {
  const deviceId = getDeviceId()
  const [type, setType]         = useState("Essay")
  const [writing, setWriting]   = useState("")
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    apiGetDraft(deviceId, "essay_draft")
      .then(d => {
        if (d) {
          if (d.content) setWriting(d.content)
          if (d.extra) setFeedback(d.extra)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grade = async () => {
    if (!writing.trim() || writing.trim().length < 30) {
      alert("Please write at least 30 characters before grading.")
      return
    }
    const safety = checkStudentQuery(writing, profile)
    if (safety.blocked) { setFeedback(safety.message); return }
    setLoading(true)
    setFeedback("")
    const res = await callAI(
      `Grade this ${type} for a ${profile.standard} ${profile.board} student:\n\n${writing}`,
      "", [], 3, 1200, "essay_grade"
    )
    setFeedback(res)
    apiSaveDraft(deviceId, "essay_draft", writing, res).catch(() => {})
    addXp(8)
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="bg-app-card border-b border-app-border px-4 py-3 flex items-center gap-2.5 shrink-0">
        <button onClick={onBack} className="bg-transparent border-none text-app-muted text-[13px] cursor-pointer p-0">← Back</button>
        <span className="text-[15px] font-extrabold text-app-text">✍️ Essay Grader</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Writing type tabs */}
        <div className="flex bg-app-card rounded-xl p-1 mb-4 border border-app-border gap-0.5">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 border-none rounded-[9px] py-2 px-1 text-xs cursor-pointer font-[Sora,sans-serif] transition-all ${
                type === t
                  ? 'bg-gradient-to-br from-app-blue to-[#5577dd] font-extrabold text-white'
                  : 'bg-transparent font-medium text-app-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="mb-3.5">
          <label className="block text-xs text-app-muted font-semibold mb-2">
            WRITE YOUR {type.toUpperCase()} BELOW
          </label>
          <textarea
            className="w-full bg-app-card2 border border-white/[0.08] rounded-xl py-3 px-3.5 text-app-text text-[13px] outline-none resize-y leading-relaxed"
            style={{ height: 200 }}
            placeholder={`Start writing your ${type.toLowerCase()} here…`}
            value={writing}
            onChange={e => setWriting(e.target.value)}
          />
          <div className="text-[11px] text-app-muted mt-1 text-right">{writing.length} characters</div>
        </div>

        <button
          onClick={grade}
          disabled={loading || writing.trim().length < 30}
          className="w-full py-3 px-4 rounded-xl border-none bg-gradient-to-br from-app-green to-emerald-400 text-app-bg text-[13px] font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {loading ? "Grading…" : "🎓 Grade My Writing"}
        </button>

        {feedback && (
          <div className="mt-4 bg-app-card border border-app-border rounded-[14px] p-4">
            <div className="text-xs text-app-blue font-bold mb-2.5">📋 Examiner's Feedback</div>
            <p className="text-[13px] text-app-text leading-[1.8] whitespace-pre-wrap m-0">{feedback}</p>
          </div>
        )}

        {feedback && (
          <button
            onClick={() => { setWriting(""); setFeedback("") }}
            className="w-full mt-3 py-3 px-4 rounded-xl bg-transparent border border-white/[0.08] text-app-text text-[13px] font-semibold cursor-pointer hover:bg-white/[0.03] transition-all"
          >
            ✍️ Write New
          </button>
        )}
      </div>
    </div>
  )
}
