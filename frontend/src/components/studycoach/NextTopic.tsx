// ─── Next Topic Card ───────────────────────────────────

import React from 'react'

interface NextTopicProps {
  topic: string
  onExplore: () => void
}

export default function NextTopic({ topic, onExplore }: NextTopicProps) {
  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-2xl">🚀</span>
        Next Up
      </h3>
      <p className="text-slate-300 mb-4">{topic}</p>
      <button
        onClick={onExplore}
        className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
      >
        Explore This Topic
      </button>
    </div>
  )
}
