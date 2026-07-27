// ─── Real World Example Card ───────────────────────────────────



interface RealWorldExampleProps {
  example: string
  ui: Record<string, string>
}

export default function RealWorldExample({ example, ui }: RealWorldExampleProps) {
  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/20">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-2xl">🌍</span>
        {ui.realWorldExample}
      </h3>
      <p className="text-slate-300 leading-relaxed">{example}</p>
    </div>
  )
}
