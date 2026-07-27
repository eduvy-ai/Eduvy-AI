// ─── Mode Selector Component ───────────────────────────────────


import { type StudyCoachMode } from '../../modules/studycoach'

interface ModeSelectorProps {
  currentMode: StudyCoachMode
  onModeChange: (mode: StudyCoachMode) => void
  ui: Record<string, string>
}

const modes: StudyCoachMode[] = [
  'study_coach',
  'study_coach_eli10',
  'study_coach_exam',
  'study_coach_coding',
  'study_coach_revision',
]

const MODE_KEYS: Record<StudyCoachMode, { labelKey: string; descKey: string; icon: string }> = {
  study_coach:          { labelKey: 'modeStudyCoach',  descKey: 'modeStudyCoachDesc', icon: '📚' },
  study_coach_eli10:    { labelKey: 'modeSimple',      descKey: 'modeSimpleDesc',     icon: '✨' },
  study_coach_exam:     { labelKey: 'modeExam',        descKey: 'modeExamDesc',       icon: '📝' },
  study_coach_coding:   { labelKey: 'modeCoding',      descKey: 'modeCodingDesc',     icon: '💻' },
  study_coach_revision: { labelKey: 'modeRevision',    descKey: 'modeRevisionDesc',   icon: '⚡' },
}

export default function ModeSelector({ currentMode, onModeChange, ui }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {modes.map((mode) => {
        const keys = MODE_KEYS[mode]
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
            title={ui[keys.descKey]}
          >
            <span>{keys.icon}</span>
            <span className="hidden sm:inline">{ui[keys.labelKey]}</span>
          </button>
        )
      })}
    </div>
  )
}
