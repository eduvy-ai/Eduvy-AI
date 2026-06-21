// ─── Loading Skeleton Component ───────────────────────────────────

import React from 'react'

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title Card Skeleton */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-48 bg-slate-700 rounded-lg" />
          <div className="h-6 w-20 bg-slate-700 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded w-full" />
          <div className="h-4 bg-slate-700 rounded w-5/6" />
          <div className="h-4 bg-slate-700 rounded w-4/6" />
        </div>
      </div>

      {/* Key Takeaways Skeleton */}
      <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
        <div className="h-6 w-36 bg-slate-700 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-700" />
              <div className="h-4 bg-slate-700 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Diagram Skeleton */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="h-6 w-32 bg-slate-700 rounded-lg mb-4" />
        <div className="h-48 bg-slate-700/50 rounded-xl" />
      </div>

      {/* Quiz Skeleton */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <div className="h-6 w-40 bg-slate-700 rounded-lg mb-4" />
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
