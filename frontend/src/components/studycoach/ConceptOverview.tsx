// ─── Concept Overview Card ───────────────────────────────────



interface ConceptOverviewProps {
  title: string
  difficulty: string
  overview: string
}

const difficultyColors: Record<string, string> = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function ConceptOverview({ title, difficulty, overview }: ConceptOverviewProps) {
  const difficultyClass = difficultyColors[difficulty] || difficultyColors.Intermediate

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyClass}`}>
          {difficulty}
        </span>
      </div>
      <div className="prose prose-invert prose-slate max-w-none">
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{overview}</p>
      </div>
    </div>
  )
}
