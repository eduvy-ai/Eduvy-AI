// ─── Exam Notes Card ───────────────────────────────────────

import React from 'react'

interface ExamNotesProps {
  notes: string[]
}

export default function ExamNotes({ notes }: ExamNotesProps) {
  return (
    <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl p-6 border border-orange-500/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">📝</span>
        Exam Tips & Notes
      </h3>
      <ul className="space-y-3">
        {notes.map((note, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center">
              !
            </span>
            <span className="text-slate-300">{note}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
