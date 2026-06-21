// ─── Memory Aids Section Component ───────────────────────────────────


import type { MemoryAids } from '../../modules/studycoach'

interface MemoryAidsSectionProps {
  aids: MemoryAids
}

export default function MemoryAidsSection({ aids }: MemoryAidsSectionProps) {
  const hasMnemonics = aids.mnemonics && aids.mnemonics.length > 0
  const hasAcronyms = aids.acronyms && aids.acronyms.length > 0
  const hasPatterns = aids.patterns && aids.patterns.length > 0

  if (!hasMnemonics && !hasAcronyms && !hasPatterns) {
    return null
  }

  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-2xl p-6 border border-cyan-500/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🧠</span>
        Memory Aids
      </h3>

      <div className="space-y-4">
        {/* Mnemonics */}
        {hasMnemonics && (
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Mnemonics</h4>
            <ul className="space-y-2">
              {aids.mnemonics.map((mnemonic, index) => (
                <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-cyan-400">💭</span>
                  {mnemonic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Acronyms */}
        {hasAcronyms && (
          <div>
            <h4 className="text-sm font-medium text-teal-400 mb-2">Acronyms</h4>
            <ul className="space-y-2">
              {aids.acronyms.map((acronym, index) => (
                <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-teal-400">🔤</span>
                  {acronym}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Patterns */}
        {hasPatterns && (
          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-2">Patterns</h4>
            <ul className="space-y-2">
              {aids.patterns.map((pattern, index) => (
                <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-emerald-400">🔄</span>
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
