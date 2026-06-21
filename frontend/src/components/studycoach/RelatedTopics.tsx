// ─── Related Topics Card ───────────────────────────────────



interface RelatedTopicsProps {
  topics: string[]
  onTopicClick: (topic: string) => void
}

export default function RelatedTopics({ topics, onTopicClick }: RelatedTopicsProps) {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🔗</span>
        Related Topics
      </h3>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => onTopicClick(topic)}
            className="px-4 py-2 rounded-full bg-slate-700/50 text-slate-300 text-sm hover:bg-slate-600/50 hover:text-white transition-colors"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  )
}
