// StylePicker.jsx — Visual style selector for Video Creator
import { li } from '../../i18n/index.js'

const STYLES = [
  {
    key: 'sketch_classic',
    labelKey: 'styleSketchClassic',
    descKey: 'styleSketchClassicDesc',
    bg: '#fdf6e3',
    border: '#8b6914',
    textColor: '#3d2b00',
    preview: '✏️',
  },
  {
    key: 'sketch_dark',
    labelKey: 'styleSketchDark',
    descKey: 'styleSketchDarkDesc',
    bg: '#1a1a2e',
    border: '#e0e0e0',
    textColor: '#e0e0e0',
    preview: '🖊️',
  },
  {
    key: 'canvas_colorful',
    labelKey: 'styleCanvasColorful',
    descKey: 'styleCanvasColorfulDesc',
    bg: '#fff9f0',
    border: '#F97316',
    textColor: '#1a1a1a',
    preview: '🎨',
  },
  {
    key: 'canvas_minimal',
    labelKey: 'styleCanvasMinimal',
    descKey: 'styleCanvasMinimalDesc',
    bg: '#f8fafc',
    border: '#3b82f6',
    textColor: '#1e293b',
    preview: '⬜',
  },
  {
    key: 'blackboard',
    labelKey: 'styleBlackboard',
    descKey: 'styleBlackboardDesc',
    bg: '#1c3d2e',
    border: '#a8d8b8',
    textColor: '#e8f5ec',
    preview: '🟩',
  },
]

export default function StylePicker({ value, onChange, lang = 'English' }) {
  const ui = li(lang)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {STYLES.map((s) => {
        const selected = value === s.key
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              backgroundColor: s.bg,
              color: s.textColor,
              borderColor: selected ? s.border : 'rgba(255,255,255,0.06)',
              outline: selected ? `2px solid ${s.border}` : '2px solid transparent',
            }}
            className={`
              relative rounded-xl p-4 text-left transition-all duration-200
              border-2 cursor-pointer
              ${selected ? 'shadow-lg scale-[1.02]' : 'opacity-75 hover:opacity-100 hover:scale-[1.01]'}
            `}
          >
            {selected && (
              <span
                className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: s.border, color: '#fff' }}
              >
                {ui.styleSelected || '✓ Selected'}
              </span>
            )}
            <div className="text-3xl mb-2">{s.preview}</div>
            <div className="font-semibold text-sm mb-1">{ui[s.labelKey] || s.key}</div>
            <div className="text-xs opacity-75">{ui[s.descKey] || ''}</div>
          </button>
        )
      })}
    </div>
  )
}
