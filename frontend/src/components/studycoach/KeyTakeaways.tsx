// ─── Key Takeaways Card ───────────────────────────────────

import React from 'react'

interface KeyTakeawaysProps {
  takeaways: string[]
}

export default function KeyTakeaways({ takeaways }: KeyTakeawaysProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💡</span>
        Key Takeaways
      </h3>
      <ul className="space-y-3">
        {takeaways.map((takeaway, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-slate-300">{takeaway}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
