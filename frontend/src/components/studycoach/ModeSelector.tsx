// ─── Mode Selector Component ───────────────────────────────────


import { MODE_INFO, type StudyCoachMode } from '../../modules/studycoach'

interface ModeSelectorProps {
  currentMode: StudyCoachMode
  onModeChange: (mode: StudyCoachMode) => void
}

const modes: StudyCoachMode[] = [
  'study_coach',
  'study_coach_eli10',
  'study_coach_exam',
  'study_coach_coding',
  'study_coach_revision',
]

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {modes.map((mode) => {
        const info = MODE_INFO[mode]
        const isActive = mode === currentMode
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              flex items-center gap-2
              ${isActive
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
              }
            `}
            title={info.description}
          >
            <span>{info.icon}</span>
            <span className="hidden sm:inline">{info.label}</span>
          </button>
        )
      })}
    </div>
  )
}
